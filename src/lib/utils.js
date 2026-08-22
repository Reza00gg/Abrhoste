import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge conditional class names, Tailwind-conflict aware. */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
