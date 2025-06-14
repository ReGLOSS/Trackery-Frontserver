class MapManager {
    constructor() {
        this.currentView = 'sido'; // 'sido', 'sigungu', 또는 'detail'
        this.currentSidoId = null;
        this.currentSigunguId = null;
        this.sidoData = null;
        this.sigunguData = null;
        this.navigationHistory = []; // 뒤로가기 버튼을 위한 탐색 기록 추적

        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadSidoView();
    }

    bindEvents() {
        const backBtn = document.getElementById('back-btn');
        backBtn.addEventListener('click', () => this.goBack());
    }

    async loadSidoView() {
        try {
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

            // 시도 클릭 이벤트 바인딩
            this.bindSidoClickEvents();

        } catch (error) {
            console.error('Error loading sido view:', error);
            this.showError('지도를 불러오는 중 오류가 발생했습니다.');
        }
    }

    async loadSigunguView(sidoId) {
        try {
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

            // API에서 시군구 데이터 로드
            await this.fetchSigunguData(sidoId);

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

            // 시군구 클릭 이벤트 바인딩
            this.bindSigunguClickEvents();

        } catch (error) {
            console.error('Error loading sigungu view:', error);
            this.showError('시군구 지도를 불러오는 중 오류가 발생했습니다.');
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
                const sidoId = e.target.id;
                if (sidoId) {
                    // 시도 정보를 찾아서 이름만 표시
                    const sidoInfo = this.sidoData?.find(sido => String(sido.sd_id) === String(sidoId));
                    const sidoName = sidoInfo ? (sidoInfo.sd_name || sidoInfo.name || sidoInfo.sidoName || '지역') : '지역';

                            // 시도 이름만 표시하고 시군구 지도로 이동
                    this.updateMapTitle(sidoName);
                    this.loadSigunguView(sidoId);
                }
            });
        });
    }

    bindSigunguClickEvents() {
        const paths = document.querySelectorAll('#map-display path');
        paths.forEach(path => {
            path.addEventListener('click', (e) => {
                const sigunguId = e.target.id;
                if (sigunguId) {
                    this.handleSigunguClick(sigunguId);
                }
            });
        });
    }

    async handleSigunguClick(sigunguId) {
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

    async loadSigunguViewWithoutHistory(sidoId) {
        // loadSigunguView와 동일하지만 기록에 추가하지 않음
        try {
            this.showLoading();

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

            // API에서 시군구 데이터 로드
            await this.fetchSigunguData(sidoId);

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

            // 시군구 클릭 이벤트 바인딩
            this.bindSigunguClickEvents();

        } catch (error) {
            console.error('Error loading sigungu view:', error);
            this.showError('시군구 지도를 불러오는 중 오류가 발생했습니다.');
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

// DOM이 로드되면 초기화
document.addEventListener('DOMContentLoaded', () => {
    new MapManager();
});
