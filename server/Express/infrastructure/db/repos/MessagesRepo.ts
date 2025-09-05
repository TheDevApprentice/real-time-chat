import { CallbackDB } from "../adapters/callbackDb";
import { Message } from "../../../domain/entities/Message";
import { IMessageRepo } from "../../../domain/interfaces/dbInterfaces/Irepos/IMessageRepo";

export class MessagesRepo implements IMessageRepo {
  constructor(private db: CallbackDB) {}

  addMessageToRoom(message: Message, roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO messages (authorId, authorName, content, timestamp, roomId, status, sentAt) VALUES (?, ?, ?, ?, ?, 'sent', ?)`,
        [
          message.author.id,
          message.author.name,
          message.content,
          message.timestamp,
          roomId,
          message.timestamp,
        ],
        function (this: any, err) {
          if (err) return reject(err);
          try {
            if (this && typeof this.lastID !== "undefined")
              message.id = String(this.lastID);
          } catch {}
          resolve();
        }
      );
    });
  }

  getMessagesForRoom(roomId: string): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT id, authorId, authorName, content, timestamp, status, sentAt, deliveredAt, readAt FROM messages WHERE roomId = ?`,
        [roomId],
        (err: Error | null, rows?: any[]) => {
          if (err) return reject(err);
          const messages: (Message | undefined)[] = (
            (rows as Array<{
              id: number;
              authorId: string;
              authorName: string;
              content: string;
              timestamp: number;
              status: string;
              sentAt: number;
              deliveredAt: number;
              readAt: number;
            }>) || []
          ).map(Message.fromDbRow);
          resolve(messages.filter((m) => m !== undefined));
        }
      );
    });
  }

  markMessageDelivered(
    messageId: number,
    ts: number = Date.now()
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE messages
         SET status = CASE WHEN status = 'read' THEN status ELSE 'delivered' END,
             deliveredAt = COALESCE(deliveredAt, ?)
         WHERE id = ?`,
        [ts, messageId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  markMessageRead(messageId: number, ts: number = Date.now()): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE messages
         SET status = 'read',
             readAt = ?,
             deliveredAt = COALESCE(deliveredAt, ?)
         WHERE id = ?`,
        [ts, ts, messageId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  getUnreadCountsForUser(userId: string): Promise<Record<string, number>> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT m.roomId as roomId, COUNT(*) as cnt
        FROM messages m
        INNER JOIN user_rooms ur ON ur.roomId = m.roomId AND ur.userId = ?
        WHERE (m.authorId IS NULL OR m.authorId <> ?)
          AND (m.status IS NULL OR m.status <> 'read')
        GROUP BY m.roomId
      `;
      this.db.all(
        sql,
        [userId, userId],
        (err, rows: Array<{ roomId: string; cnt: number }> | undefined) => {
          if (err) return reject(err);
          const out: Record<string, number> = {};
          for (const r of rows || []) out[r.roomId] = Number(r.cnt) || 0;
          resolve(out);
        }
      );
    });
  }
}
