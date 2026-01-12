import { NextResponse } from 'next/server';
import { getS3Categories } from '@/lib/aws/s3Admin';

export async function GET() {
  try {
    const categories = await getS3Categories();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
