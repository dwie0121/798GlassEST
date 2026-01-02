
import React, { useState, useEffect, useCallback } from 'react';
import { AluminumColor, Supplier, GlassFinish, GlassThickness, Unit, WindowSeries, WindowType, type WindowInputs, type ProjectInputs } from '../types';
import { CalculatorIcon, SettingsIcon, InfoIcon, ResetIcon, PencilIcon, CheckIcon, TrashIcon, EyeIcon } from './Icons';
import { getAvailableStock, type StockSize } from '../data/glassStocks';
import { decimalToFraction } from '../utils/formatting';
import { WindowSchematicModal } from './WindowSchematicModal';

interface InventoryFormProps {
  onCalculate: (data: ProjectInputs) => void;
  onManageClick: () => void;
  projectToLoad?: ProjectInputs | null;
  onProjectLoaded?: () => void;
  clientName: string;
  setClientName: (name: string) => void;
}

// Extend WindowRow with all necessary properties from WindowInputs
interface WindowRow extends WindowInputs {
  id: number;
  widthStr: string;
  heightStr: string;
  transomHeightStr: string;
  panelsStr: string;
  isEditing?: boolean;
}

interface SavedFormState {
  windows: WindowRow[];
  color: string;
  supplier: Supplier;
  glassFinish: GlassFinish;
  glassThickness: GlassThickness;
  unit: Unit;
  selectedStockSize?: string;
  clientName?: string;
  // Global defaults used for new windows
  defaultWindowSeries: WindowSeries;
  defaultWindowType: WindowType;
  defaultIsTubularFraming: boolean;
  defaultFixedFrameProfile?: string;
  defaultHasTransom?: boolean;
  defaultTransomPosition?: 'top' | 'bottom';
  defaultTransomProfile?: string;
}

const tubularOptions = [
  { label: '1" x 1"', value: '1x1' },
  { label: '1" x 2" (Standard)', value: '1x2' },
  { label: '1" x 3"', value: '1x3' },
  { label: '1" x 4"', value: '1x4' },
  { label: '1 ¾" x 3"', value: '1-3/4x3' },
  { label: '1 ¾" x 4"', value: '1-3/4x4' },
];

const parseFractionalInput = (input: string): number => {
    const trimmed = input.trim();
    if (!trimmed) return NaN;

    const parts = trimmed.split(' ').filter(Boolean);
    let total = 0;

    if (parts.length > 2) return NaN;

    for (const part of parts) {
        if (part.includes('/')) {
            const [numStr, denStr] = part.split('/');
            const numerator = parseInt(numStr, 10);
            const denominator = parseInt(denStr, 10);

            if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
                return NaN;
            }
            total += numerator / denominator;
        } else {
            const num = parseFloat(part);
            if (isNaN(num)) {
                return NaN;
            }
            total += num;
        }
    }
    return total;
}

const fractionsForGuide = [
  { fraction: '1/16', decimal: 0.0625 },
  { fraction: '1/8', decimal: 0.125 },
  { fraction: '3/16', decimal: 0.1875 },
  { fraction: '1/4', decimal: 0.25 },
  { fraction: '5/16', decimal: 0.3125 },
  { fraction: '3/8', decimal: 0.375 },
  { fraction: '7/16', decimal: 0.4375 },
  { fraction: '1/2', decimal: 0.5 },
  { fraction: '9/16', decimal: 0.5625 },
  { fraction: '5/8', decimal: 0.625 },
  { fraction: '11/16', decimal: 0.6875 },
  { fraction: '3/4', decimal: 0.75 },
  { fraction: '13/16', decimal: 0.8125 },
  { fraction: '7/8', decimal: 0.875 },
  { fraction: '15/16', decimal: 0.9375 },
];

