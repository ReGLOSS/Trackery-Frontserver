document.addEventListener("DOMContentLoaded", function () {
    console.log("Album.js 로드 완료");

    /*
내 앨범 간단조회 해서 있으면 조회된 내용 띄우고 없으면
앨범 만들라고 협박하기
*/
    fetch("/api/albums/me", {
        method: "GET",
        credentials: "include"
    }).then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }).then(apiResponse => {
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
            const albumGallery = document.getElementsByClassName('album-gallery')[0];

            if (albumGallery) {
                albumGallery.innerHTML = '';

                if (actualData.albumList && Array.isArray(actualData.albumList)) {
                    for (const album of actualData.albumList) {
                        const albumCard = document.createElement('div');
                        albumCard.className = 'album-card';

                        albumCard.dataset.albumId = album.albumId;
                        albumCard.dataset.isPublic = album.isPublic; // 공개/비공개 정보 추가

                        albumCard.innerHTML = `
                            <a>
                                <img src="/images/default-image1.webp" alt="album-image">
                            </a>
                            <p class="card-album-title">
                                ${album.albumTitle}
                            </p>
                            <p class="text-muted card-album-image-count">
                                항목 : ${album.albumImageCount} 장
                            </p>
                        `;
                        albumGallery.appendChild(albumCard);
                    }
                    
                    // 내비게이션 바 이벤트 리스너 초기화
                    initAlbumNavigation();
                } else {
                    console.error('actualData.albumList가 배열이 아니거나 존재하지 않습니다:', actualData);
                    alert("앨범 목록을 불러오는 데 실패했습니다.");
                }
            } else {
                console.error('albumGallery 요소를 찾을 수 없습니다.');
            }
        }
    }).catch(error => {
        console.error('앨범 조회 중 오류 발생:', error);
        alert('앨범을 불러오는 중 오류가 발생했습니다: ' + error.message);
    });
});

// 현재 앨범 ID 관리
let currentAlbumId = null;

document.addEventListener("DOMContentLoaded", function () {
    fetchAlbumDetail(1);
})

//앨범 상세 정보 조회
async function fetchAlbumDetail(albumId) {
    // 현재 앨범 ID 저장
    currentAlbumId = albumId;
    
    fetch("/api/albums?albumId=" + albumId,
        {
            method: "GET",
            credentials: "include"
        })
        .then(response => {
            if (!response.ok) {
                console.error("앨범 상세 정보 조회 실패")
                throw new Error(`HTTP error! status: ${response.status}`);
            } else {
                return response.json();
            }
        }).then(async response => {
        const actualData = response.data;

        const PARSED_DATA = {
            albumTitle: actualData.albumTitle,
            albumDescription: actualData.albumDescription,
            isPublic: actualData.isPublic,
            imageCount: actualData.imageCount,
            imageList: actualData.imageList
        };

        console.log(PARSED_DATA);

        updateAlbumDetailInfo(PARSED_DATA.albumTitle, PARSED_DATA.albumDescription, PARSED_DATA.isPublic, PARSED_DATA.imageCount);

        if (PARSED_DATA.imageCount === 0) {
            return;
        }

        const albumDetailGallery = document.getElementsByClassName('album-detail-gallery')[0];

        albumDetailGallery.innerHTML = '';

        let isFirstImage = true; // 첫 번째 이미지 확인용

        for (const image of PARSED_DATA.imageList) {
            const blobUrl = await convertS3UrlToBlobUrl(image.imageUrl);
            if(blobUrl) {
                const galleryCard = document.createElement('div');
                galleryCard.className = 'gallery-card';

                galleryCard.dataset.imageId = image.imageId;
                galleryCard.dataset.userId = image.userId;
                galleryCard.dataset.imageRegDate = image.imageRegDate;
                galleryCard.dataset.sdName = image.sdName;
                galleryCard.dataset.sggName = image.sggName;
                galleryCard.dataset.latitude = image.latitude;
                galleryCard.dataset.longitude = image.longitude;
                galleryCard.dataset.imageName = image.imageName;
                galleryCard.dataset.imageContent = image.imageContent;
                galleryCard.dataset.imageDate = image.imageDate;
                galleryCard.dataset.isPublic = image.isPublic;
                galleryCard.dataset.imageUrl = blobUrl;

                galleryCard.innerHTML = `
                <img src="${blobUrl}" alt="${image.imageName}">
                `
                
                // gallery-card 클릭 이벤트 추가
                galleryCard.addEventListener('click', function() {
                    showImageInMainView(this);
                });
                
                albumDetailGallery.appendChild(galleryCard);
                
                // 첫 번째 이미지를 자동으로 선택
                if (isFirstImage) {
                    setTimeout(() => showImageInMainView(galleryCard), 100); // 약간의 딜레이를 주어 DOM 렌더링 완료 후 실행
                    isFirstImage = false;
                }
            }
        }
    })
}


