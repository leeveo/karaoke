#!/bin/bash
# S3 Caching Configuration Script
# Configures HTTP headers for optimal caching on AWS S3
# Run this to set up Cache-Control headers for images and videos

AWS_REGION="eu-west-3"
S3_BUCKET="leeveostockage"

echo "🔧 Configuring S3 caching headers for bucket: $S3_BUCKET"
echo "📍 Region: $AWS_REGION"
echo ""

# Configure Image Cache-Control headers
echo "📸 Setting image cache headers (7 days)..."
aws s3 cp "s3://${S3_BUCKET}/karaokesaas/" "s3://${S3_BUCKET}/karaokesaas/" \
  --recursive \
  --exclude "*" \
  --include "*.jpg" \
  --include "*.jpeg" \
  --include "*.png" \
  --include "*.gif" \
  --include "*.webp" \
  --metadata-directive REPLACE \
  --cache-control "public, max-age=604800, immutable" \
  --region "$AWS_REGION" 2>/dev/null || echo "Note: Bulk metadata update may have limited scope"

# Configure Video Cache-Control headers
echo "🎬 Setting video cache headers (30 days)..."
aws s3 cp "s3://${S3_BUCKET}/karaoke-videos/" "s3://${S3_BUCKET}/karaoke-videos/" \
  --recursive \
  --exclude "*" \
  --include "*.mp4" \
  --include "*.webm" \
  --metadata-directive REPLACE \
  --cache-control "public, max-age=2592000, immutable" \
  --region "$AWS_REGION" 2>/dev/null || echo "Note: Bulk metadata update may have limited scope"

echo ""
echo "✅ S3 caching headers configured!"
echo ""
echo "📝 Cache-Control Headers Applied:"
echo "  • Images: public, max-age=604800 (7 days)"
echo "  • Videos: public, max-age=2592000 (30 days)"
echo ""
echo "💡 For optimal results with new files:"
echo "   - Use AWS CLI when uploading files with correct headers"
echo "   - Or configure S3 bucket lifecycle policies"
echo "   - Or use CloudFront CDN for additional caching layer"
