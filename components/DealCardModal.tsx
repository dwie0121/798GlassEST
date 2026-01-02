
import React, { useRef, useState } from 'react';
import type { WindowInputs } from '../types';
import { formatNumberWithCommas } from '../utils/formatting';

interface DealCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  totalCost: number;
  windows: WindowInputs[];
  aluminumColor: string;
  glassType: string;
}

export const DealCardModal: React.FC<DealCardModalProps> = ({ 
    isOpen, onClose, clientName, totalCost, windows, aluminumColor, glassType 
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSaveAsJpeg = async () => {
    const html2canvas = (window as any).html2canvas;
    if (!cardRef.current || !html2canvas) {
      alert("Error: Image capture library not ready.");
      return;
    }
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(cardRef.current, {
        scale: 4,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        width: 500,
        height: 750,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 500,
        windowHeight: 750,
        onclone: (clonedDoc: Document) => {
          const blurredElement = clonedDoc.querySelector('.privacy-blur') as HTMLElement;
          if (blurredElement) {
            blurredElement.style.filter = 'blur(25px)';
            blurredElement.style.opacity = '0.3';
          }
          const card = clonedDoc.querySelector('.deal-card-body') as HTMLElement;
          if (card) {
            card.style.borderRadius = '0px';
            card.style.boxShadow = 'none';
            card.style.margin = '0px';
            card.style.position = 'absolute';
            card.style.top = '0px';
            card.style.left = '0px';
          }
        }
      });
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
      const link = document.createElement('a');
      const safeName = (clientName || 'Project').replace(/[^a-z0-9]/gi, '_');
      link.href = dataUrl;
      link.download = `SEABIRD_ARCHITECTURAL_DEAL_${safeName}.jpeg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error saving Deal Card image:", error);
      alert("Failed to save image. Please try again.");
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  const uniqueSeries = Array.from(new Set(windows.map(w => w.windowSeries || '798')));
  const uniqueTypes = Array.from(new Set(windows.map(w => w.windowType)));
  
  const seriesString = uniqueSeries.map(s => `${s} Series`).join(' & ');
  const typesString = uniqueTypes.join(' & ');

  const dateStr = new Date().toLocaleDateString('en-PH', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const formattedTotal = formatNumberWithCommas(totalCost);
  const costMain = formattedTotal.split('.')[0];
  const costDecimal = formattedTotal.split('.')[1];

  const getCostFontSize = (length: number) => {
    if (length > 12) return 'text-3xl';
    if (length > 9) return 'text-4xl';
    if (length > 7) return 'text-5xl';
    return 'text-6xl';
  };

  return (
    <div 
      className="fixed inset-0 bg-stone-950/95 flex justify-center items-center z-50 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[2.5rem] shadow-[0_0_100px_rgba(168,162,158,0.2)] overflow-hidden flex flex-col border border-stone-200 w-full max-w-lg animate-card-appear max-h-[95vh]"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-stone-400 shadow-[0_0_8px_rgba(120,113,108,0.5)]"></div>
            <h2 className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">Authorized Deal Document</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-stone-400 hover:text-amber-700 transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <main className="p-0 overflow-y-auto bg-stone-200 flex flex-col items-center py-6">
            <div 
                ref={cardRef} 
                className="deal-card-body bg-[#FDFBF7] text-stone-900 p-8 font-sans w-[500px] h-[750px] flex flex-col relative overflow-hidden shrink-0"
            >
                {/* Visual Decorative Frame - Beige/Gold Gradient */}
                <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-stone-400 via-amber-200 to-stone-500"></div>
                
                {/* Elegant Texture Background */}
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" 
                     style={{ 
                        backgroundImage: 'radial-gradient(#78716c 1.5px, transparent 1.5px)', 
                        backgroundSize: '30px 30px' 
                     }}></div>
                
                {/* Beige Bloom Accents */}
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-amber-50 rounded-full blur-[80px]"></div>
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-stone-100 rounded-full blur-[80px]"></div>

                <div className="relative z-10 flex flex-col items-center h-full">
                    <header className="mb-8 flex flex-col items-center text-center">
                        <div className="bg-stone-800 text-amber-100 p-5 rounded-[2.5rem] mb-5 shadow-2xl shadow-stone-900/20 ring-8 ring-stone-50 border-2 border-stone-600">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                             </svg>
                        </div>
                        <h1 className="text-3xl font-black text-stone-800 tracking-tighter uppercase mb-1 leading-none">SEABIRD GLASSTECH</h1>
                        <div className="flex items-center gap-3 w-full justify-center my-3">
                            <div className="h-[1.5px] w-8 bg-stone-300 rounded-full"></div>
                            <span className="text-stone-500 font-black text-[9px] uppercase tracking-[0.4em] whitespace-nowrap">Premium Architectural Craft</span>
                            <div className="h-[1.5px] w-8 bg-stone-300 rounded-full"></div>
                        </div>
                    </header>
                    
                    <div className="flex-grow w-full space-y-7 flex flex-col justify-center">
                        {/* Privacy Container */}
                        <div className="text-center">
                            <p className="text-[9px] font-black text-stone-400 uppercase tracking-[0.25em] mb-4">Official Agreement Prepared For</p>
                            <div className="relative inline-block px-12 py-3.5">
                                <div className="privacy-blur text-2xl font-black text-stone-900 select-none leading-none tracking-widest opacity-10" 
                                    style={{ filter: 'blur(22px)' }}>
                                    {clientName ? clientName.replace(/./g, 'X') : 'VALUED CUSTOMER'}
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="bg-white/90 backdrop-blur-3xl border border-stone-200 px-6 py-2 rounded-2xl shadow-lg flex items-center gap-2">
                                        <svg className="h-4 w-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                        <span className="text-[10px] font-black text-stone-600 uppercase tracking-[0.2em]">Confidential Account</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BEIGE THEME: Total Deal Price Section */}
                        <div className="bg-[#E9E1D2] rounded-[2.5rem] p-10 text-center shadow-[0_20px_50px_-15px_rgba(120,113,108,0.3)] relative border-4 border-white w-full overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.4),transparent_70%)] pointer-events-none"></div>
                            
                            <p className="text-stone-500 text-[10px] font-black uppercase tracking-[0.4em] mb-4">Total Project Investment</p>
                            <div className="flex items-start justify-center gap-1.5 text-stone-800">
                                <span className="text-stone-500 text-3xl font-black mt-2">₱</span>
                                <p className={`${getCostFontSize(costMain.length)} font-black tracking-tighter font-mono leading-none drop-shadow-sm`}>
                                    {costMain}
                                </p>
                                <span className="text-stone-500 text-2xl font-bold mt-2">.{costDecimal}</span>
                            </div>
                            
                            <div className="mt-5 inline-flex items-center gap-2 px-4 py-1.5 bg-white/40 rounded-full border border-stone-300/30 backdrop-blur-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>
                                <span className="text-[9px] font-black text-stone-600 uppercase tracking-[0.2em]">Authentic Value Verified</span>
                            </div>
                        </div>

                        {/* BEIGE THEME: Detailed Specifications */}
                        <div className="bg-stone-50/70 rounded-[2rem] p-8 border border-stone-200/50 w-full shadow-inner">
                             <div className="flex items-center gap-3 mb-6 border-b border-stone-200 pb-4">
                                <div className="bg-stone-800 text-amber-50 p-2 rounded-xl">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <span className="text-[10px] font-black text-stone-800 uppercase tracking-[0.25em]">Deal Configuration</span>
                             </div>
                             <div className="space-y-6">
                                 <div>
                                    <p className="text-[8px] text-stone-400 font-black uppercase tracking-widest mb-1.5">Architectural Specification</p>
                                    <p className="text-base font-black text-stone-800 leading-tight uppercase">
                                        <span className="text-amber-700">{seriesString}</span> {typesString}
                                    </p>
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                     <div className="border-l-3 border-stone-400 pl-4">
                                        <p className="text-[8px] text-stone-400 font-black uppercase tracking-widest mb-0.5">Aluminum Finish</p>
                                        <p className="text-xs font-black text-stone-700 uppercase truncate">{aluminumColor}</p>
                                     </div>
                                     <div className="border-l-3 border-amber-300 pl-4">
                                        <p className="text-[8px] text-stone-400 font-black uppercase tracking-widest mb-0.5">Glass Technology</p>
                                        <p className="text-xs font-black text-stone-700 uppercase truncate">{glassType.split('-')[0]}</p>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    </div>

                    {/* Authentication Section */}
                    <div className="mt-6 flex flex-col items-center w-full">
                         <div className="flex items-center gap-4 px-12 py-3.5 bg-stone-800 text-amber-50 rounded-full shadow-2xl shadow-stone-200 border-4 border-white transition-transform hover:scale-105 active:scale-95 cursor-default">
                             <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                             <span className="text-xs font-black uppercase tracking-[0.4em]">Official Deal Seal</span>
                         </div>
                         <div className="mt-8 flex flex-col items-center text-center opacity-30 grayscale pointer-events-none select-none">
                             <p className="text-[7px] font-black text-stone-500 uppercase tracking-[0.6em]">ISSUED: {dateStr} • SEABIRD GLASSTECH AUTHORIZED RECORD</p>
                             <div className="flex gap-1.5 mt-4">
                                {[...Array(20)].map((_, i) => <div key={i} className="w-1.5 h-4 bg-stone-900 rounded-sm"></div>)}
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        </main>
        
        <footer className="p-8 border-t border-stone-100 flex flex-col sm:flex-row gap-5 bg-white sticky bottom-0 z-20 shrink-0">
             <button 
                onClick={onClose} 
                className="flex-1 px-8 py-5 text-stone-400 hover:text-stone-700 font-black text-[11px] uppercase tracking-widest rounded-3xl transition-all hover:bg-stone-50 active:scale-95"
             >
                Cancel
             </button>
             <button 
                onClick={handleSaveAsJpeg} 
                disabled={isSaving}
                className={`flex-[2] py-5 px-10 rounded-[2.25rem] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4 border-b-4 ${
                    isSaving 
                    ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed' 
                    : 'bg-stone-800 hover:bg-stone-700 text-white border-stone-950 shadow-stone-900/20'
                }`}
           >
             {isSaving ? (
                <>
                    <svg className="animate-spin h-5 w-5 text-amber-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="font-black text-[11px] uppercase tracking-[0.2em]">Finalizing Card...</span>
                </>
             ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="font-black text-[11px] uppercase tracking-[0.2em]">Download Official Card</span>
                </>
             )}
           </button>
        </footer>
      </div>
      <style>{`
        @keyframes card-appear {
          from { opacity: 0; transform: translateY(60px) scale(0.92); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-card-appear {
          animation: card-appear 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};
