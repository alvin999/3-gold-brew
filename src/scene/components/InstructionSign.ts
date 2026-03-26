import * as THREE from 'three';
import { LAYOUT } from '../layout';

export class InstructionSign {
  public group: THREE.Group;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;

  constructor(x: number, _y: number, _z: number) {
    this.group = new THREE.Group();
    this.group.position.set(x, LAYOUT.SIGNBOARD.BASE_Y, _z);
    this.group.rotation.x = -Math.PI / 3; // 固定傾角 (約 60 度)，不再朝向相機以方便閱讀

    // 放大看板幾何尺寸 (4x1.2 -> 5.0x1.5)，增加視覺重量
    const panelGeo = new THREE.PlaneGeometry(3.8, 1.14);
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024; // 寬度解析度翻倍
    this.canvas.height = 300; // 高度解析度同步
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.anisotropy = 16;
    this.texture.generateMipmaps = true;

    const panelMat = new THREE.MeshStandardMaterial({
      map: this.texture,
      side: THREE.DoubleSide,
      transparent: true,
      roughness: 1.0,
      metalness: 0.0,
      emissive: 0x42A5F5,
      emissiveIntensity: 0.05
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    this.group.add(panel);
    this.update("準備中", "等待開始", false);
  }

  public update(instruction: string, subText: string, isHint: boolean) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 1024, 300);

    // 背景
    ctx.fillStyle = isHint ? 'rgba(211, 47, 47, 0.95)' : 'rgba(20, 30, 40, 0.85)';
    if ((ctx as any).roundRect) {
      ctx.beginPath();
      (ctx as any).roundRect(0, 0, 1024, 300, 40);
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, 1024, 300);
    }

    // 邊框
    ctx.strokeStyle = isHint ? '#FFEB3B' : '#42A5F5';
    ctx.lineWidth = 16;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 指令文字翻倍 (48 -> 96)
    ctx.font = 'bold 96px "Silkscreen", monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.fillText(instruction, 512, 100);

    // 副標題文字翻倍 (32 -> 64)
    ctx.font = 'bold 64px "Silkscreen", monospace';
    ctx.fillStyle = isHint ? '#FFEB3B' : '#90CAF9';
    ctx.fillText(subText, 512, 210);

    this.texture.needsUpdate = true;
  }
}
