/**
 * Helper functions for loading logos in offline mode
 */

export async function getLogoUrl(eventId: string): Promise<string | undefined> {
  // First, try to get from offline event if available
  try {
    if (typeof window !== 'undefined') {
      const response = await fetch(`/api/offline/manifest?eventId=${eventId}`, { cache: 'no-store' });
      if (response.ok) {
        const manifest = await response.json();
        if (manifest?.event?.assets?.logoPath) {
          // Construct offline asset URL
          return `/_offline/assets/${manifest.event.assets.logoPath.replace(/^\.\/|^\//, '').replace(/^assets\//, '')}`;
        }
      }
    }
  } catch (error) {
    console.warn('[LogoHelper] Unable to load from offline manifest:', error);
  }

  // Fallback to default logo paths
  return '/logo/logo.png';
}

export async function loadLogoImage(eventId: string): Promise<HTMLImageElement | null> {
  try {
    const logoUrl = await getLogoUrl(eventId);
    
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = logoUrl;
      
      img.onload = () => {
        console.log('[LogoHelper] Logo loaded successfully from:', logoUrl);
        resolve(img);
      };
      
      img.onerror = () => {
        console.warn('[LogoHelper] Error loading logo from:', logoUrl);
        
        // Try alternate paths
        const alternatePaths = [
          '/logo.png',
          '/images/logo.png',
          '/assets/logo.png'
        ];
        
        let attemptCount = 0;
        
        const tryNextPath = () => {
          if (attemptCount >= alternatePaths.length) {
            console.error('[LogoHelper] All logo loading attempts failed');
            resolve(null);
            return;
          }
          
          const altImg = new Image();
          altImg.crossOrigin = 'anonymous';
          altImg.src = alternatePaths[attemptCount];
          
          altImg.onload = () => {
            console.log('[LogoHelper] Logo loaded from alternate path:', alternatePaths[attemptCount]);
            resolve(altImg);
          };
          
          altImg.onerror = () => {
            attemptCount++;
            tryNextPath();
          };
        };
        
        tryNextPath();
      };
    });
  } catch (error) {
    console.error('[LogoHelper] Error in loadLogoImage:', error);
    return null;
  }
}

export function createFallbackLogo(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, 200, 100);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('KARAOKE APP', 100, 50);
    ctx.strokeStyle = '#3f83f8';
    ctx.lineWidth = 4;
    ctx.strokeRect(5, 5, 190, 90);
  }
  
  return canvas;
}
