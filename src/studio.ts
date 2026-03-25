/* studio.ts */
/// <reference types="vite/client" />
import { getProject } from '@theatre/core';

// 僅在開發環境中初始化 Theater.js Studio
if (import.meta.env.DEV) {
  console.log("Theater.js: Initializing...");
  import('@theatre/studio').then((m) => {
    // 深度搜尋 initialize 函式
    const findInit = (obj: any): Function | null => {

        if (!obj) return null;
        if (typeof obj.initialize === 'function') return obj.initialize;
        if (obj.default) return findInit(obj.default);
        if (obj.studio) return findInit(obj.studio);
        return null;
    };

    const initFn = findInit(m);
    if (initFn) {
        initFn();
        console.log("Theater.js: Studio initialized successfully");
    } else {
        console.warn("Theater.js: Could not find initialize in mod:", m);
    }
  }).catch(err => {
    console.error("Theater.js: Studio dynamic import failed", err);
  });
}

const project = getProject('GoBrew');
const sheet = project.sheet('Main Scene');

export { project, sheet };
