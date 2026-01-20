$projectDir = "e:\SKIPQ\college-canteen-portal"

try {
    Write-Host "Building for production in $projectDir..."
    Push-Location $projectDir
    
    # We assume 'npm run build' already passed based on previous output, but running it again is safe/required if artifact failed.
    # Actually, previous output says build finished successfully!
    # Let's skip re-build if possible to save time, OR just re-run to be robust. 
    # Let's simple try to start the server now.
    
    Write-Host "Starting production server..."
    # Use npm.cmd for Windows
    $serverProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "start" -PassThru -NoNewWindow
    Start-Sleep -Seconds 10

    Write-Host "Running Lighthouse..."
    # Lighthouse runs from anywhere, target is localhost
    npx lighthouse http://localhost:3000 --output=json --output-path=..\lighthouse-prod.json --chrome-flags=--headless --only-categories=performance,accessibility,best-practices,seo
    
    Write-Host "Stopping server..."
    Stop-Process -Id $serverProcess.Id -Force
    Pop-Location
}
catch {
    Write-Error $_
    if ($serverProcess) { Stop-Process -Id $serverProcess.Id -Force }
    exit 1
}
