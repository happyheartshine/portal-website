/**
 * Date/time formatting utilities
 * - Display format: "3 Jan 2026" (D MMM YYYY)
 * - All dates in IST (Indian Standard Time)
 */

/**
 * Get current date/time in IST
 * @returns {Date} Date object representing current time in IST
 */
export function nowIST() {
  const now = new Date();
  // IST is UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000; // milliseconds
  const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  return new Date(utc + istOffset);
}

/**
 * Convert date to IST
 * @param {Date|string} date - Date to convert
 * @returns {Date} Date object in IST
 */
export function toIST(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return nowIST();
  
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = d.getTime() + (d.getTimezoneOffset() * 60 * 1000);
  return new Date(utc + istOffset);
}

/**
 * Format date for display: "3 Jan 2026" (D MMM YYYY)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDateDisplay(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  const istDate = toIST(d);
  const day = istDate.getDate();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[istDate.getMonth()];
  const year = istDate.getFullYear();
  
  return `${day} ${month} ${year}`;
}

/**
 * Format date for input field (YYYY-MM-DD)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string for input[type="date"]
 */
export function formatDateInput(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    const now = nowIST();
    return now.toISOString().slice(0, 10);
  }
  
  const istDate = toIST(d);
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

