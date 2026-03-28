import * as THREE from 'three';
import { LAYOUT } from '../layout';

export class Kettle {
  public group: THREE.Group;
  public waterStream: THREE.Mesh;
  private waterStreamMaterial!: THREE.ShaderMaterial;

  constructor() {
    this.group = new THREE.Group();
    this.initModel();
    this.waterStream = this.initWaterStream();
    this.group.visible = false;
  }

  private initModel() {
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xCFD8DC, metalness: 0.4, roughness: 0.9, flatShading: true, transparent: true });
    const darkSilverMat = new THREE.MeshStandardMaterial({ color: 0x90A4AE, metalness: 0.1, roughness: 1.0, flatShading: true, transparent: true });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xFFD54F, metalness: 0.3, roughness: 0.8, transparent: true });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xA1887F, roughness: 0.9, flatShading: true, transparent: true });

    // 壺身
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.6, 8), darkSilverMat);
    base.position.y = -1.2; base.castShadow = true; this.group.add(base);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.2, 2.8, 8), silverMat);
    body.castShadow = true; this.group.add(body);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.3, 0.4, 8), silverMat);
    lid.position.y = 1.6; this.group.add(lid);
    const knob = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), goldMat);
    knob.position.y = 1.95; this.group.add(knob);

    // 壺嘴
    const spoutPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.2, -0.5, 0),
      new THREE.Vector3(-2.8, 0, 0),
      new THREE.Vector3(-3.5, 1.8, 0),
      new THREE.Vector3(-3.8, 2.5, 0)
    ]);
    this.group.add(new THREE.Mesh(new THREE.TubeGeometry(spoutPath, 24, 0.15, 8, false), silverMat));

    // 把手
    const handleGroup = new THREE.Group();
    const joint = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.4), goldMat); joint.position.set(1.4, 1.2, 0); handleGroup.add(joint);
    const h1 = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 0.5), woodMat); h1.position.set(2.8, 1.2, 0); h1.rotation.z = -0.3; handleGroup.add(h1);
    const h2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.5, 0.5), woodMat); h2.position.set(4.2, -0.2, 0); h2.rotation.z = -0.1; handleGroup.add(h2);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.6), goldMat); cap.position.set(4.35, -1.9, 0); handleGroup.add(cap);
    this.group.add(handleGroup);

    this.group.scale.set(LAYOUT.MODEL.SCALE, LAYOUT.MODEL.SCALE, LAYOUT.MODEL.SCALE);
    this.group.position.set(0, LAYOUT.KETTLE_Y, 0);
  }

  private initWaterStream(): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(0.1, 0.1, 25, 12, 64);
    this.waterStreamMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0xFFFFFF) },
        flowSpeed: { value: 1.5 },
        curvature: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        uniform float time;
        uniform float flowSpeed;
        uniform float curvature;
        
        void main() {
          vUv = uv;
          vec3 pos = position;
          float distFromTop = 12.5 - pos.y;
          float offset = curvature * pow(distFromTop / 25.0, 0.5);
          pos.x -= offset; 
          float rScale = 1.0 - (distFromTop / 25.0) * 0.3;
          pos.xz *= rScale;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float time;
        uniform float flowSpeed;
        uniform vec3 color;
        
        void main() {
          float streak = sin(vUv.y * 50.0 + time * flowSpeed * 10.0) * 0.05 + 0.95;
          float alpha = 0.45 * streak;
          float fade = smoothstep(0.0, 0.05, vUv.y) * (1.0 - smoothstep(0.95, 1.0, vUv.y));
          gl_FragColor = vec4(color, alpha * fade);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });

    const stream = new THREE.Mesh(geo, this.waterStreamMaterial);
    stream.visible = false;
    return stream;
  }

  public setVisibility(visible: boolean) {
    this.group.visible = visible;
  }

  public update(pos: { x: number, y: number, z: number }, isPouring: boolean, flowSpeed: number = 1.5) {
    this.group.position.set(pos.x, LAYOUT.KETTLE_Y, pos.z);
    
    const targetRotZ = isPouring ? 0.35 : 0;
    this.group.rotation.z += (targetRotZ - this.group.rotation.z) * 0.1;

    this.waterStream.visible = isPouring;
    if (this.waterStreamMaterial) {
      this.waterStreamMaterial.uniforms.flowSpeed.value = flowSpeed;
    }

    this.group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat && mat.opacity !== undefined) mat.opacity = isPouring ? 0.4 : 1.0;
      }
    });
  }

  public getSpoutWorldPos(): THREE.Vector3 {
    return this.group.localToWorld(new THREE.Vector3(LAYOUT.KETTLE_SPOUT.x, LAYOUT.KETTLE_SPOUT.y, 0));
  }

  public setStreamParams(height: number, visualRadius: number, curvature: number, time: number) {
    this.waterStream.scale.y = height / 25;
    this.waterStream.scale.x = visualRadius / 0.1;
    this.waterStream.scale.z = this.waterStream.scale.x;
    const worldPos = this.getSpoutWorldPos();
    this.waterStream.position.set(worldPos.x, worldPos.y - height / 2, worldPos.z);
    
    if (this.waterStreamMaterial) {
      this.waterStreamMaterial.uniforms.time.value = time;
      this.waterStreamMaterial.uniforms.curvature.value = curvature / (this.waterStream.scale.x || 1.0);
    }
  }
}
