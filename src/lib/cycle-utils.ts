import { MonthInfo } from './types';

export const MONTH_NAMES = [
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
  'January',
  'February',
  'March',
  'April',
];

export const MONTH_SHORT_NAMES = [
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
];

export function getMonthInfoList(startYear: number): MonthInfo[] {
  return MONTH_NAMES.map((name, index) => {
    // Months 0-7 (May to Dec) are in startYear
    // Months 8-11 (Jan to Apr) are in startYear + 1
    const year = index < 8 ? startYear : startYear + 1;
    const calendarMonth = index < 8 ? index + 5 : index - 7; // May = 5, ..., April = 4
    return {
      month_index: index,
      name,
      short_name: MONTH_SHORT_NAMES[index],
      year,
      calendar_month: calendarMonth,
    };
  });
}

export function getCurrentCycleMonthIndex(startYear: number, date: Date = new Date()): number {
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth() + 1; // 1-12

  if (currentYear === startYear) {
    if (currentMonth >= 5) {
      return currentMonth - 5; // May=0, Jun=1 ... Dec=7
    }
    return 0; // Prior to start, default to 0
  } else if (currentYear === startYear + 1) {
    if (currentMonth <= 4) {
      return currentMonth + 7; // Jan=8, Feb=9, Mar=10, Apr=11
    }
    return 11; // After cycle ends, cap at 11
  } else if (currentYear < startYear) {
    return 0;
  } else {
    return 11;
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}
