import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { DatabaseService } from './DatabaseService';
import { Logger } from './Logger';

export class WebSocketService {
  private io: SocketServer;

  constructor(httpServer: HttpServer) {
    this.io = new SocketServer(httpServer, {
      cors: { origin: '*' }
    });
    this.handleConnections();
  }

  private handleConnections(): void {
    require('@dotenvx/dotenvx').config()
    const sqliteFile = process.env.SQLITE_FILE;
    if (!sqliteFile) {
      throw new Error('SQLITE_FILE environment variable is not defined');
    }
    const dbService = DatabaseService.getInstance(sqliteFile);

    this.io.on('connection', (socket: Socket) => {
      Logger.info(`Client connected: ${socket.id}`);

      // Send message history
      dbService.getMessages()
        .then((history) => {
          // history is Message[]
          socket.emit('history', history.map((m: Message) => m.toJSON()));
        })
        .catch((err: Error) => Logger.error(err.toString()));

      // Handle incoming message
      socket.on('message', (msg : Message) => {
        if (!msg.author || !msg.author.id || !msg.author.name || !msg.content) {
          return;
        }
        dbService.getUserById(msg.author.id)
          .then(existingUser => {
            if (!existingUser) {
              return dbService.addUser(msg.author);
            }
          })
          .then(() => {
            const user = new User(msg.author.id, msg.author.name);
            const messageObj = new Message(user, msg.content, msg.timestamp);
            return dbService.addMessage(messageObj)
              .then(() => this.io.emit('message', messageObj.toJSON()));
          })
          .catch((err: Error) => Logger.error(err.toString()));
      });

      socket.on('disconnect', () => {
        Logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }
}
