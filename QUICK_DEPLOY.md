# Quick Deployment Checklist

## On Your Server

### 1. Create Shared Network (One-time setup)
```bash
docker network create skifflake-network
```

### 2. Deploy SameGame
```bash
cd /path/to/samegame
docker compose up -d --build
```

### 3. Configure Nginx

Create `/etc/nginx/sites-available/samegame.skifflakegames.com`:

```nginx
server {
    listen 80;
    server_name samegame.skifflakegames.com;

    location / {
        proxy_pass http://localhost:8092;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and reload:
```bash
sudo ln -s /etc/nginx/sites-available/samegame.skifflakegames.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Update DNS
Point `samegame.skifflakegames.com` to your server's IP address.

### 5. Verify
- Visit: `http://samegame.skifflakegames.com`
- Check home page: `https://skifflakegames.com` (should show SameGame card)

## Files Updated

✅ `d:\Words-Online\SkifflakegamesHome\public\index.html` - Added SameGame card
✅ `d:\samegame\docker-compose.yml` - Added network configuration
✅ `d:\Words-Online\SkifflakegamesHome\docker-compose.yml` - Updated network config
✅ Preview image already exists at: `d:\Words-Online\SkifflakegamesHome\public\img\samegame-preview.png`
