import { useEffect } from "react";

const AuthCallback = () => {
  useEffect(() => {
    const handleCallback = () => {
      console.log("Processing OAuth callback...");

      // Get token from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token");

      if (token) {
        console.log("Token found, storing...");
        // Store token
        localStorage.setItem("accessToken", token);
        console.log("Token stored, redirecting to home...");
      } else {
        console.error("No token found in callback");
      }

      // Always redirect to home - let AuthContext handle the rest
      window.location.replace("/");
    };

    // Small delay to ensure component is mounted
    const timer = setTimeout(handleCallback, 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background-color">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)] mx-auto mb-4"></div>
        <p className="text-secondary-foreground-color">Processing login...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
