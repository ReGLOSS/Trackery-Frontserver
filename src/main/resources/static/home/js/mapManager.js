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
        await this.loadUserStats();
        await this.loadSidoView();
    }
    
    bindEvents() {
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.debouncedGoBack());
        }
    }
    
    // 시도 뷰 로드
    async loadSidoView() {
        if (this.isLoading) return;
        
        try {
            this.setLoadingState(true);
            this.renderer.showLoading();
            this.currentView = 'sido';
            this.currentSidoId = null;
            this.currentSigunguId = null;
            
            // API에서 시도 데이터 로드
            await this.fetchSidoData();
            
            // SVG 지도 로드
            await this.renderer.loadSvgMap('/map/svg/simpleSido.svg');
            
            // UI 업데이트
            this.updateBackButton();
            this.renderer.clearMapTitle();
            this.updateDetailContainerClass();
            this.statsRenderer.updateStatsDisplay(this.currentView, this.userStats);
            
            // 시도 클릭 이벤트 바인딩
            this.bindSidoClickEvents();
            
            // 이미지가 있는 시도를 초록색으로 표시
            await this.styleRegionsWithImages();
            
        } catch (error) {
            console.error('Error loading sido view:', error);
            this.renderer.showError('지도를 불러오는 중 오류가 발생했습니다.');
        } finally {
            this.setLoadingState(false);
        }
    }
    
    // 시군구 뷰 로드
    async loadSigunguView(sidoId) {
        if (this.isLoading) return;
        
        try {
            this.setLoadingState(true);
            this.renderer.showLoading();
            
            // 탐색 기록에 추가
            this.navigationHistory.push({
                view: 'sido',
                sidoId: null,
                sigunguId: null
            });
            
            this.currentView = 'sigungu';
            this.currentSidoId = sidoId;
            this.currentSigunguId = null;
            
            // 시도 이름 가져오기
            let sidoName = this.getSidoName(sidoId);
            
            // 시군구 데이터 로드
            await this.fetchSigunguDataCached(sidoId);
            
            // 여전히 시도 이름이 없다면 시군구 데이터에서 가져오기
            if (sidoName === '지역' && this.sigunguData && this.sigunguData.length > 0) {
                const firstSigungu = this.sigunguData[0];
                if (firstSigungu.sido && firstSigungu.sido.sidoName) {
                    sidoName = firstSigungu.sido.sidoName;
                }
            }
            
            // 제목을 먼저 업데이트하여 즉각적인 피드백 제공
            this.renderer.updateMapTitle(sidoName);
            
            // SVG 로드
            const svgPath = this.getSigunguSvgPath(sidoId);
            await this.renderer.loadSvgMap(svgPath);
            this.updateBackButton();
            this.updateDetailContainerClass();
            this.statsRenderer.updateStatsDisplay(this.currentView, this.userStats);
            
            // 시군구 클릭 이벤트 바인딩
            this.bindSigunguClickEvents();
            
        } catch (error) {
            console.error('Error loading sigungu view:', error);
            this.renderer.showError('시군구 지도를 불러오는 중 오류가 발생했습니다.');
        } finally {
            this.setLoadingState(false);
        }
    }
    
    // 시군구 뷰 로드 (히스토리 없이)
    async loadSigunguViewWithoutHistory(sidoId) {
        if (this.isLoading) return;
        
        try {
            this.setLoadingState(true);
            this.renderer.showLoading();
            
            this.currentView = 'sigungu';
            this.currentSidoId = sidoId;
            this.currentSigunguId = null;
            
            // 이전 선택 상태 초기화
            document.querySelectorAll('.region-path.selected').forEach(el => {
                el.classList.remove('selected');
            });
            
            // 시도 이름 가져오기
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
            
            // 제목을 먼저 업데이트하여 즉각적인 피드백 제공
            this.renderer.updateMapTitle(sidoName);
            
            // SVG 로드
            const svgPath = this.getSigunguSvgPath(sidoId);
            await this.renderer.loadSvgMap(svgPath);
            this.updateBackButton();
            this.updateDetailContainerClass();
            this.statsRenderer.updateStatsDisplay(this.currentView, this.userStats);
            
            // 시군구 클릭 이벤트 바인딩
            this.bindSigunguClickEvents();
            
            // 시도 이미지 로드 (뒤로가기 시)
            this.imageManager.loadSidoImages(sidoId);
            
        } catch (error) {
            console.error('Error loading sigungu view:', error);
            this.renderer.showError('시군구 지도를 불러오는 중 오류가 발생했습니다.');
        } finally {
            this.setLoadingState(false);
        }
    }
    
    // API 데이터 로딩 메서드들
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
            // 시군구 뷰에서 시도 뷰로 돌아가기
            this.loadSidoView();
        } else if (this.currentView === 'sido') {
            // 시도 뷰에서는 뒤로가기 버튼이 숨겨져야 함
            this.loadSidoView();
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
    
    // 지역 색상 스타일링
    async styleRegionsWithImages() {
        if (this.currentView === 'sido') {
            await this.styleSidosWithImages();
        } else if (this.currentView === 'sigungu' || this.currentView === 'detail') {
            // 시군구 뷰나 상세 뷰에서는 시군구 지도 색상 업데이트
            await this.styleDistrictsWithImages();
        }
    }
    
    async styleSidosWithImages() {
        if (!this.sidoData) return;
        
        for (const sido of this.sidoData) {
            const sidoId = sido.sd_id || sido.id || sido.sidoId;
            const pathElement = document.getElementById(sidoId);
            
            if (pathElement) {
                const imageStatus = await this.checkSidoHasImages(sidoId);
                
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
    
    async styleDistrictsWithImages() {
        if (!this.sigunguData) return;

        for (const sigungu of this.sigunguData) {
            const sigunguId = sigungu.sigunguId;
            const pathElement = document.getElementById(sigunguId);
            
            if (pathElement) {
                const hasImages = await this.checkSigunguHasImages(sigunguId);
                
                if (hasImages) {
                    pathElement.style.fill = '#28a745';
                    pathElement.classList.add('has-images');
                    // 이미지가 있는 지역은 선택 상태를 해제
                    pathElement.classList.remove('selected');
                } else {
                    // 이미지가 없는 지역은 has-images 클래스 제거하고 기본 회색으로 설정
                    pathElement.classList.remove('has-images');
                    pathElement.classList.remove('selected');
                    pathElement.style.setProperty('fill', '#e0e0e0', 'important');
                }
            }
        }
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
    
    // 새로고침 메서드들
    async refreshMapColors() {
        await this.styleRegionsWithImages();
    }
    
    async refreshUserStats() {
        await this.loadUserStats();
        this.statsRenderer.updateStatsDisplay(this.currentView, this.userStats);
    }
}
