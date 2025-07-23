// Centralized API configuration
export const API_CONFIG = {
  BASE_URL: "https://cycleoptima-production.up.railway.app",
  HEADERS: {
    NGROK_SKIP_WARNING: "ngrok-skip-browser-warning",
  },
} as const;

// Helper function to get API URL with path
export function getApiUrl(path: string = ""): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_CONFIG.BASE_URL}${cleanPath}`;
}

// Common headers for ngrok requests
export function getNgrokHeaders(): Record<string, string> {
  return {
    [API_CONFIG.HEADERS.NGROK_SKIP_WARNING]: "true",
  };
}
