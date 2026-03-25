import './style.css'
import { ThreeScene } from './three-scene'
import { PixiScene } from './pixi-scene'

const AppState = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  FINISHED: 'FINISHED'
} as const;

type AppState = typeof AppState[keyof typeof AppState];

interface PourStage {
  targetWeight: number;
  timeLimit: number;
}

class Cup {
  id: string;
  index: number;
  currentWeight: number = 0;
  targetTotalWeight: number;
  bloomTime: number;
  startTime: number | null = null;
  isFinished: boolean = false;
  stages: PourStage[] = [];
  currentStageIndex: number = 0;

  constructor(id: string, index: number, totalWeight: number, bloomTime: number, stageCount: number) {
    this.id = id;
    this.index = index;
    this.targetTotalWeight = totalWeight;
    this.bloomTime = bloomTime;
    
    // 初始化段落
    const weightPerStage = (totalWeight - 30) / (stageCount - 1);
    this.stages.push({ targetWeight: 30, timeLimit: bloomTime });
    for (let i = 1; i < stageCount; i++) {
      this.stages.push({ 
        targetWeight: 30 + (weightPerStage * i), 
        timeLimit: bloomTime + (i * 45)
      });
    }
  }

  start() {
    this.startTime = Date.now();
  }

  update(currentTime: number) {
    if (!this.startTime || this.isFinished) return;
    
    const elapsed = Math.floor((currentTime - this.startTime) / 1000);
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    const timeStr = `${m}:${s}`;

    const nextStage = this.stages[this.currentStageIndex];
    let instruction = "請稍候...";
    let subText = `計時 ${timeStr}`;
    let isHint = false;

    if (nextStage) {
      const remainingWeight = Math.max(0, nextStage.targetWeight - this.currentWeight);
      if (this.currentStageIndex === 0) {
        instruction = "浸潤中: 30g";
        subText = elapsed < this.bloomTime ? `剩餘 ${this.bloomTime - elapsed}s` : "準備下一段";
      } else {
        instruction = `注入至 ${Math.floor(nextStage.targetWeight)}g`;
        subText = `剩餘 ${Math.floor(remainingWeight)}g`;
      }
      isHint = !!(elapsed >= nextStage.timeLimit - 5 && this.currentWeight < nextStage.targetWeight);
    } else {
      instruction = "沖煮完成";
      subText = "享用咖啡";
    }
    
    // 更新渲染場景
    const game = (window as any).game;
    const scene = game.activeScene;
    scene.updateScale(this.index, this.currentWeight);
    scene.updateInstruction(this.index, instruction, subText, isHint);

    if (this.currentWeight >= this.targetTotalWeight - 1) {
      this.isFinished = true;
    }
  }

  pour(amount: number) {
    if (this.isFinished) return;
    this.currentWeight += amount;
    if (this.currentWeight > this.targetTotalWeight) {
      this.currentWeight = this.targetTotalWeight;
    }

    const nextStage = this.stages[this.currentStageIndex];
    if (nextStage && this.currentWeight >= nextStage.targetWeight) {
      this.currentStageIndex++;
    }
  }
}

class Game {
  state: AppState = AppState.MENU;
  cups: Cup[] = [];
  activeCupIndex: number = 1;
  gameStartTime: number = 0;
  isPouring: boolean = false;
  
  threeScene: ThreeScene;
  pixiScene: PixiScene;
  
  activeRenderer: 'three' | 'pixi' = 'three'; // 預設使用 Three.js 以便觀察調試工具
  public pourSpeed: number = 0.5; // 由 Leva 控制


  mouseX: number = 0;
  mouseY: number = 0;

  constructor() {
    this.threeScene = new ThreeScene('three-container');
    this.pixiScene = new PixiScene('pixi-container');
    
    this.init();
  }

  async init() {
    await this.pixiScene.init();
    this.setupListeners();
    this.showMenu();
    requestAnimationFrame(() => this.update());
  }

  get activeScene() {
    return this.activeRenderer === 'three' ? this.threeScene : this.pixiScene;
  }

