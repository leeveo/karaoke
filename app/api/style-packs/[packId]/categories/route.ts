import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ packId: string }> }
) {
  try {
    const { packId } = await params;
    const publicPath = join(process.cwd(), 'public', 'style-packs', packId, 'categories');

    // Lire les fichiers du dossier
    const files = await readdir(publicPath);
    
    // Filtrer uniquement les images
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
    );

    // Retourner les URLs relatives avec le nom de catégorie
    const categories = imageFiles.map(file => {
      const categorySlug = file.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
      return {
        slug: categorySlug,
        url: `/style-packs/${packId}/categories/${file}`
      };
    });

    return NextResponse.json({ 
      success: true, 
      categories,
      count: categories.length 
    });
  } catch (error) {
    console.error('Error listing category images:', error);
    return NextResponse.json({ 
      success: false, 
      categories: [],
      count: 0,
      error: 'Cannot list categories' 
    });
  }
}
