import * as THREE from 'three';
import { LAYOUT } from '../layout';

export class SplashParticles {
  public mesh: THREE.Points;
  private splashCount = LAYOUT.PARTICLES.COUNT;
  private splashSpeeds: THREE.Vector3[] = [];

  constructor() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.splashCount * 3);
    const colors = new Float32Array(this.splashCount * 3);
    const sizes = new Float32Array(this.splashCount);

    for (let i = 0; i < this.splashCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;
      colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1;
      sizes[i] = 0;
      this.splashSpeeds.push(new THREE.Vector3(0, 0, 0));
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: LAYOUT.PARTICLES.SIZE,
      vertexColors: true,
      transparent: true,
      opacity: LAYOUT.PARTICLES.OPACITY,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true
    });

    this.mesh = new THREE.Points(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
  }

  public emit(pos: { x: number, y: number, z: number }, isInside: boolean, intensity: number = 1.0) {
    const positions = this.mesh.geometry.attributes.position.array as Float32Array;
    const baseCount = isInside ? 0.6 : 2.5; 
    const countToEmit = Math.floor(baseCount * intensity) + (Math.random() < (baseCount * intensity % 1) ? 1 : 0);

    for (let i = 0; i < countToEmit; i++) {
      const idx = Math.floor(Math.random() * this.splashCount);
      const spread = isInside ? 0.04 : 0.15;
      
      positions[idx * 3] = pos.x + (Math.random() - 0.5) * spread;
      positions[idx * 3 + 1] = pos.y;
      positions[idx * 3 + 2] = pos.z + (Math.random() - 0.5) * spread;

      const vYMin = isInside ? 0.03 : 0.12;
      const vYRange = isInside ? 0.08 : 0.3;
      const vHScale = isInside ? 0.03 : 0.15;

      this.splashSpeeds[idx].set(
        (Math.random() - 0.5) * vHScale * intensity,
        (Math.random() * vYRange + vYMin) * intensity,
        (Math.random() - 0.5) * vHScale * intensity
      );
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }

  public update() {
    const positions = this.mesh.geometry.attributes.position.array as Float32Array;
    let needsUpdate = false;

    for (let i = 0; i < this.splashCount; i++) {
      if (positions[i * 3 + 1] > -50) {
        const speed = this.splashSpeeds[i];
        positions[i * 3] += speed.x;
        positions[i * 3 + 1] += speed.y;
        positions[i * 3 + 2] += speed.z;

        speed.y -= LAYOUT.PARTICLES.GRAVITY;
        speed.x *= LAYOUT.PARTICLES.RESISTANCE;
        speed.z *= LAYOUT.PARTICLES.RESISTANCE;

        if (positions[i * 3 + 1] < LAYOUT.TABLE_Y - 0.2) {
          positions[i * 3 + 1] = -100;
        }
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      this.mesh.geometry.attributes.position.needsUpdate = true;
    }
  }
}
