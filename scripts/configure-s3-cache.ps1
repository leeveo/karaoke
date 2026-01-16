# S3 Caching Configuration Script (PowerShell)
# Configures HTTP headers for optimal caching on AWS S3
# Usage: .\scripts\configure-s3-cache.ps1

param(
    [string]$Region = "eu-west-3",
    [string]$Bucket = "leeveostockage"
)

Write-Host "🔧 Configuring S3 caching headers" -ForegroundColor Cyan
Write-Host "📍 Bucket: $Bucket" -ForegroundColor Cyan
Write-Host "📍 Region: $Region" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
try {
    aws --version | Out-Null
} catch {
    Write-Host "❌ AWS CLI not found. Please install it first." -ForegroundColor Red
    exit 1
}

# Function to set cache headers for files
function Set-S3CacheHeaders {
    param(
        [string]$Prefix,
        [string]$Pattern,
        [string]$MaxAge,
        [string]$Description
    )
    
    Write-Host "📦 $Description..." -ForegroundColor Yellow
    
    try {
        $objects = aws s3 ls "s3://$Bucket/$Prefix" --recursive --region $Region | 
                   Where-Object { $_ -match $Pattern }
        
        if ($objects) {
            $count = ($objects | Measure-Object).Count
            Write-Host "   Found $count files to update" -ForegroundColor Gray
            
            # Update cache headers for each file
            $objects | ForEach-Object {
                $key = ($_ -split '\s+')[-1]
                aws s3api copy-object `
                    --bucket $Bucket `
                    --copy-source "$Bucket/$key" `
                    --key $key `
                    --metadata-directive REPLACE `
                    --cache-control "public, max-age=$MaxAge, immutable" `
                    --region $Region | Out-Null
                
                Write-Host "   ✓ Updated: $key" -ForegroundColor Green
            }
        } else {
            Write-Host "   No matching files found" -ForegroundColor Gray
        }
    } catch {
        Write-Host "   ⚠️  Error: $_" -ForegroundColor Yellow
    }
}

# Configure image headers (7 days = 604800 seconds)
Set-S3CacheHeaders -Prefix "karaokesaas/" -Pattern "\.(jpg|jpeg|png|gif|webp)$" `
                   -MaxAge "604800" -Description "📸 Setting image cache headers (7 days)"

Write-Host ""

# Configure video headers (30 days = 2592000 seconds)
Set-S3CacheHeaders -Prefix "karaoke-videos/" -Pattern "\.(mp4|webm)$" `
                   -MaxAge "2592000" -Description "🎬 Setting video cache headers (30 days)"

Write-Host ""
Write-Host "✅ S3 caching headers configured!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Cache-Control Headers Applied:" -ForegroundColor Cyan
Write-Host "   • Images: public, max-age=604800 (7 days)" -ForegroundColor Gray
Write-Host "   • Videos: public, max-age=2592000 (30 days)" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Tips for optimal results:" -ForegroundColor Yellow
Write-Host "   1. Use AWS CLI with --metadata-directive REPLACE when uploading files" -ForegroundColor Gray
Write-Host "   2. Configure S3 bucket lifecycle policies" -ForegroundColor Gray
Write-Host "   3. Consider CloudFront CDN for additional global caching" -ForegroundColor Gray
Write-Host "   4. Monitor cache hits in CloudWatch metrics" -ForegroundColor Gray
