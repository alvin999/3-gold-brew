import './style.css'
import { ThreeScene } from './scene/ThreeScene';
import { PixiScene } from './pixi-scene'

const AppState = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  FINISHED: 'FINISHED'
} as const;

type AppState = typeof AppState[keyof typeof AppState];

// 移除未使用的 PourStage 引用

class Cup {
  public name: string;
  public index: number;
  public currentWeight: number = 0;
  public targetTotalWeight: number;
  public stages: any[] = [];
  public currentStageIndex: number = 0;
  public startTime: number | null = null;
  public delayStart: number = 0; 
  public isFinished: boolean = false;
  public mode: '自由模式' | '練習模式' | '遊戲模式' = '自由模式';
  public stageErrors: { weightError: number; timeError: number }[] = [];
  private lastRecordedStageIndex: number = -1;
  private manualStartTime: number | null = null;

  public displayIndex: number; // 使用者看到的杯號 (1-based)

  constructor(name: string, index: number, targetTotalWeight: number, stages: any[], delayStart: number, displayIndex: number = 0) {
    this.name = name;
    this.index = index;
    this.targetTotalWeight = targetTotalWeight;
    this.stages = stages;
    this.delayStart = delayStart;
    this.displayIndex = displayIndex;
  }

  start() {
  }

  update(currentTime: number, gameStartTime: number) {
    if (this.isFinished) return;
    
    if (this.mode === '自由模式') {
      if (!this.manualStartTime) {
        game.threeScene.updateScale(this.index, this.currentWeight, "00:00");
        return;
      }
      const localElapsed = Math.floor((currentTime - this.manualStartTime) / 1000);
      const m = Math.floor(localElapsed / 60).toString().padStart(2, '0');
      const s = (localElapsed % 60).toString().padStart(2, '0');
      const timeStr = `${m}:${s}`;
      game.threeScene.updateScale(this.index, this.currentWeight, timeStr);
      return;
    }

    const elapsedTotal = gameStartTime === 0 ? 0 : Math.floor((currentTime - gameStartTime) / 1000);
    const localElapsed = Math.max(0, elapsedTotal - this.delayStart);
    
    const m = Math.floor(localElapsed / 60).toString().padStart(2, '0');
    const s = (localElapsed % 60).toString().padStart(2, '0');
    const timeStr = `${m}:${s}`;

    let instruction = "準備中";
    let subText = `計時 ${timeStr}`;
    let isHint = false;

    if (elapsedTotal < this.delayStart) {
      instruction = "準備中...";
      subText = `預計 ${this.delayStart}s 開始`;
    } else {
      if (!this.startTime) this.startTime = currentTime;
      
      const nextStage = this.stages[this.currentStageIndex];

      // 遊戲模式：自動記錄重量誤差 (若時間已到)
      if (this.mode === '遊戲模式' && gameStartTime > 0) {
          const elapsedTotal = Math.floor((currentTime - gameStartTime) / 1000);
          this.stages.forEach((stage, idx) => {
            const endTime = (idx + 1 < this.stages.length) ? this.stages[idx+1].timeLimit : (stage.timeLimit + 30);
            if (elapsedTotal >= endTime && this.lastRecordedStageIndex < idx) {
              const weightError = Math.abs(this.currentWeight - stage.targetWeight);
              if (!this.stageErrors[idx]) {
                this.stageErrors[idx] = { weightError: weightError, timeError: 30 };
              } else {
                this.stageErrors[idx].weightError = weightError;
              }
              this.lastRecordedStageIndex = idx;
            }
          });
      }

      if (nextStage) {
        const remainingWeight = Math.max(0, nextStage.targetWeight - this.currentWeight);
        const stageStartTime = nextStage.timeLimit; 
        
        instruction = `${nextStage.label}: ${Math.floor(nextStage.targetWeight)}g`;
        
        if (elapsedTotal < stageStartTime) {
          instruction = `等待中 (${nextStage.label})`;
          subText = `剩餘 ${stageStartTime - elapsedTotal}s`;
        } else {
          subText = `剩餘 ${Math.floor(remainingWeight)}g`;
          isHint = remainingWeight > 0.5;
        }
      } else {
        instruction = "沖煮完成";
        subText = "享用咖啡";
        if (this.currentWeight >= this.targetTotalWeight - 1) {
          if (!this.isFinished && this.mode === '遊戲模式') {
             this.recordFinalStageError();
          }
          this.isFinished = true;
        }
      }
    }
    
    game.threeScene.updateScale(this.index, this.currentWeight, timeStr);
    game.threeScene.updateInstruction(this.index, instruction, subText, isHint);
  }

