import { supabase } from './client';
import { Template, TemplateInput } from '@/types/template';

// Récupérer tous les templates
export async function fetchTemplates(): Promise<Template[]> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching templates:', error);
    throw new Error(`Erreur lors de la récupération des templates: ${error.message}`);
  }

  return data || [];
}

// Récupérer un template par son ID
export async function fetchTemplateById(id: string): Promise<Template | null> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching template with ID ${id}:`, error);
    throw new Error(`Erreur lors de la récupération du template: ${error.message}`);
  }

  return data;
}

// Créer un nouveau template (pour l'administration)
export async function createTemplate(template: TemplateInput): Promise<string> {
  const { data, error } = await supabase
    .from('templates')
    .insert(template)
    .select('id')
    .single();

  if (error) {
    console.error('Error creating template:', error);
    throw new Error(`Erreur lors de la création du template: ${error.message}`);
  }

  return data.id;
}

// Obtenir les URLs publiques pour les images des templates
export function getTemplateImageUrl(filename: string): string {
  const { data } = supabase.storage
    .from('karaokestorage')
    .getPublicUrl(`backgrounds/${filename}`);
  
  return data.publicUrl;
}
