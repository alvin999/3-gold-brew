import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

/**
 * ResultScreen - 遊戲結算畫面 (極簡明亮風格)
 * 使用 Chart.js 顯示注水曲線對比
 */
export class ResultScreen {
  private overlay: HTMLElement;
  private chart: Chart | null = null;
  public onRetry?: () => void;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'result-screen';
    this.overlay.className = 'hidden';
    this.setupStyles();
    document.body.appendChild(this.overlay);
  }

  private setupStyles() {
    const style = document.createElement('style');
    style.id = 'result-screen-style';
    style.textContent = `
      #result-screen {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.65);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        opacity: 0;
        transition: opacity 0.5s ease-out;
        pointer-events: none;
      }
      #result-screen.visible {
        opacity: 1;
        pointer-events: auto;
      }
      .result-card {
        background: #ffffff;
        width: 90%;
        max-width: 750px;
        padding: 45px;
        border-radius: 30px;
        box-shadow: 0 30px 80px rgba(0,0,0,0.12);
        text-align: center;
        color: #0f172a;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      .result-header {
        margin-bottom: 20px;
      }
      .result-title {
        font-size: 13px;
        letter-spacing: 5px;
        color: #94a3b8;
        text-transform: uppercase;
        margin-bottom: 12px;
        font-weight: 700;
      }
      .result-grade {
        font-size: 96px;
        font-weight: 900;
        margin: 5px 0;
        line-height: 1;
        background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .result-score {
        font-size: 22px;
        color: #475569;
        font-weight: 600;
        margin-top: 10px;
      }
      .chart-container {
        position: relative;
        height: 280px;
        width: 100%;
        margin: 35px 0;
        padding: 10px;
        background: #f8fafc;
        border-radius: 16px;
      }
      .result-footer {
        margin-top: 35px;
        display: flex;
        justify-content: center;
        gap: 20px;
      }
      .retry-btn {
        background: #0f172a;
        color: #ffffff;
        border: none;
        padding: 16px 50px;
        border-radius: 50px;
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 1px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        text-transform: uppercase;
      }
      .retry-btn:hover {
        background: #334155;
        transform: translateY(-3px);
        box-shadow: 0 10px 20px rgba(15, 23, 42, 0.2);
      }
      .retry-btn:active {
        transform: translateY(-1px);
      }
      .hidden {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  public show(cups: any[]) {
    // 預設抓取第一杯有效杯子展示
    const mainCup = cups.find(c => c.displayIndex > 0) || cups[0];
    if (!mainCup) return;

    // 計算評分與評級
    let totalWeightError = 0;
    let totalTimeError = 0;
    const activeCups = cups.filter(c => c.displayIndex > 0);
    activeCups.forEach((c: any) => {
      c.stageErrors.forEach((err: any) => {
        if (err) {
          totalWeightError += err.weightError;
          totalTimeError += err.timeError;
        }
      });
    });
    
    // 使用平均值作為最終得分參考
    const avgWeightError = totalWeightError / activeCups.length;
    const avgTimeError = totalTimeError / activeCups.length;
    const score = Math.max(0, Math.floor(100 - (avgWeightError * 1.5) - (avgTimeError * 0.5)));
    
    let grade = 'C';
    if (score >= 95) grade = 'S';
    else if (score >= 85) grade = 'A';
    else if (score >= 70) grade = 'B';

    this.overlay.innerHTML = `
      <div class="result-card">
        <div class="result-header">
          <div class="result-title">Brewing Summary</div>
          <div class="result-grade">${grade}</div>
          <div class="result-score">Final Score: ${score}</div>
        </div>
        <div class="chart-container">
          <canvas id="resultChart"></canvas>
        </div>
        <div class="result-footer">
          <button class="retry-btn" id="retry-game-btn">Restart Experiment</button>
        </div>
      </div>
    `;

    this.overlay.classList.remove('hidden');
    // 強制重繪
    this.overlay.offsetHeight;
    this.overlay.classList.add('visible');

    const btn = document.getElementById('retry-game-btn');
    if (btn) btn.onclick = () => {
        this.hide();
        setTimeout(() => {
          if (this.onRetry) this.onRetry();
        }, 500);
    };

    // 延遲一點點確保 Canvas 已經在 DOM 裡面
    setTimeout(() => this.renderChart(cups), 100);
  }

  private renderChart(cups: any[]) {
    const canvas = document.getElementById('resultChart') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mainCup = cups.find(c => c.displayIndex > 0) || cups[0];
    if (!mainCup) return;

    // 1. 準備擬真目標數據 (標竿斜坡圖)
    const IDEAL_FLOW = 10; // 理想流速 10g/s
    const targetData: any[] = [{ x: 0, y: 0 }];
    let lastWeight = 0;
    let lastTime = 0;

    mainCup.stages.forEach((s: any) => {
      const deltaW = s.targetWeight - lastWeight;
      const pourTime = deltaW / IDEAL_FLOW;
      
      // 確保注水起點至少在上一階段結束之後
      const startTime = Math.max(lastTime, s.timeLimit);
      
      // 注入斜坡：從 startTime 開始注水，持續 pourTime 秒
      if (startTime > targetData[targetData.length - 1].x) {
        targetData.push({ x: startTime, y: lastWeight });
      }
      targetData.push({ x: startTime + pourTime, y: s.targetWeight });
      
      lastWeight = s.targetWeight;
      lastTime = startTime + pourTime;
    });

    // 延伸結尾
    const finalX = targetData[targetData.length - 1].x;
    const finalY = targetData[targetData.length - 1].y;
    targetData.push({ x: finalX + 15, y: finalY });

    // 2. 準備各杯數據與色彩分配
    const colors = ['#6366f1', '#10b981', '#f59e0b']; // Indigo, Emerald, Amber
    const datasets: any[] = [
      {
        label: 'Perfect Brew',
        data: targetData,
        borderColor: '#cbd5e1',
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        tension: 0,
        fill: false,
        order: 10 // 確保標竿在最底層
      }
    ];

    cups.filter(c => c.displayIndex > 0).forEach((cup, idx) => {
      const historyData = cup.history
        .filter((h: any) => h.time >= 0)
        .map((h: any) => ({ x: h.time, y: h.weight }));
      datasets.push({
        label: `Cup ${cup.displayIndex}`,
        data: historyData,
        borderColor: colors[idx % colors.length],
        borderWidth: 3,
        pointRadius: 0,
        tension: 0.2,
        fill: false,
        order: idx
      });
    });

    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1200, easing: 'easeOutQuart' },
        interaction: { intersect: false, mode: 'index' },
        scales: {
          x: { 
            type: 'linear', 
            title: { display: true, text: 'TIME OFFSET (SEC)', font: { size: 10, weight: 700 }, padding: 10 },
            grid: { display: false },
            ticks: { font: { size: 10 } }
          },
          y: { 
            beginAtZero: true, 
            title: { display: true, text: 'WEIGHT (G)', font: { size: 10, weight: 700 }, padding: 10 },
            grid: { color: 'rgba(226, 232, 240, 0.6)', drawTicks: false },
            ticks: { font: { size: 10 } }
          }
        },
        plugins: {
          legend: { 
            display: true, 
            position: 'top', 
            labels: { 
              boxWidth: 10, 
              usePointStyle: true, 
              pointStyle: 'circle',
              font: { size: 11, weight: 500 },
              padding: 20
            } 
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#1e293b',
            bodyColor: '#475569',
            borderColor: '#e2e8f0',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            callbacks: {
               label: (context) => `${context.dataset.label}: ${(context.parsed.y || 0).toFixed(1)}g`
            }
          }
        }
      }
    });
  }

  public hide() {
    this.overlay.classList.remove('visible');
    setTimeout(() => this.overlay.classList.add('hidden'), 500);
  }
}
