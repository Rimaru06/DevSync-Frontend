import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import {
  codeEditorService,
  type CodeFile,
  type EditorChange,
  type CursorPosition,
  type SupportedLanguage,
  SUPPORTED_LANGUAGES,
  EDITOR_THEMES
} from '../services/codeEditorService';

interface UseCodeEditorProps {
  roomId: string;
  socket: Socket | null;
  userId: string;
}

interface UseCodeEditorReturn {
  // Files
  files: CodeFile[];
  currentFile: CodeFile | null;
  loading: boolean;
  error: string | null;
  
  // Editor state
  editorContent: string;
  selectedLanguage: SupportedLanguage;
  theme: string;
  
  // File operations
  createFile: (name: string, language: SupportedLanguage) => Promise<boolean>;
  selectFile: (fileId: string) => Promise<boolean>;
  updateFileContent: (content: string) => Promise<boolean>;
  deleteFile: (fileId: string) => Promise<boolean>;
  
  // Editor operations
  setEditorContent: (content: string) => void;
  setSelectedLanguage: (language: SupportedLanguage) => void;
  setTheme: (theme: string) => void;
  
  // Real-time collaboration
  cursors: Map<string, CursorPosition>;
  
  // Utility
  clearError: () => void;
  refreshFiles: () => Promise<void>;
}

