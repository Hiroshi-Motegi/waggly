import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 日付文字列を「YYYY年M月D日」形式にフォーマット */
export function formatDate(dateStr: string): string {
  const s = dateStr.includes("T") ? dateStr : dateStr + "T00:00:00";
  const d = new Date(s);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
