// Script de test pour vérifier la configuration AWS
const fs = require('fs');
const path = require('path');

// Charger manuellement le .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");

console.log('=== Test de configuration AWS ===');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'Présent ✓' : 'Manquant ✗');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'Présent ✓' : 'Manquant ✗');
console.log('AWS_REGION:', process.env.AWS_REGION || 'Non défini');
console.log('BUCKET:', process.env.NEXT_PUBLIC_AWS_S3_BUCKET || 'Non défini');
console.log('');

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error('❌ Les credentials AWS sont manquantes');
  process.exit(1);
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-3',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  requestHandler: {
    requestTimeout: 10000,
  },
});

async function testConnection() {
  try {
    console.log('Test de connexion à AWS S3...');
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    
    console.log('✅ Connexion réussie!');
    console.log(`Buckets trouvés: ${response.Buckets?.length || 0}`);
    
    if (response.Buckets) {
      response.Buckets.forEach(bucket => {
        console.log(`  - ${bucket.Name}`);
      });
    }
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
    if (error.$metadata) {
      console.error('Détails:', {
        httpStatusCode: error.$metadata.httpStatusCode,
        requestId: error.$metadata.requestId,
      });
    }
    process.exit(1);
  }
}

testConnection();
