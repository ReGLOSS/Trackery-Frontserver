/**
 * 선택 모드 UI 렌더링 및 관리 클래스
 * 이미지 체크박스, 선택 상태 표시, 선택 모드 버튼 그룹 등을 담당
 */
export class SelectionModeUI {
    constructor(bulkDeleteManager) {
        this.bulkDeleteManager = bulkDeleteManager;
        
        // UI 요소 참조
        this.galleryContainer = null;
        this.selectionControls = null;
        
        // 이벤트 핸들러 참조 (정리용)
        this.eventHandlers = new Map();
        
        // CSS 클래스명 상수
        this.CSS_CLASSES = {
            GALLERY_CONTAINER: '.region-image-gallery',
            IMAGE_CARD: '.region-image-card',
            SELECTION_MODE: 'selection-mode',
            SELECTABLE: 'selectable',
            SELECTED: 'selected',
            SELECTION_CHECKBOX: 'selection-checkbox',
            SELECTION_OVERLAY: 'selection-overlay',
            SELECTION_CONTROLS: 'selection-controls'
        };
    }
    
    /**
     * 선택 모드 UI 렌더링
     * @param {boolean} isActive - 선택 모드 활성화 여부
     */
    renderSelectionModeUI(isActive) {
        this.galleryContainer = document.querySelector(this.CSS_CLASSES.GALLERY_CONTAINER);
        if (!this.galleryContainer) {
            return;
        }
        
        if (isActive) {
            this.activateSelectionMode();
        } else {
            this.deactivateSelectionMode();
        }
    }
    
    /**
     * 선택 모드 활성화
     */
    activateSelectionMode() {
        // 갤러리 컨테이너에 선택 모드 클래스 추가
        this.galleryContainer.classList.add(this.CSS_CLASSES.SELECTION_MODE);
        
        // 이미지에 체크박스 추가
        this.addCheckboxesToImages();
        
        // 선택 컨트롤 버튼 그룹 표시
        this.showSelectionControls();
    }
    
    /**
     * 선택 모드 비활성화
     */
    deactivateSelectionMode() {
        // 갤러리 컨테이너에서 선택 모드 클래스 제거
        this.galleryContainer.classList.remove(this.CSS_CLASSES.SELECTION_MODE);
        
        // 이미지에서 체크박스 제거
        this.removeCheckboxesFromImages();
        
        // 선택 컨트롤 버튼 그룹 숨기기
        this.hideSelectionControls();
        
        // 이벤트 핸들러 정리
        this.cleanupEventHandlers();
    }
    
    /**
     * 이미지에 체크박스 동적 추가
     */
    addCheckboxesToImages() {
        const imageCards = document.querySelectorAll(this.CSS_CLASSES.IMAGE_CARD);
        
        imageCards.forEach(card => {
            const imageId = card.dataset.imageId;
            if (!imageId) return;
            
            // 이미 체크박스가 있는지 확인
            if (card.querySelector(`.${this.CSS_CLASSES.SELECTION_CHECKBOX}`)) return;
            
            // 체크박스 컨테이너 생성
            const checkboxContainer = this.createCheckboxContainer(imageId);
            
            // 선택 오버레이 생성
            const overlay = this.createSelectionOverlay();
            
            // 카드에 요소들 추가
            card.appendChild(checkboxContainer);
            card.appendChild(overlay);
            card.classList.add(this.CSS_CLASSES.SELECTABLE);
            
            // 이벤트 핸들러 바인딩
            this.bindImageSelectionEvents(card, imageId);
        });
    }
    
    /**
     * 체크박스 컨테이너 생성
     * @param {string} imageId - 이미지 ID
     * @returns {HTMLElement} 체크박스 컨테이너 요소
     */
    createCheckboxContainer(imageId) {
        const container = document.createElement('div');
        container.className = this.CSS_CLASSES.SELECTION_CHECKBOX;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `img-${imageId}`;
        checkbox.dataset.imageId = imageId;
        checkbox.setAttribute('aria-label', `이미지 ${imageId} 선택`);
        
        const label = document.createElement('label');
        label.htmlFor = `img-${imageId}`;
        label.setAttribute('aria-hidden', 'true'); // 스크린 리더에서는 체크박스만 읽도록
        
        container.appendChild(checkbox);
        container.appendChild(label);
        
        return container;
    }
    
    /**
     * 선택 오버레이 생성
     * @returns {HTMLElement} 선택 오버레이 요소
     */
    createSelectionOverlay() {
        const overlay = document.createElement('div');
        overlay.className = this.CSS_CLASSES.SELECTION_OVERLAY;
        overlay.setAttribute('aria-hidden', 'true');
        return overlay;
    }
    
