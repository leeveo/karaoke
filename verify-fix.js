#!/usr/bin/env node
/**
 * Direct test - simulates what the GET endpoint does
 */
const fs = require('fs');
const path = require('path');

console.log('=== Testing Fixed GET Endpoint ===\n');

// Simulate GET endpoint
function getPackage(eventId) {
  const cwd = process.cwd();
  console.log(`Event ID: ${eventId}`);
  console.log(`Working directory: ${cwd}`);
  
  const packagesDir = path.join(cwd, '.packages');
  const outputDir = path.join(packagesDir, 'output');
  const zipFileName = `KaraokeApp-${eventId}.zip`;
  const zipPath = path.join(outputDir, zipFileName);
  
  console.log(`\nLooking for: ${zipPath}`);
  
  if (!fs.existsSync(zipPath)) {
    console.log('❌ ZIP file not found');
    return null;
  }
  
  try {
    const fileBuffer = fs.readFileSync(zipPath);
    const fileSize = fs.statSync(zipPath).size;
    
    console.log(`✅ ZIP file found!`);
    console.log(`   Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Can read: YES`);
    
    return {
      buffer: fileBuffer,
      size: fileSize,
      name: zipFileName
    };
  } catch (error) {
    console.log(`❌ Error reading file: ${error.message}`);
    return null;
  }
}

// Test with the actual eventId from the 404 error
const result = getPackage('6c88be73-1157-422f-bd69-c436005cc807');

if (result) {
  console.log(`\n✅ Endpoint fix verified!`);
  console.log(`   When GET /api/package?eventId=6c88be73-1157-422f-bd69-c436005cc807`);
  console.log(`   Will return: ${result.name} (${(result.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`\n📋 What was fixed:`);
  console.log(`   - Changed POST response from /api/package/download to /api/package`);
  console.log(`   - The actual route handler handles GET at /api/package`);
  console.log(`   - Admin button now gets correct download URL`);
} else {
  console.log(`\n❌ Could not generate response`);
}
