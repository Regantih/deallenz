/**
 * Utility for conditionally joining class names together.
 * Minimal implementation that doesn't require external dependencies.
 */

type ClassValue = string | undefined | null | false | 0 | ClassValue[];

function clsx(...inputs: ClassValue[]): string {
  const classes: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === 'string') {
      classes.push(input);
    } else if (Array.isArray(input)) {
      const nested = clsx(...input);
      if (nested) classes.push(nested);
    }
  }
  return classes.join(' ');
}

export function cn(...inputs: ClassValue[]) {
  return clsx(...inputs);
}
