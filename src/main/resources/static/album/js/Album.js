// ============================================================
// Album.js - 앨범 관리 모듈
// ============================================================

// DOM 엘리먼트 관련 상수들
const DOM = {
    albumGallery: document.getElementsByClassName('album-gallery')[0],
    albumDetailContainer: document.getElementsByClassName("album-detail-container")[0],
    albumImageContainer: document.querySelector('.album-image-container'),
    albumDetailGallery: document.getElementsByClassName('album-detail-gallery')[0],
    albumDetailEditMyImagesGallery: document.getElementsByClassName('album-detail-edit-image-my-images-gallery')[0],
    myImagesSection: document.querySelector('.my-images-section'),
    albumImagesSection: document.querySelector('.album-images-section'),
    albumDetailTitle: document.querySelector('.album-detail-title'),
    albumDetailDescription: document.querySelector('.album-detail-description'),
    albumDetailPublic: document.querySelector('.album-detail-is-public'),
    albumDetailImageCount: document.querySelector('.album-detail-image-count'),
    closeBtn: document.getElementById("album-detail-close-btn"),
    editBtn: document.getElementById("album-edit-btn"),
    albumChangePublicBtn: document.getElementById("album-change-public-btn"),
    albumDeleteBtn: document.getElementById("album-delete-btn"),
    imageEditBtn: document.getElementById("album-image-edit-btn"),
    navButtons: document.querySelectorAll('.nav-btn'),
    smallAlbumCreateBtn: document.querySelector('.small-album-create-btn'),
    bigAlbumCreateBtn: document.querySelector('.big-album-create-btn'),
    noAlbumContainer: document.querySelector('.no-album-container'),
    albumExistsContainer: document.querySelector('.album-exists-container'),
};