    /**
     * 이미지 선택 이벤트 바인딩
     * @param {HTMLElement} card - 이미지 카드 요소
     * @param {string} imageId - 이미지 ID
     */
    bindImageSelectionEvents(card, imageId) {
        const checkbox = card.querySelector(`#img-${imageId}`);
        
        // 체크박스 변경 이벤트
        const checkboxHandler = (e) => {
            e.stopPropagation();
            this.bulkDeleteManager.toggleImageSelection(imageId);
        };
        
        // 카드 클릭 이벤트 (선택 모드에서만)
        const cardClickHandler = (e) => {
            if (this.bulkDeleteManager.getIsSelectionMode()) {
                e.preventDefault();
                e.stopPropagation();
                this.bulkDeleteManager.toggleImageSelection(imageId);
            }
        };
        
        // 이벤트 리스너 추가
        checkbox.addEventListener('change', checkboxHandler);
        card.addEventListener('click', cardClickHandler);
        
        // 이벤트 핸들러 참조 저장 (정리용)
        this.eventHandlers.set(card, {
            checkbox: { element: checkbox, handler: checkboxHandler, event: 'change' },
            click: { element: card, handler: cardClickHandler, event: 'click' }
        });
    }
    
    /**
     * 이미지에서 체크박스 제거
     */
    removeCheckboxesFromImages() {
        const imageCards = document.querySelectorAll(this.CSS_CLASSES.IMAGE_CARD);
        
        imageCards.forEach(card => {
            // 체크박스 및 오버레이 제거
            const checkbox = card.querySelector(`.${this.CSS_CLASSES.SELECTION_CHECKBOX}`);
            const overlay = card.querySelector(`.${this.CSS_CLASSES.SELECTION_OVERLAY}`);
            
            if (checkbox) checkbox.remove();
            if (overlay) overlay.remove();
            
            // CSS 클래스 제거
            card.classList.remove(this.CSS_CLASSES.SELECTABLE, this.CSS_CLASSES.SELECTED);
        });
    }
    
    /**
     * 선택 모드 버튼 그룹 생성 및 표시
     */
    showSelectionControls() {
        // 기존 컨트롤이 있으면 제거
        this.hideSelectionControls();
        
        // image-gallery-header 찾기
        const galleryHeader = document.querySelector('.image-gallery-header');
        if (!galleryHeader) {
            return;
        }
        
        // 선택 컨트롤 HTML 생성
        const controlsElement = this.createSelectionControlsElement();
        
        // image-gallery-header에 추가
        galleryHeader.appendChild(controlsElement);
        
        this.selectionControls = controlsElement;
        
        // 이벤트 바인딩
        this.bindSelectionControlEvents();
        
        // 초기 상태 업데이트
        this.updateDeleteButtonState();
    }
    
    /**
     * 선택 컨트롤 요소 생성
     * @returns {HTMLElement} 선택 컨트롤 요소
     */
    createSelectionControlsElement() {
        const controls = document.createElement('div');
        controls.className = 'd-flex gap-2 align-items-center';
        controls.setAttribute('data-selection-controls', 'true');
        
        controls.innerHTML = `
            <button class="btn btn-outline-primary btn-sm" id="toggleSelectAllBtn" type="button">
                <i class="ti ti-check-all me-1"></i>
                전체 선택
            </button>
            <button class="btn btn-outline-danger btn-sm" id="deleteSelectedBtn" type="button" disabled>
                <i class="ti ti-trash me-1"></i>
                삭제
            </button>
        `;
        
        return controls;
    }
    
    /**
     * 선택 컨트롤 버튼 그룹 숨기기
     */
    hideSelectionControls() {
        if (this.selectionControls) {
            this.selectionControls.remove();
            this.selectionControls = null;
        }
    }
    
    /**
     * 선택 컨트롤 이벤트 바인딩
     */
    bindSelectionControlEvents() {
        if (!this.selectionControls) return;
        
        const toggleSelectAllBtn = this.selectionControls.querySelector('#toggleSelectAllBtn');
        const deleteSelectedBtn = this.selectionControls.querySelector('#deleteSelectedBtn');
        
        // 전체 선택/해제 토글 버튼
        if (toggleSelectAllBtn) {
            const handler = () => this.toggleSelectAll(toggleSelectAllBtn);
            toggleSelectAllBtn.addEventListener('click', handler);
            this.storeControlEventHandler(toggleSelectAllBtn, 'click', handler);
        }
        
        // 삭제 버튼
        if (deleteSelectedBtn) {
            const handler = () => this.bulkDeleteManager.deleteSelectedImages();
            deleteSelectedBtn.addEventListener('click', handler);
            this.storeControlEventHandler(deleteSelectedBtn, 'click', handler);
        }
    }
    
