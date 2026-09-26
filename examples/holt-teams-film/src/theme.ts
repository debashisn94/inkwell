import type React from 'react';
// Brand tokens for the film. Research output first, film.json overrides on top.
import { loadFont as loadDisplay } from '@remotion/google-fonts/SpaceGrotesk';
import { loadFont as loadBody } from '@remotion/google-fonts/IBMPlexSans';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';
import brand from '../brand.json';
import film from '../film.json';

const display = loadDisplay('normal', { weights: ['500', '600', '700'], subsets: ['latin'] }).fontFamily;
const body = loadBody('normal', { weights: ['400', '500', '600'], subsets: ['latin'] }).fontFamily;
const mono = loadMono('normal', { weights: ['400', '500', '700'], subsets: ['latin'] }).fontFamily;

const f = film as any;
const b = brand as any;
const p = { ...(b.palette || {}), ...(f.palette || {}) };

// A film is always shot dark: the ambient glow, grain and vignette that stop it reading as
// slides only work on a dark canvas. A light brand keeps its accent; the surface is forced.
const surface = p.dark === false ? '#0F0E0C' : (p.surface || '#0F0E0C');

export const theme = {
  accent: p.accent || '#E8A33D',
  // The second colour carries "incoming" data (writes, flows) against the accent's "recall".
  accent2: p.accent2 || '#4DD0E1',
  surface,
  ink: p.dark === false ? '#F2EFE9' : (p.ink || '#F2EFE9'),
  danger: '#EE6065',
  success: '#5BD66F',
  display: `${display}, 'Segoe UI', system-ui, sans-serif`,
  body: `${body}, -apple-system, 'Segoe UI', sans-serif`,
  mono: `${mono}, ui-monospace, Menlo, monospace`,
};

export const brandName: string = f.brandName || b.name || 'Product';
export const wordmark: string = f.wordmark || brandName.toLowerCase();
export const tag: string | undefined = f.tag;

/** CSS custom properties consumed by styles.ts. */
export const cssVars = {
  '--accent': theme.accent,
  '--accent2': theme.accent2,
  '--bg': theme.surface,
  '--text': theme.ink,
  '--danger': theme.danger,
  '--success': theme.success,
  '--f-display': theme.display,
  '--f-body': theme.body,
  '--f-mono': theme.mono,
} as React.CSSProperties;