// 상태 관리
const State = {
    currentAlbumId: null,
    isEditingMode: false,
    isImageEditingMode: false,
    selectedImages: new Set(),
    originalAlbumData: {},
    toAddImageIds: [],
    toRemoveImageIds: [],
    isCreatingMode: false
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
    //2XX 응답이 아니면 에러 발생하게 해주는 에러 핸들러
    async responseErrorHandler(response) {
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || `서버 오류 (${response.status})`;
            throw new Error(errorMessage);
        }
    },

    // 내 앨범 목록 조회
    async fetchMyAlbums() {
        const response = await fetch("/api/albums/me", {
            method: "GET",
            credentials: "include"
        });

        await this.responseErrorHandler(response);
        return response.json();
    },

    // 앨범 상세 정보 조회
    async fetchAlbumDetail(albumId) {
        const response = await fetch(`/api/albums?albumId=${albumId}`, {
            method: "GET",
            credentials: "include"
        });

        await this.responseErrorHandler(response);
        return response.json();
    },

    // 내 이미지 목록 조회
    async fetchMyImages() {
        const response = await fetch("/api/images/me", {
            method: "GET",
            credentials: "include"
        });

        await this.responseErrorHandler(response);
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

        await this.responseErrorHandler(response);
        return response.json();
    },

    // 앨범 공개 상태 변경
    async updateAlbumPublic(albumId, isPublic) {
        const response = await fetch("/api/albums", {
            method: "PATCH",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                albumId: albumId,
                isPublic: isPublic
            })
        })

        await this.responseErrorHandler(response);
        return response.json();
    },

    // 앨범 생성
    async createAlbum(albumTitle, albumDescription, isPublic = 0) {
        const response = await fetch("/api/albums", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                albumTitle: albumTitle,
                albumDescription: albumDescription,
                isPublic: isPublic
            })
        });

        await this.responseErrorHandler(response);
        return response.json();
    },

    // S3 URL을 Blob URL로 변환
    async convertS3UrlToBlobUrl(s3Url) {
        const response = await fetch(s3Url);

        await this.responseErrorHandler(response);

        const blob = await response.blob();
        return URL.createObjectURL(blob);
    },

    // 앨범에 이미지 추가
    async addAlbumImage(albumId, imageIdList) {
        const response = await fetch("/api/albums/images", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                albumId: albumId,
                imageIdList: imageIdList
            })
        })

        await this.responseErrorHandler(response);
        return response.json();
    },

    //앨범에서 이미지 삭제
    async removeAlbumImage(albumId, imageIdList) {
        const response = await fetch("/api/albums/images", {
            method: "DELETE",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                albumId: albumId,
                imageIdList: imageIdList
            })
        })

        await this.responseErrorHandler(response);

        return response.json();
    },

    //앨범 삭제
    async deleteAlbum(albumId) {
        const response = await fetch("/api/albums?albumId=" + albumId, {
            method: "DELETE",
            credentials: "include",
        })

        await this.responseErrorHandler(response);
        return response.json();
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

    // 메인 갤러리의 앨범 카드 정보 업데이트
    updateMainGalleryAlbumCard(albumId, newTitle) {
        const albumCard = DOM.albumGallery.querySelector(`[data-album-id="${albumId}"]`);
        if (albumCard) {
            const titleElement = albumCard.querySelector('.card-album-title');
            if (titleElement) {
                titleElement.textContent = newTitle;
                console.log(`메인 갤러리 앨범 카드 제목 업데이트: ${newTitle}`);
            }
        }
    },

    // 앨범 상세 갤러리 렌더링
    async renderAlbumDetailGallery(imageList) {
        if (!DOM.albumDetailGallery) return;

        DOM.albumDetailGallery.innerHTML = '';

        for (const image of imageList) {
            const blobUrl = await ApiService.convertS3UrlToBlobUrl(image.imageUrl);
            if (blobUrl) {
                const galleryCard = this.createGalleryCard(image, blobUrl, 'album');
                DOM.albumDetailGallery.appendChild(galleryCard);
            }
        }
    },

    // 내 이미지 갤러리 렌더링
    async renderMyImagesGallery(imageList) {
        if (!DOM.albumDetailEditMyImagesGallery) return;

        DOM.albumDetailEditMyImagesGallery.innerHTML = '';

        // 현재 앨범에 있는 이미지 ID들 수집
        const albumImageIds = this.getCurrentAlbumImageIds();
        console.log('현재 앨범 이미지 IDs:', albumImageIds);
        console.log('내 이미지 목록 개수:', imageList.length);

        let addedCount = 0;
        let excludedCount = 0;

        for (const image of imageList) {
            const imageIdStr = String(image.imageId); // 문자열로 통일
            console.log(`처리 중인 이미지 ID: ${imageIdStr} (원본: ${image.imageId})`);
            
            // 이미 앨범에 있는 이미지는 건너뛰기
            if (albumImageIds.includes(imageIdStr)) {
                console.log(`이미지 ID ${imageIdStr}는 이미 앨범에 있으므로 제외`);
                excludedCount++;
                continue;
            }

            const blobUrl = await ApiService.convertS3UrlToBlobUrl(image.imageUrl);
            if (blobUrl) {
                const galleryCard = this.createGalleryCard(image, blobUrl, 'myImages');
                DOM.albumDetailEditMyImagesGallery.appendChild(galleryCard);
                addedCount++;
                console.log(`이미지 ID ${imageIdStr} 추가됨`);
            }
        }
        
        console.log(`내 이미지 갤러리: ${addedCount}개 추가, ${excludedCount}개 제외`);
    },

    // 현재 앨범에 있는 이미지 ID들 가져오기
    getCurrentAlbumImageIds() {
        const albumGalleryCards = document.querySelectorAll('.album-detail-gallery .gallery-card');
        const imageIds = [];
        
        albumGalleryCards.forEach(card => {
            const imageId = card.dataset.imageId;
            if (imageId) {
                // 문자열로 통일
                imageIds.push(String(imageId));
            }
        });
        
        console.log('앨범 갤러리 카드 수:', albumGalleryCards.length);
        console.log('수집된 이미지 IDs:', imageIds);
        
        return imageIds;
    },

    // 갤러리 카드 생성
    createGalleryCard(image, blobUrl, type = 'album') {
        const galleryCard = document.createElement('div');
        galleryCard.className = type === 'myImages' ? 'my-image-card' : 'gallery-card';
        galleryCard.style.position = 'relative';

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
            imageUrl: blobUrl,
            cardType: type
        });

        galleryCard.innerHTML = `<img src="${blobUrl}" alt="${image.imageName}">`;
        
        // 클릭 이벤트 추가 (모든 이미지 타입에 대해)
        galleryCard.addEventListener('click', function(e) {
            // 체크박스 클릭이 아닐 때만 메인 뷰 업데이트
            if (!e.target.closest('.image-checkbox')) {
                ImageViewer.showImageInMainView(this);
            }
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
    },

    // 확인 모달 표시
    showConfirmModal(title, message, onConfirm, onCancel = null) {
        return new Promise((resolve) => {
            // 모달 오버레이 생성
            const overlay = document.createElement('div');
            overlay.className = 'confirm-modal-overlay';
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.7); z-index: 6000; display: flex;
                align-items: center; justify-content: center; padding: 20px;
                animation: fadeIn 0.3s ease;
            `;

            // 모달 컨테이너 생성
            const modal = document.createElement('div');
            modal.className = 'confirm-modal';
            modal.style.cssText = `
                background: white; border-radius: 12px; padding: 30px;
                max-width: 480px; width: 100%; position: relative;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                animation: slideInModal 0.3s ease;
            `;

            // 제목 생성
            const titleElement = document.createElement('h3');
            titleElement.style.cssText = `
                margin: 0 0 20px 0; color: #333; font-size: 1.4rem;
                font-weight: 600; text-align: center;
            `;
            titleElement.textContent = title;

            // 메시지 생성
            const messageElement = document.createElement('p');
            messageElement.style.cssText = `
                margin: 0 0 30px 0; color: #666; font-size: 1rem;
                line-height: 1.5; text-align: center; white-space: pre-line;
            `;
            messageElement.textContent = message;

            // 버튼 컨테이너 생성
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex; gap: 12px; justify-content: center;
            `;

            // 취소 버튼
            const cancelButton = document.createElement('button');
            cancelButton.textContent = '아니오';
            cancelButton.style.cssText = `
                padding: 12px 24px; border: 2px solid #6c757d; background: white;
                color: #6c757d; border-radius: 6px; font-size: 1rem; font-weight: 500;
                cursor: pointer; transition: all 0.2s ease; min-width: 100px;
            `;

            // 확인 버튼
            const confirmButton = document.createElement('button');
            confirmButton.textContent = '예';
            confirmButton.style.cssText = `
                padding: 12px 24px; border: 2px solid #dc3545; background: #dc3545;
                color: white; border-radius: 6px; font-size: 1rem; font-weight: 500;
                cursor: pointer; transition: all 0.2s ease; min-width: 100px;
            `;

            // 버튼 호버 효과
            cancelButton.addEventListener('mouseenter', () => {
                cancelButton.style.backgroundColor = '#6c757d';
                cancelButton.style.color = 'white';
            });
            cancelButton.addEventListener('mouseleave', () => {
                cancelButton.style.backgroundColor = 'white';
                cancelButton.style.color = '#6c757d';
            });

            confirmButton.addEventListener('mouseenter', () => {
                confirmButton.style.backgroundColor = '#c82333';
                confirmButton.style.borderColor = '#c82333';
            });
            confirmButton.addEventListener('mouseleave', () => {
                confirmButton.style.backgroundColor = '#dc3545';
                confirmButton.style.borderColor = '#dc3545';
            });

            // 모달 제거 함수
            const removeModal = () => {
                overlay.style.animation = 'fadeIn 0.3s ease reverse';
                modal.style.animation = 'slideInModal 0.3s ease reverse';
                setTimeout(() => {
                    if (overlay.parentNode) {
                        document.body.removeChild(overlay);
                    }
                }, 300);
            };

            // 이벤트 리스너
            cancelButton.addEventListener('click', () => {
                removeModal();
                if (onCancel) onCancel();
                resolve(false);
            });

            confirmButton.addEventListener('click', () => {
                removeModal();
                if (onConfirm) onConfirm();
                resolve(true);
            });

            // ESC 키로 닫기
            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    removeModal();
                    if (onCancel) onCancel();
                    resolve(false);
                    document.removeEventListener('keydown', handleKeydown);
                }
            };
            document.addEventListener('keydown', handleKeydown);

            // 오버레이 클릭으로 닫기
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    removeModal();
                    if (onCancel) onCancel();
                    resolve(false);
                }
            });

            // 애니메이션 스타일 추가
            if (!document.querySelector('#confirm-modal-styles')) {
                const style = document.createElement('style');
                style.id = 'confirm-modal-styles';
                style.textContent = `
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideInModal {
                        from { transform: translateY(-50px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                `;
                document.head.appendChild(style);
            }

            // DOM에 추가
            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(confirmButton);
            modal.appendChild(titleElement);
            modal.appendChild(messageElement);
            modal.appendChild(buttonContainer);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            // 확인 버튼에 포커스
            setTimeout(() => confirmButton.focus(), 100);
        });
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
        
        // 필드 포커스/블러 처리 함수
        const setupFieldBehavior = (element, defaultText) => {
            const handleFocus = () => {
                if (element.textContent === defaultText) {
                    element.textContent = '';
                }
            };
            
            const handleBlur = () => {
                if (element.textContent.trim() === '') {
                    element.textContent = defaultText;
                }
            };
            
            // 기존 이벤트 리스너 제거 (중복 방지)
            element.removeEventListener('focus', handleFocus);
            element.removeEventListener('blur', handleBlur);
            
            // 새 이벤트 리스너 추가
            element.addEventListener('focus', handleFocus);
            element.addEventListener('blur', handleBlur);
        };

        // 기본 텍스트인 경우 포커스/블러 동작 설정
        if (DOM.albumDetailTitle.textContent === '앨범 제목') {
            setupFieldBehavior(DOM.albumDetailTitle, '앨범 제목');
        }
        
        // 편집 모드 진입 시에는 자동 포커스 하지 않음 (사용자가 직접 클릭해야 함)

        DOM.albumDetailDescription.contentEditable = true;
        DOM.albumDetailDescription.classList.add('editing');
        
        // 설명 필드도 동일하게 설정
        if (DOM.albumDetailDescription.textContent === '앨범 설명') {
            setupFieldBehavior(DOM.albumDetailDescription, '앨범 설명');
        }

        // 편집 컨트롤 추가
        this.addEditControls();
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

        // 기존 컨트롤 제거
        const existingControls = document.querySelector('.edit-controls');
        if (existingControls) {
            existingControls.remove();
        }

        const albumDetailInfo = document.querySelector('.album-detail-info');
        
        // hr 태그를 찾아서 그 앞에 버튼을 삽입
        const hrElement = albumDetailInfo.querySelector('hr');
        if (hrElement) {
            // hr 태그 바로 앞에 삽입
            albumDetailInfo.insertBefore(editControls, hrElement);
        } else {
            // hr 태그가 없으면 기존처럼 맨 아래에 추가
            albumDetailInfo.appendChild(editControls);
        }
    },

    // 편집 저장
    async saveEdit() {
        let newTitle = DOM.albumDetailTitle.textContent.trim();
        let newDescription = DOM.albumDetailDescription.textContent.trim();

        // 기본 텍스트인 경우 빈 문자열로 처리
        if (newTitle === '앨범 제목') {
            newTitle = '';
        }
        if (newDescription === '앨범 설명') {
            newDescription = '';
        }

        if (!newTitle) {
            UiUpdater.showNotification('앨범 제목을 입력해주세요.', 'error');
            DOM.albumDetailTitle.focus();
            return;
        }

        try {
            if (State.isCreatingMode) {
                // 앨범 생성 모드
                UiUpdater.showNotification('앨범을 생성하는 중...', 'info');
                const response = await ApiService.createAlbum(newTitle, newDescription);
                
                // 생성된 앨범 ID 받아오기
                const newAlbumId = response.data.albumId || response.albumId;
                
                UiUpdater.showNotification('새 앨범이 생성되었습니다.', 'success');
                
                // 편집 모드 종료
                this.endEditMode();
                
                // 바로 생성된 앨범의 상세 페이지로 이동
                await EventHandlers.loadAlbumDetail(newAlbumId);
                
                // 앨범 목록도 새로고침 (백그라운드에서)
                EventHandlers.loadAlbumList().catch(console.error);
                
            } else {
                // 앨범 편집 모드
                if (!State.currentAlbumId) {
                    UiUpdater.showNotification('앨범 ID를 찾을 수 없습니다.', 'error');
                    return;
                }
                
                await ApiService.updateAlbumInfo(State.currentAlbumId, newTitle, newDescription);
                
                // 메인 갤러리의 앨범 카드 정보 업데이트
                UiUpdater.updateMainGalleryAlbumCard(State.currentAlbumId, newTitle);
                
                UiUpdater.showNotification('앨범 정보가 업데이트되었습니다.', 'success');
                this.endEditMode();
            }
        } catch (error) {
            console.error('앨범 저장 중 오류:', error);
            UiUpdater.showNotification(`저장 실패: ${error.message}`, 'error');
        }
    },

    // 편집 취소
    cancelEdit() {
        if (State.isCreatingMode) {
            // 생성 모드에서는 모달 닫기
            EventHandlers.closeModal();
            UiUpdater.showNotification('앨범 생성이 취소되었습니다.', 'info');
        } else {
            // 편집 모드에서는 원본 데이터로 복원
            DOM.albumDetailTitle.textContent = State.originalAlbumData.title;
            DOM.albumDetailDescription.textContent = State.originalAlbumData.description;
            this.endEditMode();
        }
    },

    // 편집 모드 종료
    endEditMode() {
        State.isEditingMode = false;
        
        // 생성 모드였다면 이미지 편집 버튼 다시 보이기
        if (State.isCreatingMode) {
            if (DOM.imageEditBtn) {
                DOM.imageEditBtn.style.display = 'block';
            }
        }
        
        State.isCreatingMode = false;

        // 편집 가능 해제
        DOM.albumDetailTitle.contentEditable = false;
        DOM.albumDetailTitle.classList.remove('editing');
        DOM.albumDetailDescription.contentEditable = false;
        DOM.albumDetailDescription.classList.remove('editing');

        // 편집 컨트롤 제거
        const editControls = document.querySelector('.edit-controls');
        if (editControls) {
            editControls.remove();
        }
    }
};

