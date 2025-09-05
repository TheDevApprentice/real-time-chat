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

ENV NODE_ENV=production

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled app and public assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./dist/public

# Data directory for SQLite (mounted as a volume)
VOLUME ["/data"]

# Default envs (override in compose)
ENV PORT=3080
ENV FRONTEND_URL=http://localhost:3080
ENV TRUST_PROXY=false
ENV BCRYPT_COST=12
ENV REDIS_URL=redis://:changeme@redis:6379
ENV S3_ENDPOINT=http://minio:9000
ENV S3_REGION=us-east-1
ENV S3_BUCKET=chat-bucket
ENV S3_USE_PATH_STYLE="true"
# Base URL for public access from host (used to form public links)
ENV S3_PUBLIC_URL_BASE=http://localhost:9000/chat-bucket

# Add a healthcheck
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:3080/health || exit 1

EXPOSE 3080
CMD ["node", "dist/server.js"]
