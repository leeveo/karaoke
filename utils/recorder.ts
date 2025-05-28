let mediaRecorder: MediaRecorder;
let recordedChunks: Blob[] = [];

/**
 * Démarre l'enregistrement combiné webcam + lyrics.
 */
export function startRecording(webcam: HTMLVideoElement, lyrics: HTMLVideoElement) {
  const webcamStream = webcam.srcObject as MediaStream;
  const lyricsStream = lyrics.captureStream();

  const combinedTracks = [
    ...webcamStream.getVideoTracks(),
    ...webcamStream.getAudioTracks(),
    ...lyricsStream.getVideoTracks()
  ];

  const combinedStream = new MediaStream(combinedTracks);

  mediaRecorder = new MediaRecorder(combinedStream, {
    mimeType: 'video/webm; codecs=vp8,opus',
  });

  recordedChunks = [];

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  mediaRecorder.start();
}

/**
 * Stoppe l'enregistrement et retourne le fichier vidéo.
 */
export async function stopRecording(): Promise<Blob> {
  return new Promise<Blob>((resolve) => {
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      resolve(blob);
    };
    mediaRecorder.stop();
  });
}

// Add HTMLVideoElement extension to add the missing captureStream method
declare global {
  interface HTMLVideoElement {
    captureStream(frameRate?: number): MediaStream;
  }
}
