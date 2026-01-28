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
 * Fonction pour lister tous les fichiers MP3 dans la catégorie "all"
 */
async function listAllMp3Files() {
  const mp3Files = [];
  let continuationToken = null;

  try {
    do {
      const params = {
        Bucket: bucketName,
        Prefix: 'karaokesaas/all/', // Préfixe correct trouvé dans l'API
        ContinuationToken: continuationToken
      };

      console.log('🔍 Recherche des fichiers MP3 dans S3 (karaokesaas/all/)...');
      const response = await s3.listObjectsV2(params).promise();

      if (response.Contents) {
        // Filtrer uniquement les fichiers .mp4 (pas .mp3 comme initialement pensé)
        const mp4InBatch = response.Contents
          .filter(object => object.Key.toLowerCase().endsWith('.mp4'))
          .map(object => ({
            fileName: path.basename(object.Key),
            fullPath: object.Key,
            size: object.Size,
            lastModified: object.LastModified
          }));

        mp3Files.push(...mp4InBatch);
        console.log(`✅ Trouvé ${mp4InBatch.length} fichiers MP4 dans ce lot (total: ${mp3Files.length})`);
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return mp3Files;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des fichiers:', error.message);
    if (error.code === 'NoSuchBucket') {
      console.error(`Le bucket "${bucketName}" n'existe pas ou n'est pas accessible.`);
    } else if (error.code === 'AccessDenied') {
      console.error('Accès refusé. Vérifiez vos credentials AWS.');
    }
    throw error;
  }
}

/**
 * Fonction pour exporter la liste dans un fichier texte
 */
function exportToTextFile(mp3Files) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputFileName = `mp4-list-all-category-${timestamp}.txt`;
  
  let content = '# Liste des chansons MP4 - Catégorie "ALL"\n';
  content += `# Exporté le: ${new Date().toLocaleString('fr-FR')}\n`;
  content += `# Nombre total de fichiers: ${mp3Files.length}\n`;
  content += '# ================================================\n\n';

  // Trier les fichiers par nom
  mp3Files.sort((a, b) => a.fileName.localeCompare(b.fileName));

  mp3Files.forEach((file, index) => {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const lastModified = file.lastModified.toLocaleString('fr-FR');
    
    content += `${index + 1}. ${file.fileName}\n`;
    content += `   Chemin: ${file.fullPath}\n`;
    content += `   Taille: ${sizeInMB} MB\n`;
    content += `   Modifié: ${lastModified}\n\n`;
  });

  // Ajouter un résumé à la fin
  content += '\n# ================================================\n';
  content += '# RÉSUMÉ\n';
  content += '# ================================================\n';
  content += `# Total de fichiers MP4: ${mp3Files.length}\n`;
  
  const totalSizeBytes = mp3Files.reduce((sum, file) => sum + file.size, 0);
  const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);
  const totalSizeGB = (totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2);
  
  content += `# Taille totale: ${totalSizeMB} MB (${totalSizeGB} GB)\n`;

  fs.writeFileSync(outputFileName, content, 'utf8');
  console.log(`📄 Liste exportée dans: ${outputFileName}`);
  
  return outputFileName;
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🎵 Export des chansons MP4 - Catégorie "ALL"');
  console.log('='.repeat(50));
  
  try {
    // Vérifier les credentials AWS
    console.log(`🔧 Bucket configuré: ${bucketName}`);
    console.log(`🌍 Région: ${process.env.NEXT_PUBLIC_AWS_REGION}`);
    
    // Lister tous les fichiers MP4
    const mp3Files = await listAllMp3Files();
    
    if (mp3Files.length === 0) {
      console.log('⚠️  Aucun fichier MP4 trouvé dans la catégorie "all".');
      console.log('Vérifiez que le chemin "karaokesaas/all/" existe dans votre bucket S3.');
      return;
    }

    console.log(`\n🎉 ${mp3Files.length} fichiers MP4 trouvés!`);
    
    // Exporter vers un fichier texte
    const outputFile = exportToTextFile(mp3Files);
    
    console.log('\n✅ Export terminé avec succès!');
    console.log(`📁 Fichier créé: ${path.resolve(outputFile)}`);
    
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'export:', error.message);
    process.exit(1);
  }
}

// Exécuter le script
if (require.main === module) {
  main();
}

module.exports = { listAllMp3Files, exportToTextFile };