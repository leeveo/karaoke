export type CategoryBackgroundResolver = (categorySlug: string) => string;
export type SongImageResolver = (songKey: string) => string;

export interface StylePackDefinition {
  id: string;
  name: string;
  description: string;
  previewBackground: string;
  previewCategoryImage?: string; // Aperçu d'une carte catégorie
  previewSongImage?: string;     // Aperçu d'une vignette chanson
  tags: string[];
  cssVariables: Record<string, string>;
  categoryBackground: CategoryBackgroundResolver;
  songImageResolver: SongImageResolver; // 🆕 Résolution d'image par chanson
  cardHints?: {
    overlayOpacity?: number;
    headlineShadow?: string;
  };
}

export const DEFAULT_STYLE_PACK_ID = 'classic';

// URL de base pour les assets des style packs (optionnel)
// Si configuré, utilise le CDN/S3, sinon utilise les images locales
// Exemple: https://d1234567890.cloudfront.net ou https://leeveostockage.s3.eu-west-3.amazonaws.com
const STYLE_PACK_CDN_BASE_URL = process.env.NEXT_PUBLIC_STYLE_PACK_CDN_URL || '';

// Helper pour résoudre le chemin avec CDN ou local
const resolveAssetPath = (localPath: string): string => {
  return STYLE_PACK_CDN_BASE_URL ? `${STYLE_PACK_CDN_BASE_URL}${localPath}` : localPath;
};

const imageBackground = (basePath: string): CategoryBackgroundResolver => {
  return (categorySlug: string) => {
    if (!categorySlug) {
      return 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.65) 100%)';
    }
    // Utiliser CDN si configuré, sinon chemin local
    const fullPath = STYLE_PACK_CDN_BASE_URL ? `${STYLE_PACK_CDN_BASE_URL}${basePath}` : basePath;
    return `url('${fullPath}/${categorySlug}.png')`;
  };
};

const imageBackgroundJpg = (basePath: string): CategoryBackgroundResolver => {
  return (categorySlug: string) => {
    if (!categorySlug) {
      return 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.65) 100%)';
    }
    // Utiliser CDN si configuré, sinon chemin local
    const fullPath = STYLE_PACK_CDN_BASE_URL ? `${STYLE_PACK_CDN_BASE_URL}${basePath}` : basePath;
    return `url('${fullPath}/${categorySlug}.jpg')`;
  };
};


const packSongImages = (packId: string): SongImageResolver => {
  return (songKey: string) => {
    // Extraire juste le nom de fichier (songKey peut être "karaokesaas/anglais/Song-Artist-category.mp4")
    const fileName = songKey.split('/').pop() || songKey;
    // Extraire le nom sans l'extension .mp4
    const nameWithoutExt = fileName.replace(/\.mp4$/i, '');
    // Résout : /style-packs/{packId}/songs/{songKey}.jpg
    const localPath = `/style-packs/${packId}/songs/${nameWithoutExt}.jpg`;
    // Utiliser CDN si configuré, sinon chemin local
    return STYLE_PACK_CDN_BASE_URL ? `${STYLE_PACK_CDN_BASE_URL}${localPath}` : localPath;
  };
};

const pack2SevresSongImages = (): SongImageResolver => {
  return (songKey: string) => {
    // Extraire juste le nom de fichier (songKey peut être "karaokesaas/anglais/Song-Artist-category.mp4")
    const fileName = songKey.split('/').pop() || songKey;
    // Extraire le nom sans l'extension .mp4
    // fileName est comme: "Back To Black-Amy Winehouse-anglais.mp4"
    // On veut: "/style-packs/2sevres/songs/Back To Black-Amy Winehouse-anglais-79.jpg"
    const nameWithoutExt = fileName.replace(/\.mp4$/i, '');
    const localPath = `/style-packs/2sevres/songs/${nameWithoutExt}-79.jpg`;
    // Utiliser CDN si configuré, sinon chemin local
    return STYLE_PACK_CDN_BASE_URL ? `${STYLE_PACK_CDN_BASE_URL}${localPath}` : localPath;
  };
};

const gradientBackground = (
  gradients: Record<string, string>,
  fallback: string
): CategoryBackgroundResolver => {
  return (categorySlug: string) => gradients[categorySlug] || fallback;
};

