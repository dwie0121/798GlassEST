
export const AluminumColor = {
  White: 'White',
  Black: 'Black',
} as const;
export type AluminumColor = typeof AluminumColor[keyof typeof AluminumColor];

export const Supplier = {
  Best: 'Best Price',
  VIS: 'VIS',
  VLIS: 'VLIS',
  BEST: 'BEST',
  GAG: 'GAG',
  ASYA: 'ASYA',
} as const;
export type Supplier = typeof Supplier[keyof typeof Supplier];

export const GlassFinish = {
  Clear: 'Clear',
  OrdinaryBronze: 'Ordinary Bronze',
  ReflectiveDarkBronze: 'Reflective Dark Bronze',
  ReflectiveLightBronze: 'Reflective Light Bronze',
  ReflectiveBlue: 'Reflective Blue',
  ReflectiveGreen: 'Reflective Green',
  ReflectiveBlack: 'Reflective Black',
  DarkGrey: 'Dark Grey',
  DarkBlack: 'Dark Black',
  Smoked: 'Smoked',
  Mirror: 'Mirror',
} as const;
export type GlassFinish = typeof GlassFinish[keyof typeof GlassFinish];

export const GlassThickness = {
  _1_8: '1/8',
  _3_16: '3/16',
  _1_4: '1/4',
} as const;
export type GlassThickness = typeof GlassThickness[keyof typeof GlassThickness];

export const Unit = {
  Inches: 'in',
  Centimeters: 'cm',
} as const;
export type Unit = typeof Unit[keyof typeof Unit];

export const WindowSeries = {
  _798: '798',
  TR: 'TR',
} as const;
export type WindowSeries = typeof WindowSeries[keyof typeof WindowSeries];

export const WindowType = {
  Sliding: 'Sliding',
  Awning: 'Awning',
  Fixed: 'Fixed',
} as const;
export type WindowType = typeof WindowType[keyof typeof WindowType];

export type WindowInputs = {
  label?: string;
  width: number;
  height: number;
  panels: number;
  windowType: WindowType;
  windowSeries?: WindowSeries;
  verticalGrids?: number;
  horizontalGrids?: number;
  isTubularFraming?: boolean;
  fixedFrameProfile?: string;
  hasTransom?: boolean;
  transomHeight?: number;
  transomProfile?: string;
  transomPosition?: 'top' | 'bottom';
};

export type WindowDimensions = {
  width: number;
  height: number;
  color: AluminumColor;
  panels: number;
};

export const MaterialCategory = {
  Aluminum: 'Aluminum Profiles',
  Glass: 'Glass',
  Hardware: 'Hardware & Accessories',
} as const;
export type MaterialCategory = typeof MaterialCategory[keyof typeof MaterialCategory];

export type PanelCut = {
  width: number;
  height: number;
  windowIndex: number;
  windowLabel?: string;
};

export type PlacedPanel = {
  x: number;
  y: number;
  w: number;
  h: number;
  sourceWidth: number;
  sourceHeight: number;
  windowIndex?: number;
  windowLabel?: string;
};

export type SheetLayout = {
  placedPanels: PlacedPanel[];
  stockWidth: number;
  stockHeight: number;
};

export type Material = {
  name: string;
  quantity: number;
  size: string;
  category: MaterialCategory;
  totalLength?: number;
  barsNeeded?: number;
  notes?: string;
  unitPrice?: number;
  totalCost?: number;
  priceSource?: string;
  physicalSheets?: number;
  totalWeightKg?: number;
  layoutData?: SheetLayout[];
};

export type Inventory = {
  aluminum: Material[];
  glass: Material[];
  hardware: Material[];
  grandTotal: number;
  aluminumTotal: number;
  glassTotal: number;
  hardwareTotal: number;
  totalSquareFootage: number;
  panelCuts: PanelCut[];
};

export type PriceInfo = {
  [supplier: string]: number;
};

export type PriceList = {
  [material: string]: PriceInfo;
};

export type MaterialProperty = {
  weightKgPerFoot?: number;
};

export type MaterialPropertiesList = {
  [material: string]: MaterialProperty;
};

export type ProjectInputs = {
  windows: WindowInputs[];
  color: string;
  supplier: Supplier;
  glassType: string;
  selectedStock: string;
  clientName: string;
  windowSeries: WindowSeries;
  windowType: WindowType;
  isTubularFraming: boolean;
  fixedFrameProfile?: string;
  hasTransom?: boolean;
  transomPosition?: 'top' | 'bottom';
  transomProfile?: string;
};

export type SavedProject = {
  id: string;
  createdAt: string;
  clientName: string;
  inputs: ProjectInputs;
  result: Inventory;
  deliveryFee?: string;
  taxRate?: string;
  markup?: number;
  manualPricePerSqFt?: string | null;
};
