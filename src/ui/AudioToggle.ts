import * as PIXI from 'pixi.js';
import { AudioManager } from '../logic/AudioManager';

/**
 * AudioToggle - 遊戲畫面上的音效開關組件
 */
export class AudioToggle {
  public container: PIXI.Container;
  private icon: PIXI.Graphics;
  private muteLine: PIXI.Graphics;
  private isMuted: boolean = false;

  constructor() {
    this.container = new PIXI.Container();
    this.container.interactive = true;
    this.container.cursor = 'pointer';

    // 建立按鈕背景 (圓形)
    const bg = new PIXI.Graphics()
      .beginFill(0x263238, 0.85) // 深色背景，具備 Interland Style
      .drawCircle(0, 0, 20)
      .endFill();
    this.container.addChild(bg);

    // 建立喇叭圖示
    this.icon = new PIXI.Graphics();
    this.drawSpeakerIcon(0xFFFFFF);
    this.container.addChild(this.icon);

    // 建立禁音斜線 (初始隱藏)
    this.muteLine = new PIXI.Graphics()
      .lineStyle(2, 0xFF5252, 1)
      .moveTo(-10, -10)
      .lineTo(10, 10)
      .endFill();
    this.muteLine.visible = false;
    this.container.addChild(this.muteLine);

    // 綁定事件
    this.container.on('pointerdown', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // 懸停特效
    this.container.on('pointerover', () => { bg.alpha = 1; this.container.scale.set(1.1); });
    this.container.on('pointerout', () => { bg.alpha = 0.85; this.container.scale.set(1.0); });

    // 初始化狀態
    this.setState(AudioManager.getInstance().getEnabled());
  }

  /**
   * 繪製喇叭向量圖
   */
  private drawSpeakerIcon(color: number) {
    this.icon.clear();
    this.icon.beginFill(color);
    // 喇叭主體
    this.icon.drawRect(-12, -6, 6, 12);
    this.icon.drawPolygon([-6, -6, 4, -12, 4, 12, -6, 6]);
    // 聲波弧線 (簡化版)
    this.icon.lineStyle(2, color, 0.8)
      .arc(0, 0, 8, -Math.PI / 4, Math.PI / 4)
      .arc(0, 0, 12, -Math.PI / 4, Math.PI / 4);
    this.icon.endFill();
    this.icon.x = -2; // 稍微修正視覺中心
  }

  public toggle() {
    const am = AudioManager.getInstance();
    this.isMuted = !this.isMuted;

    // 更新 AudioManager 狀態
    am.setEnabled(!this.isMuted);
    if (!this.isMuted) {
      am.resume();
      am.playBeep(440, 0.05); // 切換回開啟時播放一個短音
    }

    // 更新視覺
    this.muteLine.visible = this.isMuted;
    this.icon.alpha = this.isMuted ? 0.3 : 1.0;
  }

  public setState(enabled: boolean) {
    this.isMuted = !enabled;
    this.muteLine.visible = this.isMuted;
    this.icon.alpha = this.isMuted ? 0.3 : 1.0;
  }
}
