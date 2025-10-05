import { apiService } from './apiService';

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

export interface ExecuteCodeRequest {
  code: string;
  language: string;
  fileId?: string;
}

interface APIResponse<T = unknown> {
  success: boolean;
  data: T;
  error?: string;
}

class ExecutionService {
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<unknown> {
    return apiService.request(endpoint, options);
  }

  // Execute code directly
  async executeCode(roomId: string, request: ExecuteCodeRequest): Promise<{
    success: boolean;
    data?: ExecutionResult;
    error?: string;
  }> {
    try {
      const result = await this.makeRequest(`/execute/rooms/${roomId}/execute`, {
        method: 'POST',
        body: JSON.stringify(request),
      });
      
      return {
        success: true,
        data: (result as APIResponse<ExecutionResult>).data,
      };
    } catch (error) {
      console.error('Error executing code:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute code',
      };
    }
  }

  // Execute code from file
  async executeFile(roomId: string, fileId: string): Promise<{
    success: boolean;
    data?: ExecutionResult;
    error?: string;
  }> {
    try {
      const result = await this.makeRequest(`/execute/rooms/${roomId}/files/${fileId}/execute`, {
        method: 'POST',
      });
      
      return {
        success: true,
        data: (result as APIResponse<ExecutionResult>).data,
      };
    } catch (error) {
      console.error('Error executing file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute file',
      };
    }
  }

  // Get supported languages
  async getSupportedLanguages(): Promise<{
    success: boolean;
    data?: { languages: string[] };
    error?: string;
  }> {
    try {
      const result = await this.makeRequest(`/execute/languages`);
      
      return {
        success: true,
        data: (result as APIResponse<{ languages: string[] }>).data,
      };
    } catch (error) {
      console.error('Error getting supported languages:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get supported languages',
      };
    }
  }
}

export const executionService = new ExecutionService();
export default executionService;