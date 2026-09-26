import { createNoise2D, createNoise3D } from 'simplex-noise';
import { mulberry32 } from './rng.js';

export const noise2 = createNoise2D(mulberry32(20261031));
export const noise2b = createNoise2D(mulberry32(777));
export const noise3 = createNoise3D(mulberry32(4242));

export function fbm2(x, z, oct = 4, lac = 2.0, gain = 0.5) {
  let a = 1, f = 1, s = 0, n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * noise2(x * f, z * f);
    n += a;
    a *= gain;
    f *= lac;
  }
  return s / n;
}
