import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { eventId } = await request.json();

    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing eventId' },
        { status: 400 }
      );
    }

    // 1. Récupérer les chansons de l'événement
    const { data: eventSongs, error: songsError } = await supabase
      .from('event_songs')
      .select('id, title, video_url, artist')
      .eq('event_id', eventId);

    if (songsError) {
      console.error('Error fetching songs:', songsError);
      return NextResponse.json(
        { error: 'Failed to fetch songs' },
        { status: 500 }
      );
    }

    // 2. Récupérer la customization avec images
    const { data: customization, error: customError } = await supabase
      .from('event_customization')
      .select('logo, background_image, logoUrl, backgroundImageUrl')
      .eq('event_id', eventId)
      .single();

    if (customError && customError.code !== 'PGRST116') {
      console.error('Error fetching customization:', customError);
    }

    // 3. Récupérer l'événement pour le nom
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('name')
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('Error fetching event:', eventError);
    }

    // 4. Construire la liste des ressources à télécharger
    const assets = {
      songs: (eventSongs || []).map(song => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        url: song.video_url,
        type: 'video/mp4'
      })),
      images: [] as Array<{ id: string; url: string; type: 'logo' | 'background' }>,
      metadata: {
        eventId,
        eventName: event?.name || 'Karaoke Event',
        totalSongs: (eventSongs || []).length,
        generatedAt: new Date().toISOString()
      }
    };

    // Ajouter les images si elles existent
    if (customization?.logoUrl || customization?.logo) {
      const logoUrl = customization.logoUrl || customization.logo;
      if (logoUrl && logoUrl.startsWith('http')) {
        assets.images.push({
          id: 'logo',
          url: logoUrl,
          type: 'logo'
        });
      }
    }

    if (customization?.backgroundImageUrl || customization?.background_image) {
      const bgUrl = customization.backgroundImageUrl || customization.background_image;
      if (bgUrl && bgUrl.startsWith('http')) {
        assets.images.push({
          id: 'background',
          url: bgUrl,
          type: 'background'
        });
      }
    }

    return NextResponse.json({
      success: true,
      assets,
      totalAssets: assets.songs.length + assets.images.length,
      estimatedSize: calculateEstimatedSize(assets.songs.length)
    });
  } catch (error) {
    console.error('Sync assets error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateEstimatedSize(songCount: number): string {
  // ~10MB par chanson MP4
  const sizeInMB = songCount * 10 + 5; // +5 pour images
  return `${sizeInMB.toFixed(1)}MB`;
}
