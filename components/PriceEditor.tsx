
import React, { useState, useEffect } from 'react';
import type { PriceList, MaterialPropertiesList } from '../types';
import { Supplier } from '../types';
import { defaultPrices } from '../data/prices';
import { defaultMaterialProperties } from '../data/materialProperties';
import { MaterialCategory } from '../types';
import { formatNumberWithCommas } from '../utils/formatting';
import { CheckIcon } from './Icons';

interface PriceEditorProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrices: PriceList;
  currentMaterialProperties: MaterialPropertiesList;
  onSave: (newPrices: PriceList, newProperties: MaterialPropertiesList) => void;
}

const suppliers = Object.values(Supplier).filter(s => s !== Supplier.Best);

const materialCategories = {
  [MaterialCategory.Aluminum]: [
    '798- Bottom Rail/Top Rail (PCW)',
    '798- Bottom Rail/Top Rail SD (HA)',
    '798- Double Head (PCW)',
    '798- Double Head (HA)',
    '798- Double Jamb (PCW)',
    '798- Double Jamb (HA)',
    '798- Double Sill (PCW)',
    '798- Double Sill (HA)',
    '798- Interlocker (PCW)',
    '798- Interlocker SD (HA)',
    '798- Lock Stile SD (HA)',
    '798- Lockstile (PCW)',
    'TR- Bottom Rail SD (HA)',
    'TR- Double Head (HA)',
    'TR- Double Jamb (HA)',
    'TR- Double Sill (HA)',
    'TR- Interlocker SD (HA)',
    'TR- Lock Stile SD (HA)',
    'TR- Top Rail SD (HA)',
    'TR- Bottom Rail (PCW)',
    'TR- Double Head (PCW)',
    'TR- Double Jamb (PCW)',
    'TR- Double Sill (PCW)',
    'TR- Interlocker (PCW)',
    'TR- Lockstile (PCW)',
    'TR- Top Rail (PCW)',
    'Alco Frame Double (PCW)',
    'Alco Frame Single (PCW)',
    'Angle 1/2 (HA)',
    'Angle 1/2 (PCW)',
    'Angle 1/8x1x1 (for bracket)',
    'Angular 1/2x1/2',
    'Angular 1/8 x 1 x 1 for Brackets',
    'Angular 1/8 x 3/4 x 3/4 for Brackets',
    'Angular 1x1 Thin',
    'C. Trim 2" (PCW)',
    'Counter Ttrim 1/2 x 4 HA',
    'ED Bottom Rail',
    'ED Bullnose Stile',
    'ED Stile w/ Groove',
    'ED Top Rail',
    'ED Treshhold',
    'Flat BAR 1/8x1 (HA)',
    'Flat Sill PCW',
    'Flat Sill SD HA',
    'Glass Divider (ASW28) (HA)',
    'Glass Divider (ASW28) (PCW)',
    'J-Clip 1/2 (HA)',
    'J-Clip HA 1/4',
    'Panel Center Frame iBAR (HA)',
    'Panel Center Frame iBAR (PCW)',
    'Panel Moulding YC12 (HA)',
    'Panel Moulding YC12 (PCW)',
    'Panel Panel ZBAR (HA)',
    'Panel Panel ZBAR (PCW)',
    'Panel Perimter HBAR (HA)',
    'Panel Perimter HBAR (PCW)',
    'Round Tube 3/4 (PCW)',
    'Screen Astragal 139 for Curved Fixed Windows',
    'Screen Astragal RPC (HA)',
    'Screen Astragal RPC (PCW)',
    'Screen Bracket 798',
    'Screen Frame 798 (HA)',
    'Screen Frame 798 PCW',
    'Screen Head (HA)',
    'Screen Head (PCW)',
    'SD Astragal HA',
    'SD Astragal PCW',
    'SF 101 (HA) - SF Door Frame',
    'SF 101/102 (HA) - SF Door Frame',
    'SF 101/102 (PCW) - SF Door Frame',
    'SF 102 (HA) (Lock for SF101) SF Door Frame Clip Only',
    'SF 105 SD HA (Screen Divider)',
    'SF 105 SD PCW (Screen Divider)',
    'SF 106/102 (HA) Screen Divider',
    'SF 106/102 (PCW) Screen Divider',
    'Single Head (HA)',
    'Single Sill (HA)',
    'Snap on Base +cover (HA)',
    'Snap on Base +cover (PCW)',
    'Swing Screen Cross BAR w/ Moulding (PCW)',
    'Swing Screen Frame w/ Moulding (PCW)',
    'Tubular 1-3/4x1-3/4 (HA)',
    'Tubular 1-3/4x3 (HA)',
    'Tubular 1-3/4x3 (PCW)',
    'Tubular 1-3/4x4 (HA)',
    'Tubular 1/2x1 (PCW)',
    'Tubular 1x1 (HA)',
    'Tubular 1x1 (PCW)',
    'Tubular 1x2 (HA)',
    'Tubular 1x2 (PCW)',
    'Tubular 1x3 (HA)',
    'Tubular 1x3 (PCW)',
    'Tubular 1x4 HA',
    'Tubular 1x4 PCW',
    'U-Clip (A) 12ft',
    'U-Clip (HA) 12ft',
    'YC 12 (PCW)',
    'YS 221 (HA)',
    'YS 221 (PCW)',
  ].sort(),
  [MaterialCategory.Glass]: [
    'Blue Reflective',
    'Bronze Dark Reflective',
    'Bronze Light Reflective',
    'Bronze Ordinary 1/4',
    'Bronze Ordinary 3/16',
    'Clear 1/4',
    'Clear 3/16',
    'Clear-1/4',
    'Clear-1/8',
    'Clear-3/16',
    'Dark Black-1/4',
    'Dark Grey-1/4',
    'Dark Grey-3/16',
    'Green Reflective',
    'Grey 1/4',
    'Grey 3/16',
    'Grey Reflecive',
    'Luningning 48x72',
    'Mirror 1/4',
    'Mirror 3/16',
    'Mirror-1/4',
    'Ordinary Bronze-1/4',
    'Ordinary Bronze-1/8',
    'Ordinary Bronze-3/16',
    'Reflective Black-1/4',
    'Reflective Blue-1/4',
    'Reflective Dark Bronze-1/4',
    'Reflective Green-1/4',
    'Reflective Light Bronze-1/4',
    'Smoked-3/16',
    'Stucco (A)',
    'Stucco (HA) 3x9Ft -(27sqft) P130/sqft or P88/ft',
    'Stucco (PCW) 3x9Ft -(27sqft) P130/sqft or P88/ft',
  ].sort(),
  [MaterialCategory.Hardware]: [
    'Alpha Lock',
    'Amplimesh (HA) 3x14 feet',
    'Amplimesh (PCW) 4x14',
    'Barrel Bolt (A)',
    'Barrel Bolt (PCW)',
    'Bended Handle (HA)',
    'Bended Handle (PCW)',
    'Black Handle',
    'Bus Body Skin (HA) P17/ft',
    'Bus Body Skin (PCW)',
    'Butterfly Hinges A',
    'Butterfly Hinges HA',
    'CAHA Lower 1/4 (HA)',
    'CAHA Lower 1/8 (HA)',
    'CAHA Lower for P. Bearing (HA)',
    'CAHA Plastic Bearing (A)',
    'CAHA U-Clip (HA)',
    'CAHA Upper 1/4 (HA)',
    'Cam Handle R (HA)',
    'Cam Handle R (PCW)',
    'Center Lock',
    'Center Lock/ Crescent (HA)',
    'Center Lock/ Crescent (PCW)',
    'Corner Bracket w/oScrew Plastic',
    'Corner Lock for Screen Frame (A)',
    'Corner Stake',
    'Counter Nosing 3/4',
    'Cylinder MIKO Lock',
    'Door Closer - SF Tube Type (A)',
    'Door Closer - SF Tube Type (HA)',
    'Door Closer - SF Tube Type (PCW)',
    'Expanded Brown 48"x60Ft P50/ft',
    'Flushlock 12 HA SD#12',
    'Flushlock 12 PCW SD#12',
    'Frameless Handle 12"',
    'Glazing Brown Small 40ft/KGS P120/kgs',
    'Glazing White (PCW) 40ft/KGS P120/kgs',
    'Hinges 4 Bar 10" (Side Open)',
    'Hinges 4 Bar 12" (Side Open)',
    'Hinges 4 Bar 8" (Side Open)',
    'Hinges SF 1x3 (HA)',
    'Hinges SF 1x3 (PCW)',
    'Lockset WF',
    'Magnetic Hinges Double Black',
    'MICO Lockset (HA)',
    'Overhead Conceled Door Closer',
    'Panel Assembly Set',
    'Plastic Bearing (A) 1/4',
    'Push BAR Bracket (HA)',
    'Push BAR Bracket (PCW)',
    'Push BAR Handle (HA)',
    'Rubber Jamb',
    'Rubber with Lock (98ft) P18.5/ft',
    'Screen Bracket 798',
    'Screen Roller Lower 221',
    'SD #10 (PCW)',
    'SD #11 (HA)',
    'SD #11 (PCW)',
    'SD #12 (HA)',
    'SD #12 (PCW)',
    'SD #12-13 (HA) (with Lock)',
    'SD #12-13 (PCW) (with Lock)',
    'SD Roller',
    'SD Roller Black Single',
    'SD Roller Double',
    'SD Roller Nylon Single Yellow BOX /200pcs',
    'Sealant',
    'SF Double Anodised',
    'SF Double HA 20ft',
    'SF Double(A)',
    'SF Double(HA) 20FT',
    'SF Single(A)',
    'Sliding Glass Clip PCW',
    'Soli-Guide',
    'Tox #5 (200pcs)',
    'Vinyl #1',
    'Vinyl #2',
    'Vinyl #3 45m/kgs',
    'Vinyl with Fin Brown',
    'Vinyl with Fin White',
    'White Handle',
    'Wire Mesh 4x98ft (P17/ft)',
    'Wood Screw 10X3 /Gross 144pcs',
    'Wood Screw 8X 1 1/2 (A)',
  ].sort(),
};

