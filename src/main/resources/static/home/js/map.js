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
        this.modalFoundLocationData = {longitude: 0, latitude: 0, locationName: ""};

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
            </div>
        `;

        console.log('Generated HTML:', statsHtml);
        container.innerHTML = statsHtml;
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

        if (imageData.tags && imageData.tags.length > 0) {
            imageData.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                tagElement.textContent = typeof tag === 'object' ? (tag.tagName || tag.name || tag) : tag;
                modalTagBox.appendChild(tagElement);
            });
        }

        // 위치 - 시도와 시군구를 모두 표시
        const modalLocationBox = document.getElementById('modalLocationBox');
        let locationText = '';
        if (imageData.sdName && imageData.sggName) {
            locationText = `${imageData.sdName} ${imageData.sggName}`;
        } else if (imageData.sggName) {
            locationText = imageData.sggName;
        } else if (imageData.sdName) {
            locationText = imageData.sdName;
        } else {
            locationText = imageData.locationName || '';
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

        // 원본 데이터 저장
        this.originalModalData = {
            imageContent: imageData.imageContent || '',
            tags: imageData.tags || [],
            isPublic: imageData.isPublic || false,
            imageDate: imageData.imageDate || '',
            locationName: locationText
        };

        // 편집 모드 초기화
        this.isEditMode = false;
        this.updateModalButtonsVisibility();

        // 날짜 피커 초기화
        this.initModalDatePicker();

        // 모달 맵 픽커 초기화
        this.initModalMapPicker();
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

    // 이미지가 있는 시도를 초록색으로 표시
    async styleSidosWithImages() {
        if (!this.sidoData) return;

        const paths = document.querySelectorAll('#map-display path');

        for (const sido of this.sidoData) {
            const sidoId = sido.sd_id || sido.id || sido.sidoId;
            const pathElement = document.getElementById(sidoId);

            if (pathElement) {
                // 해당 시도의 이미지 개수 확인
                const hasImages = await this.checkSidoHasImages(sidoId);

                if (hasImages) {
                    pathElement.style.fill = '#28a745'; // 초록색
                    pathElement.classList.add('has-images');
                }
            }
        }
    }

    // 시도의 모든 시군구에 이미지가 있는지 확인
    async checkSidoHasImages(sidoId) {
        try {
            // 먼저 해당 시도의 시군구 목록을 가져옴
            const sigunguResponse = await fetch(`/api/location/sido/${sidoId}/sigungu`);
            if (!sigunguResponse.ok) {
                return false;
            }

            const sigunguData = await sigunguResponse.json();
            const sigunguList = Array.isArray(sigunguData) ? sigunguData : (sigunguData.data || []);

            if (sigunguList.length === 0) {
                return false;
            }

            // 모든 시군구에 이미지가 있는지 확인
            for (const sigungu of sigunguList) {
                const sigunguId = sigungu.sigunguId;
                const hasImages = await this.checkSigunguHasImages(sigunguId);

                // 하나라도 이미지가 없으면 false 반환
                if (!hasImages) {
                    return false;
                }
            }

            // 모든 시군구에 이미지가 있는 경우에만 true 반환
            return true;
        } catch (error) {
            console.error('Error checking sido images:', error);
            return false;
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
        }

        // 입력 필드들을 읽기 전용으로 변경
        const modalDescription = document.getElementById('modalDescription');
        modalDescription.readOnly = true;

        // 공개 설정 UI 변경
        const modalPublicStatus = document.getElementById('modalPublicStatus');
        const modalPublicCheckboxArea = document.getElementById('modalPublicCheckboxArea');

        modalPublicStatus.style.display = 'block';
        modalPublicCheckboxArea.style.display = 'none';

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
        }

        // 날짜 변경 체크
        if (modalDateBox.value) {
            const newFormattedDate = this.formatDateForAPI(modalDateBox.value);
            if (this.originalModalData.imageDate !== newFormattedDate) {
                updateData.imageDate = newFormattedDate;
            }
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

            // 위치 정보가 변경된 경우 현재 이미지 목록 및 지도 색상 새로고침
            if (updateData.longitude !== undefined || updateData.latitude !== undefined) {
                this.refreshCurrentImageList();
                this.refreshMapColors();
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
            onClose: (selectedDates, dateStr) => {
                if (dateStr && this.isEditMode) {
                    console.log('Date selected:', dateStr);
                    // 날짜가 변경되었을 때 처리
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
                        locationName: window.foundLocationData.locationName
                    };

                    console.log('Location selected from map picker:', this.modalFoundLocationData);
                    console.log('window.foundLocationData:', window.foundLocationData);
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
            modalMapPickerModal.classList.add('show');

            // 맵 크기 조정만 수행 (지도는 이미 초기화되어 있음)
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));

                // 지도 클릭 이벤트는 처음 한 번만 바인딩되어야 함
                if (typeof window.bindMapClickEvent === 'function' && !this.mapClickEventBound) {
                    window.bindMapClickEvent();
                    this.mapClickEventBound = true;
                }
            }, 100);
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
        this.modalFoundLocationData = {longitude: 0, latitude: 0, locationName: ""};
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


}

// DOM이 로드되면 초기화
document.addEventListener('DOMContentLoaded', () => {
    new MapManager();
});
