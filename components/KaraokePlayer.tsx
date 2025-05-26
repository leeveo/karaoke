'use client';

import { useRef, useEffect, useState } from 'react';
import { startRecording, stopRecording } from '@/utils/recorder';

interface Props {
  lyricsVideoUrl: string;
  onRecordingComplete: (videoBlob: Blob) => void;
}

export default function KaraokePlayer({ lyricsVideoUrl, onRecordingComplete }: Props) {
  const webcamRef = useRef<HTMLVideoElement>(null);
  const lyricsRef = useRef<HTMLVideoElement>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream;
        webcamRef.current.play();
      }
    });
  }, []);

  const handleStart = () => {
    startRecording(webcamRef.current!, lyricsRef.current!);
    setIsRecording(true);
  };

  const handleStop = async () => {
    const blob = await stopRecording();
    setIsRecording(false);
    onRecordingComplete(blob);
  };

  return (
    <div className="relative w-full max-w-4xl">
      <video ref={lyricsRef} src={lyricsVideoUrl} className="absolute top-0 left-0 w-full opacity-30" loop muted autoPlay />
      <video ref={webcamRef} className="relative w-full rounded-lg" muted />

      <div className="mt-4 flex justify-center">
        {!isRecording ? (
          <button onClick={handleStart} className="px-6 py-3 bg-green-500 text-white rounded-lg">Démarrer 🎤</button>
        ) : (
          <button onClick={handleStop} className="px-6 py-3 bg-red-500 text-white rounded-lg">Arrêter 🎬</button>
        )}
      </div>
    </div>
  );
}
