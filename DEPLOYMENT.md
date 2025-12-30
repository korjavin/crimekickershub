# Crime Kickers Hub - Deployment Guide

This document describes how to deploy Crime Kickers Hub using Portainer with GitHub Container Registry (ghcr.io) and Traefik as a reverse proxy.

## Prerequisites

- Docker and Docker Compose
- Portainer (installed and running)
- Traefik (with dashboard configured)
- A domain/subdomain pointing to your server
- GitHub account with repository access

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Traefik                               │
│                    (Reverse Proxy + SSL)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Portainer Stack                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           crimekickershub container                 │    │
│  │   ┌─────────────────────────────────────────────┐   │    │
│  │   │  Go Backend (API + Static Files)            │   │    │
│  │   └─────────────────────────────────────────────┘   │    │
│  │   ┌─────────────────────────────────────────────┐   │    │
│  │   │  SQLite Database (WAL mode)                 │   │    │
│  │   └─────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## 1. GitHub Container Registry Setup

### Enable GitHub Packages

1. Go to your repository: https://github.com/iv/crimekickershub
2. Navigate to **Settings** → **Packages**
3. Enable GitHub Packages for the repository

### Configure Authentication

The CI/CD pipeline uses GitHub's built-in authentication via `GITHUB_TOKEN`. No additional secrets are needed for pushing images.

## 2. GitHub Secrets Configuration

Add the following secrets to your GitHub repository (**Settings** → **Secrets and variables** → **Actions**):

### Required Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `PORTAINER_HOST` | Server IP or hostname | `192.168.1.100` |
| `PORTAINER_USERNAME` | SSH username for deployment | `deploy` |
| `PORTAINER_SSH_KEY` | Private SSH key (with sudo access) | `-----BEGIN OPENSSH PRIVATE KEY...` |

### Optional Secrets

| Secret Name | Description |
|------------|-------------|
| `TG_BOT_TOKEN` | Telegram bot token for notifications |
| `TG_CHAT_ID` | Telegram chat ID for notifications |

## 3. Server Setup

### Create Deployment Directory

```bash
# SSH into your server
ssh deploy@your-server

# Create deployment directory
sudo mkdir -p /opt/portainer/stacks/crimekickershub
cd /opt/portainer/stacks/crimekickershub

# Create required directories
sudo mkdir -p data
sudo mkdir -p sql

# Set permissions
sudo chown -R deploy:deploy /opt/portainer/stacks/crimekickershub
```

### Create .env File

Create `/opt/portainer/stacks/crimekickershub/.env`:

```env
# Database
DB_PATH=/data/crime-kickers.db

# Server
SERVER_ADDR=:8080
FRONTEND_PATH=/frontend/dist

# Google OAuth2
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URL=https://crimekickershub.example.com/auth/google/callback
ADMIN_EMAILS=admin@example.com,editor@example.com
COOKIE_SECRET=your-secure-random-string

# Cloudflare R2 Storage
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_BUCKET_NAME=crimekickershub
R2_PUBLIC_DOMAIN=https://your-bucket.r2.dev

# Telegram (optional)
TG_BOT_TOKEN=
TG_CHAT_ID=
```

### Pull Initial Image

```bash
docker pull ghcr.io/iv/crimekickershub:latest
```

## 4. Portainer Stack Configuration

### Option A: Create Stack via Portainer UI

1. Log in to Portainer
2. Navigate to **Stacks** → **Add stack**
3. Configure as follows:

**Name:** `crimekickershub`

**Web editor:** Copy contents from `docker-compose.yml`

**Environment variables:** Load from `.env` file or paste the environment variables from above

### Option B: Create Stack via CLI

Create `/opt/portainer/stacks/crimekickershub/docker-compose.yml`:

