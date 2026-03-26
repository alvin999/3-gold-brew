import { Pane } from 'tweakpane';

export type GUIValues = {
    lights: {
        ambientIntensity: number;
        pointIntensity: number;
        pointColor: string;
        pointPosition: { x: number; y: number; z: number };
        dirIntensity: number;
        dirPosition: { x: number; y: number; z: number };
        rectIntensity: number;
        toneMappingExposure: number;
    };
    bloom: {
        bloomStrength: number;
        bloomRadius: number;
        bloomThreshold: number;
    };
    scene: {
        bgColor: string;
        floorColor: string;
        counterColor: string;
        fogDensity: number;
    };
    game: {
        pourSpeed: number;
        streamRadius: number;
    };
    camera: {
        position: { x: number; y: number; z: number };
        target: { x: number; y: number; z: number };
        zoom: number;
        mode: 'Fixed' | 'Free';
        preset: string;
    };
    calculator: {
        mode: '自由模式' | '計算模式';
        cupCount: number;
        powder: number;
        stage1Ratio: number;
        stage1Time: number;
        stage2Ratio: number;
        stage2Time: number;
        stage3Ratio: number;
        stage3Time: number;
    };
};

export const DEFAULTS: GUIValues = {
    lights: {
        ambientIntensity: 0.2,   // 降低環境光，產生更清晰的影子與立體感 (Interland Style)
        pointIntensity: 0.8,     // 降低強度防止過曝
        pointColor: '#ffffff',
        pointPosition: { x: 10, y: 25, z: 10 },
        dirIntensity: 1.0,           // 新增定向光源強度
        dirPosition: { x: -10, y: 27, z: 10 }, // 側上方打光，產生立體陰影
        rectIntensity: 1.2,
        toneMappingExposure: 1.0, 
    },
    bloom: {
        bloomStrength: 0,       // 完全關閉發光 (Bloom)，消除「霧霧」的感覺
        bloomRadius: 0.4,
        bloomThreshold: 0.95,
    },
    scene: {
        bgColor: '#ffffff',    // 背景純白
        floorColor: '#ffffff',  // 地面純白
        counterColor: '#333333',
        fogDensity: 0,          // 完全除霧，極致通透
    },
    game: {
        pourSpeed: 0.5,
        streamRadius: 0.05,
    },
    camera: {
        position: { x: 0, y: 18, z: 12 },
        target: { x: 0, y: 9, z: 3 },
        zoom: 1.0,
        mode: 'Fixed',
        preset: '職人視角'
    },
    calculator: {
        mode: '自由模式',
        cupCount: 1,
        powder: 15,
        stage1Ratio: 6,
        stage1Time: 30,
        stage2Ratio: 5,
        stage2Time: 90,
        stage3Ratio: 5,
        stage3Time: 150
    }
};



