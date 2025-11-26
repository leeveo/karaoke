import { NextRequest, NextResponse } from 'next/server';
import { getS3SongsByCategory } from '@/lib/aws/s3Admin';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');

    if (!category) {
      return NextResponse.json(
        { error: 'Category parameter is required' },
        { status: 400 }
      );
    }

    const songs = await getS3SongsByCategory(category);
    return NextResponse.json({ songs });
  } catch (error) {
    console.error('Error fetching songs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch songs' },
      { status: 500 }
    );
  }
}
