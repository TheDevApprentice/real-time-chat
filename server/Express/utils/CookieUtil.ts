
export function getCookieValue(cookieHeader: string, name: string): string | null {
    // Simple cookie parser for a single cookie key
    // cookieHeader format: "a=1; b=2; X-XSRF-TOKEN=..."
    try {
      const parts = cookieHeader.split(/;\s*/);
      for (const part of parts) {
        const idx = part.indexOf("=");
        if (idx === -1) continue;
        const k = part.substring(0, idx).trim();
        if (k === name) {
          return decodeURIComponent(part.substring(idx + 1));
        }
      }
    } catch {}
    return null;
  }
  