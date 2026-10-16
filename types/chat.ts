export type Tone = "Professional" | "Casual" | "Concise";
export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  role: MessageRole;
  content: string;
  createdAt: string;
  tone?: Tone;
}

export interface ConversationSummary {
  id: string;
  title: string;
  tone: Tone;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: ChatMessage[];
}
