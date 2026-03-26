import * as PIXI from 'pixi.js';

export class Numpad {
    public container: PIXI.Container;
    private displayBg!: PIXI.Graphics;
    private displayText!: PIXI.Text;
    private currentInput: string = "";
    private callback: ((val: number) => void) | null = null;
    private onCancel: (() => void) | null = null;

    private readonly WIDTH = 320;
    private readonly HEIGHT = 560;
    private readonly BTN_SIZE = 70;
    private readonly GAP = 10;

    constructor() {
        this.container = new PIXI.Container();
        this.container.visible = false;
        this.init();
        this.setupKeyboardListeners();
    }

    private init() {
        // 背景遮罩
        const mask = new PIXI.Graphics()
            .beginFill(0x000000, 0.4)
            .drawRect(-2000, -2000, 4000, 4000)
            .endFill();
        mask.interactive = true;
        mask.on('pointerdown', (e) => { e.stopPropagation(); this.hide(); });
        this.container.addChild(mask);

        // 面板主體
        const panel = new PIXI.Graphics()
            .beginFill(0xFFFFFF, 1)
            .lineStyle(2, 0x42A5F5, 0.5)
            .drawRoundedRect(-this.WIDTH / 2, -this.HEIGHT / 2, this.WIDTH, this.HEIGHT, 24)
            .endFill();
        panel.interactive = true;
        panel.on('pointerdown', (e) => e.stopPropagation());
        this.container.addChild(panel);

        // 顯示區域
        this.displayBg = new PIXI.Graphics()
            .beginFill(0xF5F5F5)
            .drawRoundedRect(-this.WIDTH / 2 + 20, -this.HEIGHT / 2 + 30, this.WIDTH - 40, 70, 12)
            .endFill();
        this.container.addChild(this.displayBg);

        this.displayText = new PIXI.Text("0", {
            fontFamily: 'Silkscreen',
            fontSize: 32,
            fill: '#263238',
            fontWeight: 'bold'
        });
        this.displayText.anchor.set(1, 0.5);
        this.displayText.x = this.WIDTH / 2 - 40;
        this.displayText.y = -this.HEIGHT / 2 + 65;
        this.container.addChild(this.displayText);

        // 旋鈕按鈕
        this.createButtons();
    }

    private createButtons() {
        const labels = [
            "7", "8", "9",
            "4", "5", "6",
            "1", "2", "3",
            ".", "0", "DEL",
            "CANCEL", "OK"
        ];

        let xIdx = 0;
        let yIdx = 0;
        const startY = -this.HEIGHT / 2 + 130;

        labels.forEach((label) => {
            if (label === "CANCEL" || label === "OK") {
                const btnWidth = (this.WIDTH - 50) / 2;
                const btn = this.createButton(label, 
                    (label === "CANCEL" ? -this.WIDTH/4 : this.WIDTH/4), 
                    this.HEIGHT/2 - 65, 
                    btnWidth, 60, 
                    label === "OK" ? 0x4CAF50 : 0x90A4AE);
                this.container.addChild(btn);
                return;
            }

            const x = -this.WIDTH/2 + 45 + xIdx * (this.BTN_SIZE + this.GAP) + this.BTN_SIZE/2;
            const y = startY + yIdx * (this.BTN_SIZE + this.GAP) + this.BTN_SIZE/2;
            
            const btn = this.createButton(label, x, y, this.BTN_SIZE, this.BTN_SIZE);
            this.container.addChild(btn);

            xIdx++;
            if (xIdx > 2) {
                xIdx = 0;
                yIdx++;
            }
        });
    }

    private createButton(label: string, x: number, y: number, w: number, h: number, color: number = 0x42A5F5) {
        const btn = new PIXI.Graphics()
            .beginFill(color)
            .drawRoundedRect(-w / 2, -h / 2, w, h, 12)
            .endFill();
        btn.x = x;
        btn.y = y;
        btn.interactive = true;
        btn.cursor = 'pointer';

        const text = new PIXI.Text(label, {
            fontFamily: 'Silkscreen',
            fontSize: label.length > 3 ? 16 : 24,
            fill: '#FFFFFF',
            fontWeight: 'bold'
        });
        text.anchor.set(0.5);
        btn.addChild(text);

        btn.on('pointerdown', () => {
            btn.alpha = 0.7;
        });
        btn.on('pointerup', (e) => {
            e.stopPropagation();
            btn.alpha = 1.0;
            this.handleInput(label);
        });
        btn.on('pointerupoutside', () => {
            btn.alpha = 1.0;
        });

        return btn;
    }

    private handleInput(input: string) {
        if (input === "DEL") {
            this.currentInput = this.currentInput.slice(0, -1);
        } else if (input === "OK") {
            this.confirm();
        } else if (input === "CANCEL") {
            this.hide();
        } else if (input === ".") {
            if (!this.currentInput.includes(".")) {
                this.currentInput += ".";
            }
        } else {
            // 限制長度
            if (this.currentInput.length < 8) {
                if (this.currentInput === "0") this.currentInput = input;
                else this.currentInput += input;
            }
        }
        this.updateDisplay();
    }

    private updateDisplay() {
        this.displayText.text = this.currentInput || "0";
    }

    public show(initialValue: number, callback: (val: number) => void, onCancel?: () => void) {
        this.currentInput = initialValue.toString();
        this.callback = callback;
        this.onCancel = onCancel || null;
        this.container.visible = true;
        this.updateDisplay();
    }

    public hide() {
        this.container.visible = false;
        if (this.onCancel) this.onCancel();
    }

    private confirm() {
        const val = parseFloat(this.currentInput);
        if (!isNaN(val) && this.callback) {
            this.callback(val);
        }
        this.hide();
    }

    private setupKeyboardListeners() {
        window.addEventListener('keydown', (e) => {
            if (!this.container.visible) return;

            if (e.key >= "0" && e.key <= "9") {
                e.preventDefault();
                this.handleInput(e.key);
            } else if (e.key === ".") {
                e.preventDefault();
                this.handleInput(".");
            } else if (e.key === "Backspace") {
                e.preventDefault();
                this.handleInput("DEL");
            } else if (e.key === "Enter") {
                e.preventDefault();
                this.handleInput("OK");
            } else if (e.key === "Escape") {
                e.preventDefault();
                this.handleInput("CANCEL");
            }
        }, true); // 使用 capture flag 確保優先處理
    }
}
