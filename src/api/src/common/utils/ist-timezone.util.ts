/**
 * IST (Indian Standard Time) timezone utilities
 * IST is UTC+5:30
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds

/**
 * Get current date/time in IST
 */
export function istNow(): Date {
  const utcNow = new Date();
  return new Date(utcNow.getTime() + IST_OFFSET_MS);
}

/**
 * Get start of day in IST for a given date
 * @param date - Date to get start of day for (defaults to today in IST)
 * @returns Date object representing start of day (00:00:00) in IST
 */
export function istStartOfDay(date?: Date): Date {
  const targetDate = date ? new Date(date.getTime() + IST_OFFSET_MS) : istNow();
  const year = targetDate.getUTCFullYear();
  const month = targetDate.getUTCMonth();
  const day = targetDate.getUTCDate();
  
  // Create date at 00:00:00 IST (which is 18:30:00 previous day UTC)
  const istStart = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  // Convert back to UTC by subtracting IST offset
  return new Date(istStart.getTime() - IST_OFFSET_MS);
}

/**
 * Get start of month in IST for a given date
 * @param date - Date to get start of month for (defaults to today in IST)
 * @returns Date object representing start of month (1st day, 00:00:00) in IST
 */
export function istStartOfMonth(date?: Date): Date {
  const targetDate = date ? new Date(date.getTime() + IST_OFFSET_MS) : istNow();
  const year = targetDate.getUTCFullYear();
  const month = targetDate.getUTCMonth();
  
  // Create date at 1st of month, 00:00:00 IST
  const istStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  // Convert back to UTC by subtracting IST offset
  return new Date(istStart.getTime() - IST_OFFSET_MS);
}

/**
 * Format date as YYYY-MM-DD string in IST
 */
export function formatISTDate(date: Date): string {
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date as YYYY-MM string in IST
 */
export function formatISTMonth(date: Date): string {
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Parse YYYY-MM-DD string to Date in IST
 */
export function parseISTDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create date at 00:00:00 IST
  const istDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  // Convert back to UTC
  return new Date(istDate.getTime() - IST_OFFSET_MS);
}

/**
 * Get today's date key in IST (YYYY-MM-DD format)
 */
export function istTodayKey(): string {
  return formatISTDate(istNow());
}

/**
 * Get current month key in IST (YYYY-MM format)
 */
export function istCurrentMonthKey(): string {
  return formatISTMonth(istNow());
}