// ============================================================
// 갤러리 토글 모듈
// ============================================================
const GalleryToggle = {
    // 갤러리 토글 초기화
    initGalleryToggle() {
        const toggleButtons = document.querySelectorAll('.gallery-toggle-btn');

        toggleButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const target = button.dataset.target;
                this.toggleGallery(target, button);
            });
        });
    },

    // 갤러리 토글
    toggleGallery(target, button) {
        const toggleIcon = button.querySelector('.toggle-icon');
        let galleryContent;

        if (target === 'my-images') {
            galleryContent = DOM.albumDetailEditMyImagesGallery;
        } else if (target === 'album-images') {
            galleryContent = DOM.albumDetailGallery;
        }

        if (!galleryContent) return;

        const isCollapsed = galleryContent.style.display === 'none';

        if (isCollapsed) {
            // 갤러리 열기
            galleryContent.style.display = 'grid';
            toggleIcon.textContent = '−';
            galleryContent.style.animation = 'slideDown 0.3s ease';
        } else {
            // 갤러리 닫기
            galleryContent.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => {
                galleryContent.style.display = 'none';
            }, 280);
            toggleIcon.textContent = '+';
        }

        console.log(`${target} 갤러리 ${isCollapsed ? '열림' : '닫힘'}`);
    },

    // 내 이미지 섹션 표시/숨김
    showMyImagesSection() {
        if (DOM.myImagesSection) {
            DOM.myImagesSection.style.display = 'block';
            DOM.myImagesSection.style.animation = 'fadeIn 0.3s ease';
        }
    },

    hideMyImagesSection() {
        if (DOM.myImagesSection) {
            DOM.myImagesSection.style.display = 'none';
        }
    }
};

