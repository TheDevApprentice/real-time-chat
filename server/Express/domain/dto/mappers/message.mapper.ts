import type { MessageDTO } from "../message.dto";
import { Message } from "../../entities/Message";
import { mapUserToDTO } from "./user.mapper";

export function mapMessageToDTO(msg: Message): MessageDTO {
  return {
    id: msg.id,
    author: mapUserToDTO(msg.author),
    content: msg.content,
    timestamp: msg.timestamp,
    status: msg.status,
    sentAt: msg.sentAt,
    deliveredAt: msg.deliveredAt,
    readAt: msg.readAt,
  };
}
