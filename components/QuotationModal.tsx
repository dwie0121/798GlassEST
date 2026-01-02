
import React, { useState, useRef, useMemo } from 'react';
import type { WindowInputs, WindowType, WindowSeries, PriceList, MaterialPropertiesList, Supplier } from '../types';
import { AluminumColor, GlassFinish, GlassThickness, WindowSeries as WindowSeriesEnum } from '../types';
import { calculateInventory } from '../services/inventoryCalculator';
import { formatNumberWithCommas, applyBillingRounding } from '../utils/formatting';

declare global {
  interface Window {
    html2canvas: (element: HTMLElement, options?: any) => Promise<HTMLCanvasElement>;
  }
}

interface QuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  windows: WindowInputs[];
  pricePerSqFt: number;
  clientName: string;
  aluminumColor: string;
  glassType: string;
  windowSeries: string;
  taxRate: number;
  windowType: WindowType;
  isTubularFraming: boolean;
  fixedFrameProfile?: string;
  prices: PriceList;
  materialProperties: MaterialPropertiesList;
  dealPercentage: number;
  deliveryFee: number;
  supplier: Supplier;
}

interface ComparisonOption {
  id: string;
  color: string;
  finish: GlassFinish;
  thickness: GlassThickness;
  series: WindowSeriesEnum;
  label: string;
}

