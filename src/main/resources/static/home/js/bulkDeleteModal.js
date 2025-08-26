import { ProcessingIndicator } from '../../module/processingIndicator/js/processingIndicator.js';

/**
 * 다중 삭제 확인 및 진행 상황 모달 관리 클래스
 * 기존 이미지 첨부 모달의 디자인을 활용하여 일관된 UI 제공
 */
export class BulkDeleteModal {
    constructor() {
        this.confirmModal = null;
        this.progressIndicator = null;
        this.isInitialized = false;
        this.isDeletionInProgress = false;
        
        // 콜백 함수들
        this.onConfirmDelete = null;
        this.onCancelDelete = null;
    }

    /**
     * 모달 초기화
     */
    initialize() {
        if (this.isInitialized) return;
        
        this.createConfirmModal();
        this.bindConfirmModalEvents();
        this.isInitialized = true;
    }

    /**
     * 삭제 확인 모달 생성 (기존 이미지 첨부 모달 디자인 활용)
     */
    createConfirmModal() {
        const modalHtml = `
            <div class="bulk-delete-confirm-modal" id="bulkDeleteConfirmModal" 
                 style="display: none;">
                <div class="modal-overlay" id="bulkDeleteConfirmOverlay"></div>
                <div class="image-select-container">
                    <div class="image-select-header">
                    </div>
                    <div class="image-select-body">
                        <div class="delete-warning" id="deleteModalDesc">
                            <div class="warning-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"
                                    stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round"
                                    stroke-linejoin="round">
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                    <path d="M12 9v2m0 4v.01"></path>
                                    <path d="M5 19h14a2 2 0 0 0 1.84 -2.75l-7.1 -12.25a2 2 0 0 0 -3.5 0l-7.1 12.25a2 2 0 0 0 1.75 2.75"></path>
                                </svg>
                            </div>
                            <p><strong id="deleteImageCount">0</strong>장의 이미지를 삭제하시겠습니까?</p>
                            <small>삭제된 이미지는 복구할 수 없습니다.</small>
                        </div>
                        <div class="selected-images-preview" id="selectedImagesPreview" style="display: none;">
                            <h4 id="previewTitle">삭제될 이미지</h4>
                            <div class="preview-gallery" id="deletePreviewGallery"></div>
                        </div>
                        <div class="modal-actions">
                            <button class="btn btn-secondary" id="cancelDeleteBtn" type="button">취소</button>
                            <button class="btn btn-danger" id="confirmDeleteBtn" type="button">삭제</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.confirmModal = document.getElementById('bulkDeleteConfirmModal');
    }

    /**
     * 확인 모달 이벤트 바인딩
     */
    bindConfirmModalEvents() {
        // 확인 모달 이벤트
        const confirmOverlay = document.getElementById('bulkDeleteConfirmOverlay');
        const confirmClose = document.getElementById('bulkDeleteConfirmClose');
        const cancelBtn = document.getElementById('cancelDeleteBtn');
        const confirmBtn = document.getElementById('confirmDeleteBtn');

        // 모달 닫기 이벤트 (확인 모달만)
        [confirmOverlay, confirmClose, cancelBtn].forEach(element => {
            element?.addEventListener('click', () => this.hideConfirmModal());
        });

        // 삭제 확인 이벤트
        confirmBtn?.addEventListener('click', () => {
            if (this.onConfirmDelete) {
                this.onConfirmDelete();
            }
        });
    }

    /**
     * 삭제 확인 모달 표시
     * @param {Array} selectedImages - 선택된 이미지 배열
     */
    showConfirmModal(selectedImages) {
        if (!this.isInitialized) {
            this.initialize();
        }

        // 선택된 이미지가 없는 경우 경고
        if (!selectedImages || selectedImages.length === 0) {
            this.showNoSelectionWarning();
            return;
        }

        // 이미지 개수 업데이트
        const countElement = document.getElementById('deleteImageCount');
        if (countElement) {
            countElement.textContent = selectedImages.length.toString();
        }

        // 미리보기 갤러리 생성
        this.createPreviewGallery(selectedImages);

        // 모달 표시
        this.confirmModal.style.display = 'flex';
        
        // 애니메이션을 위한 약간의 지연
        setTimeout(() => {
            this.confirmModal.classList.add('show');
        }, 10);

        // 삭제 확인 버튼에 포커스
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        if (confirmBtn) {
            confirmBtn.focus();
        }
    }

    /**
     * 선택된 이미지가 없을 때 경고 메시지 표시
     */
    showNoSelectionWarning() {
        // NotificationHelper 모듈 import 시도
        try {
            import('../../module/notification/notificationHelper.js').then(module => {
                module.NotificationHelper.showWarning('선택된 이미지가 없습니다.');
            }).catch(() => {
                // import 실패 시 전역 객체 확인
                if (window.NotificationHelper) {
                    window.NotificationHelper.showWarning('선택된 이미지가 없습니다.');
                } else {
                    alert('선택된 이미지가 없습니다.');
                }
            });
        } catch (error) {
            // 전역 객체 확인
            if (window.NotificationHelper) {
                window.NotificationHelper.showWarning('선택된 이미지가 없습니다.');
            } else {
                alert('선택된 이미지가 없습니다.');
            }
        }
    }

    /**
     * 미리보기 갤러리 생성
     * @param {Array} selectedImages - 선택된 이미지 배열
     */
    createPreviewGallery(selectedImages) {
        const previewSection = document.getElementById('selectedImagesPreview');
        const gallery = document.getElementById('deletePreviewGallery');
        
        if (!gallery) return;

        // 갤러리 초기화
        gallery.innerHTML = '';

        // 이미지가 있는 경우에만 미리보기 섹션 표시
        if (selectedImages.length > 0) {
            previewSection.style.display = 'block';
            
            selectedImages.forEach(image => {
                const imageElement = document.createElement('img');
                imageElement.src = image.thumbnailUrl || image.src;
                imageElement.alt = image.imageName || '선택된 이미지';
                imageElement.className = 'uploading-modal-gallery-image';
                imageElement.style.cursor = 'default';
                imageElement.style.aspectRatio = '1 / 1';
                imageElement.style.objectFit = 'cover';
                imageElement.style.width = '8vh';

                gallery.appendChild(imageElement);
            });
        } else {
            previewSection.style.display = 'none';
        }
    }

    /**
     * 삭제 확인 모달 숨기기
     */
    hideConfirmModal() {
        if (!this.confirmModal) return;

        this.confirmModal.classList.remove('show');
        
        
        setTimeout(() => {
            this.confirmModal.style.display = 'none';
        }, 300);

        // 콜백 호출
        if (this.onCancelDelete) {
            this.onCancelDelete();
        }
    }

    /**
     * 삭제 진행 상황 모달 표시
     * @param {number} totalCount - 총 삭제할 이미지 수
     */
    showProgressModal(totalCount) {
        if (!this.isInitialized) {
            this.initialize();
        }

        // 삭제 진행 상태 설정
        this.isDeletionInProgress = true;

        // 확인 모달 숨기기
        this.hideConfirmModal();

        // ProcessingIndicator로 진행 상황 모달 생성
        this.progressIndicator = ProcessingIndicator.showWithResult('이미지를 삭제하는 중입니다', 'delete');
        
        // 총 개수 설정
        ProcessingIndicator.initializeProgress(this.progressIndicator, totalCount);

        // 모든 UI 요소 비활성화
        this.disableAllUIElements();

        // 페이지 이탈 방지
        this.preventPageUnload();

        // 완료 버튼 이벤트 바인딩
        this.bindProgressModalCompleteButton();
    }

    /**
     * 진행률 업데이트
     * @param {number} current - 현재 처리된 개수
     * @param {number} total - 총 개수
     */
    updateProgress(current, total) {
        if (this.progressIndicator) {
            ProcessingIndicator.updateProgress(this.progressIndicator, current, total);
        }
    }

    /**
     * 삭제 완료 결과 표시 (개선된 오류 정보 포함)
     * @param {Object} result - 삭제 결과 객체
     * @param {number} result.success - 성공한 개수
     * @param {number} result.failed - 실패한 개수
     * @param {Array} result.failedImages - 실패한 이미지 배열
     * @param {Object} result.errorAnalysis - 오류 분석 결과
     */
    showResult(result) {
        // 삭제 진행 상태 해제
        this.isDeletionInProgress = false;

        if (!this.progressIndicator) return;

        // 실패한 이미지를 ProcessingIndicator 배열로 변환
        const failedItems = result.failedImages ? result.failedImages.map(image => {
            const errorDetails = this.getErrorAnalysisMessage({ ...result.errorAnalysis });
            return {
                src: image.thumbnailUrl || image.src,
                type: 'image',
                name: image.imageName || image.imageId || '알 수 없는 이미지',
                reason: `${image.reason || '알 수 없는 오류'}${errorDetails ? ` ${errorDetails}` : ''}`
            };
        }) : [];

        // 메시지 사용자정의
        const options = {
            successMessage: result.success > 0 
                ? `${result.success}장의 이미지를 성공적으로 삭제했습니다.`
                : '삭제된 이미지가 없습니다.',
            failedMessage: result.failed > 0
                ? `${result.failed}장의 이미지는 삭제에 실패했습니다.`
                : ''
        };

        // ProcessingIndicator로 결과 표시
        ProcessingIndicator.showResult(
            this.progressIndicator, 
            result.success, 
            result.failed, 
            failedItems,
            options
        );

        // UI 요소 다시 활성화
        this.enableAllUIElements();

        // 페이지 이탈 방지 해제
        this.allowPageUnload();
        
        // 3초 후 자동으로 모달 닫기
        setTimeout(() => {
            this.hideProgressModal();
        }, 3000);
    }
    
    /**
     * 오류 분석 결과를 사용자 친화적인 메시지로 변환
     * @param {Object} errorAnalysis - 오류 분석 결과
     * @returns {string} 사용자 친화적인 오류 메시지
     */
    getErrorAnalysisMessage(errorAnalysis) {
        const messages = [];
        
        if (errorAnalysis.authErrors > 0) {
            messages.push(`로그인 필요 ${errorAnalysis.authErrors}장`);
        }
        if (errorAnalysis.permissionErrors > 0) {
            messages.push(`권한 없음 ${errorAnalysis.permissionErrors}장`);
        }
        if (errorAnalysis.notFoundErrors > 0) {
            messages.push(`이미지 없음 ${errorAnalysis.notFoundErrors}장`);
        }
        if (errorAnalysis.networkErrors > 0) {
            messages.push(`네트워크 오류 ${errorAnalysis.networkErrors}장`);
        }
        if (errorAnalysis.serverErrors > 0) {
            messages.push(`서버 오류 ${errorAnalysis.serverErrors}장`);
        }
        if (errorAnalysis.unknownErrors > 0) {
            messages.push(`기타 오류 ${errorAnalysis.unknownErrors}장`);
        }
        
        if (messages.length > 0) {
            let result = `(${messages.join(', ')})`;
            
            // 재시도 정보 추가
            if (errorAnalysis.totalRetries > 0) {
                result += ` 총 ${errorAnalysis.totalRetries}회 재시도했습니다.`;
            }
            
            return result;
        }
        
        return '';
    }

    /**
     * 진행 상황 모달 완료 버튼 바인딩
     */
    bindProgressModalCompleteButton() {
        // 단순한 대기 후 버튼 바인딩 (무한루프 방지)
        setTimeout(() => {
            const completeBtn = document.querySelector('.btn.btn-primary');
            if (completeBtn && completeBtn.textContent.includes('확인')) {
                completeBtn.addEventListener('click', () => this.hideProgressModal());
            }
        }, 100);
    }

    /**
     * 진행 상황 모달 숨기기
     */
    hideProgressModal() {
        if (this.progressIndicator) {
            ProcessingIndicator.hide(this.progressIndicator);
            this.progressIndicator = null;
        }

        // 삭제 진행 상태 해제
        this.isDeletionInProgress = false;

        // UI 요소 다시 활성화
        this.enableAllUIElements();

        // 페이지 이탈 방지 해제
        this.allowPageUnload();
    }

    /**
     * 페이지 이탈 방지 설정
     */
    preventPageUnload() {
        this.beforeUnloadHandler = (e) => {
            e.preventDefault();
            e.returnValue = '이미지 삭제가 진행 중입니다. 페이지를 떠나시겠습니까?';
            return e.returnValue;
        };
        
        window.addEventListener('beforeunload', this.beforeUnloadHandler);
    }

    /**
     * 페이지 이탈 방지 해제
     */
    allowPageUnload() {
        if (this.beforeUnloadHandler) {
            window.removeEventListener('beforeunload', this.beforeUnloadHandler);
            this.beforeUnloadHandler = null;
        }
    }

    /**
     * 콜백 함수 설정
     * @param {Function} onConfirm - 삭제 확인 콜백
     * @param {Function} onCancel - 삭제 취소 콜백
     */
    setCallbacks(onConfirm, onCancel) {
        this.onConfirmDelete = onConfirm;
        this.onCancelDelete = onCancel;
    }

    /**
     * 모든 모달 숨기기
     */
    hideAllModals() {
        this.hideConfirmModal();
        this.hideProgressModal();
    }

    /**
     * 모든 UI 요소 비활성화 (삭제 진행 중)
     */
    disableAllUIElements() {
        // 페이지의 모든 버튼과 입력 요소 비활성화
        const buttons = document.querySelectorAll('button:not(#deleteCompleteBtn)');
        const inputs = document.querySelectorAll('input, select, textarea');
        const links = document.querySelectorAll('a');

        buttons.forEach(btn => {
            btn.disabled = true;
            btn.style.pointerEvents = 'none';
            btn.setAttribute('data-bulk-delete-disabled', 'true');
        });

        inputs.forEach(input => {
            input.disabled = true;
            input.setAttribute('data-bulk-delete-disabled', 'true');
        });

        links.forEach(link => {
            link.style.pointerEvents = 'none';
            link.setAttribute('data-bulk-delete-disabled', 'true');
        });

        // 사이드바 비활성화
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.style.pointerEvents = 'none';
            sidebar.setAttribute('data-bulk-delete-disabled', 'true');
        }

        // 지도 영역 비활성화
        const mapContainer = document.querySelector('.map-container');
        if (mapContainer) {
            mapContainer.style.pointerEvents = 'none';
            mapContainer.setAttribute('data-bulk-delete-disabled', 'true');
        }
    }

    /**
     * 모든 UI 요소 다시 활성화
     */
    enableAllUIElements() {
        // 비활성화된 요소들 다시 활성화
        const disabledElements = document.querySelectorAll('[data-bulk-delete-disabled="true"]');
        
        disabledElements.forEach(element => {
            if (element.tagName === 'BUTTON' || element.tagName === 'INPUT' || 
                element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
                element.disabled = false;
            }
            element.style.pointerEvents = '';
            element.removeAttribute('data-bulk-delete-disabled');
        });
    }

    /**
     * 리소스 정리
     */
    destroy() {
        this.hideAllModals();
        this.allowPageUnload();
        this.enableAllUIElements();
        
        if (this.confirmModal) {
            this.confirmModal.remove();
            this.confirmModal = null;
        }
        
        if (this.progressIndicator) {
            ProcessingIndicator.hide(this.progressIndicator);
            this.progressIndicator = null;
        }
        
        this.isInitialized = false;
        this.isDeletionInProgress = false;
        this.onConfirmDelete = null;
        this.onCancelDelete = null;
    }
}
