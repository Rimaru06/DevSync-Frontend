import { useAuth } from "../hooks/useAuth";
import { useRooms } from "../hooks/useRooms";
import { useState } from "react";

interface DashboardProps {
  onNavigateToRoom?: (roomId: string) => void;
}

const Dashboard = ({ onNavigateToRoom }: DashboardProps) => {
  const { user, logout, isLoading } = useAuth();
  const {
    rooms,
    loading: roomsLoading,
    error: roomsError,
    createRoom,
    joinRoom,
  } = useRooms();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleCreateRoom = () => {
    setShowCreateModal(true);
  };

  const handleJoinRoomModal = () => {
    setShowJoinModal(true);
  };

  const handleSubmitRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    const success = await createRoom({
      name: roomName.trim(),
      description: roomDescription.trim() || undefined,
      isPrivate,
      maxMembers: 10,
    });

    if (success) {
      setShowCreateModal(false);
      setRoomName("");
      setRoomDescription("");
      setIsPrivate(false);
    }
  };

  const handleSubmitJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomCode.trim()) return;

    const success = await joinRoom(joinRoomCode.trim());
    if (success) {
      setShowJoinModal(false);
      setJoinRoomCode("");
      setJoinSuccess(`Successfully joined "${success.roomName}"! 🎉`);

      // Navigate to the room after successful join
      setTimeout(() => {
        setJoinSuccess(null);
        handleEnterRoom(success.roomId);
      }, 1500); // Show success message briefly before navigating
    }
  };

  const handleEnterRoom = (roomId: string) => {
    console.log(`Entering room: ${roomId}`);
    if (onNavigateToRoom) {
      onNavigateToRoom(roomId);
    } else {
      // Fallback navigation using window location
      window.location.href = `/room/${roomId}`;
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#f8f9fa",
        }}
      >
        <div style={{ fontSize: "18px" }}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // This will be handled by the auth flow
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-50/50 dark:bg-gray-800/50 p-6 flex flex-col justify-between border-r border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold mb-10 text-gray-900 dark:text-white">
            DevSync
          </h1>
          <nav className="flex flex-col gap-2">
            <a
              className="flex items-center gap-3 px-4 py-2 rounded-lg bg-primary text-white no-underline"
              href="#"
            >
              <span>📊</span>
              <span>Dashboard</span>
            </a>
            <a
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 no-underline transition-colors"
              href="#"
            >
              <span>🏠</span>
              <span>My Rooms</span>
            </a>
            <a
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 no-underline transition-colors"
              href="#"
            >
              <span>⚙️</span>
              <span>Settings</span>
            </a>
          </nav>
        </div>

        {/* User info and logout */}
        <div className="flex flex-col gap-4">
          {/* User Profile Section */}
          <div className="p-3 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              {user.avatar && (
                <img
                  style={{ height: "32px", width: "32px", borderRadius: "50%" }}
                  src={user.avatar}
                  alt={user.username}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate m-0">
                  {user.username}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate m-0">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-red-600 dark:text-red-400 bg-transparent border-none cursor-pointer w-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white m-0">
            Dashboard
          </h2>
          <div className="flex gap-3">
            <button
              onClick={handleJoinRoomModal}
              className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold border-none cursor-pointer transition-colors"
            >
              <span>🚪</span>
              <span>Join Room</span>
            </button>
            <button
              onClick={handleCreateRoom}
              className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold border-none cursor-pointer transition-colors"
            >
              <span>➕</span>
              <span>Create New Room</span>
            </button>
          </div>
        </div>

        {/* Error Display */}
        {roomsError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
            {roomsError}
          </div>
        )}

        {/* Success Display */}
        {joinSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg mb-6">
            {joinSuccess}
          </div>
        )}

        {/* Rooms Section */}
        {roomsLoading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div style={{ fontSize: "18px", color: "#6b7280" }}>
              Loading rooms...
            </div>
          </div>
        ) : rooms.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              border: "1px solid rgba(229, 231, 235, 1)",
            }}
          >
            <h3
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                color: "#111827",
                marginBottom: "16px",
                margin: "0 0 16px 0",
              }}
            >
              Welcome to DevSync, {user.username}! 🎉
            </h3>
            <p
              style={{
                fontSize: "18px",
                color: "#6b7280",
                marginBottom: "24px",
                margin: "0 0 24px 0",
              }}
            >
              Ready to start collaborating? Create your first room to begin
              coding together!
            </p>
            <button
              onClick={handleCreateRoom}
              style={{
                backgroundColor: "#137fec",
                color: "white",
                padding: "12px 24px",
                borderRadius: "8px",
                border: "none",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Create Your First Room
            </button>
          </div>
        ) : (
          <div>
            <h3
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                color: "#111827",
                marginBottom: "16px",
              }}
            >
              Your Rooms ({rooms.length})
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "20px",
              }}
            >
              {rooms.map((room) => (
                <div
                  key={room.id}
                  style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    padding: "20px",
                    border: "1px solid rgba(229, 231, 235, 1)",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                    transition: "transform 0.2s, box-shadow 0.2s",
                  }}
                >
                  <div style={{ marginBottom: "16px" }}>
                    <h4
                      style={{
                        fontSize: "18px",
                        fontWeight: "bold",
                        color: "#111827",
                        margin: "0 0 8px 0",
                      }}
                    >
                      {room.name}
                    </h4>
                    {room.description && (
                      <p
                        style={{
                          fontSize: "14px",
                          color: "#6b7280",
                          margin: "0 0 8px 0",
                        }}
                      >
                        {room.description}
                      </p>
                    )}
                    <p
                      style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}
                    >
                      Created by {room.owner.username} • {room.memberCount}{" "}
                      member{room.memberCount !== 1 ? "s" : ""}
                    </p>
                    {room.ownerId === user.id && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#137fec",
                          margin: "8px 0 0 0",
                          padding: "6px 8px",
                          backgroundColor: "#f0f9ff",
                          borderRadius: "4px",
                          border: "1px solid #bfdbfe",
                        }}
                      >
                        <strong>Invite Code:</strong>{" "}
                        <code
                          style={{ fontFamily: "monospace", fontSize: "12px" }}
                        >
                          {room.inviteCode}
                        </code>
                        <button
                          onClick={() =>
                            navigator.clipboard.writeText(room.inviteCode)
                          }
                          style={{
                            marginLeft: "8px",
                            padding: "2px 6px",
                            fontSize: "10px",
                            backgroundColor: "#137fec",
                            color: "white",
                            border: "none",
                            borderRadius: "3px",
                            cursor: "pointer",
                          }}
                          title="Copy to clipboard"
                        >
                          Copy
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Invite Code Section for Admins */}
                  {room.userRole === "ADMIN" && (
                    <div
                      style={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        padding: "8px",
                        marginBottom: "12px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#64748b",
                          marginBottom: "4px",
                        }}
                      >
                        Invite Code:
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <code
                          style={{
                            backgroundColor: "#f1f5f9",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontFamily: "monospace",
                            flex: 1,
                          }}
                        >
                          {room.inviteCode}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(room.inviteCode);
                            setJoinSuccess(
                              "Invite code copied to clipboard! 📋"
                            );
                            setTimeout(() => setJoinSuccess(null), 2000);
                          }}
                          style={{
                            backgroundColor: "#6b7280",
                            color: "white",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            border: "none",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          padding: "4px 8px",
                          borderRadius: "12px",
                          backgroundColor: room.isPrivate
                            ? "#fef3c7"
                            : "#d1fae5",
                          color: room.isPrivate ? "#92400e" : "#065f46",
                        }}
                      >
                        {room.isPrivate ? "🔒 Private" : "🌐 Public"}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          padding: "4px 8px",
                          borderRadius: "12px",
                          backgroundColor: "#dbeafe",
                          color: "#1d4ed8",
                        }}
                      >
                        {room.userRole}
                      </span>
                    </div>

                    <button
                      onClick={() => handleEnterRoom(room.id)}
                      style={{
                        backgroundColor: "#137fec",
                        color: "white",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        border: "none",
                        fontSize: "14px",
                        fontWeight: "500",
                        cursor: "pointer",
                      }}
                    >
                      Enter Room
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Room Modal */}
        {showCreateModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "24px",
                width: "100%",
                maxWidth: "500px",
                margin: "20px",
              }}
            >
              <h3
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#111827",
                  marginBottom: "20px",
                  margin: "0 0 20px 0",
                }}
              >
                Create New Room
              </h3>

              <form onSubmit={handleSubmitRoom}>
                <div style={{ marginBottom: "16px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    Room Name *
                  </label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    required
                    placeholder="Enter room name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    Description
                  </label>
                  <textarea
                    value={roomDescription}
                    onChange={(e) => setRoomDescription(e.target.value)}
                    placeholder="Enter room description (optional)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-vertical"
                  />
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                    />
                    Make this room private
                  </label>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    style={{
                      padding: "8px 16px",
                      border: "1px solid rgba(229, 231, 235, 1)",
                      borderRadius: "6px",
                      backgroundColor: "white",
                      color: "#374151",
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: "8px 16px",
                      border: "none",
                      borderRadius: "6px",
                      backgroundColor: "#137fec",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                    }}
                  >
                    Create Room
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Join Room Modal */}
        {showJoinModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "24px",
                width: "100%",
                maxWidth: "450px",
                margin: "20px",
              }}
            >
              <h3
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#111827",
                  marginBottom: "20px",
                  margin: "0 0 20px 0",
                }}
              >
                Join Room
              </h3>

              <form onSubmit={handleSubmitJoinRoom}>
                <div style={{ marginBottom: "16px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    Room ID or Invite Code *
                  </label>
                  <input
                    type="text"
                    value={joinRoomCode}
                    onChange={(e) => setJoinRoomCode(e.target.value)}
                    required
                    placeholder="Enter room ID or invite code"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div
                  style={{
                    backgroundColor: "#f0f9ff",
                    padding: "12px",
                    borderRadius: "6px",
                    border: "1px solid #bfdbfe",
                    marginBottom: "20px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#1e40af",
                      margin: 0,
                    }}
                  >
                    💡 <strong>Tip:</strong> You can join using either the room
                    ID or the invite code shared by the room owner.
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    style={{
                      padding: "8px 16px",
                      border: "1px solid rgba(229, 231, 235, 1)",
                      borderRadius: "6px",
                      backgroundColor: "white",
                      color: "#374151",
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: "8px 16px",
                      border: "none",
                      borderRadius: "6px",
                      backgroundColor: "#137fec",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                    }}
                  >
                    Join Room
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
