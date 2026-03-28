import * as PIXI from 'pixi.js';
import { Numpad } from './Numpad';

export class BrewCalculatorHUD {
  public container: PIXI.Container;
  private calcParams: any = {
    mode: '自由模式',
    cupCount: 1,
    powder: 15,
    flowRate: 10.0,
    stages: [
      { label: 'BLOOM', ratio: 2, time: 30 },
      { label: 'STAGE 1', ratio: 6, time: 30 },
      { label: 'STAGE 2', ratio: 5, time: 30 },
      { label: 'STAGE 3', ratio: 5, time: 30 }
    ]
  };

  private powderLabel!: PIXI.Text;
  private flowLabel!: PIXI.Text;
  private modeBtns: PIXI.Graphics[] = [];
  private cupCountBtns: PIXI.Graphics[] = [];
  private startBrewBtn!: PIXI.Graphics;
  private numpad!: Numpad;

  private stageListScrollContainer!: PIXI.Container;
  private stageListContent!: PIXI.Container;
  private scrollMask!: PIXI.Graphics;
  private readonly SCROLL_HEIGHT = 520;

  // 精確居中網格系統
  private readonly LABEL_X = -155; 
  private readonly SUB_LABEL_X = -120;
  private readonly VALUE_X = 85; 
  private readonly MINUS_X = 35;
  private readonly PLUS_X = 135;
  private readonly DELETE_X = 185;
  private mainPanel!: PIXI.Container;
  private contentHeight = 0;

  private isDragging = false;
  private lastDragY = 0;

  constructor() {
    this.container = new PIXI.Container();
    this.numpad = new Numpad();
    this.init();
    this.container.addChild(this.numpad.container);

    // 拖曳捲動支援
    this.container.eventMode = 'static';
    this.container.on('pointerdown', (e) => {
        if (this.numpad.container.visible) return;
        this.isDragging = true;
        this.lastDragY = e.global.y;
    });
    this.container.on('globalpointermove', (e) => {
        if (!this.isDragging) return;
        const dy = e.global.y - this.lastDragY;
        this.handleWheel(dy * -2); 
        this.lastDragY = e.global.y;
    });
    window.addEventListener('pointerup', () => this.isDragging = false);
  }

  public handleWheel(deltaY: number) {
    if (!this.container.visible) return;
    const delta = deltaY * -0.5;
    const minY = Math.min(0, this.SCROLL_HEIGHT - this.contentHeight - 40);
    this.stageListContent.y = Math.min(0, Math.max(minY, this.stageListContent.y + delta));
  }

  public getPanelBounds() {
    return this.mainPanel.getBounds();
  }

