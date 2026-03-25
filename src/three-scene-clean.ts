import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

// 輔助類別：管理 3D 互動平台
class InteractivePlatform {
  public mesh: THREE.Mesh;
  private originalY: number;
  private textCanvas: HTMLCanvasElement;
  private textCtx: CanvasRenderingContext2D;
  private textTex: THREE.CanvasTexture;
  private label: string;
  private options: string[];
  private currentIndex: number = 0;

  constructor(label: string, options: string[], x: number, color: number) {
    this.label = label;
    this.options = options;

    // 平台主體 - 精緻扁平化設計
    const geo = new THREE.BoxGeometry(4, 0.4, 4);
    const mat = new THREE.MeshStandardMaterial({ 
        color: color, 
        roughness: 0.6, 
        metalness: 0.2,
        flatShading: true,
        emissive: color,
        emissiveIntensity: 0.1
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(x, -3, 6);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.originalY = this.mesh.position.y;

    // 文字貼圖 (Canvas) - 大幅提高解析度至 1024x1024 以確保銳利度
    this.textCanvas = document.createElement('canvas');
    this.textCanvas.width = 1024;
    this.textCanvas.height = 1024;
    this.textCtx = this.textCanvas.getContext('2d', { alpha: true })!;
    this.textTex = new THREE.CanvasTexture(this.textCanvas);
    this.textTex.anisotropy = 16; 
    this.textTex.minFilter = THREE.LinearMipmapLinearFilter;
    this.textTex.magFilter = THREE.LinearFilter;

    const textPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 3.8),
      new THREE.MeshBasicMaterial({ map: this.textTex, transparent: true })
    );
    textPlane.rotation.x = -Math.PI / 2;
    textPlane.position.y = 0.21; // 貼在較薄的頂面
    this.mesh.add(textPlane);

    this.updateText();
  }

  public updateText() {
    const ctx = this.textCtx;
    ctx.clearRect(0, 0, 1024, 1024); 
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 標籤 (Label) - 現代無襯線字體，輕盈質感
    ctx.font = '500 64px "Inter", "Outfit", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; 
    ctx.fillText(this.label, 512, 300);

    // 當前數值 (Value) - 粗體強調，清晰易讀
    ctx.font = '900 180px "Inter", "Outfit", sans-serif';
    ctx.fillStyle = '#FFFFFF'; 
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 20;
    ctx.fillText(this.options[this.currentIndex], 512, 600);
    ctx.shadowBlur = 0;

    this.textTex.needsUpdate = true;
  }

  public onClick() {
    this.currentIndex = (this.currentIndex + 1) % this.options.length;
    this.updateText();
    
    // 擬真「下陷」動畫效果
    this.mesh.position.y = this.originalY - 0.4;
  }

  public update(_time: number) {
    // 簡單的回彈彈簧邏輯 (Spring Effect)
    this.mesh.position.y += (this.originalY - this.mesh.position.y) * 0.2;
  }

  public getCurrentValue(): string {
    return this.options[this.currentIndex];
  }
}

// 輔助類別：管理沖煮指示立牌
class InstructionSign {
  public group: THREE.Group;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;

  constructor(x: number, y: number, z: number) {
    this.group = new THREE.Group();
    this.group.position.set(x + 2.5, y + 1.5, z + 1.5); // 位於濾杯右前方
    this.group.rotation.y = -0.3; // 稍微面向相機

    // 支架
    const postGeo = new THREE.BoxGeometry(0.1, 2, 0.1);
    const postMat = new THREE.MeshPhongMaterial({ 
        color: 0x3c3836, 
        flatShading: true 
    });
    const post = new THREE.Mesh(postGeo, postMat);
    this.group.add(post);

    // 面板
    const panelGeo = new THREE.PlaneGeometry(3, 1.8);
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 256;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.anisotropy = 16;

    const panelMat = new THREE.MeshStandardMaterial({ 
        map: this.texture, 
        side: THREE.DoubleSide, 
        transparent: true,
        roughness: 0.75,
        metalness: 0.1
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.y = 1; // 位於支架上方
    this.group.add(panel);

    this.update("00:00", "0.0g", false);
  }

  public update(instruction: string, subText: string, isHint: boolean) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 512, 256);

    // 背景 (清潔感)
    ctx.fillStyle = isHint ? 'rgba(255, 82, 82, 0.9)' : 'rgba(255, 255, 255, 0.9)'; 
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 12;
    ctx.strokeRect(10, 10, 492, 236);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 主要指引 (e.g. 注入至 120g)
    ctx.font = 'bold 54px "Silkscreen", monospace';
    ctx.fillStyle = isHint ? '#FFFFFF' : '#42A5F5';
    ctx.fillText(instruction, 256, 80);

    // 次要資訊 (e.g. 階段 2/3)
    ctx.font = 'bold 44px "Silkscreen", monospace';
    ctx.fillStyle = isHint ? '#FFFFFF' : '#263238';
    ctx.fillText(subText, 256, 170);

    this.texture.needsUpdate = true;
  }
}

