# Deployment Guide - Crime Kickers Hub

This project uses automated deployment with GitHub Actions, GitHub Container Registry (ghcr.io), and Portainer.

## Architecture Overview

1. **Push to `master` branch** → GitHub Actions builds Docker image
2. **Image tagged with commit SHA** → Pushed to ghcr.io
3. **Deploy branch updated** → docker-compose.yml updated with new SHA tag
4. **Portainer webhook triggered** → Automatic redeployment

## Prerequisites

- GitHub repository with Actions enabled
- Portainer instance running
- Traefik reverse proxy configured (for HTTPS)
- Domain name pointing to your server

## Setup Steps

### 1. Configure GitHub Container Registry

The workflow automatically uses `GITHUB_TOKEN` to push to ghcr.io. No additional configuration needed for registry access.

### 2. Add GitHub Secrets

Go to: `https://github.com/korjavin/crimekickershub/settings/secrets/actions`

Add the following secret:

- **Name:** `PORTAINER_REDEPLOY_HOOK`
- **Value:** Your Portainer webhook URL (see step 4)

### 3. Set up Portainer Stack

**CRITICAL: Use the `deploy` branch, NOT the `master` branch!**

1. In Portainer, create a new stack named "crimekickershub"
2. **Repository settings:**
   - Repository URL: `https://github.com/korjavin/crimekickershub`
   - Reference: `refs/heads/deploy` ← **Use deploy branch!**
   - Compose path: `docker-compose.yml`
3. **Enable automatic updates** (webhook-based)

**Why the deploy branch?**
- The `deploy` branch contains SHA-tagged images (e.g., `ghcr.io/korjavin/crimekickershub:abc123...`)
- This ensures you know exactly which commit version is deployed
- The `master` branch uses `:latest` as a placeholder

### 4. Configure Environment Variables in Portainer

Add these environment variables in your Portainer stack:

#### Required Variables

```bash
# Domain Configuration
HOSTNAME=crimekickers.example.com
NETWORK_NAME=traefik_network

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URL=https://crimekickers.example.com/auth/callback
ALLOWED_EMAILS=admin@example.com,editor@example.com

# Cloudflare R2 Storage
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=crimekickers-media
R2_PUBLIC_URL=https://your-bucket.r2.dev

# Application
APP_ENV=production
SESSION_SECRET=generate-a-secure-random-string-here
DATABASE_PATH=/app/data/crimekickers.db
PORT=3000
```

#### Generating a Session Secret

```bash
openssl rand -base64 32
```

### 5. Get Portainer Webhook URL

1. Open your "crimekickershub" stack in Portainer
2. Navigate to **Webhooks** section
3. Click **Add webhook**
4. Copy the generated webhook URL
5. Add it to GitHub Secrets as `PORTAINER_REDEPLOY_HOOK`

### 6. Set up Traefik Network

Ensure Traefik network exists on your server:

```bash
docker network create traefik_network
```

Your Traefik configuration should include:

```yaml
version: "3.8"

services:
  traefik:
    image: traefik:v2.10
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.myresolver.acme.httpchallenge=true"
      - "--certificatesresolvers.myresolver.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.myresolver.acme.email=your-email@example.com"
      - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "./letsencrypt:/letsencrypt"
    networks:
      - traefik_network

networks:
  traefik_network:
    external: true
```

## Testing the Deployment

### First Deployment

1. Commit and push changes to `master` branch:
   ```bash
   git add .
   git commit -m "Initial deployment setup"
   git push origin master
   ```

2. Watch GitHub Actions workflow:
   - Go to: `https://github.com/korjavin/crimekickershub/actions`
   - Monitor the "Build and Deploy" workflow
   - Should complete in 5-10 minutes

3. Verify deploy branch was created:
   ```bash
   git fetch origin
   git checkout deploy
   git log -1  # Should show the deployment commit
   ```

4. Check Portainer:
   - Stack should show as "Updating" or "Running"
   - Container should be running with the new image

5. Access your application:
   ```
   https://crimekickers.example.com
   ```

### Subsequent Deployments

Simply push to `master`:

```bash
git push origin master
```

The workflow will automatically:
- Build new image with commit SHA
- Update deploy branch
- Trigger Portainer webhook
- Redeploy your application

## Monitoring

### View Logs

In Portainer:
1. Go to Containers
2. Click on "crimekickershub"
3. View logs in real-time

### Check Image Tag

```bash
git checkout deploy
grep "image:" docker-compose.yml
# Should show: ghcr.io/korjavin/crimekickershub:<full-sha>
```

### Verify Running Version

```bash
docker exec crimekickershub cat /etc/hostname
docker inspect crimekickershub | grep "Image"
```

## Troubleshooting

### Build Fails

Check GitHub Actions logs for errors:
- Frontend build errors (TypeScript, ESLint)
- Backend build errors (Go compilation)
- Docker build issues

### Webhook Not Triggering

1. Verify secret is set correctly in GitHub
2. Test webhook manually:
   ```bash
   curl -X POST "YOUR_WEBHOOK_URL"
   ```
3. Check Portainer logs

### Container Won't Start

Check logs in Portainer:
- Database connection issues
- Missing environment variables
- Port conflicts

### Traefik Not Routing

1. Verify network exists:
   ```bash
   docker network ls | grep traefik
   ```

2. Check container is connected:
   ```bash
   docker inspect crimekickershub | grep -A 5 Networks
   ```

3. Verify labels:
   ```bash
   docker inspect crimekickershub | grep -A 20 Labels
   ```

## Rollback

If a deployment fails, rollback to previous version:

```bash
# Find previous working commit
git log --oneline

# Update deploy branch to previous commit
git checkout deploy
git reset --hard <previous-commit-sha>
git push origin deploy --force

# Manually trigger Portainer webhook
curl -X POST "$PORTAINER_WEBHOOK_URL"
```

## Security Notes

1. **Never commit secrets** - Use Portainer environment variables
2. **Keep GitHub secrets secure** - Limit access to repository settings
3. **Use strong session secrets** - Rotate periodically
4. **Monitor access logs** - Check for unauthorized access
5. **Keep dependencies updated** - Regularly update base images

## Advanced Configuration

### Custom Build Arguments

Add build args to [.github/workflows/deploy.yml](.github/workflows/deploy.yml):

```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: ${{ steps.meta.outputs.tags }}
    build-args: |
      BUILD_DATE=${{ github.event.head_commit.timestamp }}
      VCS_REF=${{ github.sha }}
```

### Multiple Environments

Create separate Portainer stacks for staging/production with different environment variables.

### Database Backups

Add a backup script to run periodically:

```bash
# On your server
docker exec crimekickershub sqlite3 /app/data/crimekickers.db ".backup /app/data/backup-$(date +%Y%m%d).db"
```

## Support

For issues:
- Check [GitHub Issues](https://github.com/korjavin/crimekickershub/issues)
- Review Portainer and Traefik logs
- Verify environment variables are set correctly
