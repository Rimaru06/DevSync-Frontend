import { Socket } from 'socket.io-client';
import { apiService } from './apiService';

// Types
export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
  message: string;
  timestamp: string;
  createdAt: string;
}

export interface TypingIndicator {
  userId: string;
  username: string;
  isTyping: boolean;
}

export interface SendMessageData {
  roomId: string;
  message: string;
}

class ChatService {

  // Make authenticated API request with automatic token refresh
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    return apiService.request<T>(endpoint, options);
  }

  // API Methods for chat
  async getChatHistory(roomId: string, limit: number = 50, offset: number = 0): Promise<{
    success: boolean;
    data: {
      messages: ChatMessage[];
      hasMore: boolean;
      total: number;
    }
  }> {
    return this.apiRequest(`/chat/${roomId}?limit=${limit}&offset=${offset}`);
  }

  async sendMessage(data: SendMessageData): Promise<{
    success: boolean;
    message: string;
    data: ChatMessage;
  }> {
    return this.apiRequest('/chat/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Socket.IO Methods for real-time chat
  emitSendMessage(socket: Socket, data: SendMessageData) {
    socket.emit('send-message', data);
  }

  emitJoinRoom(socket: Socket, roomId: string) {
    socket.emit('join-room', { roomId });
  }

  emitLeaveRoom(socket: Socket, roomId: string) {
    socket.emit('leave-room', { roomId });
  }

  emitTyping(socket: Socket, roomId: string, isTyping: boolean) {
    socket.emit('typing', { roomId, isTyping });
  }

  // Socket event listeners for chat
  onNewMessage(socket: Socket, callback: (data: ChatMessage) => void) {
    socket.on('new-message', callback);
  }

  onMessageSent(socket: Socket, callback: (data: { success: boolean; data: ChatMessage }) => void) {
    socket.on('message-sent', callback);
  }

  onTyping(socket: Socket, callback: (data: TypingIndicator) => void) {
    socket.on('user-typing', callback);
  }

  onUserJoinedRoom(socket: Socket, callback: (data: { roomId: string; user: { id: string; username: string; avatar?: string } }) => void) {
    socket.on('user-joined-room', callback);
  }

  onUserLeftRoom(socket: Socket, callback: (data: { roomId: string; userId: string }) => void) {
    socket.on('user-left-room', callback);
  }

  onChatError(socket: Socket, callback: (data: { type: string; message: string }) => void) {
    socket.on('chat-error', callback);
  }

  // Remove specific event listeners
  removeMessageListeners(socket: Socket) {
    socket.off('new-message');
    socket.off('message-sent');
    socket.off('user-typing');
    socket.off('user-joined-room');
    socket.off('user-left-room');
    socket.off('chat-error');
  }

  // Helper method to format timestamp
  formatMessageTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than a minute
    if (diff < 60000) {
      return 'Just now';
    }
    
    // Less than an hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    }
    
    // Less than a day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }
    
    // More than a day
    return date.toLocaleDateString();
  }

  // Helper method to format time for display
  formatTimeForDisplay(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

// Export singleton instance
export const chatService = new ChatService();
export default chatService;