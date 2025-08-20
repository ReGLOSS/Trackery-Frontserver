/**
 * 이미지 로딩, 표시, 클릭 이벤트를 담당하는 클래스
 */
export class ImageManager {
    constructor() {
        this.modalManager = null;
        this.bulkDeleteManager = null;
    }
    
    // 의존성 주입
    setDependencies({ modalManager, bulkDeleteManager }) {
        this.modalManager = modalManager;
        this.bulkDeleteManager = bulkDeleteManager;
    }
    
    
    // 시도별 이미지 로드
    async loadSidoImages(sidoId, options = {}) {
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
            
            // 시도 ID를 옵션에 포함
            const displayOptions = {
                regionId: sidoId,
                ...options
            };
            
            this.displayImages(images, 'sido', displayOptions);
        } catch (error) {
            console.error('Error loading sido images:', error);
        }
    }
    
    // 시군구별 이미지 로드
    async loadSigunguImages(sigunguId, options = {}) {
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
            
            // 시군구 ID를 옵션에 포함
            const displayOptions = {
                regionId: sigunguId,
                ...options
            };
            
            this.displayImages(images, 'sigungu', displayOptions);
        } catch (error) {
            console.error('Error loading sigungu images:', error);
        }
    }
    
    // 이미지 표시 (선택 모드 옵션 추가)
    displayImages(images, type, options = {}) {
        const detailContainer = document.querySelector('.detail-container');
        if (!detailContainer) return;
        
        // 기본 옵션 설정
        const defaultOptions = {
            showSelectionModeButton: true,
            enableImageClick: true,
            regionId: null
        };
        const finalOptions = { ...defaultOptions, ...options };
        
        if (!images || images.length === 0) {
            detailContainer.innerHTML = `
                <div class="no-images">
                    <p>해당 지역에 등록된 이미지가 없습니다.</p>
                </div>
            `;
            return;
        }
        
        // 선택 모드 버튼 HTML 생성 (옵션에 따라)
        const selectionModeButtonHtml = finalOptions.showSelectionModeButton ? `
            <div class="image-gallery-header">
                <button class="btn btn-outline-primary btn-sm" id="selectionModeBtn" 
                        role="switch" 
                        aria-pressed="false"
                        aria-label="선택 모드 활성화. 여러 이미지를 선택하여 삭제할 수 있습니다."
                        aria-describedby="selectionModeDesc">
                    <i class="ti ti-checkbox" aria-hidden="true"></i>
                    선택 모드
                </button>
                <span class="gallery-info">
                    총 ${images.length}장의 이미지
                </span>
                <!-- 스크린 리더용 설명 -->
                <div id="selectionModeDesc" class="sr-only">
                    선택 모드를 활성화하면 여러 이미지를 선택하여 한 번에 삭제할 수 있습니다.
                </div>
            </div>
        ` : '';
        
        const imageGridHtml = `
            <div class="region-image-gallery" data-region-type="${type}" data-region-id="${finalOptions.regionId || ''}">
                ${selectionModeButtonHtml}
                <div class="gallery-section">
                    <div class="gallery-content region-gallery-grid">
                        ${images.map(image => `
                            <div class="gallery-card region-image-card" 
                                 data-image-id="${image.imageId}"
                                 data-thumbnail-url="${image.thumbnailUrl}">
                                <img src="${image.thumbnailUrl}" alt="이미지" 
                                     loading="lazy" onerror="this.src='/images/placeholder.jpg'">
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        detailContainer.innerHTML = imageGridHtml;
        
        // BulkDeleteManager와 연동
        this.setupBulkDeleteIntegration(images, type, finalOptions.regionId);
        
        // 이미지 클릭 이벤트 바인딩 (옵션에 따라)
        if (finalOptions.enableImageClick) {
            this.bindImageClickEvents();
        }
        
        // 선택 모드 버튼 이벤트 바인딩 (버튼이 표시된 경우에만)
        if (finalOptions.showSelectionModeButton) {
            this.bindSelectionModeButton(type, images, finalOptions.regionId);
        }
    }
    
    // 이미지 클릭 이벤트 바인딩
    bindImageClickEvents() {
        const imageCards = document.querySelectorAll('.region-image-card');
        imageCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // 선택 모드가 활성화된 경우 BulkDeleteManager가 처리하도록 함
                if (this.bulkDeleteManager && this.bulkDeleteManager.getIsSelectionMode()) {
                    return; // BulkDeleteManager에서 처리됨
                }
                
                const imageId = card.dataset.imageId;
                const thumbnailUrl = card.querySelector('img').src;
                if (this.modalManager) {
                    this.modalManager.showImageDetail(imageId, thumbnailUrl);
                }
            });
        });
    }
    
    // BulkDeleteManager와의 연동 설정
    setupBulkDeleteIntegration(images, regionType, regionId) {
        if (!this.bulkDeleteManager) return;
        
        // BulkDeleteManager에 현재 이미지 목록과 지역 정보 업데이트
        this.bulkDeleteManager.updateCurrentImageList(images);
        this.bulkDeleteManager.setCurrentRegion(regionType, regionId);
        
        // 갤러리 컨테이너 참조 설정
        const galleryContainer = document.querySelector('.region-image-gallery');
        if (galleryContainer) {
            this.bulkDeleteManager.setGalleryContainer(galleryContainer);
        }
    }
    
    // 선택 모드 버튼 이벤트 바인딩
    bindSelectionModeButton(regionType, images, regionId = null) {
        const selectionModeBtn = document.getElementById('selectionModeBtn');
        if (!selectionModeBtn || !this.bulkDeleteManager) return;
        
        // BulkDeleteManager에 버튼 참조 설정
        this.bulkDeleteManager.setSelectionModeButton(selectionModeBtn);
        
        
        selectionModeBtn.addEventListener('click', () => {
            this.bulkDeleteManager.toggleSelectionMode(regionType, regionId, images);
        });
    }

    // 현재 보고 있는 이미지 목록 새로고침
    refreshCurrentImageList(currentView, currentSigunguId, currentSidoId) {
        if (currentView === 'detail' && currentSigunguId) {
            // 시군구 상세 뷰인 경우
            this.loadSigunguImages(currentSigunguId);
        } else if (currentView === 'sigungu' && currentSidoId) {
            // 시도 뷰인 경우
            this.loadSidoImages(currentSidoId);
        }
    }

    // 선택 모드 해제
    exitSelectionMode() {
        if (this.bulkDeleteManager) {
            this.bulkDeleteManager.exitSelectionMode();
        }
    }

    // 이미지 갤러리 헤더 업데이트 (선택된 개수 표시 등)
    updateGalleryHeader(selectedCount = 0, totalCount = 0) {
        const galleryInfo = document.querySelector('.gallery-info');
        if (galleryInfo) {
            if (selectedCount > 0) {
                galleryInfo.textContent = `${selectedCount}/${totalCount}장 선택됨`;
            } else {
                galleryInfo.textContent = `총 ${totalCount}장의 이미지`;
            }
        }
    }
}
