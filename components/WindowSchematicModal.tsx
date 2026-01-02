
import React, { useRef, useState } from 'react';
import { WindowType, WindowSeries } from '../types';
import { decimalToFraction } from '../utils/formatting';
import { WindowSchematic } from './WindowSchematic';

// Declare html2canvas globally for this file
declare global {
  interface Window {
    html2canvas: (element: HTMLElement, options?: any) => Promise<HTMLCanvasElement>;
  }
}

interface WindowSchematicModalProps {
  isOpen: boolean;
  onClose: () => void;
  windows: Array<{
      type: WindowType;
      series: WindowSeries;
      isTubular: boolean;
      panels: number;
      width: number;
      height: number;
      verticalGrids?: number;
      horizontalGrids?: number;
      fixedFrameProfile?: string;
      hasTransom?: boolean;
      transomHeight?: number;
      transomPosition?: 'top' | 'bottom';
      label?: string;
  }>;
}

export const WindowSchematicModal: React.FC<WindowSchematicModalProps> = ({ isOpen, onClose, windows }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || windows.length === 0) return null;

  const handleSaveAsJpeg = async () => {
    if (!containerRef.current || !window.html2canvas) return;
    setIsSaving(true);
    try {
      const pages = containerRef.current.querySelectorAll('.schematic-page');
      
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        const canvas = await window.html2canvas(page, {
          scale: 2, // High resolution for print quality
          backgroundColor: '#ffffff',
          useCORS: true,
        });
        
        // Get the label from the data attribute or fallback to index
        const label = page.getAttribute('data-label') || `Window_${i + 1}`;
        const sanitizedLabel = label.replace(/[^a-z0-9]/gi, '_').toLowerCase();

        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `Schematic_${sanitizedLabel}.jpeg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Add a small delay between downloads to prevent browser throttling
        if (i < pages.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error("Error saving image:", error);
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-lg shadow-2xl overflow-hidden flex flex-col border border-slate-700 max-h-[95vh] w-full max-w-6xl"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800 z-10 shrink-0">
          <h2 className="text-lg font-bold text-white">Project Window Schematics</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <main className="p-4 sm:p-8 bg-slate-900 overflow-y-auto flex justify-center">
            {/* Container for all pages */}
            <div ref={containerRef} className="flex flex-col gap-8 items-center">
                {windows.map((windowData, index) => {
                     const { 
                        type, series, isTubular, panels, width, height, 
                        verticalGrids = 0, horizontalGrids = 0, fixedFrameProfile = '1x2', 
                        hasTransom = false, transomHeight = 0, transomPosition = 'top',
                        label
                      } = windowData;
                      
                     const typeLabel = type === WindowType.Sliding ? 'Sliding' : type === WindowType.Awning ? 'Awning' : 'Fixed';
                     const displayLabel = label || `Window ${index + 1}`;
                     const dateStr = new Date().toLocaleDateString();

                     return (
                        <div 
                            key={index}
                            data-label={displayLabel}
                            className="schematic-page bg-white p-10 shadow-lg flex flex-col relative"
                            style={{ width: '210mm', height: '297mm', boxSizing: 'border-box' }}
                        >
                             {/* Page Header */}
                            <div className="flex justify-between items-end border-b-2 border-slate-800 pb-4 mb-8">
                                <div>
                                    <h1 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight">Window Schematic</h1>
                                    <p className="text-slate-500 text-sm mt-1 font-medium">{displayLabel}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400 font-mono">SEABIRD GLASSTECH</p>
                                    <p className="text-xs text-slate-400 font-mono">{dateStr}</p>
                                </div>
                            </div>

                            {/* Main Content: Centered Diagram */}
                            <div className="flex-grow flex flex-col items-center justify-center">
                                <div className="mb-6 text-center w-full">
                                    <div className="text-slate-900 font-bold text-2xl mb-2">{typeLabel} Window</div>
                                    <div className="text-slate-600 font-medium text-lg">
                                        {series} Series 
                                        {type !== WindowType.Fixed && <span> • {panels} {panels > 1 ? 'Panels' : 'Panel'}</span>}
                                    </div>
                                    <div className="text-slate-500 font-mono text-sm mt-2">
                                        Dimensions: {decimalToFraction(width)}" x {decimalToFraction(height)}"
                                        {hasTransom && transomHeight > 0 && ` + ${decimalToFraction(transomHeight)}" Transom`}
                                    </div>
                                    {type === WindowType.Fixed && (
                                         <div className="text-slate-400 text-xs mt-1">Grids: {verticalGrids}V x {horizontalGrids}H</div>
                                    )}
                                </div>

                                <div className="w-full max-w-[190mm] flex justify-center py-4">
                                    <WindowSchematic 
                                        type={type} 
                                        series={series} 
                                        isTubular={isTubular} 
                                        panels={panels} 
                                        width={width} 
                                        height={height}
                                        verticalGrids={verticalGrids}
                                        horizontalGrids={horizontalGrids}
                                        fixedFrameProfile={fixedFrameProfile}
                                        hasTransom={hasTransom}
                                        transomHeight={transomHeight}
                                        transomPosition={transomPosition}
                                        showLegend={true}
                                        theme="light" 
                                    />
                                </div>
                            </div>
                            
                            {/* Page Footer */}
                            <div className="mt-auto pt-6 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
                                <span className="italic">* Representation for material identification. Not to scale.</span>
                                <span className="font-mono font-bold text-slate-300">Page {index + 1} of {windows.length}</span>
                            </div>
                        </div>
                     )
                })}
            </div>
        </main>
        
        <footer className="p-4 border-t border-slate-700 flex justify-end bg-slate-800 rounded-b-lg sticky bottom-0 z-10 gap-3 shrink-0">
             <div className="mr-auto text-slate-400 text-sm flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {windows.length} Page{windows.length > 1 ? 's' : ''} Generated
             </div>
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
                    Saving {windows.length} Files...
                </>
             ) : `Save All as JPEGs (${windows.length})`}
           </button>
        </footer>
      </div>
    </div>
  );
};
