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
        
        // API 응답 캐싱
        this.cachedSigunguData = new Map();
        this.cachedImageData = new Map();
        
        // 디바운싱을 위한 타이머
        this.debounceTimers = new Map();

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

    // 시도별 이미지 로드 (캐싱 적용)
    async loadSidoImages(sidoId) {
        const cacheKey = `sido_images_${sidoId}`;
        
        if (this.cachedImageData.has(cacheKey)) {
            const cachedImages = this.cachedImageData.get(cacheKey);
            this.displayImages(cachedImages, 'sido');
            return;
        }
        
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
            
            this.cachedImageData.set(cacheKey, images);
            this.displayImages(images, 'sido');
        } catch (error) {
            console.error('Error loading sido images:', error);
        }
    }

    // 시군구별 이미지 로드 (캐싱 적용)
    async loadSigunguImages(sigunguId) {
        const cacheKey = `sigungu_images_${sigunguId}`;
        
        if (this.cachedImageData.has(cacheKey)) {
            const cachedImages = this.cachedImageData.get(cacheKey);
            this.displayImages(cachedImages, 'sigungu');
            return;
        }
        
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
            
            this.cachedImageData.set(cacheKey, images);
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
                                 data-image-id="${image.imageId}"
                                 data-image-name="${image.imageName || ''}"
                                 data-image-content="${image.imageContent || ''}"
                                 data-image-url="${image.imageUrl || ''}"
                                 data-sd-name="${image.sdName || ''}"
                                 data-sgg-name="${image.sggName || ''}"
                                 data-image-date="${image.imageDate || ''}"
                                 data-is-public="${image.isPublic || false}"
                                 data-latitude="${image.latitude || ''}"
                                 data-longitude="${image.longitude || ''}"
                                 data-tags="${image.tags ? JSON.stringify(image.tags) : '[]'}">
                                <img src="${image.imageUrl}" alt="${image.imageContent || image.imageName}" 
                                     loading="lazy" onerror="this.src='/images/placeholder.jpg'">
                                <div class="image-overlay">
                                    <div class="image-info-text">
                                        <div class="image-location">${image.sggName || image.sdName}</div>
                                        <div class="image-date">${this.formatDate(image.imageDate)}</div>
                                    </div>
                                </div>
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
    showImageDetail(imageId) {
        console.log('Showing image detail for ID:', imageId);
        
        // 현재 표시된 이미지 카드에서 데이터 찾기
        const imageCard = document.querySelector(`.region-image-card[data-image-id="${imageId}"]`);
        
        if (!imageCard) {
            console.error('Image card not found for ID:', imageId);
            return;
        }
        
        // dataset에서 데이터 추출
        const dataset = imageCard.dataset;
        
        // 태그 파싱
        let tags = [];
        try {
            tags = JSON.parse(dataset.tags || '[]');
        } catch (e) {
            console.warn('Error parsing tags:', e);
            tags = [];
        }
        
        const imageData = {
            imageId: dataset.imageId,
            imageUrl: dataset.imageUrl || '/images/default-image4.webp',
            imageName: dataset.imageName || '이미지',
            imageContent: dataset.imageContent || '',
            sggName: dataset.sggName || '',
            sdName: dataset.sdName || '',
            locationName: dataset.sggName || dataset.sdName || '',
            imageDate: dataset.imageDate || '',
            tags: tags,
            isPublic: dataset.isPublic === 'true',
            latitude: dataset.latitude || '',
            longitude: dataset.longitude || ''
        };
        
        console.log('Image data extracted from dataset:', imageData);
        
        // 모달에 데이터 채우기
        this.populateImageModal(imageData);
        
        // 모달 표시
        this.showModal();
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

        // 날짜 - 원본 날짜 문자열을 직접 포맷팅
        const modalDateBox = document.getElementById('modalDateBox');
        let dateText = '';
        if (imageData.imageDate) {
            // ISO 날짜 문자열인 경우 포맷팅
            if (imageData.imageDate.includes('T') || imageData.imageDate.includes('-')) {
                dateText = this.formatDate(imageData.imageDate);
            } else {
                // 이미 포맷된 문자열인 경우 그대로 사용
                dateText = imageData.imageDate;
            }
        }
        modalDateBox.value = dateText;

        // 공개 여부
        const modalPublic = document.getElementById('modalPublic');
        modalPublic.checked = imageData.isPublic || false;

        // 모달 버튼에 imageId 저장
        const modalEditBtn = document.getElementById('modalEditBtn');
        modalEditBtn.dataset.imageId = imageData.imageId;
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
        const modalCloseBtn = document.getElementById('modalCloseBtn');

        // 모달 닫기 이벤트들
        const closeEvents = [modalOverlay, modalClose, modalCloseBtn];
        closeEvents.forEach(element => {
            if (element) {
                element.addEventListener('click', () => this.hideModal());
            }
        });

        // ESC 키로 모달 닫기
        const escKeyHandler = (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
                document.removeEventListener('keydown', escKeyHandler);
            }
        };
        document.addEventListener('keydown', escKeyHandler);

        // 모달 내부 클릭 시 이벤트 전파 방지
        const modalContent = modal.querySelector('.modal-content');
        modalContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // 날짜 포맷 함수
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

}

// DOM이 로드되면 초기화
document.addEventListener('DOMContentLoaded', () => {
    new MapManager();
});
