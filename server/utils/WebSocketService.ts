import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { DatabaseService } from './DatabaseService';

export class WebSocketService {
  private io: SocketServer;

  constructor(httpServer: HttpServer) {
    this.io = new SocketServer(httpServer, {
      cors: { origin: '*' }
    });
    this.handleConnections();
  }

  private handleConnections(): void {
    const dbService = DatabaseService.getInstance(process.env.SQLITE_FILE!);

    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Send message history
      dbService.getMessages()
        .then((history: Array<{ authorId: string; authorName: string; content: string; timestamp: number }>) => socket.emit('history', history))
        .catch((err: Error) => console.error(err));

      // Handle incoming message
      socket.on('message', (msg: { authorId: string; authorName: string; content: string; timestamp: number }) => {
        dbService.addMessage(msg.authorId, msg.authorName, msg.content, msg.timestamp)
          .then(() => this.io.emit('message', msg))
          .catch((err: Error) => console.error(err));
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }
}
