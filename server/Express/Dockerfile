# server/Dockerfile
# ============ Builder =============
FROM node:20-alpine AS builder
WORKDIR /app

# Install build deps
COPY package*.json ./
RUN npm ci

# Copy source
COPY tsconfig.json ./
COPY . ./

# Build TypeScript to dist/
RUN npm run build

# ============ Runtime =============
FROM node:20-alpine AS runtime
WORKDIR /app

# ENV NODE_ENV=production

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled app and public assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./dist/public

# Data directory for SQLite (mounted as a volume)
VOLUME ["/data"]

# # Default envs (override in compose)
# ENV NODE_ENV=production
# ENV DEBUG=true
# ENV PORT=3080
# ENV FRONTEND_URL=https://5badc65738f02a.lhr.life
# ENV TRUST_PROXY=true
# ENV BCRYPT_COST=12
# ENV REDIS_URL=redis://:changeme@redis:6379
# ENV REDIS_HOST=redis
# ENV REDIS_PORT=6379
# ENV REDIS_USER=changeme
# ENV REDIS_PASSWORD=changeme
# ENV REDIS_TLS=false
# ENV S3_ENDPOINT=http://minio:9000
# ENV S3_REGION=us-east-1
# ENV S3_ACCESS_KEY=admin
# ENV S3_SECRET_KEY=adminadmin123
# ENV S3_BUCKET=chat-bucket
# ENV S3_USE_PATH_STYLE=true
# ENV S3_PUBLIC_URL_BASE=https://5badc65738f02a.lhr.life/minio/chat-bucket
# ENV DATABASE_DRIVER=mariadb
# ENV MARIADB_HOST=proxysql
# ENV MARIADB_PORT=6033
# ENV MARIADB_DB=chat
# ENV MARIADB_USER=chat
# ENV MARIADB_PASSWORD=chat
# ENV MARIADB_SSL=false
# ENV MARIADB_HOST_BACKUP=mariadb_backup
# ENV MARIADB_PORT_BACKUP=3306
# ENV MARIADB_DB_BACKUP=chat_backup
# ENV MARIADB_USER_BACKUP=chat_backup
# ENV MARIADB_PASSWORD_BACKUP=chat_backup
# ENV MARIADB_SSL_BACKUP=false
# ENV WEBRTC_STUN=stun:stun.l.google.com:19302
# ENV WEBRTC_TURN_URLS=turn:turn:3478
# ENV WEBRTC_TURN_USERNAME=devuser
# ENV WEBRTC_TURN_CREDENTIAL=devpass
# ENV MARIADB_PASSWORD_BACKUP=chat_backup
# ENV MARIADB_SSL_BACKUP=false
# ENV WEBRTC_STUN=stun:stun.l.google.com:19302
# ENV WEBRTC_TURN_URLS=turn:turn:3478
# ENV WEBRTC_TURN_USERNAME=devuser
# ENV WEBRTC_TURN_CREDENTIAL: devpass
# # ENV WEBRTC_TURN_URLS=turn:openrelay.metered.ca:80
# # ENV WEBRTC_TURN_USERNAME=openrelayproject
# # ENV WEBRTC_TURN_CREDENTIAL: openrelayproject
# ENV CALL_RING_TIMEOUT: 20

# Install curl for HEALTHCHECK (Alpine image doesn't include it by default)
RUN apk add --no-cache curl
# # Add a healthcheck
# HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
#   CMD curl -f http://localhost:3080/health || exit 1

EXPOSE 3080
CMD ["node", "dist/server.js"]
