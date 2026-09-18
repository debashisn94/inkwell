// Brand tokens, derived from research output but always overridable in ad.json.
import brand from '../brand.json';
import ad from '../ad.json';

type Palette = { accent: string; ink: string; surface: string; dark: boolean };

const p: Palette = { ...(brand as any).palette, ...((ad as any).palette || {}) };

// Readable contrast against the accent, for text sitting ON a button or chip.
const lum = (hex: string) => {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const theme = {
  accent: p.accent,
  ink: p.ink,
  surface: p.surface,
  dark: p.dark,
  onAccent: lum(p.accent) > 0.55 ? '#0B0D12' : '#FFFFFF',
  muted: p.dark ? 'rgba(255,255,255,0.62)' : 'rgba(16,18,24,0.62)',
  hairline: p.dark ? 'rgba(255,255,255,0.14)' : 'rgba(16,18,24,0.12)',
  font: (ad as any).font ||
    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

export const name: string = (ad as any).brandName || (brand as any).name;
