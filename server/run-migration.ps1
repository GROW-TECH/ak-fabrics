# Run migration to add pincode columns
Write-Host "Running migration to add pincode columns..."

# Read the SQL file and execute it
$sqlContent = Get-Content "add-pincode-columns.sql" -Raw
$sqlContent | mysql -u root -p ak_fabrics

Write-Host "Migration completed."
