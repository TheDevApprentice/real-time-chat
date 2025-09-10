// Reusable text utilities

/**
 * Sanitize a text message for safe rendering in clients that might not escape HTML.
 * - Trims input
 * - Limits to 2000 chars
 * - Escapes minimal HTML entities (&, <, >)
 */
export function sanitizeText(input: string): string {
  const trimmed = (input ?? "").toString().trim();
  const limited = trimmed.slice(0, 2000);
  return limited
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
