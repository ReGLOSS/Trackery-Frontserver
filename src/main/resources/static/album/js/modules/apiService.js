// ============================================================
// apiService.js - API 서비스 모듈
// ============================================================

export const ApiService = {
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
        const response = await fetch(`/api/albums/${albumId}`, {
            method: "GET",
            credentials: "include"
        });

        await this.responseErrorHandler(response);
        return response.json();
    },

    // 앨범 이미지 조회
    async fetchAlbumImages(albumId) {
        const response = await fetch(`/api/albums/${albumId}/images`, {
            method: "GET",
            credentials: "include"
        })

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
        const response = await fetch(`/api/albums/${albumId}`, {
            method: "PATCH",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                albumTitle: albumTitle,
                albumDescription: albumDescription
            })
        });

        await this.responseErrorHandler(response);
        return response.json();
    },

    // 앨범 공개 상태 변경
    async updateAlbumPublic(albumId, isPublic) {
        const response = await fetch(`/api/albums/${albumId}`, {
            method: "PATCH",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
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
        const response = await fetch(`/api/albums/${albumId}/images`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                imageIdList: imageIdList
            })
        })

        await this.responseErrorHandler(response);
        return response.json();
    },

    //앨범에서 이미지 삭제
    async removeAlbumImage(albumId, imageIdList) {
        const response = await fetch(`/api/albums/${albumId}/images`, {
            method: "DELETE",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                imageIdList: imageIdList
            })
        })

        await this.responseErrorHandler(response);

        return response.json();
    },

    //앨범 삭제
    async deleteAlbum(albumId) {
        const response = await fetch(`/api/albums/${albumId}`, {
            method: "DELETE",
            credentials: "include",
        })

        await this.responseErrorHandler(response);
        return response.json();
    }
};
