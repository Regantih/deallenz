/**
 * Shared parse utilities for swarm agents.
 */

/**
 * Strip leading/trailing markdown code fences from LLM output.
 * Handles: ```json ... ```, ``` ... ```, and variants.
 */
export function stripCodeFences(content: string): string {
  let s = content.trim();
  // Remove leading ```json or ``` fence (first line only)
  if (s.startsWith('```')) {
    const firstNewline = s.indexOf('\n');
    if (firstNewline !== -1) {
      s = s.slice(firstNewline + 1).trim();
    }
  }
  // Remove trailing ``` fence (last line only)
  if (s.endsWith('```')) {
    const lastNewlinePos = s.lastIndexOf('\n', s.length - 4);
    if (lastNewlinePos !== -1) {
      s = s.slice(0, lastNewlinePos).trim();
    } else {
      s = s.slice(0, s.length - 3).trim();
    }
  }
  return s;
}

/**
 * Parse LLM JSON output, stripping code fences first.
 * Returns null if parsing fails.
 */
export function parseJSON<T>(content: string): T | null {
  try {
    return JSON.parse(stripCodeFences(content)) as T;
  } catch {
    return null;
  }
}