//앨범 정보 섹션 업데이트

const IS_PUBLIC = {
    0: "비공개",
    1: "공개"
}

function updateAlbumDetailInfo(albumTitle, albumDescription, isPublic, imageCount) {
    const albumDetailTitle = document.querySelector('.album-detail-title');
    const albumDetailDescription = document.querySelector('.album-detail-description');
    const albumDetailPublic = document.querySelector('.album-detail-is-public');
    const albumDetailImageCount = document.querySelector('.album-detail-image-count');

    albumDetailTitle.textContent= albumTitle;
    albumDetailDescription.textContent= albumDescription;
    albumDetailPublic.textContent= IS_PUBLIC[isPublic];
    albumDetailImageCount.textContent = "사진 " + imageCount + "장";
}

//S3 링크를 BLOB URL로
async function convertS3UrlToBlobUrl(s3Url) {
    const response = await fetch(s3Url);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

const closeBtn = document.getElementById("album-detail-close-btn");

closeBtn.addEventListener("click", function () {
    console.log("닫기 버튼 클릭");
    const albumDetailContainer = document.getElementsByClassName("album-detail-container")[0];
    albumDetailContainer.style.display = "none";
    
    // 현재 앨범 ID 초기화
    currentAlbumId = null;
})

// 편집 모드 상태 변수
let isEditingMode = false;
let originalAlbumData = {};

// 편집 버튼 이벤트 리스너 추가
document.addEventListener("DOMContentLoaded", function() {
    const editBtn = document.getElementById("album-edit-btn");
    if (editBtn) {
        editBtn.addEventListener("click", function(e) {
            e.preventDefault();
            toggleEditMode();
        });
    }
});

// 편집 모드 토글 함수
function toggleEditMode() {
    const titleElement = document.querySelector('.album-detail-title');
    const descriptionElement = document.querySelector('.album-detail-description');
    
    if (!isEditingMode) {
        // 편집 모드 시작
        startEditMode(titleElement, descriptionElement);
    } else {
        // 편집 모드 종료
        cancelEdit(titleElement, descriptionElement);
    }
}

// 편집 모드 시작
function startEditMode(titleElement, descriptionElement) {
    isEditingMode = true;
    
    // 원본 데이터 저장
    originalAlbumData = {
        title: titleElement.textContent,
        description: descriptionElement.textContent
    };
    
    // 제목을 편집 가능한 input으로 변경
    titleElement.contentEditable = true;
    titleElement.classList.add('editing');
    titleElement.focus();
    
    // 설명을 편집 가능한 textarea로 변경
    descriptionElement.contentEditable = true;
    descriptionElement.classList.add('editing');
    
    // 편집 컨트롤 버튼 추가
    const editControls = document.createElement('div');
    editControls.className = 'edit-controls';
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-btn';
    saveBtn.textContent = '저장';
    saveBtn.addEventListener('click', saveEdit);
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'cancel-btn';
    cancelBtn.textContent = '취소';
    cancelBtn.addEventListener('click', cancelEdit);
    
    editControls.appendChild(saveBtn);
    editControls.appendChild(cancelBtn);
    
    // 기존 edit-controls가 있으면 제거
    const existingControls = document.querySelector('.edit-controls');
    if (existingControls) {
        existingControls.remove();
    }
    
    // album-detail-info에 컨트롤 추가
    const albumDetailInfo = document.querySelector('.album-detail-info');
    albumDetailInfo.appendChild(editControls);
    
    // Enter 키로 저장, Escape 키로 취소
    titleElement.addEventListener('keydown', handleEditKeydown);
    descriptionElement.addEventListener('keydown', handleEditKeydown);
}

// 키보드 이벤트 처리
function handleEditKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        saveEdit();
    } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
    }
}

