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
    }).then(apiResponse => { // JSON 전체 응답 객체
        console.log("전체 API 응답:", apiResponse);

        const actualData = apiResponse.data; // 실제 데이터가 담긴 객체에 접근

        if (!actualData) {
            console.error("응답에서 'data' 필드를 찾을 수 없습니다.", apiResponse);
            alert("앨범 데이터를 올바르게 가져오지 못했습니다.");
            return;
        }

        // 이제 actualData를 사용하여 albumCount와 albumList에 접근합니다.
        if (actualData.albumCount === null) {
            // 이 부분은 실제 응답에서 albumCount가 null일 가능성이 있는지에 따라 유지하거나 수정할 수 있습니다.
            // 보통 count는 0으로 오므로, null 체크가 반드시 필요한지 확인해보세요.
            console.warn("albumCount가 null입니다. API 응답 확인 필요:", actualData);
            alert("앨범 개수 정보가 올바르지 않습니다.");
            return; // 오류 상황이므로 추가 진행을 막습니다.
        }

        if (actualData.albumCount <= 0) {
            console.log("앨범 없음");
            alert("앨범이 없습니다! 앨범을 만드세요!");
        } else {
            const albumGallery = document.getElementsByClassName('album-gallery')[0];

            if (albumGallery) {
                albumGallery.innerHTML = ''; // 기존 내용 초기화

                if (actualData.albumList && Array.isArray(actualData.albumList)) {
                    for (const album of actualData.albumList) {
                        const albumCard = document.createElement('div');
                        albumCard.className = 'album-card';

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