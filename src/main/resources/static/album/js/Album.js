// ============================================================
// Album.js - 앨범 관리 모듈
// ============================================================

// DOM 엘리먼트 관련 상수들
const DOM = {
    albumGallery: document.getElementsByClassName('album-gallery')[0],
    albumDetailContainer: document.getElementsByClassName("album-detail-container")[0],
    albumImageContainer: document.querySelector('.album-image-container'),
    albumDetailGallery: document.getElementsByClassName('album-detail-gallery')[0],
    albumDetailTitle: document.querySelector('.album-detail-title'),
    albumDetailDescription: document.querySelector('.album-detail-description'),
    albumDetailPublic: document.querySelector('.album-detail-is-public'),
    albumDetailImageCount: document.querySelector('.album-detail-image-count'),
    closeBtn: document.getElementById("album-detail-close-btn"),
    editBtn: document.getElementById("album-edit-btn"),
    navButtons: document.querySelectorAll('.nav-btn')
};

// 상태 관리
const State = {
    currentAlbumId: null,
    isEditingMode: false,
    originalAlbumData: {}
};

// 상수 정의
const CONSTANTS = {
    IS_PUBLIC: {
        0: "비공개",
        1: "공개"
    }
};

// ============================================================
// API 서비스 모듈
// ============================================================
const ApiService = {
    // 내 앨범 목록 조회
    async fetchMyAlbums() {
        const response = await fetch("/api/albums/me", {
            method: "GET",
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    },

    // 앨범 상세 정보 조회
    async fetchAlbumDetail(albumId) {
        const response = await fetch(`/api/albums?albumId=${albumId}`, {
            method: "GET",
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    },

    // 앨범 정보 업데이트
    async updateAlbumInfo(albumId, albumTitle, albumDescription) {
        const response = await fetch("/api/albums", {
            method: "PATCH",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                albumId: albumId,
                albumTitle: albumTitle,
                albumDescription: albumDescription
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || `서버 오류 (${response.status})`;
            throw new Error(errorMessage);
        }

        return response.json();
    },

    // S3 URL을 Blob URL로 변환
    async convertS3UrlToBlobUrl(s3Url) {
        const response = await fetch(s3Url);
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    }
};

// ============================================================
// UI 업데이트 모듈
// ============================================================
const UiUpdater = {
    // 앨범 갤러리 렌더링
    renderAlbumGallery(albumList) {
        if (!DOM.albumGallery) return;

        DOM.albumGallery.innerHTML = '';

        albumList.forEach(album => {
            const albumCard = document.createElement('div');
            albumCard.className = 'album-card';
            albumCard.style.cursor = 'pointer'; // 클릭 가능함을 표시
            albumCard.dataset.albumId = album.albumId;
            albumCard.dataset.isPublic = album.isPublic;

            albumCard.innerHTML = `
                <a>
                    <img src="/images/default-image1.webp" alt="album-image">
                </a>
                <p class="card-album-title">${album.albumTitle}</p>
                <p class="text-muted card-album-image-count">항목 : ${album.albumImageCount} 장</p>
            `;

            // 앨범 카드 클릭 이벤트 추가
            albumCard.addEventListener('click', () => {
                const albumId = albumCard.dataset.albumId;
                EventHandlers.openAlbumDetail(albumId);
            });

            DOM.albumGallery.appendChild(albumCard);
        });

        Navigation.initAlbumNavigation();
    },

    // 앨범 상세 정보 업데이트
    updateAlbumDetailInfo(albumTitle, albumDescription, isPublic, imageCount) {
        DOM.albumDetailTitle.textContent = albumTitle;
        DOM.albumDetailDescription.textContent = albumDescription;
        DOM.albumDetailPublic.textContent = CONSTANTS.IS_PUBLIC[isPublic];
        DOM.albumDetailImageCount.textContent = `사진 ${imageCount}장`;
    },

    // 앨범 상세 갤러리 렌더링
    async renderAlbumDetailGallery(imageList) {
        if (!DOM.albumDetailGallery) return;

        DOM.albumDetailGallery.innerHTML = '';
        // let isFirstImage = true;

        for (const image of imageList) {
            const blobUrl = await ApiService.convertS3UrlToBlobUrl(image.imageUrl);
            if (blobUrl) {
                const galleryCard = this.createGalleryCard(image, blobUrl);
                DOM.albumDetailGallery.appendChild(galleryCard);

                // // 첫 번째 이미지 자동 선택
                // if (isFirstImage) {
                //     setTimeout(() => ImageViewer.showImageInMainView(galleryCard), 100);
                //     isFirstImage = false;
                // }
            }
        }
    },

    // 갤러리 카드 생성
    createGalleryCard(image, blobUrl) {
        const galleryCard = document.createElement('div');
        galleryCard.className = 'gallery-card';

        // 데이터셋 설정
        Object.assign(galleryCard.dataset, {
            imageId: image.imageId,
            userId: image.userId,
            imageRegDate: image.imageRegDate,
            sdName: image.sdName,
            sggName: image.sggName,
            latitude: image.latitude,
            longitude: image.longitude,
            imageName: image.imageName,
            imageContent: image.imageContent,
            imageDate: image.imageDate,
            isPublic: image.isPublic,
            imageUrl: blobUrl
        });

        galleryCard.innerHTML = `<img src="${blobUrl}" alt="${image.imageName}">`;
        
        // 클릭 이벤트 추가
        galleryCard.addEventListener('click', function() {
            ImageViewer.showImageInMainView(this);
        });

        return galleryCard;
    },

    // 알림 메시지 표시
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; padding: 12px 20px;
            border-radius: 6px; color: white; font-weight: 500; z-index: 5000;
            animation: slideInNotification 0.3s ease; max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;

        // 타입별 배경색 설정
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            info: '#007bff'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = message;

        // 애니메이션 스타일 추가
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInNotification {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // 3초 후 자동 제거
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideInNotification 0.3s ease reverse';
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 3000);
    }
};

// ============================================================
// 이미지 뷰어 모듈
// ============================================================
const ImageViewer = {
    // 메인 뷰에 이미지 표시
    showImageInMainView(galleryCard) {
        const imageUrl = galleryCard.dataset.imageUrl;
        const imageName = galleryCard.dataset.imageName;

        // 이전 선택 해제
        const previousSelected = document.querySelector('.gallery-card.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }

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

// ============================================================
// 편집 모듈
// ============================================================
const EditMode = {
    // 편집 모드 토글
    toggleEditMode() {
        if (!State.isEditingMode) {
            this.startEditMode();
        } else {
            this.cancelEdit();
        }
    },

    // 편집 모드 시작
    startEditMode() {
        State.isEditingMode = true;

        // 원본 데이터 저장
        State.originalAlbumData = {
            title: DOM.albumDetailTitle.textContent,
            description: DOM.albumDetailDescription.textContent
        };

        // 편집 가능하게 설정
        DOM.albumDetailTitle.contentEditable = true;
        DOM.albumDetailTitle.classList.add('editing');
        DOM.albumDetailTitle.focus();

        DOM.albumDetailDescription.contentEditable = true;
        DOM.albumDetailDescription.classList.add('editing');

        // 편집 컨트롤 추가
        this.addEditControls();

        // 키보드 이벤트 추가
        DOM.albumDetailTitle.addEventListener('keydown', this.handleEditKeydown);
        DOM.albumDetailDescription.addEventListener('keydown', this.handleEditKeydown);
    },

    // 편집 컨트롤 추가
    addEditControls() {
        const editControls = document.createElement('div');
        editControls.className = 'edit-controls';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'save-btn';
        saveBtn.textContent = '저장';
        saveBtn.addEventListener('click', () => this.saveEdit());

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'cancel-btn';
        cancelBtn.textContent = '취소';
        cancelBtn.addEventListener('click', () => this.cancelEdit());

        editControls.appendChild(saveBtn);
        editControls.appendChild(cancelBtn);

        // 기존 컨트롤 제거 후 추가
        const existingControls = document.querySelector('.edit-controls');
        if (existingControls) {
            existingControls.remove();
        }

        const albumDetailInfo = document.querySelector('.album-detail-info');
        albumDetailInfo.appendChild(editControls);
    },

    // 키보드 이벤트 처리
    handleEditKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            EditMode.saveEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            EditMode.cancelEdit();
        }
    },

    // 편집 저장
    async saveEdit() {
        const newTitle = DOM.albumDetailTitle.textContent.trim();
        const newDescription = DOM.albumDetailDescription.textContent.trim();

        if (!newTitle) {
            alert('앨범 제목은 비워둘 수 없습니다.');
            DOM.albumDetailTitle.focus();
            return;
        }

        if (!State.currentAlbumId) {
            UiUpdater.showNotification('앨범 ID를 찾을 수 없습니다.', 'error');
            return;
        }

        try {
            await ApiService.updateAlbumInfo(State.currentAlbumId, newTitle, newDescription);
            UiUpdater.showNotification('앨범 정보가 업데이트되었습니다.', 'success');
            this.endEditMode();
        } catch (error) {
            console.error('앨범 업데이트 중 오류:', error);
            UiUpdater.showNotification(`업데이트 실패: ${error.message}`, 'error');
        }
    },

    // 편집 취소
    cancelEdit() {
        DOM.albumDetailTitle.textContent = State.originalAlbumData.title;
        DOM.albumDetailDescription.textContent = State.originalAlbumData.description;
        this.endEditMode();
    },

    // 편집 모드 종료
    endEditMode() {
        State.isEditingMode = false;

        // 편집 가능 해제
        DOM.albumDetailTitle.contentEditable = false;
        DOM.albumDetailTitle.classList.remove('editing');
        DOM.albumDetailDescription.contentEditable = false;
        DOM.albumDetailDescription.classList.remove('editing');

        // 이벤트 리스너 제거
        DOM.albumDetailTitle.removeEventListener('keydown', this.handleEditKeydown);
        DOM.albumDetailDescription.removeEventListener('keydown', this.handleEditKeydown);

        // 편집 컨트롤 제거
        const editControls = document.querySelector('.edit-controls');
        if (editControls) {
            editControls.remove();
        }
    }
};

// ============================================================
// 내비게이션 모듈
// ============================================================
const Navigation = {
    // 앨범 내비게이션 초기화
    initAlbumNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');

        navButtons.forEach(button => {
            button.addEventListener('click', function() {
                // 이전 활성 버튼 해제
                navButtons.forEach(btn => btn.classList.remove('active'));
                
                // 현재 버튼 활성화
                this.classList.add('active');
                
                // 필터 적용
                const filter = this.dataset.filter;
                Navigation.filterAlbums(filter);
            });
        });
    },

    // 앨범 필터링
    filterAlbums(filter) {
        const albumCards = document.querySelectorAll('.album-card');

        albumCards.forEach(card => {
            const isPublic = card.dataset.isPublic;
            let shouldShow = false;

            switch(filter) {
                case 'all':
                    shouldShow = true;
                    break;
                case 'public':
                    shouldShow = isPublic === '1' || isPublic === 'true';
                    break;
                case 'private':
                    shouldShow = isPublic === '0' || isPublic === 'false';
                    break;
            }

            if (shouldShow) {
                card.style.display = 'block';
                card.style.animation = 'fadeIn 0.3s ease';
            } else {
                card.style.display = 'none';
            }
        });

        console.log(`${filter} 필터 적용됨`);
    }
};

// ============================================================
// 이벤트 핸들러 모듈
// ============================================================
const EventHandlers = {
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

            if (actualData.albumCount <= 0) {
                console.log("앨범 없음");
                alert("앨범이 없습니다! 앨범을 만드세요!");
            } else {
                UiUpdater.renderAlbumGallery(actualData.albumList);
            }
        } catch (error) {
            console.error('앨범 조회 중 오류 발생:', error);
            alert('앨범을 불러오는 중 오류가 발생했습니다: ' + error.message);
        }
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
                imageCount: actualData.imageCount,
                imageList: actualData.imageList
            };

            console.log(parsedData);

            UiUpdater.updateAlbumDetailInfo(
                parsedData.albumTitle,
                parsedData.albumDescription,
                parsedData.isPublic,
                parsedData.imageCount
            );

            if (parsedData.imageCount > 0) {
                await UiUpdater.renderAlbumDetailGallery(parsedData.imageList);
            }
        } catch (error) {
            console.error("앨범 상세 정보 조회 실패:", error);
            throw error; // 에러를 다시 던져서 상위에서 처리할 수 있도록
        }
    },

    // 모달 상태 초기화
    resetModalState() {
        console.log("모달 상태 초기화 시작");
        
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

        // 상태 변수 초기화
        State.currentAlbumId = null;
        State.originalAlbumData = {};

        console.log("모달 상태 초기화 완료");
    },

    // 모달 닫기
    closeModal() {
        console.log("닫기 버튼 클릭");
        
        // 모달 숨기기
        DOM.albumDetailContainer.style.display = "none";
        
        // 모달 상태 초기화
        this.resetModalState();
    }
};

// ============================================================
// 초기화 함수
// ============================================================
function initialize() {
    console.log("Album.js 로드 완료");

    // 이벤트 리스너 등록
    if (DOM.closeBtn) {
        DOM.closeBtn.addEventListener("click", EventHandlers.closeModal);
    }

    if (DOM.editBtn) {
        DOM.editBtn.addEventListener("click", function(e) {
            e.preventDefault();
            EditMode.toggleEditMode();
        });
    }

    // 초기 데이터 로드
    EventHandlers.loadAlbumList();
    // EventHandlers.loadAlbumDetail(1); // 제거: 이제 카드 클릭으로만 로드
}

// DOM이 로드된 후 초기화
document.addEventListener("DOMContentLoaded", initialize);
