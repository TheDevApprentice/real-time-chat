import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { DatabaseService } from './DatabaseService';
import { Logger } from './Logger';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

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

      // AUTH: Register
      socket.on('register', async (data, callback) => {
        const { username, password, confirmPassword } = data;
        Logger.info(`Register attempt: ${username}`);
        Logger.info(`Register attempt: ${password}`);
        Logger.info(`Register attempt: ${confirmPassword}`);
        if (!username || !password || !confirmPassword) {
          return callback && callback({ error: 'All fields are required.' });
        }
        if (password !== confirmPassword) {
          return callback && callback({ error: 'Passwords do not match.' });
        }
        try {
          const users = await dbService.getUsers();
          if (users.find(u => u.name === username)) {
            return callback && callback({ error: 'Username already exists.' });
          }
          const hashed = await bcrypt.hash(password, 10);
          Logger.info(`Hashed password: ${hashed}`);
          const newUser = new User(randomUUID(), username, hashed);
          Logger.infoObj("newUser: ", newUser.toJSON().name);
          await dbService.addUser(newUser);
          callback && callback({ id: newUser.id, name: newUser.name });
        } catch (err) {
          callback && callback({ error: 'Registration failed.' });
        }
      });

      // AUTH: Login
      socket.on('login', async (data, callback) => {
        const { username, password } = data;
        if (!username || !password) {
          return callback && callback({ error: 'Username and password required.' });
        }
        try {
          const users = await dbService.getUsers();
          const user = users.find(u => u.name === username);
          if (!user) {
            return callback && callback({ error: 'Invalid credentials.' });
          }
          const valid = await bcrypt.compare(password, user.password);
          if (!valid) {
            return callback && callback({ error: 'Invalid credentials.' });
          }
          // Stocker l'ID utilisateur sur le socket
          socket.data.userId = user.id;
          callback && callback({ id: user.id, name: user.name });
        } catch (err) {
          callback && callback({ error: 'Login failed.' });
        }
      });

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
      socket.on('joinRoom', async ({ roomId }) => {
        try {
          const userId = socket.data.userId;
          if (!roomId || !userId) {
            socket.emit('error', { error: 'Not authenticated or missing roomId.' });
            return;
          }
          // Vérifier que l'utilisateur existe
          const user = await dbService.getUserById(userId);
          if (!user) {
            socket.emit('error', { error: 'User not found.' });
            return;
          }
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
          const { roomId, content, timestamp } = data;
          const userId = socket.data.userId;
          if (!roomId || !userId || !content) {
            socket.emit('error', { error: 'Not authenticated or missing data.' });
            return;
          }
          // Vérifier que l'utilisateur existe
          const user = await dbService.getUserById(userId);
          if (!user) {
            socket.emit('error', { error: 'User not found.' });
            return;
          }
          const msgObj = new Message(user, content, timestamp);
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
