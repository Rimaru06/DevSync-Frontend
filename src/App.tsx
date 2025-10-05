import { useState } from "react";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./hooks/useAuth";
import LoginSignup from "./components/LoginSignup";
import Dashboard from "./components/Dashboard";
import RoomComponent from "./components/RoomComponent";
import AuthCallback from "./components/AuthCallback";
import ErrorPage from "./components/ErrorPage";

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<"dashboard" | "room">(
    "dashboard"
  );
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  // Check if we're on specific routes
  const currentPath = window.location.pathname;
  const urlParams = new URLSearchParams(window.location.search);
  const hasError = urlParams.has("error");

  // Show error page if there's an error parameter
  if (hasError) {
    return <ErrorPage />;
  }

  // Check if we're on the auth callback route
  if (currentPath === "/auth/callback") {
    return <AuthCallback />;
  }

  // Check for room route pattern /room/:roomId
  const roomMatch = currentPath.match(/^\/room\/(.+)$/);
  if (roomMatch && isAuthenticated) {
    const roomId = roomMatch[1];
    return (
      <RoomComponent
        roomId={roomId}
        onBackToDashboard={() => {
          setCurrentView("dashboard");
          setCurrentRoomId(null);
          window.history.pushState({}, "", "/");
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Handle navigation functions
  const navigateToRoom = (roomId: string) => {
    setCurrentRoomId(roomId);
    setCurrentView("room");
    window.history.pushState({}, "", `/room/${roomId}`);
  };

  const navigateToDashboard = () => {
    setCurrentView("dashboard");
    setCurrentRoomId(null);
    window.history.pushState({}, "", "/");
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-background-light dark:bg-background-dark text-gray-800 dark:text-gray-200">
        <LoginSignup />
      </div>
    );
  }

  // Main authenticated app
  if (currentView === "room" && currentRoomId) {
    return (
      <RoomComponent
        roomId={currentRoomId}
        onBackToDashboard={navigateToDashboard}
      />
    );
  }

  return (
    <div className="bg-background-light dark:bg-background-dark text-gray-800 dark:text-gray-200">
      <Dashboard onNavigateToRoom={navigateToRoom} />
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