// ============================================================
// 이미지 편집 모드 모듈
// ============================================================
const ImageEditMode = {
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
        State.isImageEditingMode = true;
        State.selectedImages.clear();
        State.toAddImageIds = [];
        State.toRemoveImageIds = [];

        // 버튼 텍스트 변경
        DOM.imageEditBtn.textContent = '저장';
        DOM.imageEditBtn.classList.add('editing-active');

        // 내 이미지 섹션 표시
        GalleryToggle.showMyImagesSection();

        try {
            // 내 이미지 목록 로드
            UiUpdater.showNotification('내 이미지를 불러오는 중...', 'info');
            await this.loadMyImages();
            
            // 모든 갤러리 카드에 체크박스 추가
            this.addCheckboxesToAllGalleries();

            UiUpdater.showNotification('이미지 편집 모드가 시작되었습니다.', 'success');
        } catch (error) {
            console.error('내 이미지 로드 중 오류:', error);
            UiUpdater.showNotification('내 이미지를 불러오는 중 오류가 발생했습니다.', 'error');
            // 오류 발생 시 편집 모드 종료
            this.endImageEditMode();
        }
    },

    // 내 이미지 로드
    async loadMyImages() {
        try {
            const response = await ApiService.fetchMyImages();
            const imageList = response.data;

            if (imageList && imageList.length > 0) {
                await UiUpdater.renderMyImagesGallery(imageList);
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
                
                // 앨범 상세 정보 다시 로드하여 UI 업데이트
                await EventHandlers.loadAlbumDetail(State.currentAlbumId);
                
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
            
            // 카드에서 편집 모드 클래스 제거
            card.classList.remove('edit-mode', 'selected');
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
            galleryCard.classList.remove('selected');
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
            galleryCard.classList.add('selected');

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
        EventHandlers.resetModalState();
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

    if (DOM.imageEditBtn) {
        DOM.imageEditBtn.addEventListener("click", function(e) {
            e.preventDefault();
            ImageEditMode.toggleImageEditMode();
        });
    }

    // 앨범 생성 버튼 이벤트 리스너
    if (DOM.smallAlbumCreateBtn) {
        DOM.smallAlbumCreateBtn.addEventListener("click", function(e) {
            e.preventDefault();
            EventHandlers.openAlbumCreateModal();
        });
    }

    if (DOM.bigAlbumCreateBtn) {
        DOM.bigAlbumCreateBtn.addEventListener("click", function(e) {
            e.preventDefault();
            EventHandlers.openAlbumCreateModal();
        });
    }

    if (DOM.albumChangePublicBtn) {
        DOM.albumChangePublicBtn.addEventListener("click", function(e) {
            e.preventDefault();
            EventHandlers.changeAlbumPublicStatus()
        })
    }

    if (DOM.albumDeleteBtn) {
        DOM.albumDeleteBtn.addEventListener("click", function(e) {
            e.preventDefault();
            EventHandlers.deleteAlbum();
        });
    }

    // 갤러리 토글 기능 초기화
    GalleryToggle.initGalleryToggle();

    // 초기 데이터 로드
    EventHandlers.loadAlbumList();
}

// DOM이 로드된 후 초기화
document.addEventListener("DOMContentLoaded", initialize);
