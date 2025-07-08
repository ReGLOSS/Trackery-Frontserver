// ============================================================
// imageEditMode.js - 이미지 편집 모드 모듈
// ============================================================

import { DOM, State } from './constants.js';
import { ApiService } from './apiService.js';
import { UiUpdater } from './uiUpdater.js';
import { GalleryToggle } from './galleryToggle.js';

export const ImageEditMode = {
    // 이미지 편집 모드 토글
    async toggleImageEditMode() {
        if (!State.isImageEditingMode) {
            await this.startImageEditMode();
        } else {
            await this.endImageEditMode();
        }
    },

    // 이미지 편집 모드 시작
    async startImageEditMode() {
        console.log("이미지 편집 모드 시작");
        
        // 먼저 로딩 알림 표시
        UiUpdater.showNotification('이미지 편집 모드를 준비하는 중...', 'info');
        
        State.isImageEditingMode = true;
        State.selectedImages.clear();
        State.toAddImageIds = [];
        State.toRemoveImageIds = [];

        // 버튼 텍스트 변경 및 비활성화
        DOM.imageEditBtn.textContent = '준비 중...';
        DOM.imageEditBtn.disabled = true;
        DOM.imageEditBtn.classList.add('editing-active');

        // 내 이미지 섹션을 먼저 보여주되 내용은 숨김
        GalleryToggle.showMyImagesSection();
        
        // 갤러리들을 임시로 숨김 (로딩 중에는 보이지 않도록)
        if (DOM.albumDetailEditMyImagesGallery) {
            DOM.albumDetailEditMyImagesGallery.style.visibility = 'hidden';
        }
        if (DOM.albumDetailGallery) {
            DOM.albumDetailGallery.style.visibility = 'hidden';
        }

        try {
            // 내 이미지 목록 로드
            await this.loadMyImages();
            
            // 모든 갤러리 카드에 체크박스 추가 (백그라운드에서)
            this.addCheckboxesToAllGalleries();
            
            // 모든 준비 완료 후 갤러리 다시 보이기
            if (DOM.albumDetailEditMyImagesGallery) {
                DOM.albumDetailEditMyImagesGallery.style.visibility = 'visible';
            }
            if (DOM.albumDetailGallery) {
                DOM.albumDetailGallery.style.visibility = 'visible';
            }

            // 버튼 활성화 및 텍스트 변경
            DOM.imageEditBtn.textContent = '저장';
            DOM.imageEditBtn.disabled = false;

            // 성공 알림
            UiUpdater.showNotification('이미지 편집 모드가 시작되었습니다.', 'success');
            
        } catch (error) {
            console.error('내 이미지 로드 중 오류:', error);
            UiUpdater.showNotification('내 이미지를 불러오는 중 오류가 발생했습니다.', 'error');
            
            // 오류 발생 시 갤러리 다시 보이기 및 편집 모드 종료
            if (DOM.albumDetailEditMyImagesGallery) {
                DOM.albumDetailEditMyImagesGallery.style.visibility = 'visible';
            }
            if (DOM.albumDetailGallery) {
                DOM.albumDetailGallery.style.visibility = 'visible';
            }
            
            // 버튼 상태 복원
            DOM.imageEditBtn.textContent = '이미지 추가/삭제';
            DOM.imageEditBtn.disabled = false;
            
            this.endImageEditMode();
        }
    },

    // 내 이미지 로드
    async loadMyImages() {
        try {
            const response = await ApiService.fetchMyImages();
            const imageList = response.data.list;
            const paginationData = response.data;

            if (imageList && imageList.length > 0) {
                await UiUpdater.renderMyImagesGallery(imageList);
                UiUpdater.renderMyImagesPagination(paginationData);
                console.log(`내 이미지 ${imageList.length}개 로드 완료`);
            } else {
                console.log('내 이미지가 없습니다');
                // 빈 갤러리 표시
                if (DOM.albumDetailEditMyImagesGallery) {
                    DOM.albumDetailEditMyImagesGallery.innerHTML = '<div class="no-images-message">내 이미지가 없습니다.</div>';
                }
            }
        } catch (error) {
            console.error('내 이미지 로드 실패:', error);
            throw error;
        }
    },

    // 이미지 편집 모드 종료
    async endImageEditMode() {
        console.log("이미지 편집 모드 종료");
        
        try {
            // 변경사항이 있는 경우에만 API 호출
            if (State.toAddImageIds.length > 0 || State.toRemoveImageIds.length > 0) {
                UiUpdater.showNotification('변경사항을 저장하는 중...', 'info');
                
                // 이미지 추가
                if (State.toAddImageIds.length > 0) {
                    console.log('추가할 이미지 IDs:', State.toAddImageIds);
                    await ApiService.addAlbumImage(State.currentAlbumId, State.toAddImageIds);
                }
                
                // 이미지 삭제
                if (State.toRemoveImageIds.length > 0) {
                    console.log('삭제할 이미지 IDs:', State.toRemoveImageIds);
                    await ApiService.removeAlbumImage(State.currentAlbumId, State.toRemoveImageIds);
                }
                
                UiUpdater.showNotification(`${State.toAddImageIds.length}개 이미지가 추가되었습니다.`, 'success');
                
                // 앨범 상세 정보 다시 로드하여 UI 업데이트 (외부에서 처리)
                if (window.EventHandlers) {
                    await window.EventHandlers.loadAlbumDetail(State.currentAlbumId);
                }
                
                // 메인 갤러리의 해당 앨범 카드 이미지 개수도 업데이트
                await this.updateMainGalleryImageCount();
                
            } else {
                UiUpdater.showNotification('변경사항이 없습니다.', 'info');
            }
        } catch (error) {
            console.error('이미지 편집 저장 중 오류:', error);
            UiUpdater.showNotification(`저장 실패: ${error.message}`, 'error');
        }
        
        // 상태 초기화
        State.isImageEditingMode = false;
        State.selectedImages.clear();
        State.toAddImageIds = [];
        State.toRemoveImageIds = [];

        // 버튼 텍스트 변경
        DOM.imageEditBtn.textContent = '이미지 추가/삭제';
        DOM.imageEditBtn.classList.remove('editing-active');

        // 모든 갤러리에서 체크박스 제거
        this.removeCheckboxesFromAllGalleries();

        // 내 이미지 갤러리 초기화 및 섹션 숨김
        if (DOM.albumDetailEditMyImagesGallery) {
            DOM.albumDetailEditMyImagesGallery.innerHTML = '';
        }
        GalleryToggle.hideMyImagesSection();
    },

    // 메인 갤러리의 이미지 개수 업데이트
    async updateMainGalleryImageCount() {
        if (!State.currentAlbumId) return;
        
        try {
            // 현재 앨범 상세 정보를 다시 가져와서 정확한 이미지 개수 확인
            const response = await ApiService.fetchAlbumDetail(State.currentAlbumId);
            const actualData = response.data;
            const newImageCount = actualData.imageCount;
            
            // 메인 갤러리의 해당 앨범 카드 찾기
            const albumCard = DOM.albumGallery.querySelector(`[data-album-id="${State.currentAlbumId}"]`);
            if (albumCard) {
                const imageCountElement = albumCard.querySelector('.card-album-image-count');
                if (imageCountElement) {
                    imageCountElement.textContent = `항목 : ${newImageCount}장`;
                    console.log(`메인 갤러리 앨범 카드 이미지 개수 업데이트: ${newImageCount}장`);
                }
            }
        } catch (error) {
            console.error('메인 갤러리 이미지 개수 업데이트 실패:', error);
        }
    },

    // 모든 갤러리에 체크박스 추가
    addCheckboxesToAllGalleries() {
        // 앨범 갤러리에 체크박스 추가
        this.addCheckboxesToGallery('.gallery-card');
        // 내 이미지 갤러리에 체크박스 추가
        this.addCheckboxesToGallery('.my-image-card');
    },

    // 모든 갤러리에서 체크박스 제거
    removeCheckboxesFromAllGalleries() {
        // 앨범 갤러리에서 체크박스 제거
        this.removeCheckboxesFromGallery('.gallery-card');
        // 내 이미지 갤러리에서 체크박스 제거
        this.removeCheckboxesFromGallery('.my-image-card');
    },

    // 특정 갤러리에 체크박스 추가
    addCheckboxesToGallery(selector) {
        const galleryCards = document.querySelectorAll(selector);
        
        galleryCards.forEach(card => {
            // 이미 체크박스가 있다면 스킵
            if (card.querySelector('.image-checkbox')) return;

            const checkbox = this.createImageCheckbox(card);
            card.appendChild(checkbox);
            
            // 카드에 편집 모드 클래스 추가
            card.classList.add('edit-mode');
        });
    },

    // 특정 갤러리에서 체크박스 제거
    removeCheckboxesFromGallery(selector) {
        const galleryCards = document.querySelectorAll(selector);
        
        galleryCards.forEach(card => {
            const checkbox = card.querySelector('.image-checkbox');
            if (checkbox) {
                checkbox.remove();
            }
            
            // 카드에서 편집 모드 관련 클래스들 모두 제거
            card.classList.remove('edit-mode', 'selected', 'checkbox-selected');
        });
    },

    // 이미지 체크박스 생성
    createImageCheckbox(galleryCard) {
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'image-checkbox';
        checkboxContainer.dataset.imageId = galleryCard.dataset.imageId;

        // 카드 타입에 따라 다른 스타일과 아이콘 설정
        const cardType = galleryCard.dataset.cardType || 'album';
        const isMyImage = cardType === 'myImages';

        // 체크박스 스타일
        checkboxContainer.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            width: 24px;
            height: 24px;
            border: 2px solid white;
            border-radius: 50%;
            background-color: rgba(0, 0, 0, 0.3);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            z-index: 10;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        `;

        // 아이콘 생성 (타입에 따라 다른 아이콘과 색상)
        const icon = document.createElement('div');
        icon.className = 'check-icon';
        
        if (isMyImage) {
            // 내 이미지: 초록색 +
            icon.innerHTML = '+';
            icon.style.cssText = `
                color: white;
                font-size: 18px;
                font-weight: bold;
                display: none;
                line-height: 1;
            `;
        } else {
            // 앨범 이미지: 빨간색 -
            icon.innerHTML = '−';
            icon.style.cssText = `
                color: white;
                font-size: 20px;
                font-weight: bold;
                display: none;
                line-height: 1;
            `;
        }

        checkboxContainer.appendChild(icon);

        // 클릭 이벤트 추가
        checkboxContainer.addEventListener('click', (e) => {
            // 체크박스 토글
            this.toggleImageSelection(galleryCard, checkboxContainer);
        });

        return checkboxContainer;
    },

    // 이미지 선택 토글
    toggleImageSelection(galleryCard, checkboxContainer) {
        const imageId = galleryCard.dataset.imageId;
        const checkIcon = checkboxContainer.querySelector('.check-icon');
        const cardType = galleryCard.dataset.cardType || 'album';
        const isMyImage = cardType === 'myImages';

        const targetArray = isMyImage ? State.toAddImageIds : State.toRemoveImageIds;

        if (State.selectedImages.has(imageId)) {
            // 선택 해제
            State.selectedImages.delete(imageId);
            galleryCard.classList.remove('checkbox-selected'); // 체크박스 선택 스타일 제거
            checkboxContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
            checkIcon.style.display = 'none';
            console.log(`이미지 ${imageId} 선택 해제 (${isMyImage ? '내 이미지' : '앨범 이미지'})`);

            const index = targetArray.indexOf(imageId);
            if (index > -1) {
                targetArray.splice(index, 1);
            }
        } else {
            // 선택
            State.selectedImages.add(imageId);
            galleryCard.classList.add('checkbox-selected'); // 체크박스 선택 스타일 추가

            if (!targetArray.includes(imageId)) {
                targetArray.push(imageId);
            }
            
            // 타입에 따라 다른 배경색 설정
            if (isMyImage) {
                checkboxContainer.style.backgroundColor = '#28a745'; // 초록색
            } else {
                checkboxContainer.style.backgroundColor = '#dc3545'; // 빨간색
            }
            
            checkIcon.style.display = 'block';
            console.log(`이미지 ${imageId} 선택 (${isMyImage ? '내 이미지' : '앨범 이미지'})`);
        }

        console.log(`현재 선택된 이미지 수: ${State.selectedImages.size}`);
        console.log('추가할 이미지:', State.toAddImageIds);
        console.log('제거할 이미지:', State.toRemoveImageIds);
    }
};