    /**
     * 컨트롤 이벤트 핸들러 저장
     * @param {HTMLElement} element - 요소
     * @param {string} event - 이벤트 타입
     * @param {Function} handler - 핸들러 함수
     */
    storeControlEventHandler(element, event, handler) {
        if (!this.eventHandlers.has('controls')) {
            this.eventHandlers.set('controls', []);
        }
        this.eventHandlers.get('controls').push({ element, event, handler });
    }
    
    /**
     * 전체 선택/해제 토글 처리
     * @param {HTMLElement} toggleButton - 토글 버튼 요소
     */
    toggleSelectAll(toggleButton) {
        const selectedCount = this.bulkDeleteManager.getSelectedCount();
        const totalCount = document.querySelectorAll(this.CSS_CLASSES.IMAGE_CARD).length;
        
        if (selectedCount === totalCount && totalCount > 0) {
            // 모든 이미지가 선택된 상태 -> 전체 해제
            this.bulkDeleteManager.deselectAll();
            this.updateToggleButtonState(toggleButton, false);
        } else {
            // 일부 또는 아무것도 선택되지 않은 상태 -> 전체 선택
            this.bulkDeleteManager.selectAll();
            this.updateToggleButtonState(toggleButton, true);
        }
    }
    
    /**
     * 토글 버튼 상태 업데이트
     * @param {HTMLElement} toggleButton - 토글 버튼 요소
     * @param {boolean} isAllSelected - 전체 선택 여부
     */
    updateToggleButtonState(toggleButton, isAllSelected) {
        if (!toggleButton) return;
        
        if (isAllSelected) {
            toggleButton.innerHTML = '<i class="ti ti-square me-1"></i>전체 해제';
            toggleButton.classList.remove('btn-outline-primary');
            toggleButton.classList.add('btn-outline-secondary');
        } else {
            toggleButton.innerHTML = '<i class="ti ti-check-all me-1"></i>전체 선택';
            toggleButton.classList.remove('btn-outline-secondary');
            toggleButton.classList.add('btn-outline-primary');
        }
    }
    
    /**
     * 선택 상태에 따른 시각적 피드백 구현
     * @param {string} imageId - 이미지 ID
     * @param {boolean} isSelected - 선택 여부
     */
    updateImageSelectionState(imageId, isSelected) {
        const card = document.querySelector(`[data-image-id="${imageId}"]`);
        const checkbox = document.querySelector(`#img-${imageId}`);
        
        if (!card || !checkbox) {
            return;
        }
        
        // 체크박스 상태 업데이트
        checkbox.checked = isSelected;
        
        // 카드 시각적 상태 업데이트
        if (isSelected) {
            card.classList.add(this.CSS_CLASSES.SELECTED);
            card.setAttribute('aria-selected', 'true');
        } else {
            card.classList.remove(this.CSS_CLASSES.SELECTED);
            card.setAttribute('aria-selected', 'false');
        }
        
        // 선택 상태 변화 애니메이션 효과
        this.addSelectionAnimation(card, isSelected);
    }
    
    /**
     * 선택 상태 변화 애니메이션 효과
     * @param {HTMLElement} card - 이미지 카드 요소
     * @param {boolean} isSelected - 선택 여부
     */
    addSelectionAnimation(card, isSelected) {
        // 기존 애니메이션 클래스 제거
        card.classList.remove('selection-animate-in', 'selection-animate-out');
        
        // 새로운 애니메이션 클래스 추가
        const animationClass = isSelected ? 'selection-animate-in' : 'selection-animate-out';
        card.classList.add(animationClass);
        
        // 애니메이션 완료 후 클래스 제거
        setTimeout(() => {
            card.classList.remove(animationClass);
        }, 200);
    }
    
    /**
     * 모든 이미지 선택 상태 업데이트
     */
    updateAllImageSelectionStates() {
        const imageCards = document.querySelectorAll(this.CSS_CLASSES.IMAGE_CARD);
        
        imageCards.forEach(card => {
            const imageId = card.dataset.imageId;
            if (imageId) {
                const isSelected = this.bulkDeleteManager.isImageSelected(imageId);
                this.updateImageSelectionState(imageId, isSelected);
            }
        });
    }

    /**
     * 삭제 버튼 상태 업데이트
     */
    updateDeleteButtonState() {
        const deleteBtn = document.getElementById('deleteSelectedBtn');
        const toggleBtn = document.getElementById('toggleSelectAllBtn');
        
        if (!deleteBtn) return;
        
        const selectedCount = this.bulkDeleteManager.getSelectedCount();
        const isDeletingInProgress = this.bulkDeleteManager.getIsDeletingInProgress();
        const totalCount = document.querySelectorAll(this.CSS_CLASSES.IMAGE_CARD).length;
        
        // 삭제 버튼 상태 업데이트
        const shouldEnable = selectedCount > 0 && !isDeletingInProgress;
        
        deleteBtn.disabled = !shouldEnable;
        
        if (shouldEnable) {
            deleteBtn.classList.remove('btn-outline-secondary');
            deleteBtn.classList.add('btn-outline-danger');
        } else {
            deleteBtn.classList.remove('btn-outline-danger');
            deleteBtn.classList.add('btn-outline-secondary');
        }
        
        // 토글 버튼 상태 업데이트
        if (toggleBtn) {
            const isAllSelected = selectedCount === totalCount && totalCount > 0;
            this.updateToggleButtonState(toggleBtn, isAllSelected);
        }
    }
    
