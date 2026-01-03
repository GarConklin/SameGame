# SameGame Deployment Guide

This guide explains how to deploy SameGame to `samegame.skifflakegames.com`.

## Prerequisites

- Docker and Docker Compose installed
- Nginx installed on the host server
- DNS configured to point `samegame.skifflakegames.com` to your server IP

## Step 1: Create Shared Docker Network

First, create the shared network that both the home page and SameGame will use:

```bash
docker network create skifflake-network
```

## Step 2: Deploy SameGame

Navigate to the SameGame directory and start the containers:

```bash
cd d:\samegame
docker compose up -d --build
```

This will:
- Build the SameGame container with PHP, Nginx, and MySQL support
- Start the MySQL database container
- Start the SameGame application container on port 8092
- Connect both containers to the `skifflake-network`

## Step 3: Configure Nginx Reverse Proxy

Create an nginx configuration file for SameGame. On most Linux systems, this would be:

```bash
sudo nano /etc/nginx/sites-available/samegame.skifflakegames.com
```

Add the following configuration:

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
        
        # WebSocket support (if needed in future)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/samegame.skifflakegames.com /etc/nginx/sites-enabled/
```

Test the nginx configuration:

```bash
sudo nginx -t
```

If the test passes, reload nginx:

```bash
sudo systemctl reload nginx
```

## Step 4: Configure SSL (Optional but Recommended)

If you have SSL certificates (Let's Encrypt, etc.), update the nginx config to include SSL:

```nginx
server {
    listen 80;
    server_name samegame.skifflakegames.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name samegame.skifflakegames.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    location / {
        proxy_pass http://localhost:8092;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Step 5: Verify Deployment

1. Check that containers are running:
   ```bash
   docker ps | grep samegame
   ```

2. Test the application directly:
   ```bash
   curl http://localhost:8092
   ```

3. Test through the domain:
   ```bash
   curl http://samegame.skifflakegames.com
   ```

4. Visit in browser: `https://samegame.skifflakegames.com`

## Troubleshooting

### Container not starting
- Check logs: `docker compose logs samegame`
- Check database logs: `docker compose logs db`
- Verify network exists: `docker network ls | grep skifflake-network`

### Nginx 502 Bad Gateway
- Verify SameGame container is running: `docker ps`
- Check if port 8092 is accessible: `curl http://localhost:8092`
- Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`

### Database connection issues
- Verify database container is running: `docker ps | grep samegame_db`
- Check database logs: `docker compose logs db`
- Test database connection from SameGame container:
  ```bash
  docker compose exec samegame php -r "mysqli_connect('db', 'samegame', 'samegame123', 'samegame');"
  ```

## Maintenance

### View logs
```bash
docker compose logs -f samegame
docker compose logs -f db
```

### Restart containers
```bash
docker compose restart
```

### Update application
```bash
cd d:\samegame
git pull  # if using git
docker compose up -d --build
```

### Backup database
```bash
docker compose exec db mysqldump -u samegame -psamegame123 samegame > backup_$(date +%Y%m%d).sql
```

### Restore database
```bash
docker compose exec -T db mysql -u samegame -psamegame123 samegame < backup_YYYYMMDD.sql
```
