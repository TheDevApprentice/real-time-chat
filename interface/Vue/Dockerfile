# ---------- Build stage ----------
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy only package manifests first for better layer caching
COPY package.json package-lock.json ./

# Install dependencies using npm (lockfile detected)
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the app for production
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:1.27-alpine AS runtime

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled app from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy our nginx config for SPA routing and compression
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port (the container will listen on 80)
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
