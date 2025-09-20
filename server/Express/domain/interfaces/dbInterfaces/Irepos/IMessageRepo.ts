import { Message } from "../../../entities/Message";

export interface IMessageRepo {
  addMessageToRoom(message: Message, roomId: string): Promise<void>;
  getMessagesForRoom(roomId: string): Promise<Message[]>;
  markMessageDelivered(messageId: number, ts?: number): Promise<void>;
  markMessageRead(messageId: number, ts?: number): Promise<void>;
  getUnreadCountsForUser(userId: string): Promise<Record<string, number>>;
  getMessageById(messageId: number): Promise<Message | null>;
  updateMessageContent(messageId: number, newContent: string): Promise<void>;
  softDeleteMessage(messageId: number): Promise<void>;
}