```yaml
version: '3.8'

services:
  crimekickershub:
    image: ghcr.io/iv/crimekickershub:latest
    container_name: crimekickershub
    restart: unless-stopped
    networks:
      - traefik_network
    ports:
      - "8080:8080"
    volumes:
      - ./.env:/app/.env:ro
      - crimekickers_data:/data
    environment:
      - DB_PATH=/data/crime-kickers.db
      - SERVER_ADDR=:8080
      - FRONTEND_PATH=/frontend/dist
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.crimekickershub-http.rule=Host(`crimekickershub.example.com`)"
      - "traefik.http.routers.crimekickershub-http.entrypoints=web"
      - "traefik.http.routers.crimekickershub-http.service=crimekickershub-service"
      - "traefik.http.routers.crimekickershub-https.rule=Host(`crimekickershub.example.com`)"
      - "traefik.http.routers.crimekickershub-https.entrypoints=websecure"
      - "traefik.http.routers.crimekickershub-https.tls.certresolver=letsencrypt"
      - "traefik.http.routers.crimekickershub-https.service=crimekickershub-service"
      - "traefik.http.routers.crimekickershub-http.middlewares=redirect-to-https@file"
      - "traefik.http.services.crimekickershub-service.loadbalancer.server.port=8080"
      - "traefik.http.services.crimekickershub-service.loadbalancer.healthcheck.path=/health"
      - "traefik.http.services.crimekickershub-service.loadbalancer.healthcheck.interval=30s"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

networks:
  traefik_network:
    external: true

volumes:
  crimekickers_data:
    driver: local
```

Deploy the stack:

```bash
cd /opt/portainer/stacks/crimekickershub
docker compose up -d
```

## 5. Traefik Configuration

### Create Traefik Network

```bash
docker network create traefik_network
```

### Configure Traefik Dynamic Config

Create `/etc/traefik/dynamic/middlewares.yml`:

```yaml
http:
  middlewares:
    redirect-to-https:
      redirectScheme:
        scheme: https
        permanent: true
    security-headers:
      headers:
        stsSeconds: 31536000
        stsIncludeSubdomains: true
        stsPreload: true
        forceSTSHeader: true
        contentTypeNosniff: true
        browserXssFilter: true
        referrerPolicy: "strict-origin-when-cross-origin"
        customFrameOptionsValue: "SAMEORIGIN"
```

### Restart Traefik

```bash
docker restart traefik
```

## 6. Initial Deployment

Once everything is configured:

1. Push your changes to the `main` branch
2. GitHub Actions will:
   - Build the Docker image
   - Push it to ghcr.io
   - Deploy to your server via SSH
3. Verify the deployment:
   ```bash
   docker logs crimekickershub --tail 100
   docker ps | grep crimekickershub
   ```

## 7. Verification

### Check Container Health

```bash
# Check container status
docker ps | grep crimekickershub

# Check container health status
docker inspect --format='{{.State.Health.Status}}' crimekickershub

# View logs
docker logs crimekickershub -f
```

### Test Application Endpoints

```bash
# Health check
curl http://localhost:8080/health

# API check
curl http://localhost:8080/api/health
```

## 8. Rolling Back

If a deployment fails, roll back using:

```bash
cd /opt/portainer/stacks/crimekickershub

# Roll back to previous version
docker pull ghcr.io/iv/crimekickershub:previous-sha
docker tag ghcr.io/iv/crimekickershub:previous-sha ghcr.io/iv/crimekickershub:latest
docker compose up -d crimekickershub

# Or use Docker's rollback feature
docker compose rollback
```

## 9. Troubleshooting

### Container won't start

```bash
# Check logs
docker logs crimekickershub

# Check if port is in use
netstat -tlnp | grep 8080

# Check permissions
ls -la /opt/portainer/stacks/crimekickershub/data/
```

### Database issues

```bash
# Access the database
docker exec -it crimekickershub sqlite3 /data/crime-kickers.db

# Check WAL mode
PRAGMA journal_mode;
```

### SSL certificate issues

```bash
# Check Traefik logs
docker logs traefik

# Force certificate renewal
docker exec traefik traefik --le --log.level=DEBUG
```

## 10. Maintenance

### Update Application

```bash
cd /opt/portainer/stacks/crimekickershub

# Pull latest image
docker pull ghcr.io/iv/crimekickershub:latest

# Restart with new image
docker compose up -d

# Check logs
docker logs -f crimekickershub
```

### Backup Database

```bash
# Create backup
cp /opt/portainer/stacks/crimekickershub/data/crime-kickers.db /backup/crime-kickers-$(date +%Y%m%d).db

# Or use Docker
docker exec crimekickershub cp /data/crime-kickers.db /tmp/backup.db
docker cp crimekickershub:/tmp/backup.db ./backup.db
```

### Monitor Resources

```bash
# View container stats
docker stats crimekickershub

# View disk usage
du -sh /opt/portainer/stacks/crimekickershub/data/

# View memory usage
docker memory usage
```