const FractionGuide: React.FC = () => {
  return (
    <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 my-4 transition-all duration-300 ease-in-out">
      <h4 className="text-sm font-bold text-slate-700 mb-3 text-center">Fraction to Decimal Guide</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-xs">
        {fractionsForGuide.map(({ fraction, decimal }) => (
          <div key={fraction} className="flex justify-between items-center font-mono bg-white px-2 py-1 rounded border border-gray-100 shadow-sm">
            <span className="text-sky-600 font-bold">{fraction}</span>
            <span className="text-gray-400 mr-2">=</span>
            <span className="text-slate-600">{decimal.toFixed(4)}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-3 text-center">
        Enter decimals (e.g., 48.5) and they will be auto-converted to fractions.
      </p>
    </div>
  );
};

const createDefaultWindow = (id: number, label: string, defaults: Partial<SavedFormState>): WindowRow => {
    return {
        id,
        label,
        width: 0,
        widthStr: '',
        height: 0,
        heightStr: '',
        panels: defaults.defaultWindowType === WindowType.Awning ? 1 : 2,
        panelsStr: defaults.defaultWindowType === WindowType.Awning ? '1' : '2',
        windowType: defaults.defaultWindowType || WindowType.Sliding,
        windowSeries: defaults.defaultWindowSeries || WindowSeries._798,
        verticalGrids: 0,
        horizontalGrids: 0,
        isTubularFraming: defaults.defaultIsTubularFraming || false,
        fixedFrameProfile: defaults.defaultFixedFrameProfile || '1x2',
        hasTransom: defaults.defaultHasTransom || false,
        transomHeight: 0,
        transomHeightStr: '',
        transomProfile: defaults.defaultTransomProfile || '1x4',
        transomPosition: defaults.defaultTransomPosition || 'top',
        isEditing: true
    };
};

const getInitialState = (): Omit<SavedFormState, 'clientName'> => {
  try {
    const savedData = localStorage.getItem('lastFormDetails');
    if (savedData) {
      const parsedData = JSON.parse(savedData) as Partial<SavedFormState>;
      
      // Fallback for migration if old data format
      const defaultType = parsedData.defaultWindowType || (parsedData as any).windowType || WindowType.Sliding;
      const defaultSeries = parsedData.defaultWindowSeries || (parsedData as any).windowSeries || WindowSeries._798;

      let initialWindows: WindowRow[] = [];
      
      if (Array.isArray(parsedData.windows) && parsedData.windows.length > 0) {
        initialWindows = parsedData.windows.map(w => ({
            ...w,
            isEditing: false,
            // Ensure compatibility with old data
            windowType: w.windowType || defaultType,
            windowSeries: w.windowSeries || defaultSeries,
            panelsStr: w.panelsStr || w.panels.toString(),
            widthStr: w.widthStr || (w.width ? decimalToFraction(w.width) : ''),
            heightStr: w.heightStr || (w.height ? decimalToFraction(w.height) : ''),
            transomHeightStr: w.transomHeightStr || (w.transomHeight ? decimalToFraction(w.transomHeight) : ''),
            label: w.label || `W1` 
        }));
      } else {
          initialWindows = [createDefaultWindow(Date.now(), 'W1', { defaultWindowType: defaultType })];
      }

      return {
        windows: initialWindows,
        color: parsedData.color || AluminumColor.White,
        supplier: parsedData.supplier || Supplier.Best,
        glassFinish: parsedData.glassFinish || GlassFinish.OrdinaryBronze,
        glassThickness: parsedData.glassThickness || GlassThickness._1_4,
        unit: parsedData.unit || Unit.Inches,
        selectedStockSize: parsedData.selectedStockSize || 'optimize',
        defaultWindowSeries: defaultSeries,
        defaultWindowType: defaultType,
        defaultIsTubularFraming: parsedData.defaultIsTubularFraming || (parsedData as any).isTubularFraming || false,
        defaultFixedFrameProfile: parsedData.defaultFixedFrameProfile || (parsedData as any).fixedFrameProfile || '1x2',
        defaultHasTransom: parsedData.defaultHasTransom || (parsedData as any).hasTransom || false,
        defaultTransomPosition: parsedData.defaultTransomPosition || (parsedData as any).transomPosition || 'top',
        defaultTransomProfile: parsedData.defaultTransomProfile || (parsedData as any).transomProfile || '1x4',
      };
    }
  } catch (error) {
    console.error("Failed to load form state from localStorage", error);
  }
  return {
    windows: [createDefaultWindow(Date.now(), 'W1', { defaultWindowType: WindowType.Sliding })],
    color: AluminumColor.White,
    supplier: Supplier.Best,
    glassFinish: GlassFinish.OrdinaryBronze,
    glassThickness: GlassThickness._1_4,
    unit: Unit.Inches,
    selectedStockSize: 'optimize',
    defaultWindowSeries: WindowSeries._798,
    defaultWindowType: WindowType.Sliding,
    defaultIsTubularFraming: false,
    defaultFixedFrameProfile: '1x2',
    defaultHasTransom: false,
    defaultTransomPosition: 'top',
    defaultTransomProfile: '1x4',
  };
};

export const InventoryForm: React.FC<InventoryFormProps> = ({ 
  onCalculate, 
  onManageClick, 
  projectToLoad, 
  onProjectLoaded,
  clientName,
  setClientName,
}) => {
  const [initialState] = useState(getInitialState);

  // Global Settings (Defaults for new windows)
  const [color, setColor] = useState<string>(initialState.color);
  const [supplier, setSupplier] = useState<Supplier>(initialState.supplier);
  const [glassFinish, setGlassFinish] = useState<GlassFinish>(initialState.glassFinish);
  const [glassThickness, setGlassThickness] = useState<GlassThickness>(initialState.glassThickness);
  const [unit, setUnit] = useState<Unit>(initialState.unit);
  const [availableStockSizes, setAvailableStockSizes] = useState<StockSize[]>([]);
  const [selectedStockSize, setSelectedStockSize] = useState<string>(initialState.selectedStockSize || 'optimize');
  
  const [defaultWindowSeries, setDefaultWindowSeries] = useState<WindowSeries>(initialState.defaultWindowSeries);
  const [defaultWindowType, setDefaultWindowType] = useState<WindowType>(initialState.defaultWindowType);
  const [defaultIsTubularFraming, setDefaultIsTubularFraming] = useState<boolean>(initialState.defaultIsTubularFraming);
  const [defaultFixedFrameProfile, setDefaultFixedFrameProfile] = useState<string>(initialState.defaultFixedFrameProfile || '1x2');
  const [defaultHasTransom, setDefaultHasTransom] = useState<boolean>(initialState.defaultHasTransom || false);
  const [defaultTransomPosition, setDefaultTransomPosition] = useState<'top' | 'bottom'>(initialState.defaultTransomPosition || 'top');
  const [defaultTransomProfile, setDefaultTransomProfile] = useState<string>(initialState.defaultTransomProfile || '1x4');

  const [windows, setWindows] = useState<WindowRow[]>(initialState.windows);
  const [error, setError] = useState('');
  const [isGuideVisible, setIsGuideVisible] = useState(false);
  
  // Modal State for Diagram
  const [diagramWindow, setDiagramWindow] = useState<any>(null);
  
  useEffect(() => {
    if (projectToLoad && onProjectLoaded) {
      setWindows(projectToLoad.windows.map((w, i) => ({ 
        ...w,
        id: Date.now() + i, 
        label: w.label || `W${i+1}`,
        widthStr: decimalToFraction(w.width), 
        heightStr: decimalToFraction(w.height),
        panelsStr: w.panels.toString(),
        transomHeightStr: w.transomHeight ? decimalToFraction(w.transomHeight) : '',
        isEditing: false, 
        windowType: w.windowType || defaultWindowType
      })));
      setColor(projectToLoad.color);
      setSupplier(projectToLoad.supplier);
      setClientName(projectToLoad.clientName);
      // Load global defaults from saved project settings (optional, but good UX)
      setDefaultWindowSeries(projectToLoad.windowSeries || WindowSeries._798);
      setDefaultWindowType(projectToLoad.windowType || WindowType.Sliding);
      setDefaultIsTubularFraming(projectToLoad.isTubularFraming || false);
      
      const [finish, thickness] = projectToLoad.glassType.split('-');
      setGlassFinish(finish as GlassFinish);
      setGlassThickness(thickness as GlassThickness);
      setSelectedStockSize(projectToLoad.selectedStock);
      setUnit(Unit.Inches);

      onProjectLoaded();
    }
  }, [projectToLoad, onProjectLoaded, setClientName]);

  useEffect(() => {
    const glassType = `${glassFinish}-${glassThickness}`;
    const stocks = getAvailableStock(glassType);
    setAvailableStockSizes(stocks);

    const currentSelectionIsValid = selectedStockSize === 'optimize' || stocks.some(s => `${s.width}x${s.height}` === selectedStockSize);
    if (!currentSelectionIsValid) {
        setSelectedStockSize(stocks.length > 0 ? 'optimize' : '');
    }
  }, [glassFinish, glassThickness, selectedStockSize]);


  useEffect(() => {
    try {
      const stateToSave: SavedFormState = {
        windows: windows.map(w => ({...w, isEditing: false})),
        color,
        supplier,
        glassFinish,
        glassThickness,
        unit,
        selectedStockSize,
        clientName,
        defaultWindowSeries,
        defaultWindowType,
        defaultIsTubularFraming,
        defaultFixedFrameProfile,
        defaultHasTransom,
        defaultTransomPosition,
        defaultTransomProfile
      };
      localStorage.setItem('lastFormDetails', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Could not save form state to localStorage:', error);
    }
  }, [windows, color, supplier, glassFinish, glassThickness, unit, selectedStockSize, clientName, defaultWindowSeries, defaultWindowType, defaultIsTubularFraming, defaultFixedFrameProfile, defaultHasTransom, defaultTransomPosition, defaultTransomProfile]);

  const addWindow = () => {
    const nextLabel = `W${windows.length + 1}`;
    const newWindow = createDefaultWindow(Date.now(), nextLabel, {
        defaultWindowType,
        defaultWindowSeries,
        defaultIsTubularFraming,
        defaultFixedFrameProfile,
        defaultHasTransom,
        defaultTransomPosition,
        defaultTransomProfile
    });
    setWindows([...windows, newWindow]);
  };

  const removeWindow = (id: number) => {
    if (windows.length > 1) {
      setWindows(windows.filter(w => w.id !== id));
    }
  };

  const updateWindow = (id: number, field: keyof WindowRow, value: any) => {
    setWindows(windows.map(w => w.id === id ? { ...w, [field]: value } : w));
  };
  
  const toggleEditMode = (id: number) => {
    setWindows(windows.map(w => {
        if (w.id === id) {
            if (w.isEditing) {
                if (!w.widthStr || !w.heightStr) {
                    return w; 
                }
            }
            return { ...w, isEditing: !w.isEditing };
        }
        return w;
    }));
  };

  const handleViewDiagram = (window: WindowRow) => {
      const width = parseFractionalInput(window.widthStr);
      const height = parseFractionalInput(window.heightStr);
      const transomH = parseFractionalInput(window.transomHeightStr);
      
      if (!isNaN(width) && !isNaN(height)) {
          // Pass ALL windows to the modal, but focusing on this one logic is handled in Display currently.
          // Here we just set state to trigger the modal open if we wanted local modal.
          // BUT the request is for the main Diagram Modal to show ALL.
          // So this specific eye icon might just need to open the modal.
          // For now, we update the state to match the structure expected by the updated Modal
          
          // Actually, we'll just pass the full windows list to the modal in InventoryForm if we used it here,
          // but InventoryForm has a Schematic Modal.
          
          setDiagramWindow(windows.map(w => {
             const wNum = parseFractionalInput(w.widthStr);
             const hNum = parseFractionalInput(w.heightStr);
             const tNum = parseFractionalInput(w.transomHeightStr);
             return {
                type: w.windowType,
                series: w.windowSeries,
                isTubular: w.isTubularFraming,
                panels: parseInt(w.panelsStr, 10),
                width: isNaN(wNum) ? 0 : wNum,
                height: isNaN(hNum) ? 0 : hNum,
                verticalGrids: w.verticalGrids,
                horizontalGrids: w.horizontalGrids,
                fixedFrameProfile: w.fixedFrameProfile,
                hasTransom: w.hasTransom,
                transomHeight: isNaN(tNum) ? 0 : tNum,
                transomPosition: w.transomPosition,
                label: w.label
             }
          }));
      }
  };

  const handleBlur = (id: number, field: 'widthStr' | 'heightStr' | 'transomHeightStr', value: string) => {
    const numericValue = parseFractionalInput(value);
    if (!isNaN(numericValue) && numericValue > 0) {
      const fractionalValue = decimalToFraction(numericValue);
      updateWindow(id, field, fractionalValue);
    }
  };
  
  const handleResetClick = () => {
    const defaults = getInitialState();
    setWindows([createDefaultWindow(Date.now(), 'W1', { defaultWindowType: WindowType.Sliding })]);
    setClientName('');
    setColor(defaults.color);
    setSupplier(defaults.supplier);
    setGlassFinish(defaults.glassFinish);
    setGlassThickness(defaults.glassThickness);
    setUnit(defaults.unit);
    setSelectedStockSize(defaults.selectedStockSize || 'optimize');
    // Reset defaults
    setDefaultWindowSeries(WindowSeries._798);
    setDefaultWindowType(WindowType.Sliding);
    setDefaultIsTubularFraming(false);
    setDefaultFixedFrameProfile('1x2');
    setDefaultHasTransom(false);
    setDefaultTransomPosition('top');
    setDefaultTransomProfile('1x4');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedWindows: WindowInputs[] = [];
    const CM_TO_INCH = 1 / 2.54;
    
    if (!selectedStockSize || (selectedStockSize !== 'optimize' && !availableStockSizes.some(s => `${s.width}x${s.height}` === selectedStockSize))) {
        setError('Please select a valid glass stock size for the chosen glass type.');
        return;
    }
    
    const closedWindows = windows.map(w => {
         if (w.isEditing && w.widthStr && w.heightStr) {
             return { ...w, isEditing: false };
         }
         return w;
    });
    setWindows(closedWindows);
    
    for (const [index, window] of closedWindows.entries()) {
        const widthNum = parseFractionalInput(window.widthStr);
        const heightNum = parseFractionalInput(window.heightStr);
        
        let transomHeightNum = 0;
        if (window.windowType === WindowType.Sliding && window.hasTransom) {
             transomHeightNum = parseFractionalInput(window.transomHeightStr);
        }

        if (isNaN(widthNum) && isNaN(heightNum)) { 
            continue;
        }

        if (isNaN(widthNum) || isNaN(heightNum) || widthNum <= 0 || heightNum <= 0) {
            setError(`Please enter valid numbers for Window #${index + 1}.`);
            return;
        }
        
        if (window.windowType === WindowType.Sliding && window.hasTransom && (isNaN(transomHeightNum) || transomHeightNum < 0)) {
             setError(`Please enter a valid Transom Height for Window #${index + 1}.`);
             return;
        }
        
        const convertedWidth = unit === Unit.Centimeters ? widthNum * CM_TO_INCH : widthNum;
        const convertedHeight = unit === Unit.Centimeters ? heightNum * CM_TO_INCH : heightNum;
        const convertedTransomHeight = unit === Unit.Centimeters ? transomHeightNum * CM_TO_INCH : transomHeightNum;

        const panelsNum = parseInt(window.panelsStr, 10);
        
        parsedWindows.push({ 
            ...window,
            width: convertedWidth, 
            height: convertedHeight, 
            panels: panelsNum, 
            transomHeight: convertedTransomHeight
        });
    }
    
    setError('');
    const glassType = `${glassFinish}-${glassThickness}`;
    onCalculate({ 
        windows: parsedWindows, 
        color, 
        supplier, 
        glassType, 
        selectedStock: selectedStockSize, 
        clientName, 
        windowSeries: defaultWindowSeries, 
        windowType: defaultWindowType, 
        isTubularFraming: defaultIsTubularFraming, 
    });
  };

  const selectStyles = "w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition shadow-sm appearance-none";
  const inputStyles = "w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition shadow-sm";
  const compactInputStyles = "w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition shadow-sm min-w-[45px]";
  const compactSelectStyles = "w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition shadow-sm appearance-none min-w-[60px]";

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-200">
      <div className="flex justify-between items-start mb-8 border-b border-gray-100 pb-6">
        <h2 className="text-2xl font-bold text-slate-900">Project Details</h2>
        <div className="flex flex-col items-end gap-3">
            <button
              type="button"
              onClick={onManageClick}
              className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold py-2 px-4 rounded-lg transition-colors"
              aria-label="Manage project options"
            >
              <SettingsIcon className="h-4 w-4 text-slate-500" />
              Manage
            </button>
            <button
                type="button"
                onClick={handleResetClick}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 font-semibold py-1 px-2 rounded-md transition-colors"
                aria-label="Reset form"
            >
                <ResetIcon className="h-4 w-4" />
                Reset
            </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <label htmlFor="clientName" className="block text-sm font-bold text-slate-700 mb-2">Client Name</label>
          <input
            id="clientName"
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className={inputStyles}
            placeholder="Enter client's name"
            aria-label="Client Name"
          />
        </div>

        {/* Global Settings Block - Acts as defaults for new windows */}
        <div className="p-4 bg-sky-50 border border-sky-100 rounded-xl mb-4">
            <h3 className="text-sm font-bold text-sky-900 mb-3 uppercase tracking-wide">Defaults for New Windows</h3>
            <div className="flex flex-wrap gap-4 mb-4">
                {(Object.values(WindowType)).map((type) => (
                    <label key={type} className={`flex items-center gap-2 cursor-pointer p-2 rounded-lg border transition-all ${defaultWindowType === type ? 'bg-white border-sky-300 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}>
                        <input
                            type="radio"
                            name="defaultWindowType"
                            value={type}
                            checked={defaultWindowType === type}
                            onChange={(e) => setDefaultWindowType(e.target.value as WindowType)}
                            className="form-radio h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300"
                        />
                        <span className={`text-sm font-medium ${defaultWindowType === type ? 'text-sky-900' : 'text-slate-600'}`}>{type}</span>
                    </label>
                ))}
            </div>
            
            {/* Conditional Global Settings */}
            {defaultWindowType === WindowType.Sliding && (
                 <div className="flex flex-wrap gap-4">
                    <select 
                        value={defaultWindowSeries} 
                        onChange={e => setDefaultWindowSeries(e.target.value as WindowSeries)}
                        className={`${compactSelectStyles} min-w-[100px]`}
                    >
                        <option value={WindowSeries._798}>798 Series</option>
                        <option value={WindowSeries.TR}>TR Series</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={defaultHasTransom} onChange={e => setDefaultHasTransom(e.target.checked)} className="rounded text-sky-600 focus:ring-sky-500"/>
                        With Transom
                    </label>
                 </div>
            )}
             {defaultWindowType === WindowType.Awning && (
                 <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={defaultIsTubularFraming} onChange={e => setDefaultIsTubularFraming(e.target.checked)} className="rounded text-sky-600 focus:ring-sky-500"/>
                    Use Tubular Framing
                </label>
            )}
             {defaultWindowType === WindowType.Fixed && (
                 <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Frame:</span>
                    <select 
                        value={defaultFixedFrameProfile} 
                        onChange={e => setDefaultFixedFrameProfile(e.target.value)}
                        className={`${compactSelectStyles} min-w-[120px]`}
                    >
                        {tubularOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                 </div>
            )}
        </div>

        <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-bold text-slate-700">
                Windows
              </label>
              <button
                type="button"
                onClick={() => setIsGuideVisible(!isGuideVisible)}
                className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-bold bg-sky-50 px-2 py-1 rounded"
                aria-label="Toggle fraction guide"
              >
                <InfoIcon className="h-4 w-4" />
                Guide
              </button>
            </div>
            {isGuideVisible && <FractionGuide />}
            
            <div className="flex gap-6 mb-2 text-xs font-medium text-slate-500">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="unit" value={Unit.Inches} checked={unit === Unit.Inches} onChange={() => setUnit(Unit.Inches)} className="form-radio h-3 w-3 text-sky-600 focus:ring-sky-500 border-gray-300" />
                    Inches (in)
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="unit" value={Unit.Centimeters} checked={unit === Unit.Centimeters} onChange={() => setUnit(Unit.Centimeters)} className="form-radio h-3 w-3 text-sky-600 focus:ring-sky-500 border-gray-300" />
                    Centimeters (cm)
                </label>
            </div>

            <div className="space-y-3">
              {windows.map((window, index) => (
                <div key={window.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:border-sky-200 transition-colors relative">
                    <div className="absolute top-3 left-3 text-slate-400 font-bold text-xs">{index + 1}.</div>
                    
                    {window.isEditing ? (
                        <div className="pl-6 space-y-3">
                            {/* Row 1: Basic Info */}
                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    type="text"
                                    value={window.label}
                                    onChange={(e) => updateWindow(window.id, 'label', e.target.value)}
                                    className="w-12 bg-white border border-gray-300 rounded px-1.5 py-1 text-xs font-bold text-gray-900 focus:ring-1 focus:ring-sky-500"
                                    placeholder="Label"
                                />
                                <select 
                                    value={window.windowType} 
                                    onChange={e => updateWindow(window.id, 'windowType', e.target.value as WindowType)}
                                    className={`${compactSelectStyles} font-bold`}
                                >
                                    <option value={WindowType.Sliding}>Sliding</option>
                                    <option value={WindowType.Awning}>Awning</option>
                                    <option value={WindowType.Fixed}>Fixed</option>
                                </select>
                                
                                <div className="flex items-center gap-1">
                                    <input
                                        type="text"
                                        value={window.widthStr}
                                        onChange={(e) => updateWindow(window.id, 'widthStr', e.target.value)}
                                        onBlur={(e) => handleBlur(window.id, 'widthStr', e.target.value)}
                                        className={compactInputStyles}
                                        placeholder="Width"
                                    />
                                    <span className="text-slate-400 text-xs">x</span>
                                    <input
                                        type="text"
                                        value={window.heightStr}
                                        onChange={(e) => updateWindow(window.id, 'heightStr', e.target.value)}
                                        onBlur={(e) => handleBlur(window.id, 'heightStr', e.target.value)}
                                        className={compactInputStyles}
                                        placeholder="Height"
                                    />
                                </div>

                                {/* Dynamic inputs based on Type */}
                                {window.windowType === WindowType.Fixed ? (
                                    <div className="flex items-center gap-1">
                                        <input type="number" value={window.verticalGrids} onChange={e => updateWindow(window.id, 'verticalGrids', e.target.value)} className={`${compactInputStyles} text-center`} placeholder="V.Grid" />
                                        <span className="text-slate-300 text-xs">x</span>
                                        <input type="number" value={window.horizontalGrids} onChange={e => updateWindow(window.id, 'horizontalGrids', e.target.value)} className={`${compactInputStyles} text-center`} placeholder="H.Grid" />
                                    </div>
                                ) : (
                                    <select value={window.panelsStr} onChange={e => updateWindow(window.id, 'panelsStr', e.target.value)} className={compactSelectStyles}>
                                        {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} {window.windowType === WindowType.Awning ? (n===1?'Sect':'Sects') : 'Pnl'}</option>)}
                                    </select>
                                )}
                                
                                <button type="button" onClick={() => toggleEditMode(window.id)} className="ml-auto bg-green-100 hover:bg-green-200 text-green-700 h-7 w-7 flex items-center justify-center rounded transition-colors" title="Save">
                                    <CheckIcon className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Row 2: Advanced Config (Conditional) */}
                            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-200 text-xs">
                                {window.windowType === WindowType.Sliding && (
                                    <>
                                        <select value={window.windowSeries} onChange={e => updateWindow(window.id, 'windowSeries', e.target.value)} className={`${compactSelectStyles} w-auto`}>
                                            <option value={WindowSeries._798}>798 Series</option>
                                            <option value={WindowSeries.TR}>TR Series</option>
                                        </select>
                                        
                                        <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2 py-1 rounded border border-gray-200">
                                            <input type="checkbox" checked={window.hasTransom} onChange={e => updateWindow(window.id, 'hasTransom', e.target.checked)} className="rounded text-sky-600 focus:ring-sky-500 h-3.5 w-3.5" />
                                            <span>Transom</span>
                                        </label>
                                        
                                        {window.hasTransom && (
                                            <>
                                                <input
                                                    type="text"
                                                    value={window.transomHeightStr}
                                                    onChange={(e) => updateWindow(window.id, 'transomHeightStr', e.target.value)}
                                                    onBlur={(e) => handleBlur(window.id, 'transomHeightStr', e.target.value)}
                                                    className={compactInputStyles}
                                                    placeholder="T.Hgt"
                                                />
                                                <select value={window.transomPosition} onChange={e => updateWindow(window.id, 'transomPosition', e.target.value)} className={compactSelectStyles}>
                                                    <option value="top">Top</option>
                                                    <option value="bottom">Bot</option>
                                                </select>
                                                <select value={window.transomProfile} onChange={e => updateWindow(window.id, 'transomProfile', e.target.value)} className={`${compactSelectStyles} w-20`}>
                                                    {tubularOptions.filter(o => o.value !== '1x2').map(opt => <option key={opt.value} value={opt.value}>{opt.label.split(' ')[0]}</option>)}
                                                </select>
                                            </>
                                        )}
                                    </>
                                )}

                                {window.windowType === WindowType.Fixed && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500 font-semibold">Frame:</span>
                                        <select value={window.fixedFrameProfile} onChange={e => updateWindow(window.id, 'fixedFrameProfile', e.target.value)} className={compactSelectStyles}>
                                            {tubularOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </select>
                                    </div>
                                )}

                                {window.windowType === WindowType.Awning && (
                                    <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2 py-1 rounded border border-gray-200">
                                        <input type="checkbox" checked={window.isTubularFraming} onChange={e => updateWindow(window.id, 'isTubularFraming', e.target.checked)} className="rounded text-sky-600 focus:ring-sky-500 h-3.5 w-3.5" />
                                        <span>Tubular Frame</span>
                                    </label>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="pl-6 flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-sky-600 font-extrabold text-sm">{window.label}:</span>
                                    <span className="text-slate-800 font-bold text-sm">
                                        {window.windowType} 
                                        {window.windowType === WindowType.Sliding && <span className="text-slate-400 font-normal ml-1">({window.windowSeries})</span>}
                                    </span>
                                </div>
                                <div className="text-xs font-mono text-slate-600">
                                    {window.widthStr}" x {window.heightStr}"
                                    {window.hasTransom && window.transomHeightStr && <span className="text-sky-600 ml-1">+ {window.transomHeightStr}" Transom</span>}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                    {window.windowType === WindowType.Fixed 
                                        ? `Grids: ${window.verticalGrids}V x ${window.horizontalGrids}H` 
                                        : `${window.panelsStr} ${window.windowType === WindowType.Awning ? 'Sections' : 'Panels'}`}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                                <button type="button" onClick={() => handleViewDiagram(window)} className="p-1.5 hover:bg-slate-200 rounded text-slate-500" title="Diagram"><EyeIcon className="h-4 w-4" /></button>
                                <button type="button" onClick={() => toggleEditMode(window.id)} className="p-1.5 hover:bg-sky-50 rounded text-sky-600" title="Edit"><PencilIcon className="h-4 w-4" /></button>
                                <button type="button" onClick={() => removeWindow(window.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500" disabled={windows.length <= 1} title="Delete"><TrashIcon className="h-4 w-4" /></button>
                            </div>
                        </div>
                    )}
                </div>
              ))}
            </div>
            
            <button type="button" onClick={addWindow} className="flex items-center gap-2 text-sky-600 hover:text-sky-700 font-bold mt-2 px-2 py-1 rounded hover:bg-sky-50 transition-colors text-xs uppercase tracking-wide">
                <span className="text-base">+</span> Add Another Window
            </button>
        </div>
        
        {/* Footer Settings */}
        <div className="border-t border-gray-100 pt-6 mt-6">
            <label htmlFor="supplier" className="block text-sm font-bold text-slate-700 mb-2">Supplier</label>
            <select id="supplier" value={supplier} onChange={(e) => setSupplier(e.target.value as Supplier)} className={selectStyles}>
              {(Object.values(Supplier)).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="glassFinish" className="block text-sm font-bold text-slate-700 mb-2">Glass Finish</label>
            <select id="glassFinish" value={glassFinish} onChange={(e) => setGlassFinish(e.target.value as GlassFinish)} className={selectStyles}>
              {(Object.values(GlassFinish)).map((gf) => (
                <option key={gf} value={gf}>{gf}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="glassThickness" className="block text-sm font-bold text-slate-700 mb-2">Glass Thickness</label>
            <select id="glassThickness" value={glassThickness} onChange={(e) => setGlassThickness(e.target.value as GlassThickness)} className={selectStyles}>
              {(Object.values(GlassThickness)).map((gt) => (
                <option key={gt} value={gt}>{gt}"</option>
              ))}
            </select>
          </div>
        </div>

        <div>
            <label htmlFor="glassStock" className="block text-sm font-bold text-slate-700 mb-2">Glass Stock Size</label>
            <select id="glassStock" value={selectedStockSize} onChange={(e) => setSelectedStockSize(e.target.value)} className={selectStyles} disabled={availableStockSizes.length === 0}>
                {availableStockSizes.length === 0 ? (
                    <option value="">No stock for this glass type</option>
                ) : (
                    <>
                      <option value="optimize">Optimize Automatically</option>
                      {availableStockSizes.map(stock => (
                          <option key={`${stock.width}x${stock.height}`} value={`${stock.width}x${stock.height}`}>
                              {stock.width}" x {stock.height}"
                          </option>
                      ))}
                    </>
                )}
            </select>
        </div>

        <div>
            <h3 className="block text-sm font-bold text-slate-700 mb-3">Aluminum Profile Color</h3>
            <div className="flex flex-wrap gap-4">
                {(Object.keys(AluminumColor) as Array<keyof typeof AluminumColor>).map((key) => (
                <label key={key} className={`flex items-center gap-2 cursor-pointer p-3 rounded-lg border transition-all ${color === AluminumColor[key] ? 'bg-sky-50 border-sky-200 shadow-sm' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="color" value={AluminumColor[key]} checked={color === AluminumColor[key]} onChange={(e) => setColor(e.target.value)} className="form-radio h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300" />
                    <span className={`font-medium ${color === AluminumColor[key] ? 'text-sky-900' : 'text-slate-600'}`}>{AluminumColor[key]}</span>
                </label>
                ))}
            </div>
        </div>

        {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded"><p className="text-red-700 font-medium text-sm">{error}</p></div>}
        
        <button
          id="calculate-button"
          type="submit"
          className="w-full flex items-center justify-center gap-3 bg-sky-600 hover:bg-sky-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-sky-300 mt-6"
        >
          <CalculatorIcon className="h-6 w-6" />
          <span className="text-lg">Calculate Materials</span>
        </button>
      </form>
      
      <WindowSchematicModal 
        isOpen={!!diagramWindow}
        onClose={() => setDiagramWindow(null)}
        windows={diagramWindow || []}
      />
    </div>
  );
};
