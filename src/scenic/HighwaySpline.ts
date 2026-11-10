import * as THREE from 'three';

/**
 * HighwaySpline - Real-life curving Japanese Expressway trajectory.
 * Provides authentic gentle sweeping arcs and S-bends like the Tokyo Shuto Expressway.
 */
export interface HighwayPoint {
  x: number;
  rotY: number;
  slope: number;
}

export function getRoadSpline(z: number): HighwayPoint {
  // Gentle Tokyo Metropolitan Expressway curves (wavelength ~800m and ~350m)
  const x = Math.sin(z * 0.0055) * 11.5 + Math.sin(z * 0.014) * 4.8;
  // Derivative dx/dz for heading rotation
  const dx = Math.cos(z * 0.0055) * 0.0055 * 11.5 + Math.cos(z * 0.014) * 0.014 * 4.8;
  const rotY = Math.atan2(dx, 1.0);
  return { x, rotY, slope: dx };
}
