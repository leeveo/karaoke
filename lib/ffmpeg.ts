import { FFmpeg } from '@ffmpeg/ffmpeg';

const ffmpeg = new FFmpeg();

export async function mergeAudioVideo(audioBlob: Blob, videoBlob: Blob): Promise<Blob> {
  if (!ffmpeg.loaded) {
    await ffmpeg.load();
  }

  // Write files using the new API
  const audioData = await audioBlob.arrayBuffer();
  const videoData = await videoBlob.arrayBuffer();
  
  ffmpeg.writeFile('audio.webm', new Uint8Array(audioData));
  ffmpeg.writeFile('video.webm', new Uint8Array(videoData));

  await ffmpeg.exec(['-i', 'video.webm', '-i', 'audio.webm', '-c:v', 'copy', '-c:a', 'aac', '-shortest', 'output.webm']);

  const data = await ffmpeg.readFile('output.webm') as Uint8Array;

  return new Blob([data.buffer as ArrayBuffer], { type: 'video/webm' });
}
