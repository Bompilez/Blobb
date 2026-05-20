# Blobb – Contrast Palette Checker

Palette-first tools for checking WCAG contrast, generating light-to-dark color scales, and exporting tokens.

## Features

- Build a palette (up to 10 colors): name, edit, delete, and copy hex values.
- Manual compare: choose text + background colors, swap, and see WCAG ratios for common thresholds.
- Palette compare: scan the full palette against itself (grid + list) and focus passing pairs.
- Preview: see selected colors in UI-like examples (text, controls, and interface elements).
- Tune with contrast map: adjust a selected color using an interactive contrast map and HSL controls.
- Scale generator: generate a light-to-dark scale from a selected base color.
- Compare scale: scan generated scale steps (grid + list) and focus passing pairs.
- Export scale: copy CSS/JS/JSON tokens, choose HEX/RGB/HSL, and download ASE (Adobe Swatch Exchange).
- Export palette: copy CSS/JSON tokens, choose HEX/RGB/HSL, and download ASE.
- Local storage: palette persists across refreshes.

## Tech

- React
- Vite
- CSS
- Vercel Analytics + Speed Insights

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```
