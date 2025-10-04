import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

const LoginSignup = () => {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const { login, register, isLoading } = useAuth();

  // Form states
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const [signupForm, setSignupForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const showTab = (tabName: "login" | "signup") => {
    setActiveTab(tabName);
    setError("");
    setSuccess("");
  };

  // Handle login form submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await login(loginForm.email, loginForm.password);
      setSuccess("Login successful! Redirecting...");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  // Handle signup form submission
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await register(
        signupForm.username,
        signupForm.email,
        signupForm.password
      );
      setSuccess("Registration successful! Welcome to DevSync!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  // Handle OAuth login
  const handleOAuthLogin = (provider: "google" | "github") => {
    const API_BASE_URL = "http://localhost:3000/api/v1";
    const url = `${API_BASE_URL}/auth/${provider}`;
    console.log(`🚀 Initiating ${provider} OAuth to:`, url);

    // Direct redirect without timeout
    window.location.href = url;
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="w-full">
        <div className="container mx-auto flex items-center justify-between py-4 px-6">
          <a className="flex items-center gap-2 text-xl font-bold" href="#">
            <img
              className="w-8 h-8 rounded-2xl"
              src="/devSync.png"
              alt="DevSync Logo"
            />
            <span>DevSync</span>
          </a>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center">
        <div className="w-full max-w-md p-8 space-y-8 bg-card-color rounded-lg shadow-md">
          <div className="flex border-b border-border-color">
            <button
              className={`flex-1 py-3 text-center text-lg font-medium text-secondary-foreground-color ${
                activeTab === "login" ? "tab-active" : ""
              }`}
              onClick={() => showTab("login")}
            >
              Login
            </button>
            <button
              className={`flex-1 py-3 text-center text-lg font-medium text-secondary-foreground-color ${
                activeTab === "signup" ? "tab-active" : ""
              }`}
              onClick={() => showTab("signup")}
            >
              Sign Up
            </button>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {/* Login Form */}
          {activeTab === "login" && (
            <div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground-color">
                Welcome back
              </h2>
              <form onSubmit={handleLogin} className="mt-8 space-y-6">
                <div className="rounded-md shadow-sm -space-y-px">
                  <div>
                    <label className="sr-only" htmlFor="login-email-address">
                      Email address
                    </label>
                    <input
                      autoComplete="email"
                      className="appearance-none rounded-none relative block w-full px-3 py-4 border border-border-color placeholder-secondary-foreground-color text-foreground-color rounded-t-md focus:outline-none focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] focus:z-10 sm:text-sm"
                      id="login-email-address"
                      name="email"
                      placeholder="Email address"
                      required
                      type="email"
                      value={loginForm.email}
                      onChange={(e) =>
                        setLoginForm({ ...loginForm, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="sr-only" htmlFor="login-password">
                      Password
                    </label>
                    <input
                      autoComplete="current-password"
                      className="appearance-none rounded-none relative block w-full px-3 py-4 border border-border-color placeholder-secondary-foreground-color text-foreground-color rounded-b-md focus:outline-none focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] focus:z-10 sm:text-sm"
                      id="login-password"
                      name="password"
                      placeholder="Password"
                      required
                      type="password"
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm({ ...loginForm, password: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      className="h-4 w-4 text-[var(--primary-color)] focus:ring-[var(--primary-color)] border-border-color rounded"
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={loginForm.rememberMe}
                      onChange={(e) =>
                        setLoginForm({
                          ...loginForm,
                          rememberMe: e.target.checked,
                        })
                      }
                    />
                    <label
                      className="ml-2 block text-sm text-secondary-foreground-color"
                      htmlFor="remember-me"
                    >
                      Remember me
                    </label>
                  </div>
                  <div className="text-sm">
                    <a
                      className="font-medium text-[var(--primary-color)] hover:text-opacity-80"
                      href="#"
                    >
                      Forgot your password?
                    </a>
                  </div>
                </div>
                <div>
                  <button
                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[var(--primary-color)] hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-color)] disabled:opacity-50 disabled:cursor-not-allowed"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign in"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Signup Form */}
          {activeTab === "signup" && (
            <div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground-color">
                Create an account
              </h2>
              <form onSubmit={handleSignup} className="mt-8 space-y-6">
                <div className="rounded-md shadow-sm -space-y-px">
                  <div>
                    <label className="sr-only" htmlFor="username">
                      Username
                    </label>
                    <input
                      className="appearance-none rounded-none relative block w-full px-3 py-4 border border-border-color placeholder-secondary-foreground-color text-foreground-color rounded-t-md focus:outline-none focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] focus:z-10 sm:text-sm"
                      id="username"
                      name="username"
                      placeholder="Username"
                      required
                      type="text"
                      value={signupForm.username}
                      onChange={(e) =>
                        setSignupForm({
                          ...signupForm,
                          username: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="sr-only" htmlFor="signup-email-address">
                      Email address
                    </label>
                    <input
                      autoComplete="email"
                      className="appearance-none rounded-none relative block w-full px-3 py-4 border border-border-color placeholder-secondary-foreground-color text-foreground-color focus:outline-none focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] focus:z-10 sm:text-sm"
                      id="signup-email-address"
                      name="email"
                      placeholder="Email address"
                      required
                      type="email"
                      value={signupForm.email}
                      onChange={(e) =>
                        setSignupForm({ ...signupForm, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="sr-only" htmlFor="signup-password">
                      Password
                    </label>
                    <input
                      autoComplete="new-password"
                      className="appearance-none rounded-none relative block w-full px-3 py-4 border border-border-color placeholder-secondary-foreground-color text-foreground-color rounded-b-md focus:outline-none focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] focus:z-10 sm:text-sm"
                      id="signup-password"
                      name="password"
                      placeholder="Password (min. 6 characters)"
                      required
                      type="password"
                      minLength={6}
                      value={signupForm.password}
                      onChange={(e) =>
                        setSignupForm({
                          ...signupForm,
                          password: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <button
                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[var(--primary-color)] hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-color)] disabled:opacity-50 disabled:cursor-not-allowed"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Sign Up"}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-color"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card-color text-secondary-foreground-color">
                Or continue with
              </span>
            </div>
          </div>

          <div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <button
                  type="button"
                  className="w-full inline-flex justify-center py-3 px-4 border border-border-color rounded-md shadow-sm bg-background-color text-sm font-medium text-secondary-foreground-color hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                  onClick={() => handleOAuthLogin("google")}
                >
                  <span className="sr-only">Sign in with Google</span>
                  <svg
                    aria-hidden="true"
                    className="w-5 h-5"
                    height="24"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M21.54 10.91c0-.75-.07-1.48-.19-2.19H12v4.15h5.34c-.23 1.36-.94 2.52-2.06 3.3v2.69h3.46c2.02-1.86 3.18-4.59 3.18-7.95z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 22c3.24 0 5.95-1.08 7.93-2.92l-3.46-2.69c-1.08.72-2.45 1.16-4.47 1.16-3.44 0-6.35-2.32-7.38-5.45H1.07v2.78C3.06 19.53 7.15 22 12 22z"
                      fill="#34A853"
                    />
                    <path
                      d="M4.62 13.54c-.2-.6-.31-1.24-.31-1.9s.11-1.3.31-1.9V7.07H1.07C.38 8.44 0 10.15 0 12s.38 3.56 1.07 4.93l3.55-2.39z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 6.45c1.77 0 3.35.61 4.6 1.8l3.07-3.07C17.95 2.92 15.24 1.5 12 1.5 7.15 1.5 3.06 4.47 1.07 8.14l3.55 2.78c1.03-3.13 3.94-5.47 7.38-5.47z"
                      fill="#EA4335"
                    />
                  </svg>
                </button>
              </div>
              <div>
                <button
                  type="button"
                  className="w-full inline-flex justify-center py-3 px-4 border border-border-color rounded-md shadow-sm bg-background-color text-sm font-medium text-secondary-foreground-color hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                  onClick={() => handleOAuthLogin("github")}
                >
                  <span className="sr-only">Sign in with GitHub</span>
                  <svg
                    aria-hidden="true"
                    className="w-5 h-5 text-gray-800"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      clipRule="evenodd"
                      d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.165 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.378.203 2.398.1 2.651.64.7 1.03 1.595 1.03 2.688 0 3.848-2.338 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.577.688.482A10.001 10.001 0 0022 12c0-5.523-4.477-10-10-10z"
                      fillRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginSignup;
