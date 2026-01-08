/**
 * Currency formatting utilities
 * - Salary + Total Deductions: INR (₹)
 * - Refund + Coupon amounts: USD ($)
 */

/**
 * Format amount as INR currency
 * @param {number|string} amount - Amount to format
 * @returns {string} Formatted string like "₹1,23,456.00"
 */
export function formatINR(amount) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0.00';
  
  // Indian numbering system: 1,23,456.00
  const parts = Math.abs(num).toFixed(2).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Add commas in Indian format (lakhs, crores)
  let formatted = '';
  let count = 0;
  for (let i = integerPart.length - 1; i >= 0; i--) {
    if (count === 3 && i !== integerPart.length - 1) {
      formatted = ',' + formatted;
      count = 0;
    }
    formatted = integerPart[i] + formatted;
    count++;
  }
  
  const sign = num < 0 ? '-' : '';
  return `${sign}₹${formatted}.${decimalPart}`;
}

/**
 * Format amount as USD currency
 * @param {number|string} amount - Amount to format
 * @returns {string} Formatted string like "$1,234.56"
 */
export function formatUSD(amount) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

