
import React, { useRef, useState, useMemo } from 'react';
import type { PriceList, MaterialPropertiesList } from '../types';
import { AluminumColor, Supplier, WindowSeries, WindowType, GlassFinish, GlassThickness } from '../types';
import { calculateInventory } from '../services/inventoryCalculator';
import { formatNumberWithCommas } from '../utils/formatting';

declare global {
  interface Window {
    html2canvas: (element: HTMLElement, options?: any) => Promise<HTMLCanvasElement>;
  }
}

interface ClientPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  prices: PriceList;
  materialProperties: MaterialPropertiesList;
}

interface PricingRow {
  glassType: string;
  whiteCost: number;
  whiteClient: number;
  whiteProfit: number;
  whiteSqFt: number;
  blackCost: number;
  blackClient: number;
  blackProfit: number;
  blackSqFt: number;
}

export const ClientPricingModal: React.FC<ClientPricingModalProps> = ({ isOpen, onClose, prices, materialProperties }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [markupPercentage, setMarkupPercentage] = useState<number>(60);

  // Constants for Standard Unit
  const STANDARD_W = 48;
  const STANDARD_H = 48;
  const AREA_SQFT = (STANDARD_W * STANDARD_H) / 144;

  const pricingData = useMemo(() => {
    if (!isOpen) return [];

    const rows: PricingRow[] = [];
    const glassFinishes = Object.values(GlassFinish);
    const glassThicknesses = Object.values(GlassThickness);
    
    // Create a unique list of glass types available in prices or combinations
    const glassTypes: string[] = [];
    
    glassFinishes.forEach(finish => {
        glassThicknesses.forEach(thickness => {
            const key = `${finish}-${thickness}`;
            glassTypes.push(key);
        });
    });

    const standardWindow = {
        width: STANDARD_W,
        height: STANDARD_H,
        panels: 2,
        windowType: WindowType.Sliding,
        windowSeries: WindowSeries._798,
        label: 'Standard Unit'
    };

    glassTypes.forEach(glassType => {
        // Only calculate if glass type exists in price list (to avoid clutter) or just show all
        // To be safe, let's show all valid combinations but check if result > 0
        
        // White Calculation (PCW)
        const whiteCalc = calculateInventory({
            windows: [standardWindow],
            color: AluminumColor.White,
            supplier: Supplier.Best, // Use Best Price for market reference
            glassType: glassType,
            selectedStock: 'optimize',
            windowSeries: WindowSeries._798,
            windowType: WindowType.Sliding,
            isTubularFraming: false,
        }, prices, materialProperties);

        // Black Calculation (HA)
        const blackCalc = calculateInventory({
            windows: [standardWindow],
            color: AluminumColor.Black,
            supplier: Supplier.Best,
            glassType: glassType,
            selectedStock: 'optimize',
            windowSeries: WindowSeries._798,
            windowType: WindowType.Sliding,
            isTubularFraming: false,
        }, prices, materialProperties);

        // Filter out if no cost calculated (likely missing prices for this glass type)
        // Check glass total specifically to ensure glass price exists
        if (whiteCalc.glassTotal <= 0 && blackCalc.glassTotal <= 0) return;

        const whiteClient = whiteCalc.grandTotal * (1 + markupPercentage / 100);
        const blackClient = blackCalc.grandTotal * (1 + markupPercentage / 100);

        rows.push({
            glassType,
            whiteCost: whiteCalc.grandTotal,
            whiteClient: whiteClient,
            whiteProfit: whiteClient - whiteCalc.grandTotal,
            whiteSqFt: whiteClient / AREA_SQFT,
            blackCost: blackCalc.grandTotal,
            blackClient: blackClient,
            blackProfit: blackClient - blackCalc.grandTotal,
            blackSqFt: blackClient / AREA_SQFT,
        });
    });

    return rows;
  }, [isOpen, prices, materialProperties, markupPercentage, AREA_SQFT]);

  if (!isOpen) return null;

  const handleSaveAsJpeg = async () => {
    if (!printRef.current || !window.html2canvas) return;
    setIsSaving(true);
    try {
      const canvas = await window.html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Market Pricing - 48x48 Base Unit.jpeg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error saving image:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val >= 0) {
          setMarkupPercentage(val);
      } else if (e.target.value === '') {
          setMarkupPercentage(0);
      }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-[95vw] max-h-[95vh] flex flex-col border border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800 z-10 shrink-0">
          <h2 className="text-lg font-bold text-white">Client Pricing Market (Standard 48"x48" Unit)</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <main className="p-4 sm:p-8 bg-slate-900 overflow-y-auto flex justify-center">
            <div 
                ref={printRef} 
                className="bg-white p-8 sm:p-12 shadow-lg w-full max-w-[280mm] min-h-[297mm] flex flex-col text-slate-900"
            >
                <div className="text-center mb-8 border-b-2 border-slate-800 pb-6">
                     <h1 className="text-3xl font-extrabold text-slate-900 uppercase tracking-tight mb-2">Market Pricing Reference</h1>
                     <p className="text-slate-500 font-bold uppercase tracking-wider">Seabird Glasstech</p>
                     <p className="text-xs text-slate-400 mt-2">{new Date().toLocaleDateString()}</p>
                </div>

                <div className="bg-sky-50 p-6 rounded-lg border border-sky-100 mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-center sm:text-left">
                        <h3 className="text-sky-900 font-bold uppercase text-sm mb-1">Base Unit Specification</h3>
                        <p className="text-2xl font-bold text-sky-600">48" x 48"</p>
                        <p className="text-sm text-sky-800 font-medium">Standard Sliding Window (2 Panels)</p>
                        <p className="text-xs text-sky-700">798 Series • {AREA_SQFT} Sq. Ft.</p>
                    </div>
                    <div className="text-center sm:text-right flex flex-col items-center sm:items-end">
                         <h3 className="text-sky-900 font-bold uppercase text-sm mb-1">Pricing Model</h3>
                         <div className="flex items-center gap-2 bg-white px-3 py-1 rounded border border-sky-200 shadow-sm">
                             <span className="text-sky-700 font-bold">Markup:</span>
                             <div className="relative">
                                <input 
                                    type="number" 
                                    value={markupPercentage} 
                                    onChange={handleMarkupChange}
                                    className="w-16 font-bold text-sky-600 text-right border-b border-sky-300 focus:outline-none focus:border-sky-500 px-1"
                                />
                                <span className="text-sky-600 font-bold ml-1">%</span>
                             </div>
                         </div>
                    </div>
                </div>

                <table className="w-full text-left border-collapse mb-8 text-sm">
                    <thead>
                        <tr className="bg-slate-800 text-white">
                            <th rowSpan={2} className="p-3 font-bold uppercase tracking-wider border border-slate-700 align-bottom w-1/5">Glass Type</th>
                            <th colSpan={3} className="p-3 font-bold uppercase tracking-wider border border-slate-700 text-center bg-slate-700">White (PCW)</th>
                            <th colSpan={3} className="p-3 font-bold uppercase tracking-wider border border-slate-700 text-center bg-slate-900">Black (HA)</th>
                        </tr>
                        <tr className="bg-slate-100 text-slate-600 text-xs">
                            <th className="p-2 border border-slate-300 text-center font-bold">Client Price</th>
                            <th className="p-2 border border-slate-300 text-center text-green-600 font-bold">Profit</th>
                            <th className="p-2 border border-slate-300 text-center text-sky-600 font-bold">Per Sq.Ft</th>
                            <th className="p-2 border border-slate-300 text-center font-bold">Client Price</th>
                            <th className="p-2 border border-slate-300 text-center text-green-600 font-bold">Profit</th>
                            <th className="p-2 border border-slate-300 text-center text-sky-600 font-bold">Per Sq.Ft</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pricingData.map((row, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="p-3 border border-slate-200 font-bold text-slate-800">
                                    {row.glassType.replace(/-/g, ' ')}"
                                </td>
                                
                                {/* White PCW Data */}
                                <td className="p-3 border border-slate-200 text-center font-mono text-base font-bold text-slate-900">
                                    ₱{formatNumberWithCommas(row.whiteClient)}
                                </td>
                                <td className="p-3 border border-slate-200 text-center font-mono text-sm font-medium text-green-600">
                                    ₱{formatNumberWithCommas(row.whiteProfit)}
                                </td>
                                <td className="p-3 border border-slate-200 text-center font-mono text-sm font-bold text-sky-700">
                                    ₱{formatNumberWithCommas(row.whiteSqFt)}
                                </td>

                                {/* Black HA Data */}
                                <td className="p-3 border border-slate-200 text-center font-mono text-base font-bold text-slate-900 bg-gray-50/50">
                                    ₱{formatNumberWithCommas(row.blackClient)}
                                </td>
                                 <td className="p-3 border border-slate-200 text-center font-mono text-sm font-medium text-green-600 bg-gray-50/50">
                                    ₱{formatNumberWithCommas(row.blackProfit)}
                                </td>
                                <td className="p-3 border border-slate-200 text-center font-mono text-sm font-bold text-sky-700 bg-gray-50/50">
                                    ₱{formatNumberWithCommas(row.blackSqFt)}
                                </td>
                            </tr>
                        ))}
                        {pricingData.length === 0 && (
                             <tr>
                                 <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                                     No pricing data available for current settings.
                                 </td>
                             </tr>
                        )}
                    </tbody>
                </table>
                
                <div className="mt-auto text-xs text-slate-400 italic text-center pt-8 border-t border-slate-200">
                    * Prices include material cost + {markupPercentage}% markup. Installation and delivery may vary.
                </div>
            </div>
        </main>

        <footer className="p-4 border-t border-slate-700 flex justify-end bg-slate-800 rounded-b-lg sticky bottom-0 z-10 gap-3 shrink-0">
             <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors">
                Close
             </button>
             <button 
             onClick={handleSaveAsJpeg} 
             disabled={isSaving}
             className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-6 rounded-md transition-colors disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
           >
             {isSaving ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                </>
             ) : 'Save Pricing Sheet'}
           </button>
        </footer>
      </div>
    </div>
  );
};
