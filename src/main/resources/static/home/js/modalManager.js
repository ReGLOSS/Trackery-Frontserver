/**
 * 이미지 상세 모달 관리, 편집 모드, 태그/날짜/위치 편집을 담당하는 클래스
 */
export class ModalManager {
    constructor() {
        // 모달 편집 상태 관리
        this.isEditMode = false;
        this.originalModalData = null;
        
        // 날짜 픽커 인스턴스
        this.modalDatePicker = null;
        
        // 모달 맵 픽커 데이터
        this.modalFoundLocationData = {longitude: 0, latitude: 0, sdName: "", sggName: "", locationName: ""};
        
        // 의존성
        this.mapManager = null;
        this.imageManager = null;
        this.statsRenderer = null;
        
        this.bindModalEventsOnce();
    }
    
    // 의존성 주입
    setDependencies({ mapManager, imageManager, statsRenderer }) {
        this.mapManager = mapManager;
        this.imageManager = imageManager;
        this.statsRenderer = statsRenderer;
    }
    
    // 모달 이벤트 바인딩 (한 번만)
    bindModalEventsOnce() {
        const modalEditBtn = document.getElementById('modalEditBtn');
        const modalDeleteBtn = document.getElementById('modalDeleteBtn');
        const modalCancelEditBtn = document.getElementById('modalCancelEditBtn');
        const modalSaveBtn = document.getElementById('modalSaveBtn');
        const modalContent = document.querySelector('#imageDetailModal .modal-content');
        
        if (modalEditBtn) modalEditBtn.addEventListener('click', () => this.enterEditMode());
        if (modalDeleteBtn) modalDeleteBtn.addEventListener('click', () => this.deleteImage());
        if (modalCancelEditBtn) modalCancelEditBtn.addEventListener('click', () => this.cancelEditMode());
        if (modalSaveBtn) modalSaveBtn.addEventListener('click', () => this.saveImageChanges());
        if (modalContent) modalContent.addEventListener('click', (e) => e.stopPropagation());
    }
    
    // 이미지 상세 보기
    async showImageDetail(imageId, galleryThumbnailUrl = null) {
        console.log('=== SHOWING IMAGE DETAIL ===');
        console.log('Image ID:', imageId);
        console.log('Gallery Thumbnail URL:', galleryThumbnailUrl);
        
        try {
            // 원본 이미지 상세 정보를 API에서 가져오기
            const response = await fetch(`/api/images/${imageId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch image detail: ${response.status}`);
            }
            
            const responseData = await response.json();
            const imageData = responseData.data;
            
            console.log('Fetched image data:', imageData);
            
            // 갤러리에서 전달받은 썸네일 URL이 있으면 사용
            if (galleryThumbnailUrl) {
                imageData.galleryThumbnailUrl = galleryThumbnailUrl;
            }
            
            // 모달에 원본 이미지 데이터 채우기
            this.populateImageModal(imageData);
            
            // 모달 표시
            this.showModal();
            
        } catch (error) {
            console.error('Error fetching image detail:', error);
            alert('이미지 상세 정보를 불러올 수 없습니다.');
        }
        
