// ============================================================
// editMode.js - 편집 모드 관리 모듈
// ============================================================

import { DOM, State } from './constants.js';
import { ApiService } from './apiService.js';
import { UiUpdater } from './uiUpdater.js';

export const EditMode = {
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
                
                // 바로 생성된 앨범의 상세 페이지로 이동 (외부에서 처리)
                if (window.EventHandlers) {
                    await window.EventHandlers.loadAlbumDetail(newAlbumId);
                    window.EventHandlers.loadAlbumList().catch(console.error);
                }
                
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
            // 생성 모드에서는 모달 닫기 (외부에서 처리)
            if (window.EventHandlers) {
                window.EventHandlers.closeModal();
            }
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