// 輔助類別：管理 3D 電子秤
class CoffeeScale {
  public mesh: THREE.Group;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;

  constructor(x: number, y: number, z: number) {
    this.mesh = new THREE.Group();
    this.mesh.position.set(x, y, z);

    // 秤身底座 (Interland Gray)
    const baseGeo = new THREE.BoxGeometry(4, 0.4, 4);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0xCFD8DC, flatShading: true });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.2;
    base.castShadow = true;
    base.receiveShadow = true;
    this.mesh.add(base);

    // 顯示螢幕 (LED)
    const screenGeo = new THREE.PlaneGeometry(2, 0.6);
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 64;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    
    const screenMat = new THREE.MeshBasicMaterial({ map: this.texture });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 0.21, 1.7); // 位於秤的前緣
    screen.rotation.x = -0.5; // 稍微傾斜方便觀看
    this.mesh.add(screen);

    this.update(0);
  }

  public update(weight: number) {
    const ctx = this.ctx;
    ctx.fillStyle = '#FFFFFF'; // White background for scale screen
    ctx.fillRect(0, 0, 256, 64);
    
    ctx.font = 'bold 48px "Silkscreen", monospace';
    ctx.fillStyle = '#42A5F5'; // Interland Blue
    ctx.textAlign = 'right';
    ctx.fillText(weight.toFixed(1) + ' g', 230, 48);
    
    this.texture.needsUpdate = true;
  }
}

export class ThreeScene {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private container: HTMLElement;
  private dripperSets: { [key: number]: THREE.Group } = {};
  private raycaster!: THREE.Raycaster;
  private mouseNDC!: THREE.Vector2;
  private instructionSigns: InstructionSign[] = [];
  private composer!: EffectComposer;
  private scales: CoffeeScale[] = [];

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xA1E3F9); // Interland Sky Blue
    this.scene.fog = new THREE.FogExp2(0xA1E3F9, 0.015); 

    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2();

    // 初始化正交相機 (改為正面俯視視角)
    const aspect = window.innerWidth / window.innerHeight;
    const d = 12; // 還原回原本的大小
    this.camera = new THREE.OrthographicCamera(
      -d * aspect, d * aspect, 
      d, -d, 
      1, 1000
    );
    this.camera.position.set(0, 12, 25); // 正面中央上方
    this.camera.lookAt(0, -2, 0); // 鎖定吧台中心

    // 初始化渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true; 
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMap  private initPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.2, // Strength
        0.4, // Radius
        0.9 // Threshold - 稍微調降讓亮部有層次
    );
