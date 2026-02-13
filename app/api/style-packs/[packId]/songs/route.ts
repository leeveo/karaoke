import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ packId: string }> }
) {
  try {
    const { packId } = await params;
    const publicPath = join(process.cwd(), 'public', 'style-packs', packId, 'songs');

    // Lire les fichiers du dossier
    const files = await readdir(publicPath);
    
    // Filtrer uniquement les images
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
    );

    // Retourner les URLs relatives
    const imageUrls = imageFiles.map(file => 
      `/style-packs/${packId}/songs/${file}`
    );

    return NextResponse.json({ 
      success: true, 
      images: imageUrls,
      count: imageUrls.length 
    });
  } catch (error) {
    console.error('Error listing song images:', error);
    return NextResponse.json({ 
      success: false, 
      images: [],
      count: 0,
      error: 'Cannot list images' 
    });
  }
}
