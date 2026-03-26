import * as PIXI from 'pixi.js';
import { Numpad } from './Numpad';

export class BrewCalculatorHUD {
  public container: PIXI.Container;
  private calcParams: any = {
    mode: '自由模式',
    cupCount: 1,
    powder: 15,
    stages: [
      { label: 'BLOOM', ratio: 2, time: 30 },
      { label: 'STAGE 1', ratio: 6, time: 30 },
      { label: 'STAGE 2', ratio: 5, time: 30 },
      { label: 'STAGE 3', ratio: 5, time: 30 }
    ]
  };

  private powderLabel!: PIXI.Text;
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
        this.handleWheel(dy * -2); // 重用 handleWheel 邏輯，dy > 0 是向下轉，所以帶負號
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
      const freeBtn = this.createSmallBtn('FREE', this.VALUE_X - 45, 0, () => this.setMode('自由模式'), 75);
      const calcBtn = this.createSmallBtn('CALC', this.VALUE_X + 45, 0, () => this.setMode('計算模式'), 75);
      p.addChild(freeBtn, calcBtn);
      this.modeBtns.push(freeBtn, calcBtn);
    });

    yOffset += 60;

    // Powder
    this.createRow(this.mainPanel, 'POWDER:', yOffset, (p) => {
      const minus = this.createSmallBtn('-', this.MINUS_X, 0, () => this.updatePowder(-1));
      const plus = this.createSmallBtn('+', this.PLUS_X, 0, () => this.updatePowder(1));
      this.powderLabel = new PIXI.Text(`${this.calcParams.powder}g`, { fontFamily: 'Silkscreen', fontSize: 18, fill: '#42A5F5', fontWeight: 'bold' });
      this.powderLabel.anchor.set(0.5, 0.5);
      this.powderLabel.x = this.VALUE_X;
      this.powderLabel.interactive = true;
      this.powderLabel.cursor = 'pointer';
      this.powderLabel.on('pointerover', () => (this.powderLabel.style.fill as string) = '#FF9800');
      this.powderLabel.on('pointerout', () => (this.powderLabel.style.fill as string) = '#42A5F5');
      this.powderLabel.on('pointerup', (e) => {
          e.stopPropagation();
          this.numpad.show(this.calcParams.powder, (v) => {
              this.calcParams.powder = v;
              this.powderLabel.text = `${v}g`;
              this.syncToGame();
          });
      });
      p.addChild(minus, plus, this.powderLabel);
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

    // 新增按鈕
    const addBtn = this.createSmallBtn('+ ADD STAGE', 0, internalY + 10, () => this.addStage(), 200);
    addBtn.tint = 0xFF9800;
    this.stageListContent.addChild(addBtn);

    this.contentHeight = internalY + 50; // 近似高度

    // 重新校準滾動邊界 (如果是因為刪除階段導致內容變短)
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

    // 刪除按鈕 (除了悶蒸外都可以刪除)
    if (index > 0) {
        const delBtn = this.createSmallBtn('X', this.DELETE_X, 0, () => this.removeStage(index), 30);
        delBtn.tint = 0xF44336;
        group.addChild(delBtn);
    }

    // Ratio Row
    this.createControlRow(group, 35, 'RATIO:', stage.ratio, (val) => `1:${val}`, (d) => {
        stage.ratio = Math.max(1, Math.min(20, stage.ratio + d));
        this.syncToGame();
        this.refreshStageList();
    });
    
    // Time Row
    this.createControlRow(group, 75, 'TIME:', stage.time, (val) => `${val}s`, (d) => {
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
    valText.on('pointerover', () => (valText.style.fill as string) = '#FF9800');
    valText.on('pointerout', () => (valText.style.fill as string) = '#42A5F5');
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
    this.calcParams.stages.push({
        label: `STAGE ${nextIdx}`,
        ratio: 5,
        time: 30
    });
    this.refreshStageList();
    this.syncToGame();
  }

  private removeStage(index: number) {
    if (index === 0) return;
    this.calcParams.stages.splice(index, 1);
    // 重新標記 labels
    this.calcParams.stages.forEach((s: any, i: number) => {
        if (i === 0) s.label = 'BLOOM';
        else s.label = `STAGE ${i}`;
    });
    this.refreshStageList();
    this.syncToGame();
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
      // 轉換資料結構以符合原本的 game.applyCalculatorRecipe (如果原本預期的是這類結構)
      // 但最好是讓 applyCalculatorRecipe 也支援陣列。
      Object.assign(game.threeScene.guiParams.calculator, this.calcParams);
      if (game.applyCalculatorRecipe) game.applyCalculatorRecipe();
    }
  }
}

