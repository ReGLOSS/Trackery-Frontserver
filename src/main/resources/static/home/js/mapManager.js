/**
 * 지도 상태 관리 및 뷰 전환을 담당하는 클래스
 * 시도/시군구/상세 뷰 간의 전환과 네비게이션 히스토리를 관리
 */
export class MapManager {
    constructor() {
        // 현재 뷰 상태 관리
        this.currentView = 'sido'; // 'sido', 'sigungu', 'detail'
        this.currentSidoId = null;
        this.currentSigunguId = null;
        
        // 데이터 캐싱
        this.sidoData = null;
        this.sigunguData = null;
        this.userStats = null;
        this.cachedSigunguData = new Map();
        
        // localStorage 캐시 관리
        this.CACHE_KEYS = {
            SIDO_DATA: 'trackery_sido_data',
            USER_STATS: 'trackery_user_stats',
            IMAGE_STATUS: 'trackery_image_status',
            LAST_UPDATE: 'trackery_last_update'
        };
        this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간
        
        // 네비게이션
        this.navigationHistory = [];
        
        // 상태 관리
        this.isLoading = false;
        this.pendingRequests = new Set();
        this.debounceTimers = new Map();
        
        // 외부 매니저들 참조
        this.renderer = null;
        this.imageManager = null;
        this.modalManager = null;
        this.statsRenderer = null;
    }
    
    // 의존성 주입
    setDependencies({ renderer, imageManager, modalManager, statsRenderer }) {
        this.renderer = renderer;
        this.imageManager = imageManager;
        this.modalManager = modalManager;
        this.statsRenderer = statsRenderer;
    }
    
    async init() {
        this.bindEvents();
        // 사용자가 로그인한 경우에만 통계 로드
        if (this.isUserLoggedIn()) {
            await this.loadUserStatsWithCache();
        }
        await this.loadSidoViewWithCache();
    }
    
    bindEvents() {
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.debouncedGoBack());
        }
    }
    
    // 시도 뷰 로드 (캐시 활용)
    async loadSidoViewWithCache() {
        if (this.isLoading) return;
        
        try {
            this.setLoadingState(true);
            this.renderer.showLoading();
            this.currentView = 'sido';
            this.currentSidoId = null;
            this.currentSigunguId = null;
            
            // 캐시된 시도 데이터 로드
            await this.fetchSidoDataWithCache();
            
            // SVG 지도 로드
            await this.renderer.loadSvgMap('/map/svg/simpleSido.svg');
            
            // UI 업데이트
            this.updateBackButton();
            this.renderer.clearMapTitle();
            this.updateDetailContainerClass();
            this.statsRenderer.updateStatsDisplay(this.currentView, this.userStats, this);
            
            // 시도 클릭 이벤트 바인딩
            this.bindSidoClickEvents();
            
            // 캐시된 이미지 상태로 지역 색상 표시
            await this.styleRegionsWithCachedImages();
            
        } catch (error) {
            console.error('Error loading sido view:', error);
            this.renderer.showError('지도를 불러오는 중 오류가 발생했습니다.');
        } finally {
            this.setLoadingState(false);
        }
    }
    
