# Use the official Node.js runtime as the base image
FROM node:24-alpine AS build

# Set the working directory in the container
WORKDIR /app

# Copy package files for the monorepo
COPY package*.json ./
COPY packages/fossflow-lib/package*.json ./packages/fossflow-lib/
COPY packages/fossflow-app/package*.json ./packages/fossflow-app/

# Install dependencies for the entire workspace
RUN npm install

# Copy the entire monorepo code
COPY . .

# Build the library first, then the app
RUN npm run build:lib && npm run build:app

# Use minimal Alpine-based Node image for production
FROM node:24-alpine

# Add OCI labels for supply chain attestation
LABEL org.opencontainers.image.source="https://github.com/fossflow/fossflow"
LABEL org.opencontainers.image.description="FossFLOW - Open source diagramming tool"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.vendor="FossFLOW"

# Upgrade all Alpine packages to patch security vulnerabilities
RUN apk upgrade --no-cache

# Upgrade npm and fix vulnerabilities in bundled packages (tar, glob)
RUN npm install -g npm@latest tar@7.5.7 glob@11.1.0

# Install nginx
RUN apk add --no-cache nginx

# Create non-root user and group
RUN addgroup -S fossflow && adduser -S -G fossflow -s /sbin/nologin fossflow

# Copy backend code and install production dependencies
COPY --from=build /app/packages/fossflow-backend /app/packages/fossflow-backend
WORKDIR /app/packages/fossflow-backend
RUN npm install --omit=dev
WORKDIR /

# Copy the built React app to Nginx's web server directory
COPY --from=build /app/packages/fossflow-app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/http.d/default.conf

# Copy and set up entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create data directory for persistent storage and set permissions
RUN mkdir -p /data/diagrams && \
    mkdir -p /run/nginx && \
    chown -R fossflow:fossflow /data/diagrams && \
    chown -R fossflow:fossflow /app && \
    chown -R fossflow:fossflow /usr/share/nginx/html && \
    chown -R fossflow:fossflow /var/lib/nginx && \
    chown -R fossflow:fossflow /var/log/nginx && \
    chown -R fossflow:fossflow /run/nginx

# Expose ports (non-privileged)
EXPOSE 8080 3001

# Environment variables with defaults
ENV ENABLE_SERVER_STORAGE=true
ENV STORAGE_PATH=/data/diagrams
ENV BACKEND_PORT=3001

# Switch to non-root user
USER fossflow

# Start services
ENTRYPOINT ["/docker-entrypoint.sh"]