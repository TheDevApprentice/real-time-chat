# server/Database/SqlLite/Dockerfile
# Lightweight image that provides sqlite3 CLI and a persistent /data mount
FROM alpine:3.20

# Install sqlite3 CLI
RUN apk add --no-cache sqlite

# Data directory exposed as a volume
VOLUME ["/data"]

# Default database file path (can be overridden)
ENV SQLITE_FILE=/data/chat.sqlite

# Copy optional init script (no-op if not provided)
# You can later add an init.sql in this directory; it will be loaded on first boot
# COPY ./init.sql /docker-entrypoint-initdb.d/init.sql

# Create an entrypoint that ensures /data exists and keeps the container running
# If init.sql exists and database doesn't, initialize it once
RUN printf '#!/bin/sh\nset -e\nmkdir -p /data\nif [ -f /docker-entrypoint-initdb.d/init.sql ] && [ ! -f "$SQLITE_FILE" ]; then\n  echo "[sqlite] initializing database at $SQLITE_FILE"\n  sqlite3 "$SQLITE_FILE" < /docker-entrypoint-initdb.d/init.sql || true\nfi\n# Keep the container alive; you can exec into it: docker exec -it <ctr> sqlite3 /data/chat.sqlite\ntail -f /dev/null\n' > /usr/local/bin/entrypoint.sh \
 && chmod +x /usr/local/bin/entrypoint.sh

CMD ["/usr/local/bin/entrypoint.sh"]
