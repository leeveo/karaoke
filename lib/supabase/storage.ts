import { supabase } from './client';

// Upload une image et retourner son nom de fichier
export async function uploadEventImage(file: File): Promise<string> {
  try {
    // Garder le nom d'origine du fichier
    const fileName = file.name;
    const filePath = `backgrounds/${fileName}`;
    
    console.log("Début de l'upload:", fileName, "dans karaokestorage/backgrounds/");
    
    // Upload avec upsert: true pour écraser si le fichier existe déjà
    const { data, error } = await supabase.storage
      .from('karaokestorage')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      // Afficher l'erreur sous forme de chaîne JSON pour plus de lisibilité
      console.error("Erreur d'upload:", JSON.stringify(error, null, 2));
      
      // Si l'erreur est "File already exists", c'est plus un avertissement qu'une erreur
      if (error.message?.includes("File already exists")) {
        console.log("Le fichier existe déjà, mais ce n'est pas une erreur critique - continuons");
      } else {
        throw error;
      }
    }
    
    console.log("Upload réussi:", fileName);
    
    // Obtenir l'URL publique pour le frontend (utile pour le débogage)
    const { data: urlData } = supabase.storage
      .from('karaokestorage')
      .getPublicUrl(filePath);
    console.log("URL publique:", urlData.publicUrl);
    
    // Retourner seulement le nom du fichier (pas le chemin complet)
    return fileName;
  } catch (error) {
    // Afficher l'erreur sous forme de chaîne JSON pour plus de lisibilité
    console.error("Erreur lors de l'upload:", error instanceof Error ? error.message : JSON.stringify(error, null, 2));
    throw error;
  }
}

// Autres fonctions...
