import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Menggabungkan nama kelas CSS secara kondisional (`clsx`) sekaligus menyelesaikan konflik
 * utilitas Tailwind CSS (`tailwind-merge`) agar kelas terakhir selalu menang.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
