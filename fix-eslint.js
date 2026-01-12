const fs = require('fs');

// Fix LiveKaraokeRecorder.tsx
let content = fs.readFileSync('components/LiveKaraokeRecorder.tsx', 'utf-8');

// Remove unused state variables declaration
content = content.replace(
  /const \[status, setStatus\] = useState<string>\("Initialisation..."\);\n/,
  ''
);
content = content.replace(
  /const \[useSnapFilters, setUseSnapFilters\] = useState\(false\);\n/,
  ''
);
content = content.replace(
  /isInitialized,\n\s+setWebcamElement,/,
  'setWebcamElement,'
);

// Remove all setStatus calls completely (entire lines)
content = content.replace(/^\s*setStatus\([^)]*\);?\n/gm, '');

// Update useEffect dependencies - remove useSnapFilters
content = content.replace(
  /\], \[karaokeSrc, router, songId, useSnapFilters, setWebcamElement, session, logoLoaded\]\);/,
  '], [karaokeSrc, router, songId, eventId, recordingStarted, stopRecording, webcamReady, setWebcamElement, session, logoLoaded]);'
);

// Fix refs in cleanup function to avoid the warning about changing refs
// Copy refs to local variables first
const cleanupBefore = `    // Nettoyage
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }

      if (karaokeVideoRef.current) {
        karaokeVideoRef.current.pause();
      }
      
      if (webcamVideoRef.current) {
        webcamVideoRef.current.pause();
        
        const tracks = (webcamVideoRef.current.srcObject as MediaStream)?.getTracks();
        tracks?.forEach((track) => track.stop());
      }

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };`;

const cleanupAfter = `    // Nettoyage
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }

      const karaokeVideo = karaokeVideoRef.current;
      const webcamVideo = webcamVideoRef.current;
      const audioContext = audioContextRef.current;

      if (karaokeVideo) {
        karaokeVideo.pause();
      }
      
      if (webcamVideo) {
        webcamVideo.pause();
        
        const tracks = (webcamVideo.srcObject as MediaStream)?.getTracks();
        tracks?.forEach((track) => track.stop());
      }

      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
    };`;

content = content.replace(cleanupBefore, cleanupAfter);

fs.writeFileSync('components/LiveKaraokeRecorder.tsx', content, 'utf-8');
console.log('Fixed components/LiveKaraokeRecorder.tsx');

// Fix lib/supabase/events.ts
let eventsContent = fs.readFileSync('lib/supabase/events.ts', 'utf-8');
eventsContent = eventsContent.replace(
  /const { data: eventExists, error: checkError } = await supabase/,
  'const { error: checkError } = await supabase'
);
fs.writeFileSync('lib/supabase/events.ts', eventsContent, 'utf-8');
console.log('Fixed lib/supabase/events.ts');
