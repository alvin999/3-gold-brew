import * as PIXI from 'pixi.js';

export class GameMenu {
    public container: PIXI.Container;
    private bg: PIXI.Graphics;
    private buttons: PIXI.Container[] = [];
    public freeModeLabel!: PIXI.Text;

    // 事件回調
    public onSettings?: () => void;
    public onRestart?: () => void;
    public onHome?: () => void;

    constructor() {
        this.container = new PIXI.Container();
        this.bg = new PIXI.Graphics();
        this.container.addChild(this.bg);
        this.init();
    }

    private init() {
        // 1. Mode Settings Button
        const settingsBtn = this.createMenuButton('MODE SETTINGS', 'gear', -210);
        settingsBtn.on('pointerup', () => this.onSettings?.());
        
        // 2. Restart Button
        const restartBtn = this.createMenuButton('RESTART', 'refresh', 0);
        restartBtn.on('pointerup', () => this.onRestart?.());

        // 3. Home Button
        const homeBtn = this.createMenuButton('HOME', 'home', 140);
        homeBtn.on('pointerup', () => this.onHome?.());

        this.buttons.push(settingsBtn, restartBtn, homeBtn);
        this.container.addChild(...this.buttons);

        this.freeModeLabel = new PIXI.Text({
            text: 'FREE BREWING MODE',
            style: {
                fontFamily: 'Silkscreen, "Microsoft JhengHei", Arial, sans-serif',
                fontSize: 16,
                fill: '#FFD700', // 金黃色
                fontWeight: '900',
                dropShadow: {
                    color: '#000000',
                    alpha: 0.3,
                    distance: 2,
                    blur: 2
                }
            }
        });
        this.freeModeLabel.alpha = 1.0; 
        this.freeModeLabel.anchor.set(0.5, 0.5); // 正居中
        this.freeModeLabel.visible = false;
        // 注意：不加入 this.container，由 PixiScene 管理位置
        
        this.drawBG();
    }

    private drawBG() {
        const width = 580; // 縮減寬度以適配 3 個按鈕
        const height = 45;
        this.bg.clear();
        
        // 將背景基準點設為中央，實現對稱
        const bgX = -width / 2; 
        
        // 毛玻璃陰影
        this.bg.beginFill(0x000000, 0.25);
        this.bg.drawRoundedRect(bgX + 4, 4, width, height, 15);
        this.bg.endFill();

        // 主體
        this.bg.beginFill(0x222222, 0.4); // 稍微加深一點點，增加層次感
        this.bg.lineStyle(1.5, 0xFFFFFF, 0.2);
        this.bg.drawRoundedRect(bgX, 0, width, height, 15);
        this.bg.endFill();

        // 加上一點玻璃質感的光澤 (漸層效果的簡化版)
        this.bg.lineStyle(0);
        this.bg.beginFill(0xFFFFFF, 0.08);
        this.bg.drawRoundedRect(bgX + 2, 2, width - 4, height / 2.2, 12);
        this.bg.endFill();

        this.bg.y = -5;
    }

    private createMenuButton(text: string, iconType: string, x: number): PIXI.Container {
        const btn = new PIXI.Container();
        btn.x = x;
        btn.interactive = true;
        btn.cursor = 'pointer';
        btn.y = 4; // 垂直居中於 45px 背景 (考量到文字高度)

        // 圖標
        const icon = this.drawIcon(iconType);
        btn.addChild(icon);

        // 文字
        const label = new PIXI.Text({
            text: text,
            style: {
                fontFamily: 'Silkscreen',
                fontSize: 14,
                fill: '#FFFFFF',
                fontWeight: 'bold'
            }
        });
        label.x = 25;
        label.anchor.set(0, 0.5); // 垂直居中錨點
        label.y = 15; // 配合圖標中心點 (g.y=10 + drawCenter=5)
        btn.addChild(label);

        // 互動效果
        btn.on('pointerover', () => {
            btn.scale.set(1.05);
            label.style.fill = '#42A5F5';
        });
        btn.on('pointerout', () => {
            btn.scale.set(1.0);
            label.style.fill = '#FFFFFF';
        });

        return btn;
    }

    private drawIcon(type: string): PIXI.Graphics {
        const g = new PIXI.Graphics();
        g.lineStyle(2, 0xFFFFFF, 1.0);
        g.y = 10; // 基礎基準點

        if (type === 'gear') {
            // 精密的齒輪設計
            g.beginFill(0xFFFFFF, 0).lineStyle(2, 0xFFFFFF);
            g.drawCircle(8, 5, 4.5);
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const nextAngle = ((i + 0.5) / 8) * Math.PI * 2;
                g.moveTo(8 + Math.cos(angle) * 4.5, 5 + Math.sin(angle) * 4.5);
                g.lineTo(8 + Math.cos(angle) * 7.5, 5 + Math.sin(angle) * 7.5);
                g.lineTo(8 + Math.cos(nextAngle) * 7.5, 5 + Math.sin(nextAngle) * 7.5);
                g.lineTo(8 + Math.cos(nextAngle) * 4.5, 5 + Math.sin(nextAngle) * 4.5);
            }
            g.beginFill(0xFFFFFF).drawCircle(8, 5, 2).endFill();
        } else if (type === 'refresh') {
            // 動態感十足的旋轉箭頭
            const radius = 6.5;
            const centerX = 8;
            const centerY = 5;
            g.lineStyle(2.5, 0xFFFFFF);
            g.arc(centerX, centerY, radius, -Math.PI * 0.4, Math.PI * 1.4);
            
            const arrowX = centerX + Math.cos(-Math.PI * 0.4) * radius;
            const arrowY = centerY + Math.sin(-Math.PI * 0.4) * radius;
            
            g.lineStyle(0);
            g.beginFill(0xFFFFFF);
            g.moveTo(arrowX, arrowY);
            g.lineTo(arrowX + 6, arrowY + 1);
            g.lineTo(arrowX + 1, arrowY - 6);
            g.closePath();
            g.endFill();
        } else if (type === 'home') {
            // 現代化房屋圖標
            g.lineStyle(2, 0xFFFFFF);
            g.moveTo(-2, 5).lineTo(8, -3).lineTo(18, 5); // 加寬屋頂
            g.beginFill(0xFFFFFF, 0);
            g.drawRect(2, 5, 12, 9); // 屋體
            g.beginFill(0xFFFFFF).drawRect(7, 9, 3, 5).endFill(); // 門
        }

        return g;
    }

    public setFreeMode(active: boolean) {
        this.freeModeLabel.visible = active;
    }
}
