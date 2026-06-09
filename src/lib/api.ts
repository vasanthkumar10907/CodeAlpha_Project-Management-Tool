const BASE_URL = 'http://localhost:5000/api/v1';

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  error?: string;
}

export interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: any;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiOptions = {},
  store?: any // store can be passed to avoid circular dependencies
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // Get store dynamically if not passed
  let appStore = store;
  if (!appStore) {
    try {
      const { useAppStore } = await import('@/store/useAppStore');
      appStore = useAppStore;
    } catch (err) {
      console.error('Failed to import useAppStore:', err);
    }
  }

  const token = appStore?.getState()?.token;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  options.headers = {
    ...defaultHeaders,
    ...options.headers,
  };

  // Automatically stringify request body if it's an object and not a Blob/FormData
  if (options.body && typeof options.body !== 'string' && !(options.body instanceof FormData) && !(options.body instanceof Blob)) {
    options.body = JSON.stringify(options.body);
  }

  // Ensure credentials like cookies are sent for httpOnly cookie support (refresh token)
  options.credentials = 'include';

  try {
    const response = await fetch(url, options);
    
    // Handle Token Expired (401 Unauthorized)
    if (response.status === 401 && token) {
      if (!isRefreshing) {
        isRefreshing = true;
        
        try {
          // Request a new access token using the httpOnly refresh cookie
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            const newToken = refreshData.data.token;
            
            // Update token in Zustand store
            if (appStore) {
              appStore.getState().setToken(newToken);
            }

            onRefreshed(newToken);
            isRefreshing = false;

            // Retry original request with the new token
            if (options.headers) {
              (options.headers as any)['Authorization'] = `Bearer ${newToken}`;
            }
            return apiRequest(endpoint, options, appStore);
          } else {
            // Refresh failed (e.g. refresh token expired or invalid)
            isRefreshing = false;
            if (appStore) {
              appStore.getState().logout();
            }
            throw new Error('Session expired. Please log in again.');
          }
        } catch (refreshErr: any) {
          isRefreshing = false;
          if (appStore) {
            appStore.getState().logout();
          }
          return {
            success: false,
            data: null as any,
            message: refreshErr.message || 'Session expired',
            error: 'Session expired'
          };
        }
      }

      // If already refreshing, wait for the new token and retry
      return new Promise((resolve) => {
        subscribeTokenRefresh((newToken) => {
          if (options.headers) {
            (options.headers as any)['Authorization'] = `Bearer ${newToken}`;
          }
          resolve(apiRequest(endpoint, options, appStore));
        });
      });
    }

    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (err) {
      return {
        success: false,
        data: null as any,
        message: 'Invalid server response',
        error: text || 'Server returned invalid format'
      };
    }

    if (!response.ok) {
      return {
        success: false,
        data: json.data || null,
        message: json.message || 'Request failed',
        error: json.error || 'Request failed'
      };
    }

    return json;
  } catch (err: any) {
    return {
      success: false,
      data: null as any,
      message: err.message || 'Network error occurred',
      error: 'Network error'
    };
  }
}
