import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'URL required' },
        { status: 400 }
      );
    }

    // Décoder l'URL s'il est encodé
    const decodedUrl = decodeURIComponent(imageUrl);

    // Télécharger l'image depuis S3
    const response = await fetch(decodedUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const blob = await response.blob();

    // Retourner avec les headers CORS
    return new Response(blob, {
      headers: {
        'Content-Type': blob.type,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Error downloading image:', error);
    return NextResponse.json(
      { error: 'Failed to download image' },
      { status: 500 }
    );
  }
}
