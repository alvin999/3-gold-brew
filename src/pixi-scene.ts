import * as PIXI from 'pixi.js';

class PixiInstructionSign {
  public container: PIXI.Container;
  private bg: PIXI.Graphics;
  private primaryText: PIXI.Text;
  private secondaryText: PIXI.Text;

  constructor() {
    this.container = new PIXI.Container();

    this.bg = new PIXI.Graphics()
      .beginFill(0xffffff, 0.9)
      .drawRoundedRect(-75, -45, 150, 90, 8)
      .endFill();
    this.container.addChild(this.bg);

    const style = new PIXI.TextStyle({
      fontFamily: 'Silkscreen, monospace',
      fontSize: 22,
      fontWeight: 'bold',
      fill: '#42A5F5',
      align: 'center'
    });

    this.primaryText = new PIXI.Text('00:00', style);
    this.primaryText.anchor.set(0.5);
    this.primaryText.y = -15;
    this.container.addChild(this.primaryText);

    const subStyle = new PIXI.TextStyle({
      fontFamily: 'Silkscreen, monospace',
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#263238',
      align: 'center'
    });

    this.secondaryText = new PIXI.Text('0.0g', subStyle);
    this.secondaryText.anchor.set(0.5);
    this.secondaryText.y = 20;
    this.container.addChild(this.secondaryText);
  }

  public update(instruction: string, subText: string, isHint: boolean) {
    this.bg.clear()
      .beginFill(isHint ? 0xFF5252 : 0xffffff, 0.9)
      .drawRoundedRect(-75, -45, 150, 90, 8)
      .endFill();

    this.primaryText.text = instruction;
    this.primaryText.style.fill = isHint ? '#FFFFFF' : '#42A5F5';

    this.secondaryText.text = subText;
    this.secondaryText.style.fill = isHint ? '#FFFFFF' : '#263238';
  }
}

class PixiCoffeeScale {
  public container: PIXI.Container;
  private bg: PIXI.Graphics;
  private text: PIXI.Text;

  constructor() {
    this.container = new PIXI.Container();
    this.bg = new PIXI.Graphics()
      .beginFill(0xCFD8DC)
      .drawRoundedRect(-60, -10, 120, 20, 4)
      .endFill();
    this.container.addChild(this.bg);

    this.text = new PIXI.Text('0.0 g', {
      fontFamily: 'Silkscreen, monospace',
      fontSize: 14,
      fill: '#42A5F5',
      fontWeight: 'bold'
    });
    this.text.anchor.set(1, 0.5);
    this.text.x = 50;
    this.container.addChild(this.text);
  }

  public update(weight: number) {
    this.text.text = weight.toFixed(1) + ' g';
  }
}

export class PixiScene {
  private app: PIXI.Application;
  private container: HTMLElement;
  private world!: PIXI.Container;
  private menuContainer!: PIXI.Container;
  private gameContainer!: PIXI.Container;

  private kettle!: PIXI.Container;
  private kettleBody!: PIXI.Graphics;
  private waterStream!: PIXI.Graphics;

  private dripperSets: { [key: number]: PIXI.Container } = {};
  private instructionSigns: PixiInstructionSign[] = [];
  private scales: PixiCoffeeScale[] = [];
  private decorations: PIXI.Graphics[] = [];

