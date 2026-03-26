export interface PourStage {
  targetWeight: number; // 累計克數
  timeLimit: number;    // 開注時間 (秒)
  label: string;
}

export interface BrewRecipe {
  stages: PourStage[];
  staggerInterval: number;
}

export class BrewCalculator {
  /**
   * 計算單杯配方
   * @param powder 粉量 (g)
   * @param stageConfigs 比例與時間設定
   */
  static calculateRecipe(
    powder: number,
    stageConfigs: { ratio: number; time: number; label: string }[]
  ): PourStage[] {
    let currentTotalWeight = 0;
    return stageConfigs.map((config) => {
      const addedWeight = powder * config.ratio;
      currentTotalWeight += addedWeight;
      return {
        targetWeight: currentTotalWeight,
        timeLimit: config.time,
        label: config.label,
      };
    });
  }

  /**
   * 計算多杯錯開間隔
   * @param bloomTime 浸潤等待時間 (秒)
   * @param cupCount 杯數
   */
  static getStaggerInterval(bloomTime: number, cupCount: number): number {
    if (cupCount <= 1) return 0;
    return bloomTime / cupCount;
  }
}
