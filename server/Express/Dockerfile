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

EXPOSE 3080
CMD ["node", "dist/server.js"]
