import * as PIXI from 'pixi.js';

/**
 * HelpButton - 導覽幫助按鈕
 */
export class HelpButton {
  public container: PIXI.Container;
  public onClick: (() => void) | null = null;

  constructor() {
    this.container = new PIXI.Container();
    this.container.interactive = true;
    this.container.cursor = 'pointer';

    // 建立按鈕背景 (圓形) - 保持與 AudioToggle 一致
    const bg = new PIXI.Graphics()
      .beginFill(0x263238, 0.85)
      .drawCircle(0, 0, 20)
      .endFill();
    this.container.addChild(bg);

    // 建立問號圖示
    const style = new PIXI.TextStyle({
      fontFamily: 'Inter, sans-serif',
      fontSize: 22,
      fontWeight: 'bold',
      fill: '#FFFFFF',
      align: 'center'
    });
    
    const helpText = new PIXI.Text('?', style);
    helpText.anchor.set(0.5);
    this.container.addChild(helpText);

    // 綁定事件
    this.container.on('pointerdown', (e) => {
      e.stopPropagation();
      if (this.onClick) this.onClick();
    });

    // 懸停特效
    this.container.on('pointerover', () => { 
        bg.alpha = 1; 
        this.container.scale.set(1.1); 
    });
    this.container.on('pointerout', () => { 
        bg.alpha = 0.85; 
        this.container.scale.set(1.0); 
    });
  }
}
