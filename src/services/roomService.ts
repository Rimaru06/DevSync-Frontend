import { io, Socket } from 'socket.io-client';
import { apiService } from './apiService';

// Types
export interface Room {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  isActive: boolean;
  inviteCode: string;
  maxMembers: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    username: string;
    avatar?: string;
  };
  members: RoomMember[];
  memberCount: number;
  userRole?: 'ADMIN' | 'MEMBER';
  joinedAt?: string;
}

export interface RoomMember {
  id: string;
  userId: string;
  roomId: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
    isOnline: boolean;
  };
}

export interface CreateRoomData {
  name: string;
  description?: string;
  isPrivate?: boolean;
  maxMembers?: number;
}

class RoomService {
  private socket: Socket | null = null;
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  }

  // Initialize Socket.IO connection
  initializeSocket(token: string) {
    if (this.socket) {
      this.socket.disconnect();
    }

    console.log('🔄 Attempting to connect to Socket.IO server at:', this.baseURL);
    
    this.socket = io(this.baseURL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      forceNew: true,
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from Socket.IO server:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🚫 Socket.IO connection error:', error);
    });

    return this.socket;
  }

  // Disconnect socket
  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Make authenticated API request with automatic token refresh
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    return apiService.request<T>(endpoint, options);
  }

  // API Methods
  async createRoom(data: CreateRoomData): Promise<{ success: boolean; message: string; data: Room }> {
    return this.apiRequest('/rooms/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUserRooms(): Promise<{ success: boolean; message: string; data: Room[] }> {
    return this.apiRequest('/rooms');
  }

  async getRoomDetails(roomId: string): Promise<{ success: boolean; message: string; data: Room }> {
    return this.apiRequest(`/rooms/${roomId}`);
  }

  async joinRoom(inviteCodeOrRoomId: string): Promise<{ success: boolean; message: string; data: { roomId: string; roomName: string } }> {
    return this.apiRequest('/rooms/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode: inviteCodeOrRoomId }),
    });
  }

  async leaveRoom(roomId: string): Promise<{ success: boolean; message: string }> {
    return this.apiRequest(`/rooms/${roomId}/leave`, {
      method: 'DELETE',
    });
  }

  async deleteRoom(roomId: string): Promise<{ success: boolean; message: string }> {
    return this.apiRequest(`/rooms/${roomId}`, {
      method: 'DELETE',
    });
  }

  // Socket.IO Methods
  emitCreateRoom(data: CreateRoomData) {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }
    this.socket.emit('create-room', data);
  }

  emitJoinRoom(roomId: string) {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }
    this.socket.emit('join-room', { roomId });
  }

  emitLeaveRoom(roomId: string) {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }
    this.socket.emit('leave-room', { roomId });
  }

  // Socket event listeners
  onRoomCreated(callback: (data: { success: boolean; data: Room }) => void) {
    if (!this.socket) return;
    this.socket.on('room-created', callback);
  }

  onRoomJoined(callback: (data: { success: boolean; data: Room }) => void) {
    if (!this.socket) return;
    this.socket.on('room-joined', callback);
  }

  onRoomLeft(callback: (data: { success: boolean; message: string }) => void) {
    if (!this.socket) return;
    this.socket.on('room-left', callback);
  }

  onMemberJoined(callback: (data: { roomId: string; member: RoomMember }) => void) {
    if (!this.socket) return;
    this.socket.on('member-joined', callback);
  }

  onMemberLeft(callback: (data: { roomId: string; userId: string }) => void) {
    if (!this.socket) return;
    this.socket.on('member-left', callback);
  }

  onError(callback: (data: { type: string; message: string }) => void) {
    if (!this.socket) return;
    this.socket.on('error-message', callback);
  }

  // Remove event listeners
  removeAllListeners() {
    if (!this.socket) return;
    this.socket.removeAllListeners();
  }

  // Get socket instance for custom events
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
export const roomService = new RoomService();
export default roomService;