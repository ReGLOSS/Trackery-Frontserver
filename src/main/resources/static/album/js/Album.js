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
