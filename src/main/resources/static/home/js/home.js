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
            imageManager: this.imageManager
        });
        
        // StatsRenderer에 렌더러 주입
        this.statsRenderer.setRenderer(this.renderer);
    }
    
    // 애플리케이션 초기화
    async init() {
        await this.mapManager.init();
    }
}

// 전역 인스턴스 저장
let globalMapApp = null;

// DOM이 로드되면 초기화
document.addEventListener('DOMContentLoaded', async () => {
    globalMapApp = new MapApplication();
    await globalMapApp.init();
    
    // 업로드 완료 플래그 확인
    checkForPendingMapUpdate();
});

// 업로드 완료 플래그 확인 및 처리
function checkForPendingMapUpdate() {
    const updateFlag = localStorage.getItem('trackery_map_update_needed');
    if (updateFlag) {
        // 플래그 제거
        localStorage.removeItem('trackery_map_update_needed');
        
        // 지도 업데이트 알림 표시
        const notification = showMapUpdateNotification('지도를 업데이트하는 중...', 'info');
        
        // 지도 업데이트 실행 (약간의 지연 후)
        setTimeout(async () => {
            try {
                if (window.trackeryImageUpdated) {
                    await window.trackeryImageUpdated();
                }
                
                // 업데이트 완료 알림
                hideNotification(notification);
                showMapUpdateNotification('지도 업데이트가 완료되었습니다.', 'success');
            } catch (error) {
                console.error('Error in delayed map update:', error);
                hideNotification(notification);
                showMapUpdateNotification('지도 업데이트 중 오류가 발생했습니다.', 'error');
            }
        }, 500);
    }
}

// 페이지 포커스 시에도 플래그 확인 (다른 탭에서 업로드 후 홈탭으로 돌아온 경우)
window.addEventListener('focus', () => {
    checkForPendingMapUpdate();
});

// postMessage 이벤트 수신 (업로드 페이지에서 즉시 지도 업데이트)
window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'TRACKERY_MAP_UPDATE') {
        try {
            if (window.trackeryImageUpdated) {
                await window.trackeryImageUpdated();
            }
            
            // 업데이트 완료 후 업로드 페이지에 완료 메시지 전송
            if (event.source) {
                event.source.postMessage({
                    type: 'TRACKERY_MAP_UPDATE_COMPLETE',
                    timestamp: Date.now()
                }, event.origin);
            }
        } catch (error) {
            console.error('Error in immediate map update from message:', error);
            
            // 에러 발생시에도 완료 메시지 전송 (새로고침을 위해)
            if (event.source) {
                event.source.postMessage({
                    type: 'TRACKERY_MAP_UPDATE_COMPLETE',
                    timestamp: Date.now()
                }, event.origin);
            }
        }
    }
});

// 전역 함수: 이미지 업로드/수정/삭제 후 호출
window.trackeryImageUpdated = async function() {
    if (globalMapApp && globalMapApp.mapManager) {
        await globalMapApp.mapManager.onImageUpdated();
    }
};

// 전역 함수: 앨범 생성/수정/삭제 후 호출
window.trackeryAlbumUpdated = async function() {
    if (globalMapApp && globalMapApp.mapManager) {
        // 앨범 작업은 지역 색상에는 영향 없고 통계만 업데이트
        if (globalMapApp.mapManager.isUserLoggedIn()) {
            await globalMapApp.mapManager.refreshUserStats();
        }
    }
};

// 전역 함수: 통계만 새로고침 (다른 페이지에서 돌아왔을 때 등)
window.trackeryRefreshStats = async function() {
    if (globalMapApp && globalMapApp.mapManager) {
        if (globalMapApp.mapManager.isUserLoggedIn()) {
            await globalMapApp.mapManager.refreshUserStats();
        }
    }
};

// 전역 함수: 캐시 전체 삭제 (로그아웃 시 등)
window.trackeryClearCache = function() {
    if (globalMapApp && globalMapApp.mapManager) {
        globalMapApp.mapManager.clearAllCache();
    }
};

// 지도 업데이트 알림 메시지 표시
function showMapUpdateNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'map-update-notification';
    notification.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; padding: 12px 20px;
        border-radius: 6px; color: white; font-weight: 500; z-index: 5000;
        animation: slideInNotification 0.3s ease; max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;

    // 타입별 배경색 설정
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        info: '#007bff'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;

    // 애니메이션 스타일 추가
    if (!document.querySelector('#map-notification-styles')) {
        const style = document.createElement('style');
        style.id = 'map-notification-styles';
        style.textContent = `
            @keyframes slideInNotification {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // info 타입이 아닌 경우 3초 후 자동 제거
    if (type !== 'info') {
        setTimeout(() => {
            hideNotification(notification);
        }, 3000);
    }

    return notification;
}

// 알림 숨기기
function hideNotification(notification) {
    if (notification && notification.parentNode) {
        notification.style.animation = 'slideInNotification 0.3s ease reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }
}