export const stylePacks: StylePackDefinition[] = [
  {
    id: 'classic',
    name: 'Classique',
    description: 'Style clean et élégant pour tous types de musique',
    previewBackground: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    previewCategoryImage: resolveAssetPath('/style-packs/classic/preview-category.jpg'),
    previewSongImage: resolveAssetPath('/style-packs/classic/preview-song.jpg'),
    tags: ['Sérénité', 'Universel'],
    cssVariables: {
      '--style-pack-card-border': '3px solid rgba(255,255,255,0.85)',
      '--style-pack-card-shadow': '0 25px 50px -12px rgba(3, 52, 185, 0.65)',
      '--style-pack-card-overlay': 'rgba(5, 15, 35, 0.45)',
      '--style-pack-heading-font': '"Poppins", "Inter", sans-serif',
    },
    categoryBackground: imageBackground('/style-packs/classic/categories'),
    songImageResolver: packSongImages('classic'),
  },
  {
    id: 'neon-night',
    name: 'Nuit Néon',
    description: 'Gradients électriques pour une ambiance club',
    previewBackground: 'linear-gradient(135deg, #ff00c6 0%, #6a00ff 100%)',
    previewCategoryImage: resolveAssetPath('/style-packs/neon-night/preview-category.jpg'),
    previewSongImage: resolveAssetPath('/style-packs/neon-night/preview-song.jpg'),
    tags: ['Énergie', 'Clubs'],
    cssVariables: {
      '--style-pack-card-border': '1px solid rgba(255,255,255,0.35)',
      '--style-pack-card-shadow': '0 30px 60px -20px rgba(255,0,153,0.65)',
      '--style-pack-card-overlay': 'rgba(5,0,24,0.55)',
      '--style-pack-heading-font': '"Raleway", "Poppins", sans-serif',
    },
    categoryBackground: gradientBackground(
      {
        all: 'linear-gradient(135deg, #ff00c6 0%, #6a00ff 100%)',
        pop: 'linear-gradient(135deg, #f94892 0%, #ff7a00 100%)',
        rock: 'linear-gradient(135deg, #6100ff 0%, #00e0ff 100%)',
        rap: 'linear-gradient(135deg, #ff4d4d 0%, #2d00f7 100%)',
        'hip-hop': 'linear-gradient(135deg, #ff4d4d 0%, #ff00c3 100%)',
        français: 'linear-gradient(135deg, #00f5ff 0%, #00d9ff 45%, #ff00e0 100%)',
        anglais: 'linear-gradient(135deg, #00a1ff 0%, #0066ff 100%)',
        latino: 'linear-gradient(135deg, #ff9a00 0%, #ff165d 100%)',
        jazz: 'linear-gradient(135deg, #1b0063 0%, #d400ff 100%)',
      },
      'linear-gradient(135deg, #00f5ff 0%, #7f00ff 100%)'
    ),
    songImageResolver: packSongImages('neon-night'),
  },
  {
    id: 'sunset-pulse',
    name: 'Coucher de Soleil',
    description: 'Ambiance chaleureuse et relaxante',
    previewBackground: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    previewCategoryImage: resolveAssetPath('/style-packs/sunset-pulse/preview-category.jpg'),
    previewSongImage: resolveAssetPath('/style-packs/sunset-pulse/preview-song.jpg'),
    tags: ['Chill', 'Premium'],
    cssVariables: {
      '--style-pack-card-border': '2px solid rgba(255,189,105,0.8)',
      '--style-pack-card-shadow': '0 35px 70px -30px rgba(255,138,0,0.75)',
      '--style-pack-card-overlay': 'rgba(8,2,24,0.5)',
      '--style-pack-heading-font': '"Playfair Display", "Times New Roman", serif',
    },
    categoryBackground: gradientBackground(
      {
        all: 'linear-gradient(140deg, #ff9966 0%, #ff5e62 100%)',
        pop: 'linear-gradient(140deg, #ff758c 0%, #ff7eb3 100%)',
        rock: 'linear-gradient(140deg, #ffc371 0%, #ff5f6d 100%)',
        rap: 'linear-gradient(140deg, #f83600 0%, #f9d423 100%)',
        latino: 'linear-gradient(140deg, #f9d423 0%, #ff4e50 100%)',
        jazz: 'linear-gradient(140deg, #654ea3 0%, #eaafc8 100%)',
        reggae: 'linear-gradient(140deg, #1fd1f9 0%, #b621fe 100%)',
        français: 'linear-gradient(140deg, #ff9a9e 0%, #fad0c4 100%)',
        anglais: 'linear-gradient(140deg, #a18cd1 0%, #fbc2eb 100%)',
      },
      'linear-gradient(140deg, #f6d365 0%, #fda085 100%)'
    ),
    songImageResolver: packSongImages('sunset-pulse'),
  },
  {
    id: '2sevres',
    name: 'Deux-Sèvres',
    description: 'Pack personnalisé avec images locales',
    previewBackground: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    previewCategoryImage: resolveAssetPath('/style-packs/2sevres/preview-category.jpg'),
    previewSongImage: resolveAssetPath('/style-packs/2sevres/preview-song.jpg'),
    tags: ['Personnalisé', 'Local'],
    cssVariables: {
      '--style-pack-card-border': '3px solid rgba(100,180,255,0.8)',
      '--style-pack-card-shadow': '0 25px 50px -12px rgba(50,120,200,0.6)',
      '--style-pack-card-overlay': 'rgba(10,20,40,0.45)',
      '--style-pack-heading-font': '"Georgia", serif',
    },
    categoryBackground: imageBackgroundJpg('/style-packs/2sevres/categories'),
    songImageResolver: pack2SevresSongImages(),
  },
];
