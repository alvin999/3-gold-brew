import * as PIXI from 'pixi.js';

export class BrewCalculatorHUD {
  public container: PIXI.Container;
  private calcParams: any = {
    mode: '自由模式',
    cupCount: 1,
    powder: 15,
    bloomRatio: 2,
    bloomTime: 30,
    stage1Ratio: 6,
    stage1Time: 30,
    stage2Ratio: 5,
    stage2Time: 30, // 設為預設 30
    stage3Ratio: 5,
    stage3Time: 30  // 設為預設 30
  };

  private powderLabel!: PIXI.Text;
  private stageLabels: any = {};
  private modeBtns: PIXI.Graphics[] = [];
  private cupCountBtns: PIXI.Graphics[] = [];
  private startBrewBtn!: PIXI.Graphics;

  // 精確居中網格系統
  private readonly LABEL_X = -155; 
  private readonly SUB_LABEL_X = -120;
  private readonly VALUE_X = 85; 
  private readonly MINUS_X = 35;
  private readonly PLUS_X = 135;

  constructor() {
    this.container = new PIXI.Container();
    this.init();
  }

  private init() {
    const panel = new PIXI.Container();
    this.container.addChild(panel);

    const width = 460;
    const height = 950; // 再稍微加高以放按鈕
    
    // 背景
    const bg = new PIXI.Graphics()
      .beginFill(0xFFFFFF, 0.98)
      .lineStyle(2, 0x42A5F5, 0.3)
      .drawRoundedRect(-width/2, -height/2, width, height, 30)
      .endFill();
    panel.addChild(bg);

    // 標題
    const title = new PIXI.Text('COFFEE BREW SETTINGS', { fontFamily: 'Silkscreen', fontSize: 26, fill: '#263238', fontWeight: 'bold' });
    title.anchor.set(0.5);
    title.y = -height/2 + 50;
    panel.addChild(title);

    let yOffset = -height/2 + 110;

    // Mode
    this.createRow(panel, 'MODE:', yOffset, (p) => {
      const freeBtn = this.createSmallBtn('FREE', this.VALUE_X - 45, 0, () => this.setMode('自由模式'), 75);
      const calcBtn = this.createSmallBtn('CALC', this.VALUE_X + 45, 0, () => this.setMode('計算模式'), 75);
      p.addChild(freeBtn, calcBtn);
      this.modeBtns.push(freeBtn, calcBtn);
    });

    yOffset += 60;

    // Powder
    this.createRow(panel, 'POWDER:', yOffset, (p) => {
      const minus = this.createSmallBtn('-', this.MINUS_X, 0, () => this.updatePowder(-1));
      const plus = this.createSmallBtn('+', this.PLUS_X, 0, () => this.updatePowder(1));
      this.powderLabel = new PIXI.Text('15g', { fontFamily: 'Silkscreen', fontSize: 18, fill: '#42A5F5', fontWeight: 'bold' });
      this.powderLabel.anchor.set(0.5, 0.5);
      this.powderLabel.x = this.VALUE_X;
      p.addChild(minus, plus, this.powderLabel);
    });

    yOffset += 60;

    // Cups
    this.createRow(panel, 'CUPS:', yOffset, (p) => {
      [1, 2, 3].forEach((n, i) => {
        const btn = this.createSmallBtn(n.toString(), this.VALUE_X + (i - 1) * 65, 0, () => this.setCupCount(n));
        p.addChild(btn);
        this.cupCountBtns.push(btn);
      });
    });

    yOffset += 90;

    // Stages Settings
    this.createStageRows(panel, 0, yOffset, "BLOOM");
    yOffset += 120;
    for (let i = 1; i <= 3; i++) {
        this.createStageRows(panel, i, yOffset, `STAGE ${i}`);
        yOffset += 120;
    }

    // Action Buttons
    const btnY = height/2 - 60;
    this.startBrewBtn = this.createSmallBtn('OK', -110, btnY, () => {
        const game = (window as any).game;
        if (game) {
            game.startGame(); // 觸發遊戲開始 (或套用參數)
            this.container.visible = false;
        }
    }, 200);
    this.startBrewBtn.tint = 0x4CAF50; // 改為綠色表示 OK/套用
    panel.addChild(this.startBrewBtn);

    const closeBtn = this.createSmallBtn('CLOSE', 110, btnY, () => {
        this.container.visible = false;
    }, 120);
    panel.addChild(closeBtn);

    this.updateUIHighlight();
  }

  private createRow(parent: PIXI.Container, label: string, y: number, addContent: (p: PIXI.Container) => void) {
    const row = new PIXI.Container();
    row.y = y;
    const t = new PIXI.Text(label, { fontFamily: 'Silkscreen', fontSize: 18, fill: '#263238', fontWeight: 'bold' });
    t.anchor.set(0, 0.5);
    t.x = this.LABEL_X;
    row.addChild(t);
    addContent(row);
    parent.addChild(row);
  }

