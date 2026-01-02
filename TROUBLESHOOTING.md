# Troubleshooting Network Access Issues

## Container is Running but Can't Access from Other Computers

### Current Status Check

✅ Container is running: `docker compose ps`
✅ Port is bound correctly: `0.0.0.0:8080->80/tcp`
✅ Service responds locally: `curl http://localhost:8080` returns 200 OK

### Most Likely Issue: Windows Firewall

Windows Firewall is blocking incoming connections on port 8080.

### Solution: Add Firewall Rule

Run PowerShell **as Administrator**:

```powershell
New-NetFirewallRule -DisplayName "Docker SameGame Port 8080" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

### Verify Firewall Rule

```powershell
Get-NetFirewallRule -DisplayName "Docker SameGame Port 8080" | Select-Object DisplayName, Enabled, Direction, Action
```

### Test Connection

1. **From the host computer:**
   ```powershell
   curl http://localhost:8080
   curl http://127.0.0.1:8080
   curl http://10.0.0.66:8080
   ```
   All should return HTTP 200.

2. **From another computer on the same network:**
   - Open browser: `http://10.0.0.66:8080`
   - Or use curl: `curl http://10.0.0.66:8080`

### Additional Checks

1. **Verify both computers are on the same network:**
   ```powershell
   ping 10.0.0.66
   ```

2. **Check if Windows Defender Firewall is blocking:**
   - Open Windows Defender Firewall
   - Click "Allow an app or feature through Windows Defender Firewall"
   - Look for Docker Desktop or add port 8080 manually

3. **Check Docker Desktop firewall settings:**
   - Open Docker Desktop
   - Go to Settings → Resources → Network
   - Ensure WSL integration is not blocking

4. **Test with telnet from another computer:**
   ```bash
   telnet 10.0.0.66 8080
   ```
   If this fails, it confirms a firewall/network issue.

5. **Check Windows Firewall logs (optional):**
   - Open Event Viewer
   - Windows Logs → Security
   - Filter for event ID 5156 (blocked connection attempts)

### Alternative: Temporarily Disable Firewall (for testing only)

⚠️ **Warning:** Only for testing, re-enable immediately after!

```powershell
# Disable firewall temporarily (Administrator)
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False

# Test access from another computer

# Re-enable firewall
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True

# Add the proper rule
New-NetFirewallRule -DisplayName "Docker SameGame Port 8080" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

### If Still Not Working

1. Check router/network settings - some routers block inter-device communication
2. Try a different port (e.g., 8081) in case 8080 is blocked by network policy
3. Check if antivirus software has a firewall component blocking connections
4. Verify Docker is using the correct network adapter (Windows Settings → Network)

