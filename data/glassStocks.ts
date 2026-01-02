import { GlassFinish, GlassThickness } from '../types';

export interface StockSize {
  width: number;
  height: number;
}

// All dimensions in inches

// Sorted by area ascending to prefer smaller sheets
const generalStock: StockSize[] = [
  { width: 48, height: 72 }, // 3456 sq in
  { width: 48, height: 84 }, // 4032 sq in
  { width: 48, height: 96 }, // 4608 sq in
  { width: 60, height: 84 }, // 5040 sq in
  { width: 65, height: 84 }, // 5460 sq in
  { width: 72, height: 96 }, // 6912 sq in
]; 

const stock3_16: StockSize[] = [{ width: 48, height: 72 }];
const stockMirror: StockSize[] = [{ width: 48, height: 72 }, { width: 48, height: 84 }];
const stock1_8: StockSize[] = [{ width: 48, height: 72 }];

/**
 * Determines the available stock sheet sizes for a given glass type.
 * @param glassType - A string combining finish and thickness, e.g., "Clear-1/4".
 * @returns An array of available stock sizes.
 */
export const getAvailableStock = (glassType: string): StockSize[] => {
  const [finish, thickness] = glassType.split('-');
  
  if (thickness === GlassThickness._3_16) {
    return stock3_16;
  }

  if (finish === GlassFinish.Mirror) {
    return stockMirror;
  }

  if (thickness === GlassThickness._1_8) {
    return stock1_8;
  }
  
  // Default for all other types (e.g., 1/4" non-mirror)
  return generalStock;
};