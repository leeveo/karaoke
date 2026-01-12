// Test the GET endpoint with correct URL
const http = require('http');

const eventId = '6c88be73-1157-422f-bd69-c436005cc807';
const url = `http://localhost:3000/api/package?eventId=${eventId}`;

console.log(`Testing GET endpoint: ${url}`);

const req = http.get(url, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  if (res.statusCode === 200) {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const size = Buffer.byteLength(data);
      if (size > 10000000) {
        console.log('✅ Download successful!');
        console.log(`File size: ${(size / 1024 / 1024).toFixed(2)} MB`);
      } else {
        console.log('Response:', data.substring(0, 500));
      }
    });
  } else {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('❌ Error response:');
      try {
        console.log(JSON.parse(data));
      } catch {
        console.log(data.substring(0, 500));
      }
    });
  }
});

req.on('error', (err) => {
  console.error('❌ Error:', err.message);
});
