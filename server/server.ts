import express from 'express';
import http from 'http';
import path from 'path';
import router from './routes';
import { WebSocketService } from './utils/WebSocketService';

class AppServer {
  private app: express.Application;
  private server: http.Server;
  private port: number;

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    require('@dotenvx/dotenvx').config()
    console.log("Dotenvx config Port", process.env.PORT);
    const portWanted = process.env.PORT;
    if (!portWanted) {
      throw new Error('PORT environment variable is not defined');
    }
    this.port = parseInt(portWanted, 10);
    this.setupMiddleware();
    this.setupRoutes();
    new WebSocketService(this.server);
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
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
      console.log(`Server listening on port ${this.port}`);
    });
  }
}

const app = new AppServer();
app.start();