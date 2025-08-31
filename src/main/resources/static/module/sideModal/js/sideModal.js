/**
 * 통합 사이드모달 관리 클래스
 * 
 * 기존 HTML 요소를 재활용하여 우측에서 슬라이드되는 모달을 관리합니다.
*
 * 주요 특징:
 * - 기존 DOM 구조 재활용으로 메모리 효율성 극대화
 * - 0.3s ease-in-out 슬라이드 애니메이션 (이미지 업로드 모달과 동일)
 * - 오버레이 클릭, ESC 키, 닫기 버튼을 통한 모달 닫기 지원
 * - onBeforeOpen, onOpen, onClose, onBeforeClose 생명주기 콜백
 * - 메모리 누수 방지를 위한 자동 정리 시스템
 * - 성능 최적화를 위한 캐싱 및 이벤트 풀링
 */
class SideModal {
    // 정적 속성들 - 인스턴스 관리 및 성능 최적화
    static _instances = new WeakMap();      // 모든 인스턴스 추적 (WeakMap으로 메모리 누수 방지)
    static _activeInstances = new Set();    // 활성 인스턴스 추적
    static _globalEventListeners = new Map(); // 전역 이벤트 리스너 관리
    static _performanceMetrics = {          // 성능 메트릭
        totalInstances: 0,
        activeInstances: 0,
        memoryUsage: 0,
        lastCleanup: Date.now()
    };
    static _cleanupInterval = null;         // 전역 정리 인터벌
    static _isCleanupRunning = false;       // 정리 작업 진행 상태

    constructor(options = {}) {
        // 기본 옵션 설정 (이미지 업로드 모달과 동일한 크기와 애니메이션)
        this.options = {
            width: 'clamp(18.75rem, 30vw, 37.5%)',
            height: '100vh',
            customClass: '',
            closeOnOverlay: true,
            closeOnEscape: true,
            title: '',
            showCloseButton: true,
            position: 'right', // 고정값
            animation: {
                duration: '0.3s',
                easing: 'ease-in-out',
                type: 'slideX'  // transform: translateX 애니메이션
            },
            // 성능 최적화 옵션
            performance: {
                enableDebounce: true,           // 이벤트 디바운싱 활성화
                debounceDelay: 100,             // 디바운스 지연 시간 (ms)
                enableThrottle: true,           // 이벤트 스로틀링 활성화
                throttleDelay: 16,              // 스로틀 지연 시간 (ms, ~60fps)
                enableLazyLoading: true,        // 지연 로딩 활성화
                enableMemoryOptimization: true, // 메모리 최적화 활성화
                enableEventPooling: true,       // 이벤트 풀링 활성화
                maxCachedElements: 10,          // 최대 캐시 요소 수
                autoCleanupInterval: 300000     // 자동 정리 간격 (5분)
            },
            ...options
        };

        // 상태 관리
        this.isOpen = false;
        this.isDestroyed = false;
        this.isInitialized = false;
        this.isAnimating = false;           // 애니메이션 진행 상태
        this.lastInteractionTime = Date.now(); // 마지막 상호작용 시간

        // DOM 요소 참조 (기존 HTML 요소를 찾아서 사용)
        this.container = null;
        this.overlay = null;
        this.modalBody = null;
        this.modalTitle = null;
        this.modalActions = null;

        // 성능 최적화를 위한 캐시
        this._elementCache = new Map();     // DOM 요소 캐시
        this._computedStyleCache = new Map(); // 계산된 스타일 캐시
        this._templateCache = new Map();    // 템플릿 캐시
        this._eventListenerCache = new Set(); // 등록된 이벤트 리스너 추적

        // 콜백 함수들
        this.callbacks = {
            onBeforeOpen: null,  // 모달이 열리기 전 실행 (false 반환 시 열기 취소)
            onOpen: null,        // 모달이 열린 후 실행
            onClose: null,       // 모달이 닫힌 후 실행
            onBeforeClose: null, // 모달이 닫히기 전 실행 (false 반환 시 닫기 취소)
            onError: null        // 에러 발생 시 실행
        };

        // 이벤트 핸들러 바인딩 (성능 최적화를 위해 한 번만 바인딩)
        this._boundHandleOverlayClick = this._handleOverlayClick.bind(this);
        this._boundHandleEscapeKey = this._handleEscapeKey.bind(this);
        this._boundHandleCloseButton = this._handleCloseButton.bind(this);
        this._boundStopPropagation = this._stopPropagation.bind(this);

        // 디바운스/스로틀 함수들
        this._debouncedResize = null;
        this._throttledScroll = null;
        this._debouncedCleanup = null;

        // 자동 정리 타이머
        this._autoCleanupTimer = null;
        this._setupAutoCleanup();

        // 인스턴스 등록 (전역 관리를 위해)
        SideModal._registerInstance(this);
    }

    /**
     * 기존 모달 요소를 찾아 초기화하는 메서드
     * DOM 생성 방식에서 기존 HTML 활용 방식으로 변경
     * @param {string} modalSelector - 모달 컨테이너 선택자 (예: '#detailModal', '.detail-modal')
     * @returns {SideModal} 메서드 체이닝을 위한 this 반환
     */
    init(modalSelector) {
        if (this.isDestroyed) {
            console.error('파괴된 모달은 초기화할 수 없습니다.');
            return this;
        }

        if (this.isInitialized) {
            console.warn('이미 초기화된 모달입니다.');
            return this;
        }

        try {
            // 기존 모달 요소 찾기
            this.container = document.querySelector(modalSelector);
            if (!this.container) {
                console.error(`모달 요소를 찾을 수 없습니다: ${modalSelector}`);
                throw new Error(`모달 요소를 찾을 수 없습니다: ${modalSelector}`);
            }

            // 기존 모달 내부 요소들 찾기
            // 마이페이지 모달의 경우 컨테이너 자체가 오버레이 역할
            if (this.container.classList.contains('update-user-info-modal-container')) {
                // 마이페이지 모달 구조
                this.overlay = this.container;
                this.modalBody = this.container.querySelector('.backplate');
                this.modalContent = this.container.querySelector('.modal-content');
            } else if (this.container.classList.contains('modal-overlay')) {
                // 앨범 모달의 경우 컨테이너 자체가 오버레이 역할
                this.overlay = this.container;
                this.modalBody = this.container.querySelector('.modal-body, .album-modal-sidebar-container');
            } else {
                // 일반적인 모달 구조
                this.overlay = this.container.querySelector('.modal-overlay');
                this.modalBody = this.container.querySelector('.modal-body');
            }

            // 헤더와 제목, 액션 영역은 선택적으로 찾기 (없을 수도 있음)
            const modalHeader = this.container.querySelector('.modal-header');
            this.modalTitle = modalHeader ? modalHeader.querySelector('.modal-title, h3') : null;
            this.modalActions = modalHeader ? modalHeader.querySelector('.modal-actions') : null;

            // 필수 요소 검증
            if (!this.overlay) {
                console.warn('오버레이 요소를 찾을 수 없습니다. 오버레이 클릭 기능이 비활성화됩니다.');
            }

            if (!this.modalBody) {
                console.warn('모달 바디 요소를 찾을 수 없습니다. 내용 업데이트 기능이 제한될 수 있습니다.');
            }

            // 커스텀 클래스 추가
            if (this.options.customClass) {
                this.container.classList.add(this.options.customClass);
            }

            // 기존 모달 크기 설정 (필요시에만)
            const detailContainer = this.container.querySelector('.detail-container');
            if (detailContainer && (this.options.width !== 'clamp(18.75rem, 30vw, 37.5%)' || this.options.height !== '100vh')) {
                detailContainer.style.width = this.options.width;
                detailContainer.style.height = this.options.height;
            }

            // 초기화 완료
            this.isInitialized = true;
            console.log('SideModal 초기화 완료:', modalSelector);

        } catch (error) {
            console.error('SideModal 초기화 실패:', error);
            throw error;
        }

        return this;
    }

