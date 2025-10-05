import { useState, useEffect, useCallback } from 'react';
import { roomService, type Room, type CreateRoomData } from '../services/roomService';
import { useAuth } from './useAuth';

export const useRooms = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Fetch user's rooms
  const fetchRooms = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await roomService.getUserRooms();
      setRooms(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch rooms';
      setError(errorMessage);
      console.error('Error fetching rooms:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initialize socket connection when user is authenticated
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        roomService.initializeSocket(token);
        
        // Set up event listeners
        roomService.onRoomCreated((data) => {
          if (data.success) {
            setRooms(prev => [data.data, ...prev]);
          }
        });

        roomService.onRoomJoined((data) => {
          if (data.success) {
            setRooms(prev => {
              const exists = prev.find(room => room.id === data.data.id);
              if (exists) {
                return prev.map(room => 
                  room.id === data.data.id ? data.data : room
                );
              }
              return [data.data, ...prev];
            });
          }
        });

        roomService.onRoomLeft((data) => {
          if (data.success) {
            // Refresh rooms list
            fetchRooms();
          }
        });

        roomService.onMemberJoined((data) => {
          setRooms(prev => prev.map(room => 
            room.id === data.roomId 
              ? { ...room, memberCount: room.memberCount + 1 }
              : room
          ));
        });

        roomService.onMemberLeft((data) => {
          setRooms(prev => prev.map(room => 
            room.id === data.roomId 
              ? { ...room, memberCount: Math.max(0, room.memberCount - 1) }
              : room
          ));
        });

        roomService.onError((data) => {
          setError(data.message);
          console.error('Room error:', data);
        });

        return () => {
          roomService.removeAllListeners();
          roomService.disconnectSocket();
        };
      }
    }
  }, [user, fetchRooms]);

  // Load rooms on mount
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Create a new room
  const createRoom = async (roomData: CreateRoomData): Promise<Room | null> => {
    try {
      setCreating(true);
      setError(null);
      
      const response = await roomService.createRoom(roomData);
      
      if (response.success) {
        // Room will be added to state via socket event
        return response.data;
      }
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create room';
      setError(errorMessage);
      console.error('Error creating room:', err);
      return null;
    } finally {
      setCreating(false);
    }
  };

  // Join a room
  const joinRoom = async (inviteCode: string): Promise<{ roomId: string; roomName: string } | null> => {
    try {
      setError(null);
      const response = await roomService.joinRoom(inviteCode);
      
      if (response.success) {
        // Refresh rooms list to include the newly joined room
        await fetchRooms();
        return response.data;
      }
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join room';
      setError(errorMessage);
      console.error('Error joining room:', err);
      return null;
    }
  };

  // Leave a room
  const leaveRoom = async (roomId: string): Promise<boolean> => {
    try {
      setError(null);
      const response = await roomService.leaveRoom(roomId);
      
      if (response.success) {
        setRooms(prev => prev.filter(room => room.id !== roomId));
        return true;
      }
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to leave room';
      setError(errorMessage);
      console.error('Error leaving room:', err);
      return false;
    }
  };

  const deleteRoom = async (roomId: string): Promise<boolean> => {
    try {
      setError(null);
      const response = await roomService.deleteRoom(roomId);
      
      if (response.success) {
        // Remove the room from the local state
        setRooms(prev => prev.filter(room => room.id !== roomId));
        return true;
      } else {
        throw new Error('Failed to delete room');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete room';
      setError(errorMessage);
      console.error('Error deleting room:', err);
      return false;
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  return {
    rooms,
    loading,
    error,
    creating,
    createRoom,
    joinRoom,
    leaveRoom,
    deleteRoom,
    fetchRooms,
    clearError,
  };
};