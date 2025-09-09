import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import cookieParser from "cookie-parser";
import router from "./api/routes/REST/index";
import { issueCsrfCookie, verifyCsrfToken } from "./api/middleware/csrf";
import helmet from "helmet";
import { WebSocketGateway } from "./api/routes/WS/index";
import { Logger } from "./utils/Logger";
import { RedisService } from "./domain/services/cacheServices/RedisService";

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
    if (typeof trustProxyEnv === "string") {
      const val = trustProxyEnv.trim().toLowerCase();
      if (val === "true") trustProxySetting = 1; // trust first proxy hop
      else if (val === "false" || val === "") trustProxySetting = false;
      else if (!isNaN(Number(val))) trustProxySetting = Number(val);
      else trustProxySetting = val; // e.g., IP subnet string
    }
    this.app.set("trust proxy", trustProxySetting);
    // Logger.infoObj("Dotenvx config Port", process.env.PORT);
    const portWanted = process.env.PORT;
    if (!portWanted) {
      throw new Error("PORT environment variable is not defined");
    }
    this.port = parseInt(portWanted, 10);
    this.setupMiddleware();
    this.setupRoutes();
    const sqliteFile = process.env.SQLITE_FILE;
    if (!sqliteFile) {
      throw new Error("SQLITE_FILE environment variable is not defined");
    }
    // Database schema is initialized by infrastructure/db/factory at connection time

    // Start WebSocket service
    new WebSocketGateway(this.server);
  }

  private setupMiddleware(): void {
    // Enable CORS for front-end
    const allowedOrigin = process.env.FRONTEND_URL;
    this.app.use(
      cors({
        origin: allowedOrigin,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: [
          "Content-Type",
          "Accept",
          "Accept-Language",
          "X-XSRF-TOKEN",
        ],
        optionsSuccessStatus: 204,
      })
    );
    this.app.use(express.json());
    this.app.use(cookieParser());
    // Security headers
    this.app.use(
      helmet({
        // Enable a CSP compatible with our static HTML and Socket.IO
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            // Inline style attributes exist in our HTML; allow them conservatively
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: [
              "'self'",
              "data:",
              // Allow images served from MinIO public base (if configured)
              ...(process.env.S3_PUBLIC_URL_BASE
                ? [new URL(process.env.S3_PUBLIC_URL_BASE).origin]
                : []),
            ],
            mediaSrc: [
              "'self'",
              "blob:",
              ...(process.env.S3_PUBLIC_URL_BASE
                ? [new URL(process.env.S3_PUBLIC_URL_BASE).origin]
                : []),
            ],
            // Allow API/WebSocket connections to self and configured frontend (dev)
            connectSrc: [
              "'self'",
              process.env.FRONTEND_URL || "'self'",
              "ws:",
              "wss:",
              // Some test UI pieces (e.g., data-URL shaders/workers) perform fetch/XHR to data/blob
              // Allowing data: and blob: for connect-src is safe for our local test pages
              "data:",
              "blob:",
            ],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            frameAncestors: ["'none'"],
          },
        },
        crossOriginEmbedderPolicy: false, // can conflict with sockets/wasm
        hsts: process.env.NODE_ENV === "production" ? undefined : false, // keep HSTS only in prod over HTTPS
      })
    );
    // Issue CSRF token cookie on safe requests (double-submit pattern)
    this.app.use(issueCsrfCookie);
    this.app.use(express.static(path.join(__dirname, "public")));
    this.app.disable("x-powered-by");
  }

  private setupRoutes(): void {
    // Serve SPA entry
    // Healthcheck
    this.app.get("/health", (req, res) => {
      res.status(200).json({ status: "ok" });
    });

    // SPA
    this.app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });
    // Verify CSRF token for mutating API requests
    this.app.use("/api", verifyCsrfToken);
    this.app.use("/api", router);
  }

  public start(): void {
    // Connect Redis (non-blocking) and handle graceful shutdown
    const redisService = RedisService.getInstance();
    redisService
      .connect()
      .then(() => Logger.info("Redis connected"))
      .catch((err) => Logger.warn(`Redis connect failed: ${String(err)}`));

    const shutdown = async (signal: string) => {
      try {
        Logger.info(`Received ${signal}, shutting down...`);
        await redisService.disconnect().catch(() => undefined);
        this.server.close(() => {
          Logger.info("HTTP server closed");
          process.exit(0);
        });
        // Force exit if close hangs
        setTimeout(() => process.exit(0), 5000).unref();
      } catch {
        process.exit(1);
      }
    };
    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));

    this.server.listen(this.port, () => {
      Logger.info(`Server listening on port ${this.port}`);
    });
  }
}

const app = new AppServer();
app.start();
