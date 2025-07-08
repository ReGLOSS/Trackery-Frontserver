// ============================================================
// eventHandlers.js - 이벤트 핸들러 모듈
// ============================================================

import { DOM, State, CONSTANTS } from './constants.js';
import { ApiService } from './apiService.js';
import { UiUpdater } from './uiUpdater.js';
import { ImageViewer } from './imageViewer.js';
import { EditMode } from './editMode.js';
import { ImageEditMode } from './imageEditMode.js';
import { Navigation } from './navigation.js';

export const EventHandlers = {
    // 앨범 생성 모달 열기
    openAlbumCreateModal() {
        console.log("앨범 생성 모달 열기");
        
        // 상태 초기화
        State.isCreatingMode = true;
        State.currentAlbumId = null;
        
        // 모달 기본 정보 설정
        DOM.albumDetailTitle.textContent = '앨범 제목';
        DOM.albumDetailDescription.textContent = '앨범 설명';
        DOM.albumDetailPublic.textContent = '비공개';
        DOM.albumDetailImageCount.textContent = '사진 0장';
        
        // 이미지 컨테이너 초기화
        DOM.albumImageContainer.innerHTML = '';
        DOM.albumDetailGallery.innerHTML = '';
        
        // 이미지 편집 버튼 숨기기 (생성 모드에서는 불필요)
        DOM.imageEditBtn.style.display = 'none';
        
        // 모달 표시
        DOM.albumDetailContainer.style.display = "flex";
        
        // 바로 편집 모드로 진입
        EditMode.startEditMode();
        
        UiUpdater.showNotification('새 앨범을 생성합니다.', 'info');
    },

    // 앨범 목록 로드
    async loadAlbumList() {
        try {
            const apiResponse = await ApiService.fetchMyAlbums();
            const actualData = apiResponse.data;

            if (!actualData) {
                console.error("응답에서 'data' 필드를 찾을 수 없습니다.", apiResponse);
                alert("앨범 데이터를 올바르게 가져오지 못했습니다.");
                return;
            }

            if (actualData.albumCount === null) {
                alert("앨범 개수 정보가 올바르지 않습니다.");
                return;
            }

            // UI 업데이트 로직
            if (actualData.albumCount === 0) {
                DOM.noAlbumContainer.style.display = 'flex';
                DOM.albumExistsContainer.style.display = 'none';
                console.log("앨범 없음");
            } else {
                DOM.noAlbumContainer.style.display = 'none';
                DOM.albumExistsContainer.style.display = 'flex';
                UiUpdater.renderAlbumGallery(actualData.albumList);
                
                // 앨범 카드 클릭 이벤트 추가
                this.addAlbumCardClickEvents();
                
                // 내비게이션 초기화
                Navigation.initAlbumNavigation();
            }
        } catch (error) {
            console.error('앨범 조회 중 오류 발생:', error);
            alert('앨범을 불러오는 중 오류가 발생했습니다: ' + error.message);
        }
    },

    // 앨범 카드 클릭 이벤트 추가
    addAlbumCardClickEvents() {
        const albumCards = document.querySelectorAll('.album-card');
        albumCards.forEach(albumCard => {
            albumCard.addEventListener('click', () => {
                const albumId = albumCard.dataset.albumId;
                this.openAlbumDetail(albumId);
            });
        });
    },

    // 앨범 상세 모달 열기
    async openAlbumDetail(albumId) {
        try {
            // 로딩 인디케이터 표시 (선택사항)
            UiUpdater.showNotification(`앨범 ${albumId} 로딩 중...`, 'info');
            
            // 먼저 모든 데이터 로드
            await this.loadAlbumDetail(albumId);
            
            // 데이터 로드 완료 후 모달 표시
            DOM.albumDetailContainer.style.display = "flex";
            
            console.log(`앨범 ${albumId} 로드 완료`);
        } catch (error) {
            console.error("앨범 상세 모달 열기 실패:", error);
            UiUpdater.showNotification("앨범을 불러오는 중 오류가 발생했습니다.", 'error');
        }
    },

    // 앨범 상세 정보 로드
    async loadAlbumDetail(albumId) {
        try {
            // 새 앨범 로드 전 이전 데이터 초기화
            const albumImageContainer = document.querySelector('.album-image-container');
            const albumDetailGallery = document.querySelector('.album-detail-gallery');
            
            if (albumImageContainer) {
                albumImageContainer.innerHTML = '';
            }
            if (albumDetailGallery) {
                albumDetailGallery.innerHTML = '';
            }
            
            State.currentAlbumId = albumId;

            const response = await ApiService.fetchAlbumDetail(albumId);
            const actualData = response.data;

            const parsedData = {
                albumTitle: actualData.albumTitle,
                albumDescription: actualData.albumDescription,
                isPublic: actualData.isPublic,
                imageCount: actualData.imageCount
            };

            console.log(parsedData);

            UiUpdater.updateAlbumDetailInfo(
                parsedData.albumTitle,
                parsedData.albumDescription,
                parsedData.isPublic,
                parsedData.imageCount
            );

            if (parsedData.imageCount > 0) {
                const imageApiResponse = await ApiService.fetchAlbumImages(albumId);
                console.log(imageApiResponse);
                const imageList = imageApiResponse.data.list;
                const paginationData = imageApiResponse.data;
                
                await UiUpdater.renderAlbumDetailGallery(imageList);
                UiUpdater.renderAlbumImagesPagination(paginationData);
                
                // 갤러리 카드 클릭 이벤트 추가 (이미지 뷰어 연결은 외부에서 처리)
                this.addGalleryCardClickEvents();
                
                // 페이지네이션 클릭 이벤트 추가
                this.addPaginationClickEvents();
            }
        } catch (error) {
            console.error("앨범 상세 정보 조회 실패:", error);
            throw error; // 에러를 다시 던져서 상위에서 처리할 수 있도록
        }
    },

    // 갤러리 카드 클릭 이벤트 추가 (이벤트 위임 방식)
    addGalleryCardClickEvents() {
        // 기존 이벤트 리스너 제거 (중복 방지)
        document.removeEventListener('click', this.handleGalleryCardClick);
        
        // 이벤트 위임으로 갤러리 카드 클릭 처리
        document.addEventListener('click', this.handleGalleryCardClick);
    },

    // 갤러리 카드 클릭 핸들러
    handleGalleryCardClick(e) {
        const card = e.target.closest('.gallery-card, .my-image-card');
        
        if (card && !e.target.closest('.image-checkbox')) {
            ImageViewer.showImageInMainView(card);
        }
    },

    // 모달 상태 초기화
    resetModalState() {
        console.log("모달 상태 초기화 시작");
        
        // 페이지네이션 이벤트 리스너 제거
        this.removePaginationClickEvents();
        
        // 이미지 편집 모드가 활성화되어 있다면 종료
        if (State.isImageEditingMode) {
            ImageEditMode.endImageEditMode();
        }
        
        // 앨범 이미지 컨테이너 초기화
        const albumImageContainer = document.querySelector('.album-image-container');
        if (albumImageContainer) {
            albumImageContainer.innerHTML = '';
            console.log("메인 이미지 컨테이너 초기화");
        }

        // 앨범 상세 갤러리 초기화
        const albumDetailGallery = document.querySelector('.album-detail-gallery');
        if (albumDetailGallery) {
            albumDetailGallery.innerHTML = '';
            console.log("상세 갤러리 초기화");
        }

        // 내 이미지 갤러리 초기화
        const albumDetailEditMyImagesGallery = document.querySelector('.album-detail-edit-image-my-images-gallery');
        if (albumDetailEditMyImagesGallery) {
            albumDetailEditMyImagesGallery.innerHTML = '';
            console.log("내 이미지 갤러리 초기화");
        }

        // 페이지네이션 컨테이너 초기화
        const albumImagesPagination = document.querySelector('.album-images-page-num');
        const myImagesPagination = document.querySelector('.my-images-page-num');
        if (albumImagesPagination) {
            albumImagesPagination.innerHTML = '';
            console.log("앨범 이미지 페이지네이션 초기화");
        }
        if (myImagesPagination) {
            myImagesPagination.innerHTML = '';
            console.log("내 이미지 페이지네이션 초기화");
        }

        // 앨범 정보 초기화
        const albumDetailTitle = document.querySelector('.album-detail-title');
        const albumDetailDescription = document.querySelector('.album-detail-description');
        const albumDetailPublic = document.querySelector('.album-detail-is-public');
        const albumDetailImageCount = document.querySelector('.album-detail-image-count');
        
        if (albumDetailTitle) {
            albumDetailTitle.textContent = '앨범 제목';
        }
        if (albumDetailDescription) {
            albumDetailDescription.textContent = '앨범 설명';
        }
        if (albumDetailPublic) {
            albumDetailPublic.textContent = '공개 앨범';
        }
        if (albumDetailImageCount) {
            albumDetailImageCount.textContent = '사진 매수';
        }

        // 편집 모드가 활성화되어 있다면 종료
        if (State.isEditingMode) {
            EditMode.endEditMode();
        }

        // 이미지 편집 버튼 다시 보이기
        if (DOM.imageEditBtn) {
            DOM.imageEditBtn.style.display = 'block';
        }

        // 상태 변수 초기화
        State.currentAlbumId = null;
        State.originalAlbumData = {};
        State.selectedImages.clear();
        State.isCreatingMode = false;

        console.log("모달 상태 초기화 완료");
    },

    // 모달 닫기
    closeModal() {
        console.log("닫기 버튼 클릭");
        
        // 모달 숨기기
        DOM.albumDetailContainer.style.display = "none";
        
        // 모달 상태 초기화
        this.resetModalState();
    },

    //앨범 공개 상태 편집
    async changeAlbumPublicStatus() {
        try {
            if (!State.currentAlbumId) {
                UiUpdater.showNotification('앨범 ID를 찾을 수 없습니다.', 'error');
                return;
            }

            const currentAlbum = DOM.albumGallery.querySelector(`[data-album-id="${State.currentAlbumId}"]`);
            if (!currentAlbum) {
                UiUpdater.showNotification('앨범 정보를 찾을 수 없습니다.', 'error');
                return;
            }

            const currentIsPublic = parseInt(currentAlbum.dataset.isPublic, 10);
            const newIsPublic = currentIsPublic === 0 ? 1 : 0;

            UiUpdater.showNotification('공개 상태를 변경하는 중...', 'info');

            await ApiService.updateAlbumPublic(State.currentAlbumId, newIsPublic);

            currentAlbum.dataset.isPublic = newIsPublic.toString();
            DOM.albumDetailPublic.textContent = CONSTANTS.IS_PUBLIC[newIsPublic];

            const statusText = newIsPublic === 1 ? '공개' : '비공개';
            UiUpdater.showNotification(`앨범이 ${statusText}로 변경되었습니다.`, 'success');

            const activeNavBtn = document.querySelector('.nav-btn.active');
            if (activeNavBtn) {
                const currentFilter = activeNavBtn.dataset.filter;
                Navigation.filterAlbums(currentFilter);
            }

        } catch (error) {
            console.error('앨범 공개 상태 변경 중 오류:', error);
            UiUpdater.showNotification(`공개 상태 변경 실패: ${error.message}`, 'error');
        }
    },

    // 앨범 삭제
    async deleteAlbum() {
        try {
            if (!State.currentAlbumId) {
                UiUpdater.showNotification('앨범 ID를 찾을 수 없습니다.', 'error');
                return;
            }

            // 삭제 확인 모달 표시
            const albumTitle = DOM.albumDetailTitle.textContent;
            const title = '앨범 삭제 확인';
            const message = `정말로 "${albumTitle}" 앨범을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`;
            
            const confirmed = await UiUpdater.showConfirmModal(
                title,
                message,
                () => console.log('삭제 확인'),
                () => console.log('삭제 취소')
            );

            if (!confirmed) {
                UiUpdater.showNotification('앨범 삭제가 취소되었습니다.', 'info');
                return;
            }

            // 삭제 진행
            UiUpdater.showNotification('앨범을 삭제하는 중...', 'info');

            await ApiService.deleteAlbum(State.currentAlbumId);

            UiUpdater.showNotification('앨범이 성공적으로 삭제되었습니다.', 'success');

            // 모달 닫기
            this.closeModal();

            // 앨범 목록 새로고침
            await this.loadAlbumList();

        } catch (error) {
            console.error('앨범 삭제 중 오류:', error);
            UiUpdater.showNotification(`앨범 삭제 실패: ${error.message}`, 'error');
        }
    },

    // 페이지네이션 클릭 이벤트 추가
    addPaginationClickEvents() {
        // 기존 이벤트 리스너 제거 (중복 방지)
        this.removePaginationClickEvents();

        // 앨범 이미지 페이지네이션
        const albumPagination = document.querySelector('.album-images-page-num .pagination');
        if (albumPagination) {
            albumPagination.addEventListener('click', this.handleAlbumPaginationClick);
            console.log('앨범 이미지 페이지네이션 이벤트 등록');
        }

        // 내 이미지 페이지네이션
        const myImagesPagination = document.querySelector('.my-images-page-num .pagination');
        if (myImagesPagination) {
            myImagesPagination.addEventListener('click', this.handleMyImagesPaginationClick);
            console.log('내 이미지 페이지네이션 이벤트 등록');
        }
    },

    // 페이지네이션 이벤트 리스너 제거
    removePaginationClickEvents() {
        const albumPagination = document.querySelector('.album-images-page-num .pagination');
        if (albumPagination) {
            albumPagination.removeEventListener('click', this.handleAlbumPaginationClick);
        }

        const myImagesPagination = document.querySelector('.my-images-page-num .pagination');
        if (myImagesPagination) {
            myImagesPagination.removeEventListener('click', this.handleMyImagesPaginationClick);
        }
    },

    // 앨범 페이지네이션 클릭 핸들러
    handleAlbumPaginationClick: (e) => {
        e.preventDefault();
        const link = e.target.closest('.page-link');
        if (link && !link.closest('.disabled')) {
            const page = parseInt(link.dataset.page);
            if (page > 0) {
                console.log(`앨범 이미지 페이지 ${page} 로드 요청`);
                EventHandlers.loadAlbumImagesPage(page);
            }
        }
    },

    // 내 이미지 페이지네이션 클릭 핸들러
    handleMyImagesPaginationClick: (e) => {
        e.preventDefault();
        const link = e.target.closest('.page-link');
        if (link && !link.closest('.disabled')) {
            const page = parseInt(link.dataset.page);
            if (page > 0) {
                console.log(`내 이미지 페이지 ${page} 로드 요청`);
                EventHandlers.loadMyImagesPage(page);
            }
        }
    },

    // 앨범 이미지 페이지 로드
    async loadAlbumImagesPage(pageNum) {
        try {
            if (!State.currentAlbumId) return;

            console.log(`앨범 이미지 페이지 ${pageNum} 로드 시작`);
            UiUpdater.showNotification(`${pageNum}페이지 로딩 중...`, 'info');

            const imageApiResponse = await ApiService.fetchAlbumImages(State.currentAlbumId, pageNum);
            const imageList = imageApiResponse.data.list;
            const paginationData = imageApiResponse.data;

            console.log(`앨범 이미지 API 응답: ${imageList.length}개 이미지 받음`);

            await UiUpdater.renderAlbumDetailGallery(imageList);
            UiUpdater.renderAlbumImagesPagination(paginationData);

            // 이미지 편집 모드가 활성화되어 있다면 체크박스 다시 추가
            if (State.isImageEditingMode) {
                // 렌더링 완료 후 체크박스 추가
                setTimeout(() => {
                    ImageEditMode.addCheckboxesToGallery('.gallery-card');
                    console.log('앨범 이미지 편집 모드용 체크박스 추가 완료');
                }, 100);
            }

            // 갤러리 카드 클릭 이벤트 다시 추가
            this.addGalleryCardClickEvents();
            this.addPaginationClickEvents();

            console.log(`앨범 이미지 페이지 ${pageNum} 로드 완료`);

        } catch (error) {
            console.error('앨범 이미지 페이지 로드 실패:', error);
            UiUpdater.showNotification('페이지 로드 실패', 'error');
        }
    },

    // 내 이미지 페이지 로드
    async loadMyImagesPage(pageNum) {
        try {
            if (!State.currentAlbumId) {
                UiUpdater.showNotification('앨범 ID를 찾을 수 없습니다.', 'error');
                return;
            }

            console.log(`내 이미지 페이지 ${pageNum} 로드 시작`);
            UiUpdater.showNotification(`${pageNum}페이지 로딩 중...`, 'info');

            // 현재 앨범에 있는 이미지를 제외하고 조회
            const response = await ApiService.fetchMyImages(pageNum, 5, State.currentAlbumId);
            const imageList = response.data.list;
            const paginationData = response.data;

            console.log(`API 응답: ${imageList.length}개 이미지 받음`);

            // 갤러리 렌더링 전에 잠시 대기 (비동기 충돌 방지)
            await new Promise(resolve => setTimeout(resolve, 50));

            await UiUpdater.renderMyImagesGallery(imageList);
            UiUpdater.renderMyImagesPagination(paginationData);

            // 이미지 편집 모드가 활성화되어 있다면 체크박스 다시 추가
            if (State.isImageEditingMode) {
                // 렌더링 완료 후 체크박스 추가
                setTimeout(() => {
                    ImageEditMode.addCheckboxesToGallery('.my-image-card');
                    console.log('이미지 편집 모드용 체크박스 추가 완료');
                }, 100);
            }

            // 갤러리 카드 클릭 이벤트 다시 추가 (기존 이벤트는 제거되지 않음)
            this.addGalleryCardClickEvents();
            
            // 페이지네이션 이벤트는 한 번만 등록되도록 수정됨
            this.addPaginationClickEvents();

            console.log(`내 이미지 페이지 ${pageNum} 로드 완료`);

        } catch (error) {
            console.error('내 이미지 페이지 로드 실패:', error);
            UiUpdater.showNotification('페이지 로드 실패', 'error');
        }
    }
};
