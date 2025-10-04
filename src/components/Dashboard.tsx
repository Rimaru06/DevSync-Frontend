import { useAuth } from "../hooks/useAuth";

const Dashboard = () => {
  const { user, logout, isLoading } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // This will be handled by the auth flow
  }

  return (
    <div className="min-h-screen bg-background-color">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <img
                className="w-8 h-8 rounded-2xl"
                src="/devSync.png"
                alt="DevSync Logo"
              />
              <span className="ml-2 text-xl font-bold">DevSync</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {user.avatar && (
                  <img
                    className="h-8 w-8 rounded-full"
                    src={user.avatar}
                    alt={user.username}
                  />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {user.username}
                </span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {user.provider}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome to DevSync, {user.username}! 🎉
              </h1>
              <p className="text-lg text-gray-600 mb-4">
                Your authentication is working perfectly!
              </p>
              <div className="bg-gray-50 p-4 rounded-lg max-w-md mx-auto">
                <h2 className="text-lg font-semibold mb-2">Your Profile:</h2>
                <div className="text-left space-y-1">
                  <p>
                    <strong>ID:</strong> {user.id}
                  </p>
                  <p>
                    <strong>Username:</strong> {user.username}
                  </p>
                  <p>
                    <strong>Email:</strong> {user.email}
                  </p>
                  <p>
                    <strong>Provider:</strong> {user.provider}
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <p className="text-gray-500">
                  This is where your main application would go!
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
