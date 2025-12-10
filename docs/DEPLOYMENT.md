# Bakame AI - Deployment Guide

## VPS Requirements

**Minimum Specs (Your Setup):**
- 4 vCPU
- 8GB RAM
- 50GB+ SSD
- Ubuntu 22.04 LTS

**This handles:**
- Next.js app (Bakame)
- n8n workflow engine
- PostgreSQL database
- Redis cache
- Nginx reverse proxy

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        YOUR VPS                              │
│                    (4 CPU / 8GB RAM)                         │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Bakame    │  │    n8n      │  │  PostgreSQL │          │
│  │  (Next.js)  │  │  (Workflows)│  │  (Database) │          │
│  │  Port 3000  │  │  Port 5678  │  │  Port 5432  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│         │                │                │                  │
│         └────────────────┼────────────────┘                  │
│                          │                                   │
│                    ┌─────────────┐                           │
│                    │    Nginx    │                           │
│                    │  (Reverse   │                           │
│                    │   Proxy)    │                           │
│                    │  Port 80/443│                           │
│                    └─────────────┘                           │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │
                      Internet
                           │
              ┌────────────┴────────────┐
              │                         │
        bakame.ai              n8n.bakame.ai
```

---

## Quick Start (Docker Compose)

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/bakame-ai.git
cd bakame-ai
```

### 2. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# OpenAI
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4-turbo

# n8n
N8N_BASE_URL=https://n8n.yourdomain.com
N8N_WEBHOOK_PATH=/webhook

# Optional APIs
OPENWEATHER_API_KEY=
EXCHANGE_RATE_API_KEY=
TAVILY_API_KEY=
NEWS_API_KEY=
```

### 3. Deploy with Docker Compose

```bash
# Create docker-compose.yml (see below)
docker-compose up -d
```

---

## Docker Compose Configuration

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  # Bakame AI (Next.js)
  bakame:
    build: .
    container_name: bakame
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - postgres

  # n8n Workflow Engine
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=n8n.yourdomain.com
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://n8n.yourdomain.com/
      - GENERIC_TIMEZONE=Africa/Kigali
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=your_secure_password
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres

  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=bakame
      - POSTGRES_PASSWORD=your_db_password
      - POSTGRES_DB=bakame
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  # Redis Cache (Optional but recommended)
  redis:
    image: redis:7-alpine
    container_name: redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - bakame
      - n8n

volumes:
  n8n_data:
  postgres_data:
  redis_data:
```

---

## Nginx Configuration

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    # Bakame AI
    server {
        listen 80;
        server_name bakame.ai www.bakame.ai;

        location / {
            proxy_pass http://bakame:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }

    # n8n Workflows
    server {
        listen 80;
        server_name n8n.bakame.ai;

        location / {
            proxy_pass http://n8n:5678;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            # Increase timeouts for long-running workflows
            proxy_read_timeout 300s;
            proxy_connect_timeout 300s;
        }
    }
}
```

---

## SSL with Let's Encrypt

```bash
# Install certbot
apt install certbot python3-certbot-nginx -y

# Get certificates
certbot --nginx -d bakame.ai -d www.bakame.ai -d n8n.bakame.ai

# Auto-renewal (already configured by certbot)
certbot renew --dry-run
```

---

## Manual Deployment (Without Docker)

### 1. Install Dependencies

```bash
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install nodejs -y

# PM2 for process management
npm install -g pm2

# PostgreSQL
apt install postgresql postgresql-contrib -y

# Redis
apt install redis-server -y
```

### 2. Build Bakame

```bash
cd bakame-ai
npm install
npm run build
```

### 3. Run with PM2

```bash
pm2 start npm --name "bakame" -- start
pm2 save
pm2 startup
```

### 4. Install n8n

```bash
npm install -g n8n
n8n start --tunnel  # For testing
# Or run as service with PM2
pm2 start n8n --name "n8n"
```

---

## Memory Allocation (8GB RAM)

| Service | Recommended | Min |
|---------|-------------|-----|
| Bakame (Next.js) | 2GB | 1GB |
| n8n | 2GB | 1GB |
| PostgreSQL | 2GB | 1GB |
| Redis | 512MB | 256MB |
| System/OS | 1.5GB | 1GB |
| **Total** | **8GB** | **4.25GB** |

Your 8GB VPS is well-suited for this setup.

---

## Health Checks

```bash
# Check all services
docker-compose ps

# Check Bakame
curl http://localhost:3000

# Check n8n
curl http://localhost:5678/healthz

# Check PostgreSQL
docker exec -it postgres pg_isready

# Check Redis
docker exec -it redis redis-cli ping
```

---

## Monitoring

### PM2 Monitoring
```bash
pm2 monit
pm2 logs bakame
pm2 logs n8n
```

### Docker Logs
```bash
docker-compose logs -f bakame
docker-compose logs -f n8n
```

---

## Backup Strategy

```bash
# Database backup
docker exec postgres pg_dump -U bakame bakame > backup_$(date +%Y%m%d).sql

# n8n workflows backup
docker cp n8n:/home/node/.n8n ./n8n_backup

# Automated daily backup (cron)
0 2 * * * /root/scripts/backup.sh
```

---

## Troubleshooting

### Port Already in Use
```bash
lsof -i :3000
kill -9 <PID>
```

### Out of Memory
```bash
# Add swap
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### n8n Webhook Not Working
- Ensure `N8N_HOST` matches your domain
- Check nginx is proxying correctly
- Verify SSL certificate is valid

---

## Security Checklist

- [ ] Change default passwords
- [ ] Enable firewall (ufw)
- [ ] SSL certificates installed
- [ ] n8n basic auth enabled
- [ ] PostgreSQL not exposed to internet
- [ ] Regular backups configured
- [ ] Fail2ban installed
