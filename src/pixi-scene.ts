import * as PIXI from 'pixi.js';
import { BrewCalculatorHUD } from './ui/BrewCalculatorHUD';

export class PixiScene {
  private app: PIXI.Application;
  private container: HTMLElement;
  private menuContainer!: PIXI.Container;
  public calculatorHUD!: BrewCalculatorHUD;
  private menuBG!: PIXI.Graphics;
  private decorations: PIXI.Graphics[] = [];

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
    this.app = new PIXI.Application();
  }

  public async init() {
    await this.app.init({
      resizeTo: window,
      backgroundAlpha: 0, // 核心！畫布主體透明，以便露出下方的 3D
      antialias: true,
      resolution: window.devicePixelRatio || 1,
    });
    this.container.appendChild(this.app.canvas as any);

    this.app.stage.hitArea = this.app.screen;
    this.app.stage.eventMode = 'static';

    this.menuContainer = new PIXI.Container();
    this.menuContainer.sortableChildren = true; // 啟用 zIndex 排序
    this.app.stage.addChild(this.menuContainer);

    this.initMenu();
    this.initMenuVisuals();
    this.initDecorations();
    this.initStartButton();

    this.calculatorHUD = new BrewCalculatorHUD();
    this.app.stage.addChild(this.calculatorHUD.container);
    this.calculatorHUD.container.visible = false;

    this.setupEventForwarding();
    this.onWindowResize();
    window.addEventListener('resize', () => this.onWindowResize());
  }

  private initDecorations() {
    const colors = [0xFF5252, 0x42A5F5, 0xFFCA28, 0x66BB6A];
    const decoLayer = new PIXI.Container();
    this.menuContainer.addChildAt(decoLayer, 1);

    for (let i = 0; i < 12; i++) {
        const g = new PIXI.Graphics().beginFill(colors[Math.floor(Math.random() * colors.length)], 0.8).drawRect(-15, -15, 30, 30).endFill();
        g.x = (Math.random() - 0.5) * window.innerWidth;
        g.y = (Math.random() - 0.5) * 400 - 100;
        decoLayer.addChild(g);
        this.decorations.push(g);
    }
  }

  private initMenu() {
    // 藍色背景繪形區塊
    this.menuBG = new PIXI.Graphics().beginFill(0xA1E3F9).drawRect(-2000, -2000, 4000, 4000).endFill();
    this.menuContainer.addChildAt(this.menuBG, 0);

    // 標題
    const title = new PIXI.Text('3-GOLD-BREW', { fontFamily: 'Silkscreen', fontSize: 64, fill: '#263238', fontWeight: 'bold' });
    title.anchor.set(0.5); title.y = -220;
    this.menuContainer.addChild(title);
  }

  private initStartButton() {
    const btn = new PIXI.Container();
    const bg = new PIXI.Graphics().beginFill(0x42A5F5).drawRoundedRect(-100, -30, 200, 60, 15).endFill();
    btn.addChild(bg);
    const text = new PIXI.Text('START GAME', { fontFamily: 'Silkscreen', fontSize: 24, fill: '#FFFFFF', fontWeight: 'bold' });
    text.anchor.set(0.5);
    btn.addChild(text);
    btn.interactive = true; btn.cursor = 'pointer';
    btn.on('pointerdown', (e) => { e.stopPropagation(); });
    btn.on('pointerup', (e) => {
        e.stopPropagation();
        const game = (window as any).game;
        if (game) game.startGame();
    });
    btn.y = 200; 
    btn.zIndex = 100; // 確保位於最前層，遮住背景濾杯組
    this.menuContainer.addChild(btn);
  }

  private initMenuVisuals() {
    const counter = new PIXI.Graphics().beginFill(0xF5F5F5).drawRect(-600, 150, 1200, 100).endFill();
    this.menuContainer.addChild(counter);
    for (let i = 0; i < 3; i++) {
        const xPos = (i - 1) * 250;
        this.createStaticDripperSet(xPos, 150);
    }

    const kettle = new PIXI.Container();
    const body = new PIXI.Graphics().beginFill(0xCFD8DC).drawRoundedRect(-40, -50, 80, 100, 15).endFill();
    kettle.addChild(body);
    const spout = new PIXI.Graphics().lineStyle(6, 0xCFD8DC).moveTo(-35, 20).bezierCurveTo(-80, 20, -90, -40, -100, -60).endFill();
    kettle.addChild(spout);
    const handle = new PIXI.Graphics().lineStyle(8, 0xA1887F).moveTo(40, -20).lineTo(80, -20).lineTo(80, 40).endFill();
    kettle.addChild(handle);
    kettle.x = 100; kettle.y = -40; kettle.rotation = -0.4;
    this.menuContainer.addChild(kettle);
  }

  private createStaticDripperSet(x: number, y: number) {
    const group = new PIXI.Container();
    group.x = x; group.y = y;
    const server = new PIXI.Graphics().lineStyle(2, 0xffffff, 0.5).beginFill(0xffffff, 0.3).drawRoundedRect(-40, -60, 80, 60, 10).endFill();
    group.addChild(server);
    const stand = new PIXI.Graphics().beginFill(0x78909C).drawRect(-50, -65, 100, 5).endFill();
    group.addChild(stand);
    const dripper = new PIXI.Graphics().beginFill(0xffffff).drawPolygon([-40, -110, 40, -110, 5, -65, -5, -65]).endFill();
    group.addChild(dripper);
    const powder = new PIXI.Graphics().beginFill(0x5a3820).drawRect(-25, -75, 50, 10).endFill();
    group.addChild(powder);
    this.menuContainer.addChild(group);
  }

  private onWindowResize() {
    this.menuContainer.x = window.innerWidth / 2;
    this.menuContainer.y = window.innerHeight / 2;
    if (this.calculatorHUD) {
      this.calculatorHUD.container.x = window.innerWidth / 2;
      this.calculatorHUD.container.y = window.innerHeight / 2;
    }
  }

  public render() {
    const time = performance.now() * 0.001;
    this.decorations.forEach((d, i) => { d.y += Math.sin(time + i) * 0.5; d.rotation += 0.01; });
  }

  public showMenu() {
    this.menuContainer.visible = true;
    this.calculatorHUD.container.visible = false;
  }

  public startGame() {
    this.menuContainer.visible = false;
  }

  public toggleCalculator() {
    this.calculatorHUD.container.visible = !this.calculatorHUD.container.visible;
    return this.calculatorHUD.container.visible;
  }

  public show() { this.container.classList.remove('hidden'); this.app.start(); }
  public hide() { this.container.classList.add('hidden'); this.app.stop(); }

  public updateScale(_id: number, _weight: number) { }
  public updateInstruction(_id: number, _instruction: string, _subText: string, _isHint: boolean) { }
  public setUIVisibility(_visible: boolean) { }
  public updateCup(_id: number, _ratio: number, _wet: boolean) { }
  public updateKettle(_pos: any, _isPouring: boolean) { }

  private setupEventForwarding() {
    this.app.stage.on('pointerdown', (e) => {
      if (this.calculatorHUD.container.visible) {
          const bounds = this.calculatorHUD.container.getBounds();
          if (e.client.x >= bounds.minX && e.client.x <= bounds.maxX && 
              e.client.y >= bounds.minY && e.client.y <= bounds.maxY) return;
      }
      if (e.target !== this.app.stage) return;
      const game = (window as any).game;
      if (game && game.threeScene) {
        const canvas = game.threeScene.getRendererCanvas();
        canvas.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true, cancelable: true,
          clientX: e.client.x, clientY: e.client.y, button: e.button,
          pointerId: e.pointerId, pointerType: e.pointerType
        }));
      }
    });

    this.app.stage.on('pointerup', (e) => {
      if (e.target !== this.app.stage) return;
      const game = (window as any).game;
      if (game && game.threeScene) {
        const canvas = game.threeScene.getRendererCanvas();
        canvas.dispatchEvent(new PointerEvent('pointerup', { 
          bubbles: true, cancelable: true,
          button: e.button, pointerId: e.pointerId, pointerType: e.pointerType
        }));
      }
    });

    this.app.canvas.addEventListener('wheel', (e) => {
      if (this.calculatorHUD.container.visible) {
          const bounds = this.calculatorHUD.getPanelBounds();
          const rect = this.app.canvas.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          if (mouseX >= bounds.x && mouseX <= bounds.x + bounds.width && 
              mouseY >= bounds.y && mouseY <= bounds.y + bounds.height) {
              this.calculatorHUD.handleWheel(e.deltaY);
              return;
          }
      }
      const game = (window as any).game;
      if (game && game.threeScene) {
        const canvas = game.threeScene.getRendererCanvas();
        canvas.dispatchEvent(new WheelEvent('wheel', {
          deltaX: e.deltaX, deltaY: e.deltaY, deltaZ: e.deltaZ,
          deltaMode: e.deltaMode, bubbles: true, cancelable: true
        }));
      }
    }, { passive: false });
  }
}