// 시군구 뷰 로드
    async loadSigunguView(sidoId) {
        return this._loadSigunguViewCommon(sidoId, {
            addToHistory: true,
            loadImages: false
        });
    }
    
    // 시군구 뷰 로드 (히스토리 없이)
    async loadSigunguViewWithoutHistory(sidoId) {
        return this._loadSigunguViewCommon(sidoId, {
            addToHistory: false,
            loadImages: true,
            clearSelection: true
        });
    }
    
    // 시군구 뷰 로드 공통 로직
    async _loadSigunguViewCommon(sidoId, options = {}) {
        const {
            addToHistory = false,
            loadImages = false,
            clearSelection = false
        } = options;
        
        if (this.isLoading) return;
        
        try {
            this.setLoadingState(true);
            this.renderer.showLoading();
            
            // 탐색 기록에 추가 (옵션에 따라)
            if (addToHistory) {
                this.navigationHistory.push({
                    view: 'sido',
                    sidoId: null,
                    sigunguId: null
                });
            }
            
            this.currentView = 'sigungu';
            this.currentSidoId = sidoId;
            this.currentSigunguId = null;
            
            // 이전 선택 상태 초기화 (옵션에 따라)
            if (clearSelection) {
                document.querySelectorAll('.region-path.selected').forEach(el => {
                    el.classList.remove('selected');
                });
            }
            
            // 시도 이름 가져오기
            const sidoName = await this._getSidoNameWithFallback(sidoId);
            
            // 제목을 먼저 업데이트하여 즉각적인 피드백 제공
            this.renderer.updateMapTitle(sidoName);
            
            // SVG 로드 및 UI 업데이트
            await this._loadSigunguUI(sidoId);
            
            // 시도 이미지 로드 (옵션에 따라)
            if (loadImages) {
                this.imageManager.loadSidoImages(sidoId);
            }
            
        } catch (error) {
            console.error('Error loading sigungu view:', error);
            this.renderer.showError('시군구 지도를 불러오는 중 오류가 발생했습니다.');
        } finally {
            this.setLoadingState(false);
        }
    }
    
    // 시도 이름 가져오기 (fallback 포함)
    async _getSidoNameWithFallback(sidoId) {
        let sidoName = this.getSidoName(sidoId);
        
        // 시군구 데이터 로드
        await this.fetchSigunguDataCached(sidoId);
        
        // 시도 이름이 없다면 시군구 데이터에서 가져오기
        if (sidoName === '지역' && this.sigunguData && this.sigunguData.length > 0) {
            const firstSigungu = this.sigunguData[0];
            if (firstSigungu.sido && firstSigungu.sido.sidoName) {
                sidoName = firstSigungu.sido.sidoName;
            }
        }
        
        return sidoName;
    }
    
    // 시군구 UI 로드 및 업데이트
    async _loadSigunguUI(sidoId) {
        const svgPath = this.getSigunguSvgPath(sidoId);
        await this.renderer.loadSvgMap(svgPath);
        this.updateBackButton();
        this.updateDetailContainerClass();
        this.statsRenderer.updateStatsDisplay(this.currentView, this.userStats, this);
        
        // 시군구 클릭 이벤트 바인딩
        this.bindSigunguClickEvents();
    }
    
    // 캐시 관리 메서드들
    isUserLoggedIn() {
        return document.cookie.includes('accessToken=');
    }
    
    getCachedData(key) {
        try {
            const cached = localStorage.getItem(key);
            if (!cached) return null;
            
            const { data, timestamp } = JSON.parse(cached);
            const now = Date.now();
            
            if (now - timestamp > this.CACHE_DURATION) {
                localStorage.removeItem(key);
                return null;
            }
            
            return data;
        } catch (error) {
            console.error('Error reading cache:', error);
            localStorage.removeItem(key);
            return null;
        }
    }
    
    setCachedData(key, data) {
        try {
            const cacheData = {
                data: data,
                timestamp: Date.now()
            };
            localStorage.setItem(key, JSON.stringify(cacheData));
        } catch (error) {
            console.error('Error writing cache:', error);
        }
    }
    
    clearCache() {
        Object.values(this.CACHE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    }
    
    // API 데이터 로딩 메서드들
    async fetchSidoDataWithCache() {
        // 캐시 확인
        const cachedSidoData = this.getCachedData(this.CACHE_KEYS.SIDO_DATA);
        if (cachedSidoData) {
            this.sidoData = cachedSidoData;
            return;
        }
        
        // API 호출
        await this.fetchSidoData();
        
        // 캐시 저장
        if (this.sidoData) {
            this.setCachedData(this.CACHE_KEYS.SIDO_DATA, this.sidoData);
        }
    }
    
    async fetchSidoData() {
        const response = await fetch('/api/location/sido');
        if (!response.ok) {
            throw new Error('Failed to fetch sido data');
        }
        const data = await response.json();
        this.sidoData = Array.isArray(data) ? data : (data.data || []);
    }
    
    async fetchSigunguData(sidoId) {
        const response = await fetch(`/api/location/sido/${sidoId}/sigungu`);
        if (!response.ok) {
            throw new Error('Failed to fetch sigungu data');
        }
        const data = await response.json();
        this.sigunguData = Array.isArray(data) ? data : (data.data || []);
    }
    
    async fetchSigunguDataCached(sidoId) {
        const cacheKey = `sigungu_${sidoId}`;
        
        if (this.cachedSigunguData.has(cacheKey)) {
            this.sigunguData = this.cachedSigunguData.get(cacheKey);
            return;
        }
        
        await this.fetchSigunguData(sidoId);
        this.cachedSigunguData.set(cacheKey, this.sigunguData);
    }
    
    async loadUserStatsWithCache() {
        // 캐시 확인
        const cachedStats = this.getCachedData(this.CACHE_KEYS.USER_STATS);
        if (cachedStats) {
            this.userStats = cachedStats;
            return;
        }
        
        // API 호출
        await this.loadUserStats();
        
        // 캐시 저장
        if (this.userStats) {
            this.setCachedData(this.CACHE_KEYS.USER_STATS, this.userStats);
        }
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
            
            // API 응답 구조 처리
            if (responseData.data && responseData.data.stats) {
                this.userStats = responseData.data.stats;
            } else if (responseData.data) {
                this.userStats = responseData.data;
            } else {
                this.userStats = responseData;
            }
            
        } catch (error) {
            console.error('Error loading user stats:', error);
            this.userStats = null;
        }
    }
    
    // 이벤트 바인딩 메서드들
    bindSidoClickEvents() {
        const paths = document.querySelectorAll('#map-display path');
        paths.forEach(path => {
            path.addEventListener('click', (e) => {
                if (this.isLoading) return;
                
                const sidoId = e.target.id;
                if (sidoId) {
                    this.loadSigunguView(sidoId);
                    
                    // 시도 클릭 시 해당 시도의 이미지들 로드
                    this.imageManager.loadSidoImages(sidoId);
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
        
        // 이미지가 있는 시군구를 색상으로 표시
        this.styleRegionsWithImages();
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
            this.renderer.updateMapTitle(sigunguName);
        }
        
        // 뒤로가기 버튼 가시성 업데이트
        this.updateBackButton();
        
        // 시군구 클릭 시 해당 시군구의 이미지들 로드
        this.imageManager.loadSigunguImages(sigunguId);
        
        // 백엔드에서 상세 시군구 데이터 가져오기
        try {
            await this.fetchSigunguDetail(sigunguId);
        } catch (error) {
            console.error('Error fetching sigungu detail:', error);
        }
    }
    
    async fetchSigunguDetail(sigunguId) {
        const response = await fetch(`/api/location/sigungu/${sigunguId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch sigungu detail');
        }
        const data = await response.json();
        this.processSigunguDetail(data);
        return data;
    }
    
    processSigunguDetail(sigunguDetail) {
        // UI에 표시하지 않고 상세 시군구 데이터 처리
    }
    
    // 네비게이션 메서드들
    goBack() {
        if (this.isLoading) return;
        
        if (this.currentView === 'detail') {
            // 상세 뷰에서 시군구 뷰로 돌아가기
            this.loadSigunguViewWithoutHistory(this.currentSidoId);
        } else if (this.currentView === 'sigungu') {
            // 시군구 뷰에서 시도 뷰로 돌아가기 (캐시 활용)
            this.loadSidoViewWithCache();
        } else if (this.currentView === 'sido') {
            // 시도 뷰에서는 뒤로가기 버튼이 숨겨져야 함
            this.loadSidoViewWithCache();
        }
    }
    
    debouncedGoBack() {
        this.debounce('goBack', () => this.goBack(), 300);
    }
    
    // 유틸리티 메서드들
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
    
    setLoadingState(isLoading) {
        this.isLoading = isLoading;
    }
    
    getSidoName(sidoId) {
        const sidoInfo = Array.isArray(this.sidoData) ?
            this.sidoData.find(sido => String(sido.sd_id || sido.id || sido.sidoId) === String(sidoId)) : null;
        
        return sidoInfo ? (sidoInfo.sd_name || sidoInfo.name || sidoInfo.sidoName || '지역') : '지역';
    }
    
    getSigunguSvgPath(sidoId) {
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
    
    updateBackButton() {
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            if (this.currentView === 'sido') {
                backBtn.style.display = 'none';
            } else {
                backBtn.style.display = 'block';
            }
        }
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
    
    // 지도 요소 스타일링 공통 함수
    _stylePathElement(pathElement, hasImages) {
        if (hasImages) {
            pathElement.style.fill = '#28a745';
            pathElement.classList.add('has-images');
            pathElement.classList.remove('selected');
        } else {
            pathElement.classList.remove('has-images');
            pathElement.classList.remove('selected');
            pathElement.style.setProperty('fill', '#e0e0e0', 'important');
        }
    }
    
    // 지역 색상 스타일링 (캐시 활용)
    async styleRegionsWithCachedImages() {
        if (this.currentView === 'sido') {
            await this.styleSidosWithCachedImages();
        } else if (this.currentView === 'sigungu' || this.currentView === 'detail') {
            await this.styleDistrictsWithCachedImages();
        }
    }
    
    // 기존 지역 색상 스타일링 (실시간 API 호출)
    async styleRegionsWithImages() {
        if (this.currentView === 'sido') {
            await this.styleSidosWithImages();
        } else if (this.currentView === 'sigungu' || this.currentView === 'detail') {
            // 시군구 뷰나 상세 뷰에서는 시군구 지도 색상 업데이트
            await this.styleDistrictsWithImages();
        }
    }
    
    // 캐시된 이미지 상태로 시도 스타일링
    async styleSidosWithCachedImages() {
        if (!this.sidoData) return;
        
        const cachedImageStatus = this.getCachedData(this.CACHE_KEYS.IMAGE_STATUS);
        if (!cachedImageStatus) {
            // 캐시가 없으면 실시간 로드 후 캐시
            await this.styleSidosWithImages();
            return;
        }
        
        for (const sido of this.sidoData) {
            const sidoId = sido.sd_id || sido.id || sido.sidoId;
            const pathElement = document.getElementById(sidoId);
            
            if (pathElement && cachedImageStatus.sido && cachedImageStatus.sido[sidoId]) {
                const imageStatus = cachedImageStatus.sido[sidoId];
                
                if (imageStatus.hasAll) {
                    pathElement.style.setProperty('fill', '#28a745', 'important');
                    pathElement.classList.add('has-images');
                } else if (imageStatus.hasAny) {
                    pathElement.style.setProperty('fill', '#ffc107', 'important');
                    pathElement.classList.add('has-images');
                }
            }
        }
    }
    
    async styleSidosWithImages() {
        if (!this.sidoData) {
            console.warn('No sidoData available for styling');
            return;
        }
        
        console.log(`Styling ${this.sidoData.length} sido regions with fresh image data...`);
        
        // 기존 캐시 데이터를 가져오되, sigungu 정보를 보존
        let cachedImageStatus = this.getCachedData(this.CACHE_KEYS.IMAGE_STATUS);
        if (!cachedImageStatus) {
            cachedImageStatus = { sido: {}, sigungu: {} };
        }
        // sido 객체가 없으면 초기화하되, sigungu는 기존 값 유지
        if (!cachedImageStatus.sido) {
            cachedImageStatus.sido = {};
        }
        
        let styledCount = 0;
        let coloredCount = 0;
        
        for (const sido of this.sidoData) {
            const sidoId = sido.sd_id || sido.id || sido.sidoId;
            const pathElement = document.getElementById(sidoId);
            
            if (pathElement) {
                styledCount++;
                console.log(`Checking images for sido ${sidoId}...`);
                
                const sidoImageStatus = await this.checkSidoHasImages(sidoId);
                cachedImageStatus.sido[sidoId] = sidoImageStatus;
                
                if (sidoImageStatus.hasAll) {
                    pathElement.style.setProperty('fill', '#28a745', 'important');
                    pathElement.classList.add('has-images');
                    coloredCount++;
                    console.log(`Sido ${sidoId} colored GREEN (has all images)`);
                } else if (sidoImageStatus.hasAny) {
                    pathElement.style.setProperty('fill', '#ffc107', 'important');
                    pathElement.classList.add('has-images');
                    coloredCount++;
                    console.log(`Sido ${sidoId} colored YELLOW (has some images)`);
                } else {
                    console.log(`Sido ${sidoId} not colored (no images)`);
                }
            } else {
                console.warn(`SVG path element not found for sido ${sidoId}`);
            }
        }
        
        console.log(`Completed styling: ${styledCount} processed, ${coloredCount} colored`);
        
        // 이미지 상태 캐시 업데이트 (sigungu 정보 보존)
        this.setCachedData(this.CACHE_KEYS.IMAGE_STATUS, cachedImageStatus);
    }
    
    // 캐시된 이미지 상태로 시군구 스타일링
    async styleDistrictsWithCachedImages() {
        if (!this.sigunguData || !this.currentSidoId) return;
        
        const cachedImageStatus = this.getCachedData(this.CACHE_KEYS.IMAGE_STATUS);
        if (!cachedImageStatus || !cachedImageStatus.sigungu) {
            // 캐시가 없으면 실시간 로드
            await this.styleDistrictsWithImages();
            return;
        }
        
        for (const sigungu of this.sigunguData) {
            const sigunguId = sigungu.sigunguId;
            const pathElement = document.getElementById(sigunguId);
            
            if (pathElement) {
                const hasImages = cachedImageStatus.sigungu[sigunguId] || false;
                this._stylePathElement(pathElement, hasImages);
            }
        }
    }
    
    async styleDistrictsWithImages() {
        if (!this.sigunguData || !this.currentSidoId) return;
        
        // 기존 캐시 데이터를 가져오되, sido 정보를 보존
        let cachedImageStatus = this.getCachedData(this.CACHE_KEYS.IMAGE_STATUS);
        if (!cachedImageStatus) {
            cachedImageStatus = { sido: {}, sigungu: {} };
        }
        // sigungu 객체가 없으면 초기화하되, sido는 기존 값 유지
        if (!cachedImageStatus.sigungu) {
            cachedImageStatus.sigungu = {};
        }

        for (const sigungu of this.sigunguData) {
            const sigunguId = sigungu.sigunguId;
            const pathElement = document.getElementById(sigunguId);
            
            if (pathElement) {
                const hasImages = await this.checkSigunguHasImages(sigunguId);
                cachedImageStatus.sigungu[sigunguId] = hasImages;
                this._stylePathElement(pathElement, hasImages);
            }
        }
        
        // 이미지 상태 캐시 업데이트 (sido 정보 보존)
        this.setCachedData(this.CACHE_KEYS.IMAGE_STATUS, cachedImageStatus);
    }
    
    async checkSidoHasImages(sidoId) {
        try {
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
    
    // 시도 이미지 캐시만 업데이트 (SVG 스타일 적용 없이)
    async updateSidoImageCache() {
        if (!this.sidoData) {
            console.warn('No sidoData available for cache update');
            return;
        }
        
        console.log(`Updating sido image cache for ${this.sidoData.length} regions...`);
        
        // 기존 캐시 데이터를 가져오되, sigungu 정보를 보존
        let cachedImageStatus = this.getCachedData(this.CACHE_KEYS.IMAGE_STATUS);
        if (!cachedImageStatus) {
            cachedImageStatus = { sido: {}, sigungu: {} };
        }
        // sido 객체가 없으면 초기화하되, sigungu는 기존 값 유지
        if (!cachedImageStatus.sido) {
            cachedImageStatus.sido = {};
        }
        
        let updatedCount = 0;
        
        for (const sido of this.sidoData) {
            const sidoId = sido.sd_id || sido.id || sido.sidoId;
            console.log(`📦 Caching image status for sido ${sidoId}...`);
            
            const sidoImageStatus = await this.checkSidoHasImages(sidoId);
            cachedImageStatus.sido[sidoId] = sidoImageStatus;
            updatedCount++;
            
            console.log(`Sido ${sidoId} cache updated: hasAny=${sidoImageStatus.hasAny}, hasAll=${sidoImageStatus.hasAll}`);
        }
        
        console.log(`Completed cache update: ${updatedCount} sido regions cached`);
        
        // 이미지 상태 캐시 업데이트 (sigungu 정보 보존)
        this.setCachedData(this.CACHE_KEYS.IMAGE_STATUS, cachedImageStatus);
    }

    // 새로고침 메서드들 (이미지 업로드/수정 후 호출)
    async refreshMapColors() {
        // 이미지 상태 캐시 완전 삭제
        localStorage.removeItem(this.CACHE_KEYS.IMAGE_STATUS);
        
        console.log('Starting map colors refresh...', {
            currentView: this.currentView,
            hasSidoData: !!this.sidoData,
            hasSigunguData: !!this.sigunguData
        });
        
        // DOM이 준비될 때까지 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 현재 뷰에 따라 지도 색상을 강제로 새로고침
        if (this.currentView === 'sido') {
            // 시도 뷰에 있을 때는 시도 색상을 강제로 업데이트
            console.log('Force updating sido colors for national map...');
            
            // SVG 요소들이 존재하는지 확인
            const svgPaths = document.querySelectorAll('#map-display path');
            console.log(`Found ${svgPaths.length} SVG paths for coloring`);
            
            if (svgPaths.length > 0) {
                await this.styleRegionsWithImages(); // 캐시 없이 실시간 호출
            } else {
                console.warn('No SVG paths found for coloring - delaying and retrying...');
                // SVG가 아직 로드되지 않았을 수 있으므로 잠시 후 재시도
                await new Promise(resolve => setTimeout(resolve, 500));
                await this.styleRegionsWithImages();
            }
        } else if (this.currentView === 'sigungu' || this.currentView === 'detail') {
            // 시군구 뷰에 있을 때는 현재 보이는 시군구 색상만 업데이트하고, 
            // 시도 색상은 캐시만 업데이트 (SVG가 없으므로 실제 색상 적용은 하지 않음)
            console.log('Updating colors for sigungu map and caching sido data...');
            
            // 시도 색상 캐시만 업데이트 (SVG 요소가 없으므로 색상 적용은 건너뜀)
            if (this.sidoData) {
                console.log('Updating sido color cache in background...');
                await this.updateSidoImageCache();
            }
            
            // 현재 보이는 시군구 색상 업데이트
            if (this.sigunguData) {
                await this.styleDistrictsWithImages(); 
            }
        }
        
        console.log('✅ Map colors refreshed for all views');
    }
    
    async refreshUserStats() {
        // 사용자 통계 캐시 삭제
        localStorage.removeItem(this.CACHE_KEYS.USER_STATS);
        await this.loadUserStats();
        this.statsRenderer.updateStatsDisplay(this.currentView, this.userStats);
    }
    
    // 전체 캐시 삭제 (로그아웃 시 또는 데이터 문제 시 사용)
    clearAllCache() {
        this.clearCache();
    }
    
    // 이미지 업로드/수정 완료 후 호출할 메서드
    async onImageUpdated() {
        await this.refreshMapColors();
        if (this.isUserLoggedIn()) {
            await this.refreshUserStats();
        }
    }
}