頂蓋，徹底解決頂部過曝問題。
    - **亮度與 Bloom 均衡**：將純白改為陶瓷淺灰 (`#EEEEEE`)，並將 `UnrealBloomPass` 閾值提高至 `0.95`，確保光暈效果精確作用於亮點而非大面積區域。
    - **紋路質感恢復**：將頂部 RectAreaLight 尺寸從 40x40 縮減至 10x10。縮小光源能避免光線過於「均勻」地照亮所有切面，從而恢復低多邊形的陰影對比（紋路感）。
    - **隨機微置換**：為濾杯加入隨機的 Y 軸旋轉，打破完美的鏡像對稱，使光影在三個沖煮位呈現更為自然的變化。
    */
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.2, // Strength
        0.4, // Radius
        0.95 // Threshold - 提高閾值，確保只有極亮部才發光
    );
    this.composer.addPass(bloomPass);

    const smaaPass = new SMAAPass();
    this.composer.addPass(smaaPass);
  }

  private initLights() {
    // 基礎環境光：提升補光以照亮環境
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); 
    this.scene.add(ambientLight);

    // 頂部 RectAreaLight 模擬燈槽光 - 大幅調降以恢復平衡
    // 頂部 RectAreaLight 模擬燈槽光 - 還原亮度與範圍
    const rectLight = new THREE.RectAreaLight(0xFFEED8, 1.5, 40, 40);
    rectLight.position.set(0, 25, 0);
    rectLight.lookAt(0, 0, 0);
    this.scene.add(rectLight);

    // 可選：區域光顯示輔助 (開發時使用)
    // const rectLightHelper = new RectAreaLightHelper(rectLight);
    // this.scene.add(rectLightHelper);

    // 加入一個輔助點光源以產生陰影 (RectAreaLight 不支持陰影)
    const pLight = new THREE.PointLight(0xffffff, 0.8, 100);
    pLight.position.set(10, 20, 10);
    pLight.castShadow = true;
    pLight.shadow.mapSize.set(1024, 1024);
    pLight.shadow.bias = -0.005;
    this.scene.add(pLight);
  }

  private initBaseGeometry() {
    // 地板 (Floor) - Everforest Floor (#232a30)
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0xE1F5FE, // Lighter Sky/Water Blue
        roughness: 0.85,
        metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -6;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // 背景牆 (Back Wall)
    const wallGeo = new THREE.PlaneGeometry(200, 100);
    const wallMat = new THREE.MeshStandardMaterial({ 
        color: 0xFFFFFF, // Pure White for clean horizon
        roughness: 0.9,
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.z = -20;
    wall.position.y = 20;
    wall.receiveShadow = true;
    this.scene.add(wall);

    // 吧台 (Counter) - Everforest Stone (#3c4841)
    const counterGeo = new THREE.BoxGeometry(36, 2, 6);
    const counterMat = new THREE.MeshStandardMaterial({ 
        color: 0xF5F5F5, // Clean White-Gray Stone
        roughness: 0.75,
        metalness: 0.1,
        flatShading: true
    });
    const counter = new THREE.Mesh(counterGeo, counterMat);
    counter.position.set(0, -5, 0);
    counter.receiveShadow = true;
    counter.castShadow = true;
    this.scene.add(counter);

    // 建立三個沖煮位
    for (let i = 0; i < 3; i++) {
        const xPos = (i - 1) * 10;
        
        // 1. 建立電子秤
        const scale = new CoffeeScale(xPos, -5, 1);
        this.scene.add(scale.mesh);
        this.scales.push(scale);
        scale.mesh.visible = false;

        // 2. 建立濾杯組並放在秤上 (Y 座標提升)
        this.createDripperSet(xPos, -4.6, 1, i);
        
        // 3. 建立指示立牌
        const sign = new InstructionSign(xPos, -4, 1);
        this.scene.add(sign.group);
        this.instructionSigns.push(sign);
        sign.group.visible = false;
    }
  }

  private createDripperSet(x: number, y: number, z: number, id: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    
    // 比例統整：全部改為 1.0 以達致一致性
    const scale = 1.0;
    group.scale.set(scale, scale, scale);
    
    // 透明度統整：全部不透明
    const opacity = 1.0; 

    // 下壺 (Server)
    const serverGeo = new THREE.CylinderGeometry(1.2, 1.5, 2.5, 12);
    const serverMat = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        transparent: opacity < 1.0, 
        opacity: opacity,
        roughness: 0.75,
        metalness: 0.1,
        flatShading: true
    });
    const server = new THREE.Mesh(serverGeo, serverMat);
    server.position.y = 1.25;
    server.receiveShadow = true;
    server.castShadow = true;
    group.add(server);

    // 濾杯支架 (Stand)
    const standGeo = new THREE.BoxGeometry(3, 0.2, 3);
    const standMat = new THREE.MeshStandardMaterial({ 
        color: 0x78909C, // Muted Blue-Gray Stand
        roughness: 0.75,
        metalness: 0.1,
        flatShading: true 
    });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.y = 2.6;
    stand.castShadow = true;
    group.add(stand);

    // 濾杯 (Dripper) - 白色霧面陶瓷 (開口式結構)
    // 移除 DoubleSide 以免干擾 flatShading 的法線計算
    const dripperGeo = new THREE.CylinderGeometry(1.5, 0.2, 1.8, 8, 1, true); 
    const dripperMat = new THREE.MeshStandardMaterial({ 
        color: 0xf5f5f5, 
        roughness: 0.6, // 降低粗糙度讓光影變化更銳利
        metalness: 0.1,
        flatShading: true
    });
    const dripper = new THREE.Mesh(dripperGeo, dripperMat);
    dripper.position.y = 3.5;
    dripper.rotation.y = 0.5; // 固定一個角度讓切面明顯
    dripper.castShadow = true;
    group.add(dripper);

    // 建立內壁，解決移除 DoubleSide 後的視覺空洞 (稍微縮小以防 z-fighting)
    const innerGeo = new THREE.CylinderGeometry(1.48, 0.18, 1.78, 8, 1, true);
    const innerMat = new THREE.MeshStandardMaterial({ 
        color: 0xdddddd, // 內壁稍暗以增加層次感
        roughness: 0.9,
        flatShading: true
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.y = 3.5;
    inner.rotation.y = 0.5;
    inner.scale.set(1, 1, 1);
    group.add(inner);

    // 咖啡液
    const liquidGeo = new THREE.CylinderGeometry(1.4, 1.4, 1, 12);
    const liquidMat = new THREE.MeshStandardMaterial({ 
        color: 0x3a2010, 
        roughness: 0.75,
        metalness: 0.1,
        flatShading: true
    });
    const liquid = new THREE.Mesh(liquidGeo, liquidMat);
    liquid.name = 'liquid';
    liquid.scale.set(1, 0.01, 1); //  initiale Scale
    liquid.position.y = 0.5;
    group.add(liquid);

    // 咖啡粉
    const powderGeo = new THREE.CylinderGeometry(1.3, 0.4, 0.1, 12);
    const powderMat = new THREE.MeshStandardMaterial({ 
        color: 0x5a3820, 
        roughness: 0.75,
        metalness: 0.1,
        flatShading: true
    });
    const powder = new THREE.Mesh(powderGeo, powderMat);
    powder.name = 'powder';
    powder.position.y = 3; // 位於濾杯中心高度
    group.add(powder);

    this.scene.add(group);
    this.dripperSets[id] = group;
  }

  private decorations: THREE.Mesh[] = [];

  private initDecorations() {
    const geometries = [
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
        new THREE.OctahedronGeometry(0.7)
    ];
    const colors = [0xFF5252, 0x42A5F5, 0xFFCA28, 0x66BB6A]; // Interland Main Colors

    for (let i = 0; i < 12; i++) {
        const geo = geometries[Math.floor(Math.random() * geometries.length)];
        const mat = new THREE.MeshStandardMaterial({ 
            color: colors[Math.floor(Math.random() * colors.length)],
            roughness: 0.75,
            metalness: 0.1,
            flatShading: true,
            transparent: true,
            opacity: 0.8
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
            (Math.random() - 0.5) * 40,
            Math.random() * 20 + 5,
            (Math.random() - 0.5) * 10 - 5
        );
        mesh.rotation.set(Math.random(), Math.random(), Math.random());
        mesh.castShadow = true;
        this.scene.add(mesh);
        this.decorations.push(mesh);
    }
  }

  private waterStream!: THREE.Mesh;

  private initWaterStream() {
    const geo = new THREE.CylinderGeometry(0.05, 0.05, 10, 8);
    const mat = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        transparent: true, 
        opacity: 0.6,
        roughness: 0.75,
        metalness: 0.1,
    });
    this.waterStream = new THREE.Mesh(geo, mat);
    this.waterStream.visible = false;
    this.scene.add(this.waterStream);
  }

  private kettle!: THREE.Group;

  private initKettle() {
    this.kettle = new THREE.Group();
    
    // 材質定義 - 銀色系 (降低反光，增加磨砂感)
    const silverMat = new THREE.MeshStandardMaterial({ 
        color: 0xCFD8DC, 
        metalness: 0.2,
        roughness: 0.8,
        flatShading: true 
    });
    const darkSilverMat = new THREE.MeshStandardMaterial({ 
        color: 0x90A4AE, 
        metalness: 0.3,
        roughness: 0.85,
        flatShading: true 
    });
    const goldMat = new THREE.MeshStandardMaterial({ 
        color: 0xFFD54F, 
        metalness: 0.8,
        roughness: 0.2
    });
    const woodMat = new THREE.MeshStandardMaterial({ 
        color: 0xA1887F, 
        roughness: 0.8,
        flatShading: true 
    });

    // 1. 底座 (Base Ring) - 深銀色
    const baseGeo = new THREE.CylinderGeometry(2.3, 2.3, 0.6, 8);
    const base = new THREE.Mesh(baseGeo, darkSilverMat);
    base.position.y = -1.2;
    base.castShadow = true;
    this.kettle.add(base);

    // 2. 壺身 (Main Body) - 銀色
    const bodyGeo = new THREE.CylinderGeometry(1.2, 2.2, 2.8, 8);
    const body = new THREE.Mesh(bodyGeo, silverMat);
    body.castShadow = true;
    this.kettle.add(body);

    // 3. 壺蓋與頂珠 (Lid & Knob)
    const lidGeo = new THREE.CylinderGeometry(0.5, 1.3, 0.4, 8);
    const lid = new THREE.Mesh(lidGeo, silverMat);
    lid.position.y = 1.6;
    this.kettle.add(lid);

    const knobGeo = new THREE.OctahedronGeometry(0.25);
    const knob = new THREE.Mesh(knobGeo, goldMat);
    knob.position.y = 1.95;
    this.kettle.add(knob);

    // 4. 壺嘴 (Spout) - 優化曲線
    const spoutPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.2, -0.5, 0),
        new THREE.Vector3(-2.8, 0, 0),
        new THREE.Vector3(-3.5, 1.8, 0),
        new THREE.Vector3(-3.8, 2.5, 0)
    ]);
    const spoutGeo = new THREE.TubeGeometry(spoutPath, 24, 0.15, 8, false);
    const spout = new THREE.Mesh(spoutGeo, silverMat);
    this.kettle.add(spout);

    // 5. 高級手把 (Premium Handle) - 木質拼接感
    const handleGroup = new THREE.Group();
    
    // 金色連接件
    const jointGeo = new THREE.BoxGeometry(0.6, 0.4, 0.4);
    const joint = new THREE.Mesh(jointGeo, goldMat);
    joint.position.set(1.4, 1.2, 0);
    handleGroup.add(joint);

    // 木質主體 (上段)
    const h1Geo = new THREE.BoxGeometry(3, 0.5, 0.5);
    const h1 = new THREE.Mesh(h1Geo, woodMat);
    h1.position.set(2.8, 1.2, 0);
    h1.rotation.z = -0.3;
    handleGroup.add(h1);

    // 木質主體 (垂直段)
    const h2Geo = new THREE.BoxGeometry(0.5, 3.5, 0.5);
    const h2 = new THREE.Mesh(h2Geo, woodMat);
    h2.position.set(4.2, -0.2, 0);
    h2.rotation.z = -0.1;
    handleGroup.add(h2);
    
    // 木質裝飾底蓋
    const capGeo = new THREE.BoxGeometry(0.6, 0.2, 0.6);
    const cap = new THREE.Mesh(capGeo, goldMat);
    cap.position.set(4.35, -1.9, 0);
    handleGroup.add(cap);

    this.kettle.add(handleGroup);

    // 整體比例縮放些許以增加存在感
    this.kettle.scale.set(0.9, 0.9, 0.9);
    this.kettle.position.set(0, 10, 0);
    this.kettle.visible = false;
    this.scene.add(this.kettle);
  }

  public get3DPosition(mouseX: number, mouseY: number): THREE.Vector3 {
    // 轉換為 NDC (-1 到 +1)
    this.mouseNDC.x = (mouseX / window.innerWidth) * 2 - 1;
    this.mouseNDC.y = -(mouseY / window.innerHeight) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    
    // 定義一個位於 Y=10 的水平面
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -10);
    const target = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, target);
    
    return target;
  }

  public updateKettle(pos: THREE.Vector3, isPouring: boolean) {
    this.kettle.visible = true;
    // 模型中心完全對齊光線投射點
    this.kettle.position.copy(pos);
    
    // 傾斜動畫
    const targetRotZ = isPouring ? 0.3 : 0;
    this.kettle.rotation.z += (targetRotZ - this.kettle.rotation.z) * 0.1;

    // 更新水流
    this.waterStream.visible = isPouring;
    if (isPouring) {
        // 水流發射點對齊新壺嘴位置 (-3.8, 2.5) 在本地坐標系
        const worldPos = new THREE.Vector3(-3.4, 2.2, 0).applyQuaternion(this.kettle.quaternion).add(this.kettle.position);
        this.waterStream.position.copy(worldPos);
        // 水流高度調整以確保遮擋關係正確 (從壺嘴向下延伸)
        this.waterStream.position.y -= 5;
    }
  }

  // 取得 3D 空間中壺嘴目前的 X 座標，用於判定是否對準濾杯
  public getKettleSpoutX(): number {
    return this.kettle.position.x - 3.4; // 與新壺嘴偏移同步
  }

  public getCupX(id: number): number {
    return this.dripperSets[id]?.position.x || 0;
  }

  public updateCup(id: number, weightRatio: number, isWetting: boolean) {
    const group = this.dripperSets[id];
    if (!group) return;
    
    const liquid = group.getObjectByName('liquid');
    if (liquid) {
        const targetScaleY = Math.max(0.01, weightRatio * 2.4);
        liquid.scale.y = targetScaleY;
        liquid.position.y = (targetScaleY / 2);
    }

    const powder = group.getObjectByName('powder') as THREE.Mesh;
    if (powder && isWetting) {
        const mat = powder.material as THREE.MeshStandardMaterial;
        mat.color.lerp(new THREE.Color(0x3a2010), 0.05);
    }
  }

  private onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const d = 10; // 還原回 Resize 時原本的大小
    this.camera.left = -d * aspect;
    this.camera.right = d * aspect;
    this.camera.top = d;
    this.camera.bottom = -d;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  public render() {
    const time = performance.now() * 0.001;
    this.decorations.forEach((m, i) => {
        m.position.y += Math.sin(time + i) * 0.005;
        m.rotation.x += 0.005;
        m.rotation.y += 0.005;
    });
    
    this.platforms.forEach(p => p.update(time));
    this.updateStartButton(time);
    
    this.composer.render();
  }

  private startBtn!: THREE.Mesh;
  private uiSignboard!: THREE.Mesh;
  private uiCanvas!: HTMLCanvasElement;
  private uiContext!: CanvasRenderingContext2D;
  private uiTexture!: THREE.CanvasTexture;
  private platforms: InteractivePlatform[] = [];

  private init3DUI() {
    this.uiCanvas = document.createElement('canvas');
    this.uiCanvas.width = 512;
    this.uiCanvas.height = 128;
    this.uiContext = this.uiCanvas.getContext('2d')!;
    
    this.uiTexture = new THREE.CanvasTexture(this.uiCanvas);
    const uiGeo = new THREE.PlaneGeometry(8, 2);
    const uiMat = new THREE.MeshBasicMaterial({ 
        map: this.uiTexture, 
        transparent: true 
    });
    
    this.uiSignboard = new THREE.Mesh(uiGeo, uiMat);
    this.uiSignboard.position.set(0, 8, -8); // 稍微移前並調高，避免與牆壁 z-fighting
    this.scene.add(this.uiSignboard);

    // 三個互動平台顏色更新 (Everforest Red, Green, Muted Yellow)
    const bloomPlatform = new InteractivePlatform('BLOOM', ['30s', '45s', '60s'], -5, 0xFF5252); // Red
    const tempPlatform = new InteractivePlatform('TEMP', ['90°C', '92°C', '94°C'], 0, 0x42A5F5); // Blue
    const stagesPlatform = new InteractivePlatform('STAGES', ['1', '3', '5'], 5, 0xFFCA28); // Yellow
    
    this.platforms = [bloomPlatform, tempPlatform, stagesPlatform];
    this.platforms.forEach(p => this.scene.add(p.mesh));

    // 3D 開始按鈕 (Start Button) - 精緻化設計
    const btnGeo = new THREE.BoxGeometry(8, 2, 1); 
    const btnMat = new THREE.MeshStandardMaterial({ 
        color: 0x66BB6A, 
        roughness: 0.5,
        metalness: 0.2,
        emissive: 0x66BB6A,
        emissiveIntensity: 0.2
    }); 
    this.startBtn = new THREE.Mesh(btnGeo, btnMat);
    this.startBtn.position.set(0, -2, 12);
    this.startBtn.name = "start-button";
    this.startBtn.castShadow = true;
    
    // 按鈕文字 - 高解析度 Inter 字體
    const btnTextCanvas = document.createElement('canvas');
    btnTextCanvas.width = 1024; 
    btnTextCanvas.height = 512;
    const btnCtx = btnTextCanvas.getContext('2d')!;
    btnCtx.fillStyle = '#FFFFFF'; 
    btnCtx.font = 'bold 160px "Inter", "Outfit", sans-serif';
    btnCtx.textAlign = 'center';
    btnCtx.textBaseline = 'middle';
    btnCtx.letterSpacing = '10px';
    btnCtx.fillText('START', 512, 256);
    const btnTextTex = new THREE.CanvasTexture(btnTextCanvas);
    btnTextTex.anisotropy = 16;
    const btnTextPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(7.2, 1.6),
        new THREE.MeshBasicMaterial({ map: btnTextTex, transparent: true })
    );
    btnTextPlane.position.z = 0.51;
    this.startBtn.add(btnTextPlane);

    this.scene.add(this.startBtn);
  }

  public updateStartButton(time: number) {
    if (this.startBtn && this.startBtn.visible) {
        const s = 1.0 + Math.sin(time * 4) * 0.1; // 加快並加大脈動頻率
        this.startBtn.scale.set(s, s, s);
    }
  }

  public update3DUI(time: string, weight: string) {
    const ctx = this.uiContext;
    if (!ctx) return;
    ctx.clearRect(0, 0, 512, 128);
    
    // 背景風格 (和紙小標牌)
    ctx.fillStyle = '#FFFFFF'; 
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#263238'; 
    ctx.lineWidth = 4;
    ctx.strokeRect(5, 5, 502, 118);
    
    // 文字
    ctx.font = '32px "Silkscreen"';
    ctx.fillStyle = '#263238';
    ctx.textAlign = 'center';
    ctx.fillText(`${time}  |  ${weight}`, 256, 80);
    
    this.uiTexture.needsUpdate = true;
  }

  public checkClick(mouseX: number, mouseY: number): string | null {
    this.mouseNDC.x = (mouseX / window.innerWidth) * 2 - 1;
    this.mouseNDC.y = -(mouseY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    
    // 檢查按鈕
    const btnIntersects = this.raycaster.intersectObjects([this.startBtn]);
    if (btnIntersects.length > 0) return "start-button";

    // 檢查平台
    for (let i = 0; i < this.platforms.length; i++) {
        const p = this.platforms[i];
        const intersects = this.raycaster.intersectObject(p.mesh);
        if (intersects.length > 0) {
            p.onClick();
            return `platform-${i}`;
        }
    }

    return null;
  }

  public updateInstruction(id: number, instruction: string, subText: string, isHint: boolean) {
    this.instructionSigns[id]?.update(instruction, subText, isHint);
  }

  public updateScale(id: number, weight: number) {
    this.scales[id]?.update(weight);
  }

  public setUIVisibility(visible: boolean) {
    this.startBtn.visible = visible;
    this.platforms.forEach(p => p.mesh.visible = visible);
    // 開始遊戲後顯示立牌與秤，反之隱藏
    this.instructionSigns.forEach(s => s.group.visible = !visible);
    this.scales.forEach(s => s.mesh.visible = !visible);
  }

  public getMenuValues() {
    return {
        bloom: parseInt(this.platforms[0].getCurrentValue()),
        temp: parseInt(this.platforms[1].getCurrentValue()),
        stages: parseInt(this.platforms[2].getCurrentValue())
    };
  }

  public getScene() { return this.scene; }
}
