import { useState, useCallback } from 'react';
import { executionService, type ExecutionResult, type ExecuteCodeRequest } from '../services/executionService';

interface UseCodeExecutionReturn {
  // State
  executing: boolean;
  lastResult: ExecutionResult | null;
  error: string | null;
  supportedLanguages: string[];
  
  // Actions
  executeCode: (roomId: string, request: ExecuteCodeRequest) => Promise<boolean>;
  executeFile: (roomId: string, fileId: string) => Promise<boolean>;
  loadSupportedLanguages: () => Promise<void>;
  clearResult: () => void;
  clearError: () => void;
}

export const useCodeExecution = (): UseCodeExecutionReturn => {
  const [executing, setExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>([]);

  // Execute code directly
  const executeCode = useCallback(async (roomId: string, request: ExecuteCodeRequest): Promise<boolean> => {
    try {
      setExecuting(true);
      setError(null);
      
      const response = await executionService.executeCode(roomId, request);
      
      if (response.success && response.data) {
        setLastResult(response.data);
        return true;
      } else {
        setError(response.error || 'Failed to execute code');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute code';
      setError(errorMessage);
      console.error('Error executing code:', err);
      return false;
    } finally {
      setExecuting(false);
    }
  }, []);

  // Execute code from file
  const executeFile = useCallback(async (roomId: string, fileId: string): Promise<boolean> => {
    try {
      setExecuting(true);
      setError(null);
      
      const response = await executionService.executeFile(roomId, fileId);
      
      if (response.success && response.data) {
        setLastResult(response.data);
        return true;
      } else {
        setError(response.error || 'Failed to execute file');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute file';
      setError(errorMessage);
      console.error('Error executing file:', err);
      return false;
    } finally {
      setExecuting(false);
    }
  }, []);

  // Load supported languages
  const loadSupportedLanguages = useCallback(async (): Promise<void> => {
    try {
      const response = await executionService.getSupportedLanguages();
      
      if (response.success && response.data) {
        setSupportedLanguages(response.data.languages);
      }
    } catch (err) {
      console.error('Error loading supported languages:', err);
    }
  }, []);

  // Clear result
  const clearResult = useCallback(() => {
    setLastResult(null);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    executing,
    lastResult,
    error,
    supportedLanguages,
    executeCode,
    executeFile,
    loadSupportedLanguages,
    clearResult,
    clearError,
  };
};

export default useCodeExecution;