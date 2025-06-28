import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION!,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const projectId = formData.get('projectId') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Ajoute l'id du projet dans le nom du fichier si fourni
  const safeProjectId = projectId ? String(projectId) : 'nouveau';
  const ext = file.name.split('.').pop();
  const isLogo = file.name.toLowerCase().includes('logo');
  const prefix = isLogo ? 'logo' : 'bg';
  const fileName = `karaoke_users/${prefix}_${safeProjectId}_${Date.now()}.${ext}`;

  try {
    await s3.send(new PutObjectCommand({
      Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET!,
      Key: fileName,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
      ACL: 'public-read',
    }));

    const url = `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${fileName}`;
    return NextResponse.json({ url });
  } catch (error) {
    console.error('S3 upload error:', error);
    return NextResponse.json({ error: 'Failed to upload', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}
