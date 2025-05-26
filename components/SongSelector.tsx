'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import { Song } from '../services/s3Service';

interface Props {
  songs: Song[];
}

export default function SongSelector({ songs }: Props) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {songs.map((song) => (
        <button
          key={song.key}
          onClick={() => router.push(`/karaoke/${encodeURIComponent(song.key)}`)}
          className="px-8 py-4 bg-purple-500 text-white rounded hover:bg-purple-600 transition"
        >
          <div className="text-xl font-bold">{song.title}</div>
          <div className="text-sm mt-1">{song.artist}</div>
        </button>
      ))}
    </div>
  );
}