  setupListeners() {
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      // 純粹重新載入遊戲，不碰快取
      window.location.reload();
    });

    const clearBtn = document.getElementById('clear-cache-btn');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      if (confirm("確定要清除所有 Theater.js 與 Leva 的調試快取嗎？（會重新載入頁面）")) {
        localStorage.clear();
        window.location.reload();
      }
    });
    
    const toggleBtn = document.getElementById('toggle-engine-btn');
    if (toggleBtn) {

    toggleBtn.innerText = this.activeRenderer === 'three' ? 'SWITCH TO PIXI' : 'SWITCH TO THREE';
    
    toggleBtn.addEventListener('click', () => {
      this.activeRenderer = this.activeRenderer === 'three' ? 'pixi' : 'three';
      toggleBtn.textContent = this.activeRenderer === 'three' ? 'SWITCH TO PIXI' : 'SWITCH TO THREE';
      
      // 僅在遊戲進行中才切換場景容器；選單狀態下固定顯示 Pixi
      if (this.state === AppState.PLAYING) {
        if (this.activeRenderer === 'three') {
          this.threeScene.show();
          this.pixiScene.hide();
        } else {
          this.threeScene.hide();
          this.pixiScene.show();
          this.pixiScene.startGame();
        }
      }
    });

    }

    window.addEventListener('mousedown', () => {

      if (this.state !== AppState.PLAYING) return;
      this.isPouring = true;
    });

    window.addEventListener('mouseup', () => {
      this.isPouring = false;
    });

    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    window.addEventListener('keydown', (e) => {
      if (this.state !== AppState.PLAYING) return;
      if (e.key.toLowerCase() === 'a') this.activeCupIndex = 0;
      if (e.key.toLowerCase() === 's') this.activeCupIndex = 1;
      if (e.key.toLowerCase() === 'd') this.activeCupIndex = 2;
    });
  }

  showMenu() {
    this.state = AppState.MENU;
    // 重置容器：選單固定使用 Pixi
    document.getElementById('pixi-container')!.classList.remove('hidden');
    document.getElementById('three-container')!.classList.add('hidden');
    document.getElementById('game-hud')!.classList.add('hidden');
    
    this.pixiScene.showMenu();
  }

  startGame() {
    console.log("Game: startGame called");
    this.state = AppState.PLAYING;
    this.gameStartTime = Date.now();
    
    // 顯示 HUD
    document.getElementById('game-hud')!.classList.remove('hidden');
    
    // 根據 activeRenderer 切換遊戲容器
    if (this.activeRenderer === 'three') {
      this.threeScene.show();
      this.pixiScene.hide();
      this.threeScene.startGame();
    } else {
      this.threeScene.hide();
      this.pixiScene.show();
      this.pixiScene.startGame();
    }
    console.log("Game: Renderer and Game state initialized");


    
    // 初始化遊戲數值 (預設值)
    const total = 225;
    const bloom = 30;
    const stages = 3;
    
    this.cups = [
      new Cup('cup-1', 0, total, bloom, stages),
      new Cup('cup-2', 1, total, bloom, stages),
      new Cup('cup-3', 2, total, bloom, stages)
    ];

    this.gameStartTime = Date.now();
    this.cups.forEach(c => c.start());
    
    // 顯示 3D 內原本的門面 (指令牌與電子秤)
    console.log("Game: Initializing 3D UI Visibility");
    this.threeScene.setUIVisibility(true);
    this.pixiScene.setUIVisibility(true);
    console.log("Game: StartGame finished");
  }


  update() {
    const now = Date.now();
    
    if (this.state === AppState.MENU) {
      this.pixiScene.render();
    } else if (this.state === AppState.PLAYING) {
      // 總時間 (同步至 UI)
      const elapsed = Math.floor((now - this.gameStartTime) / 1000);
      const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const s = (elapsed % 60).toString().padStart(2, '0');
      const timeStr = `${m}:${s}`;

      const worldPos = this.activeScene.get3DPosition(this.mouseX, this.mouseY);
      const totalWeight = this.cups.reduce((acc, c) => acc + c.currentWeight, 0).toFixed(1);
      
      this.activeScene.update3DUI(timeStr, `${totalWeight}g`);
      this.activeScene.updateKettle(worldPos, this.isPouring);

      const spoutX = this.activeScene.getKettleSpoutX();

      this.cups.forEach((cup, i) => {
        const cupX = this.activeScene.getCupX(i);
        // 優化判別邏輯：直接依據與手沖壺的水平距離判定，不再受 activeCupIndex 限制
        // 且碰撞範圍由原本的模糊值改為更精確的 2.0 (單位)
        const isCurrentlyPouring = this.isPouring && Math.abs(spoutX - cupX) < 2.0; 
        
        if (isCurrentlyPouring) {
          cup.pour(this.pourSpeed);
        }
        
        cup.update(now);

        this.activeScene.updateCup(i, cup.currentWeight / cup.targetTotalWeight, isCurrentlyPouring);
      });

      if (this.cups.every(c => c.isFinished)) {
        console.log("Game: All cups finished");
      }
      this.activeScene.render();
    }

    requestAnimationFrame(() => this.update());
  }
}


const game = new Game();
(window as any).game = game;
