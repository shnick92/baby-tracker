# Hosting Guide

This app is designed to be self-hosted. There is no SaaS offering — your data lives wherever you deploy it.

---

## Comparison

| Option | Cost | Privacy | Difficulty | Notes |
|---|---|---|---|---|
| Home server + Tailscale | ~$0 + electricity | ★★★ Best | Medium | Data never leaves home; Tailscale required on all devices |
| Home server + Cloudflare Tunnel | ~$0 + electricity | ★★☆ Good | Medium | No Tailscale; Cloudflare sees traffic metadata |
| VPS (Hetzner / DigitalOcean / Linode) | $5–10/mo | ★★☆ Good | Medium | Full Docker control; you own the server |
| Railway | $5–20/mo | ★☆☆ Managed | Easy | Fastest to deploy; data on Railway's infrastructure |
| Render | $7–25/mo | ★☆☆ Managed | Easy | Similar to Railway; free tier has cold starts |
| Fly.io | $5–15/mo | ★☆☆ Managed | Medium | More control than Railway; good WebSocket support |

**Choose based on your priorities:**
- **Best privacy + already have a home server** → Tailscale (default setup in README)
- **Home server but no Tailscale** → Cloudflare Tunnel
- **No home server; want full control** → VPS
- **Just want it running as fast as possible** → Railway

---

## Prerequisites (all options)

