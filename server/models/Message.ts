export class Message {
  constructor(
    public authorId: string,
    public authorName: string,
    public content: string,
    public timestamp: number = Date.now()
  ) {}
}
