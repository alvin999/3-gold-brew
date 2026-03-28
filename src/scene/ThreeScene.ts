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
import { Kettle } from './components/Kettle';
import { DripperSet } from './components/DripperSet';
import { SplashParticles } from './components/SplashParticles';
import { HUD3D } from './components/HUD3D';

export class ThreeScene {
  // === [核心 Three.js 物件] ===
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  public controls!: OrbitControls;
  private composer!: EffectComposer;
  private container: HTMLElement;
  private raycaster!: THREE.Raycaster;
  private mouseNDC!: THREE.Vector2;

  // === [場景組件] ===
  private kettle!: Kettle;
  private splashParticles!: SplashParticles;
  private dripperSets: { [key: number]: DripperSet } = {};
  private scales: CoffeeScale[] = [];
  private instructionSigns: InstructionSign[] = [];
  private hud3d!: HUD3D;

  // === [燈光與環境] ===
  private ambientLight!: THREE.AmbientLight;
  private pointLight!: THREE.PointLight;
  private dirLight!: THREE.DirectionalLight;
  private rectLight!: THREE.RectAreaLight;
  private bloomPass!: UnrealBloomPass;
  private floor: THREE.Mesh | null = null;
  private counter: THREE.Mesh | null = null;
  private decorations: THREE.Mesh[] = [];

  // === [狀態管理] ===
  public guiParams: any = null;
  private isUpdatingFromControls = false;
  private cameraTarget = new THREE.Vector3(0, LAYOUT.TABLE_Y, 0);

  constructor(containerId: string) {
    console.log("ThreeScene: Initializing Modular Scene");
    this.container = document.getElementById(containerId)!;

    this.initCore();
    this.initControls();
    this.initPostProcessing();
    this.initLights();
    this.initEnvironment();
    this.initComponents();
    
    this.initGUIParams();
    this.onWindowResize();
    window.addEventListener('resize', () => this.onWindowResize());
  }

  private initCore() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(LAYOUT.COLORS.BACKGROUND);
    this.scene.fog = new THREE.FogExp2(LAYOUT.COLORS.FOG, 0.005);
    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2();

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(LAYOUT.CAMERA.DEFAULT.pos.x, LAYOUT.CAMERA.DEFAULT.pos.y, LAYOUT.CAMERA.DEFAULT.pos.z);
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
    const l = LAYOUT.LIGHTS;
    this.ambientLight = new THREE.AmbientLight(l.AMBIENT.color, l.AMBIENT.intensity);
    this.scene.add(this.ambientLight);

    this.rectLight = new THREE.RectAreaLight(l.RECT.color, l.RECT.intensity, l.RECT.width, l.RECT.height);
    this.rectLight.position.set(l.RECT.pos.x, l.RECT.pos.y, l.RECT.pos.z);
    this.rectLight.lookAt(0, 0, 0);
    this.scene.add(this.rectLight);

    this.pointLight = new THREE.PointLight(l.POINT.color, l.POINT.intensity, l.POINT.distance);
    this.pointLight.position.set(l.POINT.pos.x, l.POINT.pos.y, l.POINT.pos.z);
    this.pointLight.castShadow = true;
    this.pointLight.shadow.mapSize.width = 1024;
    this.pointLight.shadow.mapSize.height = 1024;
    this.scene.add(this.pointLight);

