import { editor } from 'monaco-editor';
import { Socket } from 'socket.io-client';
import { apiService } from './apiService';

// Types
export interface CodeFile {
  id: string;
  name: string;
  content: string;
  language: string;
  roomId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    username: string;
  };
}

export interface EditorChange {
  roomId: string;
  fileId: string;
  content: string;
  userId: string;
  position?: {
    lineNumber: number;
    column: number;
  };
  selection?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
}

export interface CursorPosition {
  userId: string;
  username: string;
  position: {
    lineNumber: number;
    column: number;
  };
  selection?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
}

export interface SupportedLanguage {
  id: string;
  name: string;
  extensions: string[];
  monacoLanguage: string;
  defaultContent?: string;
}

// Supported programming languages
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  {
    id: 'javascript',
    name: 'JavaScript',
    extensions: ['.js', '.mjs'],
    monacoLanguage: 'javascript',
    defaultContent: '// Welcome to DevSync!\n// Start coding collaboratively\n\nconsole.log("Hello, World!");'
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    extensions: ['.ts'],
    monacoLanguage: 'typescript',
    defaultContent: '// Welcome to DevSync!\n// Start coding collaboratively\n\ninterface User {\n  id: string;\n  name: string;\n}\n\nconst user: User = {\n  id: "1",\n  name: "Developer"\n};\n\nconsole.log(user);'
  },
  {
    id: 'python',
    name: 'Python',
    extensions: ['.py'],
    monacoLanguage: 'python',
    defaultContent: '# Welcome to DevSync!\n# Start coding collaboratively\n\ndef hello_world():\n    print("Hello, World!")\n\nhello_world()'
  },
  {
    id: 'java',
    name: 'Java',
    extensions: ['.java'],
    monacoLanguage: 'java',
    defaultContent: '// Welcome to DevSync!\n// Start coding collaboratively\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}'
  },
  {
    id: 'cpp',
    name: 'C++',
    extensions: ['.cpp', '.cxx', '.cc'],
    monacoLanguage: 'cpp',
    defaultContent: '// Welcome to DevSync!\n// Start coding collaboratively\n\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}'
  },
  {
    id: 'c',
    name: 'C',
    extensions: ['.c'],
    monacoLanguage: 'c',
    defaultContent: '// Welcome to DevSync!\n// Start coding collaboratively\n\n#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}'
  },
  {
    id: 'html',
    name: 'HTML',
    extensions: ['.html', '.htm'],
    monacoLanguage: 'html',
    defaultContent: '<!DOCTYPE html>\n<!-- Welcome to DevSync! -->\n<!-- Start coding collaboratively -->\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>DevSync</title>\n</head>\n<body>\n    <h1>Hello, World!</h1>\n</body>\n</html>'
  },
  {
    id: 'css',
    name: 'CSS',
    extensions: ['.css'],
    monacoLanguage: 'css',
    defaultContent: '/* Welcome to DevSync! */\n/* Start coding collaboratively */\n\nbody {\n    font-family: Arial, sans-serif;\n    margin: 0;\n    padding: 20px;\n    background-color: #f5f5f5;\n}\n\nh1 {\n    color: #333;\n    text-align: center;\n}'
  },
  {
    id: 'json',
    name: 'JSON',
    extensions: ['.json'],
    monacoLanguage: 'json',
    defaultContent: '{\n  "message": "Welcome to DevSync!",\n  "description": "Start coding collaboratively",\n  "version": "1.0.0",\n  "author": "DevSync Team"\n}'
  },
  {
    id: 'markdown',
    name: 'Markdown',
    extensions: ['.md', '.markdown'],
    monacoLanguage: 'markdown',
    defaultContent: '# Welcome to DevSync!\n\n## Start coding collaboratively\n\nThis is a **collaborative** coding environment where you can:\n\n- Write code in real-time\n- Chat with team members\n- Share files and collaborate\n\n```javascript\nconsole.log("Hello, World!");\n```\n\nHappy coding! 🚀'
  },
  {
    id: 'sql',
    name: 'SQL',
    extensions: ['.sql'],
    monacoLanguage: 'sql',
    defaultContent: '-- Welcome to DevSync!\n-- Start coding collaboratively\n\nCREATE TABLE users (\n    id INT PRIMARY KEY,\n    username VARCHAR(255) NOT NULL,\n    email VARCHAR(255) UNIQUE NOT NULL,\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\nSELECT * FROM users;'
  }
];

// Editor themes
export const EDITOR_THEMES = {
  LIGHT: 'light',
  DARK: 'vs-dark',
  HIGH_CONTRAST: 'hc-black'
} as const;

class CodeEditorService {

