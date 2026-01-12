/**
 * Test the GET endpoint locally
 */
const fs = require('fs');
const path = require('path');

console.log('=== Testing GET Endpoint ===');
console.log(`Current directory: ${process.cwd()}`);

const eventId = 'test-event-xyz';
const cwd = process.cwd();
const packagesDir = path.join(cwd, '.packages');
const outputDir = path.join(packagesDir, 'output');
const zipFileName = `KaraokeApp-${eventId}.zip`;
const zipPath = path.join(outputDir, zipFileName);

console.log(`\n[Test] Looking for ZIP:`);
console.log(`  Event ID: ${eventId}`);
console.log(`  Package base dir: ${packagesDir}`);
console.log(`  Output dir: ${outputDir}`);
console.log(`  Expected ZIP path: ${zipPath}`);

// Check directory existence
const packagesDirExists = fs.existsSync(packagesDir);
const outputDirExists = fs.existsSync(outputDir);
const zipFileExists = fs.existsSync(zipPath);

console.log(`\n[Test] Directory checks:`);
console.log(`  .packages exists: ${packagesDirExists}`);
console.log(`  output dir exists: ${outputDirExists}`);
console.log(`  ZIP file exists: ${zipFileExists}`);

if (outputDirExists) {
  const files = fs.readdirSync(outputDir);
  console.log(`\n[Test] Files in output dir:`);
  files.forEach(f => {
    const fPath = path.join(outputDir, f);
    const stat = fs.statSync(fPath);
    console.log(`  - ${f} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
  });
}

if (zipFileExists) {
  const stats = fs.statSync(zipPath);
  console.log(`\n✅ ZIP FILE FOUND!`);
  console.log(`  Path: ${zipPath}`);
  console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`\nThe GET endpoint should work correctly!`);
} else {
  console.log(`\n❌ ZIP FILE NOT FOUND!`);
}
