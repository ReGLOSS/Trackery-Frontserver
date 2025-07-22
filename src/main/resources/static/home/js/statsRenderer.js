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
        
        if (!userStats) {
            // 로그인하지 않은 사용자에게는 로그인 안내 메시지 표시
            container.innerHTML = `
                <div class="user-stats-simple">
                    <div class="stats-text">
                        <a href="/login" class="login-link">로그인하여 통계 보기</a>
                    </div>
                </div>
            `;
            
            // 로그인하지 않은 사용자에게도 좌표 표시 영역 추가
            const coordinatesDiv = this.createCoordinatesDisplay();
            container.appendChild(coordinatesDiv);
            
            // 좌표 표시 div가 생성된 후 마우스 이벤트 바인딩
            this.bindMapMouseEventsIfNeeded();
            return;
        }
        
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
        
        // 좌표 표시 영역을 stats 밑에 별도로 추가
        const coordinatesDiv = this.createCoordinatesDisplay();
        container.appendChild(coordinatesDiv);
        
        // 좌표 표시 div가 생성된 후 마우스 이벤트 바인딩
        this.bindMapMouseEventsIfNeeded();
    }
    
    // 좌표 표시 영역 생성
    createCoordinatesDisplay() {
        const coordinatesDiv = document.createElement('div');
        coordinatesDiv.className = 'coordinates-display';
        coordinatesDiv.id = 'coordinatesDisplay';
        coordinatesDiv.innerHTML = '<span id="coordinatesText">37.598° N<br>126.970° E</span>';
        
        return coordinatesDiv;
    }
    
    // 마우스 이벤트 바인딩 (renderer가 있는 경우에만)
    bindMapMouseEventsIfNeeded() {
        if (this.renderer) {
            this.renderer.bindMapMouseEvents();
        }
    }
    
    // 객체 속성을 재귀적으로 검사하는 헬퍼 함수
    inspectObjectProperties(obj, indent = '') {
        if (!obj || typeof obj !== 'object') {
            console.log(`${indent}(primitive value)`);
            return;
        }
        
        Object.keys(obj).forEach(key => {
            const value = obj[key];
            const type = Array.isArray(value) ? 'array' : typeof value;
            
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                console.log(`${indent}${key}: (object)`);
                // 무한 루프를 피하기 위해 너무 깊게 재귀하지 않음
                if (indent.length < 8) {
                    this.inspectObjectProperties(value, indent + '  ');
                }
            } else {
                console.log(`${indent}${key}: (${type})`, value);
            }
        });
    }
    
    // 중첩된 객체 경로에서 값을 추출하는 헬퍼 함수
    extractValue(obj, paths, defaultValue = null) {
        for (const path of paths) {
            const value = this.getNestedValue(obj, path);
            if (value !== null && value !== undefined && value !== '') {
                return value;
            }
        }
        return defaultValue;
    }
    
    // 경로 문자열로 중첩된 객체 값을 가져오는 헬퍼 함수
    getNestedValue(obj, path) {
        if (!obj || typeof obj !== 'object') return null;
        
        return path.split('.').reduce((current, key) => {
            return (current && current[key] !== undefined) ? current[key] : null;
        }, obj);
    }
}