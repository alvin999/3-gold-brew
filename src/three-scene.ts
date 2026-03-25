import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { sheet } from './studio';
import { initGUI } from './gui';

class InstructionSign {
  public group: THREE.Group;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;

  constructor(x: number, _y: number, _z: number) {
    this.group = new THREE.Group();
    // 全域懸掛位置：移動到背景合適高度，避開上方的計時器
    this.group.position.set(x, 6.5, -5);
    this.group.rotation.x = 0.1; // 稍微往後仰，符合遠景透視

    // 大幅增加尺寸：從 2.4x0.8 增加到 6x2
    const panelGeo = new THREE.PlaneGeometry(8, 2.5);
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024; // 增加解析度
    this.canvas.height = 256;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.anisotropy = 16;

    const panelMat = new THREE.MeshStandardMaterial({
      map: this.texture,
      side: THREE.DoubleSide,
      transparent: true,
      roughness: 0.2,
      metalness: 0.3,
      emissive: 0x42A5F5,
      emissiveIntensity: 0.1
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    this.group.add(panel);
    this.update("準備中", "等待開始", false);
  }

  public update(instruction: string, subText: string, isHint: boolean) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 1024, 256);

    // 背景
    ctx.fillStyle = isHint ? 'rgba(211, 47, 47, 0.95)' : 'rgba(20, 30, 40, 0.85)';
    if ((ctx as any).roundRect) {
      ctx.beginPath();
      (ctx as any).roundRect(0, 0, 1024, 256, 32);
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, 1024, 256);
    }

    // 邊框
    ctx.strokeStyle = isHint ? '#FFEB3B' : '#42A5F5';
    ctx.lineWidth = 12;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 指令文字 (大幅增加字體)
    ctx.font = 'bold 96px "Silkscreen", monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.fillText(instruction, 512, 100);

    // 副標題文字
    ctx.font = 'bold 64px "Silkscreen", monospace';
    ctx.fillStyle = isHint ? '#FFEB3B' : '#90CAF9';
    ctx.fillText(subText, 512, 190);

    this.texture.needsUpdate = true;
  }
}

class CoffeeScale {
  public mesh: THREE.Group;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;

  constructor(x: number, y: number, z: number) {
    this.mesh = new THREE.Group();
    this.mesh.position.set(x, y, z);
    const baseGeo = new THREE.BoxGeometry(5, 0.4, 5); // 放大底座: 4 -> 5
    const baseMat = new THREE.MeshPhongMaterial({ color: 0xCFD8DC, flatShading: true });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.2;
    base.castShadow = true;
    base.receiveShadow = true;
    this.mesh.add(base);
    const screenGeo = new THREE.PlaneGeometry(2.5, 0.7); // 放大螢幕面板: 2x0.6 -> 2.5x0.7
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 64;
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 16;

    const screenMat = new THREE.MeshStandardMaterial({
      map: this.texture,
      transparent: true,
      roughness: 0.2,
      metalness: 0.2,
      depthTest: false,
      depthWrite: false
    });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.renderOrder = 999;
    screen.position.set(0, 0.25, 2.2); // 同步調整螢幕 Z 軸位置，適應加大的底座
    screen.rotation.x = -0.5;
    this.mesh.add(screen);
    this.update(0);
  }

  public update(weight: number) {
    const ctx = this.ctx;
    // 使用與底座相同的背景色 #CFD8DC
    ctx.fillStyle = '#CFD8DC';
    ctx.fillRect(0, 0, 256, 64);

    // 暫時固定使用字體，並繪製一次確保清晰 (淺色背景用深色字)
    ctx.font = 'bold 44px monospace';
    ctx.fillStyle = '#263238'; // 深灰色文字
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(weight.toFixed(1) + ' g', 245, 32);

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
  private ambientLight!: THREE.AmbientLight;
  private pointLight!: THREE.PointLight;
  private rectLight!: THREE.RectAreaLight;
  private bloomPass!: UnrealBloomPass;
  private cameraTarget = new THREE.Vector3(0, 3, 0);
  private floor: THREE.Mesh | null = null;
  private counter: THREE.Mesh | null = null;

  constructor(containerId: string) {
    console.log("ThreeScene: Initializing");
    this.container = document.getElementById(containerId)!;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1A2533); // 改用深藍灰色，更純淨高雅
    this.scene.fog = new THREE.FogExp2(0x1A2533, 0.012);
    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2();
    const aspect = window.innerWidth / window.innerHeight;
    const d = 12;
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    this.camera.position.set(0, 12, 25);
    this.camera.lookAt(this.cameraTarget);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.85; // 調降初始曝光防止桌面過曝
    this.container.appendChild(this.renderer.domElement);
    RectAreaLightUniformsLib.init();
    this.initPostProcessing();
    this.initLights();
    this.initBaseGeometry();
    this.initWaterStream();
    this.initKettle();
    this.init3DUI();
    this.initDecorations();
    this.initStudio();
    this.onWindowResize();
    window.addEventListener('resize', () => this.onWindowResize());
  }

