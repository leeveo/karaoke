const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Fonction pour charger les variables d'environnement depuis .env.local
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');
      
      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            process.env[key.trim()] = valueParts.join('=').trim();
          }
        }
      });
      console.log('✅ Configuration .env.local chargée avec succès');
    } else {
      console.error('❌ Fichier .env.local introuvable');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erreur lors du chargement de .env.local:', error.message);
    process.exit(1);
  }
}

// Charger le fichier .env.local
loadEnvFile();

// Configuration AWS depuis les variables d'environnement
AWS.config.update({
  accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
  region: process.env.NEXT_PUBLIC_AWS_REGION,
});

const s3 = new AWS.S3();
const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET;

if (!bucketName) {
  console.error('❌ La variable d\'environnement NEXT_PUBLIC_AWS_S3_BUCKET est manquante.');
  console.error('Assurez-vous que votre fichier .env.local est configuré correctement.');
  process.exit(1);
}

/**
 * Fonction pour explorer la structure du bucket S3
 */
async function exploreBucketStructure() {
  const allObjects = [];
  let continuationToken = null;

  try {
    console.log('🔍 Exploration de la structure du bucket S3...');
    
    do {
      const params = {
        Bucket: bucketName,
        ContinuationToken: continuationToken,
        MaxKeys: 1000 // Limite pour éviter de récupérer trop d'objets d'un coup
      };

      const response = await s3.listObjectsV2(params).promise();

      if (response.Contents) {
        allObjects.push(...response.Contents.map(obj => obj.Key));
        console.log(`📁 Trouvé ${response.Contents.length} objets dans ce lot (total: ${allObjects.length})`);
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return allObjects;
  } catch (error) {
    console.error('❌ Erreur lors de l\'exploration:', error.message);
    if (error.code === 'NoSuchBucket') {
      console.error(`Le bucket "${bucketName}" n'existe pas ou n'est pas accessible.`);
    } else if (error.code === 'AccessDenied') {
      console.error('Accès refusé. Vérifiez vos credentials AWS.');
    }
    throw error;
  }
}

/**
 * Analyser la structure et trouver les fichiers MP3
 */
function analyzeStructure(allObjects) {
  const mp3Files = [];
  const folders = new Set();
  const mp3ByFolder = {};

  console.log('\n📊 Analyse de la structure...');
  
  allObjects.forEach(key => {
    // Extraire le dossier
    const parts = key.split('/');
    if (parts.length > 1) {
      const folderPath = parts.slice(0, -1).join('/');
      folders.add(folderPath);
    }

    // Vérifier si c'est un fichier MP3
    if (key.toLowerCase().endsWith('.mp3')) {
      mp3Files.push({
        fileName: path.basename(key),
        fullPath: key,
        folder: parts.length > 1 ? parts.slice(0, -1).join('/') : 'racine'
      });

      // Compter par dossier
      const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : 'racine';
      mp3ByFolder[folder] = (mp3ByFolder[folder] || 0) + 1;
    }
  });

  return { mp3Files, folders: Array.from(folders), mp3ByFolder };
}

/**
 * Afficher la structure trouvée
 */
function displayStructure(analysis) {
  console.log('\n📂 STRUCTURE DU BUCKET:');
  console.log('='.repeat(50));
  
  console.log(`📁 Nombre total de dossiers: ${analysis.folders.length}`);
  console.log('🎵 Dossiers avec fichiers MP3:');
  
  Object.entries(analysis.mp3ByFolder)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([folder, count]) => {
      console.log(`  📂 ${folder}: ${count} fichier(s) MP3`);
    });

  console.log(`\n🎵 Total de fichiers MP3: ${analysis.mp3Files.length}`);
  
  if (analysis.folders.length > 0) {
    console.log('\n📋 Tous les dossiers détectés:');
    analysis.folders
      .sort()
      .slice(0, 20) // Afficher seulement les 20 premiers
      .forEach(folder => {
        console.log(`  📁 ${folder}`);
      });
    
    if (analysis.folders.length > 20) {
      console.log(`  ... et ${analysis.folders.length - 20} autres dossiers`);
    }
  }
}

/**
 * Exporter tous les MP3 trouvés
 */
function exportAllMp3Files(mp3Files) {
  if (mp3Files.length === 0) {
    console.log('\n⚠️  Aucun fichier MP3 trouvé dans tout le bucket.');
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputFileName = `mp3-list-complete-${timestamp}.txt`;
  
  let content = '# Liste COMPLÈTE des chansons MP3 du bucket S3\n';
  content += `# Exporté le: ${new Date().toLocaleString('fr-FR')}\n`;
  content += `# Bucket: ${bucketName}\n`;
  content += `# Nombre total de fichiers: ${mp3Files.length}\n`;
  content += '# ================================================\n\n';

  // Grouper par dossier
  const byFolder = {};
  mp3Files.forEach(file => {
    if (!byFolder[file.folder]) {
      byFolder[file.folder] = [];
    }
    byFolder[file.folder].push(file);
  });

  // Exporter par dossier
  Object.keys(byFolder)
    .sort()
    .forEach(folder => {
      content += `## 📂 DOSSIER: ${folder}\n`;
      content += `-`.repeat(50) + '\n';
      
      byFolder[folder]
        .sort((a, b) => a.fileName.localeCompare(b.fileName))
        .forEach((file, index) => {
          content += `${index + 1}. ${file.fileName}\n`;
          content += `   Chemin complet: ${file.fullPath}\n\n`;
        });
      
      content += `📊 Total dans ce dossier: ${byFolder[folder].length} fichiers\n\n`;
    });

  // Résumé final
  content += '\n# ================================================\n';
  content += '# RÉSUMÉ GLOBAL\n';
  content += '# ================================================\n';
  content += `# Total de fichiers MP3: ${mp3Files.length}\n`;
  content += `# Nombre de dossiers: ${Object.keys(byFolder).length}\n`;

  fs.writeFileSync(outputFileName, content, 'utf8');
  console.log(`\n📄 Liste complète exportée dans: ${outputFileName}`);
  
  return outputFileName;
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🔍 Exploration complète du bucket S3');
  console.log('='.repeat(50));
  
  try {
    console.log(`🔧 Bucket: ${bucketName}`);
    console.log(`🌍 Région: ${process.env.NEXT_PUBLIC_AWS_REGION}`);
    
    // Explorer la structure complète
    const allObjects = await exploreBucketStructure();
    
    if (allObjects.length === 0) {
      console.log('⚠️  Le bucket est vide ou aucun objet accessible.');
      return;
    }

    // Analyser la structure
    const analysis = analyzeStructure(allObjects);
    
    // Afficher la structure
    displayStructure(analysis);
    
    // Exporter tous les MP3
    const outputFile = exportAllMp3Files(analysis.mp3Files);
    
    if (outputFile) {
      console.log('\n✅ Exploration et export terminés avec succès!');
      console.log(`📁 Fichier créé: ${path.resolve(outputFile)}`);
    }
    
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'exploration:', error.message);
    process.exit(1);
  }
}

// Exécuter le script
if (require.main === module) {
  main();
}