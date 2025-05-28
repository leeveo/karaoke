'use client';

import { useEffect, useState, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

interface FFmpegRunnerProps {
  webcamUrl: string;
  karaokeUrl: string;
  onDone: (videoUrl: string) => void;
}

export default function FFmpegRunner({ webcamUrl, karaokeUrl, onDone }: FFmpegRunnerProps) {
  const [loading, setLoading] = useState(true);
  const ffmpegRef = useRef(new FFmpeg());

  useEffect(() => {
    const run = async () => {
      const ffmpeg = ffmpegRef.current;
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      // Charger les fichiers webcam (enregistré) et karaoke.mp4
      const webcamBlob = await fetch(webcamUrl).then(r => r.blob());
      const karaokeBlob = await fetch(karaokeUrl).then(r => r.blob());

      await ffmpeg.writeFile('webcam.webm', await fetchFile(webcamBlob));
      await ffmpeg.writeFile('karaoke.mp4', await fetchFile(karaokeBlob));
      
      const webcamData = await ffmpeg.readFile('webcam.webm');
      console.log('Webcam recorded size:', webcamData.length);
      

      const karaokeData = await ffmpeg.readFile('karaoke.mp4');
console.log('Karaoke loaded size:', karaokeData.length);

      // Extraire l'audio du karaoké
await ffmpeg.exec([
    '-i', 'karaoke.mp4',
    '-vn', // no video
    '-acodec', 'copy',
    'karaoke_audio.aac',
  ]);
  
  await ffmpeg.exec([
    '-i', 'webcam.webm',
    '-i', 'karaoke.mp4',
    '-filter_complex', '[0:a]adelay=200|500[mic];[mic][1:a]amix=inputs=2:duration=shortest[aout]',
    '-map', '0:v:0',
    '-map', '[aout]',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '28',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    'final.mp4'
  ]);
  
  
  

      const data = await ffmpeg.readFile('final.mp4') as Uint8Array;
      // Fix the type error by passing the Uint8Array directly to the Blob constructor
      // instead of using its buffer property
      const finalBlob = new Blob([data], { type: 'video/mp4' });
      const finalUrl = URL.createObjectURL(finalBlob);

      onDone(finalUrl);
      setLoading(false);
    };

    run();
  }, [webcamUrl, karaokeUrl, onDone]);

  if (loading) {
    return <p>Fusion karaoké en cours... ⏳</p>;
  }

  return null;
}
