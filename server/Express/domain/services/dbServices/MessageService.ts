import { Message } from "../../entities/Message";
import { IMessageService } from "../../interfaces/dbInterfaces/Iservices/IMessageService";
import { IMessageRepo } from "../../interfaces/dbInterfaces/Irepos/IMessageRepo";

// TODO: replace 'any' with IMessageRepo interface from domain/interfaces/dbInterfaces/Irepos
export class MessageService implements IMessageService {
  private readonly messagesRepo: IMessageRepo;

  constructor(private readonly _iMessagesRepo: IMessageRepo) {
    this.messagesRepo = _iMessagesRepo;
  }

  addMessageToRoom(message: Message, roomId: string): Promise<void> {
    return this.messagesRepo.addMessageToRoom(message, roomId);
  }

  getMessagesForRoom(roomId: string): Promise<Message[]> {
    return this.messagesRepo.getMessagesForRoom(roomId);
  }

  markMessageDelivered(
    messageId: number,
    ts: number = Date.now()
  ): Promise<void> {
    return this.messagesRepo.markMessageDelivered(messageId, ts);
  }

  markMessageRead(messageId: number, ts: number = Date.now()): Promise<void> {
    return this.messagesRepo.markMessageRead(messageId, ts);
  }

  getUnreadCountsForUser(userId: string): Promise<Record<string, number>> {
    return this.messagesRepo.getUnreadCountsForUser(userId);
  }

  getMessageById(messageId: number): Promise<Message | null> {
    return this.messagesRepo.getMessageById(messageId);
  }

  updateMessageContent(messageId: number, newContent: string): Promise<void> {
    return this.messagesRepo.updateMessageContent(messageId, newContent);
  }

  softDeleteMessage(messageId: number): Promise<void> {
    return this.messagesRepo.softDeleteMessage(messageId);
  }
}