export const QuotationModal: React.FC<QuotationModalProps> = ({ 
    isOpen, onClose, windows, pricePerSqFt, clientName, aluminumColor, glassType, windowSeries, taxRate, windowType, isTubularFraming, fixedFrameProfile,
    prices, materialProperties, dealPercentage, deliveryFee, supplier
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  
  // Package Builder State
  const [newSeries, setNewSeries] = useState<WindowSeriesEnum>(WindowSeriesEnum._798);
  const [newColor, setNewColor] = useState<string>(AluminumColor.White);
  const [newFinish, setNewFinish] = useState<GlassFinish>(GlassFinish.Clear);
  const [newThickness, setNewThickness] = useState<GlassThickness>(GlassThickness._1_4);

  // Default comparison candidates
  const [comparisonConfigs, setComparisonConfigs] = useState<ComparisonOption[]>([
      { id: '1', color: 'White', finish: GlassFinish.Clear, thickness: GlassThickness._1_4, series: WindowSeriesEnum._798, label: '798 White/Clear' },
      { id: '2', color: 'Black', finish: GlassFinish.OrdinaryBronze, thickness: GlassThickness._1_4, series: WindowSeriesEnum._798, label: '798 Black/Bronze' },
      { id: '3', color: 'White', finish: GlassFinish.Clear, thickness: GlassThickness._1_4, series: WindowSeriesEnum.TR, label: 'TR White/Clear' },
      { id: '4', color: 'Black', finish: GlassFinish.OrdinaryBronze, thickness: GlassThickness._1_4, series: WindowSeriesEnum.TR, label: 'TR Black/Bronze' },
  ]);

  const [activeComparisonIds, setActiveComparisonIds] = useState<string[]>(['1', '2']);

  const toggleComparisonId = (id: string) => {
      setActiveComparisonIds(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
  };

  const removeComparisonId = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setComparisonConfigs(prev => prev.filter(c => c.id !== id));
      setActiveComparisonIds(prev => prev.filter(i => i !== id));
  };

  const handleAddOption = () => {
      const id = Date.now().toString();
      const label = `${newSeries} ${newColor}/${newFinish}`;
      const newOption: ComparisonOption = {
          id,
          color: newColor,
          finish: newFinish,
          thickness: newThickness,
          series: newSeries,
          label
      };
      setComparisonConfigs(prev => [...prev, newOption]);
      setActiveComparisonIds(prev => [...prev, id]);
  };

  const alternativePrices = useMemo(() => {
    if (!isOpen || !showComparison) return [];

    return comparisonConfigs.map((config) => {
        if (!activeComparisonIds.includes(config.id)) return null;

        const gType = `${config.finish}-${config.thickness}`;
        
        // Force the series for all windows in this comparison to see the project cost in that series
        const modifiedWindows = windows.map(w => ({
            ...w,
            windowSeries: config.series
        }));

        const calc = calculateInventory({
            windows: modifiedWindows,
            color: config.color as any,
            supplier,
            glassType: gType,
            selectedStock: 'optimize',
            windowSeries: config.series, // Fallback
            windowType,
            isTubularFraming
        }, prices, materialProperties);

        const basePrice = (calc.grandTotal + deliveryFee) * (1 + dealPercentage / 100);
        const taxVal = basePrice * (taxRate / 100);
        
        return {
            ...config,
            total: basePrice + taxVal
        };
    }).filter(Boolean);
  }, [isOpen, showComparison, comparisonConfigs, activeComparisonIds, windows, supplier, windowType, isTubularFraming, prices, materialProperties, deliveryFee, dealPercentage, taxRate]);

  if (!isOpen) return null;

  const handleSaveAsJpeg = async () => {
    if (!printRef.current || !window.html2canvas) {
      console.error("Cannot save image: ref or html2canvas not found.");
      return;
    }
    setIsSaving(true);
    try {
      const canvas = await window.html2canvas(printRef.current, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Quotation - ${clientName || 'Project'}.jpeg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error saving image:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const formattedGlassType = glassType.replace('-', ' ') + '"';
  
  let frameDescription = `${windowSeries} Series ${aluminumColor}`;
  if (windowType === 'Fixed' && fixedFrameProfile) {
      frameDescription += ` (${fixedFrameProfile.replace('1-3/4', '1 ¾')})`;
  } else if (windowType === 'Awning') {
      frameDescription += isTubularFraming ? ' (Tubular Frame)' : ' (Perimeter Frame)';
  } else {
      frameDescription += ' Frame';
  }

  const windowData = windows.map((window, index) => {
    const originalWidthFt = window.width / 12;
    const originalHeightFt = window.height / 12;
    
    const roundedWidthFt = applyBillingRounding(originalWidthFt);
    const roundedHeightFt = applyBillingRounding(originalHeightFt);
    
    const displayDim = `${roundedWidthFt.toFixed(2)}' × ${roundedHeightFt.toFixed(2)}'`;
    const areaSqFt = roundedWidthFt * roundedHeightFt;
    const price = areaSqFt * pricePerSqFt;
    const label = window.label || `W${index + 1}`;

    let description = `${window.windowType} Window`;
    if (window.windowType === 'Sliding') {
        const series = window.windowSeries || '798';
        const panels = window.panels || 2;
        description = `${series} Series Sliding Window (${panels} Panels)`;
        if (window.hasTransom && window.transomHeight) {
            description += ` w/ Transom`;
        }
    } else if (window.windowType === 'Awning') {
        const sections = window.panels || 1;
        description = `Awning Window (${sections} Section${sections > 1 ? 's' : ''})`;
        if (window.isTubularFraming) {
            description += ' (Tubular)';
        }
    } else if (window.windowType === 'Fixed') {
        description = `Fixed Window`;
        if (window.fixedFrameProfile) {
            description += ` (${window.fixedFrameProfile})`;
        }
        if ((window.verticalGrids || 0) > 0 || (window.horizontalGrids || 0) > 0) {
             description += ` w/ Grids`;
        }
    }

    return { label, displayDim, price, description };
  });

  const subtotal = windowData.reduce((acc, data) => acc + data.price, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = subtotal + taxAmount;
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quotation-title"
    >
      <div 
        className="bg-slate-800 rounded-lg shadow-2xl overflow-hidden flex flex-col border border-slate-700 max-h-[95vh] w-full max-w-7xl"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 sm:p-5 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 id="quotation-title" className="text-lg font-bold text-white">Quotation Preview</h2>
            <div className="flex items-center bg-slate-700 rounded-full px-3 py-1 shadow-inner">
                <label className="flex items-center gap-2 text-xs font-bold text-sky-400 cursor-pointer select-none">
                    <input type="checkbox" checked={showComparison} onChange={e => setShowComparison(e.target.checked)} className="rounded text-sky-500 focus:ring-sky-500"/>
                    Include Package Comparison
                </label>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close Quotation">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <div className="flex flex-col md:flex-row flex-grow overflow-hidden">
            {/* Sidebar for comparison selection */}
            {showComparison && (
                <div className="w-full md:w-80 bg-slate-900/50 p-4 border-r border-slate-700 overflow-y-auto shrink-0 space-y-6">
                    <div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-4 h-[1px] bg-slate-700"></span>
                            Package Builder
                        </h3>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-4 shadow-xl">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Series</label>
                                <select value={newSeries} onChange={e => setNewSeries(e.target.value as any)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white focus:ring-1 focus:ring-sky-500">
                                    {Object.values(WindowSeriesEnum).map(s => <option key={s} value={s}>{s} Series</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Aluminum Color</label>
                                <select value={newColor} onChange={e => setNewColor(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white focus:ring-1 focus:ring-sky-500">
                                    {Object.values(AluminumColor).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Glass</label>
                                    <select value={newFinish} onChange={e => setNewFinish(e.target.value as any)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-[10px] text-white focus:ring-1 focus:ring-sky-500">
                                        {Object.values(GlassFinish).map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Thick</label>
                                    <select value={newThickness} onChange={e => setNewThickness(e.target.value as any)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-[10px] text-white focus:ring-1 focus:ring-sky-500">
                                        {Object.values(GlassThickness).map(t => <option key={t} value={t}>{t}"</option>)}
                                    </select>
                                </div>
                            </div>
                            <button onClick={handleAddOption} className="w-full bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold uppercase py-2 rounded-lg transition-colors shadow-lg">
                                Add Package Option
                            </button>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-4 h-[1px] bg-slate-700"></span>
                            Visible Packages
                        </h3>
                        <div className="space-y-2">
                            {comparisonConfigs.map((config) => (
                                <div 
                                    key={config.id} 
                                    className={`p-3 rounded-lg border transition-all cursor-pointer relative group ${activeComparisonIds.includes(config.id) ? 'bg-sky-900/30 border-sky-500/50' : 'bg-slate-800/50 border-slate-700 opacity-60'}`} 
                                    onClick={() => toggleComparisonId(config.id)}
                                >
                                    <button 
                                        onClick={(e) => removeComparisonId(e, config.id)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[9px] font-black text-sky-400 uppercase tracking-tighter">{config.series} Series</span>
                                        {activeComparisonIds.includes(config.id) && <div className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]"></div>}
                                    </div>
                                    <p className="text-xs font-bold text-white leading-tight">{config.label}</p>
                                    <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-widest">{config.color} Finish</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-grow p-4 sm:p-6 overflow-y-auto bg-slate-900 flex justify-center">
                <div 
                    ref={printRef} 
                    className="bg-white text-slate-900 p-10 font-sans shadow-lg mx-auto flex flex-col"
                    style={{ width: '210mm', minHeight: '297mm' }}
                >
                    <header className="text-center mb-10">
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight uppercase">SEABIRD GLASSTECH</h1>
                        <p className="text-slate-600 font-medium mt-1 uppercase tracking-wide text-xs">San Matias, Dingle • Iloilo</p>
                    </header>
                    
                    <div className="border-t-2 border-slate-900 my-8"></div>

                    <div className="flex justify-between items-end mb-10">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wide">Official Quotation</h2>
                            <p className="text-xs text-slate-500 mt-1 font-medium">{windowType} Architectural Project</p>
                        </div>
                        <div className="text-right text-xs">
                            <p className="text-slate-500 font-medium">Date Issued</p>
                            <p className="font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="flex justify-between mb-10 gap-8">
                        <div className="w-1/2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Prepared For</p>
                            <p className="text-lg font-bold text-slate-900">{clientName || 'Valued Customer'}</p>
                        </div>
                        <div className="w-1/2 text-right">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Selected Configuration</p>
                            <div className="inline-block text-left">
                                <p className="text-slate-800 text-sm"><span className="font-semibold text-slate-600 w-12 inline-block">Frame:</span> {frameDescription}</p>
                                <p className="text-slate-800 text-sm"><span className="font-semibold text-slate-600 w-12 inline-block">Glass:</span> {formattedGlassType}</p>
                            </div>
                        </div>
                    </div>

                    <table className="w-full text-left border-collapse mb-10">
                        <thead>
                            <tr className="border-b-2 border-slate-900 bg-slate-50">
                                <th className="py-3 px-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider w-10">No.</th>
                                <th className="py-3 px-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider w-14">Unit</th>
                                <th className="py-3 px-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Description</th>
                                <th className="py-3 px-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider text-right w-32">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {windowData.map((data, index) => (
                                <tr key={index} className="border-b border-slate-200">
                                    <td className="py-3 px-2 text-xs text-slate-500 font-medium align-top">{index + 1}</td>
                                    <td className="py-3 px-2 text-xs text-sky-700 font-bold align-top">{data.label}</td>
                                    <td className="py-3 px-2 text-xs text-slate-800 align-top">
                                        <span className="block font-bold text-slate-900">{data.description}</span>
                                        <span className="block text-slate-500 text-[10px] mt-0.5">Dimensions: <span className="font-mono">{data.displayDim}</span></span>
                                    </td>
                                    <td className="py-3 px-2 text-xs text-slate-900 font-mono font-bold text-right align-top">₱{formatNumberWithCommas(data.price)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    <div className="flex justify-end mb-12">
                        <div className="w-64 space-y-2">
                            <div className="flex justify-between text-xs text-slate-600">
                                <span>Subtotal</span>
                                <span className="font-mono">₱{formatNumberWithCommas(subtotal)}</span>
                            </div>
                            {taxRate > 0 && (
                                <div className="flex justify-between text-xs text-slate-600">
                                    <span>Tax ({taxRate}%)</span>
                                    <span className="font-mono">₱{formatNumberWithCommas(taxAmount)}</span>
                                </div>
                            )}
                            <div className="border-t-2 border-slate-900 pt-3 flex justify-between items-baseline mt-2">
                                <span className="text-base font-bold text-slate-900">Grand Total</span>
                                <span className="text-xl font-bold text-slate-900 font-mono">₱{formatNumberWithCommas(grandTotal)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Comparative Package Summary */}
                    {(showComparison && alternativePrices.length > 0) && (
                        <div className="mb-12 pt-8 border-t-4 border-slate-100">
                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] mb-6 flex items-center gap-4">
                                Comparative Project Packages
                                <span className="flex-grow h-[1px] bg-slate-100"></span>
                            </h3>
                            <div className="grid grid-cols-2 gap-6">
                                {alternativePrices.map((alt, i) => alt && (
                                    <div key={i} className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 shadow-sm">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-sky-600 uppercase tracking-widest">{alt.series} Series</span>
                                                <span className="text-[10px] font-bold text-slate-800 uppercase">{alt.color} Finish</span>
                                            </div>
                                            <span className="text-[8px] font-bold text-slate-400 border border-slate-200 px-2 py-0.5 rounded-full">{alt.finish}</span>
                                        </div>
                                        <div className="flex justify-between items-end border-t border-slate-100 pt-3">
                                            <span className="text-[9px] font-medium text-slate-500">Project Total</span>
                                            <span className="text-lg font-black text-slate-900 font-mono tracking-tighter">₱{formatNumberWithCommas(alt.total)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-auto grid grid-cols-2 gap-10">
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-6">Prepared by:</p>
                            <div className="border-b-2 border-slate-900 w-3/4 mb-2"></div>
                            <p className="font-bold text-slate-900 text-sm uppercase">Edwin L. Daguro</p>
                            <p className="text-xs text-slate-600 font-medium">Owner, SEABIRD GLASSTECH</p>
                            <p className="text-xs text-slate-600 font-mono">0931-775-1980</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-6">Customer Approval:</p>
                            <div className="border-b-2 border-slate-300 w-3/4 mb-2"></div>
                            <p className="text-xs text-slate-400 italic">Signature over Printed Name</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>

        <footer className="p-4 border-t border-slate-700 flex justify-end gap-3 bg-slate-800 z-10">
           <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors">
             Cancel
           </button>
           <button 
             onClick={handleSaveAsJpeg} 
             disabled={isSaving}
             className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-6 rounded-md transition-colors disabled:opacity-50 disabled:cursor-wait flex items-center gap-2 shadow-lg"
           >
             {isSaving ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                </>
             ) : 'Save Quotation (JPEG)'}
           </button>
        </footer>
      </div>
    </div>
  );
};
