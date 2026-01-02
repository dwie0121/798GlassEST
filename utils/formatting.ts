
// Helper to find the greatest common divisor, used for simplifying fractions
export const gcd = (a: number, b: number): number => {
  return b ? gcd(b, a % b) : a;
};

/**
 * Converts a decimal number to a mixed fraction string (e.g., 48.5 -> "48 1/2").
 * It simplifies the fraction to the nearest 1/16th.
 * @param value The decimal number to convert.
 * @returns A string representing the number as a whole number or mixed fraction.
 */
export const decimalToFraction = (value: number): string => {
  if (isNaN(value) || value === null) return '';
  // Round to a reasonable precision to handle floating point inaccuracies
  const roundedValue = Math.round(value * 10000) / 10000;
  if (Number.isInteger(roundedValue)) return roundedValue.toString();

  const integerPart = Math.floor(roundedValue);
  const fractionalPart = roundedValue - integerPart;

  if (fractionalPart === 0) {
    return integerPart.toString();
  }

  // Common denominator of 16 for standard imperial measurements
  const denominator = 16;
  const numerator = Math.round(fractionalPart * denominator);
  
  if (numerator === 0) {
      return integerPart.toString();
  }
  if (numerator === denominator) {
      return (integerPart + 1).toString();
  }
  
  const divisor = gcd(numerator, denominator);
  
  const simplifiedNumerator = numerator / divisor;
  const simplifiedDenominator = denominator / divisor;
  
  const fractionStr = `${simplifiedNumerator}/${simplifiedDenominator}`;
  
  return integerPart > 0 ? `${integerPart} ${fractionStr}` : fractionStr;
};

/**
 * Formats a number with commas as thousands separators and ensures two decimal places.
 * @param value The number to format.
 * @returns A formatted string, e.g., 1,234.56. Returns '0.00' for null/undefined.
 */
export const formatNumberWithCommas = (value: number | undefined | null): string => {
  if (value === null || value === undefined || isNaN(value)) return '0.00';
  
  const parts = value.toFixed(2).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  const formattedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `${formattedIntegerPart}.${decimalPart}`;
};

/**
 * Applies billing rounding rules for dimensions (in feet).
 * If the decimal part is greater than 0.25 (3 inches), round up to the nearest 0.5 (6 inches).
 * Otherwise, keep the original value.
 * @param num The dimension in feet.
 * @returns The rounded dimension in feet.
 */
export const applyBillingRounding = (num: number): number => {
  const integerPart = Math.floor(num);
  const decimalPart = num - integerPart;

  if (decimalPart > 0.25) {
    return Math.ceil(num * 2) / 2;
  }
  return num;
};
