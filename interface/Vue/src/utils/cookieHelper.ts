// Cookie helper
export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}

// Token helper built on top of getCookie
export function getToken(name: string | null = "session_token"): string | null {
  return getCookie(name);
}