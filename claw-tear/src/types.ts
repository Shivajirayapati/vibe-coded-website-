export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string;
  thinkingTime?: number;
  timestamp: number;
  model?: string;
  tokensPerSec?: number;
  totalTokens?: number;
  evalDuration?: number;
  contextUsage?: number;
  attachments?: {
    name: string;
    size: number;
    content: string;
  }[];
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  model: string;
  isTemporary?: boolean;
  pinned?: boolean;
}

export interface AppSettings {
  theme: 'system' | 'light' | 'dark' | 'tokyo-night';
  defaultModel: string;
  temperature: number;
  contextWindow: number;
  maxTokens: number;
  topP?: number;
  topK?: number;
  repeatPenalty?: number;
  systemPrompt: string;
  ollamaUrl: string;
  mockIfOffline: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  defaultModel: 'qwen3:4b',
  temperature: 0.7,
  contextWindow: 4096,
  maxTokens: 2048,
  topP: 0.9,
  topK: 40,
  repeatPenalty: 1.1,
  systemPrompt: 'You are Claw Tear, an advanced, private AI assistant powered by local on-device intelligence. You are helpful, insightful, direct, and thoughtful.',
  ollamaUrl: 'http://127.0.0.1:11434',
  mockIfOffline: true
};

export interface OllamaModelInfo {
  name: string;
  size: number;
  modified_at: string;
  details?: {
    parameter_size?: string;
    quantization_level?: string;
    family?: string;
  };
}