// 편집 저장
function saveEdit() {
    const titleElement = document.querySelector('.album-detail-title');
    const descriptionElement = document.querySelector('.album-detail-description');
    
    const newTitle = titleElement.textContent.trim();
    const newDescription = descriptionElement.textContent.trim();
    
    // 빈 제목 검증
    if (!newTitle) {
        alert('앨범 제목은 비워둘 수 없습니다.');
        titleElement.focus();
        return;
    }
    
    // 현재 조회 중인 앨범 ID 가져오기
    const currentAlbumId = getCurrentAlbumId();
    
    if (!currentAlbumId) {
        showNotification('앨범 ID를 찾을 수 없습니다.', 'error');
        return;
    }
    
    // API 호출
    updateAlbumInfo(currentAlbumId, newTitle, newDescription);
    
    // 편집 모드 종료
    endEditMode(titleElement, descriptionElement);
}

// 편집 취소
function cancelEdit() {
    const titleElement = document.querySelector('.album-detail-title');
    const descriptionElement = document.querySelector('.album-detail-description');
    
    // 원본 데이터로 복원
    titleElement.textContent = originalAlbumData.title;
    descriptionElement.textContent = originalAlbumData.description;
    
    // 편집 모드 종료
    endEditMode(titleElement, descriptionElement);
}

// 편집 모드 종료
function endEditMode(titleElement, descriptionElement) {
    isEditingMode = false;
    
    // 편집 모드 스타일 제거
    titleElement.contentEditable = false;
    titleElement.classList.remove('editing');
    
    descriptionElement.contentEditable = false;
    descriptionElement.classList.remove('editing');
    
    // 이벤트 리스너 제거
    titleElement.removeEventListener('keydown', handleEditKeydown);
    descriptionElement.removeEventListener('keydown', handleEditKeydown);
    
    // 편집 컨트롤 제거
    const editControls = document.querySelector('.edit-controls');
    if (editControls) {
        editControls.remove();
    }
}