- Node.js 20+ and Docker Compose installed locally (for builds and initial seeding)
- An [Anthropic API key](https://console.anthropic.com/) for the AI features (optional — the app runs without it)
- VAPID keys for push notifications (optional):
  ```bash
  cd packages/server && npx web-push generate-vapid-keys
  ```

---

## Option A: Home Server + Tailscale

This is the default configuration documented in the [README](../README.md). Skip to Option B if you want an alternative.

**What you need:** A machine that runs 24/7 (Unraid NAS, old PC, Raspberry Pi 4+, any Linux box). Tailscale installed on that machine and on both phones.

Follow the full setup in the README → **Self-Hosting** section. The key files are:
- `docker/docker-compose.prod.yml` — production services
- `docker/nginx.conf` — nginx with Tailscale TLS certs

---

## Option B: Home Server + Cloudflare Tunnel

Use this if you don't want to install Tailscale on every device, or if you want the app accessible from any browser without a VPN.

**Trade-off:** Cloudflare sits between your users and your home server and can see request metadata (URLs, timing). Your database and files still live at home.

### 1. Set up the tunnel

Install `cloudflared` on your server:

```bash
# Debian/Ubuntu
curl -L https://pkg.cloudflare.com/cloudflare-main.gpg | sudo gpg --dearmour -o /usr/share/keyrings/cloudflare-main.gpg
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared bookworm main' | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install cloudflared
```

Authenticate and create a tunnel:

```bash
cloudflared tunnel login
cloudflared tunnel create tracker
```

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: <your-tunnel-id>
credentials-file: /root/.cloudflared/<your-tunnel-id>.json

ingress:
  - hostname: tracker.yourdomain.com
    service: http://localhost:80
  - service: http_status:404
```

Start the tunnel:

```bash
cloudflared tunnel run tracker
# Or as a systemd service:
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

### 2. Use the plain-HTTP nginx config

Cloudflare Tunnel handles TLS termination — nginx only needs to serve plain HTTP internally. Create `docker/nginx.plain.conf`:

```nginx
server {
    listen 80;
    server_name _;

    resolver 127.0.0.11 valid=10s ipv6=off;

    root /usr/share/nginx/html;
    index index.html;

    location ~* (sw\.js|index\.html)$ {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(?:js|css|png|svg|ico|woff2?)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /s/ {
        set $backend http://server:3001;
        proxy_pass $backend;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /api/ai/chat {
        set $backend http://server:3001;
        proxy_pass $backend;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_buffering    off;
        proxy_cache        off;
        proxy_read_timeout 300s;
    }

    location /api/ {
        set $backend http://server:3001;
        proxy_pass $backend;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /socket.io/ {
        set $backend http://server:3001;
        proxy_pass $backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host       $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Update docker-compose.prod.yml

Change the nginx port binding to expose only to localhost (Cloudflare connects locally):

```yaml
nginx:
  ports:
    - "127.0.0.1:80:80"    # ← was ${TAILSCALE_IP}:80:80
  volumes:
    - ./nginx.plain.conf:/etc/nginx/conf.d/default.conf:ro    # ← plain HTTP config
  # Remove the Tailscale certs volume
```

### 4. Configure environment

```env
APP_URL=https://tracker.yourdomain.com
CLIENT_ORIGIN=https://tracker.yourdomain.com
RP_ID=tracker.yourdomain.com
RP_ORIGIN=https://tracker.yourdomain.com
```

### 5. Build and start

```bash
docker compose -f docker/docker-compose.prod.yml up -d
```

---

## Option C: VPS (Hetzner / DigitalOcean / Linode)

Self-hosted on a rented server. You get full Docker control without needing a home machine. Cheapest options: [Hetzner CAX11](https://www.hetzner.com/cloud) (~€4/mo) or [DigitalOcean Basic Droplet](https://www.digitalocean.com/pricing) (~$6/mo).

**What you need:** A VPS with Ubuntu 22.04+, a domain name (or free subdomain from [DuckDNS](https://www.duckdns.org/)), and Docker + Docker Compose installed.

### 1. Provision the VPS

```bash
# On your VPS — install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Point DNS at your VPS

Create an `A` record: `tracker.yourdomain.com → <vps-ip>`

### 3. Clone the repo

```bash
git clone https://github.com/your-username/tracker.git
cd tracker
```

### 4. Create docker-compose.vps.yml

Create this file at the repo root:

```yaml
name: tracker

services:
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - nginx
    restart: unless-stopped

  nginx:
    build:
      context: .
      dockerfile: docker/client.Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL}
        VITE_SOCKET_URL: ${VITE_SOCKET_URL}
        VITE_VAPID_PUBLIC_KEY: ${VITE_VAPID_PUBLIC_KEY}
        VITE_FAMILY_SURNAME: ${VITE_FAMILY_SURNAME:-}
        VITE_APP_URL: ${VITE_APP_URL:-}
    expose:
      - "80"
    depends_on:
      - server
    restart: unless-stopped

  server:
    build:
      context: .
      dockerfile: docker/server.Dockerfile
    environment:
      DATABASE_URL: ${DATABASE_URL}
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      CLIENT_ORIGIN: ${CLIENT_ORIGIN}
      NODE_ENV: production
      PORT: 3001
      COOKIE_SECURE: "true"
      RP_ID: ${RP_ID}
      RP_NAME: ${RP_NAME:-Baby Tracker}
      RP_ORIGIN: ${RP_ORIGIN}
      VAPID_PUBLIC_KEY: ${VAPID_PUBLIC_KEY}
      VAPID_PRIVATE_KEY: ${VAPID_PRIVATE_KEY}
      VAPID_EMAIL: ${VAPID_EMAIL}
      FAMILY_NAME: ${FAMILY_NAME:-Baby Tracker}
      TIMEZONE: ${TIMEZONE:-America/New_York}
      APP_URL: ${APP_URL}
      SEED_USER_1_NAME: ${SEED_USER_1_NAME}
      SEED_USER_1_EMAIL: ${SEED_USER_1_EMAIL}
      SEED_USER_1_PASSWORD: ${SEED_USER_1_PASSWORD}
      SEED_USER_1_PHONE: ${SEED_USER_1_PHONE:-}
      SEED_USER_2_NAME: ${SEED_USER_2_NAME}
      SEED_USER_2_EMAIL: ${SEED_USER_2_EMAIL}
      SEED_USER_2_PASSWORD: ${SEED_USER_2_PASSWORD}
      SEED_USER_2_PHONE: ${SEED_USER_2_PHONE:-}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
      TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID:-}
      TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN:-}
      TWILIO_FROM_NUMBER: ${TWILIO_FROM_NUMBER:-}
    depends_on:
      db:
        condition: service_healthy
    command: sh -c "prisma migrate deploy && node dist/index.js"
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-tracker}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-tracker}
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-tracker}"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 60s
    restart: unless-stopped

volumes:
  db_data:
  caddy_data:
  caddy_config:
```

Create `Caddyfile` in the repo root:

```
tracker.yourdomain.com {
    # SSE streaming — disable buffering
    handle /api/ai/chat {
        reverse_proxy nginx:80
        flush_interval -1
    }

    # Socket.io WebSocket upgrade
    handle /socket.io/* {
        reverse_proxy nginx:80 {
            header_up Upgrade {http.request.header.Upgrade}
            header_up Connection "Upgrade"
        }
    }

    # Everything else
    handle {
        reverse_proxy nginx:80
    }
}
```

> **Why Caddy?** Caddy automatically provisions and renews Let's Encrypt certificates. No certbot cron jobs, no nginx SSL config to maintain.

### 5. Configure environment

Create `.env` in the repo root:

```env
# Database
POSTGRES_PASSWORD=a-strong-random-password
DATABASE_URL=postgresql://tracker:a-strong-random-password@db:5432/tracker

# Auth
JWT_ACCESS_SECRET=<32-char-random>
JWT_REFRESH_SECRET=<32-char-random>

# Your domain
APP_URL=https://tracker.yourdomain.com
CLIENT_ORIGIN=https://tracker.yourdomain.com
RP_ID=tracker.yourdomain.com
RP_ORIGIN=https://tracker.yourdomain.com

# Client build vars
VITE_API_URL=https://tracker.yourdomain.com
VITE_SOCKET_URL=https://tracker.yourdomain.com
VITE_APP_URL=https://tracker.yourdomain.com

# Push notifications
VAPID_PUBLIC_KEY=<generated>
VAPID_PRIVATE_KEY=<generated>
VAPID_EMAIL=mailto:your@email.com

# Users
SEED_USER_1_NAME=Parent1
SEED_USER_1_EMAIL=parent1@example.com
SEED_USER_1_PASSWORD=changeme

SEED_USER_2_NAME=Parent2
SEED_USER_2_EMAIL=parent2@example.com
SEED_USER_2_PASSWORD=changeme

# AI (optional)
ANTHROPIC_API_KEY=sk-ant-...
```

### 6. Build and start

```bash
# Build and start all services
docker compose -f docker-compose.vps.yml up -d

# Run migrations and seed users (first time only)
docker compose -f docker-compose.vps.yml exec server sh -c "cd /app && npx prisma db seed"
```

Caddy will automatically obtain a TLS certificate on first startup. Check that it worked:

```bash
curl https://tracker.yourdomain.com/api/health
```

### Updating

Pull new images and restart:

```bash
git pull
docker compose -f docker-compose.vps.yml build --no-cache
docker compose -f docker-compose.vps.yml up -d
```

---

## Option D: Railway

[Railway](https://railway.app) is the fastest way to get the app running without managing servers. Managed PostgreSQL, automatic deploys from GitHub, and HTTPS out of the box.

**Cost:** ~$5–20/month depending on usage. Railway's hobby plan is $5/month with resource-based billing on top.

**Limitation:** The app uses Socket.io for real-time sync. Railway supports WebSockets natively, so this works fine.

### 1. Deploy via GitHub

1. Push your fork to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
3. Select your fork

### 2. Add services

In your Railway project, add:

- **PostgreSQL** — click "Add Service" → Database → PostgreSQL. Copy the `DATABASE_URL` Railway generates.
- **Server service** — point it at `docker/server.Dockerfile`. Set the root directory to `/` (monorepo root).
- **Client service** — point it at `docker/client.Dockerfile`. Set the root directory to `/`.

### 3. Set environment variables

On the **server service**, set all variables from `.env.example`:

```
DATABASE_URL=<from Railway Postgres service>
JWT_ACCESS_SECRET=<generated>
JWT_REFRESH_SECRET=<generated>
CLIENT_ORIGIN=https://<your-client-railway-domain>
RP_ID=<your-client-railway-domain>
RP_ORIGIN=https://<your-client-railway-domain>
APP_URL=https://<your-client-railway-domain>
VAPID_PUBLIC_KEY=<generated>
VAPID_PRIVATE_KEY=<generated>
VAPID_EMAIL=mailto:your@email.com
SEED_USER_1_NAME=Parent1
SEED_USER_1_EMAIL=parent1@example.com
SEED_USER_1_PASSWORD=changeme
SEED_USER_2_NAME=Parent2
SEED_USER_2_EMAIL=parent2@example.com
SEED_USER_2_PASSWORD=changeme
ANTHROPIC_API_KEY=sk-ant-...   # optional
```

On the **client service** (build args):

```
VITE_API_URL=https://<your-server-railway-domain>
VITE_SOCKET_URL=https://<your-server-railway-domain>
VITE_VAPID_PUBLIC_KEY=<same as server>
```

### 4. Seed users

Once the server service is running, open a Railway shell:

```bash
# In the Railway dashboard → server service → Shell tab
npx prisma db seed
```

### 5. Custom domain (optional)

In Railway, go to each service → Settings → Domains → Add custom domain. Add DNS records as instructed. WebAuthn (passkeys) requires a consistent domain — use the same domain for both `RP_ID` and `RP_ORIGIN`.

---

## Option E: Render

[Render](https://render.com) is similar to Railway with a slightly different pricing model. Static sites are free (though the client isn't purely static — it's served by nginx in Docker, so use a Web Service instead).

**Cost:** ~$7/month for the server (Starter Web Service) + $7/month for PostgreSQL (Starter) + free static site. Total: ~$14/month.

### 1. Create services

In the Render dashboard:

1. **PostgreSQL** → New → PostgreSQL. Note the internal database URL.
2. **Server** → New → Web Service → Docker → point at your repo, Dockerfile: `docker/server.Dockerfile`.
3. **Client** → New → Web Service → Docker → point at your repo, Dockerfile: `docker/client.Dockerfile`.

### 2. Set environment variables

Same variables as Railway (above). On the client service, set the build args via Render's environment variable panel (they become Docker `ARG` values during the build).

### 3. Seed users

Open the Render shell for the server service:

```bash
npx prisma db seed
```

### Render free tier caveat

Render's free tier Web Services spin down after 15 minutes of inactivity. This is not suitable for a baby tracker where either parent expects the app to respond instantly at 3am. Use the Starter plan ($7/month) for always-on services.

---

## Option F: Fly.io

[Fly.io](https://fly.io) runs Docker containers in their global edge network. Good WebSocket support and more control than Railway/Render.

**Cost:** ~$5–15/month. Free allowances cover a small Fly Postgres cluster and one app.

### 1. Install flyctl

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

### 2. Create the server app

```bash
cd /path/to/tracker
fly launch --dockerfile docker/server.Dockerfile --name tracker-server --no-deploy
```

Edit the generated `fly.toml` to set the internal port to `3001` and add health checks:

```toml
[http_service]
  internal_port = 3001
  force_https = true

[[vm]]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1
```

### 3. Create a Fly Postgres cluster

```bash
fly postgres create --name tracker-db
fly postgres attach --app tracker-server tracker-db
```

This sets `DATABASE_URL` as a secret on the app automatically.

### 4. Set secrets

```bash
fly secrets set \
  JWT_ACCESS_SECRET="<generated>" \
  JWT_REFRESH_SECRET="<generated>" \
  ANTHROPIC_API_KEY="sk-ant-..." \
  VAPID_PUBLIC_KEY="<generated>" \
  VAPID_PRIVATE_KEY="<generated>" \
  VAPID_EMAIL="mailto:you@email.com" \
  CLIENT_ORIGIN="https://tracker-client.fly.dev" \
  RP_ID="tracker-client.fly.dev" \
  RP_ORIGIN="https://tracker-client.fly.dev" \
  APP_URL="https://tracker-client.fly.dev" \
  SEED_USER_1_NAME="Parent1" \
  SEED_USER_1_EMAIL="parent1@example.com" \
  SEED_USER_1_PASSWORD="changeme" \
  SEED_USER_2_NAME="Parent2" \
  SEED_USER_2_EMAIL="parent2@example.com" \
  SEED_USER_2_PASSWORD="changeme" \
  --app tracker-server
```

### 5. Create the client app

```bash
fly launch --dockerfile docker/client.Dockerfile --name tracker-client --no-deploy
```

Set build args in `fly.toml`:

```toml
[build.args]
  VITE_API_URL = "https://tracker-server.fly.dev"
  VITE_SOCKET_URL = "https://tracker-server.fly.dev"
  VITE_VAPID_PUBLIC_KEY = "<your-vapid-public-key>"
```

### 6. Deploy and seed

```bash
fly deploy --app tracker-server
fly deploy --app tracker-client

# Seed users
fly ssh console --app tracker-server -C "cd /app && npx prisma db seed"
```

---

## Common Setup Steps (all options)

### Generating secrets

```bash
# JWT secrets (run twice, use different values)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# VAPID keys for push notifications
cd packages/server
npx web-push generate-vapid-keys
```

### WebAuthn / Passkeys

Passkeys require HTTPS and a consistent `rpId`. The `RP_ID` must match the domain users see in the browser (no port, no protocol). For example:

```
RP_ID=tracker.yourdomain.com           # ✅
RP_ORIGIN=https://tracker.yourdomain.com  # ✅
RP_ID=localhost                         # ✅ (local dev only)
RP_ID=https://tracker.yourdomain.com   # ❌ must not include https://
```

### Changing passwords after first login

The seed script creates two accounts. Users can change their passwords in **Settings → Account** after first login. Delete the `SEED_USER_*` env vars (or leave them — the seed script is only run manually and is idempotent after the first run).

### AI features without the API key

Leave `ANTHROPIC_API_KEY` unset or set `AI_ENABLED=false`. The app runs normally — quick log, chat, and weekly digest simply show a "AI unavailable" state instead of calling the API.

### Push notifications

Push notifications require:
1. VAPID keys set on both server and client
2. HTTPS on the deployed domain
3. On iOS: the app must be installed to the Home Screen (iOS 16.4+)

SOS DND bypass on iOS requires a Twilio phone call fallback. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER` if needed. Without these, the SOS alert still fires as a push notification but will not bypass iOS Do Not Disturb.

---

## Backup

Your data lives in the PostgreSQL database. Back it up regularly:

```bash
# Dump (run on your server or from your laptop with DATABASE_URL set)
pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d).sql

# Restore
psql "$DATABASE_URL" < backup-20260612.sql
```

For Docker-hosted Postgres, use `docker exec`:

```bash
docker exec tracker-db-1 pg_dump -U tracker tracker > backup.sql
```

Automate with a cron job or your hosting provider's managed backup feature.
