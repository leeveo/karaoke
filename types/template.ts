export interface Template {
  id: string;
  name: string;
  description: string | null;
  background_image: string; // nom du fichier dans le storage
  primary_color: string; // code hex
  secondary_color: string; // code hex
  thumbnail: string | null; // petite image pour l'aperçu, facultatif
  created_at: string;
}

// Type pour les nouveaux templates à créer
export interface TemplateInput {
  name: string;
  description?: string;
  background_image: string;
  primary_color: string;
  secondary_color: string;
  thumbnail?: string;
}
