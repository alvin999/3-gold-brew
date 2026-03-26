// 場景佈局與物理參數封裝 (方便未來調整)
export const LAYOUT = {
  TABLE_Y: 9.0,          // 桌面基準高度
  FLOOR_Y: 0.0,          // 地板高度
  INTERACTION_Y: 14.0,   // 互動點擊判定平面 (提升至與手沖壺同高，達成游標同步)
  DRIPPER_SPACING: 4.8,  // 三組器材間距
  DRIPPER_Z: 3.0,        // 濾杯/電子秤中心 Z 軸位置
  DRIPPER_RADIUS: 1.5,   // 濾杯原始半徑
  DRIPPER_TOP_Y: 11.4,   // 濾杯頂部高度 (水柱切斷判定點)
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
  }
};
