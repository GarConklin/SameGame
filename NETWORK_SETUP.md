# Making SameGame Accessible on Local Network

## Current Configuration
The Docker container is configured to be accessible on port 8080. The port mapping is set to bind to all network interfaces (`0.0.0.0:8080`), which should make it accessible on your local network.

## Steps to Access from Other Devices

### 1. Find Your Computer's Local IP Address

**On Windows:**
```powershell
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually something like `192.168.1.xxx` or `10.0.0.xxx`).

**On Linux/Mac:**
```bash
ip addr show
# or
ifconfig
```

### 2. Ensure Docker is Running
```bash
docker compose up -d
```

### 3. Check Windows Firewall

Windows Firewall may be blocking incoming connections. You may need to:

1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Firewall"
3. Look for Docker or add a rule for port 8080

**Option A: Run the PowerShell script (Easiest)**
1. Right-click `fix-firewall.ps1` in the samegame directory
2. Select "Run with PowerShell" (run as Administrator if needed)
3. Or run in PowerShell (as Administrator):
   ```powershell
   cd D:\samegame
   .\fix-firewall.ps1
   ```

**Option B: Use PowerShell command (as Administrator):**
```powershell
New-NetFirewallRule -DisplayName "Docker SameGame Port 8080" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

### 4. Access from Other Devices

From any device on the same network, open a web browser and go to:
```
http://YOUR_LOCAL_IP:8080
```

For example, if your local IP is `192.168.1.100`:
```
http://192.168.1.100:8080
```

### 5. Verify Port is Listening

**On Windows:**
```powershell
netstat -an | findstr 8080
```

You should see something like:
```
TCP    0.0.0.0:8080           0.0.0.0:0              LISTENING
```

### Troubleshooting

1. **Can't access from other devices:**
   - Make sure both devices are on the same network (WiFi or LAN)
   - Check Windows Firewall settings
   - Verify Docker container is running: `docker ps`
   - Check container logs: `docker compose logs samegame`

2. **Port already in use:**
   - Change the port in `docker compose.yml` (e.g., `8081:80`)
   - Restart: `docker compose down && docker compose up -d`

3. **Connection refused:**
   - Ensure the container is running: `docker ps`
   - Check if nginx is running inside container: `docker exec samegame ps aux`

### Testing Locally First

Before testing from other devices, verify it works locally:
```
http://localhost:8080
http://127.0.0.1:8080
```

Both should work before trying from other devices.

