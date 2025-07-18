class MapManager {
    constructor() {
        this.currentView = 'sido'; // 'sido', 'sigungu', 또는 'detail'
        this.currentSidoId = null;
        this.currentSigunguId = null;
        this.sidoData = null;
        this.sigunguData = null;
        this.userStats = null;
        this.navigationHistory = []; // 뒤로가기 버튼을 위한 탐색 기록 추적

        // 로딩 상태 관리
        this.isLoading = false;
        this.pendingRequests = new Set();

        // API 응답 캐싱 (시군구 데이터만)
        this.cachedSigunguData = new Map();

        // 디바운싱을 위한 타이머
        this.debounceTimers = new Map();

        // 모달 편집 상태 관리
        this.isEditMode = false;
        this.originalModalData = null;

        // 날짜 픽커 인스턴스
        this.modalDatePicker = null;

        // 모달 맵 픽커 데이터
        this.modalFoundLocationData = {longitude: 0, latitude: 0, sdName: "", sggName: "", locationName: ""};

        // 지도 클릭 이벤트 바인딩 상태
        this.mapClickEventBound = false;

        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadUserStats();
        await this.loadSidoView();
    }

    bindEvents() {
        const backBtn = document.getElementById('back-btn');
        backBtn.addEventListener('click', () => this.debouncedGoBack());
        this.bindModalEventsOnce();
    }

    bindModalEventsOnce() {
        const modalEditBtn = document.getElementById('modalEditBtn');
        const modalDeleteBtn = document.getElementById('modalDeleteBtn');
        const modalCancelEditBtn = document.getElementById('modalCancelEditBtn');
        const modalSaveBtn = document.getElementById('modalSaveBtn');
        const modalContent = document.querySelector('#imageDetailModal .modal-content');

        if (modalEditBtn) modalEditBtn.addEventListener('click', () => this.enterEditMode());
        if (modalDeleteBtn) modalDeleteBtn.addEventListener('click', () => this.deleteImage());
        if (modalCancelEditBtn) modalCancelEditBtn.addEventListener('click', () => this.cancelEditMode());
        if (modalSaveBtn) modalSaveBtn.addEventListener('click', () => this.saveImageChanges());
        if (modalContent) modalContent.addEventListener('click', (e) => e.stopPropagation());
    }

    async loadSidoView() {
        if (this.isLoading) return;

        try {
            this.setLoadingState(true);
            this.showLoading();
            this.currentView = 'sido';
            this.currentSidoId = null;
            this.currentSigunguId = null;

            // API에서 시도 데이터 로드
            await this.fetchSidoData();

            // simpleSido.svg 로드
            await this.loadSvgMap('/map/svg/simpleSido.svg');

            // UI 업데이트
            this.updateBackButton();
            this.clearMapTitle();
            this.updateDetailContainerClass();
            this.updateStatsDisplay();

            // 시도 클릭 이벤트 바인딩
            this.bindSidoClickEvents();

            // 이미지가 있는 시도를 초록색으로 표시
            this.styleSidosWithImages();

        } catch (error) {
            console.error('Error loading sido view:', error);
            this.showError('지도를 불러오는 중 오류가 발생했습니다.');
        } finally {
            this.setLoadingState(false);
        }
    }

    async loadSigunguView(sidoId) {
        if (this.isLoading) return;

        try {
            this.setLoadingState(true);
            this.showLoading();

            // 탐색 기록에 추가
            this.navigationHistory.push({
                view: 'sido',
                sidoId: null,
                sigunguId: null
            });

            this.currentView = 'sigungu';
            this.currentSidoId = sidoId;
            this.currentSigunguId = null;

            // 시군구 데이터에 시도 정보가 포함되어 있으므로 여기서 시도 이름 가져오기
            let sidoName = '지역';

            // 먼저 기존 시도 데이터에서 가져오기 시도
            const sidoInfo = Array.isArray(this.sidoData) ?
                this.sidoData.find(sido => String(sido.sd_id || sido.id || sido.sidoId) === String(sidoId)) : null;

            if (sidoInfo) {
                sidoName = sidoInfo.sd_name || sidoInfo.name || sidoInfo.sidoName || '지역';
            }

            console.log('Loading sigungu for:', sidoId, 'Found sido info:', sidoInfo, 'Name:', sidoName);

            // API에서 시군구 데이터 로드 (캐싱된 데이터 사용)
            await this.fetchSigunguDataCached(sidoId);

            // 여전히 시도 이름이 없다면 시군구 데이터에서 가져오기
            if (sidoName === '지역' && this.sigunguData && this.sigunguData.length > 0) {
                const firstSigungu = this.sigunguData[0];
                if (firstSigungu.sido && firstSigungu.sido.sidoName) {
                    sidoName = firstSigungu.sido.sidoName;
                }
            }

            // 해당하는 시군구 SVG 로드
            const svgPath = this.getSigunguSvgPath(sidoId);
            await this.loadSvgMap(svgPath);

            // UI 업데이트
            this.updateMapTitle(sidoName);
            this.updateBackButton();
            this.updateDetailContainerClass();
            this.updateStatsDisplay();

            // 시군구 클릭 이벤트 바인딩
            this.bindSigunguClickEvents();

        } catch (error) {
            console.error('Error loading sigungu view:', error);
            this.showError('시군구 지도를 불러오는 중 오류가 발생했습니다.');
        } finally {
            this.setLoadingState(false);
        }
    }

    async fetchSidoData() {
        const response = await fetch('/api/location/sido');
        if (!response.ok) {
            throw new Error('Failed to fetch sido data');
        }
        const data = await response.json();
        // sidoData가 배열인지 확인
        this.sidoData = Array.isArray(data) ? data : (data.data || []);
    }

    async fetchSigunguData(sidoId) {
        const response = await fetch(`/api/location/sido/${sidoId}/sigungu`);
        if (!response.ok) {
            throw new Error('Failed to fetch sigungu data');
        }
        const data = await response.json();
        // sigunguData가 배열인지 확인
        this.sigunguData = Array.isArray(data) ? data : (data.data || []);

    }

    async loadUserStats() {
        try {
            const response = await fetch('/api/location/home/stats', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            });

            if (response.status === 401) {
                console.log('User not authenticated, stats will not be displayed');
                this.userStats = null;
                return;
            }

            if (!response.ok) {
                console.warn(`Failed to fetch user stats: ${response.status} ${response.statusText}`);
                this.userStats = null;
                return;
            }

            const responseData = await response.json();
            console.log('User stats response:', responseData);

            // API 응답이 { code: 200, message: "Ok", data: { stats: {...} } } 형태인 경우 처리
            if (responseData.data && responseData.data.stats) {
                this.userStats = responseData.data.stats;
            } else if (responseData.data) {
                this.userStats = responseData.data;
            } else {
                this.userStats = responseData;
            }
            console.log('User stats loaded:', this.userStats);
        } catch (error) {
            console.error('Error loading user stats:', error);
            this.userStats = null;
        }
    }

    async fetchSigunguDetail(sigunguId) {
        const response = await fetch(`/api/location/sigungu/${sigunguId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch sigungu detail');
        }
        const data = await response.json();


        // 상세 시군구 데이터 처리
        this.processSigunguDetail(data);

        return data;
    }

    processSigunguDetail(sigunguDetail) {
        // UI에 표시하지 않고 상세 시군구 데이터 처리
    }


    async loadSvgMap(svgPath) {
        const response = await fetch(svgPath);
        if (!response.ok) {
            throw new Error(`Failed to load SVG: ${svgPath}`);
        }

        const svgContent = await response.text();
        const mapDisplay = document.getElementById('map-display');
        mapDisplay.innerHTML = svgContent;
        
        this.bindMapMouseEvents();
    }

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

    svgToLatLng(x, y) {
        const svgBounds = {
            north: 38.7,
            south: 33.0,
            west: 124.5,
            east: 131.9
        };
        
        const svg = document.querySelector('#map-display svg');
        if (!svg) return null;
        
        const viewBox = svg.viewBox.baseVal;
        
        const lat = svgBounds.north - (y / viewBox.height) * (svgBounds.north - svgBounds.south);
        const lng = svgBounds.west + (x / viewBox.width) * (svgBounds.east - svgBounds.west);
        
        return { lat, lng };
    }

    bindSidoClickEvents() {
        const paths = document.querySelectorAll('#map-display path');
        paths.forEach(path => {
            path.addEventListener('click', (e) => {
                if (this.isLoading) return;

                const sidoId = e.target.id;
                if (sidoId) {
                    // 시도 정보를 찾아서 이름만 표시
                    const sidoInfo = this.sidoData?.find(sido => String(sido.sd_id) === String(sidoId));
                    const sidoName = sidoInfo ? (sidoInfo.sd_name || sidoInfo.name || sidoInfo.sidoName || '지역') : '지역';

                    // 시도 이름만 표시하고 시군구 지도로 이동
                    this.updateMapTitle(sidoName);
                    this.loadSigunguView(sidoId);

                    // 시도 클릭 시 해당 시도의 이미지들 로드
                    this.loadSidoImages(sidoId);
                }
            });
        });
    }

    bindSigunguClickEvents() {
        const paths = document.querySelectorAll('#map-display path');
        paths.forEach(path => {
            path.addEventListener('click', (e) => {
                if (this.isLoading) return;

                const sigunguId = e.target.id;
                if (sigunguId) {
                    this.handleSigunguClick(sigunguId);
                }
            });
        });

        // 이미지가 있는 시군구를 초록색으로 표시
        this.styleDistrictsWithImages();
    }

    async styleDistrictsWithImages() {
        if (!this.sigunguData) return;

        const paths = document.querySelectorAll('#map-display path');

        for (const sigungu of this.sigunguData) {
            const sigunguId = sigungu.sigunguId;
            const pathElement = document.getElementById(sigunguId);

            if (pathElement) {
                // 해당 시군구의 이미지 개수 확인
                const hasImages = await this.checkSigunguHasImages(sigunguId);

                if (hasImages) {
                    pathElement.style.fill = '#28a745'; // 초록색
                    pathElement.classList.add('has-images');
                }
            }
        }
    }

    async checkSigunguHasImages(sigunguId) {
        try {
            const response = await fetch(`/api/location/sigungu/${sigunguId}/images`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            });

            if (response.ok) {
                const responseData = await response.json();
                const images = responseData.data || [];
                return images.length > 0;
            }
            return false;
        } catch (error) {
            console.error('Error checking sigungu images:', error);
            return false;
        }
    }

    async handleSigunguClick(sigunguId) {
        if (this.isLoading) return;

        // 상세 뷰로 전환하기 전에 탐색 기록에 추가
        this.navigationHistory.push({
            view: 'sigungu',
            sidoId: this.currentSidoId,
            sigunguId: null
        });

        this.currentView = 'detail';
        this.currentSigunguId = sigunguId;

        // 이전 선택 제거
        document.querySelectorAll('.region-path.selected').forEach(el => {
            el.classList.remove('selected');
        });

        // 클릭한 요소에 선택 추가
        const clickedPath = document.getElementById(sigunguId);
        if (clickedPath) {
            clickedPath.classList.add('selected');
        }

        // 시군구 정보를 찾아서 시군구 이름 표시
        const sigunguInfo = this.sigunguData?.find(sgg => String(sgg.sigunguId) === String(sigunguId));
        if (sigunguInfo) {
            const sigunguName = sigunguInfo.sigunguName || sigunguInfo.name || '시군구';
            // 지도 제목을 시군구 이름으로 업데이트
            this.updateMapTitle(sigunguName);
        }

        // 뒤로가기 버튼 가시성 업데이트
        this.updateBackButton();

        // 시군구 클릭 시 해당 시군구의 이미지들 로드
        this.loadSigunguImages(sigunguId);

        // 백엔드에서 상세 시군구 데이터 가져오기
        try {
            await this.fetchSigunguDetail(sigunguId);
        } catch (error) {
            console.error('Error fetching sigungu detail:', error);
        }
    }

    getSigunguSvgPath(sidoId) {
        // 시도 ID를 SVG 파일명에 매핑
        const sidoSvgMap = {
            '11': 'seoul.svg',
            '21': 'busan.svg',
            '22': 'daegu.svg',
            '23': 'incheon.svg',
            '24': 'gwangju.svg',
            '25': 'daejeon.svg',
            '26': 'ulsan.svg',
            '29': 'sejong.svg',
            '31': 'gyeonggi-do.svg',
            '32': 'gangwon-do.svg',
            '33': 'chungcheongbuk-do.svg',
            '34': 'chungcheongnam-do.svg',
            '35': 'jeollabuk-do.svg',
            '36': 'jeollanam-do.svg',
            '37': 'gyeongsangbuk-do.svg',
            '38': 'gyeongsangnam-do.svg',
            '39': 'jeju.svg'
        };

        const filename = sidoSvgMap[sidoId];
        if (!filename) {
            throw new Error(`No SVG mapping found for sido ID: ${sidoId}`);
        }

        return `/map/svg/sigungu/${filename}`;
    }

    goBack() {
        if (this.isLoading) return;

        if (this.currentView === 'detail') {
            // 상세 뷰에서 시군구 뷰로 돌아가기
            this.loadSigunguViewWithoutHistory(this.currentSidoId);
        } else if (this.currentView === 'sigungu') {
            // 시군구 뷰에서 시도 뷰로 돌아가기
            this.loadSidoView();
        } else if (this.currentView === 'sido') {
            // 시도 뷰에서는 뒤로가기 버튼이 숨겨져야 함
            this.loadSidoView();
        }
    }

    // 디바운싱된 뒤로가기 함수
    debouncedGoBack() {
        this.debounce('goBack', () => this.goBack(), 300);
    }

    // 디바운싱 유틸리티
    debounce(key, func, wait) {
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }

        const timeout = setTimeout(() => {
            func();
            this.debounceTimers.delete(key);
        }, wait);

        this.debounceTimers.set(key, timeout);
    }

    // 로딩 상태 관리
    setLoadingState(isLoading) {
        this.isLoading = isLoading;
    }

    // 캐싱된 시군구 데이터 가져오기
    async fetchSigunguDataCached(sidoId) {
        const cacheKey = `sigungu_${sidoId}`;

        if (this.cachedSigunguData.has(cacheKey)) {
            this.sigunguData = this.cachedSigunguData.get(cacheKey);
            return;
        }

        await this.fetchSigunguData(sidoId);
        this.cachedSigunguData.set(cacheKey, this.sigunguData);
    }

    async loadSigunguViewWithoutHistory(sidoId) {
        // loadSigunguView와 동일하지만 기록에 추가하지 않음
        if (this.isLoading) return;

        try {
            this.setLoadingState(true);
            this.showLoading();

            this.currentView = 'sigungu';
            this.currentSidoId = sidoId;
            this.currentSigunguId = null;

            // 이전 선택 상태 초기화
            document.querySelectorAll('.region-path.selected').forEach(el => {
                el.classList.remove('selected');
            });

            // 시군구 데이터에 시도 정보가 포함되어 있으므로 여기서 시도 이름 가져오기
            let sidoName = '지역';

            // 먼저 기존 시도 데이터에서 가져오기 시도
            const sidoInfo = Array.isArray(this.sidoData) ?
                this.sidoData.find(sido => String(sido.sd_id || sido.id || sido.sidoId) === String(sidoId)) : null;

            if (sidoInfo) {
                sidoName = sidoInfo.sd_name || sidoInfo.name || sidoInfo.sidoName || '지역';
            }

            // API에서 시군구 데이터 로드 (캐싱된 데이터 사용)
            await this.fetchSigunguDataCached(sidoId);

            // 여전히 시도 이름이 없다면 시군구 데이터에서 가져오기
            if (sidoName === '지역' && this.sigunguData && this.sigunguData.length > 0) {
                const firstSigungu = this.sigunguData[0];
                if (firstSigungu.sido && firstSigungu.sido.sidoName) {
                    sidoName = firstSigungu.sido.sidoName;
                }
            }

            // 해당하는 시군구 SVG 로드
            const svgPath = this.getSigunguSvgPath(sidoId);
            await this.loadSvgMap(svgPath);

            // UI 업데이트
            this.updateMapTitle(sidoName);
            this.updateBackButton();
            this.updateDetailContainerClass();
            this.updateStatsDisplay();

            // 시군구 클릭 이벤트 바인딩
            this.bindSigunguClickEvents();

            // 시도 이미지 로드 (뒤로가기 시)
            this.loadSidoImages(sidoId);

        } catch (error) {
            console.error('Error loading sigungu view:', error);
            this.showError('시군구 지도를 불러오는 중 오류가 발생했습니다.');
        } finally {
            this.setLoadingState(false);
        }
    }

    updateMapTitle(title) {
        document.getElementById('map-title').textContent = title;
    }

    clearMapTitle() {
        document.getElementById('map-title').textContent = '';
    }


    updateBackButton() {
        const backBtn = document.getElementById('back-btn');
        if (this.currentView === 'sido') {
            backBtn.style.display = 'none';
        } else {
            backBtn.style.display = 'block';
        }
    }

    showLoading() {
        const mapDisplay = document.getElementById('map-display');
        mapDisplay.innerHTML = '<div class="loading">지도를 불러오는 중...</div>';
    }

    showError(message) {
        const mapDisplay = document.getElementById('map-display');
        mapDisplay.innerHTML = `<div class="alert alert-danger">${message}</div>`;
    }

    updateDetailContainerClass() {
        const detailContainer = document.querySelector('.detail-container');
        if (detailContainer) {
            if (this.currentView === 'sigungu') {
                detailContainer.classList.add('sigungu-view');
            } else {
                detailContainer.classList.remove('sigungu-view');
            }
        }
    }

    updateStatsDisplay() {
        const detailContainer = document.querySelector('.detail-container');
        if (!detailContainer) return;

        // 전국지도(sido)일 때만 통계 표시
        if (this.currentView === 'sido') {
            this.renderUserStats(detailContainer);
        } else {
            // 시도지도나 상세보기일 때는 통계 숨김
            detailContainer.innerHTML = '';
        }
    }

    renderUserStats(container) {
        console.log('renderUserStats called with userStats:', this.userStats);

        if (!this.userStats) {
            // 로그인하지 않은 사용자에게는 로그인 안내 메시지 표시
            container.innerHTML = `
                <div class="user-stats-simple">
                    <div class="stats-text">
                        <a href="/login" class="login-link">로그인하여 통계 보기</a>
                    </div>
                </div>
            `;
            
            // 로그인하지 않은 사용자에게도 좌표 표시 영역 추가
            const coordinatesDiv = document.createElement('div');
            coordinatesDiv.className = 'coordinates-display';
            coordinatesDiv.id = 'coordinatesDisplay';
            coordinatesDiv.style.cssText = 'margin-top: 20px; font-size: 18px; font-weight: 500; color: #343a40; letter-spacing: 1px; display: none;';
            coordinatesDiv.innerHTML = '<span id="coordinatesText">37.598° N<br>126.970° E</span>';
            
            container.appendChild(coordinatesDiv);
            
            // 좌표 표시 div가 생성된 후 마우스 이벤트 바인딩
            this.bindMapMouseEvents();
            return;
        }

        // 디버깅을 위한 로그
        console.log('albumCount:', this.userStats.albumCount);
        console.log('imageCount:', this.userStats.imageCount);
        console.log('sigunguCount:', this.userStats.sigunguCount);

        const albumCount = this.userStats.albumCount || 0;
        const imageCount = this.userStats.imageCount || 0;
        const sigunguCount = this.userStats.sigunguCount || this.userStats.visitedRegionCount || 0;

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
        const coordinatesDiv = document.createElement('div');
        coordinatesDiv.className = 'coordinates-display';
        coordinatesDiv.id = 'coordinatesDisplay';
        coordinatesDiv.style.cssText = 'margin-top: 20px; font-size: 18px; font-weight: 500; color: #343a40; letter-spacing: 1px; display: none;';
        coordinatesDiv.innerHTML = '<span id="coordinatesText">37.598° N, 126.970° E</span>';
        
        container.appendChild(coordinatesDiv);
        
        // 좌표 표시 div가 생성된 후 마우스 이벤트 바인딩
        this.bindMapMouseEvents();
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

    // 시도별 이미지 로드 (캐싱 없이 직접 로드)
    async loadSidoImages(sidoId) {
        try {
            const response = await fetch(`/api/location/sido/${sidoId}/images`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            });

            if (!response.ok) {
                console.error('Failed to fetch sido images:', response.status);
                return;
            }

            const responseData = await response.json();
            console.log('Sido images response:', responseData);
            const images = responseData.data || [];

            this.displayImages(images, 'sido');
        } catch (error) {
            console.error('Error loading sido images:', error);
        }
    }

    // 시군구별 이미지 로드 (캐싱 없이 직접 로드)
    async loadSigunguImages(sigunguId) {
        try {
            const response = await fetch(`/api/location/sigungu/${sigunguId}/images`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            });

            if (!response.ok) {
                console.error('Failed to fetch sigungu images:', response.status);
                return;
            }

            const responseData = await response.json();
            console.log('Sigungu images response:', responseData);
            const images = responseData.data || [];

            this.displayImages(images, 'sigungu');
        } catch (error) {
            console.error('Error loading sigungu images:', error);
        }
    }

    // 이미지 표시
    displayImages(images, type) {
        const detailContainer = document.querySelector('.detail-container');

        if (!images || images.length === 0) {
            detailContainer.innerHTML = `
                <div class="no-images">
                    <p>해당 지역에 등록된 이미지가 없습니다.</p>
                </div>
            `;
            return;
        }

        const imageGridHtml = `
            <div class="region-image-gallery">
                <div class="gallery-section">
                    <div class="gallery-content region-gallery-grid">
                        ${images.map(image => `
                            <div class="gallery-card region-image-card" 
                                 data-image-id="${image.imageId}">
                                <img src="${image.thumbnailUrl}" alt="이미지" 
                                     loading="lazy" onerror="this.src='/images/placeholder.jpg'">
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        detailContainer.innerHTML = imageGridHtml;

        // 이미지 클릭 이벤트 바인딩
        this.bindImageClickEvents();
    }

    // 이미지 클릭 이벤트 바인딩
    bindImageClickEvents() {
        const imageCards = document.querySelectorAll('.region-image-card');
        imageCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const imageId = card.dataset.imageId;
                this.showImageDetail(imageId);
            });
        });
    }

    // 이미지 상세 보기
    async showImageDetail(imageId) {
        console.log('=== SHOWING IMAGE DETAIL ===');
        console.log('Image ID:', imageId);

        try {
            // 원본 이미지 상세 정보를 API에서 가져오기
            const response = await fetch(`/api/images/${imageId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch image detail: ${response.status}`);
            }

            const responseData = await response.json();
            const imageData = responseData.data;

            console.log('Fetched image data:', imageData);

            // 모달에 원본 이미지 데이터 채우기
            this.populateImageModal(imageData);

            // 모달 표시
            this.showModal();

        } catch (error) {
            console.error('Error fetching image detail:', error);
            alert('이미지 상세 정보를 불러올 수 없습니다.');
        }

        console.log('=== END SHOWING IMAGE DETAIL ===');
    }

    // 모달에 이미지 데이터 채우기
    populateImageModal(imageData) {
        // 이미지
        const modalImage = document.getElementById('modalImage');
        modalImage.src = imageData.imageUrl || '/images/default-image4.webp';
        modalImage.alt = imageData.imageName || '이미지';

        // 설명 - imageContent가 있으면 사용, 없으면 빈 문자열
        const modalDescription = document.getElementById('modalDescription');
        modalDescription.value = imageData.imageContent || '';

        // 태그
        const modalTagBox = document.getElementById('modalTagBox');
        modalTagBox.innerHTML = '';
        
        // 태그 추가 버튼과 입력 필드를 위한 컨테이너 생성
        const tagAddButton = document.createElement('button');
        tagAddButton.className = 'tag-add';
        tagAddButton.textContent = '+';
        tagAddButton.style.display = 'none'; // 편집 모드가 아닐 때는 숨김
        tagAddButton.id = 'modalTagAddButton';
        
        const tagInput = document.createElement('input');
        tagInput.type = 'text';
        tagInput.className = 'tag-input';
        tagInput.placeholder = '태그 입력 후 Enter';
        tagInput.style.display = 'none'; // 기본적으로 숨김
        tagInput.id = 'modalTagInput';
        
        // 태그 추가 버튼 클릭 이벤트 리스너
        tagAddButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.showTagInput();
        });
        
        // 태그 입력 필드 키다운 이벤트 리스너
        tagInput.addEventListener('keydown', (e) => {
            this.handleTagInputKeydown(e);
        });

        if (imageData.tags && imageData.tags.length > 0) {
            imageData.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                
                // 태그 객체에서 tagId와 tagName 추출
                const tagId = typeof tag === 'object' ? tag.tagId : null;
                const tagName = typeof tag === 'object' ? (tag.tagName || tag.name || tag) : tag;
                
                tagElement.textContent = tagName;
                tagElement.dataset.tagId = tagId;
                tagElement.dataset.tagName = tagName;
                
                // 편집 모드일 때만 삭제 버튼 표시되도록 설정
                const deleteButton = document.createElement('button');
                deleteButton.className = 'tag-delete';
                deleteButton.innerHTML = '×';
                deleteButton.title = '태그 삭제';
                deleteButton.style.display = 'none'; // 편집 모드가 아닐 때는 숨김
                deleteButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    tagElement.remove();
                });
                
                tagElement.appendChild(deleteButton);
                modalTagBox.appendChild(tagElement);
            });
        }
        
        // 태그 추가 버튼과 입력 필드를 마지막에 추가
        modalTagBox.appendChild(tagInput);
        modalTagBox.appendChild(tagAddButton);

        // 위치 - 시도와 시군구를 모두 표시
        const modalLocationBox = document.getElementById('modalLocationBox');
        let locationText = '';
        if (imageData.sdName && imageData.sggName) {
            locationText = `${imageData.sdName} ${imageData.sggName}`;
        } else if (imageData.sggName) {
            locationText = imageData.sggName;
        } else if (imageData.sdName) {
            locationText = imageData.sdName;
        } 
        modalLocationBox.value = locationText;

        // 날짜 - flatpickr 형식에 맞게 포맷팅
        const modalDateBox = document.getElementById('modalDateBox');
        let dateText = '';
        console.log('=== PROCESSING DATE FOR MODAL ===');
        console.log('Original imageData.imageDate:', imageData.imageDate);

        if (imageData.imageDate) {
            // ISO 날짜 문자열인 경우 flatpickr 형식으로 포맷팅
            if (imageData.imageDate.includes('T') || imageData.imageDate.includes('-')) {
                console.log('Detected ISO date format, converting to flatpickr format');
                dateText = this.formatDateForFlatpickr(imageData.imageDate);
                console.log('formatDateForFlatpickr() result:', dateText);
            } else {
                // 이미 포맷된 문자열인 경우 그대로 사용
                console.log('Using pre-formatted date string');
                dateText = imageData.imageDate;
            }
        } else {
            console.log('No imageDate provided');
        }

        console.log('Final dateText to be set:', dateText);
        modalDateBox.value = dateText;
        console.log('Actual modalDateBox.value after setting:', modalDateBox.value);
        console.log('=== END PROCESSING DATE FOR MODAL ===');

        // 공개 여부 - 읽기 모드에서는 텍스트로 표시 (1=공개, 0=비공개)
        const modalPublicStatus = document.getElementById('modalPublicStatus');
        const modalPublic = document.getElementById('modalPublic');

        const isPublic = imageData.isPublic === 1 || imageData.isPublic === '1' || imageData.isPublic === true;
        modalPublicStatus.textContent = isPublic ? '공개' : '비공개';
        modalPublic.checked = isPublic;

        // 모달 버튼에 imageId 저장
        const modalEditBtn = document.getElementById('modalEditBtn');
        modalEditBtn.dataset.imageId = imageData.imageId;

        // 좌표 교정 (한국 범위 확인: 위도 33-43, 경도 124-132)
        let correctedLatitude = imageData.latitude;
        let correctedLongitude = imageData.longitude;
        
        // 좌표가 뒤바뀐 경우 교정
        if (imageData.latitude >= 124 && imageData.latitude <= 132 && 
            imageData.longitude >= 33 && imageData.longitude <= 43) {
            console.log('Detected swapped coordinates in modal data, correcting...');
            console.log('Original - latitude:', imageData.latitude, 'longitude:', imageData.longitude);
            correctedLatitude = imageData.longitude;  // longitude를 latitude로
            correctedLongitude = imageData.latitude;  // latitude를 longitude로
            console.log('Corrected - latitude:', correctedLatitude, 'longitude:', correctedLongitude);
        }

        // 원본 데이터 저장 (교정된 좌표 사용)
        this.originalModalData = {
            imageContent: imageData.imageContent || '',
            tags: imageData.tags || [],
            isPublic: imageData.isPublic || false,
            imageDate: imageData.imageDate || '',
            sdName: imageData.sdName || '',
            sggName: imageData.sggName || '',
            locationName: locationText,
            latitude: correctedLatitude,
            longitude: correctedLongitude
        };

        // 편집 모드 초기화
        this.isEditMode = false;
        this.updateModalButtonsVisibility();

        // 날짜 피커 초기화
        this.initModalDatePicker();

        // 모달 맵 픽커 초기화
        this.initModalMapPicker();
        
        // 지도에서 보기 버튼 초기화
        this.initViewOnMapButton();
    }

    // 모달 표시
    showModal() {
        const modal = document.getElementById('imageDetailModal');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // 배경 스크롤 방지

        // 모달 이벤트 바인딩
        this.bindModalEvents();
    }

    // 모달 숨기기
    hideModal() {
        const modal = document.getElementById('imageDetailModal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // 배경 스크롤 복원
    }

    // 모달 이벤트 바인딩
    bindModalEvents() {
        const modal = document.getElementById('imageDetailModal');
        const modalOverlay = document.getElementById('modalOverlay');
        const modalClose = document.getElementById('modalClose');

        const closeModal = () => {
            this.hideModal();
            modalOverlay.removeEventListener('click', closeModal);
            modalClose.removeEventListener('click', closeModal);
            document.removeEventListener('keydown', escKeyHandler);
        };

        const escKeyHandler = (e) => {
            if (e.key === 'Escape') {
                if (this.isEditMode) {
                    this.cancelEditMode();
                } else {
                    closeModal();
                }
            }
        };

        modalOverlay.addEventListener('click', closeModal);
        modalClose.addEventListener('click', closeModal);
        document.addEventListener('keydown', escKeyHandler);
    }

    // 날짜 포맷 함수 (한국어 형식)
    formatDate(dateString) {
        if (!dateString) return '';

        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }

    // flatpickr용 날짜 포맷팅 (Y / m / d 형식)
    formatDateForFlatpickr(dateString) {
        if (!dateString) return '';

        try {
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = date.getMonth() + 1; // 0-based이므로 +1
            const day = date.getDate();
            return `${year} / ${month} / ${day}`;
        } catch (error) {
            console.error('Error formatting date for flatpickr:', error);
            return dateString;
        }
    }

    // 이미지가 있는 시도를 색상으로 표시
    async styleSidosWithImages() {
        if (!this.sidoData) return;

        for (const sido of this.sidoData) {
            const sidoId = sido.sd_id || sido.id || sido.sidoId;
            const pathElement = document.getElementById(sidoId);

            if (pathElement) {
                // 해당 시도의 이미지 존재 여부 확인
                const imageStatus = await this.checkSidoHasImages(sidoId);

                console.log(`Sido ${sidoId}: hasAny=${imageStatus.hasAny}, hasAll=${imageStatus.hasAll}`);

                if (imageStatus.hasAll) {
                    // 모든 시군구에 이미지가 있으면 초록색
                    pathElement.style.setProperty('fill', '#28a745', 'important');
                    pathElement.classList.add('has-images');
                    console.log(`Sido ${sidoId} colored GREEN (all districts have images)`);
                } else if (imageStatus.hasAny) {
                    // 일부 시군구에만 이미지가 있으면 노란색
                    pathElement.style.setProperty('fill', '#ffc107', 'important');
                    pathElement.classList.add('has-images');
                    console.log(`Sido ${sidoId} colored YELLOW (some districts have images)`);
                } else {
                    console.log(`Sido ${sidoId} kept default color (no images)`);
                }
                // 아무 시군구에도 이미지가 없으면 기본색 유지 (아무 작업 안함)
            }
        }
    }

    // 시도의 시군구별 이미지 존재 여부 확인
    async checkSidoHasImages(sidoId) {
        try {
            // 먼저 해당 시도의 시군구 목록을 가져옴
            const sigunguResponse = await fetch(`/api/location/sido/${sidoId}/sigungu`);
            if (!sigunguResponse.ok) {
                return { hasAny: false, hasAll: false };
            }

            const sigunguData = await sigunguResponse.json();
            const sigunguList = Array.isArray(sigunguData) ? sigunguData : (sigunguData.data || []);

            if (sigunguList.length === 0) {
                return { hasAny: false, hasAll: false };
            }

            let sigunguWithImages = 0;
            
            // 모든 시군구의 이미지 존재 여부 확인
            for (const sigungu of sigunguList) {
                const sigunguId = sigungu.sigunguId;
                const hasImages = await this.checkSigunguHasImages(sigunguId);

                if (hasImages) {
                    sigunguWithImages++;
                }
            }

            return {
                hasAny: sigunguWithImages > 0,
                hasAll: sigunguWithImages === sigunguList.length
            };
        } catch (error) {
            console.error('Error checking sido images:', error);
            return { hasAny: false, hasAll: false };
        }
    }

    // 편집 모드 진입
    enterEditMode() {
        this.isEditMode = true;

        // 입력 필드들을 편집 가능하게 변경
        const modalDescription = document.getElementById('modalDescription');
        modalDescription.readOnly = false;

        // 공개 설정 UI 변경
        const modalPublicStatus = document.getElementById('modalPublicStatus');
        const modalPublicCheckboxArea = document.getElementById('modalPublicCheckboxArea');

        modalPublicStatus.style.display = 'none';
        modalPublicCheckboxArea.style.display = 'block';

        // 태그 편집 모드 활성화
        this.enableTagEditMode();

        // 날짜 피커 편집 모드 활성화
        if (this.modalDatePicker) {
            this.modalDatePicker.set('clickOpens', true);
            this.modalDatePicker.set('allowInput', true);
        }

        // 버튼 가시성 업데이트
        this.updateModalButtonsVisibility();
        this.updateLocationDateEditButtons();
    }

    // 편집 모드 취소
    cancelEditMode() {
        this.isEditMode = false;

        // 원본 데이터로 복원
        if (this.originalModalData) {
            const modalDescription = document.getElementById('modalDescription');
            const modalPublic = document.getElementById('modalPublic');
            const modalPublicStatus = document.getElementById('modalPublicStatus');
            const modalDateBox = document.getElementById('modalDateBox');
            const modalLocationBox = document.getElementById('modalLocationBox');

            modalDescription.value = this.originalModalData.imageContent;
            modalPublic.checked = this.originalModalData.isPublic;
            modalPublicStatus.textContent = this.originalModalData.isPublic ? '공개' : '비공개';

            // 날짜와 위치도 원본으로 복원
            if (this.originalModalData.imageDate) {
                modalDateBox.value = this.formatDate(this.originalModalData.imageDate);
            }
            if (this.originalModalData.locationName) {
                modalLocationBox.value = this.originalModalData.locationName;
            }

            // 태그도 원본으로 복원
            this.restoreOriginalTags();
        }

        // 입력 필드들을 읽기 전용으로 변경
        const modalDescription = document.getElementById('modalDescription');
        modalDescription.readOnly = true;

        // 공개 설정 UI 변경
        const modalPublicStatus = document.getElementById('modalPublicStatus');
        const modalPublicCheckboxArea = document.getElementById('modalPublicCheckboxArea');

        modalPublicStatus.style.display = 'block';
        modalPublicCheckboxArea.style.display = 'none';

        // 태그 편집 모드 비활성화
        this.disableTagEditMode();

        // 날짜 피커 읽기 모드 비활성화
        if (this.modalDatePicker) {
            this.modalDatePicker.set('clickOpens', false);
            this.modalDatePicker.set('allowInput', false);
        }

        // 버튼 가시성 업데이트
        this.updateModalButtonsVisibility();
        this.updateLocationDateEditButtons();

        // 모달 위치 데이터 리셋 (편집 취소 시)
        this.resetModalMapPickerVariations();
    }

    // 모달 버튼 가시성 업데이트
    updateModalButtonsVisibility() {
        const modalEditBtn = document.getElementById('modalEditBtn');
        const modalDeleteBtn = document.getElementById('modalDeleteBtn');
        const modalCancelEditBtn = document.getElementById('modalCancelEditBtn');
        const modalSaveBtn = document.getElementById('modalSaveBtn');

        if (this.isEditMode) {
            // 편집 모드: 삭제, 수정 취소, 저장 버튼 표시
            modalEditBtn.style.display = 'none';
            modalDeleteBtn.style.display = 'inline-block';
            modalCancelEditBtn.style.display = 'inline-block';
            modalSaveBtn.style.display = 'inline-block';
        } else {
            // 읽기 모드: 수정 버튼만 표시
            modalEditBtn.style.display = 'inline-block';
            modalDeleteBtn.style.display = 'none';
            modalCancelEditBtn.style.display = 'none';
            modalSaveBtn.style.display = 'none';
        }
    }

    // 이미지 변경사항 저장
    async saveImageChanges() {
        const modalEditBtn = document.getElementById('modalEditBtn');
        const imageId = modalEditBtn.dataset.imageId;

        if (!imageId) {
            console.error('Image ID not found');
            return;
        }

        // 현재 모달 데이터 수집
        const modalDescription = document.getElementById('modalDescription');
        const modalPublic = document.getElementById('modalPublic');
        const modalLocationBox = document.getElementById('modalLocationBox');
        const modalDateBox = document.getElementById('modalDateBox');

        // 변경사항만 포함하는 updateData 객체 생성
        const updateData = {};

        // 설명 변경 체크
        if (this.originalModalData.imageContent !== modalDescription.value) {
            updateData.imageContent = modalDescription.value;
        }

        // 공개 설정 변경 체크
        const newIsPublic = modalPublic.checked ? 1 : 0;
        if (this.originalModalData.isPublic !== newIsPublic) {
            updateData.isPublic = newIsPublic;
        }

        // 위치 변경 체크 (맵에서 새로 선택된 경우)
        if (this.modalFoundLocationData.locationName && this.modalFoundLocationData.locationName !== "") {
            // 올바른 좌표 순서로 전송
            updateData.longitude = this.modalFoundLocationData.longitude;
            updateData.latitude = this.modalFoundLocationData.latitude;
            updateData.sdName = this.modalFoundLocationData.sdName;
            updateData.sggName = this.modalFoundLocationData.sggName;
        }

        // 날짜 변경 체크
        if (modalDateBox.value) {
            const newFormattedDate = this.formatDateForAPI(modalDateBox.value);
            if (this.originalModalData.imageDate !== newFormattedDate) {
                updateData.imageDate = newFormattedDate;
            }
        }

        // 태그 변경 체크
        const tagChanges = this.getTagChanges();
        if (tagChanges.tagsToRemove.length > 0) {
            updateData.tagsToRemove = tagChanges.tagsToRemove;
        }
        if (tagChanges.tagsToAdd.length > 0) {
            updateData.tagsToAdd = tagChanges.tagsToAdd;
        }

        console.log('=== SAVE IMAGE CHANGES DEBUG ===');
        console.log('Image ID:', imageId);
        console.log('Original data:', this.originalModalData);
        console.log('Current modal values:', {
            description: modalDescription.value,
            isPublic: newIsPublic,
            locationName: modalLocationBox.value,
            dateValue: modalDateBox.value
        });
        console.log('Map picker data:', this.modalFoundLocationData);
        console.log('Changes detected (updateData):', updateData);
        console.log('=== END DEBUG ===');

        // 변경사항이 없으면 저장하지 않음
        if (Object.keys(updateData).length === 0) {
            console.log('No changes detected, skipping save');
            this.cancelEditMode();
            return;
        }

        try {
            const response = await fetch(`/api/images/${imageId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                throw new Error(`Failed to update image: ${response.status}`);
            }

            // 성공적으로 업데이트됨
            console.log('Image updated successfully');

            // 원본 데이터 업데이트
            if (updateData.imageContent !== undefined) {
                this.originalModalData.imageContent = updateData.imageContent;
            }
            if (updateData.isPublic !== undefined) {
                this.originalModalData.isPublic = updateData.isPublic;
            }
            if (updateData.imageDate) {
                this.originalModalData.imageDate = updateData.imageDate;
            }

            // dataset 업데이트 불필요 (API 기반으로 변경됨)

            // 모달 데이터도 즉시 업데이트 (flatpickr 형식으로 포맷팅)
            if (updateData.imageDate) {
                const modalDateBox = document.getElementById('modalDateBox');
                modalDateBox.value = this.formatDateForFlatpickr(updateData.imageDate);
            }

            // 공개 상태 텍스트 업데이트
            const modalPublicStatus = document.getElementById('modalPublicStatus');
            modalPublicStatus.textContent = updateData.isPublic ? '공개' : '비공개';

            // 편집 모드 해제
            this.cancelEditMode();

            // 위치나 날짜 정보가 변경된 경우 백엔드에서 새로운 태그를 받아오기 위해 모달 데이터 새로고침
            if (updateData.longitude !== undefined || updateData.latitude !== undefined || updateData.imageDate !== undefined) {
                this.refreshCurrentImageList();
                this.refreshMapColors();
                await this.refreshUserStats();
                await this.refreshCurrentModalImageData(imageId);
            }

            // 태그가 변경된 경우 현재 모달의 이미지 데이터 새로고침
            if (updateData.tagsToRemove !== undefined) {
                await this.refreshCurrentModalImageData(imageId);
            }

            // 이제 위치 데이터 리셋 (저장 완료 후)
            this.resetModalMapPickerVariations();

        } catch (error) {
            console.error('Error updating image:', error);
            alert('이미지 업데이트 중 오류가 발생했습니다.');
        }
    }

    // 이미지 삭제
    async deleteImage() {
        const modalEditBtn = document.getElementById('modalEditBtn');
        const imageId = modalEditBtn.dataset.imageId;

        if (!imageId) {
            console.error('Image ID not found');
            return;
        }

        // 삭제 확인
        if (!confirm('정말로 이 이미지를 삭제하시겠습니까?')) {
            return;
        }

        try {
            const response = await fetch(`/api/images/${imageId}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Failed to delete image: ${response.status}`);
            }

            // 성공적으로 삭제됨
            console.log('Image deleted successfully');

            // 모달 닫기
            this.hideModal();

            // 이미지 목록 새로고침
            this.refreshCurrentImageList();

            // 지도 색상 새로고침
            this.refreshMapColors();

            // 사용자 통계 새로고침
            await this.refreshUserStats();

        } catch (error) {
            console.error('Error deleting image:', error);
            alert('이미지 삭제 중 오류가 발생했습니다.');
        }
    }

    // 현재 보고 있는 이미지 목록 새로고침
    refreshCurrentImageList() {
        if (this.currentView === 'detail' && this.currentSigunguId) {
            // 시군구 상세 뷰인 경우
            this.loadSigunguImages(this.currentSigunguId);
        } else if (this.currentView === 'sigungu' && this.currentSidoId) {
            // 시도 뷰인 경우
            this.loadSidoImages(this.currentSidoId);
        }
    }

    // 지도 색상 새로고침
    refreshMapColors() {
        if (this.currentView === 'sido') {
            // 시도 지도인 경우 시도 색상 새로고침
            this.styleSidosWithImages();
        } else if (this.currentView === 'sigungu') {
            // 시군구 지도인 경우 시군구 색상 새로고침
            this.styleDistrictsWithImages();
        }
    }

    // 사용자 통계 새로고침
    async refreshUserStats() {
        await this.loadUserStats();
        this.updateStatsDisplay();
    }

    // 날짜 피커 초기화
    initModalDatePicker() {
        if (typeof flatpickr === 'undefined') {
            console.warn('Flatpickr not loaded');
            return;
        }

        const modalDateBox = document.getElementById('modalDateBox');

        // 기존 인스턴스가 있다면 제거
        if (this.modalDatePicker) {
            this.modalDatePicker.destroy();
        }

        this.modalDatePicker = flatpickr(modalDateBox, {
            dateFormat: "Y / m / d",
            maxDate: "today",
            locale: "ko",
            clickOpens: false, // 클릭으로는 열리지 않도록 설정
            allowInput: false, // 직접 입력 불가
            onClose: async (selectedDates, dateStr) => {
                if (dateStr && this.isEditMode) {
                    console.log('Date selected:', dateStr);
                    // 날짜가 변경되었을 때 계절 태그 업데이트
                    await this.updateSeasonalTagsInModal(dateStr);
                }
            }
        });

        // 편집 날짜 버튼 클릭 이벤트
        const modalEditDateBtn = document.getElementById('modalEditDateBtn');
        if (modalEditDateBtn) {
            modalEditDateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.isEditMode && this.modalDatePicker) {
                    this.modalDatePicker.open();
                }
            });
        }
    }

    // 모달 맵 픽커 초기화
    initModalMapPicker() {
        const modalMapPickerModal = document.getElementById('modalMapPickerModal');
        const modalEditLocationBtn = document.getElementById('modalEditLocationBtn');

        if (!modalMapPickerModal || !modalEditLocationBtn) {
            console.warn('Modal map picker elements not found');
            return;
        }

        // 위치 편집 버튼 클릭
        modalEditLocationBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.isEditMode) {
                this.showModalMapPicker();
            }
        });

        // MapPickerModal.js의 전역 변수와 함수를 활용
        this.setupMapPickerIntegration();
    }

    // MapPickerModal.js와의 통합 설정
    setupMapPickerIntegration() {
        const modalMapPickerModal = document.getElementById('modalMapPickerModal');
        const modalLocationBox = document.getElementById('modalLocationBox');

        // MapPickerModal.js의 확인 버튼 이벤트를 덮어씀
        const mapPickSubmitBtn = modalMapPickerModal?.querySelector('#mapPickSubmitBtn');
        const cancelMapPickBtn = modalMapPickerModal?.querySelector('#cancelMapPickBtn');

        if (mapPickSubmitBtn) {
            // 기존 이벤트 제거하고 새로운 이벤트 추가
            mapPickSubmitBtn.replaceWith(mapPickSubmitBtn.cloneNode(true));
            const newSubmitBtn = modalMapPickerModal.querySelector('#mapPickSubmitBtn');

            newSubmitBtn.addEventListener('click', () => {
                // MapPickerModal.js의 foundLocationData 사용
                if (window.foundLocationData && window.foundLocationData.locationName) {
                    // 모달의 위치 입력 상자에 업데이트
                    if (modalLocationBox) {
                        modalLocationBox.value = window.foundLocationData.locationName;
                        modalLocationBox.classList.remove('invalid');
                        modalLocationBox.classList.add('valid');
                    }

                    // map.js의 modalFoundLocationData에도 저장
                    this.modalFoundLocationData = {
                        latitude: window.foundLocationData.latitude,
                        longitude: window.foundLocationData.longitude,
                        sdName: window.foundLocationData.sdName,
                        sggName: window.foundLocationData.sggName,
                        locationName: window.foundLocationData.locationName
                    };

                    // 위치 변경시 태그도 실시간으로 업데이트
                    if (window.foundLocationData.tags && Array.isArray(window.foundLocationData.tags)) {
                        this.updateModalTagsFromLocationChange(window.foundLocationData.tags);
                    }

                    console.log('Location selected from map picker:', this.modalFoundLocationData);
                    console.log('window.foundLocationData:', window.foundLocationData);
                    console.log('window.foundTagData:', window.foundTagData);
                } else {
                    console.log('No location data found:', window.foundLocationData);
                }

                this.hideModalMapPicker();
            });
        }

        if (cancelMapPickBtn) {
            // 기존 이벤트 제거하고 새로운 이벤트 추가
            cancelMapPickBtn.replaceWith(cancelMapPickBtn.cloneNode(true));
            const newCancelBtn = modalMapPickerModal.querySelector('#cancelMapPickBtn');

            newCancelBtn.addEventListener('click', () => {
                this.hideModalMapPicker();
            });
        }
    }

    // 모달 맵 픽커 표시
    showModalMapPicker() {
        const modalMapPickerModal = document.getElementById('modalMapPickerModal');
        if (modalMapPickerModal) {
            // 기존 지도 인스턴스 완전 리셋
            if (typeof window.resetMapInstance === 'function') {
                window.resetMapInstance();
            }
            
            modalMapPickerModal.classList.add('show');

            // 맵 크기 조정 및 초기화
            setTimeout(() => {
                // 지도 클릭 이벤트 바인딩 (항상 실행)
                if (typeof window.bindMapClickEvent === 'function') {
                    window.bindMapClickEvent();
                }
                
                // 현재 표시된 이미지의 좌표가 있으면 지도에 표시
                if (this.originalModalData.latitude && this.originalModalData.longitude) {
                    const latitude = this.originalModalData.latitude;
                    const longitude = this.originalModalData.longitude;
                    const locationName = this.originalModalData.locationName || "현재 위치";
                    
                    console.log('Showing current image location on map:', {latitude, longitude, locationName});
                    
                    // 지도 생성을 위한 더 긴 대기 시간
                    setTimeout(() => {
                        if (window.showLocationOnMap) {
                            window.showLocationOnMap(latitude, longitude, locationName);
                        }
                        
                        // 기존 좌표 표시 후 추가로 이벤트 바인딩
                        setTimeout(() => {
                            if (typeof window.bindMapClickEvent === 'function') {
                                console.log('Re-binding map click event after location display');
                                window.bindMapClickEvent();
                            }
                        }, 500);
                    }, 1000);
                } else {
                    // 좌표가 없어도 이벤트 바인딩 재실행
                    setTimeout(() => {
                        if (typeof window.bindMapClickEvent === 'function') {
                            console.log('Re-binding map click event (no existing coordinates)');
                            window.bindMapClickEvent();
                        }
                    }, 1000);
                }
            }, 500);
        }
    }

    // 모달 맵 픽커 숨기기
    hideModalMapPicker() {
        const modalMapPickerModal = document.getElementById('modalMapPickerModal');
        if (modalMapPickerModal) {
            modalMapPickerModal.classList.remove('show');
            // 위치 데이터는 저장 완료 후까지 유지하도록 resetModalMapPickerVariations 호출 제거
        }
    }

    // 모달 맵 픽커 변수 초기화
    resetModalMapPickerVariations() {
        this.modalFoundLocationData = {longitude: 0, latitude: 0, sdName: "", sggName: "", locationName: ""};
        const modalMapPickResultForm = document.querySelector('#modalMapPickerModal #mapPickResultForm');
        const modalMapPickSubmitBtn = document.querySelector('#modalMapPickerModal #mapPickSubmitBtn');

        if (modalMapPickResultForm) {
            modalMapPickResultForm.value = "";
            modalMapPickResultForm.classList.remove("valid", "invalid");
        }
        if (modalMapPickSubmitBtn) {
            modalMapPickSubmitBtn.disabled = true;
        }
    }

    // API용 날짜 포맷팅 (flatpickr의 "Y / m / d" 형식을 LocalDateTime 형식으로 변환)
    formatDateForAPI(dateString) {
        if (!dateString) return null;

        try {
            // "YYYY / M / D" 형식을 "YYYY-MM-DDTHH:mm:ss" 형식으로 변환 (LocalDateTime 형식)
            const parts = dateString.split(' / ');
            if (parts.length === 3) {
                const year = parts[0];
                const month = parts[1].padStart(2, '0');
                const day = parts[2].padStart(2, '0');
                // LocalDateTime 형식으로 변환 (시간은 12:00:00으로 설정)
                return `${year}-${month}-${day}T12:00:00`;
            }
            return dateString;
        } catch (error) {
            console.error('Error formatting date for API:', error);
            return dateString;
        }
    }

    // 편집 모드에서 위치/날짜 편집 버튼 표시/숨김
    updateLocationDateEditButtons() {
        const modalEditLocationBtn = document.getElementById('modalEditLocationBtn');
        const modalEditDateBtn = document.getElementById('modalEditDateBtn');

        if (modalEditLocationBtn) {
            modalEditLocationBtn.style.display = this.isEditMode ? 'inline' : 'none';
        }
        if (modalEditDateBtn) {
            modalEditDateBtn.style.display = this.isEditMode ? 'inline' : 'none';
        }
    }

    // 태그 편집 모드 활성화
    enableTagEditMode() {
        const modalTagBox = document.getElementById('modalTagBox');
        if (!modalTagBox) return;

        // 모든 태그의 삭제 버튼 표시
        const deleteButtons = modalTagBox.querySelectorAll('.tag-delete');
        deleteButtons.forEach(button => {
            button.style.display = 'flex';
        });

        // 태그 추가 버튼과 입력 필드 표시
        const tagAddButton = document.getElementById('modalTagAddButton');
        if (tagAddButton) {
            tagAddButton.style.display = 'block';
        }
    }

    // 태그 편집 모드 비활성화
    disableTagEditMode() {
        const modalTagBox = document.getElementById('modalTagBox');
        if (!modalTagBox) return;

        // 모든 태그의 삭제 버튼 숨김
        const deleteButtons = modalTagBox.querySelectorAll('.tag-delete');
        deleteButtons.forEach(button => {
            button.style.display = 'none';
        });

        // 태그 추가 버튼과 입력 필드 숨김
        const tagAddButton = document.getElementById('modalTagAddButton');
        const tagInput = document.getElementById('modalTagInput');

        if (tagAddButton) {
            tagAddButton.style.display = 'none';
        }

        if (tagInput) {
            tagInput.style.display = 'none';
            tagInput.value = ''; // 입력 필드 초기화
        }
    }

    // 태그 입력 필드 표시
    showTagInput() {
        const tagAddButton = document.getElementById('modalTagAddButton');
        const tagInput = document.getElementById('modalTagInput');

        if (tagAddButton && tagInput) {
            tagAddButton.style.display = 'none';
            tagInput.style.display = 'inline-block';
            tagInput.focus();
        }
    }

    // 태그 입력 필드 숨김
    hideTagInput() {
        const tagAddButton = document.getElementById('modalTagAddButton');
        const tagInput = document.getElementById('modalTagInput');

        if (tagAddButton && tagInput) {
            const tagName = tagInput.value.trim();
            if (tagName) {
                this.addCustomTag(tagName);
                tagInput.value = '';
            }
            tagInput.style.display = 'none';
            tagAddButton.style.display = 'block';
        }
    }

    // 태그 입력 키 이벤트 처리
    handleTagInputKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.hideTagInput();
        } else if (e.key === 'Escape') {
            const tagInput = document.getElementById('modalTagInput');
            if (tagInput) {
                tagInput.value = '';
            }
            this.hideTagInput();
        }
    }

    // 커스텀 태그 추가
    addCustomTag(tagName) {
        if (!tagName || tagName.trim() === '') return;

        const modalTagBox = document.getElementById('modalTagBox');
        if (!modalTagBox) return;

        // 중복 태그 체크
        const existingTags = modalTagBox.querySelectorAll('.tag:not(#modalTagAddButton)');
        const isDuplicate = Array.from(existingTags).some(tag => 
            tag.textContent.replace('×', '').trim() === tagName.trim()
        );

        if (isDuplicate) {
            alert('이미 추가된 태그입니다.');
            return;
        }

        // 새 태그 요소 생성
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
        tagElement.textContent = tagName.trim();
        tagElement.dataset.tagId = 'custom-' + Date.now(); // 임시 ID
        tagElement.dataset.tagName = tagName.trim();

        // 삭제 버튼 추가
        const deleteButton = document.createElement('button');
        deleteButton.className = 'tag-delete';
        deleteButton.innerHTML = '×';
        deleteButton.title = '태그 삭제';
        deleteButton.style.display = this.isEditMode ? 'flex' : 'none';
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            tagElement.remove();
        });

        tagElement.appendChild(deleteButton);

        // 태그 추가 버튼 앞에 삽입
        const tagAddButton = document.getElementById('modalTagAddButton');
        modalTagBox.insertBefore(tagElement, tagAddButton);
    }

    // 원본 태그로 복원
    restoreOriginalTags() {
        const modalTagBox = document.getElementById('modalTagBox');
        if (!modalTagBox || !this.originalModalData) return;

        // 기존 태그들 제거 (추가 버튼과 입력 필드는 유지)
        const existingTags = modalTagBox.querySelectorAll('.tag:not(#modalTagAddButton):not(#modalTagInput)');
        existingTags.forEach(tag => tag.remove());

        // 원본 태그들 다시 추가
        if (this.originalModalData.tags && this.originalModalData.tags.length > 0) {
            this.originalModalData.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                
                const tagId = typeof tag === 'object' ? tag.tagId : null;
                const tagName = typeof tag === 'object' ? (tag.tagName || tag.name || tag) : tag;
                
                tagElement.textContent = tagName;
                tagElement.dataset.tagId = tagId;
                tagElement.dataset.tagName = tagName;
                
                const deleteButton = document.createElement('button');
                deleteButton.className = 'tag-delete';
                deleteButton.innerHTML = '×';
                deleteButton.title = '태그 삭제';
                deleteButton.style.display = 'none'; // 읽기 모드에서는 숨김
                deleteButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    tagElement.remove();
                });
                
                tagElement.appendChild(deleteButton);
                
                const tagAddButton = document.getElementById('modalTagAddButton');
                modalTagBox.insertBefore(tagElement, tagAddButton);
            });
        }
    }

    // 태그 변경사항 가져오기
    getTagChanges() {
        const modalTagBox = document.getElementById('modalTagBox');
        const tagsToRemove = [];
        const tagsToAdd = [];

        if (!modalTagBox || !this.originalModalData) {
            return { tagsToRemove, tagsToAdd };
        }

        // 현재 태그 목록 가져오기
        const currentTags = Array.from(modalTagBox.querySelectorAll('.tag:not(#modalTagAddButton):not(#modalTagInput)'))
            .map(tag => ({
                tagId: tag.dataset.tagId,
                tagName: tag.dataset.tagName
            }));

        console.log('=== GET TAG CHANGES DEBUG ===');
        console.log('Original tags:', this.originalModalData.tags);
        console.log('Current tags:', currentTags);

        // 태그 분류 함수
        const classifyTagType = (tagName) => {
            if (!tagName) return 'unknown';
            
            // 계절 태그 (봄, 여름, 가을, 겨울 포함)
            if (tagName.includes('봄') || tagName.includes('여름') || tagName.includes('가을') || tagName.includes('겨울')) {
                return 'seasonal';
            }
            
            // 시도 태그 (지역명 패턴)
            if (tagName.includes('시') || tagName.includes('도') || tagName.includes('특별시') || tagName.includes('광역시') || tagName.includes('특별자치시')) {
                return 'sido';
            }
            
            // 시군구 태그
            if (tagName.includes('군') || tagName.includes('구') || tagName.includes('시')) {
                return 'sigungu';
            }
            
            // 나머지는 커스텀 태그
            return 'custom';
        };

        // 원본 태그들을 타입별로 분류
        const originalTagsByType = {
            sido: [],
            sigungu: [],
            seasonal: [],
            custom: []
        };

        if (this.originalModalData.tags) {
            this.originalModalData.tags.forEach(originalTag => {
                const originalTagName = typeof originalTag === 'object' ? (originalTag.tagName || originalTag.name || originalTag) : originalTag;
                const originalTagId = typeof originalTag === 'object' ? originalTag.tagId : null;
                const type = classifyTagType(originalTagName);
                
                originalTagsByType[type].push({
                    tagId: originalTagId,
                    tagName: originalTagName
                });
            });
        }

        // 현재 태그들을 타입별로 분류
        const currentTagsByType = {
            sido: [],
            sigungu: [],
            seasonal: [],
            custom: []
        };

        currentTags.forEach(currentTag => {
            const type = classifyTagType(currentTag.tagName);
            currentTagsByType[type].push(currentTag);
        });

        console.log('Original tags by type:', originalTagsByType);
        console.log('Current tags by type:', currentTagsByType);

        // 각 타입별로 변경사항 확인
        ['sido', 'sigungu', 'seasonal'].forEach(type => {
            const originalTags = originalTagsByType[type];
            const currentTags = currentTagsByType[type];
            
            // 태그 이름만 비교하여 변화 확인
            const originalNames = originalTags.map(tag => tag.tagName).sort();
            const currentNames = currentTags.map(tag => tag.tagName).sort();
            
            const hasChanges = JSON.stringify(originalNames) !== JSON.stringify(currentNames);
            console.log(`${type} tags changed:`, hasChanges);
            
            if (hasChanges) {
                // 변화가 있으면 삭제할 태그 추가
                originalTags.forEach(originalTag => {
                    const stillExists = currentTags.some(currentTag => currentTag.tagName === originalTag.tagName);
                    if (!stillExists && originalTag.tagId && !originalTag.tagId.toString().startsWith('custom-') && !originalTag.tagId.toString().startsWith('location-') && !originalTag.tagId.toString().startsWith('season-')) {
                        console.log(`Adding ${type} tag to remove: ${originalTag.tagId}`);
                        tagsToRemove.push(parseInt(originalTag.tagId));
                    }
                });
                
                // 변화가 있으면 추가할 태그 추가
                currentTags.forEach(currentTag => {
                    const wasOriginal = originalTags.some(originalTag => originalTag.tagName === currentTag.tagName);
                    if (!wasOriginal && currentTag.tagName) {
                        console.log(`Adding new ${type} tag: ${currentTag.tagName}`);
                        tagsToAdd.push(currentTag.tagName);
                    }
                });
            }
        });

        // 커스텀 태그는 기존 로직대로 처리
        const originalCustomTags = originalTagsByType.custom;
        const currentCustomTags = currentTagsByType.custom;
        
        // 삭제된 커스텀 태그 찾기
        originalCustomTags.forEach(originalTag => {
            const stillExists = currentCustomTags.some(currentTag => currentTag.tagName === originalTag.tagName);
            if (!stillExists && originalTag.tagId && !originalTag.tagId.toString().startsWith('custom-') && !originalTag.tagId.toString().startsWith('location-') && !originalTag.tagId.toString().startsWith('season-')) {
                console.log(`Adding custom tag to remove: ${originalTag.tagId}`);
                tagsToRemove.push(parseInt(originalTag.tagId));
            }
        });
        
        // 추가된 커스텀 태그 찾기
        currentCustomTags.forEach(currentTag => {
            const wasOriginal = originalCustomTags.some(originalTag => originalTag.tagName === currentTag.tagName);
            if (!wasOriginal && currentTag.tagName) {
                console.log(`Adding new custom tag: ${currentTag.tagName}`);
                tagsToAdd.push(currentTag.tagName);
            }
        });

        console.log('Tags to remove:', tagsToRemove);
        console.log('Tags to add:', tagsToAdd);
        console.log('=== END GET TAG CHANGES DEBUG ===');

        return { tagsToRemove, tagsToAdd };
    }

    // 현재 모달의 이미지 데이터 새로고침
    async refreshCurrentModalImageData(imageId) {
        try {
            // API에서 최신 이미지 데이터 가져오기
            const response = await fetch(`/api/images/${imageId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch updated image data: ${response.status}`);
            }

            const responseData = await response.json();
            const updatedImageData = responseData.data;

            console.log('Refreshing modal with updated image data:', updatedImageData);

            // 서버에서 태그가 비어있으면 현재 모달의 태그를 유지
            if (!updatedImageData.tags || updatedImageData.tags.length === 0) {
                console.log('Server returned empty tags, keeping current modal tags');
                // 현재 모달의 태그들을 유지하고 서버 데이터는 업데이트하지 않음
            } else {
                // 태그 정보만 업데이트 (다른 정보는 유지)
                this.updateModalTags(updatedImageData.tags);
                
                // 원본 데이터도 업데이트
                if (this.originalModalData) {
                    this.originalModalData.tags = updatedImageData.tags;
                }
            }

        } catch (error) {
            console.error('Error refreshing modal image data:', error);
        }
    }

    // 모달의 태그 정보만 업데이트
    updateModalTags(newTags) {
        const modalTagBox = document.getElementById('modalTagBox');
        if (!modalTagBox) return;

        console.log('Updating modal tags. Current edit mode:', this.isEditMode);
        console.log('New tags received:', newTags);

        // 기존 태그들 제거 (추가 버튼과 입력 필드는 유지)
        const existingTags = modalTagBox.querySelectorAll('.tag:not(#modalTagAddButton):not(#modalTagInput)');
        console.log('Removing existing tags:', existingTags.length);
        existingTags.forEach(tag => tag.remove());

        // 새로운 태그들 추가
        if (newTags && newTags.length > 0) {
            newTags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                
                const tagId = typeof tag === 'object' ? tag.tagId : null;
                const tagName = typeof tag === 'object' ? (tag.tagName || tag.name || tag) : tag;
                
                tagElement.textContent = tagName;
                tagElement.dataset.tagId = tagId;
                tagElement.dataset.tagName = tagName;
                
                const deleteButton = document.createElement('button');
                deleteButton.className = 'tag-delete';
                deleteButton.innerHTML = '×';
                deleteButton.title = '태그 삭제';
                deleteButton.style.display = 'none'; // 새로고침 후에는 편집 모드가 해제되므로 숨김
                deleteButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    tagElement.remove();
                });
                
                tagElement.appendChild(deleteButton);
                
                const tagAddButton = document.getElementById('modalTagAddButton');
                if (tagAddButton) {
                    modalTagBox.insertBefore(tagElement, tagAddButton);
                } else {
                    modalTagBox.appendChild(tagElement);
                }
            });
        }

        console.log('Modal tags updated successfully. Final tag count:', modalTagBox.querySelectorAll('.tag:not(#modalTagAddButton):not(#modalTagInput)').length);
    }

    // 위치 변경시 태그 실시간 업데이트 (위치 태그 + 계절 태그)
    async updateModalTagsFromLocationChange(newTags) {
        console.log('Updating modal tags from location change:', newTags);
        
        if (!this.isEditMode) {
            console.log('Not in edit mode, skipping tag update');
            return;
        }

        const modalTagBox = document.getElementById('modalTagBox');
        const modalDateBox = document.getElementById('modalDateBox');
        if (!modalTagBox) {
            console.log('Modal tag box not found');
            return;
        }

        // 현재 날짜 정보 가져오기
        const currentDate = modalDateBox ? modalDateBox.value : '';
        
        let seasonalTags = [];
        // 날짜 정보가 있으면 계절 태그도 함께 가져오기
        if (currentDate) {
            try {
                const response = await fetch("/api/tags/season", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    credentials: "include",
                    body: JSON.stringify({
                        date: currentDate
                    })
                });
                
                if (response.ok) {
                    const tagsData = await response.json();
                    if (tagsData.code === 200 && Array.isArray(tagsData.data)) {
                        seasonalTags = tagsData.data;
                        console.log('Seasonal tags fetched for location change:', seasonalTags);
                    }
                }
            } catch (error) {
                console.error('Error fetching seasonal tags during location change:', error);
            }
        }

        // 기존 커스텀 태그 보존 (태그 분류 함수 사용)
        const existingTags = modalTagBox.querySelectorAll('.tag:not(#modalTagAddButton):not(#modalTagInput)');
        const customTags = [];
        
        // 태그 분류 함수 (getTagChanges에서 사용한 것과 동일)
        const classifyTagType = (tagName) => {
            if (!tagName) return 'unknown';
            
            // 계절 태그 (봄, 여름, 가을, 겨울 포함)
            if (tagName.includes('봄') || tagName.includes('여름') || tagName.includes('가을') || tagName.includes('겨울')) {
                return 'seasonal';
            }
            
            // 시도 태그 (지역명 패턴)
            if (tagName.includes('시') || tagName.includes('도') || tagName.includes('특별시') || tagName.includes('광역시') || tagName.includes('특별자치시')) {
                return 'sido';
            }
            
            // 시군구 태그
            if (tagName.includes('군') || tagName.includes('구') || tagName.includes('시')) {
                return 'sigungu';
            }
            
            // 나머지는 커스텀 태그
            return 'custom';
        };
        
        existingTags.forEach(tag => {
            const tagName = tag.dataset.tagName;
            const tagType = classifyTagType(tagName);
            
            // 커스텀 태그만 보존
            if (tagType === 'custom') {
                customTags.push({
                    tagId: tag.dataset.tagId,
                    tagName: tag.dataset.tagName
                });
            }
            tag.remove();
        });
        
        console.log('Preserved custom tags:', customTags);

        // 새로운 위치 기반 태그들 추가
        if (newTags && newTags.length > 0) {
            newTags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                
                const tagId = typeof tag === 'object' ? tag.tagId : null;
                const tagName = typeof tag === 'object' ? (tag.tagName || tag.name || tag) : tag;
                
                tagElement.textContent = tagName;
                tagElement.dataset.tagId = tagId || 'location-' + Date.now(); // 위치 기반 임시 ID
                tagElement.dataset.tagName = tagName;
                
                const deleteButton = document.createElement('button');
                deleteButton.className = 'tag-delete';
                deleteButton.innerHTML = '×';
                deleteButton.title = '태그 삭제';
                deleteButton.style.display = this.isEditMode ? 'flex' : 'none';
                deleteButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    tagElement.remove();
                });
                
                tagElement.appendChild(deleteButton);
                
                const tagAddButton = document.getElementById('modalTagAddButton');
                if (tagAddButton) {
                    modalTagBox.insertBefore(tagElement, tagAddButton);
                } else {
                    modalTagBox.appendChild(tagElement);
                }
            });
        }

        // 계절 태그들 추가
        if (seasonalTags && seasonalTags.length > 0) {
            seasonalTags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                
                const tagId = typeof tag === 'object' ? tag.tagId : null;
                const tagName = typeof tag === 'object' ? (tag.tagName || tag.name || tag) : tag;
                
                tagElement.textContent = tagName;
                tagElement.dataset.tagId = tagId || 'season-' + Date.now(); // 계절 기반 임시 ID
                tagElement.dataset.tagName = tagName;
                
                const deleteButton = document.createElement('button');
                deleteButton.className = 'tag-delete';
                deleteButton.innerHTML = '×';
                deleteButton.title = '태그 삭제';
                deleteButton.style.display = this.isEditMode ? 'flex' : 'none';
                deleteButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    tagElement.remove();
                });
                
                tagElement.appendChild(deleteButton);
                
                const tagAddButton = document.getElementById('modalTagAddButton');
                if (tagAddButton) {
                    modalTagBox.insertBefore(tagElement, tagAddButton);
                } else {
                    modalTagBox.appendChild(tagElement);
                }
            });
        }

        // 보존한 커스텀 태그들 다시 추가
        customTags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag';
            tagElement.textContent = tag.tagName;
            tagElement.dataset.tagId = tag.tagId;
            tagElement.dataset.tagName = tag.tagName;
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'tag-delete';
            deleteButton.innerHTML = '×';
            deleteButton.title = '태그 삭제';
            deleteButton.style.display = this.isEditMode ? 'flex' : 'none';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                tagElement.remove();
            });
            
            tagElement.appendChild(deleteButton);
            
            const tagAddButton = document.getElementById('modalTagAddButton');
            if (tagAddButton) {
                modalTagBox.insertBefore(tagElement, tagAddButton);
            } else {
                modalTagBox.appendChild(tagElement);
            }
        });

        console.log('Location-based tags updated successfully. Final tag count:', modalTagBox.querySelectorAll('.tag:not(#modalTagAddButton):not(#modalTagInput)').length);
    }

    // 모달에서 날짜 변경 시 계절 태그 업데이트
    async updateSeasonalTagsInModal(dateStr) {
        if (!this.isEditMode) {
            console.log('Not in edit mode, skipping seasonal tag update');
            return;
        }

        const modalTagBox = document.getElementById('modalTagBox');
        if (!modalTagBox) {
            console.log('Modal tag box not found');
            return;
        }

        try {
            const response = await fetch("/api/tags/season", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                credentials: "include",
                body: JSON.stringify({
                    date: dateStr
                })
            });

            if (response.ok) {
                const tagsData = await response.json();
                if (tagsData.code === 200 && Array.isArray(tagsData.data)) {
                    console.log('Seasonal tags received:', tagsData.data);

                    // 1. 기존 위치태그 유지 (sdName, sggName, 기타 지역태그)
                    const existingLocationTags = [];
                    modalTagBox.querySelectorAll('.tag:not(#modalTagAddButton):not(#modalTagInput)').forEach(tag => {
                        const tagName = tag.dataset.tagName;
                        // 계절태그가 아닌 경우만 유지
                        if (tagName && !tagName.includes('봄') && !tagName.includes('여름') && 
                            !tagName.includes('가을') && !tagName.includes('겨울')) {
                            existingLocationTags.push({
                                tagId: tag.dataset.tagId,
                                tagName: tagName
                            });
                        }
                    });

                    // 2. 모든 기존 태그 제거
                    const existingTags = modalTagBox.querySelectorAll('.tag:not(#modalTagAddButton):not(#modalTagInput)');
                    existingTags.forEach(tag => tag.remove());

                    // 3. 기존 위치태그 다시 추가
                    existingLocationTags.forEach(tag => {
                        const tagElement = document.createElement('span');
                        tagElement.className = 'tag';
                        tagElement.textContent = tag.tagName;
                        tagElement.dataset.tagId = tag.tagId;
                        tagElement.dataset.tagName = tag.tagName;
                        
                        const deleteButton = document.createElement('button');
                        deleteButton.className = 'tag-delete';
                        deleteButton.innerHTML = '×';
                        deleteButton.title = '태그 삭제';
                        deleteButton.style.display = this.isEditMode ? 'flex' : 'none';
                        deleteButton.addEventListener('click', (e) => {
                            e.stopPropagation();
                            tagElement.remove();
                        });
                        
                        tagElement.appendChild(deleteButton);
                        
                        const tagAddButton = document.getElementById('modalTagAddButton');
                        if (tagAddButton) {
                            modalTagBox.insertBefore(tagElement, tagAddButton);
                        } else {
                            modalTagBox.appendChild(tagElement);
                        }
                    });

                    // 4. 새로운 계절태그 추가
                    tagsData.data.forEach(tag => {
                        const tagElement = document.createElement('span');
                        tagElement.className = 'tag';
                        
                        const tagId = typeof tag === 'object' ? tag.tagId : null;
                        const tagName = typeof tag === 'object' ? (tag.tagName || tag.name || tag) : tag;
                        
                        tagElement.textContent = tagName;
                        tagElement.dataset.tagId = tagId || 'season-' + Date.now();
                        tagElement.dataset.tagName = tagName;
                        
                        const deleteButton = document.createElement('button');
                        deleteButton.className = 'tag-delete';
                        deleteButton.innerHTML = '×';
                        deleteButton.title = '태그 삭제';
                        deleteButton.style.display = this.isEditMode ? 'flex' : 'none';
                        deleteButton.addEventListener('click', (e) => {
                            e.stopPropagation();
                            tagElement.remove();
                        });
                        
                        tagElement.appendChild(deleteButton);
                        
                        const tagAddButton = document.getElementById('modalTagAddButton');
                        if (tagAddButton) {
                            modalTagBox.insertBefore(tagElement, tagAddButton);
                        } else {
                            modalTagBox.appendChild(tagElement);
                        }
                    });
                    
                    console.log('Seasonal tags updated successfully in modal');
                }
            }
        } catch (error) {
            console.error('Error updating seasonal tags in modal:', error);
        }
    }

    // 지도에서 보기 버튼 초기화
    initViewOnMapButton() {
        const modalViewOnMapBtn = document.getElementById('modalViewOnMapBtn');
        if (modalViewOnMapBtn) {
            modalViewOnMapBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showImageLocationOnMap();
            });
        }
    }

    // 이미지 위치를 지도에 표시
    async showImageLocationOnMap() {
        const modalEditBtn = document.getElementById('modalEditBtn');
        const imageId = modalEditBtn?.dataset.imageId;
        
        if (!imageId) {
            console.error('Image ID not found');
            return;
        }

        console.log('=== SHOW IMAGE LOCATION ON MAP ===');
        console.log('Image ID:', imageId);

        try {
            // API에서 최신 이미지 좌표 정보 가져오기
            const coords = await this.fetchImageCoordinates(imageId);
            console.log('Fetched coordinates:', coords);
            
            if (coords && coords.latitude && coords.longitude) {
                const latitude = coords.latitude;
                const longitude = coords.longitude;
                const locationName = coords.locationName || `${coords.sdName || ''} ${coords.sggName || ''}`.trim() || '현재 위치';
                
                console.log('Showing image location on map:', {latitude, longitude, locationName});
                
                // 지도 모달 열기
                this.showModalMapPicker();
                
                // 지도가 로드된 후 위치 표시
                setTimeout(() => {
                    if (window.showLocationOnMap) {
                        console.log('Calling showLocationOnMap with:', latitude, longitude, locationName);
                        window.showLocationOnMap(latitude, longitude, locationName);
                    } else {
                        console.error('showLocationOnMap function not found');
                    }
                }, 500);
            } else {
                console.log('No coordinates found for image:', coords);
                alert('이미지에 위치 정보가 없습니다.');
            }
        } catch (error) {
            console.error('Error fetching image coordinates:', error);
            alert('위치 정보를 가져올 수 없습니다.');
        }
        
        console.log('=== END SHOW IMAGE LOCATION ON MAP ===');
    }

    // 이미지 좌표 정보 가져오기
    async fetchImageCoordinates(imageId) {
        try {
            const response = await fetch(`/api/images/${imageId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch image coordinates: ${response.status}`);
            }

            const responseData = await response.json();
            const imageData = responseData.data;

            return {
                latitude: imageData.latitude,
                longitude: imageData.longitude,
                locationName: `${imageData.sdName || ''} ${imageData.sggName || ''}`.trim(),
                sdName: imageData.sdName,
                sggName: imageData.sggName
            };
        } catch (error) {
            console.error('Error fetching image coordinates:', error);
            return null;
        }
    }


}

// DOM이 로드되면 초기화
document.addEventListener('DOMContentLoaded', () => {
    new MapManager();
});
