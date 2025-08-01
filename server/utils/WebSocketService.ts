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

      // Envoyer la liste des rooms à la connexion
      dbService.getRooms()
        .then((rooms) => {
          socket.emit('rooms', rooms.map((r) => r.toJSON()));
        })
        .catch((err: Error) => Logger.error(err.toString()));

      // Création d'une room
      socket.on('createRoom', async (data) => {
        try {
          const { name, creatorId } = data;
          if (!name || !creatorId) return;
          const Room = (await import('../models/Room')).Room;
          const room = new Room(name, creatorId);
          await dbService.addRoom(room);
          // Broadcast la nouvelle room à tous
          const rooms = await dbService.getRooms();
          this.io.emit('rooms', rooms.map((r) => r.toJSON()));
        } catch (err) {
          Logger.error(err instanceof Error ? err.message : String(err));
        }
      });

      // Récupérer la liste des rooms (à la demande)
      socket.on('getRooms', async () => {
        try {
          const rooms = await dbService.getRooms();
          socket.emit('rooms', rooms.map((r) => r.toJSON()));
        } catch (err) {
          Logger.error(err instanceof Error ? err.message : String(err));
        }
      });

      // Rejoindre une room (Socket.IO join)
      socket.on('joinRoom', async ({ roomId, userId }) => {
        try {
          if (!roomId || !userId) return;
          await dbService.addUserToRoom(userId, roomId);
          socket.join(roomId);
          // Envoyer l'historique des messages de la room
          const messages = await dbService.getMessagesForRoom(roomId);
          socket.emit('roomHistory', { roomId, messages: messages.map((m) => m.toJSON()) });
          // Envoyer la nouvelle liste des users de la room
          const users = await dbService.getUsersForRoom(roomId);
          this.io.to(roomId).emit('roomUsers', { roomId, users: users.map((u) => u.toJSON()) });
        } catch (err) {
          Logger.error(err instanceof Error ? err.message : String(err));
        }
      });

      // Envoyer un message dans une room
      socket.on('sendMessageToRoom', async (data) => {
        try {
          const { roomId, author, content, timestamp } = data;
          if (!roomId || !author || !author.id || !author.name || !content) return;
          // Vérifier/ajouter user
          let user = await dbService.getUserById(author.id);
          if (!user) {
            await dbService.addUser(new User(author.id, author.name));
          }
          const msgObj = new Message(new User(author.id, author.name), content, timestamp);
          await dbService.addMessageToRoom(msgObj, roomId);
          // Broadcast à la room uniquement
          this.io.to(roomId).emit('message', { roomId, message: msgObj.toJSON() });
        } catch (err) {
          Logger.error(err instanceof Error ? err.message : String(err));
        }
      });

      socket.on('disconnect', () => {
        Logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }
}
