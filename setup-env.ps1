# Setup script for LOOP AI project environment
# Run this script in PowerShell to create the .env file

$envContent = @"
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="loop-demo-secret-change-in-production-secure-random-string"
NEXTAUTH_URL="http://localhost:3000"
ANTHROPIC_API_KEY="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"
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8
Write-Host ".env file created successfully!" -ForegroundColor Green
Write-Host "Now run: npm install && npx prisma migrate dev --name init && npm run seed" -ForegroundColor Yellow