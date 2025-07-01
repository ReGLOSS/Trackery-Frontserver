// ============================================================
// imageViewer.js - 이미지 뷰어 모듈
// ============================================================

import { DOM, CONSTANTS } from './constants.js';
import { ApiService } from './apiService.js';

export const ImageViewer = {
    // 메인 뷰에 이미지 표시
    async showImageInMainView(galleryCard) {
        try {
            // 이미지 ID 가져오기
            const imageId = galleryCard.dataset.imageId;
            
            if (!imageId) {
                console.error('이미지 ID를 찾을 수 없습니다.');
                return;
            }

            // 이전 선택 해제 (모든 갤러리에서)
            const previousSelected = document.querySelectorAll('.gallery-card.selected, .my-image-card.selected');
            previousSelected.forEach(card => {
                card.classList.remove('selected');
            });

            // 현재 카드 선택
            galleryCard.classList.add('selected');

            // 로딩 상태 표시
            this.showLoadingState();

            // 이미지 상세 정보 가져오기
            const response = await ApiService.fetchImageDetail(imageId);
            const imageData = response.data;

            // 메인 이미지 컨테이너 업데이트
            this.updateMainImageContainer(imageData);

        } catch (error) {
            console.error('이미지 상세 정보를 불러오는 중 오류 발생:', error);
            this.showErrorState();
        }
    },

    // 로딩 상태 표시
    showLoadingState() {
        DOM.albumImageContainer.innerHTML = '';

        const loadingWrapper = document.createElement('div');
        loadingWrapper.className = 'main-image-loading';
        loadingWrapper.style.cssText = `
            width: 100%; height: 100%; display: flex; align-items: center;
            justify-content: center; color: #666; font-size: 1.1rem;
        `;
        loadingWrapper.textContent = '이미지를 불러오는 중...';

        DOM.albumImageContainer.appendChild(loadingWrapper);
    },

    // 오류 상태 표시
    showErrorState() {
        DOM.albumImageContainer.innerHTML = '';

        const errorWrapper = document.createElement('div');
        errorWrapper.className = 'main-image-error';
        errorWrapper.style.cssText = `
            width: 100%; height: 100%; display: flex; align-items: center;
            justify-content: center; color: #e74c3c; font-size: 1.1rem;
        `;
        errorWrapper.textContent = '이미지를 불러올 수 없습니다.';

        DOM.albumImageContainer.appendChild(errorWrapper);
    },

    // 메인 이미지 컨테이너 업데이트
    updateMainImageContainer(imageData) {
        DOM.albumImageContainer.innerHTML = '';

        const mainImageWrapper = document.createElement('div');
        mainImageWrapper.className = 'main-image-wrapper';
        mainImageWrapper.style.cssText = `
            width: 100%; height: 100%; display: flex; align-items: center;
            justify-content: center; cursor: pointer; position: relative;
        `;

        const mainImage = document.createElement('img');
        mainImage.src = imageData.imageUrl;
        mainImage.alt = imageData.imageName || '이미지';
        mainImage.style.cssText = `
            max-width: 100%; max-height: 100%; object-fit: contain;
        `;

        // 이미지 로드 오류 처리
        mainImage.addEventListener('error', () => {
            this.showErrorState();
        });

        // 클릭 시 상세 정보 표시
        mainImageWrapper.addEventListener('click', () => {
            this.showImageDataset(imageData);
        });

        mainImageWrapper.appendChild(mainImage);
        DOM.albumImageContainer.appendChild(mainImageWrapper);
    },

    // 이미지 상세 정보 표시
    showImageDataset(imageData) {
        // 날짜 포맷팅
        const formatDateOnly = (dateString) => {
            if (!dateString || dateString === 'N/A' || dateString === '') return '정보 없음';
            try {
                return dateString.split('T')[0];
            } catch (e) {
                return dateString;
            }
        };

        // 위치 정보 포맷팅
        const formatLocation = (sdName, sggName) => {
            const parts = [];
            if (sdName && sdName !== 'N/A') parts.push(sdName);
            if (sggName && sggName !== 'N/A') parts.push(sggName);
            return parts.length > 0 ? parts.join(' ') : '위치 정보 없음';
        };

        // 모달 생성
        const infoOverlay = document.createElement('div');
        infoOverlay.className = 'image-info-overlay';
        infoOverlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.9); z-index: 4000; display: flex;
            align-items: center; justify-content: center; padding: 20px;
        `;

        const infoPanel = document.createElement('div');
        infoPanel.className = 'image-info-panel';
        infoPanel.style.cssText = `
            background: white; border-radius: 12px; padding: 30px;
            max-width: 600px; width: 100%; max-height: 80vh;
            overflow-y: auto; position: relative;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        `;

        // 닫기 버튼
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
            position: absolute; top: 15px; right: 20px; background: none;
            border: none; font-size: 30px; cursor: pointer; color: #666;
            line-height: 1; padding: 0; width: 30px; height: 30px;
        `;

        closeButton.addEventListener('click', () => {
            document.body.removeChild(infoOverlay);
        });

        // 오버레이 클릭 시 닫기
        infoOverlay.addEventListener('click', (e) => {
            if (e.target === infoOverlay) {
                document.body.removeChild(infoOverlay);
            }
        });

        // 정보 내용
        const infoContent = document.createElement('div');
        infoContent.innerHTML = `
            <h3 style="margin-top: 0; margin-bottom: 25px; color: #333; font-size: 1.5rem;">사진 정보</h3>
            <div style="display: grid; gap: 15px;">
                <div style="border-bottom: 1px solid #eee; padding-bottom: 10px;">
                    <strong style="color: #555; display: block; margin-bottom: 5px;">설명</strong>
                    <span style="color: #333;">${imageData.imageContent || '설명 없음'}</span>
                </div>
                <div style="border-bottom: 1px solid #eee; padding-bottom: 10px;">
                    <strong style="color: #555; display: block; margin-bottom: 5px;">촬영 날짜</strong>
                    <span style="color: #333;">${formatDateOnly(imageData.imageDate)}</span>
                </div>
                <div style="border-bottom: 1px solid #eee; padding-bottom: 10px;">
                    <strong style="color: #555; display: block; margin-bottom: 5px;">등록 날짜</strong>
                    <span style="color: #333;">${formatDateOnly(imageData.imageRegDate)}</span>
                </div>
                <div style="border-bottom: 1px solid #eee; padding-bottom: 10px;">
                    <strong style="color: #555; display: block; margin-bottom: 5px;">위치</strong>
                    <span style="color: #333;">${formatLocation(imageData.sdName, imageData.sggName)}</span>
                </div>
                <div style="border-bottom: 1px solid #eee; padding-bottom: 10px;">
                    <strong style="color: #555; display: block; margin-bottom: 5px;">공개 설정</strong>
                    <span style="color: #333;">${CONSTANTS.IS_PUBLIC[imageData.isPublic] || '정보 없음'}</span>
                </div>
            </div>
        `;

        infoPanel.appendChild(closeButton);
        infoPanel.appendChild(infoContent);
        infoOverlay.appendChild(infoPanel);
        document.body.appendChild(infoOverlay);

        // 모달이 제거될 때 이벤트 리스너도 제거
        infoOverlay.addEventListener('remove', () => {
            document.removeEventListener('keydown', handleEscKey);
        });
    }
};