  pour(amount: number) {
    if (this.isFinished) return;
    
    if (this.mode === '自由模式' && !this.manualStartTime) {
      this.manualStartTime = Date.now();
    }
    
    this.currentWeight += amount;
    
    const nextStage = this.stages[this.currentStageIndex];
    if (nextStage && this.currentWeight >= nextStage.targetWeight - 0.1) {
      if (this.mode === '遊戲模式' && game.gameStartTime > 0) {
        const now = Date.now();
        const elapsedTotal = Math.floor((now - game.gameStartTime) / 1000);
        const targetTime = (this.currentStageIndex + 1 < this.stages.length) ? this.stages[this.currentStageIndex + 1].timeLimit : (nextStage.timeLimit + 30);
        const timeError = Math.abs(elapsedTotal - targetTime);
        if (!this.stageErrors[this.currentStageIndex]) {
          this.stageErrors[this.currentStageIndex] = { weightError: 0, timeError: timeError };
        } else {
          this.stageErrors[this.currentStageIndex].timeError = timeError;
        }
        console.log(`Game: Stage ${this.currentStageIndex} reached weight. Time Error: ${timeError}s`);
      }
      this.currentStageIndex++;
    }
  }

  recordFinalStageError() {
     // 確保最後一階段也有紀錄
     const idx = this.stages.length - 1;
     if (idx >= 0 && this.lastRecordedStageIndex < idx) {
        const stage = this.stages[idx];
        const weightError = Math.abs(this.currentWeight - stage.targetWeight);
        if (!this.stageErrors[idx]) {
          this.stageErrors[idx] = { weightError: weightError, timeError: 0 };
        } else {
          this.stageErrors[idx].weightError = weightError;
        }
        this.lastRecordedStageIndex = idx;
     }
  }
}

class Game {
  state: AppState = AppState.MENU;
  cups: Cup[] = [];
  activeCupIndex: number = 1;
  gameStartTime: number = 0;
  isPouring: boolean = false;
  cachedRecipeStages: any[] = [];
  
  threeScene: ThreeScene;
  pixiScene: PixiScene;
  
  activeRenderer: 'three' = 'three'; 
  public pourSpeed: number = 0.5;


  mouseX: number = 0;
  mouseY: number = 0;

  brewStartOverlay: HTMLElement | null = null;
  brewStartBtn: HTMLElement | null = null;

  constructor() {
    this.threeScene = new ThreeScene('three-container');
    this.pixiScene = new PixiScene('pixi-container');
    this.init();
  }

  async init() {
    await this.pixiScene.init();
    this.setupListeners();
    this.showMenu();
    this.animate();
  }

