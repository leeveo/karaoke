/**
 * Direct test of the GET endpoint logic without running the dev server
 */
const fs = require('fs');
const path = require('path');

// Simulate the GET endpoint
function testGetEndpoint(eventId) {
  console.log(`\n=== Testing GET Endpoint Logic ===`);
  console.log(`Event ID: ${eventId}`);
  
  const cwd = process.cwd();
  const packagesDir = path.join(cwd, '.packages');
  const outputDir = path.join(packagesDir, 'output');
  const zipFileName = `KaraokeApp-${eventId}.zip`;
  const zipPath = path.join(outputDir, zipFileName);
  
  console.log(`\nPath Resolution:`);
  console.log(`  CWD: ${cwd}`);
  console.log(`  ZIP Path: ${zipPath}`);
  
  // Check if file exists
  if (!fs.existsSync(zipPath)) {
    console.log(`\n❌ ZIP file NOT found at: ${zipPath}`);
    
    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir);
      console.log(`\nFiles in output dir: ${files.join(', ')}`);
    }
    return false;
  }
  
  // File exists - try to read it
  try {
    const fileBuffer = fs.readFileSync(zipPath);
    const fileSize = fs.statSync(zipPath).size;
    
    console.log(`\n✅ ZIP File Found!`);
    console.log(`  Size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Can be read: YES`);
    console.log(`  ZIP signature: ${fileBuffer.slice(0, 4).toString('hex')}`);
    
    // Verify it's a valid ZIP (PK signature)
    if (fileBuffer.slice(0, 2).toString('hex') === '504b') {
      console.log(`\n✅ Valid ZIP file (has PK signature)`);
      console.log(`\nThe GET endpoint should work correctly!`);
      return true;
    } else {
      console.log(`\n❌ Invalid ZIP file (wrong signature)`);
      return false;
    }
  } catch (error) {
    console.log(`\n❌ Error reading file: ${error.message}`);
    return false;
  }
}

// Test with our event ID
const success = testGetEndpoint('test-event-xyz');
process.exit(success ? 0 : 1);
