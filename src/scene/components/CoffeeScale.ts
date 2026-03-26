import * as THREE from 'three';

export class CoffeeScale {
  public mesh: THREE.Group;
  public screen!: THREE.Mesh;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;

  constructor(x: number, y: number, z: number) {
    this.mesh = new THREE.Group();
    this.mesh.position.set(x, y, z);
    const baseGeo = new THREE.BoxGeometry(2.5, 0.2, 2.5); // 縮小底座: 5 -> 2.5
    const baseMat = new THREE.MeshPhongMaterial({ color: 0xCFD8DC, flatShading: true });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.1;
    base.castShadow = true;
    base.receiveShadow = true;
    this.mesh.add(base);
    const screenGeo = new THREE.PlaneGeometry(1.8, 0.5); // 稍微放大螢幕尺寸: 1.2x0.35 -> 1.8x0.5
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512; // 解析度翻倍
    this.canvas.height = 128;
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 16;
    this.texture.generateMipmaps = true;

    const screenMat = new THREE.MeshStandardMaterial({
      map: this.texture,
      transparent: true,
      roughness: 0.2,
      metalness: 0.2,
      // 移除強制最上層渲染，恢復深度測試以避免遮擋手沖壺
    });
    this.screen = new THREE.Mesh(screenGeo, screenMat);
    // 稍微增加 y 與 z 偏移 (y:0.15->0.18, z:1.26->1.32)，避免在特定角度嵌入機身
    this.screen.position.set(0, 0.3, 1.32);
    this.screen.rotation.x = -0.6; // 初始傾角
    this.mesh.add(this.screen);
    this.update(0);
  }

  public update(weight: number, timeStr: string = '00:00') {
    const ctx = this.ctx;
    // 使用與底座相同的背景色 #CFD8DC
    ctx.fillStyle = '#CFD8DC';
    ctx.fillRect(0, 0, 512, 128);

    // 文字樣式
    ctx.font = 'bold 54px monospace';
    ctx.fillStyle = '#263238'; // 深灰色文字
    ctx.textBaseline = 'middle';

    // 左邊：計時器
    ctx.textAlign = 'left';
    ctx.fillText(timeStr, 20, 64);

    // 右邊：重量
    ctx.textAlign = 'right';
    ctx.fillText(weight.toFixed(1) + ' g', 492, 64);

    this.texture.needsUpdate = true;
  }
}