    /**
     * 모든 컨트롤 비활성화 (삭제 진행 중)
     */
    disableAllControls() {
        // 선택 컨트롤 버튼들 비활성화
        if (this.selectionControls) {
            const buttons = this.selectionControls.querySelectorAll('button');
            buttons.forEach(btn => {
                btn.disabled = true;
                btn.setAttribute('aria-disabled', 'true');
            });
        }
        
        // 체크박스들 비활성화
        const checkboxes = document.querySelectorAll(`.${this.CSS_CLASSES.SELECTION_CHECKBOX} input`);
        checkboxes.forEach(checkbox => {
            checkbox.disabled = true;
        });
        
        // 이미지 카드들 비활성화
        const imageCards = document.querySelectorAll(`${this.CSS_CLASSES.IMAGE_CARD}.${this.CSS_CLASSES.SELECTABLE}`);
        imageCards.forEach(card => {
            card.setAttribute('aria-disabled', 'true');
            card.style.pointerEvents = 'none';
        });
    }
    
    /**
     * 모든 컨트롤 활성화 (삭제 완료 후)
     */
    enableAllControls() {
        // 선택 컨트롤 버튼들 활성화
        if (this.selectionControls) {
            const buttons = this.selectionControls.querySelectorAll('button');
            buttons.forEach(btn => {
                btn.disabled = false;
                btn.removeAttribute('aria-disabled');
            });
        }
        
        // 체크박스들 활성화
        const checkboxes = document.querySelectorAll(`.${this.CSS_CLASSES.SELECTION_CHECKBOX} input`);
        checkboxes.forEach(checkbox => {
            checkbox.disabled = false;
        });
        
        // 이미지 카드들 활성화
        const imageCards = document.querySelectorAll(`${this.CSS_CLASSES.IMAGE_CARD}.${this.CSS_CLASSES.SELECTABLE}`);
        imageCards.forEach(card => {
            card.removeAttribute('aria-disabled');
            card.style.pointerEvents = '';
        });
        
        // 삭제 버튼 상태 재업데이트
        this.updateDeleteButtonState();
    }
    
    /**
     * 이벤트 핸들러 정리
     */
    cleanupEventHandlers() {
        // 이미지 카드 이벤트 핸들러 제거
        this.eventHandlers.forEach((handlers, key) => {
            if (key === 'controls') {
                // 컨트롤 이벤트 핸들러 제거
                handlers.forEach(({ element, event, handler }) => {
                    element.removeEventListener(event, handler);
                });
            } else if (key instanceof HTMLElement) {
                // 이미지 카드 이벤트 핸들러 제거
                Object.values(handlers).forEach(({ element, handler, event }) => {
                    element.removeEventListener(event, handler);
                });
            }
        });
        
        // 핸들러 맵 초기화
        this.eventHandlers.clear();
    }

    /**
     * 갤러리 컨테이너 설정
     * @param {HTMLElement} container - 갤러리 컨테이너 요소
     */
    setGalleryContainer(container) {
        this.galleryContainer = container;
    }

    /**
     * 모든 UI 상태 완전 초기화
     */
    resetAllStates() {
        // 선택 모드 비활성화
        this.deactivateSelectionMode();
        
        // 모든 이미지 카드에서 선택 관련 클래스 및 속성 제거
        const imageCards = document.querySelectorAll(this.CSS_CLASSES.IMAGE_CARD);
        imageCards.forEach(card => {
            card.classList.remove(
                this.CSS_CLASSES.SELECTABLE, 
                this.CSS_CLASSES.SELECTED,
                'selection-animate-in',
                'selection-animate-out'
            );
            card.removeAttribute('tabindex');
            card.removeAttribute('role');
            card.removeAttribute('aria-label');
            card.removeAttribute('aria-selected');
            card.removeAttribute('aria-disabled');
            card.style.pointerEvents = '';
        });
        
        // 갤러리 컨테이너 상태 초기화
        if (this.galleryContainer) {
            this.galleryContainer.classList.remove(this.CSS_CLASSES.SELECTION_MODE);
        }
        
        // 선택 컨트롤 완전 제거
        this.hideSelectionControls();
        
        // 이벤트 핸들러 완전 정리
        this.cleanupEventHandlers();
    }
}
