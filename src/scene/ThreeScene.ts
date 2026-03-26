import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { initGUI, DEFAULTS } from '../gui';
import { LAYOUT } from './layout';
import { InstructionSign } from './components/InstructionSign';
import { CoffeeScale } from './components/CoffeeScale';

export class ThreeScene {
  // === [1. 核心 Three.js 物件] ===
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  public controls!: OrbitControls;
  private composer!: EffectComposer;
  private container: HTMLElement;
  private raycaster!: THREE.Raycaster;
  private mouseNDC!: THREE.Vector2;

  // === [2. 場景環境與燈光] ===
  private ambientLight!: THREE.AmbientLight;
  private pointLight!: THREE.PointLight;
  private dirLight!: THREE.DirectionalLight;
  private rectLight!: THREE.RectAreaLight;
  private bloomPass!: UnrealBloomPass;
  private floor: THREE.Mesh | null = null;
  private counter: THREE.Mesh | null = null;
  private decorations: THREE.Mesh[] = [];

  // === [3. 互動器材組件] ===
  private kettle!: THREE.Group;
  private waterStream!: THREE.Mesh;
  private dripperSets: { [key: number]: THREE.Group } = {};
  private scales: CoffeeScale[] = [];
  private instructionSigns: InstructionSign[] = [];

  // === [4. UI 與 狀態管理] ===
  private uiSignboard!: THREE.Mesh;
  private uiCanvas!: HTMLCanvasElement;
  private uiContext!: CanvasRenderingContext2D;
  private uiTexture!: THREE.CanvasTexture;
  public guiParams: any = null;
  private isUpdatingFromControls = false;
  private cameraTarget = new THREE.Vector3(0, LAYOUT.TABLE_Y, 0);

  constructor(containerId: string) {
    console.log("ThreeScene: Initializing Modular Scene");
    this.container = document.getElementById(containerId)!;
    
    // 初始化生命週期
    this.initCore();
    this.initControls();
    this.initPostProcessing();
    this.initLights();
    
    // 初始化環境與物件
    this.initBaseGeometry();
    this.initKettle();
    this.initWaterStream();
    this.initDecorations();
    this.init3DUI();
    
    // 初始化設定與同步
    this.initGUIParams();
    this.onWindowResize();
    window.addEventListener('resize', () => this.onWindowResize());
  }

  // ==========================================
  // [SECTION 1: 核心初始化]
  // ==========================================

