import * as THREE from 'three';
import { LAYOUT } from '../layout';

export class DripperSet {
  public group: THREE.Group;
  private serverLiquid!: THREE.Mesh;
  private dripperLiquid!: THREE.Mesh;
  private dripEffect!: THREE.Mesh;
  private powder!: THREE.Mesh;

  constructor(x: number, y: number, z: number, _id: number) {
    this.group = new THREE.Group();
    this.group.position.set(x, y, z);
    this.initModel();
    this.group.scale.set(LAYOUT.MODEL.SCALE, LAYOUT.MODEL.SCALE, LAYOUT.MODEL.SCALE);
  }

  private initModel() {
    // 下壺 (玻璃)
    const serverGeo = new THREE.CylinderGeometry(1.2, 1.5, 2.5, 12);
    const serverMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.4, side: THREE.DoubleSide
    });
    const server = new THREE.Mesh(serverGeo, serverMat);
    server.position.y = 1.25; server.receiveShadow = true; server.castShadow = true;
    this.group.add(server);

    // 支架底座
    const standGeo = new THREE.BoxGeometry(3, 0.2, 3);
    const standMat = new THREE.MeshStandardMaterial({ color: LAYOUT.COLORS.STAND, roughness: 0.75, metalness: 0.1, flatShading: true });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.name = 'stand';
    stand.position.y = LAYOUT.MODEL.DRIPPER_BOTTOM_Y; stand.castShadow = true;
    this.group.add(stand);

    // 濾杯
    const dripperGeo = new THREE.CylinderGeometry(1.5, 0.2, 1.8, 8, 1, true);
    const dripperMat = new THREE.MeshStandardMaterial({ color: LAYOUT.COLORS.DRIPPER, roughness: 0.5, metalness: 0.1, flatShading: true, side: THREE.DoubleSide });
    const dripper = new THREE.Mesh(dripperGeo, dripperMat);
    dripper.position.y = 3.5; dripper.rotation.y = 0.5; dripper.castShadow = true;
    this.group.add(dripper);

    // 下壺液體
    const serverLiquidGeo = new THREE.CylinderGeometry(1.18, 1.45, 1, 12);
    const serverLiquidMat = new THREE.MeshStandardMaterial({
      color: LAYOUT.COLORS.LIQUID, roughness: 0.1, metalness: 0.5, flatShading: true, emissive: LAYOUT.COLORS.LIQUID, emissiveIntensity: 0.6
    });
    this.serverLiquid = new THREE.Mesh(serverLiquidGeo, serverLiquidMat);
    this.serverLiquid.name = 'serverLiquid';
    this.serverLiquid.scale.set(1.0, 0.01, 1.0);
    this.serverLiquid.position.y = LAYOUT.MODEL.SERVER_BASE_Y;
    this.group.add(this.serverLiquid);

    // 濾杯內部積水
    const dripperLiquidGeo = new THREE.CylinderGeometry(1.4, 0.2, 1.6, 8, 1, false);
    const dripperLiquidMat = new THREE.MeshStandardMaterial({
      color: LAYOUT.COLORS.LIQUID, transparent: true, opacity: 0.95, roughness: 0.1, metalness: 0.3, emissive: LAYOUT.COLORS.LIQUID, emissiveIntensity: 0.8, side: THREE.DoubleSide
    });
    this.dripperLiquid = new THREE.Mesh(dripperLiquidGeo, dripperLiquidMat);
    this.dripperLiquid.name = 'dripperLiquid';
    this.dripperLiquid.position.y = (LAYOUT.MODEL.DRIPPER_BOTTOM_Y + (LAYOUT.MODEL.DRIPPER_MAX_H / 2));
    this.dripperLiquid.scale.set(0.1, 0.01, 0.1);
    this.group.add(this.dripperLiquid);

    // 滴落水滴
    const dripGeo = new THREE.CylinderGeometry(0.05, 0.02, 1, 6);
    const dripMat = new THREE.MeshStandardMaterial({ color: 0x24140a, transparent: true, opacity: 0.6 });
    this.dripEffect = new THREE.Mesh(dripGeo, dripMat);
    this.dripEffect.name = 'drip';
    this.dripEffect.position.y = 2.6;
    this.dripEffect.visible = false;
    this.group.add(this.dripEffect);

    // 底座咖啡環
    const standRingGeo = new THREE.CylinderGeometry(1, 1, 0.05, 16);
    const standRingMat = new THREE.MeshStandardMaterial({ color: LAYOUT.COLORS.STAND_RING, roughness: 0.8 });
    const standRing = new THREE.Mesh(standRingGeo, standRingMat);
    standRing.position.y = LAYOUT.MODEL.DRIPPER_BOTTOM_Y + 0.15;
    this.group.add(standRing);

    // 咖啡粉
    const powderGeo = new THREE.CylinderGeometry(0.6, 0.4, 0.1, 16);
    const powderMat = new THREE.MeshStandardMaterial({ color: LAYOUT.COLORS.POWDER, roughness: 1.0 });
    this.powder = new THREE.Mesh(powderGeo, powderMat);
    this.powder.name = 'powder';
    this.powder.position.y = LAYOUT.MODEL.POWDER_BASE_Y;
    this.group.add(this.powder);
  }

  public update(serverRatio: number, dripperRatio: number, isPouring: boolean, isOverLimit: boolean = false) {
    // 1. 下壺液位更新
    const cappedSRatio = Math.min(1.1, serverRatio);
    const targetScaleY = serverRatio > 0 ? Math.max(0.1, cappedSRatio * LAYOUT.MODEL.SERVER_MAX_H) : 0.001;
    this.serverLiquid.scale.y = targetScaleY;
    this.serverLiquid.position.y = LAYOUT.MODEL.SERVER_BASE_Y + targetScaleY / 2;
    this.serverLiquid.visible = serverRatio > 0.001;

    // 2. 濾杯液位更新
    const cappedDRatio = Math.max(0.01, Math.min(1.0, dripperRatio));
    this.dripperLiquid.scale.set(0.2 + cappedDRatio * 0.8, cappedDRatio, 0.2 + cappedDRatio * 0.8);
    const actualHeight = cappedDRatio * LAYOUT.MODEL.DRIPPER_MAX_H;
    this.dripperLiquid.position.y = LAYOUT.MODEL.DRIPPER_BOTTOM_Y + actualHeight / 2;
    this.dripperLiquid.visible = dripperRatio > 0.005;

    // 3. 咖啡粉高度與顏色
    this.powder.position.y = dripperRatio > 0.1 ? LAYOUT.MODEL.POWDER_WET_Y : LAYOUT.MODEL.POWDER_BASE_Y;
    if (isPouring) {
      (this.powder.material as THREE.MeshStandardMaterial).color.lerp(new THREE.Color(LAYOUT.COLORS.POWDER_WET), 0.05);
    }

    // 4. 滴落特效
    if (dripperRatio > 0.05) {
      this.dripEffect.visible = true;
      const serverLiquidTopY = serverRatio > 0 ? (LAYOUT.MODEL.SERVER_BASE_Y + (Math.min(1.1, serverRatio) * LAYOUT.MODEL.SERVER_MAX_H)) : LAYOUT.MODEL.SERVER_BASE_Y;
      const dripLength = Math.max(0.1, LAYOUT.MODEL.DRIPPER_BOTTOM_Y - serverLiquidTopY);
      this.dripEffect.scale.y = dripLength;
      
      const time = performance.now() * 0.001;
      const dripPulse = Math.sin(time * 15.0) * 0.5 + 0.5;
      const jitter = (Math.random() - 0.5) * 0.02;

      this.dripEffect.position.set(jitter, LAYOUT.MODEL.DRIPPER_BOTTOM_Y - dripLength / 2, jitter);
      const dripMat = this.dripEffect.material as THREE.MeshStandardMaterial;
      dripMat.opacity = (0.2 + dripperRatio * 0.5) * (0.8 + dripPulse * 0.2);
      this.dripEffect.scale.x = (0.8 + dripPulse * 0.4);
      this.dripEffect.scale.z = this.dripEffect.scale.x;
    } else {
      this.dripEffect.visible = false;
    }

    // 發光反饋
    const feedbackMode = isOverLimit ? 'error' : (isPouring ? 'active' : 'none');
    this.applyEmissiveFeedback(feedbackMode);
  }

  public applyEmissiveFeedback(mode: 'none' | 'active' | 'error') {
    const config = {
      'none':   { color: 0x000000, intensity: 0 },
      'active': { color: 0xFFE082, intensity: 0.2 },
      'error':  { color: 0xFF1744, intensity: 0.5 }
    }[mode];

    this.group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh && obj.name !== 'dripperLiquid' && obj.name !== 'serverLiquid' && (obj as THREE.Mesh).material) {
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat.emissive) {
          mat.emissive.setHex(config.color);
          mat.emissiveIntensity = config.intensity;
        }
      }
    });
  }
}
