export interface ChatMessage {
  content: string;
  isUser: boolean;
  timestamp: Date;
  id?: string;
  isError?: boolean;
  isLoading?: boolean;
  inferenceProgress?: number;
} 