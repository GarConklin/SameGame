# Fix Firewall for SameGame
# Run this script as Administrator

Write-Host "Adding firewall rule for Docker SameGame on port 8080..." -ForegroundColor Yellow

# Remove existing rule if it exists
Remove-NetFirewallRule -DisplayName "Docker SameGame Port 8080" -ErrorAction SilentlyContinue

# Add new rule
New-NetFirewallRule `
    -DisplayName "Docker SameGame Port 8080" `
    -Direction Inbound `
    -LocalPort 8080 `
    -Protocol TCP `
    -Action Allow `
    -Description "Allow incoming connections to SameGame Docker container"

Write-Host "Firewall rule added successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Verifying rule..." -ForegroundColor Yellow

# Verify the rule
$rule = Get-NetFirewallRule -DisplayName "Docker SameGame Port 8080" -ErrorAction SilentlyContinue
if ($rule) {
    Write-Host "Rule Status:" -ForegroundColor Cyan
    Write-Host "  DisplayName: $($rule.DisplayName)" -ForegroundColor White
    Write-Host "  Enabled: $($rule.Enabled)" -ForegroundColor White
    Write-Host "  Direction: $($rule.Direction)" -ForegroundColor White
    Write-Host "  Action: $($rule.Action)" -ForegroundColor White
    Write-Host ""
    Write-Host "You should now be able to access http://10.0.0.66:8080 from other devices on your network!" -ForegroundColor Green
} else {
    Write-Host "ERROR: Could not verify rule was created. Make sure you ran this script as Administrator." -ForegroundColor Red
}

