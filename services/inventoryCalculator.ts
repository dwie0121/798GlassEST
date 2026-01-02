
import type { Inventory, Material, PriceList, MaterialPropertiesList, PlacedPanel, SheetLayout, WindowInputs } from '../types';
import { MaterialCategory, AluminumColor, WindowSeries, WindowType, Supplier } from '../types';
import { getAvailableStock, type StockSize } from '../data/glassStocks';

// Constants
const ALUMINUM_BAR_LENGTH = 252;
const ALUMINUM_OPTIMIZATION_THRESHOLD = ALUMINUM_BAR_LENGTH * 0.9; // 226.8 inches
const GLASS_CUTTING_ALLOWANCE = 0.125; // 1/8 inch kerf for cutting

// --- 798 Series Specific Constants (Revised) ---
// Glass Height = Window Height - 3 7/8" (Standard 798 deduction)
const GLASS_HEIGHT_DEDUCTION_798 = 3.875; 

// Glass Width Deductions for 798
// 2 Panels: (W - 4 1/2") / 2
const GLASS_WIDTH_DEDUCTION_2_PANEL = 4.5;
// 3 Panels: (W - 5 1/2") / 3 (Approx)
const GLASS_WIDTH_DEDUCTION_3_PANEL = 5.5; 
// 4 Panels: (W - 8") / 4 (Approx)
const GLASS_WIDTH_DEDUCTION_4_PANEL = 8.0;

// Aluminum Cut Deductions
// Lock Stile / Interlocker = Window Height - 1.75"
const STILE_HEIGHT_DEDUCTION = 1.75;
// Rail Width = Glass Width + 2.875" approx (Stile width related)
const RAIL_ADDITION_TO_GLASS = 2.875;


interface CalculationData {
  windows: WindowInputs[];
  color: AluminumColor;
  supplier: Supplier;
  glassType: string;
  selectedStock: string;
  // Fallbacks if not on window
  windowSeries: WindowSeries;
  windowType: WindowType;
  isTubularFraming: boolean;
  fixedFrameProfile?: string;
  hasTransom?: boolean;
  transomPosition?: 'top' | 'bottom';
  transomProfile?: string;
}

// --- Efficient Bin Packer for Glass Optimization (Maximal Rectangles with BSSF) ---
interface FreeRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