  setupListeners() {
    // 註冊 PixiJS 選單事件
    this.pixiScene.gameMenu.onSettings = () => {
      const visible = this.pixiScene.toggleCalculator();
      const toggleCalcBtn = document.getElementById('toggle-calc-btn');
      if (toggleCalcBtn) toggleCalcBtn.classList.toggle('active', visible);

      // [修正] 如果開啟了設定面板，隱藏 HTML 的啟動蓋板避免擋住 Pixi 交互
      // 只有在遊戲尚未真正開始 (gameStartTime === 0) 且處於準備階段時才需要處理
      if (this.state === AppState.PLAYING && this.gameStartTime === 0) {
        if (visible) {
          if (this.brewStartOverlay) this.brewStartOverlay.classList.add('hidden');
        } else {
          // 關閉面板後，如果還沒開始遊戲，就把蓋板帶回來
          const p = this.threeScene.guiParams?.calculator;
          if (p && (p.mode === '練習模式' || p.mode === '遊戲模式')) {
            if (this.brewStartOverlay) this.brewStartOverlay.classList.remove('hidden');
          }
        }
      }
    };

    this.pixiScene.gameMenu.onRestart = () => {
      this.restartGame();
    };

    this.pixiScene.gameMenu.onHome = () => {
      window.location.reload();
    };

    const canvas = this.threeScene.getRendererCanvas();
    if (canvas) {
      canvas.addEventListener('pointerdown', (e) => {
        if (e.button === 0) {
          if (this.state === AppState.PLAYING) {
            // 計算模式下，若尚未點擊 START 開始計時則禁止注水
            const p = this.threeScene.guiParams?.calculator;
            if (p && (p.mode === '練習模式' || p.mode === '遊戲模式') && this.gameStartTime === 0) {
              return;
            }
            this.isPouring = true;
            e.preventDefault();
          }
        }
      });

      canvas.addEventListener('pointerup', () => {
        this.isPouring = false;
      });
    }

    const toggleCalcBtn = document.getElementById('toggle-calc-btn');
    if (toggleCalcBtn) {
      toggleCalcBtn.addEventListener('click', () => {
        const visible = this.pixiScene.toggleCalculator();
        toggleCalcBtn.classList.toggle('active', visible);
      });
    }

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

    const viewBtns = document.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = (btn as HTMLElement).dataset.view;
        const isFree = btn.id === 'free-view-btn';
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.threeScene.guiParams) {
          if (isFree) {
            this.threeScene.guiParams.camera.mode = 'Free';
            this.threeScene.updateCamera(this.threeScene.guiParams.camera);
          } else if (view) {
            this.threeScene.applyCameraPreset(view);
          }
        }
      });
    });

    this.brewStartOverlay = document.getElementById('brew-start-overlay');
    this.brewStartBtn = document.getElementById('brew-start-btn');
    if (this.brewStartBtn) {
      this.brewStartBtn.addEventListener('click', () => {
        this.startSimulation();
      });
    }
  }

  restartGame() {
    console.log("Game: restartGame() called - Resetting session in-place");
    this.gameStartTime = 0;
    this.isPouring = false;
    
    // 重新套用配方，這會重設所有杯子的狀態
    this.applyCalculatorRecipe();
    
    // 重新進入準備啟動狀態
    const p = this.threeScene.guiParams?.calculator;
    if (p && (p.mode === '練習模式' || p.mode === '遊戲模式')) {
      if (this.brewStartOverlay) this.brewStartOverlay.classList.remove('hidden');
    } else {
      this.startSimulation();
    }
    
    this.threeScene.update3DUI("00:00", "0.0g", "準備開始");
  }
  showMenu() {
    this.state = AppState.MENU;
    document.getElementById('pixi-container')!.classList.remove('hidden');
    document.getElementById('three-container')!.classList.remove('hidden'); 
    document.getElementById('game-hud')!.classList.add('hidden'); 
    document.getElementById('view-selector')!.classList.add('hidden');
    this.pixiScene.showMenu();
    this.pixiScene.gameMenu.container.visible = false;
    if (this.brewStartOverlay) this.brewStartOverlay.classList.add('hidden');
    this.threeScene.applyCameraPreset('廣角全景'); 
  }

  startGame() {
    console.log("Game: startGame() called - Transitioning to PLAYING (Scene Ready)");
    this.state = AppState.PLAYING;
    this.gameStartTime = 0; 
    
    document.getElementById('game-hud')!.classList.remove('hidden');
    document.getElementById('view-selector')!.classList.remove('hidden');
    document.getElementById('pixi-container')!.classList.remove('hidden');
    document.getElementById('three-container')!.classList.remove('hidden'); 

    this.threeScene.show();
    this.threeScene.startGame(); // 切換背景與相機
    this.pixiScene.startGame(); // 隱藏 2D 入口
    this.pixiScene.gameMenu.container.visible = true;
    
    this.threeScene.applyCameraPreset('職人視角');
    this.applyCalculatorRecipe();

    // 只有在練習或遊戲模式才顯示開始按鈕
    const p = this.threeScene.guiParams?.calculator;
    if (p && (p.mode === '練習模式' || p.mode === '遊戲模式')) {
      if (this.brewStartOverlay) this.brewStartOverlay.classList.remove('hidden');
    } else {
      // 自由模式直接開始計時
      this.startSimulation();
    }
  }

  startSimulation() {
    if (this.state !== AppState.PLAYING || this.gameStartTime > 0) return;
    
    console.log("Game: startSimulation() called - Timer STARTED");
    this.gameStartTime = Date.now();
    
    if (this.brewStartOverlay) {
       this.brewStartOverlay.classList.add('hidden');
    }
    
    // 這裡可以播放啟動音效或是開始引導
    this.threeScene.updateInstruction(1, "START!", "開始沖煮", true);
  }

  applyCalculatorRecipe() {
    // 移除自動開始計時，真正的啟動交給 3D 按鈕
    const p = this.threeScene.guiParams.calculator;
    if (!p) return;

    this.threeScene.setDripperCount(p.cupCount || 3);

    if (p.mode === '自由模式') {
      this.threeScene.setDripperCount(p.cupCount || 3, true); 
      this.cups = [];
      for (let i = 0; i < 3; i++) {
        const c = new Cup(`free-cup-${i+1}`, i, 9999, [], 0, i + 1);
        c.mode = '自由模式';
        this.cups.push(c);
      }
      
      this.pixiScene.gameMenu.setFreeMode(true);
      
      let cumulativeWeight = 0;
      let cumulativeTime = 0;
      this.cachedRecipeStages = p.stages.map((s: any) => {
          cumulativeWeight += p.powder * s.ratio;
          cumulativeTime += s.time;
          return {
              label: s.label,
              targetWeight: cumulativeWeight,
              endTime: cumulativeTime
          };
      });
      
      const totalRatio = p.stages.reduce((acc: number, s: any) => acc + s.ratio, 0);
      
      this.pixiScene.setRecipeNoteVisibility(true);
      this.pixiScene.recipeNote.updateRecipe(p.powder, totalRatio, this.cachedRecipeStages);
      
      // 隱藏 3D 看板，改用 2D 小抄
      this.threeScene.setHUDVisibility(false);
      return;
    }

    // 非自由模式，隱藏 2D 小抄與標籤
    this.pixiScene.setRecipeNoteVisibility(false);
    this.pixiScene.gameMenu.setFreeMode(false);

    const stages = p.stages.map((s: any, idx: number) => {
      let startTime = 0;
      for (let j = 0; j < idx; j++) {
        startTime += p.stages[j].time;
      }
      return { ratio: s.ratio, timeLimit: startTime, label: s.label };
    });
    
    let currentWeight = 0;
    const finalStages = stages.map((s: any) => {
      currentWeight += p.powder * s.ratio;
      return { targetWeight: currentWeight, timeLimit: s.timeLimit, label: s.label };
    });

    const cupCount = p.cupCount;
    // 間隔時間：以悶蒸時間為基準進行交錯
    const stagger = (p.bloomTime || 30) / cupCount;

    this.cups = [];
    for (let i = 0; i < 3; i++) {
      let isVisible = false;
      let staggerIndex = 0;

      if (cupCount === 1) {
          if (i === 1) { isVisible = true; staggerIndex = 0; }
      } else if (cupCount === 2) {
          if (i === 0) { isVisible = true; staggerIndex = 0; }
          if (i === 2) { isVisible = true; staggerIndex = 1; }
      } else {
          isVisible = true;
          staggerIndex = i;
      }

      if (isVisible) {
          const cupStages = finalStages.map((s: any) => ({ ...s, timeLimit: s.timeLimit + (staggerIndex * stagger) }));
          const total = cupStages[cupStages.length - 1].targetWeight;
          const cup = new Cup(`cup-${i+1}`, i, total, cupStages, staggerIndex * stagger, staggerIndex + 1);
          cup.mode = p.mode;
          this.cups.push(cup);
      } else {
          this.cups.push(new Cup(`inactive-cup-${i+1}`, i, 0, [], 99999, 0));
          this.threeScene.updateCup(i, 0, false);
      }
    }

    // 更新選單中的自由模式顯示
    this.pixiScene.gameMenu.setFreeMode(p.mode === '自由模式');
  }

  animate() {
    this.update();
    requestAnimationFrame(() => this.animate());
  }

  update() {
    const now = Date.now();
    
    if (this.state === AppState.MENU) {
      this.pixiScene.render();
    } else if (this.state === AppState.PLAYING) {
      const elapsed = this.gameStartTime === 0 ? 0 : Math.floor((now - this.gameStartTime) / 1000);
      const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const s = (elapsed % 60).toString().padStart(2, '0');
      const timeStr = `${m}:${s}`;

      const worldPos = this.threeScene.get3DPosition(this.mouseX, this.mouseY);
      const totalWeight = this.cups.reduce((acc, c) => acc + c.currentWeight, 0).toFixed(1);

      // 計算推薦沖煮杯數
      let recommendation = "";
      const p = this.threeScene.guiParams.calculator;
      if (p && (p.mode === '練習模式' || p.mode === '遊戲模式')) {
        const needsPour = this.cups.find(c => {
          const stage = c.stages[c.currentStageIndex];
          if (!stage) return false;
          const elapsedTotal = Math.floor((now - this.gameStartTime) / 1000);
          return elapsedTotal >= stage.timeLimit && c.currentWeight < stage.targetWeight - 0.5;
        });

        if (needsPour) {
          recommendation = `請沖煮第 ${needsPour.displayIndex} 杯`;
        } else {
          // 尋找下一個即將開始的杯次
          const nextStarting = this.cups.find(c => {
            const stage = c.stages[c.currentStageIndex];
            if (!stage) return false;
            const elapsedTotal = Math.floor((now - this.gameStartTime) / 1000);
            return elapsedTotal < stage.timeLimit;
          });
          if (nextStarting && nextStarting.displayIndex > 0) {
            const stage = nextStarting.stages[nextStarting.currentStageIndex];
            const waitTime = Math.max(0, stage.timeLimit - Math.floor((now - this.gameStartTime) / 1000));
            recommendation = `等待第 ${nextStarting.displayIndex} 杯 (${waitTime}s)`;
          } else {
            recommendation = "沖煮流程結束";
          }
        }
      }

      this.threeScene.updateKettle(worldPos, this.isPouring);

      const spoutWorldPos = this.threeScene.getSpoutWorldPos();
      const hitCupId = this.threeScene.getHitCup(spoutWorldPos);

      // 檢查遊戲結束顯示總分
      if (p && p.mode === '遊戲模式' && this.cups.length > 0 && this.cups.every(c => c.isFinished)) {
          let totalWeightError = 0;
          let totalTimeError = 0;
          this.cups.forEach(c => {
            c.stageErrors.forEach(err => {
              if (err) {
                totalWeightError += err.weightError;
                totalTimeError += err.timeError;
              }
            });
          });
          const score = Math.max(0, Math.floor(100 - (totalWeightError * 2.0) - (totalTimeError * 1.0)));
          this.threeScene.update3DUI(timeStr, `SCORE: ${score}`, "沖煮結束！請品嚐");
      } else if (p && p.mode !== '自由模式') {
          this.threeScene.update3DUI(timeStr, `${totalWeight}g`, recommendation);
      } else if (p && p.mode === '自由模式') {
          // 自由模式下不再更新 3D 看板的小抄，改用 2D 便利貼
          // 如果需要顯示即時體重/時間，可以在便利貼中新增
      }

      this.cups.forEach((cup, i) => {
        const isCurrentlyPouring = this.isPouring && (hitCupId === i);
        if (isCurrentlyPouring) {
          cup.pour(this.pourSpeed);
          if (now % 100 < 20) console.log(`Game: Pouring into Cup ${i}, current weight: ${cup.currentWeight}`);
        }
        cup.update(now, this.gameStartTime);

        // 判斷是否過量：若處於計算模式且超過當前應該達到的目標則發紅光
        let isOverLimit = false;
        const p = this.threeScene.guiParams.calculator;
        if (p && (p.mode === '練習模式' || p.mode === '遊戲模式') && this.gameStartTime > 0) {
          const elapsedTotal = Math.floor((now - this.gameStartTime) / 1000);
          const nextStage = cup.stages[cup.currentStageIndex];
          
          if (nextStage) {
            if (elapsedTotal < nextStage.timeLimit) {
              // 處於等待期 (正在等待上一段的水滴乾或悶蒸時間到)
              // 此時若重量已超過上一段的目標，則為過量
              if (cup.currentStageIndex > 0) {
                const prevStage = cup.stages[cup.currentStageIndex - 1];
                if (cup.currentWeight > prevStage.targetWeight + 1.0) isOverLimit = true;
              }
            } else {
              // 處於目前這一段的注水期
              // 如果注超過這段的目標，則為過量
              if (cup.currentWeight > nextStage.targetWeight + 1.0) isOverLimit = true;
            }
          } else {
            // 所有階段已結束，檢查最終總量
            if (cup.currentWeight > cup.targetTotalWeight + 1.0) isOverLimit = true;
          }
        }

        this.threeScene.updateCup(i, cup.targetTotalWeight > 0 ? cup.currentWeight / cup.targetTotalWeight : 0, isCurrentlyPouring, isOverLimit);
      });

      if (this.cups.every(c => c.isFinished)) {
        console.log("Game: All cups finished");
      }
      // 核心循環：僅更新 3D 場景
      this.threeScene.render();
    }
  }
}


const game = new Game();
(window as any).game = game;
