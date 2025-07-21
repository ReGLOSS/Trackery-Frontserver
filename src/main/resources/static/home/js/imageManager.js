/**
 * 이미지 로딩, 표시, 클릭 이벤트를 담당하는 클래스
 */
export class ImageManager {
    constructor() {
        this.modalManager = null;
    }
    
    // 의존성 주입
    setModalManager(modalManager) {
        this.modalManager = modalManager;
    }
    
    // 시도별 이미지 로드
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
    
    // 시군구별 이미지 로드
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
        if (!detailContainer) return;
        
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
                if (this.modalManager) {
                    this.modalManager.showImageDetail(imageId);
                }
            });
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
}