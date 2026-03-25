import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Leva, useControls } from 'leva';


interface GUIProps {
  onLightsChange: (values: any) => void;
  onBloomChange: (values: any) => void;
  onSceneChange: (values: any) => void;
  onGameChange: (values: any) => void;
}

const Controls = ({ onLightsChange, onBloomChange, onSceneChange, onGameChange }: GUIProps) => {
  const lights = useControls('環境光影', {
    ambientIntensity: { value: 0.5, min: 0, max: 2, label: '環境光強度' },
    pointIntensity: { value: 0.8, min: 0, max: 5, label: '點光源強度' },
    pointColor: { value: '#ffffff', label: '點光源顏色' },
    toneMappingExposure: { value: 1.1, min: 0, max: 3, label: '曝光度' }
  });

  const bloom = useControls('濾鏡特效 (Bloom)', {
    bloomStrength: { value: 0.2, min: 0, max: 3, label: '發光強度' },
    bloomRadius: { value: 0.4, min: 0, max: 1, label: '發光半徑' },
    bloomThreshold: { value: 0.9, min: 0, max: 1, label: '發光閾值' }
  });

  const scene = useControls('場景材質', {
    bgColor: { value: '#fbf1c7', label: '背景顏色' },
    floorColor: { value: '#E1F5FE', label: '地面顏色' },
    counterColor: { value: '#F5F5F5', label: '吧台顏色' }
  });

  const game = useControls('遊戲配置', {
    pourSpeed: { value: 0.5, min: 0.1, max: 2.0, step: 0.1, label: '注水速度' },
    streamRadius: { value: 0.05, min: 0.01, max: 0.3, label: '水流粗細' }
  });

  useEffect(() => onLightsChange(lights), [lights, onLightsChange]);
  useEffect(() => onBloomChange(bloom), [bloom, onBloomChange]);
  useEffect(() => onSceneChange(scene), [scene, onSceneChange]);
  useEffect(() => onGameChange(game), [game, onGameChange]);

  return null;
};

export function initGUI(
    onLightsChange: (values: any) => void, 
    onBloomChange: (values: any) => void,
    onSceneChange: (values: any) => void,
    onGameChange: (values: any) => void
) {
  try {
    if (!document.body) {
        setTimeout(() => initGUI(onLightsChange, onBloomChange, onSceneChange, onGameChange), 100);
        return;
    }
    
    let container = document.getElementById('leva-gui-root');
    if (!container) {
        container = document.createElement('div');
        container.id = 'leva-gui-root';
        document.body.appendChild(container);
    }
    
    const root = createRoot(container!);
    root.render(
        <React.StrictMode>
        <Leva 
            oneLineLabels 
            titleBar={{ title: '咖啡沖煮調試面板', drag: true }}
            theme={{
                colors: { accent1: '#f39c12' },
                sizes: { controlWidth: '320px' }
            }}

        />
        <Controls 
            onLightsChange={onLightsChange} 
            onBloomChange={onBloomChange}
            onSceneChange={onSceneChange}
            onGameChange={onGameChange}
        />
        </React.StrictMode>
    );
  } catch (e) {
    console.error("GUI: Error", e);
  }
}
