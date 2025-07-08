// ============================================================
// uiUpdater.js - UI 업데이트 모듈
// ============================================================

import { DOM, CONSTANTS } from './constants.js';
import { ApiService } from './apiService.js';

export const UiUpdater = {
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

            // 앨범 카드 클릭 이벤트는 외부에서 추가하도록 함
            DOM.albumGallery.appendChild(albumCard);
        });
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
            const blobUrl = await ApiService.convertS3UrlToBlobUrl(image.thumbnailUrl);
            if (blobUrl) {
                const galleryCard = this.createGalleryCard(image, blobUrl, 'album');
                DOM.albumDetailGallery.appendChild(galleryCard);
            }
        }
    },

    // 앨범 이미지 페이지네이션 렌더링
    renderAlbumImagesPagination(paginationData) {
        const paginationContainer = document.querySelector('.album-images-page-num');
        if (!paginationContainer) return;

        paginationContainer.innerHTML = '';

        if (paginationData.pages <= 1) {
            return;
        }

        const pagination = document.createElement('ul');
        pagination.className = 'pagination';

        // 이전 페이지 버튼
        const prevItem = document.createElement('li');
        prevItem.className = `page-item page-prev ${!paginationData.hasPreviousPage ? 'disabled' : ''}`;
        prevItem.innerHTML = `
            <a class="page-link" href="#" data-page="${paginationData.prePage}" ${!paginationData.hasPreviousPage ? 'tabindex="-1"' : ''}>
                ‹
            </a>
        `;
        pagination.appendChild(prevItem);

        // 페이지 번호들
        paginationData.navigatepageNums.forEach(pageNum => {
            const pageItem = document.createElement('li');
            pageItem.className = `page-item ${pageNum === paginationData.pageNum ? 'active' : ''}`;
            pageItem.innerHTML = `<a class="page-link" href="#" data-page="${pageNum}">${pageNum}</a>`;
            pagination.appendChild(pageItem);
        });

        // 다음 페이지 버튼
        const nextItem = document.createElement('li');
        nextItem.className = `page-item page-next ${!paginationData.hasNextPage ? 'disabled' : ''}`;
        nextItem.innerHTML = `
            <a class="page-link" href="#" data-page="${paginationData.nextPage}" ${!paginationData.hasNextPage ? 'tabindex="-1"' : ''}>
                ›
            </a>
        `;
        pagination.appendChild(nextItem);

        paginationContainer.appendChild(pagination);
    },

    // 내 이미지 갤러리 렌더링
    async renderMyImagesGallery(imageList) {
        if (!DOM.albumDetailEditMyImagesGallery) {
            console.error('albumDetailEditMyImagesGallery DOM 요소를 찾을 수 없습니다');
            return;
        }

        console.log('내 이미지 갤러리 렌더링 시작 - 기존 내용 초기화');
        DOM.albumDetailEditMyImagesGallery.innerHTML = '';

        console.log('받은 이미지 목록 개수:', imageList.length);

        if (imageList.length === 0) {
            DOM.albumDetailEditMyImagesGallery.innerHTML = '<div class="no-images-message">추가할 수 있는 내 이미지가 없습니다.</div>';
            console.log('추가할 수 있는 이미지가 없어 메시지 표시');
            return;
        }

        let successCount = 0;
        for (const image of imageList) {
            try {
                const blobUrl = await ApiService.convertS3UrlToBlobUrl(image.thumbnailUrl);
                if (blobUrl) {
                    const galleryCard = this.createGalleryCard(image, blobUrl, 'myImages');
                    DOM.albumDetailEditMyImagesGallery.appendChild(galleryCard);
                    successCount++;
                    console.log(`이미지 ID ${image.imageId} 추가됨`);
                }
            } catch (error) {
                console.error(`이미지 ID ${image.imageId} 처리 중 오류:`, error);
            }
        }
        
        console.log(`내 이미지 갤러리 렌더링 완료: ${successCount}/${imageList.length}개 성공`);
    },

    // 내 이미지 페이지네이션 렌더링
    renderMyImagesPagination(paginationData) {
        const paginationContainer = document.querySelector('.my-images-page-num');
        if (!paginationContainer) return;

        paginationContainer.innerHTML = '';

        if (paginationData.pages <= 1) {
            return;
        }

        const pagination = document.createElement('ul');
        pagination.className = 'pagination';

        // 이전 페이지 버튼
        const prevItem = document.createElement('li');
        prevItem.className = `page-item page-prev ${!paginationData.hasPreviousPage ? 'disabled' : ''}`;
        prevItem.innerHTML = `
            <a class="page-link" href="#" data-page="${paginationData.prePage}" ${!paginationData.hasPreviousPage ? 'tabindex="-1"' : ''}>
                ‹
            </a>
        `;
        pagination.appendChild(prevItem);

        // 페이지 번호들
        paginationData.navigatepageNums.forEach(pageNum => {
            const pageItem = document.createElement('li');
            pageItem.className = `page-item ${pageNum === paginationData.pageNum ? 'active' : ''}`;
            pageItem.innerHTML = `<a class="page-link" href="#" data-page="${pageNum}">${pageNum}</a>`;
            pagination.appendChild(pageItem);
        });

        // 다음 페이지 버튼
        const nextItem = document.createElement('li');
        nextItem.className = `page-item page-next ${!paginationData.hasNextPage ? 'disabled' : ''}`;
        nextItem.innerHTML = `
            <a class="page-link" href="#" data-page="${paginationData.nextPage}" ${!paginationData.hasNextPage ? 'tabindex="-1"' : ''}>
                ›
            </a>
        `;
        pagination.appendChild(nextItem);

        paginationContainer.appendChild(pagination);
    },

    // 갤러리 카드 생성
    createGalleryCard(image, blobUrl, type = 'album') {
        const galleryCard = document.createElement('div');
        galleryCard.className = type === 'myImages' ? 'my-image-card' : 'gallery-card';
        galleryCard.style.position = 'relative';
        galleryCard.style.cursor = 'pointer'; // 포인터 커서 추가

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