  private initCore() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xA1E3F9); 
    this.scene.fog = new THREE.FogExp2(0xA1E3F9, 0.005); // 降低霧氣密度以免洗掉內容
    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2();

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(0, 20.5, 14.5); // 預設廣角全景位置
    this.camera.lookAt(this.cameraTarget);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0; 
    this.container.appendChild(this.renderer.domElement);
    
    RectAreaLightUniformsLib.init();
  }

  private initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE
    };
    this.controls.target.copy(this.cameraTarget);

    this.controls.addEventListener('change', () => {
      if (this.guiParams && this.guiParams.camera.mode === 'Free') {
        this.isUpdatingFromControls = true;
        const p = this.guiParams.camera;
        p.position.x = this.camera.position.x;
        p.position.y = this.camera.position.y;
        p.position.z = this.camera.position.z;
        p.target.x = this.controls.target.x;
        p.target.y = this.controls.target.y;
        p.target.z = this.controls.target.z;
        if ((window as any).refreshGUI) (window as any).refreshGUI();
        this.isUpdatingFromControls = false;
      }
    });
  }

  private initPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0, 0.4, 0.95);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new SMAAPass());
    this.composer.addPass(new OutputPass());
  }

  private initLights() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(this.ambientLight);

    this.rectLight = new THREE.RectAreaLight(0xFFEED8, 1.2, 50, 50);
    this.rectLight.position.set(5, 32, 5);
    this.rectLight.lookAt(0, 0, 0);
    this.scene.add(this.rectLight);

    this.pointLight = new THREE.PointLight(0xffffff, 0.8, 100);
    this.pointLight.position.set(10, 25, 10);
    this.pointLight.castShadow = true;
    this.pointLight.shadow.mapSize.width = 1024;
    this.pointLight.shadow.mapSize.height = 1024;
    this.scene.add(this.pointLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.dirLight.position.set(-10, 38, 10);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.camera.left = -30;
    this.dirLight.shadow.camera.right = 30;
    this.dirLight.shadow.camera.top = 30;
    this.dirLight.shadow.camera.bottom = -30;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.bias = -0.0001;
    this.scene.add(this.dirLight);
  }

  // ==========================================
  // [SECTION 2: 環境與裝飾]
  // ==========================================

  private initBaseGeometry() {
    // 地板
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.1 });
    this.floor = new THREE.Mesh(floorGeo, floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = LAYOUT.FLOOR_Y;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    // 吧台
    const counterGeo = new THREE.BoxGeometry(100, 9, 8);
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9, metalness: 0.05 });
    this.counter = new THREE.Mesh(counterGeo, counterMat);
    this.counter.position.set(0, 4.5, 0);
    this.counter.receiveShadow = true;
    this.counter.castShadow = true;
    this.scene.add(this.counter);

    // 器材組初始化 (電子秤, 濾杯, 看板)
    for (let i = 0; i < 3; i++) {
      const xPos = (i - 1) * LAYOUT.DRIPPER_SPACING;
      
      const scale = new CoffeeScale(xPos, LAYOUT.TABLE_Y, LAYOUT.DRIPPER_Z); 
      this.scene.add(scale.mesh);
      this.scales.push(scale);

      this.createDripperSet(xPos, LAYOUT.TABLE_Y, LAYOUT.DRIPPER_Z, i); 
      
      const sign = new InstructionSign(xPos, LAYOUT.SIGNBOARD.BASE_Y, LAYOUT.SIGNBOARD.Z); 
      this.scene.add(sign.group);
      this.instructionSigns.push(sign);
    }
  }

  private initDecorations() {
    const geometries = [new THREE.BoxGeometry(1, 1, 1), new THREE.CylinderGeometry(0.5, 0.5, 1, 6), new THREE.OctahedronGeometry(0.7)];
    const colors = [0xFF5252, 0x42A5F5, 0xFFCA28, 0x66BB6A];
    for (let i = 0; i < 12; i++) {
      const geo = geometries[Math.floor(Math.random() * geometries.length)];
      const mat = new THREE.MeshStandardMaterial({ color: colors[Math.floor(Math.random() * colors.length)], roughness: 0.75, metalness: 0.1, flatShading: true, transparent: true, opacity: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((Math.random() - 0.5) * 40, Math.random() * 20 + 5, (Math.random() - 0.5) * 10 - 5);
      mesh.rotation.set(Math.random(), Math.random(), Math.random());
      mesh.castShadow = true; 
      this.scene.add(mesh); 
      this.decorations.push(mesh);
    }
  }

  // ==========================================
  // [SECTION 3: 互動器材邏輯]
  // ==========================================

  private initKettle() {
    this.kettle = new THREE.Group();
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xCFD8DC, metalness: 0.4, roughness: 0.9, flatShading: true, transparent: true });
    const darkSilverMat = new THREE.MeshStandardMaterial({ color: 0x90A4AE, metalness: 0.1, roughness: 1.0, flatShading: true, transparent: true });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xFFD54F, metalness: 0.3, roughness: 0.8, transparent: true });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xA1887F, roughness: 0.9, flatShading: true, transparent: true });

    // 壺身
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.6, 8), darkSilverMat);
    base.position.y = -1.2; base.castShadow = true; this.kettle.add(base);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.2, 2.8, 8), silverMat);
    body.castShadow = true; this.kettle.add(body);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.3, 0.4, 8), silverMat);
    lid.position.y = 1.6; this.kettle.add(lid);
    const knob = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), goldMat);
    knob.position.y = 1.95; this.kettle.add(knob);

    // 壺嘴
    const spoutPath = new THREE.CatmullRomCurve3([new THREE.Vector3(-1.2, -0.5, 0), new THREE.Vector3(-2.8, 0, 0), new THREE.Vector3(-3.5, 1.8, 0), new THREE.Vector3(-3.8, 2.5, 0)]);
    this.kettle.add(new THREE.Mesh(new THREE.TubeGeometry(spoutPath, 24, 0.15, 8, false), silverMat));

    // 把手
    const handleGroup = new THREE.Group();
    const joint = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.4), goldMat); joint.position.set(1.4, 1.2, 0); handleGroup.add(joint);
    const h1 = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 0.5), woodMat); h1.position.set(2.8, 1.2, 0); h1.rotation.z = -0.3; handleGroup.add(h1);
    const h2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.5, 0.5), woodMat); h2.position.set(4.2, -0.2, 0); h2.rotation.z = -0.1; handleGroup.add(h2);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.6), goldMat); cap.position.set(4.35, -1.9, 0); handleGroup.add(cap);
    this.kettle.add(handleGroup);

    this.kettle.scale.set(0.55, 0.55, 0.55);
    this.kettle.position.set(0, LAYOUT.KETTLE_Y, 0); 
    this.kettle.visible = false;
    this.scene.add(this.kettle);
  }

  private initWaterStream() {
    const geo = new THREE.CylinderGeometry(0.05, 0.05, 25, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, roughness: 0.75, metalness: 0.1 });
    this.waterStream = new THREE.Mesh(geo, mat);
    this.waterStream.visible = false; 
    this.scene.add(this.waterStream);
  }

  private createDripperSet(x: number, y: number, z: number, id: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // 下壺 (玻璃)
    const serverGeo = new THREE.CylinderGeometry(1.2, 1.5, 2.5, 12);
    const serverMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    const server = new THREE.Mesh(serverGeo, serverMat);
    server.position.y = 1.25; server.receiveShadow = true; server.castShadow = true;
    group.add(server);

    // 支架
    const standGeo = new THREE.BoxGeometry(3, 0.2, 3);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x78909C, roughness: 0.75, metalness: 0.1, flatShading: true });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.y = 2.6; stand.castShadow = true;
    group.add(stand);

    // 濾杯
    const dripperGeo = new THREE.CylinderGeometry(1.5, 0.2, 1.8, 8, 1, true);
    const dripperMat = new THREE.MeshStandardMaterial({ 
      color: 0xffffff, 
      roughness: 0.5, 
      metalness: 0.1, 
      flatShading: true,
      side: THREE.DoubleSide // 啟用雙面渲染，解決內壁消失問題
    });
    const dripper = new THREE.Mesh(dripperGeo, dripperMat);
    dripper.position.y = 3.5; dripper.rotation.y = 0.5; dripper.castShadow = true;
    group.add(dripper);

    // 咖啡豆/液體
    const liquidGeo = new THREE.CylinderGeometry(1.4, 1.4, 1, 12);
    const liquidMat = new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.75, metalness: 0.1, flatShading: true });
    const liquid = new THREE.Mesh(liquidGeo, liquidMat);
    liquid.name = 'liquid'; liquid.scale.set(0.98, 0.01, 0.98); liquid.position.y = 0.01;
    group.add(liquid);

    const powderGeo = new THREE.CylinderGeometry(1.3, 0.4, 0.1, 12);
    const powderMat = new THREE.MeshStandardMaterial({ color: 0x5a3820, roughness: 0.75, metalness: 0.1, flatShading: true });
    const powder = new THREE.Mesh(powderGeo, powderMat);
    powder.name = 'powder'; powder.position.y = 3.2; // 稍微調高咖啡粉位置
    group.add(powder);
 
    group.scale.set(0.55, 0.55, 0.55);
    this.scene.add(group);
    this.dripperSets[id] = group;
  }

  // ==========================================
  // [SECTION 4: 狀態更新與互動]
  // ==========================================

  public get3DPosition(mouseX: number, mouseY: number): { x: number, y: number, z: number } {
    this.mouseNDC.x = (mouseX / window.innerWidth) * 2 - 1;
    this.mouseNDC.y = -(mouseY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const target = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -LAYOUT.INTERACTION_Y), target);
    return { x: target.x, y: target.y, z: target.z };
  }

  public updateKettle(pos: { x: number, y: number, z: number }, isPouring: boolean) {
    this.kettle.visible = true;
    this.kettle.position.set(pos.x, LAYOUT.KETTLE_Y, pos.z);
    
    // 傾斜動畫
    const targetRotZ = isPouring ? 0.3 : 0; 
    this.kettle.rotation.z += (targetRotZ - this.kettle.rotation.z) * 0.1;

    this.waterStream.visible = isPouring;
    
    // 動態透明度：注水時手沖壺半透明，避免擋住視線
    this.kettle.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat) mat.opacity = isPouring ? 0.4 : 1.0;
      }
    });

    if (isPouring) {
      const worldPos = this.getSpoutWorldPos();
      const hitId = this.getHitCup(worldPos);
      if (Date.now() % 500 < 50) console.log(`Three: Pouring at world pos [${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)}], Hit Cup Id: ${hitId}`);
      
      let targetY = (hitId !== null) ? LAYOUT.DRIPPER_TOP_Y : LAYOUT.TABLE_Y;

      const height = Math.max(0.1, worldPos.y - targetY);
      this.waterStream.scale.y = height / 25;
      this.waterStream.position.set(worldPos.x, worldPos.y - height / 2, worldPos.z);
    }
  }

  // 獲取精確的手沖壺嘴世界座標 (封裝給外部邏輯使用)
  public getSpoutWorldPos(): { x: number, y: number, z: number } {
    const v = this.kettle.localToWorld(new THREE.Vector3(LAYOUT.KETTLE_SPOUT.x, LAYOUT.KETTLE_SPOUT.y, 0));
    return { x: v.x, y: v.y, z: v.z };
  }

  // 統一的注水命中判定 (唯一真相來源)
  public getHitCup(spoutWorldPos: { x: number, y: number, z: number }): number | null {
    // 放寬碰撞判定半徑：0.7 -> 0.85 (對應濾杯實體邊緣)
    const hitRadius = 0.85; 
    
    for (const idStr in this.dripperSets) {
        const id = parseInt(idStr);
        const set = this.dripperSets[id];
        if (!set || !set.visible) continue; // 僅判定可見的濾杯
        
        const dPos = set.position;
        const dist = Math.hypot(spoutWorldPos.x - dPos.x, spoutWorldPos.z - dPos.z);
        if (dist < hitRadius) return id;
    }
    return null;
  }

  public getKettleSpoutX(): number { return this.getSpoutWorldPos().x; }
  public getCupX(id: number): number { return this.dripperSets[id]?.position.x || 0; }

  public updateCup(id: number, weightRatio: number, isPouring: boolean, isOverLimit: boolean = false) {
    const group = this.dripperSets[id]; if (!group) return;
    const liquid = group.getObjectByName('liquid');
    if (liquid) {
      const maxFullHeight = 2.4;
      // 限制視覺高度，容許過量到 120% 但不再往上長
      const cappedRatio = Math.min(1.2, weightRatio);
      const targetScaleY = Math.max(0.01, cappedRatio * maxFullHeight);
      liquid.scale.y = targetScaleY;
      liquid.position.y = targetScaleY / 2;
    }

    // 濾杯發光反饋
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh && obj.name !== 'liquid' && (obj as THREE.Mesh).material) {
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat.emissive) {
          if (isOverLimit) {
            // 超量：紅光 (亮紅)
            mat.emissive.setHex(0xFF1744);
            mat.emissiveIntensity = 0.4;
          } else if (isPouring) {
            // 注水中：原本的溫潤黃光
            mat.emissive.setHex(0xFFE082);
            mat.emissiveIntensity = 0.1;
          } else {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
        }
      }
    });

    const powder = group.getObjectByName('powder') as THREE.Mesh;
    if (powder && isPouring) { (powder.material as THREE.MeshStandardMaterial).color.lerp(new THREE.Color(0x3a2010), 0.05); }
  }

  // ==========================================
  // [SECTION 5: 3D UI 管理]
  // ==========================================

  private init3DUI() {
    this.uiCanvas = document.createElement('canvas'); 
    this.uiCanvas.width = 512; 
    this.uiCanvas.height = 128; 
    this.uiContext = this.uiCanvas.getContext('2d')!;
    this.uiTexture = new THREE.CanvasTexture(this.uiCanvas);
    
    const uiGeo = new THREE.PlaneGeometry(3.8, 0.95);
    const uiMat = new THREE.MeshStandardMaterial({
      map: this.uiTexture,
      transparent: true,
      roughness: 1.0,
      metalness: 0.0,
      emissive: 0x0D47A1,
      emissiveIntensity: 0.02
    });
    this.uiSignboard = new THREE.Mesh(uiGeo, uiMat);
    this.uiSignboard.position.set(0, LAYOUT.TIMER.BASE_Y, LAYOUT.TIMER.Z); 
    this.uiSignboard.visible = false; // 預設隱藏，避免與單杯/多杯看板重疊
    this.scene.add(this.uiSignboard);
  }

  public update3DUI(time: string, weight: string, guide: string = "") {
    const ctx = this.uiContext; if (!ctx) return;
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(0, 0, 512, 128);
    ctx.font = '28px "Silkscreen"';
    ctx.fillStyle = '#263238';
    ctx.textAlign = 'center';
    
    if (guide) {
      ctx.fillText(`${time}  |  ${weight}`, 256, 55);
      ctx.fillStyle = '#EF6C00'; // 橘色醒目
      ctx.font = 'bold 36px "Noto Sans TC"';
      ctx.fillText(guide, 256, 105);
    } else {
      ctx.font = '36px "Silkscreen"';
      ctx.fillText(`${time}  |  ${weight}`, 256, 80);
    }
    
    this.uiTexture.needsUpdate = true;
  }

  public updateInstruction(id: number, instruction: string, subText: string, isHint: boolean) { 
    this.instructionSigns[id]?.update(instruction, subText, isHint); 
  }

  public updateScale(id: number, weight: number, timeStr: string) { 
    this.scales[id]?.update(weight, timeStr); 
  }

  public setUIVisibility(visible: boolean) {
    this.instructionSigns.forEach(s => s.group.visible = visible); 
    this.scales.forEach(s => s.mesh.visible = visible);
  }

  // ==========================================
  // [SECTION 6: GUI 連動]
  // ==========================================

  private initGUIParams() {
    this.guiParams = JSON.parse(JSON.stringify(DEFAULTS));
    (window as any).params = this.guiParams;

    initGUI(this.guiParams,
      (v) => this.updateLights(v),
      (v) => this.updateBloom(v),
      (v) => this.updateScene(v),
      (v) => this.updateGame(v),
      () => this.resetCamera(),
      (v) => this.updateCamera(v)
    );
  }

  private updateLights(v: any) {
    if (this.ambientLight) this.ambientLight.intensity = v.ambientIntensity;
    if (this.pointLight) {
      this.pointLight.intensity = v.pointIntensity;
      this.pointLight.color.set(v.pointColor);
      this.pointLight.position.set(v.pointPosition.x, v.pointPosition.y, v.pointPosition.z);
    }
    if (this.dirLight) {
      this.dirLight.intensity = v.dirIntensity;
      this.dirLight.position.set(v.dirPosition.x, v.dirPosition.y, v.dirPosition.z);
    }
    if (this.rectLight) this.rectLight.intensity = v.rectIntensity;
    if (this.renderer) this.renderer.toneMappingExposure = v.toneMappingExposure;
  }

  private updateBloom(v: any) {
    if (this.bloomPass) {
      this.bloomPass.strength = v.bloomStrength;
      this.bloomPass.radius = v.bloomRadius;
      this.bloomPass.threshold = v.bloomThreshold;
    }
  }

  private updateScene(v: any) {
    if (this.scene.background instanceof THREE.Color) this.scene.background.set(v.bgColor);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.set(v.bgColor);
      this.scene.fog.density = v.fogDensity;
    }
    if (this.renderer) this.renderer.setClearColor(v.bgColor);
    if (this.floor) (this.floor.material as THREE.MeshStandardMaterial).color.set(v.floorColor);
    if (this.counter) (this.counter.material as THREE.MeshStandardMaterial).color.set(v.counterColor);
  }

  private updateGame(v: any) {
    if ((window as any).game) (window as any).game.pourSpeed = v.pourSpeed;
    if (this.waterStream) {
      this.waterStream.scale.x = v.streamRadius * 20;
      this.waterStream.scale.z = v.streamRadius * 20;
    }
  }

  public setDripperCount(count: number, hideSigns: boolean = false) {
    for (let i = 0; i < 3; i++) {
      const set = this.dripperSets[i];
      if (!set) continue;

      let visible = false;
      let xPos = (i - 1) * LAYOUT.DRIPPER_SPACING; 

      if (count === 1) {
          visible = (i === 1);
          xPos = (i - 1) * LAYOUT.DRIPPER_SPACING; // 1-1=0 為中心，其餘保持原位偏移
      } else if (count === 2) {
          visible = (i === 0 || i === 2);
          if (i === 1) xPos = 0; // 中間杯子雖然隱藏，但也歸零
          else xPos = (i === 0) ? -LAYOUT.DRIPPER_SPACING / 2 : LAYOUT.DRIPPER_SPACING / 2;
      } else if (count === 3) {
          visible = true;
          xPos = (i - 1) * LAYOUT.DRIPPER_SPACING;
      }
      
      set.visible = visible;
      set.position.x = xPos;
      if (this.instructionSigns[i]) {
          this.instructionSigns[i].group.visible = visible && !hideSigns;
          this.instructionSigns[i].group.position.x = xPos;
      }
      if (this.scales[i]) {
          this.scales[i].mesh.visible = visible;
          this.scales[i].mesh.position.x = xPos;
      }
    }

    if (count === 1) {
        this.applyCameraPreset('職人視角 (單杯)');
    } else {
        this.applyCameraPreset('職人視角');
    }

    // 僅在計算模式且大於 1 杯時顯示頂部主標籤，避免單杯時與個別看板重疊
    const isCalcMode = this.guiParams?.calculator?.mode === '計算模式';
    if (this.uiSignboard) this.uiSignboard.visible = isCalcMode && count > 1;
  }

  public applyCameraPreset(presetName: string) {
    const PRESETS: any = {
      '職人視角': { pos: { x: 0, y: 22, z: 12 }, target: { x: 0, y: 8, z: 2 } },
      '職人視角 (單杯)': { pos: { x: 0, y: 19.5, z: 12 }, target: { x: 0, y: 8.5, z: 1 } },
      '廣角全景': { pos: { x: 0, y: 20.5, z: 14.5 }, target: { x: 0, y: 9, z: 3 } }
    };

    const p = PRESETS[presetName];
    if (p && this.guiParams) {
      console.log(`ThreeScene: Applying preset ${presetName}`, p);
      this.guiParams.camera.mode = 'Fixed';
      this.guiParams.camera.preset = presetName;
      this.guiParams.camera.position = { ...p.pos };
      this.guiParams.camera.target = { ...p.target };
      
      this.updateCamera(this.guiParams.camera);
      if ((window as any).refreshGUI) (window as any).refreshGUI();
    }
  }

  public updateCamera(v: any) {
    if (this.isUpdatingFromControls) return;
    const isFree = v.mode === 'Free';
    this.controls.enabled = isFree;
    
    console.log(`ThreeScene: Camera mode updated - Free: ${isFree}`);

    if (!isFree) {
        this.camera.position.set(v.position.x, v.position.y, v.position.z);
        this.controls.target.set(v.target.x, v.target.y, v.target.z);
        this.camera.lookAt(this.controls.target);
        this.controls.update(); // 確保控制器的內部矩陣也同步
    }
    this.camera.zoom = v.zoom;
    this.camera.updateProjectionMatrix();
    if (isFree) this.controls.update();
  }

  public resetCamera() {
    this.applyCameraPreset('廣角全景');
  }

  // ==========================================
  // [SECTION 7: 生命週期]
  // ==========================================

  private onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.aspect = aspect;
    this.camera.lookAt(this.cameraTarget);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight); 
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  public render() {
    if (this.controls) this.controls.update();
    const time = performance.now() * 0.001;
    this.decorations.forEach((m, i) => { 
      m.position.y += Math.sin(time + i) * 0.005; m.rotation.x += 0.005; m.rotation.y += 0.005; 
    });

    
    // 看板與 UI 動態過渡
    const camY = this.camera.position.y;
    const tiltFactor = Math.pow(Math.min(1, Math.max(0, (camY - LAYOUT.ANIMATION.CAM_MIN) / LAYOUT.ANIMATION.RANGE)), 2); 
    const dynamicTilt = -tiltFactor * (Math.PI / 2);
 
    this.instructionSigns.forEach(sign => {
      sign.group.rotation.y = 0;
      sign.group.rotation.x = dynamicTilt;
      sign.group.position.y = LAYOUT.SIGNBOARD.BASE_Y + (1 - tiltFactor) * LAYOUT.SIGNBOARD.LIFT;
    });
    
    this.uiSignboard.rotation.y = 0;
    this.uiSignboard.rotation.x = dynamicTilt;
    this.uiSignboard.position.y = LAYOUT.TIMER.BASE_Y + (1 - tiltFactor) * LAYOUT.TIMER.LIFT;
    // this.uiSignboard.visible = true; // 移除強制顯示，改由 setDripperCount 控制

    // 電子秤數字螢幕動態轉向
    this.scales.forEach(scale => {
      // 隨視角拉高 (tiltFactor 0->1)，螢幕從傾斜 (-0.6) 轉為平躺 (-1.57)，方便職人視角從正上方閱讀
      scale.screen.rotation.x = -0.6 - (tiltFactor * (Math.PI / 2 - 0.6));
    });

    this.composer.render();
  }

  public showMenu() {
    this.scene.background = new THREE.Color(0xA1E3F9);
    this.scene.fog = new THREE.FogExp2(0xA1E3F9, 0.005);
  }

  public startGame() {
    this.scene.background = new THREE.Color(0xffffff);
    this.scene.fog = new THREE.FogExp2(0xffffff, 0);
  }
  public getRendererCanvas() { return this.renderer.domElement; }
  public show() { this.container.classList.remove('hidden'); }
  public hide() { this.container.classList.add('hidden'); }

  public checkStartButtonClick(): boolean {
    return false;
  }
}
