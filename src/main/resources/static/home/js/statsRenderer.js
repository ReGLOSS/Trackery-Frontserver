/**
 * 사용자 통계 렌더링과 좌표 표시를 담당하는 클래스
 */
export class StatsRenderer {
    constructor() {
        this.renderer = null;
    }
    
    // 의존성 주입
    setRenderer(renderer) {
        this.renderer = renderer;
    }
    
    // 통계 표시 업데이트
    updateStatsDisplay(currentView, userStats) {
        const detailContainer = document.querySelector('.detail-container');
        if (!detailContainer) return;
        
        // 전국지도(sido)일 때만 통계 표시
        if (currentView === 'sido') {
            this.renderUserStats(detailContainer, userStats);
        } else {
            // 시도지도나 상세보기일 때는 통계 숨김
            detailContainer.innerHTML = '';
        }
    }
    
    // 사용자 통계 렌더링
    renderUserStats(container, userStats) {
        console.log('renderUserStats called with userStats:', userStats);
        
        // 디버깅을 위한 로그
        console.log('albumCount:', userStats.albumCount);
        console.log('imageCount:', userStats.imageCount);
        console.log('sigunguCount:', userStats.sigunguCount);
        
        const albumCount = userStats.albumCount || 0;
        const imageCount = userStats.imageCount || 0;
        const sigunguCount = userStats.sigunguCount || userStats.visitedRegionCount || 0;
        
        const statsHtml = `
            <div class="user-stats-simple">
                <div class="stats-text">
                    <div class="stat-line indent-0">
                        <span class="number">${imageCount}</span><span class="label">Picture</span>
                    </div>
                    <div class="stat-line indent-1">
                        <span class="number">${sigunguCount}</span><span class="label">Place</span>
                    </div>
                    <div class="stat-line indent-2">
                        <span class="number">${albumCount}</span><span class="label">Album</span>
                    </div>
                </div>
            </div>
        `;
        
        console.log('Generated HTML:', statsHtml);
        container.innerHTML = statsHtml;
        
        // 좌표 표시 div가 생성된 후 마우스 이벤트 바인딩
        this.bindMapMouseEventsIfNeeded();
    }
    
    // 좌표 표시 영역 초기화 (map-header 내의 coordinates-display 사용)
    initializeCoordinatesDisplay() {
        const coordinatesDisplay = document.querySelector('.map-header .coordinates-display');
        if (coordinatesDisplay) {
            coordinatesDisplay.innerHTML = '<span id="coordinatesText">37° 35′ 53″ N 126° 58′ 12″ E</span>';
        }
    }
    
    // 마우스 이벤트 바인딩 (renderer가 있는 경우에만)
    bindMapMouseEventsIfNeeded() {
        // 좌표 표시 영역 초기화
        this.initializeCoordinatesDisplay();
        
        if (this.renderer) {
            this.renderer.bindMapMouseEvents();
        }
    }
}