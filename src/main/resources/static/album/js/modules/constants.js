// ============================================================
// constants.js - 상수 및 상태 관리 모듈
// ============================================================

// DOM 엘리먼트 관련 상수들
export const DOM = {
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
export const State = {
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
export const CONSTANTS = {
    IS_PUBLIC: {
        0: "비공개",
        1: "공개"
    }
};
