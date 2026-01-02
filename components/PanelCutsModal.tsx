import React from 'react';
import type { PanelCut } from '../types';
import { decimalToFraction } from '../utils/formatting';

interface PanelCutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  panelCuts: PanelCut[] | undefined;
}

interface AggregatedCut {
    width: number;
    height: number;
    quantity: number;
}

export const PanelCutsModal: React.FC<PanelCutsModalProps> = ({ isOpen, onClose, panelCuts }) => {
  if (!isOpen || !panelCuts || panelCuts.length === 0) return null;

  const aggregatedCutsMap = new Map<string, AggregatedCut>();

  panelCuts.forEach(panel => {
      const widthStr = panel.width.toFixed(3); // Round to handle floating point inconsistencies
      const heightStr = panel.height.toFixed(3);
      const key = `${widthStr}x${heightStr}`;

      const existing = aggregatedCutsMap.get(key);
      if (existing) {
          existing.quantity += 1;
      } else {
          aggregatedCutsMap.set(key, { width: panel.width, height: panel.height, quantity: 1 });
      }
  });

  const aggregatedCuts = Array.from(aggregatedCutsMap.values()).sort((a, b) => {
    if (b.quantity !== a.quantity) {
      return b.quantity - a.quantity; // Sort by quantity descending
    }
    return (b.width * b.height) - (a.width * a.height); // Then by area descending
  });


  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="panel-cuts-title"
    >
      <div
        className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 sm:p-5 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
          <h2 id="panel-cuts-title" className="text-lg font-bold text-white">Glass Panel Cut List</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close panel cuts list">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        <main className="p-4 sm:p-6 overflow-y-auto">
          <p className="text-sm text-slate-400 text-center mb-4">
            Total panels to cut: <span className="font-semibold text-white">{panelCuts.length}</span>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-sm font-medium text-slate-400 border-b border-slate-600 uppercase tracking-wider">#</th>
                  <th className="p-3 text-sm font-medium text-slate-400 border-b border-slate-600 uppercase tracking-wider text-center">Quantity</th>
                  <th className="p-3 text-sm font-medium text-slate-400 border-b border-slate-600 uppercase tracking-wider text-right">Width (in)</th>
                  <th className="p-3 text-sm font-medium text-slate-400 border-b border-slate-600 uppercase tracking-wider text-right">Height (in)</th>
                </tr>
              </thead>
              <tbody>
                {aggregatedCuts.map((panel, index) => (
                  <tr key={index} className="hover:bg-slate-700/50 transition-colors">
                    <td className="p-3 text-sm text-slate-300 border-b border-slate-700 font-semibold">{index + 1}</td>
                    <td className="p-3 text-sm text-slate-300 border-b border-slate-700 text-center font-bold text-sky-300">{panel.quantity}</td>
                    <td className="p-3 text-sm text-slate-300 border-b border-slate-700 font-mono text-right">{decimalToFraction(panel.width)}</td>
                    <td className="p-3 text-sm text-slate-300 border-b border-slate-700 font-mono text-right">{decimalToFraction(panel.height)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
};