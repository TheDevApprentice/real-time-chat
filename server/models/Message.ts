export class Message {
  private _authorId: string;
  private _authorName: string;
  private _content: string;
  private _timestamp: number;

  constructor(authorId: string, authorName: string, content: string, timestamp: number = Date.now()) {
    this._authorId = authorId;
    this._authorName = authorName;
    this._content = content;
    this._timestamp = timestamp;
  }

  get authorId(): string {
    return this._authorId;
  }

  set authorId(value: string) {
    this._authorId = value;
  }

  get authorName(): string {
    return this._authorName;
  }

  set authorName(value: string) {
    this._authorName = value;
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

  toJSON(): { authorId: string; authorName: string; content: string; timestamp: number } {
    return {
      authorId: this._authorId,
      authorName: this._authorName,
      content: this._content,
      timestamp: this._timestamp,
    };
  }
}
