import React from 'react';
import { decimalToFraction } from '../utils/formatting';
import type { SheetLayout } from '../types';

interface GlassCuttingDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  layouts: SheetLayout[] | null;
}

export const GlassCuttingDiagramModal: React.FC<GlassCuttingDiagramModalProps> = ({ isOpen, onClose, layouts }) => {
  if (!isOpen || !layouts || layouts.length === 0) return null;

  const totalPanels = layouts.reduce((sum, sheet) => sum + sheet.placedPanels.length, 0);
  const firstSheet = layouts[0];
  const { stockWidth, stockHeight } = firstSheet;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4 transition-opacity duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="diagram-title"
    >
      <div 
        className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-700 animate-fade-in-up"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 sm:p-5 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
          <h2 id="diagram-title" className="text-lg font-bold text-white">Optimized Glass Cutting Layout</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close diagram viewer">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        
        <main className="p-4 sm:p-6 overflow-y-auto">
          <div className="text-center mb-6">
            <p className="text-slate-300">
              Layout for <span className="font-semibold text-sky-400">{totalPanels} panels</span> on <span className="font-semibold text-sky-400">{decimalToFraction(stockWidth)}" x {decimalToFraction(stockHeight)}"</span> sheets.
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Total sheets required: <span className="font-bold text-white">{layouts.length}</span>.
            </p>
          </div>

          {layouts.map((sheet, index) => {
            const sheetNumber = index + 1;
            const wasteArea = (sheet.stockWidth * sheet.stockHeight) - sheet.placedPanels.reduce((sum, p) => sum + (p.w * p.h), 0);
            const totalArea = sheet.stockWidth * sheet.stockHeight;
            const efficiency = totalArea > 0 ? ((totalArea - wasteArea) / totalArea) * 100 : 0;

            return (
              <div key={index} className="mb-10 last:mb-0">
                <h4 className="text-md font-semibold text-slate-300 text-center mb-3">
                  Sheet {sheetNumber} of {layouts.length} ({sheet.placedPanels.length} Panels)
                  <span className="text-xs text-slate-400 ml-2">({efficiency.toFixed(1)}% efficiency)</span>
                </h4>
                <div 
                  className="relative w-full max-w-xl mx-auto bg-slate-900/50 border-2 border-slate-600 shadow-inner" 
                  style={{ aspectRatio: `${sheet.stockWidth} / ${sheet.stockHeight}` }}
                >
                  {sheet.placedPanels.map((panel, i) => {
                    const left = (panel.x / sheet.stockWidth) * 100;
                    const top = (panel.y / sheet.stockHeight) * 100;
                    const width = (panel.w / sheet.stockWidth) * 100;
                    const height = (panel.h / sheet.stockHeight) * 100;

                    return (
                      <div
                        key={i}
                        className="absolute border border-dashed border-sky-400/50 bg-sky-500/20 flex items-center justify-center text-center p-1 overflow-hidden"
                        style={{
                          left: `${left}%`,
                          top: `${top}%`,
                          width: `${width}%`,
                          height: `${height}%`,
                        }}
                        title={`Window ${panel.windowIndex}: ${decimalToFraction(panel.sourceWidth)}" x ${decimalToFraction(panel.sourceHeight)}"`}
                      >
                        <div className="flex flex-col items-center justify-center leading-tight">
                            {panel.windowIndex && <b className="text-sm sm:text-base font-extrabold text-white">W{panel.windowIndex}</b>}
                            <span className="text-[10px] sm:text-xs text-white font-mono break-words">
                                {decimalToFraction(panel.sourceWidth)}"
                                <span className="text-slate-400 mx-0.5">x</span>
                                {decimalToFraction(panel.sourceHeight)}"
                            </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Dimension labels */}
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-slate-700 px-2 py-0.5 rounded-sm text-xs font-mono">{decimalToFraction(sheet.stockWidth)}"</div>
                  <div className="absolute top-1/2 -left-5 -translate-y-1/2 -rotate-90 bg-slate-700 px-2 py-0.5 rounded-sm text-xs font-mono">{decimalToFraction(sheet.stockHeight)}"</div>
                </div>
              </div>
            );
          })}
          
        </main>
      </div>
       <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
