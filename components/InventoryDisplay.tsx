
import React, { useState, useEffect, useRef } from 'react';
import type { Inventory, Material, Supplier, WindowInputs, SheetLayout, PriceList, WindowType, MaterialPropertiesList } from '../types';
import { MaterialCategory, WindowSeries } from '../types';
import { BoxIcon, GlassIcon, WrenchIcon, InfoIcon, EyeIcon, PriceTagIcon, ClipboardListIcon, DocumentTextIcon, ChartBarIcon, HandshakeIcon } from './Icons';
import { Magic7PriceMonitor } from './Magic7PriceMonitor';
import { GlassCuttingDiagramModal } from './GlassCuttingDiagramModal';
import { OrderListModal } from './OrderListModal';
import { PanelCutsModal } from './PanelCutsModal';
import { QuotationModal } from './QuotationModal';
import { WindowSchematicModal } from './WindowSchematicModal';
import { DealCardModal } from './DealCardModal';
import { decimalToFraction, formatNumberWithCommas, applyBillingRounding } from '../utils/formatting';

// Add a global declaration for html2canvas, which is loaded from a script tag in index.html
declare global {
  interface Window {
    html2canvas: (element: HTMLElement, options?: any) => Promise<HTMLCanvasElement>;
  }
}

interface InventoryDisplayProps {
  inventory: Inventory | null;
  isCalculated: boolean;
  windowCount: number;
  selectedSupplier: Supplier;
  windows: WindowInputs[];
  clientName: string;
  aluminumColor: string;
  glassType: string;
  windowSeries: WindowSeries;
  windowType: WindowType;
  isTubularFraming: boolean;
  fixedFrameProfile?: string;
  prices: PriceList;
  materialProperties: MaterialPropertiesList;
  // Lifted States
  dealPercentage: number;
  setDealPercentage: (val: number) => void;
  deliveryFee: string;
  setDeliveryFee: (val: string) => void;
  taxPercentage: string;
  setTaxPercentage: (val: string) => void;
  manualPricePerSqFt: string | null;
  setManualPricePerSqFt: (val: string | null) => void;
}

interface PriceBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  windows: WindowInputs[];
  pricePerSqFt: number;
  clientName: string;
}

