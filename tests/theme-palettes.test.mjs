import test from 'node:test';
import assert from 'node:assert/strict';
import { darkPalette, lightPalette } from '../apps/web/src/app/theme-tokens.js';

// Contraste dos textos usados sobre as superfícies, calculado pela luminância sRGB.
function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
// Both palettes share semantic contrast requirements; gold backgrounds use dark foregrounds.
for (const palette of [lightPalette, darkPalette]) {
  test('contraste AA: ' + palette.mode, () => {
    for (const surface of [
      palette.background.default,
      palette.background.paper,
      palette.surface.secondary,
      palette.surface.hover
    ]) {
      for (const text of [palette.text.primary, palette.text.secondary, palette.primary.dark])
        assert.ok(contrast(surface, text) >= 4.5, surface + ' / ' + text);
    }
    assert.ok(contrast(palette.primary.main, palette.primary.contrastText) >= 4.5);
    assert.ok(contrast(palette.primary.hover, palette.primary.contrastText) >= 4.5);
  });
}
