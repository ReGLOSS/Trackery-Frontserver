// ============================================================
// imageViewer.js - 이미지 뷰어 모듈
// ============================================================

import { DOM, CONSTANTS } from './constants.js';

export const ImageViewer = {
    // 메인 뷰에 이미지 표시
    showImageInMainView(galleryCard) {
        const imageUrl = galleryCard.dataset.imageUrl;
        const imageName = galleryCard.dataset.imageName;

        // 이전 선택 해제 (모든 갤러리에서)
        const previousSelected = document.querySelectorAll('.gallery-card.selected, .my-image-card.selected');
        previousSelected.forEach(card => {
            card.classList.remove('selected');
        });

        // 현재 카드 선택
        galleryCard.classList.add('selected');

        // 메인 이미지 컨테이너 업데이트
        DOM.albumImageContainer.innerHTML = '';

        const mainImageWrapper = document.createElement('div');
        mainImageWrapper.className = 'main-image-wrapper';
        mainImageWrapper.style.cssText = `
            width: 100%; height: 100%; display: flex; align-items: center;
            justify-content: center; cursor: pointer; position: relative;
        `;

        const mainImage = document.createElement('img');
        mainImage.src = imageUrl;
        mainImage.alt = imageName;
        mainImage.style.cssText = `
            max-width: 100%; max-height: 100%; object-fit: contain;
        `;

        // 클릭 시 상세 정보 표시
        mainImageWrapper.addEventListener('click', () => {
            this.showImageDataset(galleryCard);
        });

        mainImageWrapper.appendChild(mainImage);
        DOM.albumImageContainer.appendChild(mainImageWrapper);
    },

    // 이미지 상세 정보 표시
    showImageDataset(galleryCard) {
        const dataset = galleryCard.dataset;

        // 날짜 포맷팅
        const formatDateOnly = (dateString) => {
            if (!dateString || dateString === 'N/A' || dateString === '') return '';
            try {
                return dateString.split('T')[0];
            } catch (e) {
                return dateString;
            }
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
                    <span style="color: #333;">${dataset.imageContent || ''}</span>
                </div>
                <div style="border-bottom: 1px solid #eee; padding-bottom: 10px;">
                    <strong style="color: #555; display: block; margin-bottom: 5px;">촬영 날짜</strong>
                    <span style="color: #333;">${formatDateOnly(dataset.imageDate)}</span>
                </div>
                <div style="border-bottom: 1px solid #eee; padding-bottom: 10px;">
                    <strong style="color: #555; display: block; margin-bottom: 5px;">등록 날짜</strong>
                    <span style="color: #333;">${formatDateOnly(dataset.imageRegDate)}</span>
                </div>
                <div style="border-bottom: 1px solid #eee; padding-bottom: 10px;">
                    <strong style="color: #555; display: block; margin-bottom: 5px;">위치</strong>
                    <span style="color: #333;">${dataset.sdName || ''} ${dataset.sggName || ''}</span>
                </div>
                <div style="border-bottom: 1px solid #eee; padding-bottom: 10px;">
                    <strong style="color: #555; display: block; margin-bottom: 5px;">공개 설정</strong>
                    <span style="color: #333;">${CONSTANTS.IS_PUBLIC[dataset.isPublic]}</span>
                </div>
            </div>
        `;

        infoPanel.appendChild(closeButton);
        infoPanel.appendChild(infoContent);
        infoOverlay.appendChild(infoPanel);
        document.body.appendChild(infoOverlay);
    }
};
