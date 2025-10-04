// Authentication context for managing user state across the app
import React, { createContext, useEffect, useState } from "react";

// Types
interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  provider: "EMAIL" | "GOOGLE" | "GITHUB";
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API base URL - adjust this to your backend URL
const API_BASE_URL = "http://localhost:3000/api/v1";

// Auth Provider Component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get access token from localStorage
  const getAccessToken = () => localStorage.getItem("accessToken");

  // Set access token in localStorage
  const setAccessToken = (token: string) =>
    localStorage.setItem("accessToken", token);

  // Remove access token from localStorage
  const removeAccessToken = () => localStorage.removeItem("accessToken");

  // API call helper with automatic token handling
  const apiCall = async (url: string, options: RequestInit = {}) => {
    const token = getAccessToken();

    const config: RequestInit = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      credentials: "include", // Include cookies for refresh tokens
    };

    const response = await fetch(`${API_BASE_URL}${url}`, config);

    if (!response.ok) {
      if (response.status === 401) {
        // Try to refresh token
        try {
          await refreshToken();
          // Retry original request with new token
          const newToken = getAccessToken();
          const retryConfig = {
            ...config,
            headers: {
              ...config.headers,
              ...(newToken && { Authorization: `Bearer ${newToken}` }),
            },
          };
          const retryResponse = await fetch(
            `${API_BASE_URL}${url}`,
            retryConfig
          );
          if (!retryResponse.ok) {
            throw new Error("Request failed after token refresh");
          }
          return retryResponse.json();
        } catch {
          // Refresh failed, logout user
          await logout();
          throw new Error("Authentication failed");
        }
      }
      const error = await response.json();
      throw new Error(error.message || "Request failed");
    }

    return response.json();
  };

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }

      const data = await response.json();

      // Store access token
      setAccessToken(data.data.accessToken);

      // Get user info
      await getCurrentUser();
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  // Register function
  const register = async (
    username: string,
    email: string,
    password: string
  ) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }

      // After successful registration, automatically log in
      await login(email, password);
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    try {
      // Call backend logout endpoint to clear httpOnly cookies
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear all local authentication data
      removeAccessToken();
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user"); // Clear any cached user data
      setUser(null);
      setIsLoading(false);

      // Force clear any session storage
      sessionStorage.clear();

      // Force a page reload to ensure complete cleanup
      window.location.href = "/";
    }
  };

  // Refresh access token
  const refreshToken = async () => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Token refresh failed");
    }

    const data = await response.json();
    setAccessToken(data.data.accessToken);
    return data.data.accessToken;
  };

  // Get current user
  const getCurrentUser = async () => {
    try {
      const data = await apiCall("/auth/me");
      setUser({
        id: data.data.userId,
        username: data.data.username || "Unknown",
        email: data.data.email,
        avatar: data.data.avatar,
        provider: data.data.provider || "EMAIL",
      });
    } catch (error) {
      console.error("Get current user error:", error);
      removeAccessToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Check authentication on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAccessToken();
      console.log("AuthContext: Checking auth, token exists:", !!token);
      if (token) {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          });

          if (response.ok) {
            const data = await response.json();
            console.log(
              "AuthContext: User data loaded successfully:",
              data.data.userId
            );
            setUser({
              id: data.data.userId,
              username: data.data.username || "Unknown",
              email: data.data.email,
              avatar: data.data.avatar,
              provider: data.data.provider || "EMAIL",
            });
          } else {
            console.log("AuthContext: Token validation failed, clearing token");
            removeAccessToken();
            setUser(null);
          }
        } catch (error) {
          console.error("Get current user error:", error);
          removeAccessToken();
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
