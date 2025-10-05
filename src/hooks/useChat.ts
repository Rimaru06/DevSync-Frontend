import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { chatService, type ChatMessage, type TypingIndicator, type SendMessageData } from '../services/chatService';

interface UseChatProps {
  roomId: string;
  socket: Socket | null;
  userId: string;
}

interface UseChatReturn {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  typing: TypingIndicator[];
  sendMessage: (message: string) => Promise<boolean>;
  loadMoreMessages: () => Promise<void>;
  hasMoreMessages: boolean;
  setTyping: (isTyping: boolean) => void;
  clearError: () => void;
}

export const useChat = ({ roomId, socket, userId }: UseChatProps): UseChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typing, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const messagesOffset = useRef(0);
  const typingTimeout = useRef<number | null>(null);

  // Load initial chat history
  const loadChatHistory = useCallback(async (offset = 0, limit = 50) => {
    try {
      setError(null);
      if (offset === 0) setLoading(true);
      
      const response = await chatService.getChatHistory(roomId, limit, offset);
      
      if (response.success) {
        const newMessages = response.data.messages;
        
        if (offset === 0) {
          // Initial load - replace all messages
          setMessages(newMessages);
        } else {
          // Loading more - prepend to existing messages
          setMessages(prev => [...newMessages, ...prev]);
        }
        
        setHasMoreMessages(response.data.hasMore);
        messagesOffset.current = offset + newMessages.length;
      } else {
        throw new Error('Failed to load chat history');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages';
      setError(errorMessage);
      console.error('Error loading chat history:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [roomId]);

  // Load more messages (for pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!hasMoreMessages || loadingMore) return;
    
    setLoadingMore(true);
    await loadChatHistory(messagesOffset.current);
  }, [loadChatHistory, hasMoreMessages, loadingMore]);

  // Send a message
  const sendMessage = useCallback(async (message: string): Promise<boolean> => {
    if (!socket || !message.trim()) return false;

    try {
      const messageData: SendMessageData = {
        roomId,
        message: message.trim(),
      };

      // Emit through socket for real-time delivery
      console.log('📤 [useChat] Emitting message via socket:', messageData);
      chatService.emitSendMessage(socket, messageData);
      
      // Also send through API as backup
      console.log('📤 [useChat] Sending message via API as backup');
      await chatService.sendMessage(messageData);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      console.error('Error sending message:', err);
      return false;
    }
  }, [socket, roomId]);

  // Handle typing indicator
  const setTyping = useCallback((isTyping: boolean) => {
    if (!socket) return;

    // Clear existing timeout
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }

    // Emit typing status
    chatService.emitTyping(socket, roomId, isTyping);

    if (isTyping) {
      // Auto-stop typing after 3 seconds
      typingTimeout.current = setTimeout(() => {
        chatService.emitTyping(socket, roomId, false);
      }, 3000);
    }
  }, [socket, roomId]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Set up socket listeners
  useEffect(() => {
    if (!socket || !roomId) return;

    // Join the room for chat
    chatService.emitJoinRoom(socket, roomId);

    // Listen for new messages
    chatService.onNewMessage(socket, (message: ChatMessage) => {
      console.log('💬 [useChat] Received new message event:', message);
      if (message.roomId === roomId) {
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const messageExists = prev.some(msg => msg.id === message.id);
          if (messageExists) {
            console.log('⚠️ [useChat] Message already exists, skipping');
            return prev;
          }
          
          console.log('✅ [useChat] Adding new message to state');
          return [...prev, message];
        });
      } else {
        console.log('⏭️ [useChat] Message not for current room, ignoring');
      }
    });

    // Listen for message sent confirmation
    chatService.onMessageSent(socket, (data) => {
      if (data.success && data.data.roomId === roomId) {
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const messageExists = prev.some(msg => msg.id === data.data.id);
          if (messageExists) return prev;
          
          return [...prev, data.data];
        });
      }
    });

    // Listen for typing indicators
    chatService.onTyping(socket, (data: TypingIndicator) => {
      // Don't show typing indicator for current user
      if (data.userId === userId) return;
      
      setTypingUsers(prev => {
        const filteredUsers = prev.filter(user => user.userId !== data.userId);
        
        if (data.isTyping) {
          return [...filteredUsers, data];
        } else {
          return filteredUsers;
        }
      });

      // Auto-remove typing indicator after 5 seconds
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(user => user.userId !== data.userId));
      }, 5000);
    });

    // Listen for chat errors
    chatService.onChatError(socket, (errorData) => {
      setError(errorData.message);
    });

    // Cleanup function
    return () => {
      chatService.emitLeaveRoom(socket, roomId);
      chatService.removeMessageListeners(socket);
      
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    };
  }, [socket, roomId, userId]);

  // Load initial messages when room changes
  useEffect(() => {
    if (roomId) {
      messagesOffset.current = 0;
      loadChatHistory();
    }
  }, [roomId, loadChatHistory]);

  return {
    messages,
    loading,
    error,
    typing,
    sendMessage,
    loadMoreMessages,
    hasMoreMessages,
    setTyping,
    clearError,
  };
};