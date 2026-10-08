import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BENGALI_DIGITS: Record<string, string> = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
};

const BENGALI_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const BENGALI_DAYS = [
  'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'
];

export function toBengaliNumber(num: number | string): string {
  return String(num).replace(/[0-9]/g, digit => BENGALI_DIGITS[digit] || digit);
}

export function formatBengaliDate(dateInput: Date | string): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const dayName = BENGALI_DAYS[d.getDay()];
  const day = toBengaliNumber(d.getDate());
  const month = BENGALI_MONTHS[d.getMonth()];
  const year = toBengaliNumber(d.getFullYear());

  let hours = d.getHours();
  const minutes = toBengaliNumber(String(d.getMinutes()).padStart(2, '0'));
  let period = 'সকাল';
  if (hours >= 12 && hours < 15) period = 'দুপুর';
  else if (hours >= 15 && hours < 18) period = 'বিকেল';
  else if (hours >= 18 && hours < 20) period = 'সন্ধ্যা';
  else if (hours >= 20 || hours < 6) period = 'রাত';

  const displayHours = hours % 12 || 12;
  const bengaliHours = toBengaliNumber(displayHours);

  return `${dayName}, ${day} ${month} ${year}, ${period} ${bengaliHours}:${minutes}`;
}

export function formatRelativeBengaliTime(dateInput: Date | string): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 60) return 'এইমাত্র';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${toBengaliNumber(diffMin)} মিনিট আগে`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${toBengaliNumber(diffHours)} ঘণ্টা আগে`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${toBengaliNumber(diffDays)} দিন আগে`;

  return `${toBengaliNumber(d.getDate())} ${BENGALI_MONTHS[d.getMonth()]}`;
}

export function calculateReadTime(text: string): string {
  const words = text ? text.trim().split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return `${toBengaliNumber(minutes)} মিনিট পাঠ`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u0980-\u09FF-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
