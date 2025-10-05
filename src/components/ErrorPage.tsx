import { useEffect, useState } from "react";

interface ErrorPageProps {
  error?: string;
  onRetry?: () => void;
}

const ErrorPage: React.FC<ErrorPageProps> = ({ error, onRetry }) => {
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    // Get error from URL parameters if not provided as prop
    if (!error) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlError = urlParams.get("error");
      if (urlError) {
        setErrorMessage(decodeURIComponent(urlError));
      }
    } else {
      setErrorMessage(error);
    }
  }, [error]);

  const getErrorTitle = (errorMsg: string) => {
    if (errorMsg.includes("Invalid or expired token")) {
      return "Authentication Error";
    }
    if (errorMsg.includes("User already registered")) {
      return "Account Already Exists";
    }
    if (errorMsg.includes("oauth_failed")) {
      return "OAuth Login Failed";
    }
    return "Something Went Wrong";
  };

  const getErrorDescription = (errorMsg: string) => {
    if (errorMsg.includes("Invalid or expired token")) {
      return "Your session has expired. Please log in again.";
    }
    if (errorMsg.includes("User already registered")) {
      return "An account with this email already exists. Please try logging in instead.";
    }
    if (errorMsg.includes("oauth_failed")) {
      return "There was a problem connecting with the OAuth provider. Please try again.";
    }
    return "An unexpected error occurred. Please try again or contact support if the problem persists.";
  };

  const handleGoHome = () => {
    // Clear any error parameters from URL
    window.history.replaceState({}, document.title, "/");
    window.location.href = "/";
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      handleGoHome();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-color">
      {/* Header */}
      <header className="w-full">
        <div className="container mx-auto flex items-center justify-between py-4 px-6">
          <a className="flex items-center gap-2 text-xl font-bold" href="/">
            <img
              className="w-8 h-8 rounded-2xl"
              src="/devSync.png"
              alt="DevSync Logo"
            />
            <span>DevSync</span>
          </a>
        </div>
      </header>

      {/* Error Content */}
      <main className="flex-grow flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          {/* Error Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
          </div>

          {/* Error Title */}
          <h1 className="text-2xl font-bold text-foreground-color mb-4">
            {getErrorTitle(errorMessage)}
          </h1>

          {/* Error Description */}
          <p className="text-secondary-foreground-color mb-6">
            {getErrorDescription(errorMessage)}
          </p>

          {/* Error Details (for debugging) */}
          {errorMessage && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800 font-mono break-words">
                {errorMessage}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/90 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleGoHome}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ErrorPage;
