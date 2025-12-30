# Quick Start - Deployment Setup

## What Was Created

1. **[Dockerfile](Dockerfile)** - Multi-stage build (Frontend → Backend → Final image)
2. **[docker-compose.yml](docker-compose.yml)** - Production configuration with Traefik
3. **[.github/workflows/deploy.yml](.github/workflows/deploy.yml)** - Automated CI/CD
4. **[.dockerignore](.dockerignore)** - Optimized build context
5. **[DEPLOYMENT.md](DEPLOYMENT.md)** - Full documentation

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│  1. Push to master branch                               │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  2. GitHub Actions:                                     │
│     - Builds Docker image (Frontend + Go backend)       │
│     - Tags with commit SHA (not :latest)                │
│     - Pushes to ghcr.io/korjavin/crimekickershub       │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  3. Updates 'deploy' branch:                            │
│     - Merges latest code from master                    │
│     - Updates docker-compose.yml with SHA tag           │
│     - Force pushes to deploy branch                     │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  4. Triggers Portainer webhook                          │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  5. Portainer:                                          │
│     - Watches 'deploy' branch (NOT master)              │
│     - Pulls new SHA-tagged image                        │
│     - Recreates container with new version              │
└─────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  6. Traefik routes HTTPS traffic to your app            │
│     - Automatic Let's Encrypt SSL                       │
│     - Routes ${HOSTNAME} → crimekickershub:8080         │
└─────────────────────────────────────────────────────────┘
```

## Architecture

### Container Structure
```
┌──────────────────────────────────────────┐
│ Alpine Linux (minimal)                   │
│                                          │
│  /app/                                   │
│  ├── server (Go binary)                  │
│  ├── frontend/dist/                      │
│  │   ├── index.html (React SPA)          │
│  │   ├── assets/                         │
│  │   └── ...                             │
│  ├── sql/                                │
│  │   └── schema/001_initial.sql          │
│  └── data/ (volume-mounted)              │
│      └── crimekickers.db (SQLite)        │
│                                          │
│  Port 8080 → Go Server                   │
│  ├── /api/* → API endpoints              │
│  └── /* → Frontend SPA (with fallback)   │
└──────────────────────────────────────────┘
```

### How Frontend is Served

The Go server ([cmd/server/main.go](cmd/server/main.go:99-106)):
- Serves static files from `frontend/dist`
- Falls back to `index.html` for SPA routing
- Handles all `/api/*` routes as backend endpoints
- Everything else → React app

## Minimal Setup (3 Steps)

### 1. Add GitHub Secret

```bash
# Go to: https://github.com/korjavin/crimekickershub/settings/secrets/actions
# Add: PORTAINER_REDEPLOY_HOOK = <your-webhook-url>
```

### 2. Create Portainer Stack

- **Name:** crimekickershub
- **Repository:** `https://github.com/korjavin/crimekickershub`
- **Branch:** `refs/heads/deploy` ← **IMPORTANT!**
- **File:** `docker-compose.yml`

### 3. Set Environment Variables in Portainer

**Minimal required:**
```bash
HOSTNAME=crimekickers.example.com
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URL=https://crimekickers.example.com/auth/callback
ADMIN_EMAILS=your@email.com
COOKIE_SECRET=$(openssl rand -base64 32)
```

**For R2 uploads (optional, app runs in degraded mode without):**
```bash
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=crimekickers-media
R2_PUBLIC_DOMAIN=https://your-bucket.r2.dev
```

## Deploy!

```bash
git add .
git commit -m "Initial deployment setup"
git push origin master
```

Watch: `https://github.com/korjavin/crimekickershub/actions`

## Environment Variables Reference

### What the Go Server Actually Uses

| Variable | Default | Purpose |
|----------|---------|---------|
| `SERVER_ADDR` | `:8080` | Server listen address |
| `FRONTEND_PATH` | `frontend/dist` | Path to built React app |
| `DB_PATH` | `data/crime-kickers.db` | SQLite database file |
| `GOOGLE_CLIENT_ID` | - | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | - | OAuth client secret |
| `GOOGLE_REDIRECT_URL` | - | OAuth callback URL |
| `ADMIN_EMAILS` | - | Comma-separated admin emails |
| `COOKIE_SECRET` | - | Session cookie encryption key |
| `R2_ACCOUNT_ID` | - | Cloudflare R2 account |
| `R2_ACCESS_KEY_ID` | - | R2 access key |
| `R2_SECRET_ACCESS_KEY` | - | R2 secret key |
| `R2_BUCKET_NAME` | - | R2 bucket name |
| `R2_PUBLIC_DOMAIN` | - | Public URL for R2 assets |

### Additional Docker Compose Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `HOSTNAME` | - | Domain for Traefik routing |
| `NETWORK_NAME` | `traefik_network` | Traefik network name |

## Troubleshooting

### Frontend Not Loading
```bash
# Check if files exist in container
docker exec crimekickershub ls -la /app/frontend/dist

# Check server logs
docker logs crimekickershub

# Should see: "StaticHandler: frontendPath=frontend/dist"
```

### Database Issues
```bash
# Check database path
docker exec crimekickershub ls -la /app/data

# Verify DB_PATH environment variable
docker exec crimekickershub env | grep DB_PATH
```

### Build Failures
- Check GitHub Actions logs for frontend or backend build errors
- Verify Node.js and Go versions match local development
- Check for TypeScript or ESLint errors

## Local Testing (Before Deployment)

Test the Docker build locally:

```bash
# Build the image
docker build -t crimekickershub-test .

# Run it with minimal env vars
docker run -p 8080:8080 \
  -e GOOGLE_CLIENT_ID=test \
  -e GOOGLE_CLIENT_SECRET=test \
  -e GOOGLE_REDIRECT_URL=http://localhost:8080/auth/callback \
  -e ADMIN_EMAILS=test@example.com \
  -e COOKIE_SECRET=test-secret-key \
  crimekickershub-test

# Visit: http://localhost:8080
```

## See Also

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Full deployment guide
- **[README.md](README.md)** - Project overview
- **[start.sh](start.sh)** - Local development script
