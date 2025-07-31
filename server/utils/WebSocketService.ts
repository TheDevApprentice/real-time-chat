import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';

export class WebSocketService {
  private io: SocketServer;

  constructor(httpServer: HttpServer) {
    this.io = new SocketServer(httpServer, {
      cors: { origin: '*' }
    });
    this.handleConnections();
  }

  private handleConnections(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on('message', (msg) => {
        this.io.emit('message', msg);
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }
}
