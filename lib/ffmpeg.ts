import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

// Create a new FFmpeg instance (don't use createFFmpeg as it's deprecated)
const ffmpeg = new FFmpeg();

// Initialize FFmpeg with logging enabled
let loaded = false;

// Load FFmpeg asynchronously
async function load() {
  if (loaded) return;

  // Load the FFmpeg core
  await ffmpeg.load({
    coreURL: await toBlobURL('https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js', 'text/javascript'),
    wasmURL: await toBlobURL('https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.wasm', 'application/wasm'),
  });
  
  loaded = true;
}

// Convert from WebM to MP4
export async function convertWebmToMp4(webmBlob: Blob): Promise<Blob | null> {
  try {
    await load();
    
    // Create URLs for input and output
    const webmUrl = URL.createObjectURL(webmBlob);
    
    // Write file to memory
    const webmData = await fetch(webmUrl).then(r => r.arrayBuffer());
    await ffmpeg.writeFile('input.webm', new Uint8Array(webmData));
    
    // Run FFmpeg command to convert WebM to MP4
    await ffmpeg.exec([
      '-i', 'input.webm',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-c:a', 'aac',
      '-f', 'mp4',
      'output.mp4'
    ]);
    
    // Read the output file
    const outputData = await ffmpeg.readFile('output.mp4');
    
    // Create a blob from the output data
    const outputBlob = new Blob([outputData], { type: 'video/mp4' });
    
    // Clean up
    URL.revokeObjectURL(webmUrl);
    
    return outputBlob;
  } catch (error) {
    console.error('Error converting video:', error);
    return null;
  }
}

export default ffmpeg;
