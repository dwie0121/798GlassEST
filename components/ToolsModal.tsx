
import React from 'react';
import { SettingsIcon, ExportIcon, ImportIcon, PriceTagIcon } from './Icons';

interface ToolsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onManagePrices: () => void;
    onExport: () => void;
    onImport: () => void;
    onOpenClientPricing: () => void;
}

export const ToolsModal: React.FC<ToolsModalProps> = ({ isOpen, onClose, onManagePrices, onExport, onImport, onOpenClientPricing }) => {
    if (!isOpen) return null;

    const actionButtons = [
        { label: 'Manage Prices', icon: <SettingsIcon className="h-8 w-8 text-slate-300" />, action: onManagePrices, key: 'prices' },
        { label: 'Market Pricing', icon: <PriceTagIcon className="h-8 w-8 text-slate-300" />, action: onOpenClientPricing, key: 'market' },
        { label: 'Export Project', icon: <ExportIcon className="h-8 w-8 text-slate-300" />, action: onExport, key: 'export' },
        { label: 'Import Project', icon: <ImportIcon className="h-8 w-8 text-slate-300" />, action: onImport, key: 'import' },
    ];

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tools-title"
        >
            <div 
                className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-md border border-slate-700"
                onClick={e => e.stopPropagation()}
            >
                <header className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h2 id="tools-title" className="text-lg font-bold text-white">Manage Project</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close tools menu">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>
                <main className="p-6 grid grid-cols-2 gap-4">
                    {actionButtons.map(({ label, icon, action, key }) => (
                        <button 
                            key={key} 
                            onClick={action} 
                            className="flex flex-col items-center justify-center p-4 bg-slate-900/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                        >
                            {icon}
                            <span className="mt-3 text-sm font-semibold text-white">{label}</span>
                        </button>
                    ))}
                </main>
            </div>
        </div>
    );
};
