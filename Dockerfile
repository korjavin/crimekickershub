# syntax=docker/dockerfile:1

# Build stage for frontend
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy manifests first so `npm ci` is only re-run when dependencies change.
COPY frontend/package*.json ./

# Cache the npm download dir so warm builds skip re-downloading packages.
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy frontend source and build for production.
COPY frontend/ ./
RUN npm run build

# Build stage for Go backend
FROM golang:1.25-alpine AS backend-builder

WORKDIR /app

# Download modules into the layer filesystem (no cache mount) so a layer-cache
# hit on this step — go.mod/go.sum unchanged — also carries the modules along.
# A cache-mount here would write modules to a separate BuildKit volume that the
# GHA layer-cache import does not restore, leaving /go/pkg/mod empty for the
# build step and forcing a full re-download on every CI run.
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build. CGO_ENABLED=0 produces a static binary using the
# pure-Go SQLite driver (modernc.org/sqlite) — no C toolchain or sqlite-dev
# needed. Mount only the go-build cache here; mounting /go/pkg/mod would
# shadow the modules baked into the previous layer.
COPY . .
RUN --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

# Final stage - minimal runtime image
FROM alpine:latest

# ca-certificates for outbound HTTPS (S3, OAuth); tzdata for time zones.
# No sqlite-libs: SQLite is compiled into the static Go binary.
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Create directory for SQLite database
RUN mkdir -p /app/data

# Copy the compiled Go binary from backend-builder
COPY --from=backend-builder /app/server .

# Copy the built frontend from frontend-builder
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy SQL files (runtime migrations are embedded in the binary via go:embed;
# these are kept for parity with the previous image layout).
COPY sql/ ./sql/

# Expose port 8080
EXPOSE 8080

# Run the server
CMD ["./server"]