        console.log('=== END SHOWING IMAGE DETAIL ===');
    }
    
    // 모달에 이미지 데이터 채우기
    populateImageModal(imageData) {
        // 이미지
        const modalImage = document.getElementById('modalImage');
        if (modalImage) {
            // 이전 이미지 제거를 위해 빈 이미지로 초기화
            modalImage.src = '';
            // 갤러리에서 전달받은 썸네일 URL을 우선 사용, 없으면 API의 thumbnailUrl, 마지막으로 imageUrl 사용
            const thumbnailSrc = imageData.galleryThumbnailUrl || imageData.thumbnailUrl || imageData.imageUrl || '/images/default-image4.webp';
            modalImage.src = thumbnailSrc;
            modalImage.alt = imageData.imageName || '이미지';
            modalImage.className = 'image-detail';
            modalImage.dataset.originalUrl = imageData.imageUrl || thumbnailSrc;
            modalImage.dataset.thumbnailUrl = thumbnailSrc;
            this.bindImageClickEvents();
        }
        
        // 설명
        const modalDescription = document.getElementById('modalDescription');
        if (modalDescription) {
            modalDescription.value = imageData.imageContent || '';
        }
        
        // 태그
        this.populateModalTags(imageData.tags);
        
        // 위치
        const modalLocationBox = document.getElementById('modalLocationBox');
        let locationText = '';
        if (imageData.sdName && imageData.sggName) {
            locationText = `${imageData.sdName} ${imageData.sggName}`;
        } else if (imageData.sggName) {
            locationText = imageData.sggName;
        } else if (imageData.sdName) {
            locationText = imageData.sdName;
        }
        if (modalLocationBox) {
            modalLocationBox.value = locationText;
        }
        
        // 날짜
        const modalDateBox = document.getElementById('modalDateBox');
        let dateText = '';
        if (imageData.imageDate) {
            dateText = imageData.imageDate.includes('T') || imageData.imageDate.includes('-') ?
                this.formatDateForFlatpickr(imageData.imageDate) : imageData.imageDate;
        }
        if (modalDateBox) {
            modalDateBox.value = dateText;
        }
        
        // 공개 여부
        const modalPublicStatus = document.getElementById('modalPublicStatus');
        const modalPublic = document.getElementById('modalPublic');
        
        const isPublic = imageData.isPublic === 1 || imageData.isPublic === '1' || imageData.isPublic === true;
        if (modalPublicStatus) modalPublicStatus.textContent = isPublic ? '공개' : '비공개';
        if (modalPublic) modalPublic.checked = isPublic;
        
        // 모달 버튼에 imageId 저장
        const modalEditBtn = document.getElementById('modalEditBtn');
        if (modalEditBtn) {
            modalEditBtn.dataset.imageId = imageData.imageId;
        }
        
        // 좌표 교정 (한국 범위 확인: 위도 33-43, 경도 124-132)
        let correctedLatitude = imageData.latitude;
        let correctedLongitude = imageData.longitude;
        
        // 좌표가 뒤바뀐 경우 교정
        if (imageData.latitude >= 124 && imageData.latitude <= 132 && 
            imageData.longitude >= 33 && imageData.longitude <= 43) {
            correctedLatitude = imageData.longitude;
            correctedLongitude = imageData.latitude;
        }
        
        // 원본 데이터 저장 (교정된 좌표 사용)
        this.originalModalData = {
            imageContent: imageData.imageContent || '',
            tags: imageData.tags || [],
            isPublic: imageData.isPublic || false,
            imageDate: imageData.imageDate || '',
            sdName: imageData.sdName || '',
            sggName: imageData.sggName || '',
            locationName: locationText,
            latitude: correctedLatitude,
            longitude: correctedLongitude
        };
        
        // 편집 모드 초기화
        this.isEditMode = false;
        this.updateModalButtonsVisibility();
        
        // 날짜 피커 초기화
        this.initModalDatePicker();
        
        // 모달 맵 픽커 초기화
        this.initModalMapPicker();
        
        // 지도에서 보기 버튼 초기화
        this.initViewOnMapButton();
    }
    
    // 태그 영역 채우기
    populateModalTags(tags) {
        const modalTagBox = document.getElementById('modalTagBox');
        if (!modalTagBox) return;
        
        modalTagBox.innerHTML = '';
        
        // 태그 추가 버튼과 입력 필드 생성
        const tagAddButton = document.createElement('button');
        tagAddButton.className = 'tag-add';
        tagAddButton.textContent = '+';
        tagAddButton.style.display = 'none';
        tagAddButton.id = 'modalTagAddButton';
        
        const tagInput = document.createElement('input');
        tagInput.type = 'text';
        tagInput.className = 'tag-input';
        tagInput.placeholder = '태그 입력 후 Enter';
        tagInput.style.display = 'none';
        tagInput.id = 'modalTagInput';
        
        // 이벤트 리스너
        tagAddButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.showTagInput();
        });
        
        tagInput.addEventListener('keydown', (e) => {
            this.handleTagInputKeydown(e);
        });
        
        // 기존 태그들 추가
        if (tags && tags.length > 0) {
            tags.forEach(tag => {
                const tagElement = this.createTagElement(tag);
                modalTagBox.appendChild(tagElement);
            });
        }
        
        // 태그 추가 버튼과 입력 필드를 마지막에 추가
        modalTagBox.appendChild(tagInput);
        modalTagBox.appendChild(tagAddButton);
    }
    
    // 태그 요소 생성
    createTagElement(tag) {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
        
        const tagId = typeof tag === 'object' ? tag.tagId : null;
        const tagName = typeof tag === 'object' ? (tag.tagName || tag.name || tag) : tag;
        
        tagElement.textContent = tagName;
        tagElement.dataset.tagId = tagId;
        tagElement.dataset.tagName = tagName;
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'tag-delete';
        deleteButton.innerHTML = '×';
        deleteButton.title = '태그 삭제';
        deleteButton.style.display = 'none';
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            tagElement.remove();
        });
        
        tagElement.appendChild(deleteButton);
        return tagElement;
    }
    
    // 모달 표시
    showModal() {
        const modal = document.getElementById('imageDetailModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            this.bindModalEvents();
        }
    }
    
    // 모달 숨기기
    hideModal() {
        const modal = document.getElementById('imageDetailModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }
    
    // 모달 이벤트 바인딩 (각 모달마다)
    bindModalEvents() {
        const modal = document.getElementById('imageDetailModal');
        const modalOverlay = document.getElementById('modalOverlay');
        const modalClose = document.getElementById('modalClose');
        
        const closeModal = () => {
            this.hideModal();
            modalOverlay?.removeEventListener('click', closeModal);
            modalClose?.removeEventListener('click', closeModal);
            document.removeEventListener('keydown', escKeyHandler);
        };
        
        const escKeyHandler = (e) => {
            if (e.key === 'Escape') {
                if (this.isEditMode) {
                    this.cancelEditMode();
                } else {
                    closeModal();
                }
            }
        };
        
        modalOverlay?.addEventListener('click', closeModal);
        modalClose?.addEventListener('click', closeModal);
        document.addEventListener('keydown', escKeyHandler);
    }
    
    // 편집 모드 진입
    enterEditMode() {
        this.isEditMode = true;
        
        // 입력 필드들을 편집 가능하게 변경
        const modalDescription = document.getElementById('modalDescription');
        if (modalDescription) {
            modalDescription.readOnly = false;
        }
        
        // 공개 설정 UI 변경
        const modalPublicStatus = document.getElementById('modalPublicStatus');
        const modalPublicCheckboxArea = document.getElementById('modalPublicCheckboxArea');
        
        if (modalPublicStatus) modalPublicStatus.style.display = 'none';
        if (modalPublicCheckboxArea) modalPublicCheckboxArea.style.display = 'block';
        
        // 태그 편집 모드 활성화
        this.enableTagEditMode();
        
        // 날짜 피커 편집 모드 활성화
        if (this.modalDatePicker) {
            this.modalDatePicker.set('clickOpens', true);
            this.modalDatePicker.set('allowInput', true);
        }
        
        // 버튼 가시성 업데이트
        this.updateModalButtonsVisibility();
        this.updateLocationDateEditButtons();
    }
    
    // 편집 모드 취소
    cancelEditMode() {
        this.isEditMode = false;
        
        // 원본 데이터로 복원
        if (this.originalModalData) {
            const modalDescription = document.getElementById('modalDescription');
            const modalPublic = document.getElementById('modalPublic');
            const modalPublicStatus = document.getElementById('modalPublicStatus');
            const modalDateBox = document.getElementById('modalDateBox');
            const modalLocationBox = document.getElementById('modalLocationBox');
            
            if (modalDescription) modalDescription.value = this.originalModalData.imageContent;
            if (modalPublic) modalPublic.checked = this.originalModalData.isPublic;
            if (modalPublicStatus) modalPublicStatus.textContent = this.originalModalData.isPublic ? '공개' : '비공개';
            
            // 날짜와 위치도 원본으로 복원
            if (this.originalModalData.imageDate && modalDateBox) {
                modalDateBox.value = this.formatDate(this.originalModalData.imageDate);
            }
            if (this.originalModalData.locationName && modalLocationBox) {
                modalLocationBox.value = this.originalModalData.locationName;
            }
            
            // 태그도 원본으로 복원
            this.restoreOriginalTags();
        }
        
        // 입력 필드들을 읽기 전용으로 변경
        const modalDescription = document.getElementById('modalDescription');
        if (modalDescription) {
            modalDescription.readOnly = true;
        }
        
        // 공개 설정 UI 변경
        const modalPublicStatus = document.getElementById('modalPublicStatus');
        const modalPublicCheckboxArea = document.getElementById('modalPublicCheckboxArea');
        
        if (modalPublicStatus) modalPublicStatus.style.display = 'block';
        if (modalPublicCheckboxArea) modalPublicCheckboxArea.style.display = 'none';
        
        // 태그 편집 모드 비활성화
        this.disableTagEditMode();
        
        // 날짜 피커 읽기 모드 비활성화
        if (this.modalDatePicker) {
            this.modalDatePicker.set('clickOpens', false);
            this.modalDatePicker.set('allowInput', false);
        }
        
        // 버튼 가시성 업데이트
        this.updateModalButtonsVisibility();
        this.updateLocationDateEditButtons();
        
        // 모달 위치 데이터 리셋
        this.resetModalMapPickerVariations();
    }
    
    // 모달 버튼 가시성 업데이트
    updateModalButtonsVisibility() {
        const modalEditBtn = document.getElementById('modalEditBtn');
        const modalDeleteBtn = document.getElementById('modalDeleteBtn');
        const modalCancelEditBtn = document.getElementById('modalCancelEditBtn');
        const modalSaveBtn = document.getElementById('modalSaveBtn');
        
        if (this.isEditMode) {
            // 편집 모드: 삭제, 수정 취소, 저장 버튼 표시
            if (modalEditBtn) modalEditBtn.style.display = 'none';
            if (modalDeleteBtn) modalDeleteBtn.style.display = 'inline-block';
            if (modalCancelEditBtn) modalCancelEditBtn.style.display = 'inline-block';
            if (modalSaveBtn) modalSaveBtn.style.display = 'inline-block';
        } else {
            // 읽기 모드: 수정 버튼만 표시
            if (modalEditBtn) modalEditBtn.style.display = 'inline-block';
            if (modalDeleteBtn) modalDeleteBtn.style.display = 'none';
            if (modalCancelEditBtn) modalCancelEditBtn.style.display = 'none';
            if (modalSaveBtn) modalSaveBtn.style.display = 'none';
        }
    }
    
    // 이미지 변경사항 저장
    async saveImageChanges() {
        const modalEditBtn = document.getElementById('modalEditBtn');
        const imageId = modalEditBtn?.dataset.imageId;
        
        if (!imageId) {
            console.error('Image ID not found');
            return;
        }
        
        // 현재 모달 데이터 수집
        const updateData = this.collectUpdateData();
        
        // 변경사항이 없으면 저장하지 않음
        if (Object.keys(updateData).length === 0) {
            console.log('No changes detected, skipping save');
            this.cancelEditMode();
            return;
        }
        
        try {
            const response = await fetch(`/api/images/${imageId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(updateData)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to update image: ${response.status}`);
            }
            
            // 성공적으로 업데이트됨
            console.log('Image updated successfully');
            
            // 원본 데이터 업데이트
            this.updateOriginalModalData(updateData);
            
            // 편집 모드 해제
            this.cancelEditMode();
            
            // 관련 데이터 새로고침
            await this.refreshRelatedData(updateData, imageId);
            
        } catch (error) {
            console.error('Error updating image:', error);
            alert('이미지 업데이트 중 오류가 발생했습니다.');
        }
    }
    
    // 업데이트 데이터 수집
    collectUpdateData() {
        const modalDescription = document.getElementById('modalDescription');
        const modalPublic = document.getElementById('modalPublic');
        const modalLocationBox = document.getElementById('modalLocationBox');
        const modalDateBox = document.getElementById('modalDateBox');
        
        const updateData = {};
        
        // 설명 변경 체크
        if (modalDescription && this.originalModalData.imageContent !== modalDescription.value) {
            updateData.imageContent = modalDescription.value;
        }
        
        // 공개 설정 변경 체크
        if (modalPublic) {
            const newIsPublic = modalPublic.checked ? 1 : 0;
            if (this.originalModalData.isPublic !== newIsPublic) {
                updateData.isPublic = newIsPublic;
            }
        }
        
        // 위치 변경 체크
        if (this.modalFoundLocationData.locationName && this.modalFoundLocationData.locationName !== "") {
            updateData.longitude = this.modalFoundLocationData.longitude;
            updateData.latitude = this.modalFoundLocationData.latitude;
            updateData.sdName = this.modalFoundLocationData.sdName;
            updateData.sggName = this.modalFoundLocationData.sggName;
        }
        
        // 날짜 변경 체크
        if (modalDateBox && modalDateBox.value) {
            const newFormattedDate = this.formatDateForAPI(modalDateBox.value);
            if (this.originalModalData.imageDate !== newFormattedDate) {
                updateData.imageDate = newFormattedDate;
            }
        }
        
        // 태그 변경 체크
        const tagChanges = this.getTagChanges();
        if (tagChanges.tagsToRemove.length > 0) {
            updateData.tagsToRemove = tagChanges.tagsToRemove;
        }
        if (tagChanges.tagsToAdd.length > 0) {
            updateData.tagsToAdd = tagChanges.tagsToAdd;
        }
        
        return updateData;
    }
    
    // 원본 데이터 업데이트
    updateOriginalModalData(updateData) {
        if (updateData.imageContent !== undefined) {
            this.originalModalData.imageContent = updateData.imageContent;
        }
        if (updateData.isPublic !== undefined) {
            this.originalModalData.isPublic = updateData.isPublic;
        }
        if (updateData.imageDate) {
            this.originalModalData.imageDate = updateData.imageDate;
        }
    }
    
    // 관련 데이터 새로고침
    async refreshRelatedData(updateData, imageId) {
        // 위치나 날짜 정보가 변경된 경우
        if (updateData.longitude !== undefined || updateData.latitude !== undefined || updateData.imageDate !== undefined) {
            if (this.imageManager) {
                this.imageManager.refreshCurrentImageList(
                    this.mapManager?.currentView, 
                    this.mapManager?.currentSigunguId, 
                    this.mapManager?.currentSidoId
                );
            }
            if (this.mapManager) {
                this.mapManager.refreshMapColors();
                await this.mapManager.refreshUserStats();
            }
            await this.refreshCurrentModalImageData(imageId);
        }
        
        // 태그가 변경된 경우
        if (updateData.tagsToRemove !== undefined) {
            await this.refreshCurrentModalImageData(imageId);
        }
        
        // 위치 데이터 리셋
        this.resetModalMapPickerVariations();
    }
    
    // 이미지 삭제
    async deleteImage() {
        const modalEditBtn = document.getElementById('modalEditBtn');
        const imageId = modalEditBtn?.dataset.imageId;
        
        if (!imageId) {
            console.error('Image ID not found');
            return;
        }
        
        // 삭제 확인
        if (!confirm('정말로 이 이미지를 삭제하시겠습니까?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/images/${imageId}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`Failed to delete image: ${response.status}`);
            }
            
            // 성공적으로 삭제됨
            console.log('Image deleted successfully');
            
            // 모달 닫기
            this.hideModal();
            
            // 이미지 목록 새로고침
            if (this.imageManager) {
                this.imageManager.refreshCurrentImageList(
                    this.mapManager?.currentView,
                    this.mapManager?.currentSigunguId,
                    this.mapManager?.currentSidoId
                );
            }
            
            // 지도 색상 새로고침
            if (this.mapManager) {
                this.mapManager.refreshMapColors();
                await this.mapManager.refreshUserStats();
            }
            
        } catch (error) {
            console.error('Error deleting image:', error);
            alert('이미지 삭제 중 오류가 발생했습니다.');
        }
    }
    
    // 날짜 포맷 함수들
    formatDate(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }
    
    formatDateForFlatpickr(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            return `${year} / ${month} / ${day}`;
        } catch (error) {
            console.error('Error formatting date for flatpickr:', error);
            return dateString;
        }
    }
    
    formatDateForAPI(dateString) {
        if (!dateString) return null;
        
        try {
            const parts = dateString.split(' / ');
            if (parts.length === 3) {
                const year = parts[0];
                const month = parts[1].padStart(2, '0');
                const day = parts[2].padStart(2, '0');
                return `${year}-${month}-${day}T12:00:00`;
            }
            return dateString;
        } catch (error) {
            console.error('Error formatting date for API:', error);
            return dateString;
        }
    }
    
    // 날짜 피커 초기화
    initModalDatePicker() {
        if (typeof flatpickr === 'undefined') {
            console.warn('Flatpickr not loaded');
            return;
        }
        
        const modalDateBox = document.getElementById('modalDateBox');
        if (!modalDateBox) return;
        
        // 기존 인스턴스가 있다면 제거
        if (this.modalDatePicker) {
            this.modalDatePicker.destroy();
        }
        
        this.modalDatePicker = flatpickr(modalDateBox, {
            dateFormat: "Y / m / d",
            maxDate: "today",
            locale: "ko",
            clickOpens: false,
            allowInput: false,
            onClose: async (selectedDates, dateStr) => {
                if (dateStr && this.isEditMode) {
                    await this.updateSeasonalTagsInModal(dateStr);
                }
            }
        });
        
        // 편집 날짜 버튼 클릭 이벤트
        const modalEditDateBtn = document.getElementById('modalEditDateBtn');
        if (modalEditDateBtn) {
            modalEditDateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.isEditMode && this.modalDatePicker) {
                    this.modalDatePicker.open();
                }
            });
        }
    }
    
    // 모달 맵 픽커 초기화
    initModalMapPicker() {
        const modalEditLocationBtn = document.getElementById('modalEditLocationBtn');
        if (!modalEditLocationBtn) return;
        
        modalEditLocationBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.isEditMode) {
                this.showModalMapPicker();
            }
        });
        
        this.setupMapPickerIntegration();
    }
    
    // MapPickerModal.js와의 통합 설정
    setupMapPickerIntegration() {
        const modalMapPickerModal = document.getElementById('modalMapPickerModal');
        if (!modalMapPickerModal) return;
        
        const mapPickSubmitBtn = modalMapPickerModal.querySelector('#mapPickSubmitBtn');
        const cancelMapPickBtn = modalMapPickerModal.querySelector('#cancelMapPickBtn');
        
        if (mapPickSubmitBtn) {
            mapPickSubmitBtn.replaceWith(mapPickSubmitBtn.cloneNode(true));
            const newSubmitBtn = modalMapPickerModal.querySelector('#mapPickSubmitBtn');
            
            newSubmitBtn.addEventListener('click', () => {
                if (window.foundLocationData && window.foundLocationData.locationName) {
                    const modalLocationBox = document.getElementById('modalLocationBox');
                    if (modalLocationBox) {
                        modalLocationBox.value = window.foundLocationData.locationName;
                        modalLocationBox.classList.remove('invalid');
                        modalLocationBox.classList.add('valid');
                    }
                    
                    this.modalFoundLocationData = {
                        latitude: window.foundLocationData.latitude,
                        longitude: window.foundLocationData.longitude,
                        sdName: window.foundLocationData.sdName,
                        sggName: window.foundLocationData.sggName,
                        locationName: window.foundLocationData.locationName
                    };
                    
                    if (window.foundLocationData.tags && Array.isArray(window.foundLocationData.tags)) {
                        this.updateModalTagsFromLocationChange(window.foundLocationData.tags);
                    }
                }
                
                this.hideModalMapPicker();
            });
        }
        
        if (cancelMapPickBtn) {
            cancelMapPickBtn.replaceWith(cancelMapPickBtn.cloneNode(true));
            const newCancelBtn = modalMapPickerModal.querySelector('#cancelMapPickBtn');
            
            newCancelBtn.addEventListener('click', () => {
                this.hideModalMapPicker();
            });
        }
    }
    
    // 모달 맵 픽커 표시
    showModalMapPicker() {
        const modalMapPickerModal = document.getElementById('modalMapPickerModal');
        if (modalMapPickerModal) {
            if (typeof window.resetMapInstance === 'function') {
                window.resetMapInstance();
            }
            
            modalMapPickerModal.classList.add('show');
            
            setTimeout(() => {
                if (typeof window.bindMapClickEvent === 'function') {
                    window.bindMapClickEvent();
                }
                
                if (this.originalModalData.latitude && this.originalModalData.longitude) {
                    const latitude = this.originalModalData.latitude;
                    const longitude = this.originalModalData.longitude;
                    const locationName = this.originalModalData.locationName || "현재 위치";
                    
                    setTimeout(() => {
                        if (window.showLocationOnMap) {
                            window.showLocationOnMap(latitude, longitude, locationName);
                        }
                        
                        setTimeout(() => {
                            if (typeof window.bindMapClickEvent === 'function') {
                                window.bindMapClickEvent();
                            }
                        }, 500);
                    }, 1000);
                } else {
                    setTimeout(() => {
                        if (typeof window.bindMapClickEvent === 'function') {
                            window.bindMapClickEvent();
                        }
                    }, 1000);
                }
            }, 500);
        }
    }
    
    // 모달 맵 픽커 숨기기
    hideModalMapPicker() {
        const modalMapPickerModal = document.getElementById('modalMapPickerModal');
        if (modalMapPickerModal) {
            modalMapPickerModal.classList.remove('show');
        }
    }
    
    // 지도에서 보기 버튼 초기화
    initViewOnMapButton() {
        const modalViewOnMapBtn = document.getElementById('modalViewOnMapBtn');
        if (modalViewOnMapBtn) {
            modalViewOnMapBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showImageLocationOnMap();
            });
        }
    }
    
    // 이미지 위치를 지도에 표시
    async showImageLocationOnMap() {
        const modalEditBtn = document.getElementById('modalEditBtn');
        const imageId = modalEditBtn?.dataset.imageId;
        
        if (!imageId) {
            console.error('Image ID not found');
            return;
        }
        
        try {
            const coords = await this.fetchImageCoordinates(imageId);
            
            if (coords && coords.latitude && coords.longitude) {
                const latitude = coords.latitude;
                const longitude = coords.longitude;
                const locationName = coords.locationName || `${coords.sdName || ''} ${coords.sggName || ''}`.trim() || '현재 위치';
                
                this.showModalMapPicker();
                
                setTimeout(() => {
                    if (window.showLocationOnMap) {
                        window.showLocationOnMap(latitude, longitude, locationName);
                    } else {
                        console.error('showLocationOnMap function not found');
                    }
                }, 500);
            } else {
                alert('이미지에 위치 정보가 없습니다.');
            }
        } catch (error) {
            console.error('Error fetching image coordinates:', error);
            alert('위치 정보를 가져올 수 없습니다.');
        }
    }
    
    // 이미지 좌표 정보 가져오기
    async fetchImageCoordinates(imageId) {
        try {
            const response = await fetch(`/api/images/${imageId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch image coordinates: ${response.status}`);
            }
            
            const responseData = await response.json();
            const imageData = responseData.data;
            
            return {
                latitude: imageData.latitude,
                longitude: imageData.longitude,
                locationName: `${imageData.sdName || ''} ${imageData.sggName || ''}`.trim(),
                sdName: imageData.sdName,
                sggName: imageData.sggName
            };
        } catch (error) {
            console.error('Error fetching image coordinates:', error);
            return null;
        }
    }
    
    // 태그 관리 메서드들
    enableTagEditMode() {
        const modalTagBox = document.getElementById('modalTagBox');
        if (!modalTagBox) return;
        
        // 모든 태그의 삭제 버튼 표시
        const deleteButtons = modalTagBox.querySelectorAll('.tag-delete');
        deleteButtons.forEach(button => {
            button.style.display = 'flex';
        });
        
        // 태그 추가 버튼 표시
        const tagAddButton = document.getElementById('modalTagAddButton');
        if (tagAddButton) {
            tagAddButton.style.display = 'block';
        }
    }
    
    disableTagEditMode() {
        const modalTagBox = document.getElementById('modalTagBox');
        if (!modalTagBox) return;
        
        // 모든 태그의 삭제 버튼 숨김
        const deleteButtons = modalTagBox.querySelectorAll('.tag-delete');
        deleteButtons.forEach(button => {
            button.style.display = 'none';
        });
        
        // 태그 추가 버튼과 입력 필드 숨김
        const tagAddButton = document.getElementById('modalTagAddButton');
        const tagInput = document.getElementById('modalTagInput');
        
        if (tagAddButton) {
            tagAddButton.style.display = 'none';
        }
        
        if (tagInput) {
            tagInput.style.display = 'none';
            tagInput.value = '';
        }
    }
    
    showTagInput() {
        const tagAddButton = document.getElementById('modalTagAddButton');
        const tagInput = document.getElementById('modalTagInput');
        
        if (tagAddButton && tagInput) {
            tagAddButton.style.display = 'none';
            tagInput.style.display = 'inline-block';
            tagInput.focus();
        }
    }
    
    hideTagInput() {
        const tagAddButton = document.getElementById('modalTagAddButton');
        const tagInput = document.getElementById('modalTagInput');
        
        if (tagAddButton && tagInput) {
            const tagName = tagInput.value.trim();
            if (tagName) {
                this.addCustomTag(tagName);
                tagInput.value = '';
            }
            tagInput.style.display = 'none';
            tagAddButton.style.display = 'block';
        }
    }
    
    handleTagInputKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.hideTagInput();
        } else if (e.key === 'Escape') {
            const tagInput = document.getElementById('modalTagInput');
            if (tagInput) {
                tagInput.value = '';
            }
            this.hideTagInput();
        }
    }
    
    addCustomTag(tagName) {
        if (!tagName || tagName.trim() === '') return;
        
        const modalTagBox = document.getElementById('modalTagBox');
        if (!modalTagBox) return;
        
        // 중복 태그 체크
        const existingTags = modalTagBox.querySelectorAll('.tag:not(#modalTagAddButton)');
        const isDuplicate = Array.from(existingTags).some(tag => 
            tag.textContent.replace('×', '').trim() === tagName.trim()
        );
        
        if (isDuplicate) {
            alert('이미 추가된 태그입니다.');
            return;
        }
        
        // 새 태그 요소 생성
        const tagElement = this.createTagElement({
            tagId: 'custom-' + Date.now(),
            tagName: tagName.trim()
        });
        
        // 삭제 버튼 표시 (편집 모드)
        const deleteButton = tagElement.querySelector('.tag-delete');
        if (deleteButton) {
            deleteButton.style.display = this.isEditMode ? 'flex' : 'none';
        }
        
        // 태그 추가 버튼 앞에 삽입
        const tagAddButton = document.getElementById('modalTagAddButton');
        modalTagBox.insertBefore(tagElement, tagAddButton);
    }
    
    restoreOriginalTags() {
        const modalTagBox = document.getElementById('modalTagBox');
        if (!modalTagBox || !this.originalModalData) return;
        
        // 기존 태그들 제거 (추가 버튼과 입력 필드는 유지)
        const existingTags = modalTagBox.querySelectorAll('.tag:not(#modalTagAddButton):not(#modalTagInput)');
        existingTags.forEach(tag => tag.remove());
        
        // 원본 태그들 다시 추가
        if (this.originalModalData.tags && this.originalModalData.tags.length > 0) {
            this.originalModalData.tags.forEach(tag => {
                const tagElement = this.createTagElement(tag);
                const tagAddButton = document.getElementById('modalTagAddButton');
                modalTagBox.insertBefore(tagElement, tagAddButton);
            });
        }
    }
    
    getTagChanges() {
        // 태그 변경사항을 분석하여 추가/삭제할 태그 목록 반환
        const modalTagBox = document.getElementById('modalTagBox');
        const tagsToRemove = [];
        const tagsToAdd = [];
        
        if (!modalTagBox || !this.originalModalData) {
            return { tagsToRemove, tagsToAdd };
        }
        
        // 현재 태그 목록 가져오기
        const currentTags = Array.from(modalTagBox.querySelectorAll('.tag:not(#modalTagAddButton):not(#modalTagInput)'))
            .map(tag => ({
                tagId: tag.dataset.tagId,
                tagName: tag.dataset.tagName
            }));
        
        // 삭제된 태그 찾기
        if (this.originalModalData.tags) {
            this.originalModalData.tags.forEach(originalTag => {
                const originalTagName = typeof originalTag === 'object' ? 
                    (originalTag.tagName || originalTag.name || originalTag) : originalTag;
                const originalTagId = typeof originalTag === 'object' ? originalTag.tagId : null;
                
                const stillExists = currentTags.some(currentTag => currentTag.tagName === originalTagName);
                if (!stillExists && originalTagId && !originalTagId.toString().startsWith('custom-') && 
                    !originalTagId.toString().startsWith('location-') && 
                    !originalTagId.toString().startsWith('season-')) {
                    tagsToRemove.push(parseInt(originalTagId));
                }
            });
        }
        
        // 추가된 태그 찾기
        currentTags.forEach(currentTag => {
            const wasOriginal = this.originalModalData.tags?.some(originalTag => {
                const originalTagName = typeof originalTag === 'object' ? 
                    (originalTag.tagName || originalTag.name || originalTag) : originalTag;
                return originalTagName === currentTag.tagName;
            });
            if (!wasOriginal && currentTag.tagName) {
                tagsToAdd.push(currentTag.tagName);
            }
        });
        
        return { tagsToRemove, tagsToAdd };
    }
    
    // 현재 모달의 이미지 데이터 새로고침
    async refreshCurrentModalImageData(imageId) {
        try {
            const response = await fetch(`/api/images/${imageId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch updated image data: ${response.status}`);
            }
            
            const responseData = await response.json();
            const updatedImageData = responseData.data;
            
            // 서버에서 태그가 비어있으면 현재 모달의 태그를 유지
            if (!updatedImageData.tags || updatedImageData.tags.length === 0) {
                console.log('Server returned empty tags, keeping current modal tags');
            } else {
                // 태그 정보만 업데이트
                this.updateModalTags(updatedImageData.tags);
                
                // 원본 데이터도 업데이트
                if (this.originalModalData) {
                    this.originalModalData.tags = updatedImageData.tags;
                }
            }
            
        } catch (error) {
            console.error('Error refreshing modal image data:', error);
        }
    }
    
    // 모달의 태그 정보만 업데이트
    updateModalTags(newTags) {
        const modalTagBox = document.getElementById('modalTagBox');
        if (!modalTagBox) return;
        
        // 기존 태그들 제거 (추가 버튼과 입력 필드는 유지)
        const existingTags = modalTagBox.querySelectorAll('.tag:not(#modalTagAddButton):not(#modalTagInput)');
        existingTags.forEach(tag => tag.remove());
        
        // 새로운 태그들 추가
        if (newTags && newTags.length > 0) {
            newTags.forEach(tag => {
                const tagElement = this.createTagElement(tag);
                const deleteButton = tagElement.querySelector('.tag-delete');
                if (deleteButton) {
                    deleteButton.style.display = 'none'; // 새로고침 후에는 편집 모드가 해제되므로 숨김
                }
                
                const tagAddButton = document.getElementById('modalTagAddButton');
                if (tagAddButton) {
                    modalTagBox.insertBefore(tagElement, tagAddButton);
                } else {
                    modalTagBox.appendChild(tagElement);
                }
            });
        }
    }
    
    // 위치 변경시 태그 실시간 업데이트
    async updateModalTagsFromLocationChange(newTags) {
        if (!this.isEditMode) return;
        
        const modalTagBox = document.getElementById('modalTagBox');
        const modalDateBox = document.getElementById('modalDateBox');
        if (!modalTagBox) return;
        
        // 현재 날짜 정보 가져오기
        const currentDate = modalDateBox ? modalDateBox.value : '';
        
        let seasonalTags = [];
        // 날짜 정보가 있으면 계절 태그도 함께 가져오기
        if (currentDate) {
            try {
                const response = await fetch("/api/tags/season", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    credentials: "include",
                    body: JSON.stringify({ date: currentDate })
                });
                
                if (response.ok) {
                    const tagsData = await response.json();
                    if (tagsData.code === 200 && Array.isArray(tagsData.data)) {
                        seasonalTags = tagsData.data;
                    }
                }
            } catch (error) {
                console.error('Error fetching seasonal tags during location change:', error);
            }
        }
        
        // 기존 커스텀 태그 보존
        const existingTags = modalTagBox.querySelectorAll('.tag:not(#modalTagAddButton):not(#modalTagInput)');
        const customTags = [];
        
        existingTags.forEach(tag => {
            const tagName = tag.dataset.tagName;
            const tagType = this.classifyTagType(tagName);
            
            // 커스텀 태그만 보존
            if (tagType === 'custom') {
                customTags.push({
                    tagId: tag.dataset.tagId,
                    tagName: tag.dataset.tagName
                });
            }
            tag.remove();
        });
        
        // 새로운 위치 기반 태그들 추가
        if (newTags && newTags.length > 0) {
            newTags.forEach(tag => {
                const tagElement = this.createTagElement({
                    tagId: (typeof tag === 'object' ? tag.tagId : null) || 'location-' + Date.now(),
                    tagName: typeof tag === 'object' ? (tag.tagName || tag.name || tag) : tag
                });
                
                const deleteButton = tagElement.querySelector('.tag-delete');
                if (deleteButton) {
                    deleteButton.style.display = this.isEditMode ? 'flex' : 'none';
                }
                
                const tagAddButton = document.getElementById('modalTagAddButton');
                modalTagBox.insertBefore(tagElement, tagAddButton);
            });
        }
        
        // 계절 태그들 추가
        if (seasonalTags && seasonalTags.length > 0) {
            seasonalTags.forEach(tag => {
                const tagElement = this.createTagElement({
                    tagId: (typeof tag === 'object' ? tag.tagId : null) || 'season-' + Date.now(),
                    tagName: typeof tag === 'object' ? (tag.tagName || tag.name || tag) : tag
                });
                
                const deleteButton = tagElement.querySelector('.tag-delete');
                if (deleteButton) {
                    deleteButton.style.display = this.isEditMode ? 'flex' : 'none';
                }
                
                const tagAddButton = document.getElementById('modalTagAddButton');
                modalTagBox.insertBefore(tagElement, tagAddButton);
            });
        }
        
        // 보존한 커스텀 태그들 다시 추가
        customTags.forEach(tag => {
            const tagElement = this.createTagElement(tag);
            const deleteButton = tagElement.querySelector('.tag-delete');
            if (deleteButton) {
                deleteButton.style.display = this.isEditMode ? 'flex' : 'none';
            }
            
            const tagAddButton = document.getElementById('modalTagAddButton');
            modalTagBox.insertBefore(tagElement, tagAddButton);
        });
    }
    
    // 모달에서 날짜 변경 시 계절 태그 업데이트
    async updateSeasonalTagsInModal(dateStr) {
        if (!this.isEditMode) return;
        
        const modalTagBox = document.getElementById('modalTagBox');
        if (!modalTagBox) return;
        
        try {
            const response = await fetch("/api/tags/season", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                credentials: "include",
                body: JSON.stringify({ date: dateStr })
            });
            
            if (response.ok) {
                const tagsData = await response.json();
                if (tagsData.code === 200 && Array.isArray(tagsData.data)) {
                    // 기존 위치태그 유지 (계절태그가 아닌 것들)
                    const existingLocationTags = [];
                    modalTagBox.querySelectorAll('.tag:not(#modalTagAddButton):not(#modalTagInput)').forEach(tag => {
                        const tagName = tag.dataset.tagName;
                        // 계절태그가 아닌 경우만 유지
                        if (tagName && !tagName.includes('봄') && !tagName.includes('여름') && 
                            !tagName.includes('가을') && !tagName.includes('겨울')) {
                            existingLocationTags.push({
                                tagId: tag.dataset.tagId,
                                tagName: tagName
                            });
                        }
                    });
                    
                    // 모든 기존 태그 제거
                    const existingTags = modalTagBox.querySelectorAll('.tag:not(#modalTagAddButton):not(#modalTagInput)');
                    existingTags.forEach(tag => tag.remove());
                    
                    // 기존 위치태그 다시 추가
                    existingLocationTags.forEach(tag => {
                        const tagElement = this.createTagElement(tag);
                        const deleteButton = tagElement.querySelector('.tag-delete');
                        if (deleteButton) {
                            deleteButton.style.display = this.isEditMode ? 'flex' : 'none';
                        }
                        
                        const tagAddButton = document.getElementById('modalTagAddButton');
                        modalTagBox.insertBefore(tagElement, tagAddButton);
                    });
                    
                    // 새로운 계절태그 추가
                    tagsData.data.forEach(tag => {
                        const tagElement = this.createTagElement({
                            tagId: (typeof tag === 'object' ? tag.tagId : null) || 'season-' + Date.now(),
                            tagName: typeof tag === 'object' ? (tag.tagName || tag.name || tag) : tag
                        });
                        
                        const deleteButton = tagElement.querySelector('.tag-delete');
                        if (deleteButton) {
                            deleteButton.style.display = this.isEditMode ? 'flex' : 'none';
                        }
                        
                        const tagAddButton = document.getElementById('modalTagAddButton');
                        modalTagBox.insertBefore(tagElement, tagAddButton);
                    });
                }
            }
        } catch (error) {
            console.error('Error updating seasonal tags in modal:', error);
        }
    }
    
    // 태그 분류 함수
    classifyTagType(tagName) {
        if (!tagName) return 'unknown';
        
        // 계절 태그
        if (tagName.includes('봄') || tagName.includes('여름') || tagName.includes('가을') || tagName.includes('겨울')) {
            return 'seasonal';
        }
        
        // 시도 태그
        if (tagName.includes('시') || tagName.includes('도') || tagName.includes('특별시') || 
            tagName.includes('광역시') || tagName.includes('특별자치시')) {
            return 'sido';
        }
        
        // 시군구 태그
        if (tagName.includes('군') || tagName.includes('구') || tagName.includes('시')) {
            return 'sigungu';
        }
        
        return 'custom';
    }
    
    // 편집 모드에서 위치/날짜 편집 버튼 표시/숨김
    updateLocationDateEditButtons() {
        const modalEditLocationBtn = document.getElementById('modalEditLocationBtn');
        const modalEditDateBtn = document.getElementById('modalEditDateBtn');
        
        if (modalEditLocationBtn) {
            modalEditLocationBtn.style.display = this.isEditMode ? 'inline' : 'none';
        }
        if (modalEditDateBtn) {
            modalEditDateBtn.style.display = this.isEditMode ? 'inline' : 'none';
        }
    }
    
    // 모달 맵 픽커 변수 초기화
    resetModalMapPickerVariations() {
        this.modalFoundLocationData = {longitude: 0, latitude: 0, sdName: "", sggName: "", locationName: ""};
        const modalMapPickResultForm = document.querySelector('#modalMapPickerModal #mapPickResultForm');
        const modalMapPickSubmitBtn = document.querySelector('#modalMapPickerModal #mapPickSubmitBtn');
        
        if (modalMapPickResultForm) {
            modalMapPickResultForm.value = "";
            modalMapPickResultForm.classList.remove("valid", "invalid");
        }
        if (modalMapPickSubmitBtn) {
            modalMapPickSubmitBtn.disabled = true;
        }
    }
    
    // 이미지 클릭 이벤트 바인딩
    bindImageClickEvents() {
        const modalImage = document.getElementById('modalImage');
        
        if (modalImage) {
            modalImage.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleImageFullscreen();
            });
        }
    }
    
    // 이미지 전체화면 토글
    toggleImageFullscreen() {
        const modalImage = document.getElementById('modalImage');
        if (!modalImage) return;
        
        if (modalImage.classList.contains('fullsize')) {
            // 썸네일로 복원
            modalImage.src = modalImage.dataset.thumbnailUrl || modalImage.dataset.originalUrl;
            modalImage.classList.remove('fullsize');
            modalImage.classList.add('thumbnail');
        } else {
            // 원본으로 변경
            modalImage.src = modalImage.dataset.originalUrl;
            modalImage.classList.remove('thumbnail');
            modalImage.classList.add('fullsize');
        }
    }
}
