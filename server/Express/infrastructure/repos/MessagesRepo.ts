import { CallbackDB } from "../adapters/callbackDb";
import { Message } from "../../domain/entities/Message";
import { IMessageRepo } from "../../domain/interfaces/dbInterfaces/Irepos/IMessageRepo";
import { IDialect } from "../sql/dialect";
import { buildInsert, buildSelect, buildUpdate, buildUpdateParts } from "../sql/queryBuilder";

export class MessagesRepo implements IMessageRepo {
  constructor(private db: CallbackDB, private dialect: IDialect) {}

  addMessageToRoom(message: Message, roomId: string): Promise<void> {
    const columns = [
      "authorId",
      "authorName",
      "content",
      "timestamp",
      "roomId",
      "status",
      "sentAt",
    ];
    const params = [
      message.author.id,
      message.author.name,
      message.content,
      message.timestamp,
      roomId,
      "sent",
      message.timestamp,
    ];

    if (this.dialect.hasReturningId()) {
      const sql = buildInsert(this.dialect, "messages", columns, { returningId: true });
      return new Promise((resolve, reject) => {
        this.db.get<{ id: number }>(sql, params, (err, row) => {
          if (err) return reject(err);
          try { if (row && typeof row.id !== "undefined") message.id = String(row.id); } catch {}
          resolve();
        });
      });
    }
    const sql = buildInsert(this.dialect, "messages", columns);
    return new Promise((resolve, reject) => {
      this.db.run(
        sql,
        params,
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

  getMessageById(messageId: number): Promise<Message | null> {
    return new Promise((resolve, reject) => {
      const sql = buildSelect(
        this.dialect,
        "messages",
        [
          "id",
          "authorId",
          "authorName",
          "content",
          "timestamp",
          "status",
          "sentAt",
          "deliveredAt",
          "readAt",
        ],
        { where: "id = ?" }
      );
      this.db.get(sql, [messageId], (err: Error | null, row?: any) => {
        if (err) return reject(err);
        if (!row) return resolve(null);
        try {
          resolve(Message.fromDbRow(row));
        } catch (e) {
          reject(e as any);
        }
      });
    });
  }

  updateMessageContent(messageId: number, newContent: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = buildUpdate(this.dialect, "messages", ["content"], "id = ?");
      this.db.run(sql, [newContent, messageId], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  softDeleteMessage(messageId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = buildUpdate(this.dialect, "messages", ["content"], "id = ?");
      this.db.run(sql, ["[deleted]", messageId], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  getMessagesForRoom(roomId: string): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      const sql = buildSelect(
        this.dialect,
        "messages",
        [
          "id",
          "authorId",
          "authorName",
          "content",
          "timestamp",
          "status",
          "sentAt",
          "deliveredAt",
          "readAt",
        ],
        { where: "roomId = ?" }
      );
      this.db.all(sql, [roomId], (err: Error | null, rows?: any[]) => {
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
      });
    });
  }

  markMessageDelivered(
    messageId: number,
    ts: number = Date.now()
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = buildUpdateParts(
        this.dialect,
        "messages",
        [
          "status = CASE WHEN status = 'read' THEN status ELSE 'delivered' END",
          "deliveredAt = COALESCE(deliveredAt, ?)",
        ],
        "id = ?"
      );
      this.db.run(sql, [ts, messageId], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  markMessageRead(messageId: number, ts: number = Date.now()): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = buildUpdateParts(
        this.dialect,
        "messages",
        [
          "status = 'read'",
          "readAt = ?",
          "deliveredAt = COALESCE(deliveredAt, ?)",
        ],
        "id = ?"
      );
      this.db.run(sql, [ts, ts, messageId], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  getUnreadCountsForUser(userId: string): Promise<Record<string, number>> {
    return new Promise((resolve, reject) => {
      const table = `messages m INNER JOIN user_rooms ur ON ur.roomId = m.roomId AND ur.userId = ?`;
      const columns = ["m.roomId as roomId", "COUNT(*) as cnt"];
      const where = `(m.authorId IS NULL OR m.authorId <> ?) AND (m.status IS NULL OR m.status <> 'read')`;
      const sql = buildSelect(this.dialect, table, columns, { where, groupBy: "m.roomId" });
      this.db.all(sql, [userId, userId], (err, rows: Array<{ roomId: string; cnt: number }> | undefined) => {
        if (err) return reject(err);
        const out: Record<string, number> = {};
        for (const r of rows || []) out[r.roomId] = Number(r.cnt) || 0;
        resolve(out);
      });
    });
  }
}
