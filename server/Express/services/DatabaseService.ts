import { User, Room, Message, UserSession } from "../models/index";
import { CallbackDB } from "../db/adapters/callbackDb";
import { createCallbackDbFromEnv } from "../db/factory";
import {
  UsersRepo,
  RoomsRepo,
  MessagesRepo,
  SessionsRepo,
  FriendsRepo,
} from "../db/repos/Index";

export class DatabaseService {
  private static instance: DatabaseService;
  private db: CallbackDB;
  // Repositories
  private usersRepo!: UsersRepo;
  private roomsRepo!: RoomsRepo;
  private messagesRepo!: MessagesRepo;
  private sessionsRepo!: SessionsRepo;
  private friendsRepo!: FriendsRepo;

  private constructor() {
    // Use factory to select DB by env (default sqlite). filePath kept for backward compat.
    this.db = createCallbackDbFromEnv(process.env);
    // Instantiate repositories
    this.usersRepo = new UsersRepo(this.db);
    this.roomsRepo = new RoomsRepo(this.db);
    this.messagesRepo = new MessagesRepo(this.db);
    this.sessionsRepo = new SessionsRepo(this.db, this.usersRepo);
    this.friendsRepo = new FriendsRepo(this.db);
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  init(): void {
    this.db.serialize(() => {
      this.db.run(
        `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        password TEXT NOT NULL
      )`,
        undefined,
        () => {}
      );
      this.db.run(
        `CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        creatorId TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        type TEXT DEFAULT 'room',
        isPublic INTEGER DEFAULT 1
      )`,
        undefined,
        () => {}
      );
      this.db.run(
        `CREATE TABLE IF NOT EXISTS user_rooms (
        userId TEXT NOT NULL,
        roomId TEXT NOT NULL,
        PRIMARY KEY (userId, roomId),
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (roomId) REFERENCES rooms(id)
      )`,
        undefined,
        () => {}
      );
      this.db.run(
        `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        authorId TEXT,
        authorName TEXT,
        content TEXT,
        timestamp INTEGER,
        roomId TEXT NOT NULL,
        status TEXT DEFAULT 'sent',
        sentAt INTEGER,
        deliveredAt INTEGER,
        readAt INTEGER,
        FOREIGN KEY (roomId) REFERENCES rooms(id)
      )`,
        undefined,
        () => {}
      );
      this.db.run(
        `CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        token TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        expiresAt INTEGER,
        refreshToken TEXT,
        refreshTokenExpiresAt INTEGER,
        FOREIGN KEY (userId) REFERENCES users(id)
      )`,
        undefined,
        () => {}
      );
      // Migration : ajoute les colonnes si elles n'existent pas
      this.db.run(
        `ALTER TABLE user_sessions ADD COLUMN refreshToken TEXT`,
        undefined,
        () => {}
      );
      this.db.run(
        `ALTER TABLE user_sessions ADD COLUMN refreshTokenExpiresAt INTEGER`,
        undefined,
        () => {}
      );
      // Index pour accélérer la recherche par refreshToken
      this.db.run(
        `CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh ON user_sessions(refreshToken)`,
        undefined,
        () => {}
      );
      // Rooms migrations (SQLite ne supporte pas IF NOT EXISTS pour ADD COLUMN avant 3.35) :
      // on tente et on ignore l'erreur si la colonne existe déjà
      this.db.run(
        `ALTER TABLE rooms ADD COLUMN type TEXT DEFAULT 'room'`,
        undefined,
        () => {}
      );
      this.db.run(
        `ALTER TABLE rooms ADD COLUMN isPublic INTEGER DEFAULT 1`,
        undefined,
        () => {}
      );
      // Friends table: pair relationship with status and requester
      this.db.run(
        `CREATE TABLE IF NOT EXISTS friends (
        id TEXT PRIMARY KEY,
        userA TEXT NOT NULL,
        userB TEXT NOT NULL,
        status TEXT NOT NULL, -- 'pending' | 'accepted'
        requesterId TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        UNIQUE(userA, userB),
        FOREIGN KEY (userA) REFERENCES users(id),
        FOREIGN KEY (userB) REFERENCES users(id)
      )`,
        undefined,
        () => {}
      );
      // For fast lookups
      this.db.run(
        `CREATE INDEX IF NOT EXISTS idx_friends_userA ON friends(userA)`,
        undefined,
        () => {}
      );
      this.db.run(
        `CREATE INDEX IF NOT EXISTS idx_friends_userB ON friends(userB)`,
        undefined,
        () => {}
      );
      // Logger.info("Database tables initialized (users, rooms, user_rooms, messages, user_sessions)");
    });
  }

  addUser(user: User): Promise<User> {
    return this.usersRepo.addUser(user);
  }

  getUsers(): Promise<User[]> {
    return this.usersRepo.getUsers();
  }

  getUserById(id: string): Promise<User | undefined> {
    return this.usersRepo.getUserById(id);
  }
  // Créer une room
  addRoom(
    room: import("../models/Room").Room
  ): Promise<import("../models/Room").Room> {
    return this.roomsRepo.addRoom(room as Room);
  }

  // Lister toutes les rooms
  async getRooms(): Promise<Room[]> {
    return this.roomsRepo.getRooms();
  }

  // Récupérer une room par ID
  async getRoomById(id: string): Promise<Room | undefined> {
    return this.roomsRepo.getRoomById(id);
  }

  // Ajouter un user à une room
  addUserToRoom(userId: string, roomId: string): Promise<void> {
    return this.roomsRepo.addUserToRoom(userId, roomId);
  }

  // Vérifier si un user est membre d'une room
  async isUserInRoom(userId: string, roomId: string): Promise<boolean> {
    return this.roomsRepo.isUserInRoom(userId, roomId);
  }

  // Ajouter plusieurs users à une room
  async addUsersToRoomBulk(userIds: string[], roomId: string): Promise<void> {
    return this.roomsRepo.addUsersToRoomBulk(userIds, roomId);
  }

  // Lister les rooms d’un user
  async getRoomsForUser(userId: string): Promise<Room[]> {
    return this.roomsRepo.getRoomsForUser(userId);
  }

  // Lister les rooms visibles pour un utilisateur: publiques OU membership
  async getVisibleRoomsForUser(userId: string): Promise<Room[]> {
    return this.roomsRepo.getVisibleRoomsForUser(userId);
  }

  // Lister les users d’une room
  getUsersForRoom(roomId: string): Promise<import("../models/User").User[]> {
    return this.roomsRepo.getUsersForRoom(roomId);
  }

  // Ajouter un message dans une room
  addMessageToRoom(message: Message, roomId: string): Promise<void> {
    return this.messagesRepo.addMessageToRoom(message, roomId);
  }

  // Récupérer les messages d’une room
  getMessagesForRoom(roomId: string): Promise<Message[]> {
    return this.messagesRepo.getMessagesForRoom(roomId);
  }

  // [Optionnel] Récupérer toutes les rooms avec leurs users
  getRoomsAndUsers(): Promise<
    {
      room: import("../models/Room").Room;
      users: import("../models/User").User[];
    }[]
  > {
    return this.roomsRepo.getRoomsAndUsers();
  }
  // --- SESSION MANAGEMENT ---
  addUserSession(session: UserSession): Promise<void> {
    return this.sessionsRepo.addUserSession(session);
  }

  // Supprimer toutes les sessions d'un utilisateur
  async deleteAllUserSessionsByUserId(userId: string): Promise<void> {
    return this.sessionsRepo.deleteAllUserSessionsByUserId(userId);
  }

  // Lister toutes les sessions d'un utilisateur
  async getUserSessionsByUserId(userId: string): Promise<UserSession[]> {
    return this.sessionsRepo.getUserSessionsByUserId(userId);
  }

  // Récupérer une session utilisateur par token
  async getUserSessionByToken(token: string): Promise<UserSession | null> {
    return this.sessionsRepo.getUserSessionByToken(token);
  }

  deleteUserSession(token: string): Promise<void> {
    return this.sessionsRepo.deleteUserSession(token);
  }

  // Lookup direct par refreshToken
  async getUserSessionByRefreshToken(
    refreshToken: string
  ): Promise<UserSession | null> {
    return this.sessionsRepo.getUserSessionByRefreshToken(refreshToken);
  }

  // --- USERS SEARCH ---
  async searchUsersByName(query: string, limit = 20): Promise<User[]> {
    return this.usersRepo.searchUsersByName(query, limit);
  }

  // --- FRIENDS ---
  private orderPair(a: string, b: string): { a: string; b: string } {
    return a < b ? { a, b } : { a: b, b: a };
  }

  async createFriendRequest(
    requesterId: string,
    targetUserId: string
  ): Promise<{
    id: string;
    status: "pending";
    userA: string;
    userB: string;
    requesterId: string;
    createdAt: number;
    updatedAt: number;
  }> {
    return this.friendsRepo.createFriendRequest(requesterId, targetUserId);
  }

  async respondFriendRequest(
    userId: string,
    otherUserId: string,
    action: "accept" | "reject"
  ) {
    return this.friendsRepo.respondFriendRequest(userId, otherUserId, action);
  }

  async listFriendsAndRequests(userId: string) {
    return this.friendsRepo.listFriendsAndRequests(userId);
  }

  // --- MESSAGE STATUS UPDATES ---
  async markMessageDelivered(
    messageId: number,
    ts: number = Date.now()
  ): Promise<void> {
    return this.messagesRepo.markMessageDelivered(messageId, ts);
  }

  async markMessageRead(
    messageId: number,
    ts: number = Date.now()
  ): Promise<void> {
    return this.messagesRepo.markMessageRead(messageId, ts);
  }

  // --- UNREAD COUNTS (global status-based per room) ---
  // Count messages for rooms where the user is a member, authored by others,
  // and whose status is not 'read'.
  async getUnreadCountsForUser(
    userId: string
  ): Promise<Record<string, number>> {
    return this.messagesRepo.getUnreadCountsForUser(userId);
  }
}
