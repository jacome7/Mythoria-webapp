# Test Enum Normalization
# Run this script to test the enum normalization functionality

Write-Host "Testing Enum Normalization..." -ForegroundColor Green

try {
    npx tsx scripts/test-enum-normalization.ts
    Write-Host "`nTest completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "Test failed: $_" -ForegroundColor Red
    exit 1
}
