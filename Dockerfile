# ============================================
# Crime Kickers Hub - Multi-Stage Docker Build
# ============================================

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Copy frontend package files
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Build the frontend
RUN npm run build

# Stage 2: Build Go backend
FROM golang:1.21-alpine AS backend-build

WORKDIR /app

# Copy Go module files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Copy built frontend from previous stage
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Build the Go binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server

# Stage 3: Production image (scratch for minimal size)
FROM scratch AS production

# Copy the binary
COPY --from=backend-build /app/server /server

# Copy the frontend dist directory
COPY --from=backend-build /app/frontend/dist /frontend/dist

# Copy the sql schema directory
COPY --from=backend-build /app/sql /sql

# Copy the .env file template (will be overridden by volume mount in compose)
COPY --from=backend-build /app/.env.example /.env.example

# Create non-root user for security
RUN addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -s /bin/sh -D appuser

# Set ownership
RUN chown -R appuser:appgroup /server /frontend /sql /.env.example

# Switch to non-root user
USER appuser

# Expose the application port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Set environment variables
ENV DB_PATH=/data/crime-kickers.db
ENV SERVER_ADDR=:8080
ENV FRONTEND_PATH=/frontend/dist

# Set working directory
WORKDIR /

# Run the server
ENTRYPOINT ["/server"]
