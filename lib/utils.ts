import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Builds a className string from conditional values and resolves Tailwind
 * conflicts in favour of the last one. This is what lets a call site override a
 * component's built-in classes — `cn("p-2", "p-4")` yields `"p-4"` — so styling
 * stays at the call site instead of forking `components/ui/*`.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
