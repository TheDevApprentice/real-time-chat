/**
 * MessageService (Domain)
 * -----------------------
 * Orchestrates message use cases using Unit of Work.
 * - Uses `uow.noTx` for simple single-step operations (send, mark read, etc.).
 * - For multi-step flows (e.g., send + side-effects), wrap in `uow.tx` at call sites.
 *
 * Repositories remain atomic primitives; this service expects an explicit
 * `messagesRepo` shape from the UoW runner.
 */
import { Message } from "../../entities/Message";
import { IMessageService } from "../../interfaces/dbInterfaces/Iservices/IMessageService";

// TODO: replace 'any' with IMessageRepo interface from domain/interfaces/dbInterfaces/Irepos
// Minimal UnitOfWork-like contract (explicit messagesRepo shape)
type MessagesUowRunner = <T>(fn: (uow: { messagesRepo: {
  addMessageToRoom: (message: Message, roomId: string) => Promise<void>;
  getMessagesForRoom: (roomId: string) => Promise<Message[]>;
  markMessageDelivered: (messageId: number, ts?: number) => Promise<void>;
  markMessageRead: (messageId: number, ts?: number) => Promise<void>;
  getUnreadCountsForUser: (userId: string) => Promise<Record<string, number>>;
  getMessageById: (messageId: number) => Promise<Message | null>;
  updateMessageContent: (messageId: number, newContent: string) => Promise<void>;
  softDeleteMessage: (messageId: number) => Promise<void>;
} }) => Promise<T>) => Promise<T>;
type MessagesUowProvider = { tx: MessagesUowRunner; noTx: MessagesUowRunner };

export class MessageService implements IMessageService {
  constructor(private readonly uow: MessagesUowProvider) {}

  addMessageToRoom(message: Message, roomId: string): Promise<void> {
    return this.uow.noTx(async ({ messagesRepo }) => messagesRepo.addMessageToRoom(message, roomId));
  }

  getMessagesForRoom(roomId: string): Promise<Message[]> {
    return this.uow.noTx(async ({ messagesRepo }) => messagesRepo.getMessagesForRoom(roomId));
  }

  markMessageDelivered(
    messageId: number,
    ts: number = Date.now()
  ): Promise<void> {
    return this.uow.noTx(async ({ messagesRepo }) => messagesRepo.markMessageDelivered(messageId, ts));
  }

  markMessageRead(messageId: number, ts: number = Date.now()): Promise<void> {
    return this.uow.noTx(async ({ messagesRepo }) => messagesRepo.markMessageRead(messageId, ts));
  }

  getUnreadCountsForUser(userId: string): Promise<Record<string, number>> {
    return this.uow.noTx(async ({ messagesRepo }) => messagesRepo.getUnreadCountsForUser(userId));
  }

  getMessageById(messageId: number): Promise<Message | null> {
    return this.uow.noTx(async ({ messagesRepo }) => messagesRepo.getMessageById(messageId));
  }

  updateMessageContent(messageId: number, newContent: string): Promise<void> {
    return this.uow.noTx(async ({ messagesRepo }) => messagesRepo.updateMessageContent(messageId, newContent));
  }

  softDeleteMessage(messageId: number): Promise<void> {
    return this.uow.noTx(async ({ messagesRepo }) => messagesRepo.softDeleteMessage(messageId));
  }
}
