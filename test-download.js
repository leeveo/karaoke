// Test the GET endpoint
const http = require('http');

const eventId = '6c88be73-1157-422f-bd69-c436005cc807';
const url = `http://localhost:3000/api/package/download?eventId=${eventId}`;

console.log(`Testing GET endpoint: ${url}`);

const req = http.get(url, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  if (res.statusCode === 200) {
    console.log('✅ Download successful!');
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => {
      const size = Buffer.concat(chunks).length;
      console.log(`File size: ${(size / 1024 / 1024).toFixed(2)} MB`);
    });
  } else {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Response body:', data);
    });
  }
});

req.on('error', (err) => {
  console.error('❌ Error:', err.message);
});

req.on('timeout', () => {
  console.error('❌ Request timeout');
  req.destroy();
});

req.setTimeout(15000);
