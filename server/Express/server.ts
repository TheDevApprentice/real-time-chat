import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import cookieParser from 'cookie-parser';
import router from './routes';
import { issueCsrfCookie, verifyCsrfToken } from './middleware/csrf';
import helmet from 'helmet';
import { WebSocketService } from './utils/WebSocketService';
import { DatabaseService } from './utils/DatabaseService';
import { Logger } from './utils/Logger';

require("@dotenvx/dotenvx").config();

class AppServer {
  private app: express.Application;
  private server: http.Server;
  private port: number;

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    // Trust reverse proxy conditionally (needed for correct req.ip and X-Forwarded-For)
    // Set this BEFORE registering middleware/routes so rate limiting uses real client IPs
    const trustProxyEnv = process.env.TRUST_PROXY;
    let trustProxySetting: any = false;
    if (typeof trustProxyEnv === 'string') {
      const val = trustProxyEnv.trim().toLowerCase();
      if (val === 'true') trustProxySetting = 1; // trust first proxy hop
      else if (val === 'false' || val === '' ) trustProxySetting = false;
      else if (!isNaN(Number(val))) trustProxySetting = Number(val);
      else trustProxySetting = val; // e.g., IP subnet string
    }
    this.app.set('trust proxy', trustProxySetting);
    // Logger.infoObj("Dotenvx config Port", process.env.PORT);
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
    const dbService = DatabaseService.getInstance();
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
    // Security headers
    this.app.use(helmet({
      // Enable a CSP compatible with our static HTML and Socket.IO
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          // Inline style attributes exist in our HTML; allow them conservatively
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          // Allow API/WebSocket connections to self and configured frontend (dev)
          connectSrc: ["'self'", (process.env.FRONTEND_URL || "'self'"), 'ws:', 'wss:'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,       // can conflict with sockets/wasm
      hsts: process.env.NODE_ENV === 'production' ? undefined : false, // keep HSTS only in prod over HTTPS
    }));
    // Issue CSRF token cookie on safe requests (double-submit pattern)
    this.app.use(issueCsrfCookie);
    this.app.use(express.static(path.join(__dirname, 'public')));
    this.app.disable('x-powered-by');
  }

  private setupRoutes(): void {
    // Serve SPA entry
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
    // Verify CSRF token for mutating API requests
    this.app.use('/api', verifyCsrfToken);
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