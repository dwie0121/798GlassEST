
import React from 'react';
import { WindowType, WindowSeries } from '../types';
import { decimalToFraction } from '../utils/formatting';

interface WindowSchematicProps {
  type: WindowType;
  series: WindowSeries;
  isTubular: boolean;
  panels: number;
  verticalGrids?: number;
  horizontalGrids?: number;
  width?: number; 
  height?: number;
  showLegend?: boolean;
  theme?: 'light' | 'dark';
  fixedFrameProfile?: string;
  hasTransom?: boolean;
  transomHeight?: number;
  transomPosition?: 'top' | 'bottom';
}

export const WindowSchematic: React.FC<WindowSchematicProps> = ({ 
    type, series, isTubular, panels, verticalGrids = 0, horizontalGrids = 0, width = 48, height = 48, showLegend = false, theme = 'light',
    fixedFrameProfile = '1x2', hasTransom = false, transomHeight = 0, transomPosition = 'top'
}) => {
  const isSliding = type === WindowType.Sliding;
  const isFixed = type === WindowType.Fixed;
  const isDark = theme === 'dark';
  const labelColor = isDark ? 'white' : '#334155';
  const dimColor = isDark ? '#fbbf24' : '#d97706'; // Amber for dimensions
  const glassColor = isDark ? '#bae6fd' : '#e0f2fe';
  const glassStroke = isDark ? '#7dd3fc' : '#7dd3fc';

  // Safety Checks & Limits to prevent browser hangs
  const safeWidth = Math.max(1, typeof width === 'number' && !isNaN(width) ? width : 48);
  const safeHeight = Math.max(1, typeof height === 'number' && !isNaN(height) ? height : 48);
  const safePanels = Math.min(Math.max(1, panels || 1), 20); // Cap panels at 20
  const safeVGrids = Math.min(Math.max(0, verticalGrids || 0), 50); // Cap grids at 50
  const safeHGrids = Math.min(Math.max(0, horizontalGrids || 0), 50); // Cap grids at 50

  // SVG Drawing Logic
  const svgWidth = 600;
  const svgHeight = 500;
  const padding = 80; 
  const drawingAreaW = svgWidth - padding * 2;
  const drawingAreaH = svgHeight - padding * 2;

  // Calculate scaling
  const effectiveTransomH = (hasTransom && (transomHeight || 0) > 0) ? (transomHeight || 0) : 0;
  const totalDisplayH = safeHeight + effectiveTransomH;
  
  const scale = Math.min(drawingAreaW / safeWidth, drawingAreaH / totalDisplayH);
  
  const scaledW = safeWidth * scale;
  const scaledMainH = safeHeight * scale;
  const scaledTransomH = effectiveTransomH * scale;
  const scaledTotalH = scaledMainH + scaledTransomH;

  const startX = (svgWidth - scaledW) / 2;
  const startY = (svgHeight - scaledTotalH) / 2;

  // Visual constants (in scaled units approx)
  const frameThick = Math.max(4, 1.5 * scale); 
  const sashThick = Math.max(3, 1.25 * scale); 

  // --- Dimension Helper ---
  const renderDimension = (x1: number, y1: number, x2: number, y2: number, value: number, label: string, offset: number = 20, vertical: boolean = false) => {
      const text = `${label ? label + ': ' : ''}${decimalToFraction(value)}"`;
      const tickSize = 5;
      
      return (
          <g>
              {/* Main Line */}
              <line x1={vertical ? x1 - offset : x1} y1={vertical ? y1 : y1 - offset} x2={vertical ? x2 - offset : x2} y2={vertical ? y2 : y2 - offset} stroke={dimColor} strokeWidth="1" />
              
              {/* Ticks */}
              <line x1={vertical ? x1 - offset - tickSize : x1} y1={vertical ? y1 : y1 - offset - tickSize} x2={vertical ? x1 - offset + tickSize : x1} y2={vertical ? y1 : y1 - offset + tickSize} stroke={dimColor} strokeWidth="1" />
              <line x1={vertical ? x2 - offset - tickSize : x2} y1={vertical ? y2 : y2 - offset - tickSize} x2={vertical ? x2 - offset + tickSize : x2} y2={vertical ? y2 : y2 - offset + tickSize} stroke={dimColor} strokeWidth="1" />

              {/* Text */}
              <text 
                x={vertical ? x1 - offset - 10 : (x1 + x2) / 2} 
                y={vertical ? (y1 + y2) / 2 : y1 - offset - 10} 
                fill={dimColor} 
                fontSize="12" 
                textAnchor="middle" 
                alignmentBaseline={vertical ? "middle" : "baseline"}
                transform={vertical ? `rotate(-90 ${x1 - offset - 10} ${(y1 + y2) / 2})` : ''}
                fontWeight="bold"
              >
                  {text}
              </text>
          </g>
      )
  }

  const renderTransom = (y: number, h: number) => {
      let profileThickness = 1.0;
      if (fixedFrameProfile && fixedFrameProfile.startsWith('1-3/4')) {
          profileThickness = 1.75;
      }
      const tfThick = Math.max(4, profileThickness * scale);
      
      const numDividers = Math.max(0, panels - 1);
      const dividerThick = tfThick; 
      
      const availableW = scaledW - (2 * tfThick) - (numDividers * dividerThick);
      const paneW = availableW / panels;
      const paneH = h - (2 * tfThick);

      return (
          <g>
              {/* Outer Frame */}
              <rect x={startX} y={y} width={scaledW} height={h} fill="#475569" stroke={isDark ? "#1e293b" : "#334155"} strokeWidth="1" />
              
              {/* Panes & Dividers */}
              {Array.from({length: panels}).map((_, i) => {
                  const xPos = startX + tfThick + (i * (paneW + dividerThick));
                  return (
                      <rect key={i} x={xPos} y={y + tfThick} width={paneW} height={paneH} fill={glassColor} fillOpacity="0.5" stroke={glassStroke} strokeWidth="0.5" />
                  );
              })}
              
              <text x={startX + scaledW/2} y={y + h/2} fill={labelColor} fontSize="10" textAnchor="middle" opacity="0.7">Transom ({panels} Pnl)</text>
          </g>
      )
  }
  
  const renderSlidingWindow = (y: number, h: number) => {
    // Sliding needs at least 2 panels to make sense visually here, max is capped by safePanels
    const renderPanels = Math.max(2, safePanels);
    const panelW = (scaledW - (frameThick * 2)) / renderPanels + (renderPanels > 1 ? sashThick/2 : 0);
    const panelH = h - (frameThick * 2);

    return (
      <g>
        {/* Outer Frame */}
        <rect x={startX} y={y} width={scaledW} height={h} fill="#475569" rx="2" stroke={isDark ? "#1e293b" : "#334155"} strokeWidth="1" />
        <rect x={startX + frameThick} y={y + frameThick} width={scaledW - frameThick*2} height={h - frameThick*2} fill={isDark ? "#1e293b" : "#f1f5f9"} />
        
        {/* Panels */}
        {Array.from({ length: renderPanels }).map((_, i) => {
           const finalX = renderPanels === 2 
             ? (i===0 ? startX + frameThick : startX + scaledW - frameThick - panelW) 
             : startX + frameThick + (i * ((scaledW - frameThick*2 - panelW) / (renderPanels - 1)));

           // Ensure finalX is not NaN (extra safety)
           if (isNaN(finalX)) return null;

           return (
             <g key={i}>
                <rect x={finalX} y={y + frameThick + 2} width={panelW} height={panelH - 4} fill="#64748b" stroke={isDark ? "#334155" : "#475569"} strokeWidth="1" />
                <rect x={finalX + sashThick} y={y + frameThick + sashThick} width={panelW - sashThick*2} height={panelH - sashThick*2} fill={glassColor} fillOpacity="0.6" stroke={glassStroke} strokeWidth="0.5" />
                {renderPanels === 2 && (
                    <text x={finalX + panelW/2} y={y + h - 15} fill={labelColor} fontSize="9" textAnchor="middle" opacity="0.6">Panel {i+1}</text>
                )}
             </g>
           )
        })}
        
        <text x={startX + scaledW/2} y={y + h - 5} fill={labelColor} fontSize="10" textAnchor="middle" opacity="0.8">Sliding Frame</text>
      </g>
    );
  };

  const renderAwningWindow = (y: number, h: number) => {
    const sashInset = frameThick;
    const glassInset = frameThick + sashThick;

    return (
      <g>
         <rect x={startX} y={y} width={scaledW} height={h} fill="#475569" rx="2" stroke={isDark ? "#1e293b" : "#334155"} strokeWidth="1" />
         <rect x={startX + sashInset} y={y + sashInset} width={scaledW - sashInset*2} height={h - sashInset*2} fill="#64748b" stroke={isDark ? "#334155" : "#475569"} strokeWidth="1" />
         <rect x={startX + glassInset} y={y + glassInset} width={scaledW - glassInset*2} height={h - glassInset*2} fill={glassColor} fillOpacity="0.6" stroke={glassStroke} strokeWidth="0.5" />
         
         <circle cx={startX + scaledW/2} cy={y + h - sashInset/2} r="3" fill="#f59e0b" />
         <text x={startX + scaledW/2} y={y + h + 15} fill={labelColor} fontSize="10" textAnchor="middle" opacity="0.8">Awning</text>
      </g>
    );
  };

  const renderFixedWindow = (y: number, h: number) => {
    let profileThickness = 1.0;
    if (fixedFrameProfile && fixedFrameProfile.startsWith('1-3/4')) {
        profileThickness = 1.75;
    }
    
    const fixedFrameThick = Math.max(4, profileThickness * scale);
    const gridThick = fixedFrameThick; 
    const glassInset = fixedFrameThick;

    const availableW = scaledW - (fixedFrameThick * 2);
    const availableH = h - (fixedFrameThick * 2);
    
    const renderVerticalGrids = () => {
        const grids = [];
        if (safeVGrids <= 0) return grids;
        const spacing = availableW / (safeVGrids + 1);
        for(let i=1; i <= safeVGrids; i++) {
            grids.push(
                <rect key={`v-${i}`} x={startX + fixedFrameThick + (spacing * i) - (gridThick/2)} y={y + fixedFrameThick} width={gridThick} height={availableH} fill="#64748b" />
            );
        }
        return grids;
    }

    const renderHorizontalGrids = () => {
        const grids = [];
        if (safeHGrids <= 0) return grids;
        const spacing = availableH / (safeHGrids + 1);
        for(let i=1; i <= safeHGrids; i++) {
            grids.push(
                <rect key={`h-${i}`} x={startX + fixedFrameThick} y={y + fixedFrameThick + (spacing * i) - (gridThick/2)} width={availableW} height={gridThick} fill="#64748b" />
            );
        }
        return grids;
    }

    return (
      <g>
         <rect x={startX} y={y} width={scaledW} height={h} fill="#475569" rx="2" stroke={isDark ? "#1e293b" : "#334155"} strokeWidth="1" />
         <rect x={startX + glassInset} y={y + glassInset} width={scaledW - glassInset*2} height={h - glassInset*2} fill={glassColor} fillOpacity="0.6" stroke={glassStroke} strokeWidth="0.5" />
         {renderVerticalGrids()}
         {renderHorizontalGrids()}
         <text x={startX + scaledW/2} y={y + h + 15} fill={labelColor} fontSize="10" textAnchor="middle" opacity="0.8">Fixed Window</text>
      </g>
    );
  };

  let mainY = startY;
  let transomY = 0;

  if (hasTransom && effectiveTransomH > 0) {
      if (transomPosition === 'top') {
          transomY = startY;
          mainY = startY + scaledTransomH;
      } else {
          mainY = startY;
          transomY = startY + scaledMainH;
      }
  }

  return (
    <div className="flex flex-col items-center w-full">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', maxHeight: '500px' }}>
            {isSliding ? renderSlidingWindow(mainY, scaledMainH) : isFixed ? renderFixedWindow(mainY, scaledMainH) : renderAwningWindow(mainY, scaledMainH)}
            
            {(hasTransom && effectiveTransomH > 0) && renderTransom(transomY, scaledTransomH)}

            {renderDimension(startX, startY, startX + scaledW, startY, safeWidth, "Width", 20, false)}
            
            {hasTransom && effectiveTransomH > 0 ? (
                <>
                    {renderDimension(startX, mainY, startX, mainY + scaledMainH, safeHeight, "Main H", 20, true)}
                    {renderDimension(startX, transomY, startX, transomY + scaledTransomH, effectiveTransomH, "Transom", 20, true)}
                    {renderDimension(startX + scaledW, startY, startX + scaledW, startY + scaledTotalH, safeHeight + effectiveTransomH, "Total H", -30, true)}
                </>
            ) : (
                renderDimension(startX, mainY, startX, mainY + scaledMainH, safeHeight, "Height", 20, true)
            )}

        </svg>
        {showLegend && (
             <div className={`mt-2 w-full max-w-lg grid grid-cols-2 gap-2 text-xs border p-3 rounded ${isDark ? 'bg-slate-700/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-slate-600 rounded border border-slate-500"></div>
                    <span className={isDark ? "text-slate-300" : "text-slate-700"}>Frame</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-slate-500 rounded border border-slate-400"></div>
                    <span className={isDark ? "text-slate-300" : "text-slate-700"}>{isFixed ? 'Grid' : 'Sash'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border ${isDark ? 'bg-sky-200/60 border-sky-300' : 'bg-sky-100 border-sky-300'}`}></div>
                    <span className={isDark ? "text-slate-300" : "text-slate-700"}>Glass</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-2 bg-amber-600"></div>
                    <span className={isDark ? "text-slate-300" : "text-slate-700"}>Dim. Lines</span>
                </div>
            </div>
        )}
    </div>
  );
};
