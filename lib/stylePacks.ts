import { DEFAULT_STYLE_PACK_ID, stylePacks, type StylePackDefinition } from '@/config/style-packs';

const normalizeCategory = (category?: string) => {
  if (!category) {
    return 'all';
  }
  return category.toLowerCase();
};

export const listStylePacks = () => stylePacks;

export function getStylePackById(id?: string | null): StylePackDefinition {
  if (!id) {
    return stylePacks.find((pack) => pack.id === DEFAULT_STYLE_PACK_ID) || stylePacks[0];
  }
  return stylePacks.find((pack) => pack.id === id) || stylePacks[0];
}

export function applyStylePackCssVariables(stylePackId?: string | null) {
  if (typeof document === 'undefined') {
    return;
  }

  const fallbackPack = getStylePackById(DEFAULT_STYLE_PACK_ID);
  const targetPack = getStylePackById(stylePackId);
  const root = document.documentElement;

  const applyPackVariables = (pack: StylePackDefinition) => {
    Object.entries(pack.cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  };

  applyPackVariables(fallbackPack);
  if (targetPack.id !== fallbackPack.id) {
    applyPackVariables(targetPack);
  }
}

export function resolveCategoryBackground(stylePackId: string | null | undefined, category: string) {
  const pack = getStylePackById(stylePackId);
  return pack.categoryBackground(normalizeCategory(category));
}

export function resolveSongImage(stylePackId: string | null | undefined, songKey: string) {
  const pack = getStylePackById(stylePackId);
  return pack.songImageResolver(songKey);
}

export type { StylePackDefinition };
export { DEFAULT_STYLE_PACK_ID } from '@/config/style-packs';