    this.dirLight = new THREE.DirectionalLight(l.DIR.color, l.DIR.intensity);
    this.dirLight.position.set(l.DIR.pos.x, l.DIR.pos.y, l.DIR.pos.z);
    this.dirLight.castShadow = true;
    const s = l.DIR.shadowScale;
    this.dirLight.shadow.camera.left = -s;
    this.dirLight.shadow.camera.right = s;
    this.dirLight.shadow.camera.top = s;
    this.dirLight.shadow.camera.bottom = -s;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.bias = -0.0001;
    this.scene.add(this.dirLight);
  }

  private initEnvironment() {
    // 地板
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({ color: LAYOUT.COLORS.FLOOR, roughness: 0.85, metalness: 0.1 });
    this.floor = new THREE.Mesh(floorGeo, floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = LAYOUT.FLOOR_Y;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    // 吧台
    const counterGeo = new THREE.BoxGeometry(100, 9, 8);
    const counterMat = new THREE.MeshStandardMaterial({ color: LAYOUT.COLORS.COUNTER, roughness: 0.9, metalness: 0.05 });
    this.counter = new THREE.Mesh(counterGeo, counterMat);
    this.counter.position.set(0, 4.5, 0);
    this.counter.receiveShadow = true;
    this.counter.castShadow = true;
    this.scene.add(this.counter);

    // 隨機裝飾
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

  private initComponents() {
    this.kettle = new Kettle();
    this.scene.add(this.kettle.group);
    this.scene.add(this.kettle.waterStream);

    this.splashParticles = new SplashParticles();
    this.scene.add(this.splashParticles.mesh);

    this.hud3d = new HUD3D();
    this.scene.add(this.hud3d.signboard);

    for (let i = 0; i < 3; i++) {
      const xPos = (i - 1) * LAYOUT.DRIPPER_SPACING;
      
      const scale = new CoffeeScale(xPos, LAYOUT.TABLE_Y, LAYOUT.DRIPPER_Z);
      this.scene.add(scale.mesh);
      this.scales.push(scale);

      const dSet = new DripperSet(xPos, LAYOUT.TABLE_Y, LAYOUT.DRIPPER_Z, i);
      this.scene.add(dSet.group);
      this.dripperSets[i] = dSet;

      const sign = new InstructionSign(xPos, LAYOUT.SIGNBOARD.BASE_Y, LAYOUT.SIGNBOARD.Z);
      this.scene.add(sign.group);
      this.instructionSigns.push(sign);
    }
  }

  private initGUIParams() {
    this.guiParams = JSON.parse(JSON.stringify(DEFAULTS));
    (window as any).params = this.guiParams;

    initGUI(this.guiParams,
      (v) => this.updateLightsFromGUI(v),
      (v) => this.updateBloom(v),
      (v) => this.updateSceneSettings(v),
      (v) => this.updateGameSettings(v),
      () => this.resetCamera(),
      (v) => this.updateCamera(v)
    );
  }

  // --- [功能代理] ---

  public get3DPosition(mouseX: number, mouseY: number): { x: number, y: number, z: number } {
    this.mouseNDC.x = (mouseX / window.innerWidth) * 2 - 1;
    this.mouseNDC.y = -(mouseY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const target = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -LAYOUT.INTERACTION_Y), target);
    return { x: target.x, y: target.y, z: target.z };
  }

  public updateKettle(pos: { x: number, y: number, z: number }, isPouring: boolean) {
    this.kettle.setVisibility(true);
    const streamFlowSpeed = this.guiParams?.game?.streamFlowSpeed || 1.5;
    this.kettle.update(pos, isPouring, streamFlowSpeed);

    if (isPouring) {
      const worldPos = this.kettle.getSpoutWorldPos();
      const currentFlow = (window as any).game?.pourSpeed || 10.0;
      const horizontalVel = (currentFlow / 10.0) * 0.35;
      const curvature = horizontalVel * (this.kettle.group.rotation.z / 0.35) * 2.0;
      
      const hitId = this.getHitCupByParabola(worldPos, curvature);
      
      // 更新水塊與噴濺
      let targetY = LAYOUT.TABLE_Y;
      if (hitId !== null) {
        const cup = (window as any).game?.cups[hitId];
        const dRatio = cup ? Math.max(0, (cup.currentWeight - cup.visualServerWeight) / 15) : 0;
        targetY = LAYOUT.TABLE_Y + (LAYOUT.MODEL.DRIPPER_BOTTOM_Y + (Math.min(1.0, dRatio) * LAYOUT.MODEL.DRIPPER_MAX_H)) * LAYOUT.MODEL.SCALE;
      } else {
        targetY = LAYOUT.TABLE_Y + 0.05;
      }

      const height = Math.max(0.1, worldPos.y - targetY);
      const streamRadiusBase = this.guiParams?.game?.streamRadius || 0.032;
      const visualRadius = streamRadiusBase * Math.sqrt(currentFlow / 10.0);
      
      this.kettle.setStreamParams(height, visualRadius, curvature, performance.now() * 0.001);
      
      const landingPoint = {
        x: worldPos.x - curvature * Math.pow(height / 25.0, 0.5),
        y: targetY,
        z: worldPos.z
      };
      const splashIntensity = this.guiParams?.game?.splashIntensity || 1.0;
      this.splashParticles.emit(landingPoint, hitId !== null, splashIntensity);

      // 發光回饋
      this.applyEmissiveToKettle((hitId !== null) ? 'active' : 'none');
    }
  }

  private applyEmissiveToKettle(mode: 'none' | 'active') {
    const config = {
      'none':   { color: 0x000000, intensity: 0 },
      'active': { color: 0xFFE082, intensity: 0.2 }
    }[mode];
    this.kettle.group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat && mat.emissive) {
          mat.emissive.setHex(config.color);
          mat.emissiveIntensity = config.intensity;
        }
      }
    });
  }

  public getHitCupByParabola(spoutPos: THREE.Vector3, curvature: number): number | null {
    const hitRadius = 0.85;
    for (const idStr in this.dripperSets) {
      const id = parseInt(idStr);
      const dSet = this.dripperSets[id];
      if (!dSet || !dSet.group.visible) continue;

      const worldDripperTopY = LAYOUT.TABLE_Y + LAYOUT.MODEL.DRIPPER_TOP_LOCAL_Y * LAYOUT.MODEL.SCALE; 
      const height = spoutPos.y - worldDripperTopY;
      const landingX = spoutPos.x - curvature * Math.pow(height / 25.0, 0.5);

      const dist = Math.hypot(landingX - dSet.group.position.x, spoutPos.z - dSet.group.position.z);
      if (dist < hitRadius) return id;
    }
    return null;
  }

  public getHitCup(spoutWorldPos: THREE.Vector3): number | null {
    const currentFlow = (window as any).game?.pourSpeed || 10.0;
    const horizontalVel = (currentFlow / 10.0) * 0.35;
    const curvature = horizontalVel * (this.kettle.group.rotation.z / 0.35) * 2.0;
    return this.getHitCupByParabola(spoutWorldPos, curvature);
  }

  public updateCup(id: number, serverRatio: number, dripperRatio: number, isPouring: boolean, isOverLimit: boolean = false) {
    this.dripperSets[id]?.update(serverRatio, dripperRatio, isPouring, isOverLimit);
  }

  public update3DUI(time: string, weight: string, guide: string = "") {
    this.hud3d.updateHUD(time, weight, guide);
  }

  public updateRecipeHUD(title: string, subtitle: string, stages: any[], currentTime: string = "") {
    this.hud3d.updateRecipe(title, subtitle, stages, currentTime);
  }

  public setHUDVisibility(visible: boolean) {
    this.hud3d.setVisibility(visible);
  }

  public setUIVisibility(visible: boolean) {
    this.instructionSigns.forEach(s => s.group.visible = visible);
    this.scales.forEach(s => s.mesh.visible = visible);
  }

  public updateInstruction(id: number, instruction: string, subText: string, isHint: boolean) {
    this.instructionSigns[id]?.update(instruction, subText, isHint);
  }

  public updateScale(id: number, weight: number, timeStr: string) {
    this.scales[id]?.update(weight, timeStr);
  }

  // --- [GUI 更新邏輯] ---

  private updateLightsFromGUI(v: any) {
    this.ambientLight.intensity = v.ambientIntensity;
    this.pointLight.intensity = v.pointIntensity;
    this.pointLight.color.set(v.pointColor);
    this.pointLight.position.set(v.pointPosition.x, v.pointPosition.y, v.pointPosition.z);
    this.dirLight.intensity = v.dirIntensity;
    this.dirLight.position.set(v.dirPosition.x, v.dirPosition.y, v.dirPosition.z);
    this.rectLight.intensity = v.rectIntensity;
    this.renderer.toneMappingExposure = v.toneMappingExposure;
  }

  private updateBloom(v: any) {
    this.bloomPass.strength = v.bloomStrength;
    this.bloomPass.radius = v.bloomRadius;
    this.bloomPass.threshold = v.bloomThreshold;
  }

  private updateSceneSettings(v: any) {
    if (this.scene.background instanceof THREE.Color) this.scene.background.set(v.bgColor);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.set(v.bgColor);
      this.scene.fog.density = v.fogDensity;
    }
    this.renderer.setClearColor(v.bgColor);
    if (this.floor) (this.floor.material as THREE.MeshStandardMaterial).color.set(v.floorColor);
    if (this.counter) (this.counter.material as THREE.MeshStandardMaterial).color.set(v.counterColor);
  }

  private updateGameSettings(v: any) {
    if ((window as any).game) (window as any).game.pourSpeed = v.pourSpeed;
  }

  public setDripperCount(count: number, hideSigns: boolean = false) {
    for (let i = 0; i < 3; i++) {
      const dSet = this.dripperSets[i];
      if (!dSet) continue;

      let visible = false;
      let xPos = (i - 1) * LAYOUT.DRIPPER_SPACING;

      if (count === 1) {
        visible = (i === 1);
      } else if (count === 2) {
        visible = (i === 0 || i === 2);
        xPos = (i === 0) ? -LAYOUT.DRIPPER_SPACING / 2 : (i === 2 ? LAYOUT.DRIPPER_SPACING / 2 : 0);
      } else if (count === 3) {
        visible = true;
      }

      dSet.group.visible = visible;
      dSet.group.position.x = xPos;
      if (this.instructionSigns[i]) {
        this.instructionSigns[i].group.visible = visible && !hideSigns;
        this.instructionSigns[i].group.position.x = xPos;
      }
      if (this.scales[i]) {
        this.scales[i].mesh.visible = visible;
        this.scales[i].mesh.position.x = xPos;
      }
    }

    const preset = count === 1 ? '職人視角 (單杯)' : '職人視角';
    this.applyCameraPreset(preset);

    const p = this.guiParams?.calculator;
    const isSpecialMode = p && (p.mode === '練習模式' || p.mode === '遊戲模式');
    this.hud3d.setVisibility((isSpecialMode && count >= 1) || (p && p.mode === '自由模式'));
  }

  public applyCameraPreset(presetName: string) {
    const p = LAYOUT.CAMERA.PRESETS[presetName as keyof typeof LAYOUT.CAMERA.PRESETS];
    if (p && this.guiParams) {
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
    if (!isFree) {
      this.camera.position.set(v.position.x, v.position.y, v.position.z);
      this.controls.target.set(v.target.x, v.target.y, v.target.z);
      this.camera.lookAt(this.controls.target);
      this.controls.update();
    }
    this.camera.zoom = v.zoom;
    this.camera.updateProjectionMatrix();
    if (isFree) this.controls.update();
  }

  public resetCamera() {
    this.applyCameraPreset('廣角全景');
  }

  // --- [生命週期與渲染] ---

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
    
    // 裝飾品動畫
    this.decorations.forEach((m, i) => {
      m.position.y += Math.sin(time + i) * 0.005;
      m.rotation.x += 0.005;
      m.rotation.y += 0.005;
    });

    // 動態過渡係數
    const camY = this.camera.position.y;
    const tiltFactor = Math.pow(Math.min(1, Math.max(0, (camY - LAYOUT.ANIMATION.CAM_MIN) / LAYOUT.ANIMATION.RANGE)), 2);

    // 更新看板角度
    this.instructionSigns.forEach(sign => {
      const dynamicTilt = -tiltFactor * (Math.PI / 2);
      sign.group.rotation.x = dynamicTilt;
      sign.group.position.y = LAYOUT.SIGNBOARD.BASE_Y + (1 - tiltFactor) * LAYOUT.SIGNBOARD.LIFT;
    });
    this.hud3d.updateTilt(tiltFactor);

    // 電子秤數字螢幕動態轉向
    this.scales.forEach(scale => {
      scale.screen.rotation.x = -0.6 - (tiltFactor * (Math.PI / 2 - 0.6));
    });

    // 物理與粒子更新
    this.splashParticles.update();

    this.composer.render();
  }

  public showMenu() {
    const c = LAYOUT.COLORS.BACKGROUND;
    this.scene.background = new THREE.Color(c);
    this.scene.fog = new THREE.FogExp2(c, 0.005);
  }

  public startGame() {
    this.scene.background = new THREE.Color(0xffffff);
    this.scene.fog = new THREE.FogExp2(0xffffff, 0);
  }

  public getRendererCanvas() { return this.renderer.domElement; }
  public show() { this.container.classList.remove('hidden'); }
  public hide() { this.container.classList.add('hidden'); }
  public getSpoutWorldPos() { return this.kettle.getSpoutWorldPos(); }
  public getKettleSpoutX() { return this.getSpoutWorldPos().x; }
  public getCupX(id: number) { return this.dripperSets[id]?.group.position.x || 0; }
  public checkStartButtonClick() { return false; }
}
