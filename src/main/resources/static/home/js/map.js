import { MapManager } from './mapManager.js';
import { MapRenderer } from './mapRenderer.js';
import { ImageManager } from './imageManager.js';
import { ModalManager } from './modalManager.js';
import { StatsRenderer } from './statsRenderer.js';

/**
 * 메인 애플리케이션 클래스
 * 모든 모듈들을 초기화하고 의존성을 주입하여 연결
 */
class MapApplication {
    constructor() {
        // 모든 모듈 인스턴스 생성
        this.mapManager = new MapManager();
        this.renderer = new MapRenderer();
        this.imageManager = new ImageManager();
        this.modalManager = new ModalManager();
        this.statsRenderer = new StatsRenderer();
        
        // 의존성 주입
        this.setupDependencies();
    }
    
    // 모듈 간 의존성 설정
    setupDependencies() {
        // MapManager에 의존성 주입
        this.mapManager.setDependencies({
            renderer: this.renderer,
            imageManager: this.imageManager,
            modalManager: this.modalManager,
            statsRenderer: this.statsRenderer
        });
        
        // ImageManager에 모달 매니저 주입
        this.imageManager.setModalManager(this.modalManager);
        
        // ModalManager에 의존성 주입
        this.modalManager.setDependencies({
            mapManager: this.mapManager,
            imageManager: this.imageManager,
            statsRenderer: this.statsRenderer
        });
        
        // StatsRenderer에 렌더러 주입
        this.statsRenderer.setRenderer(this.renderer);
    }
    
    // 애플리케이션 초기화
    async init() {
        await this.mapManager.init();
    }
}

// DOM이 로드되면 초기화
document.addEventListener('DOMContentLoaded', async () => {
    const app = new MapApplication();
    await app.init();
});