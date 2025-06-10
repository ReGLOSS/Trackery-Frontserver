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

document.addEventListener("DOMContentLoaded", function () {
    fetchAlbumDetail(1);
})

//앨범 상세 정보 조회
async function fetchAlbumDetail(albumId) {
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
            }
        }
    })
}


//앨범 정보 섹션 업데이트

const IS_PUBLIC = {
    0: "비공개 앨범",
    1: "공개 앨범"
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
})

// gallery-card 클릭 시 왼쪽에 원본 이미지 표시
function showImageInMainView(galleryCard) {
    const imageUrl = galleryCard.dataset.imageUrl;
    const imageName = galleryCard.dataset.imageName;
    
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
        transition: transform 0.2s ease;
    `;
    
    // 호버 효과
    mainImage.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.02)';
    });
    
    mainImage.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
    });
    
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
                <strong style="color: #555; display: block; margin-bottom: 5px;">이미지 이름:</strong>
                <span style="color: #333;">${dataset.imageName || 'N/A'}</span>
            </div>
            
            <div style="border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <strong style="color: #555; display: block; margin-bottom: 5px;">설명:</strong>
                <span style="color: #333;">${dataset.imageContent || 'N/A'}</span>
            </div>
            
            <div style="border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <strong style="color: #555; display: block; margin-bottom: 5px;">촬영 날짜:</strong>
                <span style="color: #333;">${dataset.imageDate || 'N/A'}</span>
            </div>
            
            <div style="border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <strong style="color: #555; display: block; margin-bottom: 5px;">등록 날짜:</strong>
                <span style="color: #333;">${dataset.imageRegDate || 'N/A'}</span>
            </div>
            
            <div style="border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <strong style="color: #555; display: block; margin-bottom: 5px;">위치:</strong>
                <span style="color: #333;">${dataset.sdName || 'N/A'} ${dataset.sggName || ''}</span>
            </div>
            
            <div style="border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <strong style="color: #555; display: block; margin-bottom: 5px;">좌표:</strong>
                <span style="color: #333;">위도: ${dataset.latitude || 'N/A'}, 경도: ${dataset.longitude || 'N/A'}</span>
            </div>
            
            <div style="border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <strong style="color: #555; display: block; margin-bottom: 5px;">공개 설정:</strong>
                <span style="color: #333;">${dataset.isPublic === '1' ? '공개' : '비공개'}</span>
            </div>
            
            <div style="border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <strong style="color: #555; display: block; margin-bottom: 5px;">이미지 ID:</strong>
                <span style="color: #333;">${dataset.imageId || 'N/A'}</span>
            </div>
            
            <div>
                <strong style="color: #555; display: block; margin-bottom: 5px;">사용자 ID:</strong>
                <span style="color: #333;">${dataset.userId || 'N/A'}</span>
            </div>
        </div>
    `;
    
    infoPanel.appendChild(closeButton);
    infoPanel.appendChild(infoContent);
    infoOverlay.appendChild(infoPanel);
    
    document.body.appendChild(infoOverlay);
}