  private initStudio() {
    const cameraObj = sheet.object('Camera', {
      position: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z },
      target: { x: this.cameraTarget.x, y: this.cameraTarget.y, z: this.cameraTarget.z },
      zoom: this.camera.zoom
    });
    cameraObj.onValuesChange((v) => {
      this.camera.position.set(v.position.x, v.position.y, v.position.z);
      this.cameraTarget.set(v.target.x, v.target.y, v.target.z);
      this.camera.zoom = v.zoom;
      this.camera.lookAt(this.cameraTarget);
      this.camera.updateProjectionMatrix();
    });

    // 整合光源控制進入 Theatre.js
    const lightsObj = sheet.object('Lights', {
      ambient: { intensity: 0.5 },
      point: {
        intensity: 0.8,
        color: { r: 1, g: 1, b: 1 },
        position: { x: 10, y: 20, z: 10 }
      },
      rect: {
        intensity: 2.0,
        color: { r: 1, g: 0.93, b: 0.85 }, // #FFEED8
        width: 50,
        height: 50,
        position: { x: 5, y: 25, z: 5 }
      }
    });

    // 劇院模式與場景參數控制
    const sceneObj = sheet.object('Scene', {
      exposure: 0.85,
      background: { r: 0x1A/255, g: 0x25/255, b: 0x33/255 }, // 同步更新初始值
      fogDensity: 0.012
    });