// 알림 메시지 표시 함수
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 5000;
        animation: slideInNotification 0.3s ease;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    
    // 타입에 따른 배경색 설정
    switch(type) {
        case 'success':
            notification.style.backgroundColor = '#28a745';
            break;
        case 'error':
            notification.style.backgroundColor = '#dc3545';
            break;
        default:
            notification.style.backgroundColor = '#007bff';
    }
    
    notification.textContent = message;
    
    // 애니메이션 CSS 추가
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInNotification {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
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

// 현재 앨범 ID 가져오기 함수
function getCurrentAlbumId() {
    return currentAlbumId;
}

// 앨범 정보 업데이트 API 호출
async function updateAlbumInfo(albumId, newTitle, newDescription) {
    try {
        const response = await fetch("/api/albums", {
            method: "PATCH", // 소문자로 수정
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                albumId: albumId,
                albumTitle: newTitle,
                albumDescription: newDescription
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('앨범 정보 업데이트 성공:', result);
            
            showNotification('앨범 정보가 업데이트되었습니다.', 'success');
        } else {
            // HTTP 에러 상태별 처리
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || `서버 오류 (${response.status})`;
            
            console.error('앨범 업데이트 실패:', response.status, errorMessage);
            showNotification(`업데이트 실패: ${errorMessage}`, 'error');
        }
    } catch (error) {
        // 네트워크 오류 등
        console.error('앨범 업데이트 중 오류:', error);
        showNotification('네트워크 오류가 발생했습니다.', 'error');
    }
}

// gallery-card 클릭 시 왼쪽에 원본 이미지 표시
function showImageInMainView(galleryCard) {
    const imageUrl = galleryCard.dataset.imageUrl;
    const imageName = galleryCard.dataset.imageName;
    
    // 이전에 선택된 카드의 선택 상태 제거
    const previousSelected = document.querySelector('.gallery-card.selected');
    if (previousSelected) {
        previousSelected.classList.remove('selected');
    }
    
    // 현재 클릭된 카드에 선택 상태 추가
    galleryCard.classList.add('selected');
    
    const albumImageContainer = document.querySelector('.album-image-container');
    
    // 기존 내용 제거
    albumImageContainer.innerHTML = '';
    
    // 새 이미지 엘리먼트 생성
    const mainImageWrapper = document.createElement('div');
    mainImageWrapper.className = 'main-image-wrapper';
    mainImageWrapper.style.cssText = `
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        position: relative;
    `;
    
    const mainImage = document.createElement('img');
    mainImage.src = imageUrl;
    mainImage.alt = imageName;
    mainImage.style.cssText = `
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
    `;
    
    // 메인 이미지 클릭 시 dataset 정보 표시
    mainImageWrapper.addEventListener('click', function() {
        showImageDataset(galleryCard);
    });
    
    mainImageWrapper.appendChild(mainImage);
    albumImageContainer.appendChild(mainImageWrapper);
}

// 이미지 dataset 정보 표시
function showImageDataset(galleryCard) {
    const dataset = galleryCard.dataset;
    
    // 날짜 포맷팅 함수
    function formatDateOnly(dateString) {
        if (!dateString || dateString === 'N/A' || dateString === '') return '';
        
        try {
            // T00:00:00 부분 제거하고 날짜만 추출
            const dateOnly = dateString.split('T')[0];
            return dateOnly;
        } catch (e) {
            return dateString; // 파싱 실패 시 원본 반환
        }
    }
    
    // 모달 또는 오버레이 생성
    const infoOverlay = document.createElement('div');
    infoOverlay.className = 'image-info-overlay';
    infoOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 4000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    `;
    
    const infoPanel = document.createElement('div');
    infoPanel.className = 'image-info-panel';
    infoPanel.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 600px;
        width: 100%;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;
    
    // 닫기 버튼
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
        position: absolute;
        top: 15px;
        right: 20px;
        background: none;
        border: none;
        font-size: 30px;
        cursor: pointer;
        color: #666;
        line-height: 1;
        padding: 0;
        width: 30px;
        height: 30px;
    `;
    
    closeButton.addEventListener('click', function() {
        document.body.removeChild(infoOverlay);
    });
    
    // 오버레이 클릭 시 닫기
    infoOverlay.addEventListener('click', function(e) {
        if (e.target === infoOverlay) {
            document.body.removeChild(infoOverlay);
        }
    });
    
    // 정보 내용 생성
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
                <span style="color: #333;">${IS_PUBLIC[dataset.isPublic]}</span>
            </div>
        </div>
    `;
    
    infoPanel.appendChild(closeButton);
    infoPanel.appendChild(infoContent);
    infoOverlay.appendChild(infoPanel);
    
    document.body.appendChild(infoOverlay);
}

// 앨범 내비게이션 기능 초기화
function initAlbumNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 이전 활성 버튼에서 active 클래스 제거
            navButtons.forEach(btn => btn.classList.remove('active'));
            
            // 현재 클릭된 버튼에 active 클래스 추가
            this.classList.add('active');
            
            // 필터 적용
            const filter = this.dataset.filter;
            filterAlbums(filter);
        });
    });
}

// 앨범 필터링 함수
function filterAlbums(filter) {
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
    
    // 필터링 결과 확인
    const visibleCards = document.querySelectorAll('.album-card[style*="display: block"], .album-card:not([style*="display: none"])');
    console.log(`${filter} 필터 적용됨: ${visibleCards.length}개 앨범 표시`);
}