  private init() {
    this.container.removeChildren();
    this.mainPanel = new PIXI.Container();
    this.container.addChild(this.mainPanel);

    const width = 460;
    const height = 950;
    
    // 背景
    const bg = new PIXI.Graphics()
      .beginFill(0xFFFFFF, 0.98)
      .lineStyle(2, 0x42A5F5, 0.3)
      .drawRoundedRect(-width/2, -height/2, width, height, 30)
      .endFill();
    this.mainPanel.addChild(bg);

    // 標題
    const title = new PIXI.Text('COFFEE BREW SETTINGS', { fontFamily: 'Silkscreen', fontSize: 26, fill: '#263238', fontWeight: 'bold' });
    title.anchor.set(0.5);
    title.y = -height/2 + 50;
    this.mainPanel.addChild(title);

    let yOffset = -height/2 + 110;

    // Mode
    this.createRow(this.mainPanel, 'MODE:', yOffset, (p) => {
      const freeBtn = this.createSmallBtn('FREE', this.VALUE_X - 60, 0, () => this.setMode('自由模式'), 65);
      const pracBtn = this.createSmallBtn('PRAC', this.VALUE_X, 0, () => this.setMode('練習模式'), 65);
      const gameBtn = this.createSmallBtn('GAME', this.VALUE_X + 60, 0, () => this.setMode('遊戲模式'), 65);
      p.addChild(freeBtn, pracBtn, gameBtn);
      this.modeBtns.push(freeBtn, pracBtn, gameBtn);
    });

    yOffset += 60;

    // Powder
    this.createRow(this.mainPanel, 'POWDER:', yOffset, (p) => {
      const minus = this.createSmallBtn('-', this.MINUS_X, 0, () => this.updatePowder(-1));
      const plus = this.createSmallBtn('+', this.PLUS_X, 0, () => this.updatePowder(1));
      this.powderLabel = new PIXI.Text(`${this.calcParams.powder}`, { fontFamily: 'Silkscreen', fontSize: 18, fill: '#42A5F5', fontWeight: 'bold' });
      this.powderLabel.anchor.set(0.5, 0.5);
      this.powderLabel.x = this.VALUE_X;
      this.powderLabel.interactive = true;
      this.powderLabel.cursor = 'pointer';
      this.powderLabel.on('pointerup', (e) => {
          e.stopPropagation();
          this.numpad.show(this.calcParams.powder, (v) => {
              this.calcParams.powder = v;
              this.powderLabel.text = `${v}`;
              this.syncToGame();
          });
      });
      p.addChild(minus, plus, this.powderLabel);
    });

    yOffset += 60;

    // Pour Flow Rate
    this.createRow(this.mainPanel, 'POUR FLOW:', yOffset, (p) => {
        const minus = this.createSmallBtn('-', this.MINUS_X, 0, () => this.updateFlowRate(-0.1));
        const plus = this.createSmallBtn('+', this.PLUS_X, 0, () => this.updateFlowRate(0.1));
        this.flowLabel = new PIXI.Text(`${this.calcParams.flowRate.toFixed(1)}`, { fontFamily: 'Silkscreen', fontSize: 18, fill: '#42A5F5', fontWeight: 'bold' });
        this.flowLabel.anchor.set(0.5, 0.5);
        this.flowLabel.x = this.VALUE_X;
        this.flowLabel.interactive = true;
        this.flowLabel.cursor = 'pointer';
        this.flowLabel.on('pointerup', (e) => {
            e.stopPropagation();
            this.numpad.show(this.calcParams.flowRate, (v) => {
                this.calcParams.flowRate = Math.max(0.1, Math.min(20.0, v));
                this.flowLabel.text = `${this.calcParams.flowRate.toFixed(1)}`;
                this.syncToGame();
            });
        });
        p.addChild(minus, plus, this.flowLabel);
    });

    yOffset += 60;

    // Cups
    this.createRow(this.mainPanel, 'CUPS:', yOffset, (p) => {
      [1, 2, 3].forEach((n, i) => {
        const btn = this.createSmallBtn(n.toString(), this.VALUE_X + (i - 1) * 65, 0, () => this.setCupCount(n));
        p.addChild(btn);
        this.cupCountBtns.push(btn);
      });
    });

    yOffset += 70;

    // --- 捲動區域 ---
    this.stageListScrollContainer = new PIXI.Container();
    this.stageListScrollContainer.y = yOffset;
    this.mainPanel.addChild(this.stageListScrollContainer);

    this.stageListContent = new PIXI.Container();
    this.stageListScrollContainer.addChild(this.stageListContent);

    this.scrollMask = new PIXI.Graphics()
        .beginFill(0xFFFFFF)
        .drawRect(-width/2, 0, width, this.SCROLL_HEIGHT)
        .endFill();
    this.stageListScrollContainer.addChild(this.scrollMask);
    this.stageListContent.mask = this.scrollMask;

    this.refreshStageList();

    // --- 底部按鈕 ---
    const btnY = height/2 - 60;
    this.startBrewBtn = this.createSmallBtn('OK', -110, btnY, () => {
        const game = (window as any).game;
        if (game) {
            game.startGame(); 
            this.container.visible = false;
        }
    }, 200);
    this.startBrewBtn.tint = 0x4CAF50;
    this.mainPanel.addChild(this.startBrewBtn);

    const closeBtn = this.createSmallBtn('CLOSE', 110, btnY, () => {
        this.container.visible = false;
    }, 120);
    this.mainPanel.addChild(closeBtn);

    this.updateUIHighlight();
    if (this.numpad) this.container.addChild(this.numpad.container);
  }

  private refreshStageList() {
    this.stageListContent.removeChildren();
    let internalY = 20;

    this.calcParams.stages.forEach((stage: any, index: number) => {
        this.createStageBlock(this.stageListContent, index, internalY, stage);
        internalY += 120;
    });

    const addBtn = this.createSmallBtn('+ ADD STAGE', 0, internalY + 10, () => this.addStage(), 200);
    addBtn.tint = 0xFF9800;
    this.stageListContent.addChild(addBtn);

    this.contentHeight = internalY + 50;
    this.handleWheel(0);
  }

