# API Configuration

This file contains the centralized configuration for all API endpoints.

## Changing the Base URL

To update the API base URL (e.g., when your ngrok tunnel changes), simply update the `BASE_URL` in this file:

```typescript
export const API_CONFIG = {
  BASE_URL: "https://cycleoptima-production.up.railway.app/", // Update this line only
  HEADERS: {
    NGROK_SKIP_WARNING: "ngrok-skip-browser-warning",
  },
} as const;
```

## Files that use this configuration:

- `src/apis/cycles.ts` - All cycle CRUD operations
- `src/apis/library.ts` - Component library fetching
- `src/apis/embedText.ts` - OpenAI API key fetching
- `src/App.tsx` - Socket.io connection
- `src/utils/testSocket.ts` - Socket testing utility

## Helper Functions:

- `getApiUrl(path)` - Constructs full API URLs
- `getNgrokHeaders()` - Returns headers needed for ngrok requests
