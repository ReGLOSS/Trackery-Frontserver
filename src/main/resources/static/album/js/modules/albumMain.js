// ============================================================
// albumMain.js - 메인 초기화 및 통합 모듈
// ============================================================

import { DOM, State, CONSTANTS } from './constants.js';
import { ApiService } from './apiService.js';
import { UiUpdater } from './uiUpdater.js';
import { ImageViewer } from './imageViewer.js';
import { EditMode } from './editMode.js';
import { ImageEditMode } from './imageEditMode.js';
import { GalleryToggle } from './galleryToggle.js';
import { Navigation } from './navigation.js';
import { EventHandlers } from './eventHandlers.js';

// ============================================================
// 전역 객체 설정 (기존 코드와의 호환성을 위해)
// ============================================================
window.DOM = DOM;
window.State = State;
window.CONSTANTS = CONSTANTS;
window.ApiService = ApiService;
window.UiUpdater = UiUpdater;
window.ImageViewer = ImageViewer;
window.EditMode = EditMode;
window.ImageEditMode = ImageEditMode;
window.GalleryToggle = GalleryToggle;
window.Navigation = Navigation;
window.EventHandlers = EventHandlers;

// ============================================================
// 초기화 함수
// ============================================================
function initialize() {
    // 이벤트 리스너 등록
    setupEventListeners();

    // 갤러리 토글 기능 초기화
    GalleryToggle.initGalleryToggle();

    // 초기 데이터 로드
    EventHandlers.loadAlbumList();
}

// ============================================================
// 이벤트 리스너 설정
// ============================================================
function setupEventListeners() {
    // 모달 닫기 버튼
    if (DOM.closeBtn) {
        DOM.closeBtn.addEventListener("click", () => EventHandlers.closeModal());
    }

    // 앨범 편집 버튼
    if (DOM.editBtn) {
        DOM.editBtn.addEventListener("click", function(e) {
            e.preventDefault();
            EventHandlers.closeDropdown();
            EditMode.toggleEditMode();
        });
    }

    // 이미지 편집 버튼
    if (DOM.imageEditBtn) {
        DOM.imageEditBtn.addEventListener("click", function(e) {
            e.preventDefault();
            ImageEditMode.toggleImageEditMode();
        });
    }

    // 앨범 생성 버튼들
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

    // 앨범 공개 상태 변경 버튼
    if (DOM.albumChangePublicBtn) {
        DOM.albumChangePublicBtn.addEventListener("click", function(e) {
            e.preventDefault();
            EventHandlers.closeDropdown();
            EventHandlers.changeAlbumPublicStatus();
        });
    }

    // 앨범 삭제 버튼
    if (DOM.albumDeleteBtn) {
        DOM.albumDeleteBtn.addEventListener("click", function(e) {
            e.preventDefault();
            EventHandlers.closeDropdown();
            EventHandlers.deleteAlbum();
        });
    }
}

// ============================================================
// DOM 로드 완료 후 초기화
// ============================================================
document.addEventListener("DOMContentLoaded", initialize);

// ============================================================
// 모듈들을 전역으로 내보내기 (필요한 경우)
// ============================================================
export {
    DOM,
    State,
    CONSTANTS,
    ApiService,
    UiUpdater,
    ImageViewer,
    EditMode,
    ImageEditMode,
    GalleryToggle,
    Navigation,
    EventHandlers,
    initialize
};