class MaxRectsPacker {
    width: number;
    height: number;
    freeRects: FreeRect[];

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.freeRects = [{ x: 0, y: 0, w: width, h: height }];
    }

    fit(w: number, h: number): { x: number, y: number, w: number, h: number, rotated: boolean } | null {
        let bestNode = {
            score1: Number.MAX_VALUE, // Primary score (Best Short Side Fit)
            score2: Number.MAX_VALUE, // Secondary score (Best Long Side Fit)
            bestRect: null as FreeRect | null,
            rotated: false
        };

        // Try to place the rect in each free rectangle
        for (const rect of this.freeRects) {
            // Try standard orientation
            if (rect.w >= w && rect.h >= h) {
                const remainderX = rect.w - w;
                const remainderY = rect.h - h;
                const score1 = Math.min(remainderX, remainderY); // BSSF
                const score2 = Math.max(remainderX, remainderY); // BLSF
                
                if (score1 < bestNode.score1 || (score1 === bestNode.score1 && score2 < bestNode.score2)) {
                    bestNode.score1 = score1;
                    bestNode.score2 = score2;
                    bestNode.bestRect = rect;
                    bestNode.rotated = false;
                }
            }

            // Try rotated orientation (Allow Grain Direction / Rotation)
            if (rect.w >= h && rect.h >= w) {
                const remainderX = rect.w - h;
                const remainderY = rect.h - w;
                const score1 = Math.min(remainderX, remainderY); // BSSF
                const score2 = Math.max(remainderX, remainderY); // BLSF
                
                if (score1 < bestNode.score1 || (score1 === bestNode.score1 && score2 < bestNode.score2)) {
                    bestNode.score1 = score1;
                    bestNode.score2 = score2;
                    bestNode.bestRect = rect;
                    bestNode.rotated = true;
                }
            }
        }

        if (!bestNode.bestRect) return null;

        const placedW = bestNode.rotated ? h : w;
        const placedH = bestNode.rotated ? w : h;
        
        // Place at top-left of the best free rect (standard MaxRects heuristic)
        const placedRect = { 
            x: bestNode.bestRect.x, 
            y: bestNode.bestRect.y, 
            w: placedW, 
            h: placedH 
        };

        this.placeRect(placedRect);

        return { ...placedRect, rotated: bestNode.rotated };
    }

    placeRect(placedRect: { x: number, y: number, w: number, h: number }) {
        const newFreeRects: FreeRect[] = [];
        
        for (const freeRect of this.freeRects) {
            if (this.intersect(placedRect, freeRect)) {
                // Split freeRect into up to 4 maximal rects
                
                // New rect above
                if (placedRect.y > freeRect.y && placedRect.y < freeRect.y + freeRect.h) {
                    newFreeRects.push({ 
                        x: freeRect.x, 
                        y: freeRect.y, 
                        w: freeRect.w, 
                        h: placedRect.y - freeRect.y 
                    });
                }
                
                // New rect below
                if (placedRect.y + placedRect.h < freeRect.y + freeRect.h) {
                    newFreeRects.push({
                        x: freeRect.x,
                        y: placedRect.y + placedRect.h,
                        w: freeRect.w,
                        h: (freeRect.y + freeRect.h) - (placedRect.y + placedRect.h)
                    });
                }
                
                // New rect left
                if (placedRect.x > freeRect.x && placedRect.x < freeRect.x + freeRect.w) {
                    newFreeRects.push({
                        x: freeRect.x,
                        y: freeRect.y,
                        w: placedRect.x - freeRect.x,
                        h: freeRect.h
                    });
                }
                
                // New rect right
                if (placedRect.x + placedRect.w < freeRect.x + freeRect.w) {
                    newFreeRects.push({
                        x: freeRect.x + placedRect.w,
                        y: freeRect.y,
                        w: (freeRect.x + freeRect.w) - (placedRect.x + placedRect.w),
                        h: freeRect.h
                    });
                }
            } else {
                newFreeRects.push(freeRect);
            }
        }
        
        this.freeRects = newFreeRects;
        this.pruneFreeRects();
    }

    intersect(r1: { x: number, y: number, w: number, h: number }, r2: FreeRect): boolean {
        return r1.x < r2.x + r2.w && 
               r1.x + r1.w > r2.x && 
               r1.y < r2.y + r2.h && 
               r1.y + r1.h > r2.y;
    }

    pruneFreeRects() {
        // Remove rectangles that are fully contained in another
        for (let i = 0; i < this.freeRects.length; ++i) {
            for (let j = i + 1; j < this.freeRects.length; ++j) {
                if (this.isContained(this.freeRects[i], this.freeRects[j])) {
                    this.freeRects.splice(i, 1);
                    --i;
                    break;
                }
                if (this.isContained(this.freeRects[j], this.freeRects[i])) {
                    this.freeRects.splice(j, 1);
                    --j;
                }
            }
        }
    }

    isContained(a: FreeRect, b: FreeRect): boolean {
        return a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
    }
}


const getPrice = (materialName: string, supplier: Supplier, prices: PriceList): { price: number; source: string } => {
  const materialPrices = prices[materialName];
  if (!materialPrices) {
    return { price: 0, source: 'N/A' };
  }

  // Special case for fixed price items (Awning and Fixed profiles from prompt)
  if (materialName.startsWith('Awning-') || materialName.includes('(Fixed)')) {
      const bestPrice = materialPrices[Supplier.BEST] || materialPrices['BEST'] || 0;
      if (bestPrice > 0) return { price: bestPrice, source: 'Fixed Rate' };
  }

  if (supplier !== 'Best Price') {
    const price = materialPrices[supplier] || 0;
    return { price: price, source: supplier };
  }

  let bestPrice = Infinity;
  let bestSource = 'N/A';
  for (const [src, price] of Object.entries(materialPrices)) {
    if (price > 0 && price < bestPrice) {
      bestPrice = price;
      bestSource = src;
    }
  }

  return { price: bestPrice === Infinity ? 0 : bestPrice, source: bestSource };
};

