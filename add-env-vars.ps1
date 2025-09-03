# PowerShell script to add environment variables to Vercel

Write-Host "Adding environment variables to Vercel..." -ForegroundColor Green

# Read .env.local and add each variable
Get-Content .env.local | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        
        if ($key -and $value) {
            Write-Host "Adding $key..." -ForegroundColor Yellow
            echo $value | npx vercel env add $key production
            Start-Sleep -Milliseconds 500
        }
    }
}

Write-Host "Environment variables added!" -ForegroundColor Green