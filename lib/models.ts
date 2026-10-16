import type { ObjectId } from "mongodb";
import type { MessageRole, Tone } from "@/types/chat";

export interface StoredMessage {
  role: MessageRole;
  content: string;
  createdAt: Date;
  tone?: Tone;
}

export interface StoredConversation {
  _id?: ObjectId;
  title: string;
  tone: Tone;
  createdAt: Date;
  updatedAt: Date;
  messages: StoredMessage[];
}