const PriceBreakdownModal: React.FC<PriceBreakdownModalProps> = ({ isOpen, onClose, windows, pricePerSqFt, clientName }) => {
  const breakdownRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSaveAsJpeg = async () => {
    if (!breakdownRef.current || !window.html2canvas) {
      console.error("Cannot save image: ref or html2canvas not found.");
      return;
    }

    setIsSaving(true);
    try {
      const canvas = await window.html2canvas(breakdownRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Price Breakdown - ${clientName || 'Quotation'}.jpeg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error saving image:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const totals = windows.reduce(
    (acc, window) => {
      // Use billing rounding logic to match Quotation
      const roundedWidthFt = applyBillingRounding(window.width / 12);
      const roundedHeightFt = applyBillingRounding(window.height / 12);
      const sqFt = roundedWidthFt * roundedHeightFt;
      
      const price = sqFt * pricePerSqFt;
      acc.totalSqFt += sqFt;
      acc.totalPrice += price;
      return acc;
    },
    { totalSqFt: 0, totalPrice: 0 }
  );

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="breakdown-title"
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-200"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center flex-shrink-0 bg-gray-50 rounded-t-xl">
          <h2 id="breakdown-title" className="text-lg font-bold text-slate-800">Individual Window Price Breakdown</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close price breakdown">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        <main ref={breakdownRef} className="p-4 sm:p-6 overflow-y-auto bg-white">
          {clientName && (
            <div className="mb-6 text-center">
              <p className="text-sm text-slate-500 uppercase tracking-wide font-bold">Prepared for:</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{clientName}</p>
            </div>
          )}
          <p className="text-sm text-slate-600 text-center mb-6 bg-blue-50 py-2 rounded-lg border border-blue-100">
            Based on a calculated price of <span className="font-bold text-sky-700 font-mono">₱{formatNumberWithCommas(pricePerSqFt)}</span> per square foot (Billed Area).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-sm font-bold text-slate-500 border-b-2 border-gray-200 uppercase tracking-wider">#</th>
                  <th className="p-3 text-sm font-bold text-slate-500 border-b-2 border-gray-200 uppercase tracking-wider uppercase tracking-wider">Dimensions (in)</th>
                   <th className="p-3 text-sm font-bold text-slate-500 border-b-2 border-gray-200 uppercase tracking-wider text-right">Billed Area (Sq. Ft.)</th>
                  <th className="p-3 text-sm font-bold text-slate-500 border-b-2 border-gray-200 uppercase tracking-wider text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {windows.map((window, index) => {
                  const roundedWidthFt = applyBillingRounding(window.width / 12);
                  const roundedHeightFt = applyBillingRounding(window.height / 12);
                  const sqFt = roundedWidthFt * roundedHeightFt;
                  const price = sqFt * pricePerSqFt;
                  const label = window.label || `W${index+1}`;
                  return (
                    <tr key={index} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                      <td className="p-3 text-sm text-slate-700 font-bold">{label}</td>
                      <td className="p-3 text-sm text-slate-700 font-mono">{decimalToFraction(window.width)}" x {decimalToFraction(window.height)}"</td>
                      <td className="p-3 text-sm text-slate-700 font-mono text-right">{sqFt.toFixed(2)}</td>
                      <td className="p-3 text-sm text-green-600 font-mono text-right font-bold">₱{formatNumberWithCommas(price)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-bold bg-gray-50">
                  <td colSpan={2} className="p-4 text-sm text-slate-700 border-t-2 border-gray-200 uppercase tracking-wider">Subtotal</td>
                  <td className="p-4 text-sm text-slate-800 border-t-2 border-gray-200 font-mono text-right">{totals.totalSqFt.toFixed(2)}</td>
                  <td className="p-4 text-sm text-green-700 border-t-2 border-gray-200 font-mono text-right text-base">₱{formatNumberWithCommas(totals.totalPrice)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </main>
         <footer className="p-4 border-t border-gray-200 flex justify-end bg-gray-50 rounded-b-xl">
           <button 
             onClick={handleSaveAsJpeg} 
             disabled={isSaving}
             className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait shadow-sm"
           >
             {isSaving ? 'Saving...' : 'Save as JPEG'}
           </button>
        </footer>
      </div>
    </div>
  );
};


const CategoryHeader: React.FC<{ icon: React.ReactNode; title: string; subTitle?: string, children?: React.ReactNode }> = ({ icon, title, subTitle, children }) => (
  <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
    <div className="flex items-center gap-3">
        <div className="p-2 bg-sky-50 rounded-lg">
            {icon}
        </div>
        <div>
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
            {subTitle && <p className="text-sm text-slate-500 font-medium">{subTitle}</p>}
        </div>
    </div>
    <div className="flex items-center gap-4">
      {children}
    </div>
  </div>
);

const MaterialTable: React.FC<{ materials: Material[]; headers: string[] }> = ({ materials, headers }) => {
  const getRowData = (material: Material, header: string): string | number => {
    switch (header) {
      case 'Profile Name':
      case 'Item':
        return material.name;
      case 'Qty':
      case 'Total Qty':
        return (typeof material.quantity === 'number' ? material.quantity : Number(material.quantity || 0)).toFixed(0);
      case 'Size':
      case 'Details':
        return material.size;
      case 'Supplier Code':
        return material.priceSource ?? 'N/A';
      case 'Total Length':
        return `${material.totalLength?.toFixed(2)}"`;
      case '252" Bars':
        // For Glass Clips, use 4 decimal places for more accuracy as per user request to "use decimals, don't round"
        if (typeof material.barsNeeded === 'number') {
            return material.name.includes('SOBC Glass Clip') 
                ? material.barsNeeded.toFixed(4) 
                : material.barsNeeded.toFixed(1);
        }
        return 'N/A';
      case 'Unit Price':
        return typeof material.unitPrice === 'number' ? `₱${formatNumberWithCommas(material.unitPrice)}` : 'N/A';
      case 'Total Cost':
        return typeof material.totalCost === 'number' ? `₱${formatNumberWithCommas(material.totalCost)}` : 'N/A';
      case 'Notes':
        return material.notes ?? 'N/A';
      default:
        return '';
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-left border-collapse">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header) => (
              <th key={header} className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {materials.map((material, index) => (
            <tr key={`${material.name}-${index}`} className="hover:bg-blue-50/30 transition-colors">
              {headers.map(header => (
                <td key={header} className={`p-4 text-sm text-slate-700 ${['Unit Price', 'Total Cost'].includes(header) ? 'font-mono text-slate-900 font-medium' : ''} ${header === 'Profile Name' || header === 'Item' ? 'font-semibold' : ''}`}>{getRowData(material, header)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const InventoryDisplay: React.FC<InventoryDisplayProps> = ({ 
    inventory, isCalculated, windowCount, selectedSupplier, windows, clientName, aluminumColor, glassType, windowSeries, windowType, isTubularFraming, fixedFrameProfile, prices, materialProperties,
    dealPercentage, setDealPercentage, deliveryFee, setDeliveryFee, taxPercentage, setTaxPercentage, manualPricePerSqFt, setManualPricePerSqFt
}) => {
  const [modalLayoutData, setModalLayoutData] = useState<SheetLayout[] | null>(null);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [isOrderListModalOpen, setIsOrderListModalOpen] = useState(false);
  const [isPanelCutsModalOpen, setIsPanelCutsModalOpen] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [isSchematicModalOpen, setIsSchematicModalOpen] = useState(false);
  const [isDealCardModalOpen, setIsDealCardModalOpen] = useState(false);

  const [displayInventory, setDisplayInventory] = useState<Inventory | null>(inventory);
  const [billedSheetsInputs, setBilledSheetsInputs] = useState<{[key: number]: string}>({});

  useEffect(() => {
    setDisplayInventory(inventory);
    
    // When inventory changes, reset the input field values based on the new data
    const initialInputs: {[key: number]: string} = {};
    inventory?.glass.forEach((g, index) => {
        initialInputs[index] = g.quantity.toString();
    });
    setBilledSheetsInputs(initialInputs);
  }, [inventory]);

  if (!isCalculated) {
    return (
      <div className="bg-white p-12 rounded-2xl shadow-xl border border-gray-200 h-full flex flex-col items-center justify-center text-center">
        <div className="bg-sky-50 p-6 rounded-full mb-6">
            <InfoIcon className="h-16 w-16 text-sky-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Ready to Calculate</h2>
        <p className="text-slate-500 mt-3 max-w-md text-lg">
          Fill out the project details on the left to generate a complete inventory, cost estimate, and cutting list.
        </p>
      </div>
    );
  }

  if (!displayInventory || (displayInventory.aluminum.length === 0 && displayInventory.glass.length === 0 && displayInventory.hardware.length === 0)) {
     return (
      <div className="bg-white p-12 rounded-2xl shadow-xl border border-gray-200 h-full flex flex-col items-center justify-center text-center">
        <div className="bg-red-50 p-6 rounded-full mb-6">
            <InfoIcon className="h-16 w-16 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">No Materials Found</h2>
        <p className="text-slate-500 mt-3 max-w-md">
            Please check your dimensions. No materials could be calculated for the entered values.
        </p>
      </div>
    );
  }
  
  const handleBilledSheetsChange = (materialIndex: number, newValue: string) => {
    if (!displayInventory) return;

    if (newValue !== '' && !/^\d*\.?\d?$/.test(newValue)) return;

    setBilledSheetsInputs(prev => ({ ...prev, [materialIndex]: newValue }));
    
    const newGlassItems = [...displayInventory.glass];
    const itemToUpdate = { ...newGlassItems[materialIndex] };
    const newBilledSheets = parseFloat(newValue);
    
    if (!isNaN(newBilledSheets) && newBilledSheets >= 0) {
        itemToUpdate.quantity = newBilledSheets;
        itemToUpdate.totalCost = newBilledSheets * (itemToUpdate.unitPrice || 0);
    } else {
        itemToUpdate.quantity = 0;
        itemToUpdate.totalCost = 0;
    }
    
    newGlassItems[materialIndex] = itemToUpdate;

    const newGlassTotal = newGlassItems.reduce((sum, item) => sum + (item.totalCost || 0), 0);
    const newGrandTotal = displayInventory.aluminumTotal + newGlassTotal + displayInventory.hardwareTotal;

    setDisplayInventory({
        ...displayInventory,
        glass: newGlassItems,
        glassTotal: newGlassTotal,
        grandTotal: newGrandTotal,
    });
  };

  const handleBilledSheetsBlur = (materialIndex: number) => {
      if (!displayInventory) return;
      const currentInput = billedSheetsInputs[materialIndex];
      const currentQuantity = displayInventory.glass[materialIndex].quantity;
      
      if (currentInput === '' || isNaN(parseFloat(currentInput))) {
          setBilledSheetsInputs(prev => ({ ...prev, [materialIndex]: currentQuantity.toString() }));
      }
  };

  const calculationSummary = `Total for ${windowCount} window${windowCount > 1 ? 's' : ''}`;
  
  const deliveryFeeNum = parseFloat(deliveryFee) || 0;
  const totalMaterialsCost = displayInventory.grandTotal + deliveryFeeNum;
  
  // --- Calculate Billed Total Square Footage ---
  const billedTotalSqFt = windows.reduce((acc, window) => {
    const roundedWidthFt = applyBillingRounding(window.width / 12);
    const roundedHeightFt = applyBillingRounding(window.height / 12);
    return acc + (roundedWidthFt * roundedHeightFt);
  }, 0);
  
  const isManualPriceMode = manualPricePerSqFt !== null;
  const manualPriceValue = parseFloat(manualPricePerSqFt || '');

  // Calculate Base Deal Price (Pre-Tax)
  let baseDealPrice: number;
  let pricePerSqFtBase: number;

  const calculatedBaseDealPrice = totalMaterialsCost * (1 + dealPercentage / 100);

  if (isManualPriceMode && !isNaN(manualPriceValue) && manualPriceValue >= 0) {
      pricePerSqFtBase = manualPriceValue;
      baseDealPrice = pricePerSqFtBase * billedTotalSqFt;
  } else {
      baseDealPrice = calculatedBaseDealPrice;
      pricePerSqFtBase = billedTotalSqFt > 0 ? baseDealPrice / billedTotalSqFt : 0;
  }

  // Apply Tax
  const taxRate = parseFloat(taxPercentage) || 0;
  const taxAmount = baseDealPrice * (taxRate / 100);
  const finalDealPrice = baseDealPrice + taxAmount;
  
  // Effective Markup (on Base Price)
  const effectiveMarkup = totalMaterialsCost > 0 ? ((baseDealPrice / totalMaterialsCost) - 1) * 100 : 0;
  
  // Installer Shares and Net Profit (Calculated on Base Price to exclude Tax)
  const installerShares = baseDealPrice * 0.20;
  const netProfit = baseDealPrice - installerShares - totalMaterialsCost;

  const handlePricePerSqFtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
        setManualPricePerSqFt(value);
    }
  };

  const handlePricePerSqFtBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value.trim() === '' || isNaN(parseFloat(e.target.value))) {
        setManualPricePerSqFt(null);
    }
  };

  let totalCutPanelArea = 0;
  let totalStockSheetArea = 0;
  let totalLayoutSheets = 0;
  
  displayInventory.glass.forEach(material => {
      totalLayoutSheets += material.physicalSheets ?? 0;
      if (material.layoutData) {
          material.layoutData.forEach(sheet => {
              totalStockSheetArea += sheet.stockWidth * sheet.stockHeight;
              sheet.placedPanels.forEach(panel => {
                  totalCutPanelArea += panel.sourceWidth * panel.sourceHeight;
              });
          });
      }
  });
  
  const usagePercentage = totalStockSheetArea > 0 ? (totalCutPanelArea / totalStockSheetArea) * 100 : 0;
  const wastagePercentage = 100 - usagePercentage;
  const effectiveSheetsUsed = (usagePercentage / 100) * totalLayoutSheets;


  return (
    <div className="space-y-8">
       <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Project Summary</h2>
              {clientName && (
                  <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-400 uppercase tracking-wide">Client:</span>
                      <span className="text-lg font-semibold text-slate-700 bg-gray-100 px-3 py-0.5 rounded-full">{clientName}</span>
                  </div>
              )}
            </div>
             <div className="flex-shrink-0 flex flex-wrap gap-3">
                 <button
                    onClick={() => setIsDealCardModalOpen(true)}
                    className="flex items-center gap-2 text-sm bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-lg transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5"
                    aria-label="Generate Deal Card"
                >
                    <HandshakeIcon className="h-5 w-5 text-sky-400" />
                    Deal Card
                </button>
                 <button
                    onClick={() => setIsSchematicModalOpen(true)}
                    className="flex items-center gap-2 text-sm bg-white hover:bg-gray-50 text-sky-600 font-bold py-2.5 px-4 rounded-lg transition-colors border border-gray-200 shadow-sm"
                    aria-label="View Window Diagram"
                >
                    <EyeIcon className="h-5 w-5" />
                    Diagram
                </button>
                 <button
                    onClick={() => setIsOrderListModalOpen(true)}
                    className="flex items-center gap-2 text-sm bg-white hover:bg-gray-50 text-slate-600 font-bold py-2.5 px-4 rounded-lg transition-colors border border-gray-200 shadow-sm"
                    aria-label="Generate Order List"
                >
                    <ClipboardListIcon className="h-5 w-5" />
                    Order List
                </button>
                 <button
                    onClick={() => setIsQuotationModalOpen(true)}
                    className="flex items-center gap-2 text-sm bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all"
                    aria-label="Generate Quotation"
                >
                    <DocumentTextIcon className="h-5 w-5" />
                    Quotation
                </button>
             </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
            {/* Column 1 */}
            <div className="space-y-4 p-5 bg-gray-50/80 rounded-xl border border-gray-100">
                <div>
                  <span className="text-slate-500 font-semibold block text-xs uppercase tracking-wide mb-1">Total Square Foot (Billed)</span>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-slate-800 text-xl">{billedTotalSqFt.toFixed(2)} <span className="text-sm font-normal text-slate-500">sq. ft.</span></p>
                    {billedTotalSqFt > 0 && (
                      <button
                        onClick={() => setIsBreakdownModalOpen(true)}
                        className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 px-2 py-1 rounded-md text-sky-600 hover:text-sky-700 font-bold shadow-sm"
                        aria-label="View price breakdown per window"
                      >
                        <PriceTagIcon className="h-3 w-3" />
                        Details
                      </button>
                    )}
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-200">
                    <span className="text-slate-500 font-semibold block text-xs uppercase tracking-wide mb-1">Total Materials Costs</span>
                    <p className="font-bold text-sky-600 font-mono text-xl">₱{formatNumberWithCommas(totalMaterialsCost)}</p>
                </div>
                <div className="pt-2 border-t border-gray-200">
                    <span className="text-slate-500 font-semibold block text-xs uppercase tracking-wide mb-1">Delivery Fee</span>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₱</span>
                        <input
                            type="text"
                            value={deliveryFee}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                    setDeliveryFee(value);
                                }
                            }}
                            className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-slate-900 font-mono text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition shadow-sm"
                            placeholder="0.00"
                            aria-label="Delivery Fee"
                        />
                    </div>
                </div>
            </div>
            
            {/* Column 2 */}
            <div className="space-y-4 p-5 bg-gray-50/80 rounded-xl border border-gray-100">
                <div>
                  <div className="flex items-center justify-between mb-1">
                      <label htmlFor="deal-percentage" className={`text-slate-500 font-semibold text-xs uppercase tracking-wide ${isManualPriceMode ? 'opacity-50' : ''}`}>Markup Percentage</label>
                      {isManualPriceMode && totalMaterialsCost > 0 && (
                          <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                              Effective: {effectiveMarkup.toFixed(1)}%
                          </span>
                      )}
                  </div>
                  <select
                      id="deal-percentage"
                      value={dealPercentage}
                      onChange={(e) => {
                          setManualPricePerSqFt(null);
                          setDealPercentage(Number(e.target.value));
                      }}
                      disabled={isManualPriceMode}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition disabled:opacity-50 disabled:bg-gray-100 shadow-sm"
                  >
                      {Array.from({ length: 15 }, (_, i) => 30 + i * 5).map(p => (
                          <option key={p} value={p}>{p}% Markup</option>
                      ))}
                  </select>
                </div>
                <div className="pt-2 border-t border-gray-200">
                    <span className="text-slate-500 font-semibold block text-xs uppercase tracking-wide mb-1">Deal Price (Total)</span>
                    <p className="font-bold text-2xl text-green-600 font-mono">₱{formatNumberWithCommas(finalDealPrice)}</p>
                </div>
                <div className="pt-2 border-t border-gray-200">
                     <div className="flex items-center gap-2 mb-1">
                        <label className="text-slate-500 font-semibold text-xs uppercase tracking-wide">Tax Rate</label>
                     </div>
                     <div className="relative">
                        <input
                            type="text"
                            value={taxPercentage}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                    setTaxPercentage(value);
                                }
                            }}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition shadow-sm"
                            placeholder="0"
                            aria-label="Tax Percentage"
                        />
                         <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                     </div>
                     {taxAmount > 0 && (
                        <p className="text-xs text-slate-500 mt-1 font-medium text-right">
                            + Tax: ₱{formatNumberWithCommas(taxAmount)}
                        </p>
                     )}
                </div>
            </div>

            {/* Column 3 */}
            <div className="space-y-4 p-5 bg-gray-50/80 rounded-xl border border-gray-100 flex flex-col justify-between">
                <div>
                    <span className="text-slate-500 font-semibold block text-xs uppercase tracking-wide mb-1">Price per Sq. Ft. (Base)</span>
                     <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono pointer-events-none">₱</span>
                        <input
                            type="text"
                            value={manualPricePerSqFt !== null ? manualPricePerSqFt : pricePerSqFtBase.toFixed(2)}
                            onChange={handlePricePerSqFtChange}
                            onBlur={handlePricePerSqFtBlur}
                            onFocus={(e) => e.target.select()}
                            className="w-full bg-white border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-slate-900 font-mono text-lg font-bold focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition shadow-sm"
                            aria-label="Price per Square Foot"
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-1 text-right">Overwrite to adjust total price</p>
                </div>
                <div className="pt-4 border-t border-gray-200">
                    <span className="text-slate-500 font-semibold block text-xs uppercase tracking-wide mb-1">Installer Shares (20%)</span>
                    <p className="font-bold text-orange-500 font-mono text-xl">₱{formatNumberWithCommas(installerShares)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">(Calculated on Base Deal Price)</p>
                </div>
            </div>
        </div>
        
        <div className="mt-8 pt-6 border-t-2 border-gray-100 flex flex-col items-center">
            <span className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">NET PROFIT (SEABIRD GLASS TECH)</span>
            <div className="bg-green-50 px-8 py-4 rounded-2xl border border-green-100 shadow-sm">
                <p className="text-4xl sm:text-5xl font-extrabold text-green-600 font-mono tracking-tighter">₱{formatNumberWithCommas(netProfit)}</p>
            </div>
        </div>
    </div>
    
      <Magic7PriceMonitor prices={prices} />

      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-200">
        <CategoryHeader icon={<BoxIcon className="h-6 w-6 text-sky-600" />} title={MaterialCategory.Aluminum} subTitle={calculationSummary}/>
        <MaterialTable materials={displayInventory.aluminum} headers={['Profile Name', 'Total Qty', 'Supplier Code', '252" Bars', 'Unit Price', 'Total Cost', 'Notes']} />
         {displayInventory.aluminumTotal > 0 && (
            <div className="flex justify-end mt-6 pt-4 border-t border-gray-100">
                <div className="text-right">
                    <span className="text-slate-500 font-medium text-sm uppercase tracking-wide block mb-1">Aluminum Subtotal</span>
                    <span className="text-2xl font-bold text-slate-800 font-mono">
                        ₱{formatNumberWithCommas(displayInventory.aluminumTotal)}
                    </span>
                </div>
            </div>
        )}
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-200">
        <CategoryHeader icon={<GlassIcon className="h-6 w-6 text-sky-600" />} title={MaterialCategory.Glass}>
          {displayInventory.panelCuts && displayInventory.panelCuts.length > 0 && (
              <button
              onClick={() => setIsPanelCutsModalOpen(true)}
              className="flex items-center gap-1.5 text-xs bg-sky-50 text-sky-600 hover:text-sky-700 hover:bg-sky-100 font-bold px-3 py-1.5 rounded-lg border border-sky-100 transition-colors"
              aria-label="View panel cut list"
              >
              <EyeIcon className="h-4 w-4" />
              View Cut List
              </button>
          )}
        </CategoryHeader>
        {totalStockSheetArea > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100 text-center shadow-sm">
              <div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Total Glass Usage</span>
                  <p className="text-2xl font-extrabold text-green-600">{usagePercentage.toFixed(1)}%</p>
              </div>
               <div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1" title="Total Usage % × Total Layout Sheets">Effective Sheets Used</span>
                  <p className="text-2xl font-extrabold text-sky-600">{effectiveSheetsUsed.toFixed(2)}</p>
              </div>
              <div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Total Glass Wastage</span>
                  <p className="text-2xl font-extrabold text-orange-500">{wastagePercentage.toFixed(1)}%</p>
              </div>
          </div>
        )}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50">
              <tr>
                {['Item', 'Layout Sheets', 'Billed Sheets', 'Size', 'Unit Price', 'Total Cost', 'Cutting Details'].map(header => (
                  <th key={header} className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {displayInventory.glass.map((material, index) => (
                <tr key={`${material.name}-${index}`} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-4 text-sm text-slate-800 font-semibold">{material.name}</td>
                  <td className="p-4 text-sm text-slate-600 font-mono text-center font-bold">{material.physicalSheets?.toFixed(0) ?? 'N/A'}</td>
                  <td className="p-4 text-sm text-slate-600 font-mono text-center">
                    <input
                      type="text"
                      value={billedSheetsInputs[index] ?? ''}
                      onChange={(e) => handleBilledSheetsChange(index, e.target.value)}
                      onBlur={() => handleBilledSheetsBlur(index)}
                      className="w-20 bg-white border border-gray-300 rounded-md px-2 py-1 text-slate-900 text-center font-mono focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition shadow-sm"
                      aria-label={`Billed sheets for ${material.name}`}
                    />
                  </td>
                  <td className="p-4 text-sm text-slate-600">{material.size}</td>
                  <td className="p-4 text-sm text-slate-800 font-mono font-medium">{typeof material.unitPrice === 'number' ? `₱${formatNumberWithCommas(material.unitPrice)}` : 'N/A'}</td>
                  <td className="p-4 text-sm text-slate-900 font-mono font-bold">{typeof material.totalCost === 'number' ? `₱${formatNumberWithCommas(material.totalCost)}` : 'N/A'}</td>
                  <td className="p-4 text-sm text-slate-600">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs">{material.notes?.replace(/.*?Details:\s*/, '')}</span>
                        {material.layoutData && material.layoutData.length > 0 && (
                            <button
                            onClick={() => setModalLayoutData(material.layoutData as SheetLayout[])}
                            className="flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 font-bold mt-2 sm:mt-0 sm:ml-4 flex-shrink-0 bg-sky-50 px-2 py-1 rounded border border-sky-100"
                            >
                            <EyeIcon className="h-3 w-3" />
                            Layout
                            </button>
                        )}
                        </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
         {displayInventory.glassTotal > 0 && (
            <div className="flex justify-end mt-6 pt-4 border-t border-gray-100">
                <div className="text-right">
                    <span className="text-slate-500 font-medium text-sm uppercase tracking-wide block mb-1">Glass Subtotal</span>
                    <span className="text-2xl font-bold text-slate-800 font-mono">
                        ₱{formatNumberWithCommas(displayInventory.glassTotal)}
                    </span>
                </div>
            </div>
        )}
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-200">
        <CategoryHeader icon={<WrenchIcon className="h-6 w-6 text-sky-600" />} title={MaterialCategory.Hardware} />
        <MaterialTable materials={displayInventory.hardware} headers={['Item', 'Qty', 'Details', 'Unit Price', 'Total Cost', 'Notes']} />
         {displayInventory.hardwareTotal > 0 && (
            <div className="flex justify-end mt-6 pt-4 border-t border-gray-100">
                <div className="text-right">
                    <span className="text-slate-500 font-medium text-sm uppercase tracking-wide block mb-1">Hardware Subtotal</span>
                    <span className="text-2xl font-bold text-slate-800 font-mono">
                        ₱{formatNumberWithCommas(displayInventory.hardwareTotal)}
                    </span>
                </div>
            </div>
        )}
      </div>

      {totalMaterialsCost > 0 && (
          <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-700 text-center sm:text-right overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500"></div>
            <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest mb-2">Estimated Project Total Cost</h3>
            <p className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-mono">
                ₱{formatNumberWithCommas(totalMaterialsCost)}
            </p>
         </div>
      )}

      <GlassCuttingDiagramModal 
        isOpen={!!modalLayoutData}
        onClose={() => setModalLayoutData(null)}
        layouts={modalLayoutData}
      />
      <PriceBreakdownModal
        isOpen={isBreakdownModalOpen}
        onClose={() => setIsBreakdownModalOpen(false)}
        windows={windows}
        pricePerSqFt={pricePerSqFtBase}
        clientName={clientName}
      />
      <PanelCutsModal
        isOpen={isPanelCutsModalOpen}
        onClose={() => setIsPanelCutsModalOpen(false)}
        panelCuts={displayInventory.panelCuts}
      />
      <OrderListModal
        isOpen={isOrderListModalOpen}
        onClose={() => setIsOrderListModalOpen(false)}
        inventory={displayInventory}
        clientName={clientName}
        supplierName={selectedSupplier}
        aluminumColor={aluminumColor}
      />
      <QuotationModal
        isOpen={isQuotationModalOpen}
        onClose={() => setIsQuotationModalOpen(false)}
        windows={windows}
        pricePerSqFt={pricePerSqFtBase}
        clientName={clientName}
        aluminumColor={aluminumColor}
        glassType={glassType}
        windowSeries={windowSeries}
        taxRate={taxRate}
        windowType={windowType}
        isTubularFraming={isTubularFraming}
        fixedFrameProfile={fixedFrameProfile}
        prices={prices}
        materialProperties={materialProperties}
        dealPercentage={dealPercentage}
        deliveryFee={deliveryFeeNum}
        supplier={selectedSupplier}
      />
      <WindowSchematicModal
        isOpen={isSchematicModalOpen}
        onClose={() => setIsSchematicModalOpen(false)}
        windows={windows.map(w => ({
            type: w.windowType,
            series: w.windowSeries || WindowSeries._798,
            isTubular: w.isTubularFraming || false,
            panels: w.panels,
            width: w.width,
            height: w.height,
            verticalGrids: w.verticalGrids,
            horizontalGrids: w.horizontalGrids,
            fixedFrameProfile: w.fixedFrameProfile,
            hasTransom: w.hasTransom,
            transomHeight: w.transomHeight,
            transomPosition: w.transomPosition,
            label: w.label
        }))}
      />
      <DealCardModal
        isOpen={isDealCardModalOpen}
        onClose={() => setIsDealCardModalOpen(false)}
        clientName={clientName}
        totalCost={finalDealPrice}
        windows={windows}
        aluminumColor={aluminumColor}
        glassType={glassType}
      />
    </div>
  );
};
