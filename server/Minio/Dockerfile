# Custom MinIO image with built-in bucket initialization
FROM minio/minio:latest

# Install MinIO client (mc)
# Alpine-based image: use apk to install curl then fetch mc
RUN /bin/sh -c "\
    if command -v apk >/dev/null 2>&1; then \
      apk add --no-cache curl; \
    fi; \
    curl -fsSL https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc && \
    chmod +x /usr/local/bin/mc"

# Copy entrypoint script
COPY init.sh /usr/local/bin/minio-entrypoint.sh
RUN chmod +x /usr/local/bin/minio-entrypoint.sh

# Default environment (can be overridden by compose)
ENV S3_BUCKET=chat-bucket

# Expose ports (documentary; compose will map)
EXPOSE 9000 9001

# Use our entrypoint to start minio then init bucket
ENTRYPOINT ["/usr/local/bin/minio-entrypoint.sh"]
CMD ["server", "/data", "--console-address", ":9001"]
