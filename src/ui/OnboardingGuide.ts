export class OnboardingGuide {
    private container: HTMLElement | null = null;
    private currentStep: number = 0;
    private storageKey = '3-gold-brew-onboarded';

    private steps = [
        {
            title: "☕ 歡迎使用 3-Gold-Brew",
            content: "這是一套極簡且科學的咖啡沖煮模擬器。讓我們花一分鐘了解基本操作，助您沖出一杯完美的金杯咖啡。"
        },
        {
            title: "🏺 手沖壺控制",
            content: "滑鼠移動即可控制壺口位置。<b>點擊並按住</b> 滑鼠左鍵即可開始注水。放開即停止。"
        },
        {
            title: "⚖️ 核心觀察：看秤",
            content: "<b>注水時請盯著電子秤 (Scale)</b>。確保水量精確達成當前階段的目標，這對風味穩定度至關重要。"
        },
        {
            title: "📋 核心觀察：看板",
            content: "<b>注水暫停/結束後請看 3D 看板 (HUD)</b>。它會顯示下一階段的剩餘秒數、剩餘水量與具體的動作建議。"
        },
        {
            title: "📊 數據分析",
            content: "在『遊戲模式』結束後，我們會提供專業的時間-流速曲線圖，協助您檢視每一杯注水的穩定性與一致性。"
        },
        {
            title: "✨ 準備好了嗎？",
            content: "您隨時可以點擊選單中的『？』圖示重新開啟導覽。祝您沖煮愉快！"
        }
    ];

    constructor() {
        this.injectStyles();
    }

    public isFirstTime(): boolean {
        return !localStorage.getItem(this.storageKey);
    }

    public start(force: boolean = false) {
        if (!force && !this.isFirstTime()) return;
        
        this.currentStep = 0;
        this.render();
    }

    private injectStyles() {
        if (document.getElementById('onboarding-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'onboarding-styles';
        style.textContent = `
            .onboarding-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.4s ease;
                pointer-events: none;
            }
            .onboarding-overlay.active { 
                opacity: 1; 
                pointer-events: auto;
            }
            
            .onboarding-card {
                background: white;
                padding: 40px;
                border-radius: 24px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                max-width: 450px;
                width: 90%;
                text-align: center;
                transform: translateY(20px);
                transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                position: relative;
            }
            .onboarding-overlay.active .onboarding-card { transform: translateY(0); }
            
            .onboarding-title { margin: 0 0 16px; color: #1e1b4b; font-size: 24px; font-weight: 700; font-family: sans-serif; }
            .onboarding-content { color: #4b5563; line-height: 1.6; font-size: 16px; margin-bottom: 32px; min-height: 80px; font-family: sans-serif; text-align: left; }
            .onboarding-content b { color: #6366f1; }
            
            .onboarding-footer { display: flex; justify-content: space-between; align-items: center; }
            .onboarding-dots { display: flex; gap: 8px; }
            .onboarding-dot { width: 8px; height: 8px; border-radius: 50%; background: #e5e7eb; transition: background 0.3s; }
            .onboarding-dot.active { background: #6366f1; width: 24px; border-radius: 4px; }
            
            .onboarding-btn {
                background: #6366f1; color: white; border: none; padding: 12px 28px;
                border-radius: 12px; font-weight: 600; cursor: pointer;
                transition: transform 0.2s, background 0.2s;
            }
            .onboarding-btn:hover { background: #4f46e5; transform: scale(1.05); }
            .onboarding-btn:active { transform: scale(0.95); }
            
            .onboarding-close {
                position: absolute; top: 20px; right: 20px;
                background: none; border: none; font-size: 24px; cursor: pointer; color: #94a3b8;
            }
        `;
        document.head.appendChild(style);
    }

    private render() {
        if (this.container) {
            // 只更新內容而不銷毀整個容器以加速切換並保有 transition
            const step = this.steps[this.currentStep];
            const isLast = this.currentStep === this.steps.length - 1;
            
            const titleEl = this.container.querySelector('.onboarding-title');
            const contentEl = this.container.querySelector('.onboarding-content');
            const btnEl = this.container.querySelector('.onboarding-btn');
            const dotsEl = this.container.querySelector('.onboarding-dots');

            if (titleEl) titleEl.textContent = step.title;
            if (contentEl) contentEl.innerHTML = step.content;
            if (btnEl) btnEl.textContent = isLast ? '開始體驗' : '下一步';
            if (dotsEl) {
                dotsEl.innerHTML = this.steps.map((_, i) => `<div class="onboarding-dot ${i === this.currentStep ? 'active' : ''}"></div>`).join('');
            }
            return;
        }

        this.container = document.createElement('div');
        this.container.className = 'onboarding-overlay';
        
        const step = this.steps[this.currentStep];
        const isLast = this.currentStep === this.steps.length - 1;

        this.container.innerHTML = `
            <div class="onboarding-card">
                <button class="onboarding-close">×</button>
                <h1 class="onboarding-title">${step.title}</h1>
                <p class="onboarding-content">${step.content}</p>
                <div class="onboarding-footer">
                    <div class="onboarding-dots">
                        ${this.steps.map((_, i) => `<div class="onboarding-dot ${i === this.currentStep ? 'active' : ''}"></div>`).join('')}
                    </div>
                    <button class="onboarding-btn">${isLast ? '開始體驗' : '下一步'}</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.container);
        
        requestAnimationFrame(() => this.container?.classList.add('active'));

        this.container.querySelector('.onboarding-btn')?.addEventListener('click', () => this.next());
        this.container.querySelector('.onboarding-close')?.addEventListener('click', () => this.finish());
        
        const keyHandler = (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === 'ArrowRight') this.next();
            if (e.key === 'Escape') this.finish();
        };
        window.addEventListener('keydown', keyHandler);
        (this.container as any)._keyHandler = keyHandler;
    }

    private next() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.render();
        } else {
            this.finish();
        }
    }

    private finish() {
        if (!this.container) return;
        
        window.removeEventListener('keydown', (this.container as any)._keyHandler);
        this.container.classList.remove('active');
        localStorage.setItem(this.storageKey, 'true');
        
        setTimeout(() => {
            this.container?.remove();
            this.container = null;
        }, 400);
    }
}
