// 場景佈局與物理參數封裝 (方便未來調整)
export const LAYOUT = {
  TABLE_Y: 9.0,          // 桌面基準高度
  FLOOR_Y: 0.0,          // 地板高度
  INTERACTION_Y: 14.0,   // 互動點擊判定平面 (提升至與手沖壺同高，達成游標同步)
  DRIPPER_SPACING: 4.8,  // 三組器材間距
  DRIPPER_Z: 3.0,        // 濾杯/電子秤中心 Z 軸位置
  DRIPPER_RADIUS: 1.5,   // 濾杯原始半徑
  DRIPPER_TOP_Y: 13.4,   // 修正：濾杯頂部高度基準 (實際模型於 13.4)
  KETTLE_Y: 14.0,        // 手沖壺懸浮高度
  KETTLE_SPOUT: { x: -3.8, y: 2.5 }, // 壺嘴相對座標 (視覺末端點)
  SIGNBOARD: {
    Z: 0.0,              // 桌面指示標籤 Z 軸
    BASE_Y: 9.3,         // 標籤最低高度
    LIFT: 2.7            // 仰視時最大抬升額
  },
  TIMER: {
    Z: -3.0,             // 計時看板 Z 軸
    BASE_Y: 9.5,         // 計時看板最低高度
    LIFT: 3.0            // 仰視時最大抬升額
  },
  ANIMATION: {
    CAM_MIN: 10.0,       // 動態過渡開始高度 (平視)
    CAM_MAX: 25.0,       // 動態過渡結束高度 (職人)
    RANGE: 15.0          // 過渡區間 (25-10)
  },
  MODEL: {
    SCALE: 0.55,           // 全局器材縮放係數
    DRIPPER_BOTTOM_Y: 2.6, // 濾杯底部 Y 軸 (相對於 group)
    DRIPPER_MAX_H: 1.8,    // 濾杯內部液體最大高度 (提升至 1.8 對齊實體模型)
    DRIPPER_TOP_LOCAL_Y: 4.4, // 濾杯頂部世界高度計算基準
    SERVER_BASE_Y: 0.22,   // 下壺液體起始高度
    SERVER_MAX_H: 2.2,     // 下壺水位最大高度
    POWDER_BASE_Y: 3.2,    // 咖啡粉初始高度
    POWDER_WET_Y: 3.14     // 咖啡粉浸潤後高度
  },
  COLORS: {
    BACKGROUND: 0xA1E3F9,
    FOG: 0xA1E3F9,
    COUNTER: 0x333333,
    FLOOR: 0xffffff,
    STAND: 0x78909C,
    DRIPPER: 0xffffff,
    LIQUID: 0x3d2b1f,
    POWDER: 0x3d2314,
    POWDER_WET: 0x3a2010,
    STAND_RING: 0x5a3820
  },
  LIGHTS: {
    AMBIENT: { color: 0xffffff, intensity: 0.2 },
    RECT: { color: 0xFFEED8, intensity: 1.2, width: 50, height: 50, pos: { x: 5, y: 32, z: 5 } },
    POINT: { color: 0xffffff, intensity: 0.8, distance: 100, pos: { x: 10, y: 25, z: 10 } },
    DIR: { color: 0xffffff, intensity: 1.0, pos: { x: -10, y: 38, z: 10 }, shadowScale: 30 }
  },
  PARTICLES: {
    COUNT: 100,
    SIZE: 0.09,
    OPACITY: 0.7,
    GRAVITY: 0.015,
    RESISTANCE: 0.95
  },
  PHYSICS: {
    DRAINAGE_BASE: 1.6,             // 進一步微調 (原 1.8)，讓積水更有感
    CLOGGING_FACTOR: 1.0,           // 阻塞強度 (0.0~1.0)，越高則後期降速越明顯
    HEIGHT_INFLUENCE: 0.3,          // 水位高度的輔助權重 (0.0=無影響，1.0=與主體等重)
    DRAINAGE_EXP: 0.5,              // 水位影響的指數 (0.5 為原本的 sqrt 開根號)
    SERVER_VISUAL_CAPACITY: 500,    // 下壺視覺參考容量 (g)，作為無明確目標時的備用基準
    DRIPPER_VISUAL_CAPACITY: 60.0,  // 大幅下修 (原 120)，讓 60g 積水即顯現「滿溢感」
    DRIPPER_VISUAL_MIN_RATIO: 0.4   // 濾杯起始視覺比例 (對應粉層表面高度)，確保注水即刻可見
  },
  CAMERA: {
    DEFAULT: { pos: { x: 0, y: 20.5, z: 14.5 }, target: { x: 0, y: 9, z: 3 } },
    PRESETS: {
      '職人視角': { pos: { x: 0, y: 22, z: 12 }, target: { x: 0, y: 8, z: 2 } },
      '職人視角 (單杯)': { pos: { x: 0, y: 19.5, z: 12 }, target: { x: 0, y: 8.5, z: 1 } },
      '廣角全景': { pos: { x: 0, y: 20.5, z: 14.5 }, target: { x: 0, y: 9, z: 3 } }
    }
  }
};
