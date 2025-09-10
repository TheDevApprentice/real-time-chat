import type { UserDTO } from "./user.dto";

export type MessageStatus = "sent" | "delivered" | "read";

export interface MessageDTO {
  id: string;
  author: UserDTO;
  content: string;
  timestamp: number;
  status: MessageStatus;
  sentAt?: number;
  deliveredAt?: number;
  readAt?: number;
}

export interface CreateMessageDTO {
  roomId: string;
  content?: string;
  clientMsgId?: string;
}

export interface EditMessageDTO {
  roomId: string;
  messageId: number;
  newContent: string;
}

export interface DeleteMessageDTO {
  roomId: string;
  messageId: number;
}

export interface MessageDeliveryReceiptDTO {
  roomId: string;
  messageId: number;
}

export interface MessageReadReceiptDTO {
  roomId: string;
  messageId: number;
}
