# Write-Host "🔄 Resetting SQLite database..."
Remove-Item -ErrorAction Ignore .\equitrack.db

# Write-Host "📜 Creating tables..."
Get-Content .\scripts\01_create_tables.sql | sqlite3.exe equitrack.db

# Write-Host "🚫 Disabling foreign key checks..."
sqlite3.exe equitrack.db "PRAGMA foreign_keys = OFF;"

# Write-Host "📥 Inserting companies..."
Get-Content .\scripts\02_seed_companies.sql | sqlite3.exe equitrack.db

# Write-Host "📥 Inserting historical stock data..."
Get-Content .\scripts\03_seed_stock_data.sql | sqlite3.exe equitrack.db

# Write-Host "📥 Inserting current stock data..."
Get-Content .\scripts\04_seed_current_data.sql | sqlite3.exe equitrack.db

# Write-Host "✅ Re-enabling foreign key checks..."
sqlite3.exe equitrack.db "PRAGMA foreign_keys = ON;"

# Write-Host "🎉 Database reset & seeding complete!"
