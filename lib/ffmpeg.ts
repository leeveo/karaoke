import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

const ffmpeg = createFFmpeg({ log: true });

export async function mergeAudioVideo(audioBlob: Blob, videoBlob: Blob): Promise<Blob> {
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }

  ffmpeg.FS('writeFile', 'audio.webm', await fetchFile(audioBlob));
  ffmpeg.FS('writeFile', 'video.webm', await fetchFile(videoBlob));

  await ffmpeg.run('-i', 'video.webm', '-i', 'audio.webm', '-c:v', 'copy', '-c:a', 'aac', '-shortest', 'output.webm');

  const data = ffmpeg.FS('readFile', 'output.webm');

  return new Blob([data.buffer], { type: 'video/webm' });
}
