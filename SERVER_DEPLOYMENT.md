# Deploying SameGame on Remote Linux Server

## Step 1: Clone or Pull from Git

### If repository doesn't exist on server:

```bash
# Navigate to where you want to store the project
cd /opt  # or /var/www, /home/username, etc.

# Clone the repository
git clone https://github.com/GarConklin/SameGame.git samegame

# Navigate into the directory
cd samegame
```

### If repository already exists on server:

```bash
# Navigate to the existing directory
cd /path/to/samegame

# Pull latest changes
git pull origin main
```

## Step 2: Create Shared Docker Network (if not exists)

```bash
docker network create skifflake-network
```

## Step 3: Deploy SameGame

```bash
# Make sure you're in the samegame directory
cd /path/to/samegame

# Build and start containers
docker compose up -d --build
```

## Step 4: Verify Containers are Running

```bash
# Check container status
docker ps | grep samegame

# Check logs if needed
docker compose logs -f samegame
```

## Step 5: Configure Nginx Reverse Proxy

Create nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/samegame.skifflakegames.com
```

Add this configuration:

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
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/samegame.skifflakegames.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 6: Update Home Page (if needed)

If you need to update the home page on the server:

```bash
# Navigate to home page directory
cd /path/to/SkifflakegamesHome

# Pull latest changes
git pull origin main  # or whatever branch you're using

# Restart home page container
docker compose restart
```

## Updating SameGame in the Future

When you make changes and push to git:

```bash
# On the server
cd /path/to/samegame
git pull origin main
docker compose up -d --build
```

## Troubleshooting

### Git authentication issues:
If you get authentication errors, you may need to:
- Use SSH instead: `git clone git@github.com:GarConklin/SameGame.git`
- Or set up a personal access token for HTTPS

### Port already in use:
If port 8092 is already in use, edit `docker-compose.yml` and change:
```yaml
ports:
  - "0.0.0.0:8092:80"  # Change 8092 to another available port
```

### Network doesn't exist:
```bash
docker network create skifflake-network
```

### Check if containers are running:
```bash
docker ps -a | grep samegame
```

### View logs:
```bash
docker compose logs samegame
docker compose logs db
```