export const PriceEditor: React.FC<PriceEditorProps> = ({ isOpen, onClose, currentPrices, currentMaterialProperties, onSave }) => {
  const [editedPrices, setEditedPrices] = useState<PriceList>(currentPrices);
  const [editedProperties, setEditedProperties] = useState<MaterialPropertiesList>(currentMaterialProperties);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setEditedPrices(currentPrices);
    setEditedProperties(currentMaterialProperties);
  }, [isOpen, currentPrices, currentMaterialProperties]);

  if (!isOpen) {
    return null;
  }

  const handlePriceChange = (material: string, supplier: Supplier, value: string) => {
    const price = parseFloat(value);
    if (!isNaN(price) && price >= 0) {
      setEditedPrices(prevPrices => ({
        ...prevPrices,
        [material]: {
          ...prevPrices[material],
          [supplier]: price,
        },
      }));
    }
  };

  const handlePropertyChange = (material: string, prop: 'weightKgPerFoot', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setEditedProperties(prevProps => ({
        ...prevProps,
        [material]: {
          ...prevProps[material],
          [prop]: numValue,
        },
      }));
    }
  };

  const handleSave = () => {
    onSave(editedPrices, editedProperties);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const handleReset = () => {
    setEditedPrices(defaultPrices);
    setEditedProperties(defaultMaterialProperties);
  };

  const renderHardwareConfig = (material: string) => {
    if (material === 'Rubber Jamb') {
      return (
        <div className="flex flex-col gap-1">
          <label htmlFor="rubber-weight" className="text-[10px] text-slate-500 uppercase font-black">Weight (kg/ft)</label>
          <input
            id="rubber-weight"
            type="number"
            value={editedProperties[material]?.weightKgPerFoot ?? 0}
            onChange={e => handlePropertyChange(material, 'weightKgPerFoot', e.target.value)}
            className="w-20 bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-white focus:ring-1 focus:ring-sky-500 font-mono text-center text-xs"
            min="0"
            step="0.01"
          />
        </div>
      );
    }
    return <span className="text-slate-700">—</span>;
  };

  const aluminumTotals = suppliers.reduce((acc, supplier) => {
    acc[supplier] = materialCategories[MaterialCategory.Aluminum].reduce((sum, material) => {
      const price = editedPrices[material]?.[supplier] ?? 0;
      return sum + price;
    }, 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col border border-slate-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900 z-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/10 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Material Prices & Properties</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-full transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        
        <main className="flex-grow overflow-auto bg-slate-900">
            <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                    <tr className="bg-slate-800 shadow-xl">
                        {/* Global Sticky Table Header: Supplier Names */}
                        <th className="p-4 text-[10px] font-black text-slate-400 border-b border-slate-700 uppercase tracking-widest sticky top-0 left-0 bg-slate-800 z-50 min-w-[280px]">
                            Material Identity
                        </th>
                        <th className="p-4 text-[10px] font-black text-slate-400 border-b border-slate-700 uppercase tracking-widest sticky top-0 bg-slate-800 z-40 min-w-[140px] text-center">
                            Specs/Config
                        </th>
                        {suppliers.map(s => (
                            <th key={s} className="p-4 text-[11px] font-black text-sky-400 border-b border-slate-700 uppercase tracking-[0.2em] min-w-[120px] text-center sticky top-0 bg-slate-800 z-40">
                                {s}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(materialCategories).map(([category, materials]) => (
                        <React.Fragment key={category}>
                            {/* Category Separator Row */}
                            <tr className="bg-slate-950/80 backdrop-blur-md">
                                <td colSpan={2 + suppliers.length} className="p-4 border-b border-slate-800">
                                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em]">{category}</h3>
                                </td>
                            </tr>
                            
                            {materials.map(material => (
                                <tr key={material} className="hover:bg-slate-800/40 transition-colors group">
                                    <td className="p-3 text-sm text-slate-300 border-b border-slate-800/50 font-bold sticky left-0 bg-slate-900 group-hover:bg-slate-800 transition-colors z-10">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-sky-500"></div>
                                            {material.replace(/-/g, ' ')}
                                        </div>
                                    </td>
                                    <td className="p-3 text-sm text-slate-400 border-b border-slate-800/50 text-center">
                                        {category === MaterialCategory.Hardware ? renderHardwareConfig(material) : <span className="text-slate-800 opacity-20">—</span>}
                                    </td>
                                    {suppliers.map(supplier => (
                                        <td key={supplier} className="p-3 text-sm text-slate-300 border-b border-slate-800/50">
                                            <div className="relative group/input">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 text-[10px] font-mono group-focus-within/input:text-sky-500 transition-colors">₱</span>
                                                <input
                                                    type="number"
                                                    value={editedPrices[material]?.[supplier] ?? 0}
                                                    onChange={e => handlePriceChange(material, supplier as Supplier, e.target.value)}
                                                    className="w-full bg-slate-950/50 border border-slate-700 rounded-lg pl-6 pr-2 py-2 text-white placeholder-slate-600 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all font-mono text-center text-xs outline-none"
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            
                            {/* Special Aluminum Summary Row */}
                            {category === MaterialCategory.Aluminum && (
                                <tr className="bg-sky-950/20 border-y-2 border-sky-900/50">
                                    <td colSpan={2} className="p-4 text-xs text-sky-500 font-black uppercase tracking-widest text-right pr-6">
                                        Full Set Component Price (Est.)
                                    </td>
                                    {suppliers.map(supplier => (
                                        <td key={supplier} className="p-4 text-sm text-white text-center font-black font-mono">
                                            ₱{formatNumberWithCommas(aluminumTotals[supplier])}
                                        </td>
                                    ))}
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </main>

        <footer className="p-4 sm:p-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900 z-50 shrink-0">
          <div className="flex items-center gap-2 text-slate-500">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             <p className="text-[10px] font-bold uppercase tracking-widest">Values are committed to local session storage</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleReset} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-black py-2.5 px-5 rounded-lg transition-all uppercase tracking-widest border border-slate-700">
              Factory Reset
            </button>
            <button 
                onClick={handleSave} 
                className={`flex items-center gap-2 text-[10px] font-black py-2.5 px-10 rounded-lg transition-all transform active:scale-95 uppercase tracking-[0.2em] shadow-xl ${
                    justSaved 
                    ? 'bg-emerald-600 text-white shadow-emerald-900/40' 
                    : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-900/40'
                }`}
            >
              {justSaved ? (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    Commit Success
                  </>
              ) : 'Commit Changes'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