  private createStageBlock(parent: PIXI.Container, index: number, y: number, stage: any) {
    const group = new PIXI.Container();
    group.y = y;
    parent.addChild(group);

    const title = new PIXI.Text(stage.label, { fontFamily: 'Silkscreen', fontSize: 18, fill: '#42A5F5', fontWeight: 'bold' });
    title.anchor.set(0, 0.5);
    title.x = this.LABEL_X;
    group.addChild(title);

    if (index > 0) {
        const delBtn = this.createSmallBtn('X', this.DELETE_X, 0, () => this.removeStage(index), 30);
        delBtn.tint = 0xF44336;
        group.addChild(delBtn);
    }

    this.createControlRow(group, 35, 'RATIO:', stage.ratio, (val) => `1:${val}`, (d) => {
        stage.ratio = Math.max(1, Math.min(20, stage.ratio + d));
        this.syncToGame();
        this.refreshStageList();
    });
    
    this.createControlRow(group, 75, 'TIME:', stage.time, (val) => `${val}`, (d) => {
        stage.time = Math.max(5, Math.min(300, stage.time + d));
        this.syncToGame();
        this.refreshStageList();
    }, 5);
  }

  private createControlRow(parent: PIXI.Container, y: number, label: string, value: any, format: (v: any) => string, onDelta: (d: number) => void, delta: number = 1) {
    const row = new PIXI.Container();
    row.y = y;
    parent.addChild(row);

    const t = new PIXI.Text(label, { fontFamily: 'Silkscreen', fontSize: 14, fill: '#78909C' });
    t.anchor.set(0, 0.5);
    t.x = this.SUB_LABEL_X;
    row.addChild(t);

    const valText = new PIXI.Text(format(value), { fontFamily: 'Silkscreen', fontSize: 16, fill: '#42A5F5', fontWeight: 'bold' });
    valText.anchor.set(0.5);
    valText.x = this.VALUE_X;
    valText.interactive = true;
    valText.cursor = 'pointer';
    valText.on('pointerup', (e) => {
        e.stopPropagation();
        this.numpad.show(value, (v) => {
            onDelta(v - value);
        });
    });
    row.addChild(valText);
    row.addChild(this.createSmallBtn('-', this.MINUS_X, 0, () => onDelta(-delta), 40));
    row.addChild(this.createSmallBtn('+', this.PLUS_X, 0, () => onDelta(delta), 40));
  }

  private addStage() {
    const nextIdx = this.calcParams.stages.length;
    this.calcParams.stages.push({ label: `STAGE ${nextIdx}`, ratio: 5, time: 30 });
    this.refreshStageList();
    this.syncToGame();
  }

  private removeStage(index: number) {
    if (index === 0) return;
    this.calcParams.stages.splice(index, 1);
    this.calcParams.stages.forEach((s: any, i: number) => {
        s.label = i === 0 ? 'BLOOM' : `STAGE ${i}`;
    });
    this.refreshStageList();
    this.syncToGame();
  }

  private updateFlowRate(delta: number) {
    this.calcParams.flowRate = Math.max(0.1, Math.min(20.0, this.calcParams.flowRate + delta));
    if (this.flowLabel) this.flowLabel.text = `${this.calcParams.flowRate.toFixed(1)}`;
    this.syncToGame();
  }

  private updatePowder(delta: number) {
    this.calcParams.powder = Math.max(5, Math.min(50, this.calcParams.powder + delta));
    if (this.powderLabel) this.powderLabel.text = `${this.calcParams.powder}`;
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

  private syncToGame() {
    const game = (window as any).game;
    if (game && game.threeScene && game.threeScene.guiParams) {
        game.threeScene.guiParams.calculator = { ...this.calcParams };
        game.pourSpeed = this.calcParams.flowRate;
        game.applyCalculatorRecipe(this.calcParams);
    }
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

  private updateUIHighlight() {
    this.modeBtns.forEach((btn, i) => {
      const active = (i === 0 && this.calcParams.mode === '自由模式') || 
                     (i === 1 && this.calcParams.mode === '練習模式') ||
                     (i === 2 && this.calcParams.mode === '遊戲模式');
      this.styleBtn(btn, active);
    });
    this.cupCountBtns.forEach((btn, i) => {
      this.styleBtn(btn, this.calcParams.cupCount === (i + 1));
    });
  }

  private styleBtn(btn: PIXI.Graphics, active: boolean) {
    const color = active ? (btn === this.startBrewBtn ? 0x4CAF50 : 0x42A5F5) : 0x90A4AE;
    const text = btn.children[0] as PIXI.Text;
    const width = 45; // 預設小按鈕寬度
    // 檢查是否是特殊按鈕 (OK or CLOSE)
    let finalWidth = width;
    if (btn === this.startBrewBtn) finalWidth = 200;
    else if (text && text.text === 'CLOSE') finalWidth = 120;
    else if (text && text.text === '+ ADD STAGE') finalWidth = 200;

    btn.clear().beginFill(color).drawRoundedRect(-finalWidth/2, -15, finalWidth, 30, 8).endFill();
    if (text) text.style.fill = active ? '#FFFFFF' : '#CFD8DC';
  }
}
