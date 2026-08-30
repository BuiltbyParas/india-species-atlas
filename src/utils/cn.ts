/** Tiny className joiner — avoids a dependency for a one-line utility. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
