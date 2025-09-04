import { randomUUID } from 'crypto';
import { User } from './User';

export type MessageStatus = 'sent' | 'delivered' | 'read';

export class Message {
  private _id: string;
  private _author: User;
  private _content: string;
  private _timestamp: number;
  private _status: MessageStatus;
  private _sentAt?: number;
  private _deliveredAt?: number;
  private _readAt?: number;

  constructor(
    author: User,
    content: string,
    timestamp: number = Date.now(),
    status: MessageStatus = 'sent',
    sentAt?: number,
    deliveredAt?: number,
    readAt?: number,
  ) {
    this._id = randomUUID();
    this._author = author;
    this._content = content;
    this._timestamp = timestamp;
    this._status = status;
    this._sentAt = sentAt ?? timestamp;
    this._deliveredAt = deliveredAt;
    this._readAt = readAt;
  }

  get id(): string { return this._id; }
  set id(value: string) { this._id = value; }

  get author(): User { return this._author; }
  set author(value: User) { this._author = value; }

  get content(): string { return this._content; }
  set content(value: string) { this._content = value; }

  get timestamp(): number { return this._timestamp; }
  set timestamp(value: number) { this._timestamp = value; }

  get status(): MessageStatus { return this._status; }
  set status(value: MessageStatus) { this._status = value; }

  get sentAt(): number | undefined { return this._sentAt; }
  set sentAt(value: number | undefined) { this._sentAt = value; }

  get deliveredAt(): number | undefined { return this._deliveredAt; }
  set deliveredAt(value: number | undefined) { this._deliveredAt = value; }

  get readAt(): number | undefined { return this._readAt; }
  set readAt(value: number | undefined) { this._readAt = value; }

  toJSON(): {
    id: string;
    author: ReturnType<User['toJSON']>;
    content: string;
    timestamp: number;
    status: MessageStatus;
    sentAt?: number;
    deliveredAt?: number;
    readAt?: number;
  } {
    return {
      id: this._id,
      author: this._author.toJSON(),
      content: this._content,
      timestamp: this._timestamp,
      status: this._status,
      sentAt: this._sentAt,
      deliveredAt: this._deliveredAt,
      readAt: this._readAt,
    };
  }

  // Factory for DB rows
  static fromDbRow(row: {
    id: number;
    authorId: string;
    authorName: string;
    content: string;
    timestamp: number;
    status?: string;
    sentAt?: number;
    deliveredAt?: number;
    readAt?: number;
  }): Message {
    const user = new User(row.authorId, row.authorName, '');
    const status = (row.status as MessageStatus) ?? 'sent';
    const msg = new Message(user, row.content, row.timestamp, status, row.sentAt, row.deliveredAt, row.readAt);
    // Use DB id as stable string identifier
    msg.id = String(row.id);
    return msg;
  }
}