export const useCodeEditor = ({ roomId, socket, userId }: UseCodeEditorProps): UseCodeEditorReturn => {
  // File state
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [currentFile, setCurrentFile] = useState<CodeFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Editor state
  const [editorContent, setEditorContent] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(SUPPORTED_LANGUAGES[0]);
  const [theme, setTheme] = useState<string>(EDITOR_THEMES.DARK);
  
  // Real-time state
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  
  // Refs
  const updateTimeoutRef = useRef<number | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const isUpdatingFromRemote = useRef(false);

  // Load files for the room
  const loadFiles = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await codeEditorService.getFiles(roomId);
      
      if (response.success) {
        setFiles(response.data);
        
        // If no current file and files exist, select the first one
        if (!currentFile && response.data.length > 0) {
          const firstFile = response.data[0];
          setCurrentFile(firstFile);
          setEditorContent(firstFile.content);
          
          const language = codeEditorService.getLanguageById(firstFile.language);
          if (language) {
            setSelectedLanguage(language);
          }
        }
      } else {
        throw new Error('Failed to load files');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load files';
      setError(errorMessage);
      console.error('Error loading files:', err);
    } finally {
      setLoading(false);
    }
  }, [roomId, currentFile]);

  // Create a new file
  const createFile = useCallback(async (name: string, language: SupportedLanguage): Promise<boolean> => {
    try {
      setError(null);
      
      const content = language.defaultContent || '';
      
      const response = await codeEditorService.createFile(roomId, {
        name,
        content,
        language: language.id,
      });

      if (response.success) {
        const newFile = response.data;
        setFiles(prev => [...prev, newFile]);
        
        // Emit to other users
        if (socket) {
          codeEditorService.emitFileCreated(socket, roomId, newFile);
        }
        
        // Select the new file
        setCurrentFile(newFile);
        setEditorContent(newFile.content);
        setSelectedLanguage(language);
        
        return true;
      } else {
        throw new Error('Failed to create file');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create file';
      setError(errorMessage);
      console.error('Error creating file:', err);
      return false;
    }
  }, [roomId, socket]);

  // Select a file to edit
  const selectFile = useCallback(async (fileId: string): Promise<boolean> => {
    try {
      setError(null);
      
      // First try to find in current files
      let file = files.find(f => f.id === fileId);
      
      if (!file) {
        // Fetch from server
        const response = await codeEditorService.getFile(roomId, fileId);
        if (response.success) {
          file = response.data;
        } else {
          throw new Error('File not found');
        }
      }
      
      if (file) {
        setCurrentFile(file);
        setEditorContent(file.content);
        
        const language = codeEditorService.getLanguageById(file.language);
        if (language) {
          setSelectedLanguage(language);
        }
        
        return true;
      }
      
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to select file';
      setError(errorMessage);
      console.error('Error selecting file:', err);
      return false;
    }
  }, [roomId, files]);

  // Update file content
  const updateFileContent = useCallback(async (content: string): Promise<boolean> => {
    if (!currentFile) return false;
    
    try {
      setError(null);
      
      const response = await codeEditorService.updateFile(roomId, currentFile.id, {
        content,
      });

      if (response.success) {
        // Update local state
        setFiles(prev => prev.map(file => 
          file.id === currentFile.id 
            ? { ...file, content, updatedAt: response.data.updatedAt }
            : file
        ));
        
        setCurrentFile(prev => prev ? { ...prev, content, updatedAt: response.data.updatedAt } : null);
        
        return true;
      } else {
        throw new Error('Failed to update file');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update file';
      setError(errorMessage);
      console.error('Error updating file:', err);
      return false;
    }
  }, [roomId, currentFile]);

  // Delete a file
  const deleteFile = useCallback(async (fileId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await codeEditorService.deleteFile(roomId, fileId);

      if (response.success) {
        setFiles(prev => prev.filter(file => file.id !== fileId));
        
        // If deleted file was current, select another or clear
        if (currentFile?.id === fileId) {
          const remainingFiles = files.filter(f => f.id !== fileId);
          if (remainingFiles.length > 0) {
            await selectFile(remainingFiles[0].id);
          } else {
            setCurrentFile(null);
            setEditorContent('');
          }
        }
        
        // Emit to other users
        if (socket) {
          codeEditorService.emitFileDeleted(socket, roomId, fileId);
        }
        
        return true;
      } else {
        throw new Error('Failed to delete file');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
      setError(errorMessage);
      console.error('Error deleting file:', err);
      return false;
    }
  }, [roomId, currentFile, files, socket, selectFile]);

  // Handle content change with debouncing
  const handleContentChange = useCallback((content: string) => {
    if (isUpdatingFromRemote.current) {
      isUpdatingFromRemote.current = false;
      return;
    }
    
    // Only update state if content actually changed
    if (content !== editorContent) {
      setEditorContent(content);
    }
    
    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // Debounce real-time updates (faster for collaboration)
    updateTimeoutRef.current = window.setTimeout(() => {
      if (currentFile && socket) {
        // Emit real-time change
        const change: EditorChange = {
          roomId,
          fileId: currentFile.id,
          content,
          userId: userId || 'anonymous',
        };
        
        console.log('📤 [useCodeEditor] Emitting code change:', change);
        codeEditorService.emitCodeChange(socket, change);
      }
    }, 200); // Faster for real-time collaboration
    
    // Separate timeout for server save (less frequent)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = window.setTimeout(() => {
      if (currentFile) {
        updateFileContent(content);
      }
    }, 1000); // Save to server every 1 second
  }, [currentFile, socket, roomId, updateFileContent, userId, editorContent]);

  // Set up socket listeners for real-time collaboration
  useEffect(() => {
    if (!socket || !roomId) return;

    // Listen for code changes from other users
    codeEditorService.onCodeChange(socket, (change) => {
      console.log('🔄 [useCodeEditor] Received code change event:', change);
      // Ignore changes from the current user to prevent refresh
      if (change.roomId === roomId && 
          change.fileId === currentFile?.id && 
          change.userId !== userId) {
        console.log('✅ [useCodeEditor] Applying remote code change');
        isUpdatingFromRemote.current = true;
        setEditorContent(change.content);
      } else {
        console.log('⏭️ [useCodeEditor] Ignoring code change - not for current user/file');
      }
    });

    // Listen for cursor movements
    codeEditorService.onCursorPosition(socket, (data) => {
      if (data.fileId === currentFile?.id && data.userId !== userId) {
        setCursors(prev => {
          const newCursors = new Map(prev);
          newCursors.set(data.userId, {
            userId: data.userId,
            username: data.username,
            position: data.position,
            selection: data.selection,
          });
          return newCursors;
        });
      }
    });

    // Listen for file operations
    codeEditorService.onFileCreated(socket, (data) => {
      console.log('📄 [useCodeEditor] Received file created event:', data);
      if (data.roomId === roomId) {
        setFiles(prev => {
          const exists = prev.some(f => f.id === data.file.id);
          return exists ? prev : [...prev, data.file];
        });
      }
    });

    codeEditorService.onFileDeleted(socket, (data) => {
      if (data.roomId === roomId) {
        setFiles(prev => prev.filter(f => f.id !== data.fileId));
        
        if (currentFile?.id === data.fileId) {
          setCurrentFile(null);
          setEditorContent('');
        }
      }
    });

    // Listen for errors
    codeEditorService.onEditorError(socket, (errorData) => {
      setError(errorData.message);
    });

    return () => {
      codeEditorService.removeEditorListeners(socket);
    };
  }, [socket, roomId, currentFile?.id, userId]);

  // Load files on mount
  useEffect(() => {
    if (roomId) {
      loadFiles();
    }
  }, [roomId, loadFiles]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Utility functions
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshFiles = useCallback(async () => {
    await loadFiles();
  }, [loadFiles]);

  return {
    // Files
    files,
    currentFile,
    loading,
    error,
    
    // Editor state
    editorContent,
    selectedLanguage,
    theme,
    
    // File operations
    createFile,
    selectFile,
    updateFileContent,
    deleteFile,
    
    // Editor operations
    setEditorContent: handleContentChange,
    setSelectedLanguage,
    setTheme: (newTheme: string) => setTheme(newTheme),
    
    // Real-time collaboration
    cursors,
    
    // Utility
    clearError,
    refreshFiles,
  };
};