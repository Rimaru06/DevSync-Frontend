import { useEffect, useState, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useChat } from "../hooks/useChat";
import { useCodeEditor } from "../hooks/useCodeEditor";
import { useCodeExecution } from "../hooks/useCodeExecution";
import { useRooms } from "../hooks/useRooms";
import {
  roomService,
  type Room,
  type RoomMember,
} from "../services/roomService";
import {
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "../services/codeEditorService";
import { Socket } from "socket.io-client";
import Editor from "@monaco-editor/react";

interface RoomComponentProps {
  roomId: string;
  onBackToDashboard?: () => void;
}

const RoomComponent = ({ roomId, onBackToDashboard }: RoomComponentProps) => {
  const { user } = useAuth();
  const { deleteRoom } = useRooms();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showCreateFileModal, setShowCreateFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [selectedLanguageForNewFile, setSelectedLanguageForNewFile] =
    useState<SupportedLanguage>(SUPPORTED_LANGUAGES[0]);

  // Chat functionality
  const {
    messages,
    typing,
    sendMessage,
    setTyping: setChatTyping,
  } = useChat({
    roomId,
    socket,
    userId: user?.id || "",
  });

  // Code editor functionality
  const {
    files,
    currentFile,
    loading: editorLoading,
    error: editorError,
    editorContent,
    selectedLanguage,
    theme,
    createFile,
    selectFile,
    deleteFile,
    setEditorContent,
    setSelectedLanguage,
    setTheme,
  } = useCodeEditor({
    roomId,
    socket,
    userId: user?.id || "",
  });

  // Code execution functionality
  const {
    executing,
    lastResult,
    error: executionError,
    executeCode,
    clearResult,
    clearError: clearExecutionError,
  } = useCodeExecution();

  const chatEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchRoomDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await roomService.getRoomDetails(roomId);
        setRoom(response.data);
        setMembers(response.data.members);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load room";
        setError(errorMessage);
        console.error("Error fetching room details:", err);
      } finally {
        setLoading(false);
      }
    };

    if (roomId) {
      fetchRoomDetails();
    }
  }, [roomId]);

  // Set up Socket.IO listeners
  useEffect(() => {
    if (user && room) {
      const token = localStorage.getItem("accessToken");
      if (token) {
        const socketInstance = roomService.initializeSocket(token);
        setSocket(socketInstance);

        // Join the room
        socketInstance.emit("join-room", { roomId });

        // Listen for member updates
        roomService.onMemberJoined((data) => {
          if (data.roomId === roomId) {
            setMembers((prev) => [...prev, data.member]);
          }
        });

        roomService.onMemberLeft((data) => {
          if (data.roomId === roomId) {
            setMembers((prev) =>
              prev.filter((member) => member.userId !== data.userId)
            );
          }
        });

        return () => {
          socketInstance.emit("leave-room", { roomId });
          roomService.removeAllListeners();
          socketInstance.disconnect();
          setSocket(null);
        };
      }
    }
  }, [user, room, roomId]);

  const isRoomOwner = user?.id === room?.ownerId;

  const handleLeaveOrDeleteRoom = async () => {
    if (
      !window.confirm(
        isRoomOwner
          ? "Are you sure you want to delete this room? This action cannot be undone."
          : "Are you sure you want to leave this room?"
      )
    ) {
      return;
    }

    try {
      if (isRoomOwner) {
        const success = await deleteRoom(roomId);
        if (!success) {
          setError("Failed to delete room");
          return;
        }
      } else {
        await roomService.leaveRoom(roomId);
      }

      if (onBackToDashboard) {
        onBackToDashboard();
      } else {
        // Fallback navigation
        window.location.href = "/";
      }
    } catch (err) {
      console.error("Error:", err);
      setError(isRoomOwner ? "Failed to delete room" : "Failed to leave room");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const success = await sendMessage(chatMessage);
    if (success) {
      setChatMessage("");
      setIsTyping(false);
      setChatTyping(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setChatMessage(value);

    // Handle typing indicator
    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      setChatTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = window.setTimeout(() => {
      setIsTyping(false);
      setChatTyping(false);
    }, 1000);
  };

  // File management handlers
  const handleCreateFile = async () => {
    if (!newFileName.trim()) return;

    const success = await createFile(
      newFileName.trim(),
      selectedLanguageForNewFile
    );
    if (success) {
      setShowCreateFileModal(false);
      setNewFileName("");
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
  };

  const handleRunCode = async () => {
    if (!currentFile) return;

    const success = await executeCode(roomId, {
      code: editorContent,
      language: selectedLanguage.id,
      fileId: currentFile.id,
    });

    if (!success) {
      console.error("Failed to execute code");
    }
  };

  const getDefaultAvatar = (username: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      username
    )}&background=6c2bee&color=fff`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
        <div className="bg-white dark:bg-gray-800 p-10 rounded-lg shadow-lg text-center max-w-md">
          <h2 className="text-red-600 text-xl font-semibold mb-4">
            Room Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={handleLeaveOrDeleteRoom}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark font-display text-gray-800 dark:text-gray-200">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700/50 shadow-sm bg-background-light dark:bg-background-dark">
        <div className="flex items-center gap-3">
          <svg
            className="text-primary"
            fill="none"
            height="28"
            viewBox="0 0 48 48"
            width="28"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M13.8261 17.4264C16.7203 18.1174 20.2244 18.5217 24 18.5217C27.7756 18.5217 31.2797 18.1174 34.1739 17.4264C36.9144 16.7722 39.9967 15.2331 41.3563 14.1648L24.8486 40.6391C24.4571 41.267 23.5429 41.267 23.1514 40.6391L6.64374 14.1648C8.00331 15.2331 11.0856 16.7722 13.8261 17.4264Z"
              fill="currentColor"
            ></path>
            <path
              clipRule="evenodd"
              d="M39.998 12.236C39.9944 12.2537 39.9875 12.2845 39.9748 12.3294C39.9436 12.4399 39.8949 12.5741 39.8346 12.7175C39.8168 12.7597 39.7989 12.8007 39.7813 12.8398C38.5103 13.7113 35.9788 14.9393 33.7095 15.4811C30.9875 16.131 27.6413 16.5217 24 16.5217C20.3587 16.5217 17.0125 16.131 14.2905 15.4811C12.0012 14.9346 9.44505 13.6897 8.18538 12.8168C8.17384 12.7925 8.16216 12.767 8.15052 12.7408C8.09919 12.6249 8.05721 12.5114 8.02977 12.411C8.00356 12.3152 8.00039 12.2667 8.00004 12.2612C8.00004 12.261 8 12.2607 8.00004 12.2612C8.00004 12.2359 8.0104 11.9233 8.68485 11.3686C9.34546 10.8254 10.4222 10.2469 11.9291 9.72276C14.9242 8.68098 19.1919 8 24 8C28.8081 8 33.0758 8.68098 36.0709 9.72276C37.5778 10.2469 38.6545 10.8254 39.3151 11.3686C39.9006 11.8501 39.9857 12.1489 39.998 12.236ZM4.95178 15.2312L21.4543 41.6973C22.6288 43.5809 25.3712 43.5809 26.5457 41.6973L43.0534 15.223C43.0709 15.1948 43.0878 15.1662 43.104 15.1371L41.3563 14.1648C43.104 15.1371 43.1038 15.1374 43.104 15.1371L43.1051 15.135L43.1065 15.1325L43.1101 15.1261L43.1199 15.1082C43.1276 15.094 43.1377 15.0754 43.1497 15.0527C43.1738 15.0075 43.2062 14.9455 43.244 14.8701C43.319 14.7208 43.4196 14.511 43.5217 14.2683C43.6901 13.8679 44 13.0689 44 12.2609C44 10.5573 43.003 9.22254 41.8558 8.2791C40.6947 7.32428 39.1354 6.55361 37.385 5.94477C33.8654 4.72057 29.133 4 24 4C18.867 4 14.1346 4.72057 10.615 5.94478C8.86463 6.55361 7.30529 7.32428 6.14419 8.27911C4.99695 9.22255 3.99999 10.5573 3.99999 12.2609C3.99999 13.1275 4.29264 13.9078 4.49321 14.3607C4.60375 14.6102 4.71348 14.8196 4.79687 14.9689C4.83898 15.0444 4.87547 15.1065 4.9035 15.1529C4.91754 15.1762 4.92954 15.1957 4.93916 15.2111L4.94662 15.223L4.95178 15.2312ZM35.9868 18.996L24 38.22L12.0131 18.996C12.4661 19.1391 12.9179 19.2658 13.3617 19.3718C16.4281 20.1039 20.0901 20.5217 24 20.5217C27.9099 20.5217 31.5719 20.1039 34.6383 19.3718C35.082 19.2658 35.5339 19.1391 35.9868 18.996Z"
              fill="currentColor"
              fillRule="evenodd"
            ></path>
          </svg>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            DevSync
          </h1>
          <span className="inline-flex items-center gap-1.5 ml-4">
            <span
              className={`w-2 h-2 rounded-full ${
                socket?.connected ? "bg-green-500" : "bg-red-500"
              }`}
            ></span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {socket?.connected ? "Connected" : "Disconnected"}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {members.slice(0, 3).map((member) => (
              <img
                key={member.id}
                alt={`${member.user.username}'s avatar`}
                className="inline-block h-8 w-8 rounded-full ring-2 ring-background-light dark:ring-background-dark"
                src={
                  member.user.avatar || getDefaultAvatar(member.user.username)
                }
              />
            ))}
            {members.length > 3 && (
              <div className="h-8 w-8 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 ring-2 ring-background-light dark:ring-background-dark text-xs font-semibold text-gray-600 dark:text-gray-300">
                +{members.length - 3}
              </div>
            )}
          </div>
          <button
            onClick={handleLeaveOrDeleteRoom}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            {isRoomOwner ? "Delete Room" : "Leave Room"}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Code Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Editor Toolbar */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              {/* File Tabs */}
              <div className="flex items-center gap-1">
                {files.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => selectFile(file.id)}
                    className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors ${
                      currentFile?.id === file.id
                        ? "bg-primary text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    <span>{file.name}</span>
                    {files.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFile(file.id);
                        }}
                        className="hover:bg-black/10 rounded p-0.5 text-xs"
                      >
                        ×
                      </button>
                    )}
                  </button>
                ))}
                <button
                  onClick={() => setShowCreateFileModal(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-sm bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  New
                </button>
              </div>
            </div>

            {/* Editor Controls */}
            <div className="flex items-center gap-3">
              {/* Language Selector */}
              <select
                value={selectedLanguage.id}
                onChange={(e) => {
                  const lang = SUPPORTED_LANGUAGES.find(
                    (l) => l.id === e.target.value
                  );
                  if (lang) setSelectedLanguage(lang);
                }}
                className="px-2 py-1 text-sm bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.name}
                  </option>
                ))}
              </select>

              {/* Theme Selector */}
              <select
                value={theme}
                onChange={(e) => handleThemeChange(e.target.value)}
                className="px-2 py-1 text-sm bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300"
              >
                <option value="light">Light</option>
                <option value="vs-dark">Dark</option>
                <option value="hc-black">High Contrast</option>
              </select>

              {/* Run Button */}
              <button
                onClick={handleRunCode}
                disabled={!currentFile || executing}
                title={
                  currentFile
                    ? "Run Code (Ctrl+Enter)"
                    : "Select a file to run code"
                }
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-md ${
                  !currentFile || executing
                    ? "bg-gray-400 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed opacity-50"
                    : "bg-green-600 hover:bg-green-700 active:bg-green-800 text-white hover:shadow-lg transform hover:scale-105"
                }`}
              >
                {executing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span>Run Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 relative">
            {editorLoading ? (
              <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Loading editor...</p>
                </div>
              </div>
            ) : currentFile ? (
              <Editor
                height="100%"
                language={selectedLanguage.monacoLanguage}
                value={editorContent}
                onChange={(value) => setEditorContent(value || "")}
                onMount={(editor, monaco) => {
                  // Add keyboard shortcut for running code (Ctrl+Enter)
                  editor.addAction({
                    id: "run-code",
                    label: "Run Code",
                    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
                    contextMenuGroupId: "navigation",
                    contextMenuOrder: 1.5,
                    run: () => {
                      handleRunCode();
                    },
                  });
                }}
                theme={theme}
                options={{
                  fontSize: 14,
                  fontFamily:
                    "'Fira Code', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
                  fontLigatures: true,
                  lineNumbers: "on",
                  roundedSelection: true,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  minimap: { enabled: true },
                  suggestOnTriggerCharacters: true,
                  acceptSuggestionOnEnter: "on",
                  tabSize: 2,
                  insertSpaces: true,
                  wordWrap: "bounded",
                  wordWrapColumn: 120,
                  renderLineHighlight: "all",
                  selectionHighlight: true,
                  folding: true,
                  foldingStrategy: "auto",
                  showFoldingControls: "mouseover",
                  matchBrackets: "always",
                  autoIndent: "full",
                  formatOnPaste: true,
                  formatOnType: true,
                  dragAndDrop: true,
                  links: true,
                  contextmenu: true,
                  mouseWheelZoom: true,
                  multiCursorModifier: "ctrlCmd",
                  accessibilitySupport: "auto",
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900">
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    No file selected
                  </p>
                  <button
                    onClick={() => setShowCreateFileModal(true)}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Create your first file
                  </button>
                </div>
              </div>
            )}

            {editorError && (
              <div className="absolute top-2 right-2 bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">
                {editorError}
              </div>
            )}
          </div>
          {/* Output Panel */}
          {(lastResult || executionError) && (
            <div className="h-48 border-t border-gray-300 dark:border-gray-600 bg-gray-900 dark:bg-gray-900 flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-800 border-b border-gray-600 dark:border-gray-600">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 9l3 3-3 3m5 0h3"
                    />
                  </svg>
                  <h3 className="text-sm font-medium text-white">
                    Console Output
                  </h3>
                </div>
                <button
                  onClick={() => {
                    clearResult();
                    clearExecutionError();
                  }}
                  className="text-gray-400 hover:text-white text-sm px-2 py-1 rounded hover:bg-gray-700 transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="flex-1 p-4 overflow-auto bg-black text-gray-100 font-mono text-sm">
                {executionError ? (
                  <div className="text-red-400 whitespace-pre-wrap">
                    <span className="text-red-500">❌ Error:</span>{" "}
                    {executionError}
                  </div>
                ) : lastResult ? (
                  <div className="space-y-2">
                    {lastResult.error ? (
                      <div className="text-red-400 whitespace-pre-wrap">
                        <span className="text-red-500">❌ Runtime Error:</span>
                        <br />
                        {lastResult.error}
                      </div>
                    ) : (
                      <div>
                        <div className="text-green-400 whitespace-pre-wrap">
                          <span className="text-green-500">✅ Output:</span>
                          <br />
                          {lastResult.output || (
                            <span className="text-gray-400 italic">
                              No output
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="text-gray-500 text-xs border-t border-gray-700 pt-2 mt-2">
                      Executed in {lastResult.executionTime}ms
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Chat Sidebar */}
        <aside className="w-80 flex flex-col border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-lg">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Live Chat
              </h2>
              <div className="ml-auto flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {members.length} online
                </span>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 flex flex-col p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="space-y-3 flex-1 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <svg
                    className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No messages yet
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                    Start the conversation!
                  </p>
                </div>
              ) : (
                messages.map((message) => {
                  const isCurrentUser = message.userId === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex items-start gap-3 ${
                        isCurrentUser ? "justify-end" : ""
                      }`}
                    >
                      {!isCurrentUser && (
                        <img
                          alt={`${message.user.username}'s avatar`}
                          className="h-8 w-8 rounded-full flex-shrink-0"
                          src={
                            message.user.avatar ||
                            getDefaultAvatar(message.user.username)
                          }
                        />
                      )}
                      <div
                        className={`flex flex-col max-w-xs ${
                          isCurrentUser ? "items-end" : ""
                        }`}
                      >
                        <div
                          className={`flex items-center gap-2 mb-1 ${
                            isCurrentUser ? "flex-row-reverse" : ""
                          }`}
                        >
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            {message.user.username}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(message.timestamp).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                        <div
                          className={`px-3 py-2 rounded-xl text-sm shadow-sm ${
                            isCurrentUser
                              ? "bg-blue-600 text-white rounded-tr-md"
                              : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-md border border-gray-200 dark:border-gray-700"
                          }`}
                        >
                          {message.message}
                        </div>
                      </div>
                      {isCurrentUser && (
                        <img
                          alt={`${message.user.username}'s avatar`}
                          className="h-8 w-8 rounded-full flex-shrink-0"
                          src={
                            message.user.avatar ||
                            getDefaultAvatar(message.user.username)
                          }
                        />
                      )}
                    </div>
                  );
                })
              )}

              {/* Typing Indicators */}
              {typing.length > 0 && (
                <div className="flex items-start gap-3 animate-pulse">
                  <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded-full flex-shrink-0"></div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {typing.map((t) => t.username).join(", ")}
                    </span>
                    <div className="mt-1 px-3 py-2 rounded-xl rounded-tl-md bg-white dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400 italic border border-gray-200 dark:border-gray-700 shadow-sm">
                      <div className="flex items-center gap-1">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                          <div
                            className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                        <span className="ml-2">
                          {typing.length === 1 ? "is typing" : "are typing"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <form
              onSubmit={handleSendMessage}
              className="flex items-center gap-3"
            >
              <div className="flex-1 relative">
                <input
                  value={chatMessage}
                  onChange={handleInputChange}
                  className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 pr-12 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Type your message..."
                  type="text"
                />
                <button
                  type="submit"
                  disabled={!chatMessage.trim()}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                    chatMessage.trim()
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <svg
                    fill="currentColor"
                    height="16"
                    viewBox="0 0 256 256"
                    width="16"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M224.23,128.57,41.23,224.4a8,8,0,0,1-12-7.14L38.41,136H136a8,8,0,0,0,0-16H38.41L29.27,38.73a8,8,0,0,1,12-7.14L224.23,127.43a8,8,0,0,1,0,1.14Z"></path>
                  </svg>
                </button>
              </div>
            </form>
          </div>

          {/* Active Users */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-3">
                <svg
                  className="w-4 h-4 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                  />
                </svg>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Active Users ({members.length})
                </h3>
              </div>
              <ul className="space-y-2 max-h-32 overflow-y-auto">
                {members.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="relative">
                      <img
                        alt={`${member.user.username}'s avatar`}
                        className="h-8 w-8 rounded-full"
                        src={
                          member.user.avatar ||
                          getDefaultAvatar(member.user.username)
                        }
                      />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 block h-3 w-3 rounded-full ring-2 ring-white dark:ring-gray-800 ${
                          member.user.isOnline ? "bg-green-500" : "bg-gray-400"
                        }`}
                      ></span>
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {member.user.username}
                        {member.userId === user?.id && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 ml-1 font-normal">
                            (You)
                          </span>
                        )}
                      </span>
                      {member.user.isOnline && (
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                          Online
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </main>

      {/* Create File Modal */}
      {showCreateFileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create New File
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  File Name
                </label>
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="Enter file name (e.g., app.js, main.py)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Language
                </label>
                <select
                  value={selectedLanguageForNewFile.id}
                  onChange={(e) => {
                    const lang = SUPPORTED_LANGUAGES.find(
                      (l) => l.id === e.target.value
                    );
                    if (lang) setSelectedLanguageForNewFile(lang);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateFileModal(false);
                  setNewFileName("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFile}
                disabled={!newFileName.trim()}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomComponent;