  // API request helper with automatic token refresh
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    return apiService.request<T>(endpoint, options);
  }

  // File Management API
  async getFiles(roomId: string): Promise<{
    success: boolean;
    data: CodeFile[];
  }> {
    return this.apiRequest(`/rooms/${roomId}/files`);
  }

  async getFile(roomId: string, fileId: string): Promise<{
    success: boolean;
    data: CodeFile;
  }> {
    return this.apiRequest(`/rooms/${roomId}/files/${fileId}`);
  }

  async createFile(roomId: string, data: {
    name: string;
    content: string;
    language: string;
  }): Promise<{
    success: boolean;
    data: CodeFile;
  }> {
    return this.apiRequest(`/rooms/${roomId}/files`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFile(roomId: string, fileId: string, data: {
    content?: string;
    name?: string;
  }): Promise<{
    success: boolean;
    data: CodeFile;
  }> {
    return this.apiRequest(`/rooms/${roomId}/files/${fileId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteFile(roomId: string, fileId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.apiRequest(`/rooms/${roomId}/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  // Socket.IO Real-time Collaboration
  emitCodeChange(socket: Socket, change: EditorChange) {
    socket.emit('code-change', change);
  }

  emitCursorPosition(socket: Socket, data: {
    roomId: string;
    fileId: string;
    position: CursorPosition['position'];
    selection?: CursorPosition['selection'];
  }) {
    socket.emit('cursor-position', data);
  }

  emitFileCreated(socket: Socket, roomId: string, file: CodeFile) {
    socket.emit('file-created', { roomId, file });
  }

  emitFileDeleted(socket: Socket, roomId: string, fileId: string) {
    socket.emit('file-deleted', { roomId, fileId });
  }

  // Socket event listeners
  onCodeChange(socket: Socket, callback: (change: EditorChange & { userId: string }) => void) {
    socket.on('code-updated', callback);
  }

  onCursorPosition(socket: Socket, callback: (data: CursorPosition & { fileId: string }) => void) {
    socket.on('cursor-moved', callback);
  }

  onFileCreated(socket: Socket, callback: (data: { roomId: string; file: CodeFile }) => void) {
    socket.on('file-created', callback);
  }

  onFileDeleted(socket: Socket, callback: (data: { roomId: string; fileId: string }) => void) {
    socket.on('file-deleted', callback);
  }

  onEditorError(socket: Socket, callback: (data: { type: string; message: string }) => void) {
    socket.on('editor-error', callback);
  }

  // Utility functions
  detectLanguageFromFileName(fileName: string): SupportedLanguage {
    const extension = '.' + fileName.split('.').pop()?.toLowerCase();
    
    const language = SUPPORTED_LANGUAGES.find(lang => 
      lang.extensions.includes(extension)
    );
    
    return language || SUPPORTED_LANGUAGES[0]; // Default to JavaScript
  }

  getLanguageById(languageId: string): SupportedLanguage | undefined {
    return SUPPORTED_LANGUAGES.find(lang => lang.id === languageId);
  }

  generateFileName(language: SupportedLanguage, existingFiles: CodeFile[] = []): string {
    const baseNames = {
      javascript: 'script',
      typescript: 'app',
      python: 'main',
      java: 'Main',
      cpp: 'main',
      c: 'main',
      html: 'index',
      css: 'styles',
      json: 'data',
      markdown: 'README',
      sql: 'queries'
    };

    const baseName = baseNames[language.id as keyof typeof baseNames] || 'file';
    const extension = language.extensions[0];
    
    // Check for existing files with same name
    let counter = 1;
    let fileName = `${baseName}${extension}`;
    
    while (existingFiles.some(file => file.name === fileName)) {
      fileName = `${baseName}${counter}${extension}`;
      counter++;
    }
    
    return fileName;
  }

  // Monaco Editor configuration
  getEditorOptions(theme: string = EDITOR_THEMES.DARK): editor.IStandaloneEditorConstructionOptions {
    return {
      theme,
      fontSize: 14,
      fontFamily: "'Fira Code', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
      fontLigatures: true,
      lineNumbers: 'on',
      roundedSelection: true,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      minimap: {
        enabled: true,
      },
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: 'on',
      tabSize: 2,
      insertSpaces: true,
      wordWrap: 'bounded',
      wordWrapColumn: 120,
      renderLineHighlight: 'all',
      selectionHighlight: true,
      folding: true,
      foldingStrategy: 'auto',
      showFoldingControls: 'mouseover',
      matchBrackets: 'always',
      autoIndent: 'full',
      formatOnPaste: true,
      formatOnType: true,
      dragAndDrop: true,
      links: true,
      contextmenu: true,
      mouseWheelZoom: true,
      multiCursorModifier: 'ctrlCmd',
      accessibilitySupport: 'auto'
    };
  }

  // Remove socket listeners
  removeEditorListeners(socket: Socket) {
    socket.off('code-updated');
    socket.off('cursor-moved');
    socket.off('file-created');
    socket.off('file-deleted');
    socket.off('editor-error');
  }
}

export const codeEditorService = new CodeEditorService();
export default codeEditorService;