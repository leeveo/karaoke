'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function KaraokePage() {
  const { songId } = useParams();
  const router = useRouter();
  const webcamRef = useRef<HTMLVideoElement>(null);
  const lyricsVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [ready, setReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (webcamRef.current) {
          webcamRef.current.srcObject = stream;
          webcamRef.current.play();
        }
        setReady(true);
      })
      .catch((err) => console.error('Erreur webcam/micro:', err));
  }, []);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

    if (webcamRef.current) {
      webcamRef.current.srcObject = stream;
      await webcamRef.current.play();
    }

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8,opus',
    });

    recordedChunksRef.current = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      sessionStorage.setItem('webcam-video', url);
      sessionStorage.setItem('karaoke-video', `/songs/${songId}.mp4`);
      router.push(`/review/${songId}`);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    lyricsVideoRef.current?.pause();
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleStart = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    const video = lyricsVideoRef.current;
    if (!video || !canvas || !ctx) return;

    video.play();
    startRecording();

    const draw = () => {
      if (!video.paused && !video.ended) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const len = frame.data.length;

        for (let i = 0; i < len; i += 4) {
          const r = frame.data[i];
          const g = frame.data[i + 1];
          const b = frame.data[i + 2];
          if (r < 30 && g < 30 && b < 30) {
            frame.data[i + 3] = 0;
          }
        }

        ctx.putImageData(frame, 0, 0);
        requestAnimationFrame(draw);
      }
    };

    draw();
  };

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      <video
        ref={webcamRef}
        muted
        autoPlay
        playsInline
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 1,
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          zIndex: 2,
          backgroundColor: 'transparent',
        }}
      />
      <video
        ref={lyricsVideoRef}
        src={`/songs/${songId}.mp4`}
        muted={false}
        loop={false}
        playsInline
        style={{ display: 'none' }}
      />
      <div className="absolute bottom-6 w-full flex justify-center z-30">
        {!isRecording ? (
          <button
            onClick={handleStart}
            className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700"
            disabled={!ready}
          >
            🎬 Démarrer
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700"
          >
            ⏹ Arrêter
          </button>
        )}
      </div>
    </div>
  );
}
