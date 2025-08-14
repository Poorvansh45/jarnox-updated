# Clear Watchlist Table Script
# This script will clear all entries from the watchlist table

Write-Host "Clearing watchlist table..." -ForegroundColor Yellow

# Check if the database file exists
$dbPath = "data/equitrack.db"
if (Test-Path $dbPath) {
    try {
        # Use sqlite3 to clear the watchlist table
        sqlite3 $dbPath "DELETE FROM watchlist;"
        Write-Host "Watchlist table cleared successfully!" -ForegroundColor Green
        Write-Host "You can now add companies to your watchlist without conflicts." -ForegroundColor Cyan
    }
    catch {
        Write-Host "Error clearing watchlist: $_" -ForegroundColor Red
        Write-Host "Make sure sqlite3 is installed and accessible from PATH" -ForegroundColor Yellow
    }
}
else {
    Write-Host "Database file not found at: $dbPath" -ForegroundColor Red
}

Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
