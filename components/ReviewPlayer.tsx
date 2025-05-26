'use client';

import React, { useRef, useEffect } from 'react';

interface Props {
  videoUrl: string;
}

export default function ReviewPlayer({ videoUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [videoUrl]);

  return (
    <div className="w-full max-w-4xl">
      <video ref={videoRef} src={videoUrl} controls className="w-full rounded-lg" />
    </div>
  );
}