  private uiText!: PIXI.Text;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
    this.app = new PIXI.Application();
  }

  public async init() {
    await this.app.init({
      resizeTo: window,
      backgroundColor: 0xA1E3F9,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
    });
    this.container.appendChild(this.app.canvas as any);

    this.world = new PIXI.Container();
    this.app.stage.addChild(this.world);

    this.menuContainer = new PIXI.Container();
    this.gameContainer = new PIXI.Container();

    this.initDecorations();
    this.initBaseGeometry();
    this.initKettle();

    // 確保遊戲容器與選單容器在最上層
    this.world.addChild(this.gameContainer);
    this.world.addChild(this.menuContainer);

    this.init3DUI();
    this.initMenu();

    this.onWindowResize();
    window.addEventListener('resize', () => this.onWindowResize());
  }

  private initDecorations() {
    const colors = [0xFF5252, 0x42A5F5, 0xFFCA28, 0x66BB6A];
    for (let i = 0; i < 12; i++) {
      const g = new PIXI.Graphics()
        .beginFill(colors[Math.floor(Math.random() * colors.length)], 0.8)
        .drawRect(-15, -15, 30, 30)
        .endFill();
      g.x = (Math.random() - 0.5) * window.innerWidth;
      g.y = (Math.random() - 0.5) * 400 - 100;
      g.rotation = Math.random() * Math.PI;
      this.world.addChild(g);
      this.decorations.push(g);
    }
  }

  private initBaseGeometry() {
    // Counter (2.5D look)
    const counter = new PIXI.Graphics()
      .beginFill(0xF5F5F5)
      .drawRect(-600, 150, 1200, 100)
      .endFill();
    this.world.addChild(counter);

    for (let i = 0; i < 3; i++) {
      const xPos = (i - 1) * 250;

      const scale = new PixiCoffeeScale();
      scale.container.x = xPos;
      scale.container.y = 240;
      this.gameContainer.addChild(scale.container);
      this.scales.push(scale);

      this.createDripperSet(xPos, 150, i);

      const sign = new PixiInstructionSign();
      sign.container.x = xPos + 80;
      sign.container.y = 50;
      this.gameContainer.addChild(sign.container);
      this.instructionSigns.push(sign);
    }
  }

  private startBtn!: PIXI.Graphics;
  private initMenu() {
    const title = new PIXI.Text('3 GOLD BREW', {
      fontFamily: 'Silkscreen',
      fontSize: 64,
      fill: '#263238',
      fontWeight: 'bold',
      letterSpacing: 4
    });
    title.anchor.set(0.5);
    title.y = -150;
    this.menuContainer.addChild(title);

    const subTitle = new PIXI.Text('PIXIJS EDITION', {
      fontFamily: 'Inter',
      fontSize: 24,
      fill: '#42A5F5',
      letterSpacing: 8
    });
    subTitle.anchor.set(0.5);
    subTitle.y = -80;
    this.menuContainer.addChild(subTitle);

    this.startBtn = new PIXI.Graphics()
      .beginFill(0x42A5F5)
      .drawRoundedRect(-100, -30, 200, 60, 15)
      .endFill();
    this.startBtn.interactive = true;
    this.startBtn.cursor = 'pointer';

    const btnText = new PIXI.Text('START GAME', {
      fontFamily: 'Silkscreen',
      fontSize: 24,
      fill: '#FFFFFF',
    });
    btnText.anchor.set(0.5);
    this.startBtn.addChild(btnText);

    this.startBtn.on('pointerup', (e) => {
      e.stopPropagation();
      if ((window as any).game) (window as any).game.startGame();
    });


    this.startBtn.y = 100; // 移動按鈕位置
    this.menuContainer.addChild(this.startBtn);

    this.gameContainer.visible = false;
  }

  private createDripperSet(x: number, y: number, id: number) {
    const group = new PIXI.Container();
    group.x = x;
    group.y = y;

    // Server
    const server = new PIXI.Graphics()
      .lineStyle(2, 0xffffff, 0.5)
      .beginFill(0xffffff, 0.3)
      .drawRoundedRect(-40, -60, 80, 60, 10)
      .endFill();
    group.addChild(server);

    // Liquid in server
    const liquid = new PIXI.Graphics();
    liquid.name = 'liquid';
    group.addChild(liquid);

    // Stand
    const stand = new PIXI.Graphics()
      .beginFill(0x78909C)
      .drawRect(-50, -65, 100, 5)
      .endFill();
    group.addChild(stand);

    // Dripper
    const dripper = new PIXI.Graphics()
      .beginFill(0xffffff)
      .drawPolygon([
        -40, -110,
        40, -110,
        5, -65,
        -5, -65
      ])
      .endFill();
    group.addChild(dripper);

    // Powder in dripper
    const powder = new PIXI.Graphics()
      .beginFill(0x5a3820)
      .drawRect(-25, -75, 50, 10)
      .endFill();
    powder.name = 'powder';
    group.addChild(powder);

    this.world.addChild(group);
    this.dripperSets[id] = group;
  }

  private initKettle() {
    this.kettle = new PIXI.Container();

    // Water stream
    this.waterStream = new PIXI.Graphics()
      .beginFill(0xffffff, 0.6)
      .drawRect(-2, 0, 4, 300)
      .endFill();
    this.waterStream.visible = false;
    this.kettle.addChild(this.waterStream);

    // Body
    this.kettleBody = new PIXI.Graphics()
      .beginFill(0xCFD8DC)
      .drawRoundedRect(-40, -50, 80, 100, 15)
      .endFill();
    this.kettle.addChild(this.kettleBody);

    // Spout
    const spout = new PIXI.Graphics()
      .lineStyle(6, 0xCFD8DC)
      .moveTo(-35, 20)
      .bezierCurveTo(-80, 20, -90, -40, -100, -60)
      .endFill();
    this.kettle.addChild(spout);

    // Handle
    const handle = new PIXI.Graphics()
      .lineStyle(8, 0xA1887F)
      .moveTo(40, -20)
      .lineTo(80, -20)
      .lineTo(80, 40)
      .endFill();
    this.kettle.addChild(handle);

    this.kettle.visible = false;
    this.gameContainer.addChild(this.kettle);
  }

  private init3DUI() {
    this.uiText = new PIXI.Text('00:00 | 0.0g', {
      fontFamily: 'Silkscreen',
      fontSize: 32,
      fill: '#263238',
      align: 'center'
    });
    this.uiText.anchor.set(0.5);
    this.uiText.y = -250;
    this.gameContainer.addChild(this.uiText);
  }

  private onWindowResize() {
    this.world.x = window.innerWidth / 2;
    this.world.y = window.innerHeight / 2;
  }

  public get3DPosition(mouseX: number, mouseY: number): { x: number, y: number, z: number } {
    return {
      x: mouseX - window.innerWidth / 2,
      y: mouseY - window.innerHeight / 2,
      z: 0
    };
  }

  public updateKettle(pos: { x: number, y: number, z: number }, isPouring: boolean) {
    this.kettle.visible = true;
    this.kettle.x = pos.x;
    this.kettle.y = pos.y;

    const targetRotation = isPouring ? -0.3 : 0;
    this.kettle.rotation += (targetRotation - this.kettle.rotation) * 0.1;

    this.waterStream.visible = isPouring;
    if (isPouring) {
      // 簡單調整注水位置，使其從壺口流出
      this.waterStream.x = -100;
      this.waterStream.y = -60;
    }
  }

  public getKettleSpoutX(): number {
    return this.kettle.x - 100;
  }

  public getCupX(id: number): number {
    return this.dripperSets[id]?.x || 0;
  }

  public updateCup(id: number, weightRatio: number, isWetting: boolean) {
    const group = this.dripperSets[id];
    if (!group) return;

    const liquid = group.getChildByName('liquid') as PIXI.Graphics;
    if (liquid) {
      liquid.clear()
        .beginFill(0x3a2010)
        .drawRect(-38, -2, 76, -58 * weightRatio)
        .endFill();
    }

    const powder = group.getChildByName('powder') as PIXI.Graphics;
    if (powder && isWetting) {
      // 簡單顏色漸變效果
      powder.tint = 0x3a2010;
    }
  }

  public update3DUI(time: string, weight: string) {
    this.uiText.text = `${time} | ${weight}`;
  }

  public updateInstruction(id: number, instruction: string, subText: string, isHint: boolean) {
    this.instructionSigns[id]?.update(instruction, subText, isHint);
  }

  public updateScale(id: number, weight: number) {
    this.scales[id]?.update(weight);
  }

  public setUIVisibility(visible: boolean) {
    this.instructionSigns.forEach(s => s.container.visible = visible);
    this.scales.forEach(s => s.container.visible = visible);
  }

  public render() {
    const time = performance.now() * 0.001;
    this.decorations.forEach((d, i) => {
      d.y += Math.sin(time + i) * 0.5;
      d.rotation += 0.01;
    });

    if (this.menuContainer.visible) {
      this.startBtn.y = 200 + Math.sin(time * 2) * 10; // 基準位置設為 100
      this.startBtn.scale.set(1 + Math.sin(time * 3) * 0.02);
    }

  }

  public showMenu() {
    this.menuContainer.visible = true;
    this.gameContainer.visible = false;
  }

  public startGame() {
    this.menuContainer.visible = false;
    this.gameContainer.visible = true;
  }

  public show() {
    this.container.classList.remove('hidden');
    this.app.start();
  }

  public hide() {
    this.container.classList.add('hidden');
    this.app.stop();
  }
}
