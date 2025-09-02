import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import cookieParser from 'cookie-parser';
import router from './routes';
import { WebSocketService } from './utils/WebSocketService';
import { DatabaseService } from './utils/DatabaseService';
import { Logger } from './utils/Logger';

class AppServer {
  private app: express.Application;
  private server: http.Server;
  private port: number;

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    require('@dotenvx/dotenvx').config()
    Logger.infoObj("Dotenvx config Port", process.env.PORT);
    const portWanted = process.env.PORT;
    if (!portWanted) {
      throw new Error('PORT environment variable is not defined');
    }
    this.port = parseInt(portWanted, 10);
    this.setupMiddleware();
    this.setupRoutes();
    const sqliteFile = process.env.SQLITE_FILE;
    if (!sqliteFile) {
      throw new Error('SQLITE_FILE environment variable is not defined');
    }
    // Initialize database
    const dbService = DatabaseService.getInstance(sqliteFile);
    dbService.init();

    // Start WebSocket service
    new WebSocketService(this.server);
  }

  private setupMiddleware(): void {
    // Enable CORS for front-end
    const allowedOrigin = process.env.FRONTEND_URL;
    this.app.use(cors({
      origin: allowedOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Accept', 'Accept-Language', 'X-XSRF-TOKEN'],
      optionsSuccessStatus: 204,
    }));
    this.app.use(express.json());
    this.app.use(cookieParser());
    this.app.use(express.static(path.join(__dirname, 'public')));
  }

  private setupRoutes(): void {
    // Serve SPA entry
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
    this.app.use('/api', router);
  }

  public start(): void {
    this.server.listen(this.port, () => {
      Logger.info(`Server listening on port ${this.port}`);
    });
  }
}

const app = new AppServer();
app.start();