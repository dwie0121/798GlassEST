import React, { useState, useRef, useEffect } from 'react';
import type { Inventory, Supplier } from '../types';
import { formatNumberWithCommas } from '../utils/formatting';

declare global {
  interface Window {
    html2canvas: (element: HTMLElement, options?: any) => Promise<HTMLCanvasElement>;
  }
}

interface OrderListModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: Inventory;
  clientName: string;
  supplierName: Supplier;
  aluminumColor: string;
}

interface EditableOrderItem {
  name: string;
  quantity: number;
  quantityStr: string;
  unit: string;
  unitPrice: number;
  totalCost: number;
  unitPriceStr: string;
}

interface CategorizedItems {
  aluminum: EditableOrderItem[];
  glass: EditableOrderItem[];
  hardware: EditableOrderItem[];
}

export const OrderListModal: React.FC<OrderListModalProps> = ({ isOpen, onClose, inventory, clientName, supplierName, aluminumColor }) => {
  const [deliveryFee, setDeliveryFee] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingText, setIsSavingText] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [categorizedItems, setCategorizedItems] = useState<CategorizedItems>({
    aluminum: [],
    glass: [],
    hardware: [],
  });

  useEffect(() => {
    if (!inventory) {
      setCategorizedItems({ aluminum: [], glass: [], hardware: [] });
      return;
    }

    const aluminumItems: EditableOrderItem[] = inventory.aluminum.map(item => {
      const orderQty = Math.ceil(item.barsNeeded ?? 0);
      const unitPrice = item.unitPrice ?? 0;
      return {
        name: item.name,
        quantity: orderQty,
        quantityStr: orderQty.toFixed(0),
        unit: 'bars',
        unitPrice: unitPrice,
        totalCost: orderQty * unitPrice,
        unitPriceStr: unitPrice.toFixed(2),
      };
    }).filter(item => item.quantity > 0);

    const glassItems: EditableOrderItem[] = inventory.glass.map(item => {
        const orderQty = item.physicalSheets ?? 0;
        const unitPrice = item.unitPrice ?? 0;
        return {
            name: item.name,
            quantity: orderQty,
            quantityStr: orderQty.toFixed(0),
            unit: 'sheets',
            unitPrice: unitPrice,
            totalCost: orderQty * unitPrice,
            unitPriceStr: unitPrice.toFixed(2),
        }
    }).filter(item => item.quantity > 0);

    const hardwareItems: EditableOrderItem[] = inventory.hardware.map(item => {
        let quantity = item.quantity;
        let unit = 'pcs';
        if (item.name === 'Rubber Jamb') {
            quantity = item.totalWeightKg ?? 0;
            unit = 'kg';
        } else if (item.name === 'Panel Assembly Set') {
            unit = 'sets';
        } else if (item.name === 'Sealant') {
            unit = 'tubes';
        }
        
        const unitPrice = item.unitPrice ?? 0;
        return {
            name: item.name,
            quantity,
            quantityStr: unit === 'kg' ? quantity.toFixed(2) : quantity.toFixed(0),
            unit,
            unitPrice: unitPrice,
            totalCost: item.totalCost ?? 0,
            unitPriceStr: unitPrice.toFixed(2),
        }
    }).filter(item => item.quantity > 0);
    
    setCategorizedItems({ aluminum: aluminumItems, glass: glassItems, hardware: hardwareItems });
  }, [inventory, isOpen]);

  const subtotal = [
    ...categorizedItems.aluminum,
    ...categorizedItems.glass,
    ...categorizedItems.hardware
  ].reduce((acc, item) => acc + item.totalCost, 0);

  const deliveryFeeNum = parseFloat(deliveryFee) || 0;
  const grandTotal = subtotal + deliveryFeeNum;

  if (!isOpen) return null;

  const handleSaveAsJpeg = async () => {
    if (!printRef.current || !window.html2canvas) {
      console.error("Cannot save image: ref or html2canvas not found.");
      return;
    }
    setIsSaving(true);
    try {
      const canvas = await window.html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#0f172a',
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Order List - ${clientName || 'Materials'}.jpeg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error saving image:", error);
    } finally {
      setIsSaving(false);
    }
  };
  
    const handleSaveAsText = () => {
        setIsSavingText(true);
        try {
            const lines: string[] = [];

            lines.push('MATERIAL ORDER LIST');
            lines.push('======================');
            lines.push(`Client: ${clientName || 'N/A'}`);
            lines.push(`Supplier: ${supplierName}`);
            lines.push(`Color: ${aluminumColor}`);
            lines.push(`Date: ${new Date().toLocaleDateString()}`);
            lines.push('');

            const addCategoryToLines = (categoryName: string, items: EditableOrderItem[]) => {
                if (items.length === 0) return;
                lines.push(`--- ${categoryName} ---`);
                items.forEach(item => {
                    lines.push(`${item.name}: ${item.quantityStr} ${item.unit}`);
                });
                lines.push('');
            };

            addCategoryToLines('Aluminum Profiles', categorizedItems.aluminum);
            addCategoryToLines('Glass', categorizedItems.glass);
            addCategoryToLines('Hardware & Accessories', categorizedItems.hardware);
            
            const textContent = lines.join('\n');
            
            const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Order List - ${clientName || 'Materials'}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

        } catch (error) {
            console.error("Error saving text file:", error);
        } finally {
            setIsSavingText(false);
        }
    };

  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
        setDeliveryFee(value);
    }
  };
  
  const handleQuantityChange = (category: keyof CategorizedItems, index: number, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setCategorizedItems(prevItems => {
        const newCategoryItems = [...prevItems[category]];
        const item = { ...newCategoryItems[index] };
        
        item.quantityStr = value;
        const newQtyNum = parseFloat(value) || 0;
        item.quantity = newQtyNum;
        item.totalCost = newQtyNum * item.unitPrice;
        
        newCategoryItems[index] = item;
        return { ...prevItems, [category]: newCategoryItems };
      });
    }
  };

  const handleQuantityBlur = (category: keyof CategorizedItems, index: number) => {
    setCategorizedItems(prevItems => {
        const newCategoryItems = [...prevItems[category]];
        const item = { ...newCategoryItems[index] };
        const isKg = item.unit === 'kg';
        item.quantityStr = item.quantity.toFixed(isKg ? 2 : 0);
        newCategoryItems[index] = item;
        return { ...prevItems, [category]: newCategoryItems };
    });
  };

  const handlePriceChange = (category: keyof CategorizedItems, index: number, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setCategorizedItems(prevItems => {
        const newCategoryItems = [...prevItems[category]];
        const item = { ...newCategoryItems[index] };
        
        item.unitPriceStr = value;
        const newPriceNum = parseFloat(value) || 0;
        item.unitPrice = newPriceNum;
        item.totalCost = item.quantity * newPriceNum;
        
        newCategoryItems[index] = item;
        return { ...prevItems, [category]: newCategoryItems };
      });
    }
  };

  const handlePriceBlur = (category: keyof CategorizedItems, index: number) => {
    setCategorizedItems(prevItems => {
      const newCategoryItems = [...prevItems[category]];
      const item = { ...newCategoryItems[index] };
      item.unitPriceStr = item.unitPrice.toFixed(2);
      newCategoryItems[index] = item;
      return { ...prevItems, [category]: newCategoryItems };
    });
  };

  const renderCategoryRows = (categoryName: string, items: EditableOrderItem[], categoryKey: keyof CategorizedItems) => {
    if (items.length === 0) return null;

    const categorySubtotal = items.reduce((acc, item) => acc + item.totalCost, 0);

    return (
      <>
        <tr className="bg-slate-700">
            <td colSpan={5} className="p-2 text-sm font-bold border-b-2 border-slate-500 uppercase tracking-wider text-white">{categoryName}</td>
        </tr>
        {items.map((item, index) => (
             <tr key={`${item.name}-${index}`}>
                <td className="p-2 text-sm border-b border-slate-700">{item.name}</td>
                <td className="p-2 text-sm border-b border-slate-700 text-right font-mono">
                   <input
                        type="text"
                        value={item.quantityStr}
                        onChange={(e) => handleQuantityChange(categoryKey, index, e.target.value)}
                        onBlur={() => handleQuantityBlur(categoryKey, index)}
                        className="w-20 text-right font-mono p-1 border-b border-slate-500 focus:outline-none focus:border-sky-500 bg-slate-800 focus:bg-slate-700 transition-colors text-white"
                    />
                </td>
                <td className="p-2 text-sm border-b border-slate-700">{item.unit}</td>
                <td className="p-2 text-sm border-b border-slate-700 text-right font-mono">
                    <div className="flex items-center justify-end">
                        <span className="mr-1">₱</span>
                        <input
                            type="text"
                            value={item.unitPriceStr}
                            onChange={(e) => handlePriceChange(categoryKey, index, e.target.value)}
                            onBlur={() => handlePriceBlur(categoryKey, index)}
                            className="w-24 text-right font-mono p-1 border-b border-slate-500 focus:outline-none focus:border-sky-500 bg-slate-800 focus:bg-slate-700 transition-colors text-white"
                        />
                    </div>
                </td>
                <td className="p-2 text-sm border-b border-slate-700 text-right font-mono">₱{formatNumberWithCommas(item.totalCost)}</td>
            </tr>
        ))}
        <tr className="font-semibold bg-slate-700/50">
          <td colSpan={4} className="p-2 text-sm text-slate-300 border-b-4 border-slate-900 text-right pr-4 uppercase">
              {categoryName} Subtotal
          </td>
          <td className="p-2 text-sm text-slate-200 border-b-4 border-slate-900 text-right font-mono">
              ₱{formatNumberWithCommas(categorySubtotal)}
          </td>
        </tr>
      </>
    );
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-list-title"
    >
      <div 
        className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 sm:p-5 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
          <h2 id="order-list-title" className="text-lg font-bold text-white">Material Order List</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close order list">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        <main className="p-4 sm:p-6 overflow-y-auto bg-slate-900" >
            <div ref={printRef} className="bg-slate-900 text-slate-200 p-8 font-sans">
                <header className="mb-6">
                    <h1 className="text-2xl font-bold text-white text-center">Material Order List</h1>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mt-4 text-sm border-t border-b border-slate-600 py-2">
                        <div>
                            <span className="font-bold">Client:</span> {clientName || 'N/A'}
                        </div>
                        <div>
                            <span className="font-bold">Color:</span> {aluminumColor}
                        </div>
                        <div>
                            <span className="font-bold">Supplier:</span> {supplierName}
                        </div>
                         <div className="text-left sm:text-right">
                            <span className="font-bold">Date:</span> {new Date().toLocaleDateString()}
                        </div>
                    </div>
                </header>

                <table className="w-full text-left border-collapse mb-6">
                    <thead>
                        <tr>
                            <th className="p-2 text-sm font-bold border-b-2 border-slate-500 uppercase tracking-wider">Item</th>
                            <th className="p-2 text-sm font-bold border-b-2 border-slate-500 uppercase tracking-wider text-right">Qty</th>
                            <th className="p-2 text-sm font-bold border-b-2 border-slate-500 uppercase tracking-wider">Unit</th>
                            <th className="p-2 text-sm font-bold border-b-2 border-slate-500 uppercase tracking-wider text-right">Unit Price</th>
                            <th className="p-2 text-sm font-bold border-b-2 border-slate-500 uppercase tracking-wider text-right">Total Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        {renderCategoryRows('Aluminum Profiles', categorizedItems.aluminum, 'aluminum')}
                        {renderCategoryRows('Glass', categorizedItems.glass, 'glass')}
                        {renderCategoryRows('Hardware & Accessories', categorizedItems.hardware, 'hardware')}
                    </tbody>
                </table>
                {subtotal > 0 ? (
                    <div className="flex justify-end">
                        <div className="w-full max-w-xs text-sm">
                        <div className="flex justify-between py-1">
                            <span className="font-bold">Subtotal:</span>
                            <span className="font-mono">₱{formatNumberWithCommas(subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                                <span className="font-bold">Delivery Fee:</span>
                                <div className="flex items-center">
                                    <span className="mr-1">₱</span>
                                    <input 
                                        type="text"
                                        value={deliveryFee}
                                        onChange={handleFeeChange}
                                        className="w-24 text-right font-mono p-1 border-b border-slate-500 focus:outline-none focus:border-sky-500 bg-slate-800 focus:bg-slate-700 transition-colors text-white"
                                    />
                                </div>
                        </div>
                        <div className="flex justify-between py-2 border-t-2 border-slate-500 mt-2">
                            <span className="font-bold text-base">Grand Total:</span>
                            <span className="font-bold font-mono text-base">₱{formatNumberWithCommas(grandTotal)}</span>
                        </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-slate-500 py-8">No materials to order for this project.</p>
                )}
            </div>
        </main>
         <footer className="p-4 border-t border-slate-700 flex justify-end gap-3">
           <button 
             onClick={handleSaveAsText} 
             disabled={isSaving || isSavingText}
             className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-wait"
           >
             {isSavingText ? 'Saving Text...' : 'Save as Text'}
           </button>
           <button 
             onClick={handleSaveAsJpeg} 
             disabled={isSaving || isSavingText}
             className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-wait"
           >
             {isSaving ? 'Saving JPEG...' : 'Save as JPEG'}
           </button>
        </footer>
      </div>
    </div>
  );
};