    sceneObj.onValuesChange((v) => {
      this.renderer.toneMappingExposure = v.exposure;
      this.scene.background = new THREE.Color(v.background.r, v.background.g, v.background.b);
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.copy(this.scene.background as THREE.Color);
        this.scene.fog.density = v.fogDensity;
      }
    });

    lightsObj.onValuesChange((v) => {
      if (this.ambientLight) this.ambientLight.intensity = v.ambient.intensity;
      if (this.pointLight) {
        this.pointLight.intensity = v.point.intensity;
        this.pointLight.color.setRGB(v.point.color.r, v.point.color.g, v.point.color.b);
        this.pointLight.position.set(v.point.position.x, v.point.position.y, v.point.position.z);
      }
      if (this.rectLight) {
        this.rectLight.intensity = v.rect.intensity;
        this.rectLight.color.setRGB(v.rect.color.r, v.rect.color.g, v.rect.color.b);
        this.rectLight.position.set(v.rect.position.x, v.rect.position.y, v.rect.position.z);
        this.rectLight.width = v.rect.width;
        this.rectLight.height = v.rect.height;
      }
    });

    initGUI(
      (v) => this.updateLights(v),
      (v) => this.updateBloom(v),
      (v) => this.updateScene(v),
      (v) => this.updateGame(v)
    );
  }

  private updateLights(v: any) {
    if (this.ambientLight) this.ambientLight.intensity = v.ambientIntensity;
    if (this.pointLight) {
      this.pointLight.intensity = v.pointIntensity;
      this.pointLight.color.set(v.pointColor);
    }
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
    if (this.renderer) this.renderer.setClearColor(v.bgColor);
    if (this.floor && (this.floor.material as THREE.MeshStandardMaterial).color) {
      (this.floor.material as THREE.MeshStandardMaterial).color.set(v.floorColor);
    }
    if (this.counter && (this.counter.material as THREE.MeshStandardMaterial).color) {
      (this.counter.material as THREE.MeshStandardMaterial).color.set(v.counterColor);
    }
  }

  private updateGame(v: any) {
    if ((window as any).game) {
      (window as any).game.pourSpeed = v.pourSpeed;
    }
    if (this.waterStream) {
      this.waterStream.scale.x = v.streamRadius * 20;
      this.waterStream.scale.z = v.streamRadius * 20;
    }
  }

  private initPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.2, 0.4, 0.95);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new SMAAPass());
  }

  private initLights() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(this.ambientLight);

    this.rectLight = new THREE.RectAreaLight(0xFFEED8, 1.8, 50, 50);
    this.rectLight.position.set(5, 25, 5);
    this.rectLight.lookAt(0, 0, 0);
    this.scene.add(this.rectLight);

    this.pointLight = new THREE.PointLight(0xffffff, 0.75, 100);
    this.pointLight.position.set(10, 20, 10);
    this.pointLight.castShadow = true;
    this.scene.add(this.pointLight);
  }

  private initBaseGeometry() {
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xE1F5FE, roughness: 0.85, metalness: 0.1 });
    this.floor = new THREE.Mesh(floorGeo, floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -11;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    const counterGeo = new THREE.BoxGeometry(100, 2, 8); // 寬度 36 -> 100 填滿螢幕
    // 桌面改用深色磨砂質感，防止曝光
    const counterMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.9,
      metalness: 0.05
    });
    this.counter = new THREE.Mesh(counterGeo, counterMat);
    this.counter.position.set(0, -8, 0);
    this.counter.receiveShadow = true; this.counter.castShadow = true;
    this.scene.add(this.counter);

    for (let i = 0; i < 3; i++) {
      const xPos = (i - 1) * 12; // 間距擴大: 10 -> 12
      const scale = new CoffeeScale(xPos, -7, 1);
      this.scene.add(scale.mesh);
      this.scales.push(scale);
      this.createDripperSet(xPos, -6.6, 1, i);
      const sign = new InstructionSign(xPos, -6, 1);
      this.scene.add(sign.group);
      this.instructionSigns.push(sign);
    }
  }

  private createDripperSet(x: number, y: number, z: number, id: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const serverGeo = new THREE.CylinderGeometry(1.2, 1.5, 2.5, 12);
    // 將下壺改為半透明玻璃材質，這樣咖啡液體從底部開始就能被看見
    const serverMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    const server = new THREE.Mesh(serverGeo, serverMat);
    server.position.y = 1.25; server.receiveShadow = true; server.castShadow = true;
    group.add(server);
    const standGeo = new THREE.BoxGeometry(3, 0.2, 3);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x78909C, roughness: 0.75, metalness: 0.1, flatShading: true });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.y = 2.6; stand.castShadow = true;
    group.add(stand);

    const dripperGeo = new THREE.CylinderGeometry(1.5, 0.2, 1.8, 8, 1, true);
    const dripperMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.1, flatShading: true });
    const dripper = new THREE.Mesh(dripperGeo, dripperMat);
    dripper.position.y = 3.5; dripper.rotation.y = 0.5; dripper.castShadow = true;
    group.add(dripper);

    const innerGeo = new THREE.CylinderGeometry(1.48, 0.18, 1.78, 8, 1, true);
    const innerMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.7, flatShading: true, side: THREE.BackSide });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.y = 3.5; inner.rotation.y = 0.5;
    group.add(inner);

    const liquidGeo = new THREE.CylinderGeometry(1.4, 1.4, 1, 12);
    const liquidMat = new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.75, metalness: 0.1, flatShading: true });
    const liquid = new THREE.Mesh(liquidGeo, liquidMat);
    // 移除初始位置偏移，確保液體從真正底部開始
    liquid.name = 'liquid'; liquid.scale.set(0.98, 0.01, 0.98); liquid.position.y = 0.01;
    group.add(liquid);
    const powderGeo = new THREE.CylinderGeometry(1.3, 0.4, 0.1, 12);
    const powderMat = new THREE.MeshStandardMaterial({ color: 0x5a3820, roughness: 0.75, metalness: 0.1, flatShading: true });
    const powder = new THREE.Mesh(powderGeo, powderMat);
    powder.name = 'powder'; powder.position.y = 3;
    group.add(powder);

    group.scale.set(1.25, 1.25, 1.25); // 整體濾杯組放大
    this.scene.add(group);
    this.dripperSets[id] = group;
  }

  private decorations: THREE.Mesh[] = [];
  private initDecorations() {
    const geometries = [new THREE.BoxGeometry(1, 1, 1), new THREE.CylinderGeometry(0.5, 0.5, 1, 6), new THREE.OctahedronGeometry(0.7)];
    const colors = [0xFF5252, 0x42A5F5, 0xFFCA28, 0x66BB6A];
    for (let i = 0; i < 12; i++) {
      const geo = geometries[Math.floor(Math.random() * geometries.length)];
      const mat = new THREE.MeshStandardMaterial({ color: colors[Math.floor(Math.random() * colors.length)], roughness: 0.75, metalness: 0.1, flatShading: true, transparent: true, opacity: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((Math.random() - 0.5) * 40, Math.random() * 20 + 5, (Math.random() - 0.5) * 10 - 5);
      mesh.rotation.set(Math.random(), Math.random(), Math.random());
      mesh.castShadow = true; this.scene.add(mesh); this.decorations.push(mesh);
    }
  }

  private waterStream!: THREE.Mesh;
  private initWaterStream() {
    const geo = new THREE.CylinderGeometry(0.05, 0.05, 25, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, roughness: 0.75, metalness: 0.1 });
    this.waterStream = new THREE.Mesh(geo, mat);
    this.waterStream.visible = false; this.scene.add(this.waterStream);
  }

  private kettle!: THREE.Group;
  private initKettle() {
    this.kettle = new THREE.Group();
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xCFD8DC, metalness: 0.4, roughness: 0.9, flatShading: true });
    const darkSilverMat = new THREE.MeshStandardMaterial({ color: 0x90A4AE, metalness: 0.1, roughness: 1.0, flatShading: true });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xFFD54F, metalness: 0.3, roughness: 0.8 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xA1887F, roughness: 0.9, flatShading: true });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.6, 8), darkSilverMat);
    base.position.y = -1.2; base.castShadow = true; this.kettle.add(base);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.2, 2.8, 8), silverMat);
    body.castShadow = true; this.kettle.add(body);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.3, 0.4, 8), silverMat);
    lid.position.y = 1.6; this.kettle.add(lid);
    const knob = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), goldMat);
    knob.position.y = 1.95; this.kettle.add(knob);
    const spoutPath = new THREE.CatmullRomCurve3([new THREE.Vector3(-1.2, -0.5, 0), new THREE.Vector3(-2.8, 0, 0), new THREE.Vector3(-3.5, 1.8, 0), new THREE.Vector3(-3.8, 2.5, 0)]);
    this.kettle.add(new THREE.Mesh(new THREE.TubeGeometry(spoutPath, 24, 0.15, 8, false), silverMat));
    const handleGroup = new THREE.Group();
    const joint = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.4), goldMat); joint.position.set(1.4, 1.2, 0); handleGroup.add(joint);
    const h1 = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 0.5), woodMat); h1.position.set(2.8, 1.2, 0); h1.rotation.z = -0.3; handleGroup.add(h1);
    const h2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.5, 0.5), woodMat); h2.position.set(4.2, -0.2, 0); h2.rotation.z = -0.1; handleGroup.add(h2);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.6), goldMat); cap.position.set(4.35, -1.9, 0); handleGroup.add(cap);
    this.kettle.add(handleGroup);
    this.kettle.scale.set(1.15, 1.15, 1.15); // 手沖壺放大: 0.9 -> 1.15
    this.kettle.position.set(0, 10, 0); this.kettle.visible = false;
    this.scene.add(this.kettle);
  }

  public get3DPosition(mouseX: number, mouseY: number): { x: number, y: number, z: number } {
    this.mouseNDC.x = (mouseX / window.innerWidth) * 2 - 1;
    this.mouseNDC.y = -(mouseY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const target = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -11), target);
    return { x: target.x, y: target.y, z: target.z };
  }

  public updateKettle(pos: { x: number, y: number, z: number }, isPouring: boolean) {
    this.kettle.visible = true;
    this.kettle.position.set(pos.x, pos.y, pos.z);
    const targetRotZ = isPouring ? 0.3 : 0; this.kettle.rotation.z += (targetRotZ - this.kettle.rotation.z) * 0.1;
    this.waterStream.visible = isPouring;
    if (isPouring) {
      // 壺嘴位移調整: 因為縮放增加，偏移也需從 3.4 增加到約 4.4
      const worldPos = new THREE.Vector3(-4.4, 2.8, 0).applyQuaternion(this.kettle.quaternion).add(this.kettle.position);
      this.waterStream.position.copy(worldPos); this.waterStream.position.y -= 12.5;
    }
  }

  public getKettleSpoutX(): number { return this.kettle.position.x - 4.4; }
  public getCupX(id: number): number { return this.dripperSets[id]?.position.x || 0; }
  public updateCup(id: number, weightRatio: number, isPouring: boolean) {
    const group = this.dripperSets[id]; if (!group) return;
    const liquid = group.getObjectByName('liquid');
    if (liquid) {
      const maxFullHeight = 2.4;
      const targetScaleY = Math.max(0.01, weightRatio * maxFullHeight);
      liquid.scale.y = targetScaleY;
      // 修正位置：讓液體底部固定在 y=0，隨著 scale 增加向上生長
      // 圓柱體原點在中心，所以 position.y 應為高度的一半
      liquid.position.y = targetScaleY / 2;
    }

    // 濾杯發光反饋
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh && obj.name !== 'liquid' && (obj as THREE.Mesh).material) {
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat.emissive) {
          if (isPouring) {
            mat.emissive.setHex(0xFFE082); // 淡淡的暖金色
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

  private onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight; const d = 14;
    this.camera.left = -d * aspect; this.camera.right = d * aspect; this.camera.top = d; this.camera.bottom = -d;
    this.camera.lookAt(this.cameraTarget);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight); this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  public render() {
    const time = performance.now() * 0.001;
    this.decorations.forEach((m, i) => { m.position.y += Math.sin(time + i) * 0.005; m.rotation.x += 0.005; m.rotation.y += 0.005; });
    this.composer.render();
  }

  private uiSignboard!: THREE.Mesh;
  private uiCanvas!: HTMLCanvasElement;
  private uiContext!: CanvasRenderingContext2D;
  private uiTexture!: THREE.CanvasTexture;

  private init3DUI() {
    this.uiCanvas = document.createElement('canvas'); this.uiCanvas.width = 512; this.uiCanvas.height = 128; this.uiContext = this.uiCanvas.getContext('2d')!;
    this.uiTexture = new THREE.CanvasTexture(this.uiCanvas);
    const uiGeo = new THREE.PlaneGeometry(8, 2);
    const uiMat = new THREE.MeshStandardMaterial({
      map: this.uiTexture,
      transparent: true,
      roughness: 0.9,
      metalness: 0.1,
      emissive: 0x0D47A1, // 改用深藍色，降低亮度
      emissiveIntensity: 0.05 // 大幅降低自發光強度避免過曝
    });
    this.uiSignboard = new THREE.Mesh(uiGeo, uiMat);
    this.uiSignboard.position.set(0, 12, -8); this.scene.add(this.uiSignboard);
  }

  public update3DUI(time: string, weight: string) {
    const ctx = this.uiContext; if (!ctx) return;
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(0, 0, 512, 128);
    ctx.font = '32px "Silkscreen"';
    ctx.fillStyle = '#263238';
    ctx.textAlign = 'center';
    ctx.fillText(`${time}  |  ${weight}`, 256, 80);
    this.uiTexture.needsUpdate = true;
  }

  public updateInstruction(id: number, instruction: string, subText: string, isHint: boolean) { this.instructionSigns[id]?.update(instruction, subText, isHint); }
  public updateScale(id: number, weight: number) { this.scales[id]?.update(weight); }
  public setUIVisibility(visible: boolean) {
    this.instructionSigns.forEach(s => s.group.visible = visible); this.scales.forEach(s => s.mesh.visible = visible);
  }

  public showMenu() { } // Three.js 暫時不實作選單，由 Pixi 處理
  public startGame() { }

  public show() {
    this.container.classList.remove('hidden');
  }

  public hide() {
    this.container.classList.add('hidden');
  }
}

