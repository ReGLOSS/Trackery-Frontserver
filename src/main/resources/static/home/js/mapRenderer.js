/**
 * SVG 지도 렌더링, 좌표 변환, 마우스 이벤트를 담당하는 클래스
 */
export class MapRenderer {
    constructor() {
        this.svgBounds = {
            north: 38.7,
            south: 33.0,
            west: 124.5,
            east: 131.9
        };
    }
    
    // SVG 지도 로드
    async loadSvgMap(svgPath) {
        const response = await fetch(svgPath);
        if (!response.ok) {
            throw new Error(`Failed to load SVG: ${svgPath}`);
        }
        
        const svgContent = await response.text();
        const mapDisplay = document.getElementById('map-display');
        if (mapDisplay) {
            mapDisplay.innerHTML = svgContent;
            this.bindMapMouseEvents();
        }
    }
    
    // 지도 마우스 이벤트 바인딩
    bindMapMouseEvents() {
        const svg = document.querySelector('#map-display svg');
        const coordinatesDisplay = document.getElementById('coordinatesDisplay');
        const coordinatesText = document.getElementById('coordinatesText');
        
        if (!svg || !coordinatesDisplay || !coordinatesText) return;
        
        svg.addEventListener('mouseenter', () => {
            coordinatesDisplay.style.display = 'block';
        });
        
        svg.addEventListener('mouseleave', () => {
            coordinatesDisplay.style.display = 'none';
        });
        
        svg.addEventListener('mousemove', (e) => {
            const svgRect = svg.getBoundingClientRect();
            const svgBox = svg.viewBox.baseVal;
            
            const x = (e.clientX - svgRect.left) / svgRect.width * svgBox.width + svgBox.x;
            const y = (e.clientY - svgRect.top) / svgRect.height * svgBox.height + svgBox.y;
            
            const coords = this.svgToLatLng(x, y);
            if (coords) {
                const latDir = coords.lat >= 0 ? 'N' : 'S';
                const lngDir = coords.lng >= 0 ? 'E' : 'W';
                coordinatesText.innerHTML = 
                    `${Math.abs(coords.lat).toFixed(3)}° ${latDir}<br>${Math.abs(coords.lng).toFixed(3)}° ${lngDir}`;
            }
        });
    }
    
    // SVG 좌표를 위경도로 변환
    svgToLatLng(x, y) {
        const svg = document.querySelector('#map-display svg');
        if (!svg) return null;
        
        const viewBox = svg.viewBox.baseVal;
        
        const lat = this.svgBounds.north - (y / viewBox.height) * (this.svgBounds.north - this.svgBounds.south);
        const lng = this.svgBounds.west + (x / viewBox.width) * (this.svgBounds.east - this.svgBounds.west);
        
        return { lat, lng };
    }
    
    // 지도 제목 업데이트
    updateMapTitle(title) {
        const mapTitle = document.getElementById('map-title');
        if (mapTitle) {
            mapTitle.textContent = title;
        }
    }
    
    // 지도 제목 클리어
    clearMapTitle() {
        const mapTitle = document.getElementById('map-title');
        if (mapTitle) {
            mapTitle.textContent = '';
        }
    }
    
    // 로딩 메시지 표시
    showLoading() {
        const mapDisplay = document.getElementById('map-display');
        if (mapDisplay) {
            mapDisplay.innerHTML = '<div class="loading">지도를 불러오는 중...</div>';
        }
    }
    
    // 에러 메시지 표시
    showError(message) {
        const mapDisplay = document.getElementById('map-display');
        if (mapDisplay) {
            mapDisplay.innerHTML = `<div class="alert alert-danger">${message}</div>`;
        }
    }
}