import * as THREE from 'three';
import { LAYOUT } from '../layout';

export class HUD3D {
  public signboard: THREE.Mesh;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 512;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);

    const uiGeo = new THREE.PlaneGeometry(4.2, 2.1);
    const uiMat = new THREE.MeshStandardMaterial({
      map: this.texture,
      transparent: true,
      roughness: 1.0,
      metalness: 0.1,
      emissive: 0x0D47A1,
      emissiveIntensity: 0.01
    });
    this.signboard = new THREE.Mesh(uiGeo, uiMat);
    this.signboard.position.set(0, LAYOUT.TIMER.BASE_Y, LAYOUT.TIMER.Z);
    this.signboard.visible = false;
  }

  public setVisibility(visible: boolean) {
    this.signboard.visible = visible;
  }

  public updateHUD(time: string, weight: string, guide: string = "") {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 1024, 512);

    // 背景卡片
    this.drawRoundedCard(ctx, 0, 0, 1024, 512, 40, 'rgba(255, 255, 255, 0.9)');

    ctx.font = '60px "Silkscreen"';
    ctx.fillStyle = '#263238';
    ctx.textAlign = 'center';

    const isScore = weight.includes("SCORE");

    if (guide) {
      ctx.font = 'bold 70px "Silkscreen"';
      ctx.fillText(time, 512, 180);

      ctx.fillStyle = isScore ? '#1E88E5' : '#EF6C00';
      ctx.font = isScore ? 'bold 90px "Silkscreen"' : 'bold 80px "Noto Sans TC"';
      ctx.fillText(isScore ? weight : guide, 512, 330);

      if (isScore) {
        ctx.fillStyle = '#455A64';
        ctx.font = 'bold 40px "Noto Sans TC"';
        ctx.fillText(guide, 512, 420);
      }
    } else {
      ctx.font = 'bold 120px "Silkscreen"';
      ctx.fillText(time, 512, 300);
    }

    this.texture.needsUpdate = true;
  }

  public updateRecipe(title: string, subtitle: string, stages: any[], currentTime: string = "") {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 1024, 512);

    this.drawRoundedCard(ctx, 0, 0, 1024, 512, 40, 'rgba(255, 255, 255, 0.95)');

    if (currentTime) {
      this.drawRoundedCard(ctx, 0, 0, 1024, 100, 40, 'rgba(33, 150, 243, 0.1)');
      ctx.fillStyle = '#1565C0';
      ctx.font = 'bold 54px "Silkscreen"';
      ctx.textAlign = 'center';
      ctx.fillText(currentTime, 512, 70);
    }

    let yBase = currentTime ? 160 : 80;
    ctx.fillStyle = '#1976D2';
    ctx.font = 'bold 36px "Noto Sans TC"';
    ctx.textAlign = 'left';
    ctx.fillText(title, 50, yBase);

    ctx.fillStyle = '#546E7A';
    ctx.font = '28px "Silkscreen"';
    ctx.textAlign = 'right';
    ctx.fillText(subtitle, 974, yBase);

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.moveTo(50, yBase + 30);
    ctx.lineTo(974, yBase + 30);
    ctx.stroke();

    ctx.fillStyle = '#90A4AE';
    ctx.font = 'bold 22px "Noto Sans TC"';
    ctx.textAlign = 'left';
    ctx.fillText("階段說明", 60, yBase + 70);
    ctx.textAlign = 'center';
    ctx.fillText("注水目標 (累計)", 540, yBase + 70);
    ctx.textAlign = 'right';
    ctx.fillText("時間點 (總時)", 960, yBase + 70);

    let y = yBase + 130;
    stages.forEach((s, i) => {
      if (i % 2 === 0) {
        this.drawRoundedCard(ctx, 50, y - 40, 924, 60, 10, 'rgba(0,0,0,0.03)');
      }
      ctx.fillStyle = '#263238';
      ctx.font = 'bold 28px "Silkscreen"';
      ctx.textAlign = 'left';
      ctx.fillText(`${s.label}`, 60, y);
      ctx.fillStyle = '#1E88E5';
      ctx.font = 'bold 32px "Silkscreen"';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.floor(s.targetWeight)}g`, 540, y);
      ctx.fillStyle = '#455A64';
      ctx.font = 'bold 28px "Silkscreen"';
      ctx.textAlign = 'right';
      const min = Math.floor(s.endTime / 60).toString().padStart(2, '0');
      const sec = (s.endTime % 60).toString().padStart(2, '0');
      ctx.fillText(`${min}:${sec}`, 960, y);
      y += 70;
    });

    this.texture.needsUpdate = true;
  }

  private drawRoundedCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  public updateTilt(tiltFactor: number) {
    const dynamicTilt = -tiltFactor * (Math.PI / 2);
    this.signboard.rotation.x = dynamicTilt;
    this.signboard.position.y = LAYOUT.TIMER.BASE_Y + (1 - tiltFactor) * LAYOUT.TIMER.LIFT;
  }
}