    /**
     * 모달 열기 (기존 HTML 요소를 활용)
     * @param {string|HTMLElement|Object} config - 모달 설정 또는 내용
     * @returns {SideModal} 메서드 체이닝을 위한 this 반환
     */
    open(config = {}) {
        // 성능 최적화: 상호작용 시간 업데이트
        this._updateLastInteractionTime();

        if (this.isDestroyed) {
            console.error('파괴된 모달은 열 수 없습니다.');
            return this;
        }

        if (!this.isInitialized) {
            console.error('모달이 초기화되지 않았습니다. init() 메서드를 먼저 호출하세요.');
            return this;
        }

        if (this.isOpen) {
            console.warn('모달이 이미 열려있습니다.');
            return this;
        }

        // 애니메이션 상태 설정
        this.isAnimating = true;

        // config가 문자열이나 HTMLElement인 경우 content로 처리
        if (typeof config === 'string' || config instanceof HTMLElement) {
            config = { content: config };
        }

        const { content, title } = config;

        // 내용 설정
        if (content) {
            this.updateContent(content);
        }

        // 제목 설정
        if (title && this.modalTitle) {
            this.modalTitle.textContent = title;
        }

        // onBeforeOpen 콜백 실행
        const shouldContinue = this._executeCallback('onBeforeOpen', config, this);
        if (shouldContinue === false) {
            console.log('onBeforeOpen 콜백이 false를 반환하여 모달 열기가 취소되었습니다.');
            return this;
        }

        // 애니메이션 시작 전 초기 상태 설정
        this._prepareOpenAnimation();

        // 모달 표시 (이미지 업로드 모달과 동일한 방식)
        this.container.style.display = 'block';

        // 이벤트 리스너 등록
        this._bindEvents();

        // 애니메이션을 위한 지연 후 show 클래스 추가 10ms 지연)
        // 브라우저 리플로우를 위한 최소 지연
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this._executeOpenAnimation();
                this.isOpen = true;
                this.isAnimating = false; // 애니메이션 완료

                // onOpen 콜백 실행
                this._executeCallback('onOpen', this);
            });
        });

        return this;
    }

    /**
     * 모달 닫기 (기존 HTML 요소를 활용)
     * @returns {SideModal} 메서드 체이닝을 위한 this 반환
     */
    close() {
        // 성능 최적화: 상호작용 시간 업데이트
        this._updateLastInteractionTime();

        if (this.isDestroyed) {
            console.error('파괴된 모달은 조작할 수 없습니다.');
            return this;
        }

        if (!this.isInitialized) {
            console.error('모달이 초기화되지 않았습니다.');
            return this;
        }

        if (!this.isOpen) {
            return this;
        }

        // onBeforeClose 콜백 실행
        const shouldClose = this._executeCallback('onBeforeClose', this);
        if (shouldClose === false) {
            console.log('onBeforeClose 콜백이 false를 반환하여 모달 닫기가 취소되었습니다.');
            return this;
        }

        // 애니메이션 시작 (show 클래스 제거로 슬라이드 아웃 애니메이션 시작)
        this._executeCloseAnimation();

        // 애니메이션 완료 후 모달 숨기기 (마이페이지 모달은 150ms, 일반 모달은 300ms)
        const animationDuration = this.container.classList.contains('update-user-info-modal-container') ? 150 : 300;
        setTimeout(() => {
            this._completeCloseAnimation();
            this.isOpen = false;
            this.isAnimating = false; // 애니메이션 완료

            // 이벤트 리스너 해제
            this._unbindEvents();

            // onClose 콜백 실행
            this._executeCallback('onClose', this);
        }, animationDuration);

        return this;
    }

    /**
     * 이벤트 콜백 등록
     */
    on(eventName, callback) {
        if (this.isDestroyed) {
            console.error('파괴된 모달에는 콜백을 등록할 수 없습니다.');
            return this;
        }

        if (!this.callbacks.hasOwnProperty(eventName)) {
            console.error(`지원되지 않는 이벤트입니다: ${eventName}. 지원되는 이벤트: ${Object.keys(this.callbacks).join(', ')}`);
            return this;
        }

        if (typeof callback !== 'function') {
            console.error('콜백은 함수여야 합니다.');
            return this;
        }

        this.callbacks[eventName] = callback;
        console.log(`콜백 등록됨: ${eventName}`);
        return this; // 메서드 체이닝 지원
    }

    /**
     * 이벤트 리스너 등록
     * 기존 모달의 오버레이 클릭, ESC 키, 닫기 버튼 이벤트 처리 재구현
     */
    _bindEvents() {
        // 마지막 상호작용 시간 업데이트
        this._updateLastInteractionTime();

        // 오버레이 클릭 이벤트
        if (this.options.closeOnOverlay && this.overlay) {
            // 디바운스 적용 (중복 클릭 방지)
            const debouncedHandler = this.options.performance.enableDebounce ? 
                this._createDebounced(this._boundHandleOverlayClick, this.options.performance.debounceDelay) :
                this._boundHandleOverlayClick;
            
            this._addTrackedEventListener(this.overlay, 'click', debouncedHandler, { passive: false });
        }

        // ESC 키 이벤트
        if (this.options.closeOnEscape) {
            // 스로틀 적용 (연속 키 입력 최적화)
            const throttledHandler = this.options.performance.enableThrottle ?
                this._createThrottled(this._boundHandleEscapeKey, this.options.performance.throttleDelay) :
                this._boundHandleEscapeKey;
            
            this._addTrackedEventListener(document, 'keydown', throttledHandler, { passive: false });
        }

        // 닫기 버튼 클릭 이벤트
        if (this.options.showCloseButton) {
            // 캐시된 요소 검색 사용
            const closeButtons = this.container.querySelectorAll('.modal-close-btn, .close, [data-dismiss="modal"]');
            closeButtons.forEach(closeButton => {
                this._addTrackedEventListener(closeButton, 'click', this._boundHandleCloseButton, { passive: false });
            });
        }

        // 모달 컨테이너 클릭 시 이벤트 전파 방지 (오버레이 클릭과 구분)
        const detailContainer = this._getCachedElement('.detail-container');
        if (detailContainer) {
            this._addTrackedEventListener(detailContainer, 'click', this._boundStopPropagation, { passive: true });
        }

        // 리사이즈 이벤트 (반응형 대응)
        if (this.options.performance.enableThrottle) {
            this._debouncedResize = this._createDebounced(() => {
                this._handleResize();
            }, 250);
            this._addTrackedEventListener(window, 'resize', this._debouncedResize, { passive: true });
        }

        // 스크롤 이벤트 (성능 최적화)
        if (this.options.performance.enableThrottle) {
            this._throttledScroll = this._createThrottled(() => {
                this._handleScroll();
            }, this.options.performance.throttleDelay);
            this._addTrackedEventListener(window, 'scroll', this._throttledScroll, { passive: true });
        }
    }

    /**
     * 이벤트 리스너 해제
     * 메모리 누수 방지를 위한 완전한 이벤트 정리
     */
    _unbindEvents() {
        // 추적된 모든 이벤트 리스너 해제 (성능 최적화)
        this._removeAllTrackedEventListeners();

        // 디바운스/스로틀 함수 정리
        if (this._debouncedResize) {
            this._debouncedResize = null;
        }
        if (this._throttledScroll) {
            this._throttledScroll = null;
        }
        if (this._debouncedCleanup) {
            this._debouncedCleanup = null;
        }

        // 레거시 이벤트 리스너 해제 (호환성 유지)
        if (this.overlay) {
            this.overlay.removeEventListener('click', this._boundHandleOverlayClick);
        }

        document.removeEventListener('keydown', this._boundHandleEscapeKey);

        if (this.options.showCloseButton && this.container) {
            const closeButtons = this.container.querySelectorAll('.modal-close-btn, .close, [data-dismiss="modal"]');
            closeButtons.forEach(closeButton => {
                closeButton.removeEventListener('click', this._boundHandleCloseButton);
            });
        }

        const detailContainer = this.container && this.container.querySelector('.detail-container');
        if (detailContainer) {
            detailContainer.removeEventListener('click', this._boundStopPropagation);
        }

        // 윈도우 이벤트 해제
        if (this._debouncedResize) {
            window.removeEventListener('resize', this._debouncedResize);
        }
        if (this._throttledScroll) {
            window.removeEventListener('scroll', this._throttledScroll);
        }
    }

    /**
     * 오버레이 클릭 핸들러
     * 오버레이 클릭 시 모달 닫기
     */
    _handleOverlayClick(event) {
        try {
            // 정확히 오버레이를 클릭했을 때만 모달 닫기 (이벤트 버블링 방지)
            if (event.target === this.overlay || event.target === this.container) {
                event.preventDefault();
                event.stopPropagation();

                // onBeforeClose 콜백으로 닫기 취소 가능
                const shouldClose = this._executeCallback('onBeforeClose', this);
                if (shouldClose !== false) {
                    this.close();
                }
            }
        } catch (error) {
            console.error(`오버레이 클릭 처리 중 오류 발생: ${error.message}`, error);
        }
    }

    /**
     * ESC 키 핸들러
     * ESC 키 누를 때 모달 닫기
     */
    _handleEscapeKey(event) {
        try {
            // ESC 키이고 모달이 열려있을 때만 처리
            if (event.key === 'Escape' && this.isOpen) {
                event.preventDefault();
                event.stopPropagation();

                // onBeforeClose 콜백으로 닫기 취소 가능
                const shouldClose = this._executeCallback('onBeforeClose', this);
                if (shouldClose !== false) {
                    this.close();
                }
            }
        } catch (error) {
            console.error(`ESC 키 처리 중 오류 발생: ${error.message}`, error);
        }
    }

    /**
     * 닫기 버튼 클릭 핸들러
     * 닫기 버튼 클릭 시 모달 닫기
     */
    _handleCloseButton(event) {
        try {
            event.preventDefault();
            event.stopPropagation();

            // onBeforeClose 콜백으로 닫기 취소 가능
            const shouldClose = this._executeCallback('onBeforeClose', this);
            if (shouldClose !== false) {
                this.close();
            }
        } catch (error) {
            console.error(`닫기 버튼 처리 중 오류 발생: ${error.message}`, error);
        }
    }

    /**
     * 이벤트 전파 방지 헬퍼 메서드
     */
    _stopPropagation(event) {
        event.stopPropagation();
    }

    /**
     * 윈도우 리사이즈 핸들러 (성능 최적화)
     */
    _handleResize() {
        if (this.isDestroyed || !this.isOpen) return;

        this._updateLastInteractionTime();

        // 모달 크기 재조정 (필요한 경우)
        if (this.container) {
            const detailContainer = this._getCachedElement('.detail-container');
            if (detailContainer) {
                // 반응형 크기 재계산
                const computedWidth = this._getCachedComputedStyle(detailContainer, 'width');
                if (computedWidth !== detailContainer.style.width) {
                    // 크기가 변경된 경우에만 업데이트
                    detailContainer.style.width = this.options.width;
                }
            }
        }

        // 콜백 실행
        this._executeCallback('onResize', this);
    }

    /**
     * 윈도우 스크롤 핸들러 (성능 최적화)
     */
    _handleScroll() {
        if (this.isDestroyed || !this.isOpen) return;

        this._updateLastInteractionTime();

        // 스크롤 위치에 따른 모달 위치 조정 (필요한 경우)
        // 현재는 고정 위치이므로 특별한 처리 없음

        // 콜백 실행
        this._executeCallback('onScroll', this);
    }

    // ==================== 성능 최적화 및 메모리 관리 메서드들 ====================

    /**
     * 자동 정리 설정
     */
    _setupAutoCleanup() {
        if (!this.options.performance.enableMemoryOptimization) {
            return;
        }

        const interval = this.options.performance.autoCleanupInterval;
        this._autoCleanupTimer = setInterval(() => {
            this._performInstanceCleanup();
        }, interval);
    }

    /**
     * 인스턴스별 정리 작업 수행
     * @private
     */
    _performInstanceCleanup() {
        if (this.isDestroyed) {
            this._clearAutoCleanup();
            return;
        }

        const now = Date.now();
        const timeSinceLastInteraction = now - this.lastInteractionTime;
        
        // 30분 이상 사용하지 않은 경우 캐시 정리
        if (timeSinceLastInteraction > 30 * 60 * 1000) {
            this._clearCaches();
        }

        // 1시간 이상 사용하지 않은 경우 더 적극적인 정리
        if (timeSinceLastInteraction > 60 * 60 * 1000) {
            this.cleanup();
        }
    }

    /**
     * 캐시 정리
     */
    _clearCaches() {
        // 요소 캐시 정리 (최근 사용하지 않은 것들만)
        const maxCacheSize = this.options.performance.maxCachedElements;
        if (this._elementCache.size > maxCacheSize) {
            const entries = Array.from(this._elementCache.entries());
            const toDelete = entries.slice(0, entries.length - maxCacheSize);
            toDelete.forEach(([key]) => this._elementCache.delete(key));
        }

        // 스타일 캐시 정리
        if (this._computedStyleCache.size > 50) {
            this._computedStyleCache.clear();
        }

        // 템플릿 캐시 정리 (오래된 것들만)
        const templateEntries = Array.from(this._templateCache.entries());
        templateEntries.forEach(([key, value]) => {
            if (value.lastUsed && (Date.now() - value.lastUsed) > 10 * 60 * 1000) {
                this._templateCache.delete(key);
            }
        });
    }

    /**
     * 자동 정리 타이머 해제
     */
    _clearAutoCleanup() {
        if (this._autoCleanupTimer) {
            clearInterval(this._autoCleanupTimer);
            this._autoCleanupTimer = null;
        }
    }

    /**
     * 디바운스된 함수 생성
     */
    _createDebounced(func, delay) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * 스로틀된 함수 생성
     */
    _createThrottled(func, delay) {
        let lastCall = 0;
        return (...args) => {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return func.apply(this, args);
            }
        };
    }

    /**
     * DOM 요소 캐시에서 요소 가져오기
     */
    _getCachedElement(selector, context = this.container) {
        if (!context) return null;

        const cacheKey = `${selector}:${context.tagName}:${context.className}`;
        
        if (this._elementCache.has(cacheKey)) {
            const cached = this._elementCache.get(cacheKey);
            // 캐시된 요소가 여전히 DOM에 있는지 확인
            if (document.contains(cached)) {
                return cached;
            } else {
                this._elementCache.delete(cacheKey);
            }
        }

        const element = context.querySelector(selector);
        if (element) {
            this._elementCache.set(cacheKey, element);
        }
        
        return element;
    }

    /**
     * 계산된 스타일 캐시에서 스타일 가져오기
     */
    _getCachedComputedStyle(element, property) {
        if (!element) return '';

        const cacheKey = `${element.tagName}:${element.className}:${property}`;
        
        if (this._computedStyleCache.has(cacheKey)) {
            return this._computedStyleCache.get(cacheKey);
        }

        const computedStyle = window.getComputedStyle(element);
        const value = computedStyle.getPropertyValue(property);
        
        this._computedStyleCache.set(cacheKey, value);
        return value;
    }

    /**
     * 템플릿 캐시에서 템플릿 가져오기
     */
    _getCachedTemplate(templateKey, templateGenerator) {
        if (this._templateCache.has(templateKey)) {
            const cached = this._templateCache.get(templateKey);
            cached.lastUsed = Date.now();
            return cached.template;
        }

        const template = templateGenerator();
        this._templateCache.set(templateKey, {
            template,
            createdAt: Date.now(),
            lastUsed: Date.now()
        });

        return template;
    }

    /**
     * 이벤트 리스너 등록 (추적 포함)
     */
    _addTrackedEventListener(element, event, handler, options = {}) {
        if (!element || !event || !handler) return;

        element.addEventListener(event, handler, options);
        
        const listenerInfo = { element, event, handler, options };
        this._eventListenerCache.add(listenerInfo);

        // 전역 이벤트 리스너 추적에도 추가
        if (!SideModal._globalEventListeners.has(element)) {
            SideModal._globalEventListeners.set(element, []);
        }
        SideModal._globalEventListeners.get(element).push({ event, handler });
    }

    /**
     * 이벤트 리스너 해제 (추적 포함)
     */
    _removeTrackedEventListener(element, event, handler) {
        if (!element || !event || !handler) return;

        element.removeEventListener(event, handler);
        
        // 캐시에서 제거
        for (const listenerInfo of this._eventListenerCache) {
            if (listenerInfo.element === element && 
                listenerInfo.event === event && 
                listenerInfo.handler === handler) {
                this._eventListenerCache.delete(listenerInfo);
                break;
            }
        }

        // 전역 추적에서도 제거
        const globalListeners = SideModal._globalEventListeners.get(element);
        if (globalListeners) {
            const index = globalListeners.findIndex(l => l.event === event && l.handler === handler);
            if (index !== -1) {
                globalListeners.splice(index, 1);
                if (globalListeners.length === 0) {
                    SideModal._globalEventListeners.delete(element);
                }
            }
        }
    }

    /**
     * 모든 추적된 이벤트 리스너 해제
     */
    _removeAllTrackedEventListeners() {
        for (const listenerInfo of this._eventListenerCache) {
            const { element, event, handler } = listenerInfo;
            if (element && event && handler) {
                element.removeEventListener(event, handler);
            }
        }
        this._eventListenerCache.clear();
    }


    /**
     * 마지막 상호작용 시간 업데이트
     */
    _updateLastInteractionTime() {
        this.lastInteractionTime = Date.now();
        
        // 인스턴스 데이터 업데이트
        const instanceData = SideModal._instances.get(this);
        if (instanceData) {
            instanceData.lastUsed = this.lastInteractionTime;
        }
    }

    /**
     * 메모리 사용량 추정
     */
    getEstimatedMemoryUsage() {
        let usage = 1024; // 기본 인스턴스 크기
        
        usage += this._elementCache.size * 512;
        usage += this._computedStyleCache.size * 256;
        usage += this._templateCache.size * 2048;
        usage += this._eventListenerCache.size * 128;
        usage += Object.keys(this.callbacks).filter(key => this.callbacks[key] !== null).length * 256;
        
        return usage;
    }

    /**
     * 모달 인스턴스 제거
     * 메모리 누수 방지를 위해 모든 이벤트 리스너를 해제하고 DOM에서 제거
     */
    destroy() {
        if (this.isDestroyed) {
            console.warn('이미 파괴된 모달입니다.');
            return;
        }

        console.log('SideModal 인스턴스 파괴 시작');
        const startTime = performance.now();

        try {
            // 모달이 열려있다면 강제로 닫기 (콜백 없이)
            if (this.isOpen) {
                this.container.classList.remove('show');
                this.container.style.display = 'none';
                this.isOpen = false;
            }

            // 자동 정리 타이머 해제
            this._clearAutoCleanup();

            // 이벤트 리스너 해제 (성능 최적화된 버전)
            this._unbindEvents();

            // 콜백 정리
            this.callbacks = {
                onBeforeOpen: null,
                onOpen: null,
                onClose: null,
                onBeforeClose: null,
                onError: null
            };

            // 캐시 정리
            this._elementCache.clear();
            this._computedStyleCache.clear();
            this._templateCache.clear();
            this._eventListenerCache.clear();

            // DOM에서 제거 (기존 HTML 요소는 제거하지 않음 - 재사용을 위해)
            // 대신 상태만 초기화
            if (this.container) {
                this.container.classList.remove('show');
                this.container.style.display = 'none';
                // 커스텀 클래스 제거
                if (this.options && this.options.customClass) {
                    this.container.classList.remove(this.options.customClass);
                }
            }

            // 전역 인스턴스 관리에서 제거
            SideModal._unregisterInstance(this);

            // 참조 정리 (메모리 누수 방지)
            this.container = null;
            this.overlay = null;
            this.modalBody = null;
            this.modalTitle = null;
            this.modalActions = null;
            this.callbacks = null;
            this.options = null;

            // 바인딩된 이벤트 핸들러 참조 정리
            this._boundHandleOverlayClick = null;
            this._boundHandleEscapeKey = null;
            this._boundHandleCloseButton = null;
            this._boundStopPropagation = null;

            // 디바운스/스로틀 함수 정리
            this._debouncedResize = null;
            this._throttledScroll = null;
            this._debouncedCleanup = null;

            // 캐시 참조 정리
            this._elementCache = null;
            this._computedStyleCache = null;
            this._templateCache = null;
            this._eventListenerCache = null;

            // 타이머 정리
            this._autoCleanupTimer = null;

            // 파괴 상태로 표시
            this.isDestroyed = true;
            this.isInitialized = false;
            this.isOpen = false;
            this.isAnimating = false;

            const duration = performance.now() - startTime;
            console.log(`SideModal 인스턴스 파괴 완료 (${duration.toFixed(2)}ms)`);

        } catch (error) {
            console.error('SideModal 파괴 중 오류 발생:', error);
            // 오류가 발생해도 파괴 상태로 표시
            this.isDestroyed = true;
        }
    }

    /**
     * 모달이 열려있는지 확인
     */
    isModalOpen() {
        return this.isOpen && !this.isDestroyed;
    }

    /**
     * 모달이 파괴되었는지 확인
     */
    isModalDestroyed() {
        return this.isDestroyed;
    }

    /**
     * 모달 상태 정보 반환
     */
    getState() {
        return {
            isOpen: this.isOpen,
            isDestroyed: this.isDestroyed,
            isInitialized: this.isInitialized,
            isAnimating: this.isAnimating,
            hasCallbacks: Object.values(this.callbacks || {}).some(callback => callback !== null)
        };
    }

    /**
     * 모달 상태를 문자열로 반환
     * @returns {string} 상태 문자열
     */
    getStatus() {
        if (this.isDestroyed) return 'destroyed';
        if (!this.isInitialized) return 'uninitialized';
        if (this.isAnimating) return 'animating';
        if (this.isOpen) return 'open';
        return 'closed';
    }

    /**
     * 특정 콜백이 등록되어 있는지 확인
     */
    hasCallback(eventName) {
        return this.callbacks &&
            this.callbacks.hasOwnProperty(eventName) &&
            typeof this.callbacks[eventName] === 'function';
    }

    /**
     * 커스텀 CSS 클래스 동적 적용
     * 기존 CSS 클래스와 호환되는 방식으로 클래스 추가
     */
    addClass(classNames, target = 'modal', options = {}) {
        if (this.isDestroyed) {
            console.error('파괴된 모달은 조작할 수 없습니다.');
            return this;
        }

        const targetElement = this._getTargetElement(target);
        if (!targetElement) {
            console.error(`대상 요소를 찾을 수 없습니다: ${target}`);
            return this;
        }

        const { 
            preserveExisting = true, 
            checkCompatibility = true,
            onClassAdded = null
        } = options;

        const classes = Array.isArray(classNames) ? classNames : [classNames];
        const addedClasses = [];

        classes.forEach(className => {
            if (className && typeof className === 'string') {
                // 클래스명 정리 (공백 제거, 유효성 검사)
                const cleanClassName = className.trim();
                if (!cleanClassName) return;

                // 기존 클래스와의 호환성 검사
                if (checkCompatibility && !this._isClassCompatible(cleanClassName, target, targetElement)) {
                    console.warn(`클래스 '${cleanClassName}'가 기존 CSS와 충돌할 수 있습니다.`);
                }

                // 클래스 추가 (중복 방지는 classList.add가 자동 처리)
                if (!targetElement.classList.contains(cleanClassName)) {
                    targetElement.classList.add(cleanClassName);
                    addedClasses.push(cleanClassName);
                }
            }
        });

        // 클래스 추가 후 콜백 실행
        if (typeof onClassAdded === 'function' && addedClasses.length > 0) {
            try {
                onClassAdded(this, targetElement, addedClasses, target);
            } catch (error) {
                console.error('클래스 추가 콜백 실행 중 오류 발생:', error);
            }
        }

        return this;
    }

    /**
     * 클래스 호환성 검사
     */
    _isClassCompatible(className, target, targetElement) {
        // 기존 핵심 CSS 클래스와의 충돌 검사
        const coreClasses = {
            modal: ['detail-modal', 'modal-overlay', 'side-modal', 'update-user-info-modal-container'],
            container: ['detail-container', 'modal-body', 'album-modal-sidebar-container'],
            header: ['modal-header'],
            body: ['modal-content', 'backplate'],
            actions: ['modal-actions']
        };

        const targetCoreClasses = coreClasses[target] || [];
        
        // 핵심 클래스와 동일한 이름인지 검사
        if (targetCoreClasses.includes(className)) {
            console.warn(`'${className}'는 핵심 CSS 클래스입니다. 덮어쓰기를 방지합니다.`);
            return false;
        }

        // 기존 스타일과 충돌할 수 있는 패턴 검사
        const conflictPatterns = [
            /^(show|hide|active|inactive)$/i, // 상태 관련 클래스
            /^(modal|detail|side)$/i, // 모달 관련 기본 클래스
            /^(btn|button)$/i // 버튼 관련 기본 클래스 (actions 대상일 때)
        ];

        if (target === 'actions') {
            return !conflictPatterns.some(pattern => pattern.test(className));
        }

        return true;
    }

    /**
     * 커스텀 CSS 클래스 제거
     * 기존 핵심 CSS 클래스는 보호하면서 커스텀 클래스만 제거
     */
    removeClass(classNames, target = 'modal', options = {}) {
        if (this.isDestroyed) {
            console.error('파괴된 모달은 조작할 수 없습니다.');
            return this;
        }

        const targetElement = this._getTargetElement(target);
        if (!targetElement) {
            console.error(`대상 요소를 찾을 수 없습니다: ${target}`);
            return this;
        }

        const { 
            protectCore = true, 
            force = false,
            onClassRemoved = null
        } = options;

        const classes = Array.isArray(classNames) ? classNames : [classNames];
        const removedClasses = [];

        classes.forEach(className => {
            if (className && typeof className === 'string') {
                const cleanClassName = className.trim();
                if (!cleanClassName) return;

                // 핵심 클래스 보호 검사
                if (protectCore && !force && this._isCoreClass(cleanClassName, target)) {
                    console.warn(`핵심 클래스 '${cleanClassName}'는 제거할 수 없습니다. force 옵션을 사용하세요.`);
                    return;
                }

                // 클래스 제거
                if (targetElement.classList.contains(cleanClassName)) {
                    targetElement.classList.remove(cleanClassName);
                    removedClasses.push(cleanClassName);
                }
            }
        });

        // 클래스 제거 후 콜백 실행
        if (typeof onClassRemoved === 'function' && removedClasses.length > 0) {
            try {
                onClassRemoved(this, targetElement, removedClasses, target);
            } catch (error) {
                console.error('클래스 제거 콜백 실행 중 오류 발생:', error);
            }
        }
        return this;
    }

    /**
     * 핵심 클래스 여부 검사
     */
    _isCoreClass(className, target) {
        // 각 대상별 핵심 클래스 정의
        const coreClasses = {
            modal: [
                'detail-modal', 'modal-overlay', 'side-modal', 
                'update-user-info-modal-container', 'show', 'active'
            ],
            container: [
                'detail-container', 'modal-body', 'album-modal-sidebar-container',
                'backplate', 'modal-content'
            ],
            header: ['modal-header'],
            body: ['modal-content', 'backplate'],
            actions: ['modal-actions'],
            title: ['modal-title'],
            overlay: ['modal-overlay']
        };

        const targetCoreClasses = coreClasses[target] || [];
        return targetCoreClasses.includes(className);
    }

    /**
     * CSS 클래스 토글
     */
    toggleClass(className, target = 'modal', force = undefined) {
        if (this.isDestroyed) {
            console.error('파괴된 모달은 조작할 수 없습니다.');
            return false;
        }

        const targetElement = this._getTargetElement(target);
        if (!targetElement) {
            console.error(`대상 요소를 찾을 수 없습니다: ${target}`);
            return false;
        }

        if (!className || typeof className !== 'string') {
            console.error('유효한 클래스명을 제공해야 합니다.');
            return false;
        }

        return targetElement.classList.toggle(className, force);
    }

    /**
     * CSS 클래스 존재 여부 확인
     */
    hasClass(className, target = 'modal') {
        if (this.isDestroyed) {
            console.error('파괴된 모달은 조작할 수 없습니다.');
            return false;
        }

        const targetElement = this._getTargetElement(target);
        if (!targetElement) {
            console.error(`대상 요소를 찾을 수 없습니다: ${target}`);
            return false;
        }

        if (!className || typeof className !== 'string') {
            return false;
        }

        return targetElement.classList.contains(className);
    }

    /**
     * 모든 커스텀 CSS 클래스 제거 (기본 클래스는 유지)
     */
    clearCustomClasses(target = 'modal') {
        if (this.isDestroyed) {
            console.error('파괴된 모달은 조작할 수 없습니다.');
            return this;
        }

        const targetElement = this._getTargetElement(target);
        if (!targetElement) {
            console.error(`대상 요소를 찾을 수 없습니다: ${target}`);
            return this;
        }

        // 기본 클래스들 정의
        const defaultClasses = {
            modal: ['detail-modal', 'side-modal', 'show'],
            container: ['detail-container'],
            header: ['modal-header'],
            body: ['modal-body'],
            actions: ['modal-actions']
        };

        const baseClasses = defaultClasses[target] || [];
        const currentClasses = Array.from(targetElement.classList);

        // 기본 클래스가 아닌 모든 클래스 제거
        currentClasses.forEach(className => {
            if (!baseClasses.includes(className)) {
                targetElement.classList.remove(className);
            }
        });

        return this;
    }

    /**
     * 대상 요소 반환 헬퍼 메서드
     */
    _getTargetElement(target) {
        switch (target) {
            case 'modal':
                return this.container;
            case 'container':
                return this.container ? this.container.querySelector('.detail-container') : null;
            case 'header':
                return this.container ? this.container.querySelector('.modal-header') : null;
            case 'body':
                return this.modalBody;
            case 'actions':
                return this.modalActions;
            case 'title':
                return this.modalTitle;
            case 'overlay':
                return this.overlay;
            default:
                return null;
        }
    }

    /**
     * 인라인 스타일 설정
     */
    setStyle(styles, target = 'modal') {
        if (this.isDestroyed) {
            console.error('파괴된 모달은 조작할 수 없습니다.');
            return this;
        }

        const targetElement = this._getTargetElement(target);
        if (!targetElement) {
            console.error(`대상 요소를 찾을 수 없습니다: ${target}`);
            return this;
        }

        if (typeof styles !== 'object' || styles === null) {
            console.error('스타일은 객체 형태로 제공되어야 합니다.');
            return this;
        }

        Object.entries(styles).forEach(([property, value]) => {
            try {
                targetElement.style[property] = value;
            } catch (error) {
                console.error(`스타일 설정 중 오류 발생 (${property}: ${value}):`, error);
            }
        });

        return this;
    }

    /**
     * 인라인 스타일 제거
     */
    removeStyle(properties, target = 'modal') {
        if (this.isDestroyed) {
            console.error('파괴된 모달은 조작할 수 없습니다.');
            return this;
        }

        const targetElement = this._getTargetElement(target);
        if (!targetElement) {
            console.error(`대상 요소를 찾을 수 없습니다: ${target}`);
            return this;
        }

        const props = Array.isArray(properties) ? properties : [properties];
        props.forEach(property => {
            if (property && typeof property === 'string') {
                targetElement.style.removeProperty(property);
            }
        });

        return this;
    }

    /**
     * 모달 크기 설정 (필요시에만 사용)
     */
    setSize(size = {}) {
        if (this.isDestroyed) {
            console.error('파괴된 모달은 조작할 수 없습니다.');
            return this;
        }

        const container = this._getTargetElement('container');
        if (!container) {
            console.error('모달 컨테이너를 찾을 수 없습니다.');
            return this;
        }

        const {
            width = this.options.width,
            height = this.options.height
        } = size;

        // 크기 설정
        if (width) {
            container.style.width = width;
            this.options.width = width;
        }

        if (height) {
            container.style.height = height;
            this.options.height = height;
        }

        return this;
    }

    /**
     * 모달 크기를 기본값으로 재설정
     */
    resetSize() {
        return this.setSize({
            width: 'clamp(18.75rem, 30vw, 37.5%)',
            height: '100vh'
        });
    }

    /**
     * 현재 모달 크기 정보 반환
     */
    getSize() {
        if (this.isDestroyed) {
            console.error('파괴된 모달은 조작할 수 없습니다.');
            return null;
        }

        const container = this._getTargetElement('container');
        if (!container) {
            return null;
        }

        return {
            width: this.options.width,
            height: this.options.height,
            computedWidth: window.getComputedStyle(container).width,
            computedHeight: window.getComputedStyle(container).height
        };
    }

    /**
     * 템플릿 기반 내용 설정
     */
    setTemplate(templateType, data = {}, options = {}) {
        if (this.isDestroyed) {
            console.error('파괴된 모달은 조작할 수 없습니다.');
            return this;
        }

        switch (templateType) {
            case 'custom':
                if (options.template) {
                    this.updateContent(options.template);
                }
                break;
            default:
                console.error(`지원되지 않는 템플릿 타입입니다: ${templateType}`);
                console.warn('특정 기능별 템플릿은 별도의 플러그인을 사용하세요.');
                return this;
        }

        // 템플릿별 추가 설정
        if (data.title) {
            this.setTitle(data.title);
        }

        if (data.actions && Array.isArray(data.actions)) {
            data.actions.forEach(action => {
                this.addActionButton(action);
            });
        }

        if (data.customClasses) {
            this.addClass(data.customClasses);
        }

        return this;
    }

    /**
     * 모달 설정을 한 번에 적용
     **/
    configure(config = {}) {
        if (this.isDestroyed) {
            console.error('파괴된 모달은 조작할 수 없습니다.');
            return this;
        }

        const {
            title,
            content,
            actions = [],
            customClasses,
            size,
            styles,
            callbacks = {},
            contentOptions = {},
            titleOptions = {},
            classOptions = {},
            clearExisting = false,
            onConfigured = null
        } = config;

        try {
            // 기존 설정 초기화 (선택적)
            if (clearExisting) {
                this._clearExistingConfiguration();
            }

            // 제목 설정
            if (title !== undefined) {
                this.setTitle(title, titleOptions);
            }

            // 내용 설정
            if (content !== undefined) {
                this.updateContent(content, contentOptions);
            }

            // 액션 버튼 추가
            if (Array.isArray(actions) && actions.length > 0) {
                // 기존 커스텀 버튼 제거 (clearExisting이 true인 경우)
                if (clearExisting) {
                    this.clearActionButtons(false); // 닫기 버튼은 유지
                }

                actions.forEach(action => {
                    this.addActionButton(action);
                });
            }

            // 커스텀 클래스 추가
            if (customClasses) {
                this.addClass(customClasses, 'modal', classOptions);
            }

            // 크기 설정
            if (size && typeof size === 'object') {
                this.setSize(size);
            }

            // 스타일 설정 (대상별 적용 가능)
            if (styles && typeof styles === 'object') {
                if (this._isTargetedStyles(styles)) {
                    // 대상별 스타일 적용
                    Object.entries(styles).forEach(([target, targetStyles]) => {
                        if (typeof targetStyles === 'object') {
                            this.setStyle(targetStyles, target);
                        }
                    });
                } else {
                    // 모달 전체에 스타일 적용
                    this.setStyle(styles);
                }
            }

            // 콜백 등록
            Object.entries(callbacks).forEach(([eventName, callback]) => {
                if (typeof callback === 'function') {
                    this.on(eventName, callback);
                }
            });

            // 설정 완료 후 콜백 실행
            if (typeof onConfigured === 'function') {
                try {
                    onConfigured(this, config);
                } catch (error) {
                    console.error('설정 완료 콜백 실행 중 오류 발생:', error);
                }
            }

        } catch (error) {
            console.error('모달 설정 중 오류 발생:', error);
            this._executeCallback('onError', {
                type: 'configuration_error',
                error: error,
                config: config
            });
        }

        return this;
    }

    /**
     * 기존 설정 초기화
     */
    _clearExistingConfiguration() {
        // 내용 초기화
        if (this.modalBody) {
            this.modalBody.innerHTML = '';
        }

        // 제목 초기화
        if (this.modalTitle) {
            this.modalTitle.textContent = '';
        }

        // 커스텀 액션 버튼 제거 (닫기 버튼은 유지)
        this.clearActionButtons(false);

        // 커스텀 클래스 제거 (핵심 클래스는 보호)
        this._removeCustomClasses();

        // 인라인 스타일 초기화
        this._resetInlineStyles();
    }

    /**
     * 커스텀 클래스만 제거
     */
    _removeCustomClasses() {
        const targets = ['modal', 'container', 'header', 'body', 'actions'];
        
        targets.forEach(target => {
            const element = this._getTargetElement(target);
            if (element) {
                // 현재 클래스 목록을 복사
                const currentClasses = Array.from(element.classList);
                
                // 핵심 클래스가 아닌 것들만 제거
                currentClasses.forEach(className => {
                    if (!this._isCoreClass(className, target)) {
                        element.classList.remove(className);
                    }
                });
            }
        });
    }

    /**
     * 인라인 스타일 초기화
     */
    _resetInlineStyles() {
        const targets = ['modal', 'container', 'header', 'body', 'actions'];
        
        targets.forEach(target => {
            const element = this._getTargetElement(target);
            if (element) {
                // 핵심 스타일 속성은 유지하고 나머지만 제거
                const coreStyleProperties = this._getCoreStyleProperties(target);
                const currentStyles = element.style;
                
                // 모든 스타일 속성을 확인하여 핵심 속성이 아닌 것들만 제거
                for (let i = currentStyles.length - 1; i >= 0; i--) {
                    const property = currentStyles[i];
                    if (!coreStyleProperties.includes(property)) {
                        element.style.removeProperty(property);
                    }
                }
            }
        });
    }

    /**
     * 핵심 스타일 속성 반환
     */
    _getCoreStyleProperties(target) {
        const coreProperties = {
            modal: ['display', 'visibility', 'opacity'],
            container: ['width', 'height', 'transform', 'transition'],
            header: [],
            body: [],
            actions: []
        };

        return coreProperties[target] || [];
    }

    /**
     * 대상별 스타일 객체인지 확인
     */
    _isTargetedStyles(styles) {
        const validTargets = ['modal', 'container', 'header', 'body', 'actions', 'title', 'overlay'];
        return Object.keys(styles).some(key => validTargets.includes(key));
    }

    /**
     * 콜백 실행 헬퍼 메서드
     */
    _executeCallback(eventName, ...args) {
        if (this.isDestroyed) {
            console.warn(`파괴된 모달에서 ${eventName} 콜백을 실행하려고 합니다.`);
            return undefined;
        }

        if (!this.hasCallback(eventName)) {
            return undefined;
        }

        try {
            console.log(`콜백 실행: ${eventName}`);
            const result = this.callbacks[eventName].call(this, ...args);

            // onBeforeClose 콜백의 경우 false 반환 시 닫기 취소
            if (eventName === 'onBeforeClose' && result === false) {
                console.log('onBeforeClose 콜백이 false를 반환하여 모달 닫기가 취소되었습니다.');
            }

            return result;
        } catch (error) {
            console.error(`${eventName} 콜백 실행 중 오류 발생:`, error);

            // 콜백 에러 발생 시 에러 이벤트 발생 (선택적)
            this._handleCallbackError(eventName, error);
            return undefined;
        }
    }

    /**
     * 콜백 에러 처리 메서드
     */
    _handleCallbackError(eventName, error) {
        // 에러 콜백이 등록되어 있다면 실행
        if (this.hasCallback('onError')) {
            try {
                this.callbacks.onError.call(this, {
                    type: 'callback_error',
                    eventName: eventName,
                    error: error,
                    modal: this
                });
            } catch (errorCallbackError) {
                console.error('에러 콜백 실행 중 추가 오류 발생:', errorCallbackError);
            }
        }

    }

    /**
     * 생명주기 상태 확인 메서드
     * @returns {Object} 생명주기 상태 정보
     */
    getLifecycleState() {
        return {
            isInitialized: this.isInitialized,
            isOpen: this.isOpen,
            isDestroyed: this.isDestroyed,
            hasActiveCallbacks: this.getRegisteredCallbacks().length > 0,
            hasEventListeners: this._hasActiveEventListeners(),
            memoryFootprint: this._calculateMemoryFootprint()
        };
    }

    /**
     * 활성 이벤트 리스너 존재 여부 확인
     */
    _hasActiveEventListeners() {
        // 바인딩된 이벤트 핸들러가 null이 아닌지 확인
        return !!(
            this._boundHandleOverlayClick ||
            this._boundHandleEscapeKey ||
            this._boundHandleCloseButton ||
            this._boundStopPropagation
        );
    }

    /**
     * 메모리 사용량 추정 계산
     */
    _calculateMemoryFootprint() {
        const footprint = {
            domReferences: 0,
            callbacks: 0,
            eventHandlers: 0,
            options: 0
        };

        // DOM 참조 개수
        const domRefs = [this.container, this.overlay, this.modalBody, this.modalTitle, this.modalActions];
        footprint.domReferences = domRefs.filter(ref => ref !== null).length;

        // 콜백 개수
        if (this.callbacks) {
            footprint.callbacks = Object.values(this.callbacks).filter(cb => cb !== null).length;
        }

        // 이벤트 핸들러 개수
        const eventHandlers = [
            this._boundHandleOverlayClick,
            this._boundHandleEscapeKey,
            this._boundHandleCloseButton,
            this._boundStopPropagation
        ];
        footprint.eventHandlers = eventHandlers.filter(handler => handler !== null).length;

        // 옵션 객체 크기 추정
        if (this.options) {
            footprint.options = Object.keys(this.options).length;
        }

        return footprint;
    }

    /**
     * 메모리 정리 및 최적화
     * destroy()보다 가벼운 정리 작업
     * @returns {SideModal} 메서드 체이닝을 위한 this 반환
     */
    cleanup() {
        if (this.isDestroyed) {
            console.warn('이미 파괴된 모달입니다.');
            return this;
        }

        // 모달이 열려있다면 닫기
        if (this.isOpen) {
            this.close();
        }

        // 이벤트 리스너 해제
        this._unbindEvents();

        // 콜백 해제 (선택적)
        this.callbacks = {
            onBeforeOpen: null,
            onOpen: null,
            onClose: null,
            onBeforeClose: null,
            onError: null
        };

        console.log('SideModal 메모리 정리 완료');
        return this;
    }

    /**
     * 강제 정리 (에러 상황에서 사용)
     * @returns {void}
     */
    forceCleanup() {
        console.warn('SideModal 강제 정리 실행');

        try {
            // 모달 강제 닫기
            if (this.container) {
                this.container.classList.remove('show');
                this.container.style.display = 'none';
            }

            // 모든 이벤트 리스너 강제 해제
            this._forceUnbindAllEvents();

            // 모든 참조 정리
            this._clearAllReferences();

            this.isOpen = false;
            this.isDestroyed = true;

        } catch (error) {
            console.error('강제 정리 중 오류 발생:', error);
        }
    }

    /**
     * 모든 이벤트 리스너 강제 해제
     */
    _forceUnbindAllEvents() {
        try {
            // 문서 레벨 이벤트 해제
            if (this._boundHandleEscapeKey) {
                document.removeEventListener('keydown', this._boundHandleEscapeKey);
            }

            // 모달 관련 모든 이벤트 해제
            if (this.container) {
                const allElements = this.container.querySelectorAll('*');
                allElements.forEach(element => {
                    // 복제를 통한 모든 이벤트 리스너 제거
                    const newElement = element.cloneNode(true);
                    if (element.parentNode) {
                        element.parentNode.replaceChild(newElement, element);
                    }
                });
            }
        } catch (error) {
            console.error('이벤트 리스너 강제 해제 중 오류:', error);
        }
    }

    /**
     * 모든 참조 정리
     */
    _clearAllReferences() {
        // DOM 참조 정리
        this.container = null;
        this.overlay = null;
        this.modalBody = null;
        this.modalTitle = null;
        this.modalActions = null;
        this.modalContent = null;

        // 콜백 정리
        this.callbacks = null;

        // 옵션 정리
        this.options = null;

        // 이벤트 핸들러 참조 정리
        this._boundHandleOverlayClick = null;
        this._boundHandleEscapeKey = null;
        this._boundHandleCloseButton = null;
        this._boundStopPropagation = null;
    }

    /**
     * 모달 열기 애니메이션 준비
     * 기존 모달 요소에 슬라이드 애니메이션 적용을 위한 초기 상태 설정
     */
    _prepareOpenAnimation() {
        try {
            // 기존 모달에 side-modal 클래스 추가 (CSS 애니메이션 활성화)
            if (!this.container.classList.contains('side-modal')) {
                this.container.classList.add('side-modal');
            }

            // 마이페이지 모달인 경우
            if (this.container.classList.contains('update-user-info-modal-container')) {
                // 마이페이지 모달은 visibility와 opacity로 제어
                this.container.style.visibility = 'visible';
                this.container.style.opacity = '0';
                
                // 모달 내용의 초기 위치 설정 (우측 밖으로)
                if (this.modalContent) {
                    this.modalContent.style.transform = 'translateX(100%)';
                }
            } else {
                // 일반 모달 처리
                this.container.style.visibility = 'visible';
                this.container.style.opacity = '0';
                this.container.style.transition = 'opacity 0.3s ease-in-out';
                
                // 모달 내용의 초기 위치 설정 (우측 밖으로)
                const detailContainer = this.container.querySelector('.detail-container');
                if (detailContainer) {
                    detailContainer.style.transform = 'translateZ(0) translateX(100%)';
                    detailContainer.style.transition = 'transform 0.3s ease-in-out';
                }
            }
        } catch (error) {
            console.error(`모달 열기 애니메이션 준비 중 오류 발생: ${error.message}`, error);
        }
    }

    /**
     * 모달 열기 애니메이션 실행
     * transform: translateX를 사용한 0.3s ease-in-out 슬라이드 애니메이션
     */
    _executeOpenAnimation() {
        try {
            // 마이페이지 모달인 경우
            if (this.container.classList.contains('update-user-info-modal-container')) {
                // active 클래스 추가로 애니메이션 트리거
                this.container.classList.add('active');
            } else {
                // 일반 모달 처리
                // show 클래스 추가 (CSS 애니메이션 트리거)
                this.container.classList.add('show');
                
                // 오버레이 페이드 인
                this.container.style.opacity = '1';
                
                // 모달 내용 슬라이드 인
                const albumSidebar = this.container.querySelector('.album-modal-sidebar-container');
                const detailContainer = this.container.querySelector('.detail-container');

                if (albumSidebar) {
                    // 앨범 모달: CSS에서 처리되므로 추가 작업 불필요
                    // .show 클래스가 추가되면 CSS에서 transform: translateX(0) 적용됨
                } else if (detailContainer) {
                    // 일반 모달: 직접 transform 적용
                    detailContainer.style.transform = 'translateZ(0) translateX(0)';
                }
            }
        } catch (error) {
            console.error(`모달 열기 애니메이션 실행 중 오류 발생: ${error.message}`, error);
        }
    }

    /**
     * 모달 닫기 애니메이션 실행
     */
    _executeCloseAnimation() {
        try {
            // 마이페이지 모달인 경우
            if (this.container.classList.contains('update-user-info-modal-container')) {
                // 모달 내용 슬라이드 아웃
                if (this.modalContent) {
                    this.modalContent.style.transform = 'translateX(100%)';
                }
            } else {
                // 일반 모달 처리
                // show 클래스 제거로 애니메이션 시작
                this.container.classList.remove('show');
                
                // 앨범 모달의 경우 특별한 처리
                const albumSidebar = this.container.querySelector('.album-modal-sidebar-container');
                const detailContainer = this.container.querySelector('.detail-container');

                if (albumSidebar) {
                    // 앨범 모달: CSS에서 처리되므로 추가 작업 불필요
                    // .show 클래스가 제거되면 CSS에서 transform: translateX(100%) 적용됨
                } else if (detailContainer) {
                    // 일반 모달: 직접 transform 적용
                    detailContainer.style.transform = 'translateZ(0) translateX(100%)';
                }
                
                // 오버레이 페이드 아웃
                this.container.style.opacity = '0';
            }
        } catch (error) {
            console.error(`모달 닫기 애니메이션 실행 중 오류 발생: ${error.message}`, error);
        }
    }

    /**
     * 모달 닫기 애니메이션 완료 처리
     * @private
     */
    _completeCloseAnimation() {
        // 마이페이지 모달인 경우
        if (this.container.classList.contains('update-user-info-modal-container')) {
            // active 클래스 제거
            this.container.classList.remove('active');
            
            // 스타일 초기화
            if (this.modalContent) {
                this.modalContent.style.transform = '';
            }
        } else {
            // 일반 모달 처리
            // 모달 완전히 숨기기
            this.container.style.display = 'none';
            this.container.style.visibility = 'hidden';
            
            // 스타일 초기화
            this.container.style.opacity = '';
            const albumSidebar = this.container.querySelector('.album-modal-sidebar-container');
            const detailContainer = this.container.querySelector('.detail-container');

            if (albumSidebar) {
                // 앨범 모달: CSS에서 처리되므로 추가 작업 불필요
            } else if (detailContainer) {
                // 일반 모달: 상태 초기화
                detailContainer.style.transform = '';
            }
        }
    }

    // ==================== 정적 메서드들 - 성능 최적화 및 인스턴스 관리 ====================
    /**
     * 인스턴스 등록 (내부 사용)
     * @private
     * @param {SideModal} instance - 등록할 인스턴스
     */
    static _registerInstance(instance) {
        this._instances.set(instance, {
            id: `modal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: Date.now(),
            lastUsed: Date.now()
        });
        this._activeInstances.add(instance);
        this._performanceMetrics.totalInstances++;
        this._performanceMetrics.activeInstances = this._activeInstances.size;
    }

    /**
     * 인스턴스 해제 (내부 사용)
     * @private
     * @param {SideModal} instance - 해제할 인스턴스
     */
    static _unregisterInstance(instance) {
        this._instances.delete(instance);
        this._activeInstances.delete(instance);
        this._performanceMetrics.activeInstances = this._activeInstances.size;
    }

    /**
     * 모든 활성 인스턴스 반환
     * @returns {Array<SideModal>} 활성 인스턴스 배열
     */
    static getActiveInstances() {
        return Array.from(this._activeInstances).filter(instance => !instance.isDestroyed);
    }

    /**
     * 특정 조건에 맞는 인스턴스 찾기
     * @param {Function} predicate - 검색 조건 함수
     * @returns {SideModal|null} 찾은 인스턴스 또는 null
     */
    static findInstance(predicate) {
        for (const instance of this._activeInstances) {
            if (!instance.isDestroyed && predicate(instance)) {
                return instance;
            }
        }
        return null;
    }

    /**
     * 모든 열린 모달 닫기
     * @param {Object} options - 닫기 옵션
     * @param {boolean} options.force - 강제 닫기 여부 (기본값: false)
     * @param {Function} options.filter - 필터 함수 (기본값: null)
     * @returns {Promise<Array>} 닫기 결과 배열
     */
    static async closeAllModals(options = {}) {
        const { force = false, filter = null } = options;
        const openModals = Array.from(this._activeInstances).filter(instance => {
            if (instance.isDestroyed || !instance.isOpen) return false;
            if (filter && !filter(instance)) return false;
            return true;
        });

        const closePromises = openModals.map(async (modal) => {
            try {
                if (force) {
                    // 강제 닫기 - onBeforeClose 콜백 무시
                    modal._executeCloseAnimation();
                    setTimeout(() => {
                        modal._completeCloseAnimation();
                        modal.isOpen = false;
                        modal._unbindEvents();
                        modal._executeCallback('onClose', modal);
                    }, 300);
                    return { modal, success: true, forced: true };
                } else {
                    modal.close();
                    return { modal, success: true, forced: false };
                }
            } catch (error) {
                console.error('모달 닫기 중 오류 발생:', error);
                return { modal, success: false, error };
            }
        });

        return Promise.all(closePromises);
    }

    /**
     * 전역 메모리 정리
     * 사용하지 않는 인스턴스와 캐시 정리
     * @param {Object} options - 정리 옵션
     * @param {boolean} options.aggressive - 적극적 정리 모드 (기본값: false)
     * @param {number} options.maxAge - 최대 유지 시간 (ms, 기본값: 30분)
     * @returns {Object} 정리 결과
     */
    static performGlobalCleanup(options = {}) {
        if (this._isCleanupRunning) {
            console.warn('이미 정리 작업이 진행 중입니다.');
            return { skipped: true };
        }

        this._isCleanupRunning = true;
        const startTime = performance.now();
        const { aggressive = false, maxAge = 30 * 60 * 1000 } = options; // 30분
        
        try {
            const results = {
                destroyedInstances: 0,
                cleanedCaches: 0,
                freedMemory: 0,
                errors: []
            };

            const now = Date.now();
            const instancesToDestroy = [];

            // 오래된 또는 사용하지 않는 인스턴스 찾기
            for (const instance of this._activeInstances) {
                const instanceData = this._instances.get(instance);
                if (!instanceData) continue;

                const age = now - instanceData.lastUsed;
                const shouldDestroy = aggressive || 
                                    instance.isDestroyed || 
                                    (!instance.isOpen && age > maxAge);

                if (shouldDestroy) {
                    instancesToDestroy.push(instance);
                }
            }

            // 인스턴스 정리
            instancesToDestroy.forEach(instance => {
                try {
                    if (!instance.isDestroyed) {
                        instance.destroy();
                    }
                    this._unregisterInstance(instance);
                    results.destroyedInstances++;
                } catch (error) {
                    results.errors.push({ type: 'instance_cleanup', instance, error });
                }
            });

            // 전역 이벤트 리스너 정리
            for (const [element, listeners] of this._globalEventListeners) {
                // 요소가 유효한 Node인지 확인하고, DOM에 연결되어 있는지 검사
                const isValidNode = element && 
                                   element.nodeType !== undefined && 
                                   typeof element.removeEventListener === 'function';
                
                if (!isValidNode || !document.contains(element)) {
                    if (isValidNode) {
                        listeners.forEach(({ event, handler }) => {
                            try {
                                element.removeEventListener(event, handler);
                            } catch (error) {
                                console.warn('이벤트 리스너 제거 중 오류:', error);
                            }
                        });
                    }
                    this._globalEventListeners.delete(element);
                    results.cleanedCaches++;
                }
            }

            // 메모리 사용량 추정 업데이트
            this._updateMemoryMetrics();
            
            this._performanceMetrics.lastCleanup = now;
            const duration = performance.now() - startTime;

            console.log(`전역 정리 완료: ${results.destroyedInstances}개 인스턴스, ${results.cleanedCaches}개 캐시 정리 (${duration.toFixed(2)}ms)`);
            
            return {
                ...results,
                duration,
                timestamp: now
            };

        } catch (error) {
            console.error('전역 정리 중 오류 발생:', error);
            return { error, timestamp: Date.now() };
        } finally {
            this._isCleanupRunning = false;
        }
    }

    /**
     * 성능 메트릭 반환
     * @returns {Object} 성능 메트릭 객체
     */
    static getPerformanceMetrics() {
        this._updateMemoryMetrics();
        return {
            ...this._performanceMetrics,
            timestamp: Date.now(),
            memoryUsageFormatted: this._formatBytes(this._performanceMetrics.memoryUsage)
        };
    }

    /**
     * 메모리 사용량 추정 업데이트
     * @private
     */
    static _updateMemoryMetrics() {
        let estimatedMemory = 0;
        
        for (const instance of this._activeInstances) {
            if (!instance.isDestroyed) {
                // 인스턴스당 대략적인 메모리 사용량 추정
                estimatedMemory += 1024; // 기본 인스턴스 크기
                estimatedMemory += instance._elementCache.size * 512; // 캐시된 요소들
                estimatedMemory += instance._templateCache.size * 2048; // 캐시된 템플릿들
                estimatedMemory += Object.keys(instance.callbacks).length * 256; // 콜백들
            }
        }
        
        this._performanceMetrics.memoryUsage = estimatedMemory;
    }

    /**
     * 바이트를 읽기 쉬운 형태로 포맷
     * @private
     * @param {number} bytes - 바이트 수
     * @returns {string} 포맷된 문자열
     */
    static _formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 전역 자동 정리 설정
     * @param {number} interval - 정리 간격 (ms, 기본값: 5분)
     */
    static setupGlobalAutoCleanup(interval = 5 * 60 * 1000) {
        if (this._cleanupInterval) {
            clearInterval(this._cleanupInterval);
        }

        this._cleanupInterval = setInterval(() => {
            this.performGlobalCleanup({ aggressive: false });
        }, interval);

        console.log(`전역 자동 정리가 ${interval / 1000}초 간격으로 설정되었습니다.`);
    }

    /**
     * 전역 자동 정리 중지
     */
    static stopGlobalAutoCleanup() {
        if (this._cleanupInterval) {
            clearInterval(this._cleanupInterval);
            this._cleanupInterval = null;
            console.log('전역 자동 정리가 중지되었습니다.');
        }
    }

    /**
     * 디버그 정보 출력
     * @param {boolean} detailed - 상세 정보 포함 여부 (기본값: false)
     */
    static debugInfo(detailed = false) {
        const metrics = this.getPerformanceMetrics();
        const activeInstances = this.getActiveInstances();

        console.group('🔍 SideModal 디버그 정보');
        console.log('📊 성능 메트릭:', metrics);
        console.log('🔄 활성 인스턴스:', activeInstances.length);

        if (detailed) {
            console.log('📋 인스턴스 상세 정보:');
            activeInstances.forEach((instance, index) => {
                const instanceData = this._instances.get(instance);
                const state = instance.getState();
                const statusText = state.isDestroyed ? '파괴됨' :
                                 state.isOpen ? '열림' : '닫힘';
                console.log(`  ${index + 1}. ID: ${instanceData?.id}, 상태: ${statusText}`);
            });

            console.log('🎯 전역 이벤트 리스너:', this._globalEventListeners.size);
        }

        console.groupEnd();
    }
}

// 전역 자동 정리 설정 (페이지 로드 시)
if (typeof window !== 'undefined') {
    // 페이지 언로드 시 모든 인스턴스 정리
    window.addEventListener('beforeunload', () => {
        SideModal.performGlobalCleanup({ aggressive: true });
    });

    // 전역 자동 정리 시작
    SideModal.setupGlobalAutoCleanup();
}

// SideModal 클래스를 모듈로 export
export { SideModal };
