import { randomUUID } from 'crypto';
import { User } from './User';

export class Message {
  private _id: string;
  private _author: User;
  private _content: string;
  private _timestamp: number;

  constructor(author: User, content: string, timestamp: number = Date.now()) {
    this._id = randomUUID();
    this._author = author;
    this._content = content;
    this._timestamp = timestamp;
  }

  get author(): User {
    return this._author;
  }

  set author(value: User) {
    this._author = value;
  }

  get content(): string {
    return this._content;
  }

  set content(value: string) {
    this._content = value;
  }

  get timestamp(): number {
    return this._timestamp;
  }

  set timestamp(value: number) {
    this._timestamp = value;
  }

  toJSON(): { id: string; author: ReturnType<User['toJSON']>; content: string; timestamp: number } {
    return {
      id: this._id,
      author: this._author.toJSON(),
      content: this._content,
      timestamp: this._timestamp,
    };
  }

  // Factory for DB rows
  static fromDbRow(row: { authorId: string; authorName: string; content: string; timestamp: number }): Message {
    const user = new User(row.authorId, row.authorName);
    return new Message(user, row.content, row.timestamp);
  }
}