  private createStageRows(parent: PIXI.Container, stage: number, y: number, labelName: string) {
    const group = new PIXI.Container();
    group.y = y;
    parent.addChild(group);

    const title = new PIXI.Text(labelName, { fontFamily: 'Silkscreen', fontSize: 18, fill: '#42A5F5', fontWeight: 'bold' });
    title.anchor.set(0, 0.5);
    title.x = this.LABEL_X;
    group.addChild(title);

    const prefix = stage === 0 ? 'bloom' : `stage${stage}`;

    // Ratio Row
    this.createControlRow(group, 35, 'RATIO:', `${prefix}Ratio`, (val) => `1:${val}`, (d) => this.updateStageParam(stage, 'Ratio', d));
    
    // Time Row
    this.createControlRow(group, 75, 'TIME:', `${prefix}Time`, (val) => `${val}s`, (d) => this.updateStageParam(stage, 'Time', d), 5);
  }

  private createControlRow(parent: PIXI.Container, y: number, label: string, paramKey: string, format: (v: any) => string, onDelta: (d: number) => void, delta: number = 1) {
    const row = new PIXI.Container();
    row.y = y;
    parent.addChild(row);

    const t = new PIXI.Text(label, { fontFamily: 'Silkscreen', fontSize: 14, fill: '#78909C' });
    t.anchor.set(0, 0.5);
    t.x = this.SUB_LABEL_X;
    row.addChild(t);

    const valText = new PIXI.Text(format(this.calcParams[paramKey]), { fontFamily: 'Silkscreen', fontSize: 16, fill: '#42A5F5', fontWeight: 'bold' });
    valText.anchor.set(0.5);
    valText.x = this.VALUE_X;
    row.addChild(valText);
    this.stageLabels[paramKey] = valText;

    row.addChild(this.createSmallBtn('-', this.MINUS_X, 0, () => onDelta(-delta), 40));
    row.addChild(this.createSmallBtn('+', this.PLUS_X, 0, () => onDelta(delta), 40));
  }

  private createSmallBtn(text: string, x: number, y: number, onClick: () => void, width: number = 40) {
    const btn = new PIXI.Graphics().beginFill(0x42A5F5).drawRoundedRect(-width/2, -15, width, 30, 8).endFill();
    btn.interactive = true; btn.cursor = 'pointer';
    btn.x = x; btn.y = y;
    const t = new PIXI.Text(text, { fontFamily: 'Silkscreen', fontSize: 14, fill: '#FFFFFF' });
    t.anchor.set(0.5);
    btn.addChild(t);
    btn.on('pointerup', (e) => { e.stopPropagation(); onClick(); });
    return btn;
  }

  private updateStageParam(stage: number, type: 'Ratio' | 'Time', delta: number) {
    const prefix = stage === 0 ? 'bloom' : `stage${stage}`;
    const key = `${prefix}${type}`;
    if (type === 'Ratio') {
        this.calcParams[key] = Math.max(1, Math.min(20, this.calcParams[key] + delta));
        this.stageLabels[key].text = `1:${this.calcParams[key]}`;
    } else {
        this.calcParams[key] = Math.max(5, Math.min(300, this.calcParams[key] + delta));
        this.stageLabels[key].text = `${this.calcParams[key]}s`;
    }
    this.syncToGame();
  }

  private setMode(mode: string) {
    this.calcParams.mode = mode;
    this.updateUIHighlight();
    this.syncToGame();
  }

  private setCupCount(count: number) {
    this.calcParams.cupCount = count;
    this.updateUIHighlight();
    this.syncToGame();
  }

  private updatePowder(delta: number) {
    this.calcParams.powder = Math.max(5, Math.min(50, this.calcParams.powder + delta));
    this.powderLabel.text = `${this.calcParams.powder}g`;
    this.syncToGame();
  }

  private updateUIHighlight() {
    this.modeBtns.forEach((btn, i) => {
      const active = (i === 0 && this.calcParams.mode === '自由模式') || (i === 1 && this.calcParams.mode === '計算模式');
      this.styleBtn(btn, active);
    });
    this.cupCountBtns.forEach((btn, i) => {
      this.styleBtn(btn, this.calcParams.cupCount === (i + 1));
    });

    // 在所有模式下都顯示 OK 按鈕
    if (this.startBrewBtn) {
        this.startBrewBtn.visible = true;
    }
  }

  private styleBtn(btn: PIXI.Graphics, active: boolean) {
    const color = active ? (btn === this.startBrewBtn ? 0xFF9800 : 0x42A5F5) : 0x90A4AE;
    const text = btn.children[0] as PIXI.Text;
    const width = btn.getBounds().width; 
    btn.clear().beginFill(color).drawRoundedRect(-width/2, -15, width, 30, 8).endFill();
    if (text) text.style.fill = active ? '#FFFFFF' : '#CFD8DC';
  }

  private syncToGame() {
    const game = (window as any).game;
    if (game && game.threeScene && game.threeScene.guiParams) {
      Object.assign(game.threeScene.guiParams.calculator, this.calcParams);
      if (game.applyCalculatorRecipe) game.applyCalculatorRecipe();
    }
  }
}