export function initGUI(
    params: GUIValues, // 改為由外部傳入，實現狀態共享
    onLightsChange: (v: any) => void,
    onBloomChange: (v: any) => void,
    onSceneChange: (v: any) => void,
    onGameChange: (v: any) => void,
    onResetCamera: () => void,
    onCameraChange: (v: any) => void
) {
    console.log("Tweakpane: initGUI started");

    // 檢查是否已經存在面板
    let container = document.getElementById('tp-gui-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'tp-gui-container';
        container.style.position = 'fixed';
        container.style.top = '10px';
        container.style.right = '10px';
        container.style.zIndex = '200';
        document.body.appendChild(container);
    }

    const pane = new Pane({
        title: '咖啡沖煮調試面板 (Tweakpane)',
        container: container,
    }) as any;
    
    // 註冊全域刷新方法，讓 ThreeScene 能通知面板更新
    (window as any).refreshGUI = () => pane.refresh();

    // --- 環境光影 ---
    const lightFolder = pane.addFolder({ title: '環境光影' });
    lightFolder.addBinding(params.lights, 'ambientIntensity', { min: 0, max: 2, label: '環境光強度' }).on('change', () => onLightsChange(params.lights));
    lightFolder.addBinding(params.lights, 'pointIntensity', { min: 0, max: 10, label: '點光源強度' }).on('change', () => onLightsChange(params.lights));
    lightFolder.addBinding(params.lights, 'pointPosition', { 
        label: '點光源位置',
        x: { min: -30, max: 30 },
        y: { min: 0, max: 40 },
        z: { min: -30, max: 30 }
    }).on('change', () => onLightsChange(params.lights));
    lightFolder.addBinding(params.lights, 'pointColor', { label: '點光源顏色' }).on('change', () => onLightsChange(params.lights));
    
    lightFolder.addBlade({ view: 'separator' });
    lightFolder.addBinding(params.lights, 'dirIntensity', { min: 0, max: 10, label: '定向光源強度' }).on('change', () => onLightsChange(params.lights));
    lightFolder.addBinding(params.lights, 'dirPosition', { 
        label: '定向光源位置',
        x: { min: -50, max: 50 },
        y: { min: 0, max: 50 },
        z: { min: -50, max: 50 }
    }).on('change', () => onLightsChange(params.lights));

    lightFolder.addBlade({ view: 'separator' });
    lightFolder.addBinding(params.lights, 'rectIntensity', { min: 0, max: 10, label: '區域光強度' }).on('change', () => onLightsChange(params.lights));
    lightFolder.addBinding(params.lights, 'toneMappingExposure', { min: 0, max: 3, label: '曝光度' }).on('change', () => onLightsChange(params.lights));

    // --- 濾鏡特效 ---
    const bloomFolder = pane.addFolder({ title: '濾鏡特效 (Bloom)' });
    bloomFolder.addBinding(params.bloom, 'bloomStrength', { min: 0, max: 3, label: '發光強度' }).on('change', () => onBloomChange(params.bloom));
    bloomFolder.addBinding(params.bloom, 'bloomRadius', { min: 0, max: 1, label: '發光半徑' }).on('change', () => onBloomChange(params.bloom));
    bloomFolder.addBinding(params.bloom, 'bloomThreshold', { min: 0, max: 1, label: '發光閾值' }).on('change', () => onBloomChange(params.bloom));

    // --- 場景材質 ---
    const sceneFolder = pane.addFolder({ title: '場景材質' });
    sceneFolder.addBinding(params.scene, 'bgColor', { label: '背景顏色' }).on('change', () => onSceneChange(params.scene));
    sceneFolder.addBinding(params.scene, 'floorColor', { label: '地面顏色' }).on('change', () => onSceneChange(params.scene));
    sceneFolder.addBinding(params.scene, 'fogDensity', { min: 0, max: 0.05, step: 0.001, label: '霧氣密度' }).on('change', () => onSceneChange(params.scene));
    sceneFolder.addBinding(params.scene, 'counterColor', { label: '吧台顏色' }).on('change', () => onSceneChange(params.scene));

    // --- 遊戲配置 ---
    const gameFolder = pane.addFolder({ title: '遊戲配置' });
    gameFolder.addBinding(params.game, 'pourSpeed', { min: 0, max: 2, label: '倒水速度' }).on('change', () => onGameChange(params.game));
    gameFolder.addBinding(params.game, 'streamRadius', { min: 0.01, max: 0.2, label: '水流粗度' }).on('change', () => onGameChange(params.game));

    // --- 攝影機與視角控制 ---
    const camFolder = pane.addFolder({ title: '攝影機與視角系統' });
    
    // 座標顯示 (雙向同步)
    camFolder.addBinding(params.camera, 'position', { 
        label: '攝影機座標',
        x: { min: -100, max: 100 },
        y: { min: 0, max: 100 },
        z: { min: -100, max: 100 }
    }).on('change', () => onCameraChange(params.camera));
    
    camFolder.addBinding(params.camera, 'target', { 
        label: '盯視點座標',
        x: { min: -50, max: 50 },
        y: { min: -10, max: 50 },
        z: { min: -50, max: 50 }
    }).on('change', () => onCameraChange(params.camera));

    camFolder.addBinding(params.camera, 'zoom', { min: 0.1, max: 5, label: '鏡頭縮放' }).on('change', () => onCameraChange(params.camera));
    
    const resetViewBtn = camFolder.addButton({ title: '還原初始視角 (Reset View)' });
    resetViewBtn.on('click', () => onResetCamera());

    // --- 重要：重置按鈕 ---
    // 移除不穩定的 addSeparator，直接添加按鈕
    const resetBtn = pane.addButton({ title: '重置所有為預設值 (Reset)' });
    
    resetBtn.on('click', () => {
        const freshDefaults = JSON.parse(JSON.stringify(DEFAULTS));
        (Object.keys(params) as Array<keyof GUIValues>).forEach(key => {
            Object.assign(params[key], freshDefaults[key]);
        });
        
        pane.refresh(); // 強制更新 UI
        
        // 觸發所有回調
        onLightsChange(params.lights);
        onBloomChange(params.bloom);
        onSceneChange(params.scene);
        onGameChange(params.game);
        onCameraChange(params.camera);
        onCameraChange(params.camera);
        
        console.log("Tweakpane: All parameters reset to defaults.");
    });

    // --- 初始化同步 ---
    // 確保啟動時，場景數值能跟面板同步
    onLightsChange(params.lights);
    onBloomChange(params.bloom);
    onSceneChange(params.scene);
    onGameChange(params.game);
}
