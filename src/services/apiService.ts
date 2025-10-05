// Shared API service with automatic token refresh
class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  }

  // Get access token from localStorage
  private getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  // Set access token in localStorage
  private setAccessToken(token: string): void {
    localStorage.setItem('accessToken', token);
  }

  // Remove access token from localStorage
  private removeAccessToken(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // Refresh access token
  private async refreshToken(): Promise<string> {
    const response = await fetch(`${this.baseURL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    this.setAccessToken(data.data.accessToken);
    return data.data.accessToken;
  }

  // Make authenticated API request with automatic token refresh
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAccessToken();

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      credentials: 'include',
    };

    let response = await fetch(`${this.baseURL}/api/v1${endpoint}`, config);

    // If 401 (Unauthorized), try to refresh token
    if (response.status === 401) {
      try {
        console.log('🔄 Access token expired, attempting to refresh...');
        const newToken = await this.refreshToken();
        
        // Retry original request with new token
        const retryConfig = {
          ...config,
          headers: {
            ...config.headers,
            Authorization: `Bearer ${newToken}`,
          },
        };
        
        response = await fetch(`${this.baseURL}/api/v1${endpoint}`, retryConfig);
        
        if (!response.ok) {
          throw new Error('Request failed after token refresh');
        }
        
        console.log('✅ Token refreshed successfully');
      } catch (error) {
        console.error('❌ Token refresh failed:', error);
        // Refresh failed, clear tokens and redirect to login
        this.removeAccessToken();
        
        // Redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
        
        throw new Error('Authentication failed. Please log in again.');
      }
    } else if (!response.ok) {
      // Handle other HTTP errors
      const error = await response.json().catch(() => ({ 
        message: `Request failed with status ${response.status}` 
      }));
      throw new Error(error.message || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  // Convenience methods
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: Record<string, unknown>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: Record<string, unknown>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;