import * as PIXI from 'pixi.js';

export class RecipeStickyNote {
    public container: PIXI.Container;
    private bg: PIXI.Graphics;
    private titleText: PIXI.Text;
    private contentContainer: PIXI.Container;
    private toggleBtn: PIXI.Container;

    private dragging = false;
    private dragData: any = null;
    private isMinimized = false;

    // 儲存最後一次更新的資料，以便縮放時重繪
    private lastData: { powder: number, totalRatio: number, stages: any[] } | null = null;

    constructor() {
        this.container = new PIXI.Container();
        this.container.interactive = true;
        this.container.cursor = 'move';

        // 背景
        this.bg = new PIXI.Graphics();
        this.container.addChild(this.bg);

        // 標題
        this.titleText = new PIXI.Text('BREW CHEAT SHEET', {
            fontFamily: 'Silkscreen',
            fontSize: 24,
            fill: '#263238', // 改回深色
            fontWeight: 'bold'
        });
        this.titleText.x = 20;
        this.titleText.y = 12;
        this.container.addChild(this.titleText);

        // 內容容器
        this.contentContainer = new PIXI.Container();
        this.contentContainer.y = 50;
        this.container.addChild(this.contentContainer);

        // 縮放按鈕
        this.toggleBtn = new PIXI.Container();
        this.toggleBtn.interactive = true;
        this.toggleBtn.cursor = 'pointer';
        this.container.addChild(this.toggleBtn);
        this.drawToggleBtn();

        this.toggleBtn.on('pointerdown', (e) => {
            e.stopPropagation();
            this.isMinimized = !this.isMinimized;
            this.refresh();
        });

        this.setupDragging();
        this.draw(400, 500); // 預設大小

        // 預設位置
        this.container.x = 80;
        this.container.y = 150;
    }

    private draw(width: number, height: number) {
        this.bg.clear();
        // 陰影
        this.bg.beginFill(0x000000, 0.1);
        this.bg.drawRoundedRect(4, 4, width, height, 15);
        this.bg.endFill();

        // 主體 (精緻白)
        this.bg.beginFill(0xFFFFFF, 0.95);
        this.bg.lineStyle(2, 0x1976D2, 0.2);
        this.bg.drawRoundedRect(0, 0, width, height, 15);
        this.bg.endFill();

        // 更新按鈕位置
        this.toggleBtn.x = width - 40;
        this.toggleBtn.y = 29; // 與標題文字垂直中心對齊
        this.drawToggleBtn();
    }

    private drawToggleBtn() {
        const g = new PIXI.Graphics();
        this.toggleBtn.removeChildren();
        this.toggleBtn.addChild(g);

        g.beginFill(0x1976D2, 0.1).drawCircle(0, 0, 15).endFill();
        g.lineStyle(2, 0x1976D2);
        if (this.isMinimized) {
            // 加號
            g.moveTo(-6, 0).lineTo(6, 0);
            g.moveTo(0, -6).lineTo(0, 6);
        } else {
            // 減號
            g.moveTo(-6, 0).lineTo(6, 0);
        }
    }

    public updateRecipe(powder: number, totalRatio: number, stages: any[]) {
        this.lastData = { powder, totalRatio, stages };
        this.refresh();
    }

    private refresh() {
        if (!this.lastData) return;
        const { powder, totalRatio, stages } = this.lastData;

        this.contentContainer.removeChildren();

        if (this.isMinimized) {
            this.contentContainer.visible = false;
            this.draw(400, 55); // 只顯示標題列
            return;
        }

        this.contentContainer.visible = true;
        // 副標題
        const sub = new PIXI.Text(`${powder}g 粉 | 總比例 1:${totalRatio.toFixed(1)}`, {
            fontFamily: 'Silkscreen',
            fontSize: 18,
            fill: '#455A64'
        });
        sub.x = 20; sub.y = -5;
        this.contentContainer.addChild(sub);

        let y = 50;

        // 表頭
        const headerStyle = { fontFamily: 'Noto Sans TC', fontSize: 14, fill: '#90A4AE', fontWeight: 'bold' as any };
        const h1 = new PIXI.Text('階段', headerStyle); h1.x = 20; h1.y = y;
        const h2 = new PIXI.Text('注水目標(累計)', headerStyle); h2.x = 125; h2.y = y;
        const h3 = new PIXI.Text('總時點', headerStyle); h3.x = 300; h3.y = y;
        this.contentContainer.addChild(h1, h2, h3);

        y += 35;

        stages.forEach((s, i) => {
            const rowBg = new PIXI.Graphics();
            if (i % 2 === 0) {
                rowBg.beginFill(0x000000, 0.03).drawRect(10, y - 5, 380, 50).endFill();
            }
            this.contentContainer.addChild(rowBg);

            const label = new PIXI.Text(s.label, { fontFamily: 'Silkscreen', fontSize: 20, fill: '#263238', fontWeight: 'bold' });
            label.x = 20; label.y = y;

            const weight = new PIXI.Text(`${Math.floor(s.targetWeight)}g`, { fontFamily: 'Silkscreen', fontSize: 24, fill: '#1E88E5', fontWeight: 'bold' });
            weight.x = 125; weight.y = y;

            const m = Math.floor(s.endTime / 60).toString().padStart(2, '0');
            const sec = Math.floor(s.endTime % 60).toString().padStart(2, '0');
            const time = new PIXI.Text(`${m}:${sec}`, { fontFamily: 'Silkscreen', fontSize: 20, fill: '#455A64' });
            time.x = 300; time.y = y;

            this.contentContainer.addChild(label, weight, time);
            y += 50;
        });

        this.draw(400, y + 80);
    }

    private setupDragging() {
        this.container.on('pointerdown', (event) => {
            this.dragData = event.data;
            this.container.alpha = 0.8;
            this.dragging = true;
            // 紀錄相對偏移座標，避免跳動
            const { x, y } = this.dragData.getLocalPosition(this.container.parent);
            this.dragData.offset = { x: this.container.x - x, y: this.container.y - y };
        });

        this.container.on('globalpointermove', () => {
            if (this.dragging) {
                const newPosition = this.dragData.getLocalPosition(this.container.parent);
                this.container.x = newPosition.x + this.dragData.offset.x;
                this.container.y = newPosition.y + this.dragData.offset.y;
            }
        });

        const onUp = () => {
            this.alpha = 1;
            this.dragging = false;
            this.dragData = null;
        };
        this.container.on('pointerup', onUp);
        this.container.on('pointerupoutside', onUp);
    }

    get alpha() { return this.container.alpha; }
    set alpha(v: number) { this.container.alpha = v; }
}
