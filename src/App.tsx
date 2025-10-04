import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./hooks/useAuth";
import LoginSignup from "./components/LoginSignup";
import Dashboard from "./components/Dashboard";
import AuthCallback from "./components/AuthCallback";

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  // Check if we're on the auth callback route
  const isAuthCallback = window.location.pathname === "/auth/callback";

  if (isAuthCallback) {
    return <AuthCallback />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-color">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)] mx-auto mb-4"></div>
          <p className="text-secondary-foreground-color">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-color text-foreground-color">
      {isAuthenticated ? <Dashboard /> : <LoginSignup />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