export const calculateInventory = (data: CalculationData, prices: PriceList, materialProperties: MaterialPropertiesList): Inventory => {
  const { windows, color, supplier, glassType, selectedStock } = data;

  if (windows.length === 0) {
    return { aluminum: [], glass: [], hardware: [], grandTotal: 0, aluminumTotal: 0, glassTotal: 0, hardwareTotal: 0, totalSquareFootage: 0, panelCuts: [] };
  }
  
  // --- Packing Simulation ---
  const runPackingSimulation = (panels: {width:number, height:number, windowIndex: number, windowLabel?: string}[], stock: StockSize): { sheetCount: number, layouts: SheetLayout[] } => {
    // Check if panels fit individually (with rotation allow)
    for (const panel of panels) {
        const panelW = panel.width + GLASS_CUTTING_ALLOWANCE;
        const panelH = panel.height + GLASS_CUTTING_ALLOWANCE;
        
        const fitsStandard = panelW <= stock.width && panelH <= stock.height;
        const fitsRotated = panelH <= stock.width && panelW <= stock.height;
        
        if (!fitsStandard && !fitsRotated) return { sheetCount: Infinity, layouts: [] };
    }
    
    // Sort panels by Area Descending (Primary) and Long Side Descending (Secondary)
    let remainingPanels = [...panels].sort((a,b) => {
        const areaDiff = (b.width * b.height) - (a.width * a.height);
        if (Math.abs(areaDiff) > 0.1) return areaDiff;
        return Math.max(b.width, b.height) - Math.max(a.width, a.height);
    });

    const layouts: SheetLayout[] = [];

    while (remainingPanels.length > 0) {
        // Use MaxRectsPacker with BSSF heuristic
        const packer = new MaxRectsPacker(stock.width, stock.height);
        const packedThisSheet: PlacedPanel[] = [];
        const nextBatch: typeof remainingPanels = [];

        for (const panel of remainingPanels) {
            const w = panel.width + GLASS_CUTTING_ALLOWANCE;
            const h = panel.height + GLASS_CUTTING_ALLOWANCE;
            
            const result = packer.fit(w, h);
            
            if (result) {
                 const placedSourceW = result.rotated ? panel.height : panel.width;
                 const placedSourceH = result.rotated ? panel.width : panel.height;

                 packedThisSheet.push({
                     x: result.x,
                     y: result.y,
                     w: result.w,
                     h: result.h,
                     sourceWidth: placedSourceW,
                     sourceHeight: placedSourceH,
                     windowIndex: panel.windowIndex,
                     windowLabel: panel.windowLabel
                 });
            } else {
                nextBatch.push(panel);
            }
        }
        
        if (packedThisSheet.length === 0 && nextBatch.length > 0) {
             return { sheetCount: Infinity, layouts: [] };
        }

        layouts.push({
            placedPanels: packedThisSheet,
            stockWidth: stock.width,
            stockHeight: stock.height
        });
        remainingPanels = nextBatch;
    }

    return { sheetCount: layouts.length, layouts };
  };


  const aluminumAggregator = new Map<string, { quantity: number, totalLength: number }>();
  const hardwareAggregator = new Map<string, { quantity: number, details: { size: string, notes?: string } }>();
  const allPanelsToCut: {width: number, height: number, windowIndex: number, windowLabel?: string}[] = [];
  
  let aluminumTotal = 0;
  let glassTotal = 0;
  let hardwareTotal = 0;
  let totalSquareFootage = 0;

  for (const [index, win] of windows.entries()) {
    const { 
        width: W, height: H, panels, label, 
        windowType, windowSeries = WindowSeries._798,
        verticalGrids = 0, horizontalGrids = 0,
        isTubularFraming = false, fixedFrameProfile = '1x2',
        hasTransom = false, transomHeight = 0, transomProfile = '1x4' 
    } = win;

    if (W <= 0 || H <= 0) continue;

    const windowLabel = label || `W${index + 1}`;
    totalSquareFootage += (W * H) / 144;
    // Add Transom SqFt
    if (hasTransom && transomHeight > 0) {
        totalSquareFootage += (W * transomHeight) / 144;
    }

    if (windowType === WindowType.Fixed) {
        const isPCW = color === AluminumColor.White;
        const colorSuffix = isPCW ? '(PCW)' : '(HA)';
        
        let frameProfile = `Tubular ${fixedFrameProfile} ${colorSuffix}`;
        if (fixedFrameProfile === '1x4') {
             frameProfile = `Tubular 1x4 ${isPCW ? 'PCW' : 'HA'}`;
        }
            
        const frameLength = (W * 2) + (H * 2);

        const existingFrame = aluminumAggregator.get(frameProfile) || { quantity: 0, totalLength: 0 };
        aluminumAggregator.set(frameProfile, {
            quantity: existingFrame.quantity + 1,
            totalLength: existingFrame.totalLength + frameLength
        });

        const gridProfile = frameProfile; 
        const vGridLength = H * verticalGrids;
        const hGridLength = W * horizontalGrids;
        const totalGridLength = vGridLength + hGridLength;

        if (totalGridLength > 0) {
             const existingGrid = aluminumAggregator.get(gridProfile) || { quantity: 0, totalLength: 0 };
             aluminumAggregator.set(gridProfile, {
                quantity: existingGrid.quantity + (verticalGrids + horizontalGrids),
                totalLength: existingGrid.totalLength + totalGridLength
             });
        }

        const totalClipLength = frameLength + (totalGridLength * 2); 

        const clipProfile = 'SOBC Glass Clip (Fixed)';
        const existingClip = aluminumAggregator.get(clipProfile) || { quantity: 0, totalLength: 0 };
        aluminumAggregator.set(clipProfile, {
            quantity: existingClip.quantity + 1,
            totalLength: existingClip.totalLength + totalClipLength
        });

        let frameThick = 1.0;
        if (fixedFrameProfile && fixedFrameProfile.startsWith('1-3/4')) {
            frameThick = 1.75;
        }
        
        const gridThick = frameThick;
        const cols = verticalGrids + 1;
        const rows = horizontalGrids + 1;
        
        const totalGlassW = W - (2 * frameThick) - (verticalGrids * gridThick);
        const totalGlassH = H - (2 * frameThick) - (horizontalGrids * gridThick);
        
        const paneW = totalGlassW / cols;
        const paneH = totalGlassH / rows;

        const finalPaneW = paneW - 0.125;
        const finalPaneH = paneH - 0.125;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                 allPanelsToCut.push({ width: Math.max(0, finalPaneW), height: Math.max(0, finalPaneH), windowIndex: index + 1, windowLabel });
            }
        }

        const hardwareItems = [
            { name: 'Sealant', qty: 1, details: { size: '1 tube', notes: '1 per window' } },
        ];
        hardwareItems.forEach(h => {
            const existing = hardwareAggregator.get(h.name) || { quantity: 0, details: h.details };
            existing.quantity += h.qty;
            hardwareAggregator.set(h.name, existing);
        });

    } else if (windowType === WindowType.Awning) {
        const sections = Math.max(1, panels);
        const sectionWidth = W / sections; 
        
        const frameProfile = isTubularFraming ? 'Awning- Tubular Frame' : 'Awning- Perimeter';
        let frameLength = (W * 2) + (H * 2);
        if (sections > 1) { frameLength += (sections - 1) * H; }

        const existingFrame = aluminumAggregator.get(frameProfile) || { quantity: 0, totalLength: 0 };
        aluminumAggregator.set(frameProfile, { quantity: existingFrame.quantity + 1, totalLength: existingFrame.totalLength + frameLength });

        const SASH_DEDUCTION = 2.0; 
        const sashW = sectionWidth - SASH_DEDUCTION;
        const sashH = H - SASH_DEDUCTION;
        const sashPerimeter = (sashW * 2) + (sashH * 2);
        const totalSashLength = sashPerimeter * sections;
        
        const sashProfile = 'Awning- Panel Frame';
        const existingSash = aluminumAggregator.get(sashProfile) || { quantity: 0, totalLength: 0 };
        aluminumAggregator.set(sashProfile, { quantity: existingSash.quantity + sections, totalLength: existingSash.totalLength + totalSashLength });

        const moldingProfile = 'Awning- Molding Glass Clips';
        const existingMolding = aluminumAggregator.get(moldingProfile) || { quantity: 0, totalLength: 0 };
        aluminumAggregator.set(moldingProfile, { quantity: existingMolding.quantity + sections, totalLength: existingMolding.totalLength + totalSashLength });

        const GLASS_DEDUCTION = 1.0; 
        const glassW = sashW - GLASS_DEDUCTION;
        const glassH = sashH - GLASS_DEDUCTION;

        for (let i = 0; i < sections; i++) {
             allPanelsToCut.push({ width: glassW, height: glassH, windowIndex: index + 1, windowLabel });
        }

        const hardwareItems = [
            { name: 'Sealant', qty: 1, details: { size: '1 tube', notes: '1 per window' } },
        ];
        hardwareItems.forEach(h => {
            const existing = hardwareAggregator.get(h.name) || { quantity: 0, details: h.details };
            existing.quantity += h.qty;
            hardwareAggregator.set(h.name, existing);
        });

    } else {
        if (panels < 2) continue;
        
        let glassW_Deduction = GLASS_WIDTH_DEDUCTION_2_PANEL;
        if (panels === 3) glassW_Deduction = GLASS_WIDTH_DEDUCTION_3_PANEL;
        if (panels === 4) glassW_Deduction = GLASS_WIDTH_DEDUCTION_4_PANEL;

        const glassWidth = (W - glassW_Deduction) / panels;
        const glassHeight = H - GLASS_HEIGHT_DEDUCTION_798;
        
        const panelRailWidth = glassWidth + RAIL_ADDITION_TO_GLASS;
        const panelStileHeight = H - STILE_HEIGHT_DEDUCTION;

        for (let i = 0; i < panels; i++) {
            allPanelsToCut.push({ width: glassWidth, height: glassHeight, windowIndex: index + 1, windowLabel });
        }
        
        const seriesPrefix = windowSeries;
        const isPCW = color === AluminumColor.White;
        const colorSuffix = isPCW ? '(PCW)' : '(HA)';

        const profileName = (baseName: string, isSdType: boolean = false) => {
            let name = `${seriesPrefix}- ${baseName}`;
            if (isSdType && !isPCW) name += ' SD';
            name += ` ${colorSuffix}`;
            return name;
        };

        const commonProfiles = [
            { name: profileName('Double Head'), quantity: 1, totalLength: W },
            { name: profileName('Double Sill'), quantity: 1, totalLength: W },
            { name: profileName('Double Jamb'), quantity: 2, totalLength: H * 2 },
        ];

        const railProfiles = (windowSeries === WindowSeries._798)
            ? [ { name: profileName('Bottom Rail/Top Rail', true), quantity: panels * 2, totalLength: panelRailWidth * panels * 2 } ]
            : [ { name: profileName('Top Rail', true), quantity: panels, totalLength: panelRailWidth * panels }, { name: profileName('Bottom Rail', true), quantity: panels, totalLength: panelRailWidth * panels } ];

        const stileProfiles = [
            { name: profileName(isPCW ? 'Lockstile' : 'Lock Stile', true), quantity: 2, totalLength: panelStileHeight * 2 },
            { name: profileName('Interlocker', true), quantity: 2 * (panels - 1), totalLength: panelStileHeight * 2 * (panels - 1) },
        ];

        const aluminumProfiles = [...commonProfiles, ...railProfiles, ...stileProfiles];

        aluminumProfiles.forEach(p => {
            if(p.quantity <= 0) return;
            const existing = aluminumAggregator.get(p.name) || { quantity: 0, totalLength: 0 };
            aluminumAggregator.set(p.name, { quantity: existing.quantity + p.quantity, totalLength: existing.totalLength + p.totalLength });
        });
        
        if (hardwareAggregator.has('Rubber Jamb')) {
             const existing = hardwareAggregator.get('Rubber Jamb');
             if(existing) existing.quantity += (H * 2);
        } else {
             hardwareAggregator.set('Rubber Jamb', {
                quantity: H * 2,
                details: { size: 'length', notes: 'Applied to Double Jamb' }
            });
        }

        if (hasTransom && transomHeight > 0) {
            let tProfile = `Tubular ${transomProfile} ${colorSuffix}`;
            if (transomProfile === '1x4') {
                 tProfile = `Tubular 1x4 ${isPCW ? 'PCW' : 'HA'}`;
            }

            const transomFrameLength = (W * 2) + (transomHeight * 2);
            const numDividers = Math.max(0, panels - 1);
            const dividerLength = numDividers * transomHeight;
            const totalTransomProfileLength = transomFrameLength + dividerLength;

            const existingTransom = aluminumAggregator.get(tProfile) || { quantity: 0, totalLength: 0 };
            aluminumAggregator.set(tProfile, {
                quantity: existingTransom.quantity + 1 + numDividers,
                totalLength: existingTransom.totalLength + totalTransomProfileLength
            });
            
            let frameThick = 1.0;
            if (transomProfile?.startsWith('1-3/4')) {
                frameThick = 1.75;
            }
            
            const totalGlassW = W - (2 * frameThick) - (numDividers * frameThick);
            const paneW = totalGlassW / panels;
            const paneH = transomHeight - (2 * frameThick);

            const totalClipLength = transomFrameLength + (dividerLength * 2);

            const clipProfile = 'SOBC Glass Clip (Fixed)';
            const existingClip = aluminumAggregator.get(clipProfile) || { quantity: 0, totalLength: 0 };
            aluminumAggregator.set(clipProfile, {
                quantity: existingClip.quantity + panels,
                totalLength: existingClip.totalLength + totalClipLength
            });

            const cutW = paneW - 0.125;
            const cutH = paneH - 0.125;
            
            if (cutW > 0 && cutH > 0) {
                 for (let k = 0; k < panels; k++) {
                     allPanelsToCut.push({ width: cutW, height: cutH, windowIndex: index + 1, windowLabel: `${windowLabel} (Transom)` });
                 }
            }
        }

        const hardwareItems: {name: string, qty: number, details: {size: string, notes: string}}[] = [
            { name: 'SD Roller', qty: 2 * panels, details: { size: 'N/A', notes: '2 per panel' } },
            { name: 'Panel Assembly Set', qty: panels, details: { size: '4 pcs/set', notes: '1 set per panel (corners)' } },
            { name: 'Sealant', qty: 1, details: { size: '1 tube', notes: '1 per window' } },
        ];

        if (windowSeries === WindowSeries._798) {
             hardwareItems.push({ name: 'Center Lock', qty: 1, details: { size: '1 pc', notes: '1 per window' } });
        } else {
             hardwareItems.push({ name: 'Flush Lock', qty: 1, details: { size: '1 pc', notes: '1 per window' } });
        }

        const screwQty = panels * 16;
        hardwareItems.push({ name: 'Assembly Screw', qty: screwQty, details: { size: '#8', notes: 'Assembly screws' } });

        hardwareItems.forEach(h => {
            const existing = hardwareAggregator.get(h.name) || { quantity: 0, details: h.details };
            existing.quantity += h.qty;
            hardwareAggregator.set(h.name, existing);
        });
    }
  }
  
  const processedAluminum: Material[] = Array.from(aluminumAggregator.entries()).map(([name, data]) => {
    let notes = '';
    let barsNeeded = 0;

    if (name.includes('SOBC Glass Clip')) {
        barsNeeded = data.totalLength / ALUMINUM_BAR_LENGTH;
        notes = 'Calculated using exact decimals.';
    } else {
        const numFullBars = Math.floor(data.totalLength / ALUMINUM_BAR_LENGTH);
        const remainderLength = data.totalLength % ALUMINUM_BAR_LENGTH;
        
        let barsForRemainder = 0;

        if (remainderLength > 0) {
            if (remainderLength > ALUMINUM_OPTIMIZATION_THRESHOLD) {
                barsForRemainder = 1;
                notes = `Rounded up. Remainder ${remainderLength.toFixed(2)}" > ${ALUMINUM_OPTIMIZATION_THRESHOLD.toFixed(1)}".`;
            } else {
                barsForRemainder = remainderLength / ALUMINUM_BAR_LENGTH;
            }
        }
        barsNeeded = numFullBars + barsForRemainder;
    }

    const { price, source } = getPrice(name, supplier, prices);
    const totalCost = barsNeeded * price;
    
    aluminumTotal += totalCost;
    return {
      name, quantity: data.quantity, size: 'Varies', category: MaterialCategory.Aluminum,
      totalLength: data.totalLength, barsNeeded, notes, unitPrice: price,
      totalCost, priceSource: source,
    };
  });

  const glassStockAggregator = new Map<string, { notes: string[]; totalCost: number; totalBillableSheets: number; totalPhysicalSheets: number; layoutData?: SheetLayout[] }>();
  const { price: pricePerSqFt, source: glassPriceSource } = getPrice(glassType, supplier, prices);

  if (allPanelsToCut.length > 0) {
    if (selectedStock !== 'optimize') {
      const [stockW, stockH] = selectedStock.split('x').map(Number);
      const userSelectedStock: StockSize | null = !isNaN(stockW) && !isNaN(stockH) ? { width: stockW, height: stockH } : null;

      if (!userSelectedStock) {
          glassStockAggregator.set(`Invalid Stock`, { notes: ["Error: Invalid stock size selected."], totalCost: 0, totalBillableSheets: 0, totalPhysicalSheets: 0 });
      } else {
          const { sheetCount: physicalSheetsNeeded, layouts } = runPackingSimulation(allPanelsToCut, userSelectedStock);
          if (physicalSheetsNeeded === Infinity) {
              glassStockAggregator.set('Packing Failed', { notes: [`Error: Some panels are too large for the selected ${userSelectedStock.width}"x${userSelectedStock.height}" stock.`], totalCost: 0, totalBillableSheets: 0, totalPhysicalSheets: 0 });
          } else {
              const pricePerSheet = (userSelectedStock.width * userSelectedStock.height / 144) * pricePerSqFt;
              const totalCostForThisStock = physicalSheetsNeeded * pricePerSheet;
              glassStockAggregator.set(`${userSelectedStock.width}" x ${userSelectedStock.height}"`, { notes: [`Packed ${allPanelsToCut.length} panels onto ${physicalSheetsNeeded} sheets.`], totalCost: totalCostForThisStock, totalBillableSheets: physicalSheetsNeeded, totalPhysicalSheets: physicalSheetsNeeded, layoutData: layouts });
          }
      }
    } else {
      const availableStocks = getAvailableStock(glassType); 
      let panelsToProcess = [...allPanelsToCut];
      if (availableStocks.length === 0) {
          glassStockAggregator.set('Optimization Failed', { notes: ["Error: No available stock for this glass type."], totalCost: 0, totalBillableSheets: 0, totalPhysicalSheets: 0 });
      } else {
          for (const stock of availableStocks) {
              if (panelsToProcess.length === 0) break;
              const panelsThatCanFit: typeof allPanelsToCut = [];
              const panelsTooLarge: typeof allPanelsToCut = [];
              for (const panel of panelsToProcess) {
                  const panelW = panel.width + GLASS_CUTTING_ALLOWANCE;
                  const panelH = panel.height + GLASS_CUTTING_ALLOWANCE;
                  
                  const fitsStandard = panelW <= stock.width && panelH <= stock.height;
                  const fitsRotated = panelH <= stock.width && panelW <= stock.height;

                  if (fitsStandard || fitsRotated) {
                      panelsThatCanFit.push(panel);
                  } else {
                      panelsTooLarge.push(panel);
                  }
              }
              
              if (panelsThatCanFit.length > 0) {
                  const { sheetCount: physicalSheetsNeeded, layouts } = runPackingSimulation(panelsThatCanFit, stock);
                  if (physicalSheetsNeeded !== Infinity && physicalSheetsNeeded > 0) {
                      const pricePerSheet = (stock.width * stock.height / 144) * pricePerSqFt;
                      const existingData = glassStockAggregator.get(`${stock.width}" x ${stock.height}"`) || { notes: [], totalCost: 0, totalBillableSheets: 0, totalPhysicalSheets: 0, layoutData: [] };
                      existingData.notes.push(`Packed ${panelsThatCanFit.length} panels onto ${physicalSheetsNeeded} sheets.`);
                      existingData.totalCost += physicalSheetsNeeded * pricePerSheet;
                      existingData.totalBillableSheets += physicalSheetsNeeded;
                      existingData.totalPhysicalSheets += physicalSheetsNeeded;
                      existingData.layoutData = [...(existingData.layoutData || []), ...layouts];
                      glassStockAggregator.set(`${stock.width}" x ${stock.height}"`, existingData);
                  }
              }
              panelsToProcess = panelsTooLarge;
          }
          if (panelsToProcess.length > 0) {
              glassStockAggregator.set('Unfittable Panels', { notes: [`Error: ${panelsToProcess.length} panel(s) are too large for any available stock.`], totalCost: 0, totalBillableSheets: 0, totalPhysicalSheets: 0 });
          }
      }
    }
  }

  const processedGlass: Material[] = [];
  glassTotal = 0;
  
  for (const [size, data] of glassStockAggregator.entries()) {
    if(data.notes.some(n => n.startsWith("Error"))){
       processedGlass.push({ name: `Unfittable Glass Panel`, quantity: 0, size: size, category: MaterialCategory.Glass, notes: data.notes.join('; '), totalCost: 0, unitPrice: 0, physicalSheets: 0 });
       continue;
    }
    glassTotal += data.totalCost;
    const [stockWStr, stockHStr] = size.split(' x ');
    let pricePerSheet = 0;
    if (!isNaN(parseFloat(stockWStr)) && !isNaN(parseFloat(stockHStr))) {
        pricePerSheet = (parseFloat(stockWStr) * parseFloat(stockHStr) / 144) * pricePerSqFt;
    }
    processedGlass.push({ name: `Stock Glass Sheet (${glassType.replace('-', ' ')})`, quantity: data.totalBillableSheets, physicalSheets: data.totalPhysicalSheets, size: size, category: MaterialCategory.Glass, unitPrice: pricePerSheet, totalCost: data.totalCost, priceSource: glassPriceSource, notes: `${selectedStock === 'optimize' ? 'Optimized. ' : ''}Details: ${data.notes.join('; ')}`, layoutData: data.layoutData });
  }

  const processedHardware: Material[] = Array.from(hardwareAggregator.entries()).map(([name, data]) => {
    let { price, source } = getPrice(name, supplier, prices);
    let unitPrice = price;
    let totalCost = 0;
    let notes = data.details.notes;
    let size = data.details.size;
    let totalWeightKg: number | undefined;

    if (name === 'Rubber Jamb') {
      const props = (materialProperties && materialProperties['Rubber Jamb']) || { weightKgPerFoot: 0 };
      const weightKgPerFoot = props.weightKgPerFoot || 0;
      const totalLengthInches = data.quantity;
      totalWeightKg = (totalLengthInches / 12) * weightKgPerFoot;
      totalCost = totalWeightKg * unitPrice; 
      size = `${totalLengthInches.toFixed(2)}"`;
      notes = `Total Weight: ${totalWeightKg.toFixed(2)}kg. Price per kg.`;
    } else if (name === 'Panel Assembly Set') {
      unitPrice = price * 4; 
      totalCost = data.quantity * unitPrice;
    } else if (name === 'Assembly Screw') {
         totalCost = data.quantity * unitPrice;
         size = `${data.quantity} pcs`;
    } else {
      totalCost = data.quantity * unitPrice;
    }
    
    hardwareTotal += totalCost;
    return { name, quantity: data.quantity, size: name !== 'Rubber Jamb' ? size : `${data.quantity.toFixed(2)}"`, notes, category: MaterialCategory.Hardware, unitPrice, totalCost, priceSource: source, totalWeightKg };
  });

  return {
    aluminum: processedAluminum, glass: processedGlass,
    hardware: processedHardware.sort((a, b) => a.name.localeCompare(b.name)),
    grandTotal: aluminumTotal + glassTotal + hardwareTotal, aluminumTotal, glassTotal, hardwareTotal, totalSquareFootage,
    panelCuts: allPanelsToCut,
  };
};
