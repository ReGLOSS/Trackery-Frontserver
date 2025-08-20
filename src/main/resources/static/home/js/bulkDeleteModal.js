/**
 * 다중 삭제 확인 및 진행 상황 모달 관리 클래스
 * 기존 이미지 첨부 모달의 디자인을 활용하여 일관된 UI 제공
 */
export class BulkDeleteModal {
    constructor() {
        this.confirmModal = null;
        this.progressModal = null;
        this.isInitialized = false;
        this.isDeletionInProgress = false;
        this.keydownHandler = null;
        
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
        this.createProgressModal();
        this.bindEvents();
        this.isInitialized = true;
    }

    /**
     * 삭제 확인 모달 생성 (기존 이미지 첨부 모달 디자인 활용)
     */
    createConfirmModal() {
        const modalHtml = `
            <div class="bulk-delete-confirm-modal" id="bulkDeleteConfirmModal" 
                 style="display: none;" 
                 role="dialog" 
                 aria-modal="true" 
                 aria-labelledby="deleteModalTitle" 
                 aria-describedby="deleteModalDesc">
                <div class="modal-overlay" id="bulkDeleteConfirmOverlay"></div>
                <div class="image-select-container">
                    <div class="image-select-header">
                        <h3 id="deleteModalTitle">선택된 이미지 삭제</h3>
                        <button class="modal-close-btn" id="bulkDeleteConfirmClose" 
                                aria-label="모달 닫기" 
                                type="button">&times;</button>
                    </div>
                    <div class="image-select-body">
                        <div class="delete-warning" id="deleteModalDesc">
                            <div class="warning-icon" aria-hidden="true">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"
                                    stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round"
                                    stroke-linejoin="round" role="img" aria-label="경고">
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                    <path d="M12 9v2m0 4v.01"></path>
                                    <path d="M5 19h14a2 2 0 0 0 1.84 -2.75l-7.1 -12.25a2 2 0 0 0 -3.5 0l-7.1 12.25a2 2 0 0 0 1.75 2.75"></path>
                                </svg>
                            </div>
                            <p><strong id="deleteImageCount" aria-live="polite">0</strong>장의 이미지를 삭제하시겠습니까?</p>
                            <small role="alert">삭제된 이미지는 복구할 수 없습니다.</small>
                        </div>
                        <div class="selected-images-preview" id="selectedImagesPreview" style="display: none;">
                            <h4 id="previewTitle">삭제될 이미지</h4>
                            <div class="preview-gallery" id="deletePreviewGallery" 
                                 role="grid" 
                                 aria-labelledby="previewTitle"
                                 aria-describedby="previewDesc"></div>
                            <div id="previewDesc" class="sr-only">삭제될 이미지들의 미리보기입니다. 각 이미지는 썸네일로 표시됩니다.</div>
                        </div>
                        <div class="modal-actions" role="group" aria-label="삭제 확인 액션">
                            <button class="btn btn-secondary" id="cancelDeleteBtn" type="button"
                                    aria-describedby="cancelDeleteDesc">취소</button>
                            <button class="btn btn-danger" id="confirmDeleteBtn" type="button"
                                    aria-describedby="confirmDeleteDesc">삭제</button>
                            <!-- 스크린 리더용 설명 -->
                            <div class="sr-only">
                                <div id="cancelDeleteDesc">삭제를 취소하고 모달을 닫습니다.</div>
                                <div id="confirmDeleteDesc">선택된 이미지들을 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.confirmModal = document.getElementById('bulkDeleteConfirmModal');
    }

    /**
     * 삭제 진행 상황 모달 생성 (기존 업로드 처리중 모달 디자인 활용)
     */
    createProgressModal() {
        const modalHtml = `
            <div class="bulk-delete-progress-modal" id="bulkDeleteProgressModal" 
                 style="display: none;" 
                 role="dialog" 
                 aria-modal="true" 
                 aria-labelledby="progressModalTitle" 
                 aria-describedby="progressModalDesc">
                <div class="uploading-modal-content">
                    <div id="deletingBlock" class="uploading-block">
                        <div class="spinner-border" role="status" aria-label="삭제 진행 중">
                            <span class="visually-hidden">삭제 중...</span>
                        </div>
                        <div class="uploading-message" id="progressModalTitle">이미지를 삭제하는 중입니다</div>
                        <div class="uploading-submessage" id="progressModalDesc">
                            <span id="deleteProgress" aria-live="polite">0</span> / <span id="deleteTotal">0</span> 완료
                        </div>
                        <div class="progress-bar" role="progressbar" 
                             aria-valuemin="0" 
                             aria-valuemax="100" 
                             aria-valuenow="0" 
                             aria-label="삭제 진행률">
                            <div class="progress-fill" id="deleteProgressFill" style="width: 0%;"></div>
                        </div>
                    </div>

                    <div id="deleteResultBlock" class="result-block" style="display: none;">
                        <!-- 성공 결과 -->
                        <div class="result-success-container">
                            <div class="result-icon-large success">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"
                                    stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round"
                                    stroke-linejoin="round">
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                    <path d="M5 12l5 5l10 -10"></path>
                                </svg>
                            </div>
                            <div class="result-main-title">삭제 완료!</div>
                            <div class="result-main-message" id="deletedImageCount">
                                0장의 이미지를 성공적으로 삭제했습니다.
                            </div>
                        </div>

                        <!-- 실패 결과 (부분 실패 시) -->
                        <div id="failedDeleteInfoGroup" class="result-failed-container" style="display: none;">
                            <div class="result-icon-large warning">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"
                                    stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round"
                                    stroke-linejoin="round">
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                    <path d="M12 9v2m0 4v.01"></path>
                                    <path d="M5 19h14a2 2 0 0 0 1.84 -2.75l-7.1 -12.25a2 2 0 0 0 -3.5 0l-7.1 12.25a2 2 0 0 0 1.75 2.75"></path>
                                </svg>
                            </div>
                            <div class="result-warning-title">일부 삭제 실패</div>
                            <div class="result-warning-message" id="deleteFailedImageCount">
                                0장의 이미지는 삭제에 실패했습니다.
                            </div>
                        </div>

                        <!-- 실패한 이미지 갤러리 -->
                        <div class="failed-images-section" id="failedImagesSection" style="display: none;">
                            <div class="failed-images-header">
                                <div class="failed-images-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                                        stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round"
                                        stroke-linejoin="round">
                                        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                        <path d="M15 8h.01"></path>
                                        <path d="M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-12z"></path>
                                        <path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5"></path>
                                        <path d="M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3"></path>
                                    </svg>
                                </div>
                                <div class="failed-images-title">삭제에 실패한 이미지</div>
                            </div>
                            <div id="deleteFailedGallery" class="uploading-modal-gallery"></div>
                        </div>

                        <!-- 완료 버튼 -->
                        <div class="modal-actions" style="margin-top: 1.5rem;">
                            <button class="btn btn-primary" id="deleteCompleteBtn">확인</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.progressModal = document.getElementById('bulkDeleteProgressModal');
    }

    /**
     * 이벤트 바인딩
     */
    bindEvents() {
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

        // 진행 상황 모달 완료 버튼
        const completeBtn = document.getElementById('deleteCompleteBtn');
        completeBtn?.addEventListener('click', () => this.hideProgressModal());

        // 진행 상황 모달 오버레이 클릭 방지
        const progressModal = document.getElementById('bulkDeleteProgressModal');
        if (progressModal) {
            progressModal.addEventListener('click', (e) => {
                // 진행 중일 때는 모달 외부 클릭으로 닫기 방지
                if (this.isDeletionInProgress) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        }

        // 키보드 이벤트 처리
        this.keydownHandler = (e) => {
            if (this.confirmModal && this.confirmModal.style.display !== 'none') {
                this.handleConfirmModalKeydown(e);
            } else if (this.progressModal && this.progressModal.style.display !== 'none') {
                this.handleProgressModalKeydown(e);
            }
        };
        
        document.addEventListener('keydown', this.keydownHandler);
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
            countElement.textContent = selectedImages.length;
        }

        // 미리보기 갤러리 생성
        this.createPreviewGallery(selectedImages);

        // 모달 표시
        this.confirmModal.style.display = 'flex';
        
        // 접근성 설정
        this.setupModalAccessibility(this.confirmModal, 'deleteModalTitle', 'deleteModalDesc');
        
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
        
        // 접근성 속성 제거
        this.removeModalAccessibility();
        
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

        // 초기 상태 설정
        this.resetProgressModal();
        
        // 총 개수 설정
        const totalElement = document.getElementById('deleteTotal');
        if (totalElement) {
            totalElement.textContent = totalCount;
        }

        // 진행 블록 표시, 결과 블록 숨기기
        const deletingBlock = document.getElementById('deletingBlock');
        const resultBlock = document.getElementById('deleteResultBlock');
        
        if (deletingBlock) deletingBlock.style.display = 'flex';
        if (resultBlock) resultBlock.style.display = 'none';

        // 모든 UI 요소 비활성화
        this.disableAllUIElements();

        // 모달 표시
        this.progressModal.style.display = 'flex';
        this.progressModal.setAttribute('data-deletion-in-progress', 'true');
        
        // 접근성 설정
        this.setupModalAccessibility(this.progressModal, 'progressModalTitle', 'progressModalDesc');
        
        setTimeout(() => {
            this.progressModal.classList.add('show');
        }, 10);

        // 페이지 이탈 방지
        this.preventPageUnload();
    }

    /**
     * 진행률 업데이트
     * @param {number} current - 현재 처리된 개수
     * @param {number} total - 총 개수
     */
    updateProgress(current, total) {
        const progressElement = document.getElementById('deleteProgress');
        const progressFill = document.getElementById('deleteProgressFill');
        const progressBar = document.querySelector('.progress-bar[role="progressbar"]');
        
        if (progressElement) {
            progressElement.textContent = current;
        }
        
        if (progressFill && progressBar) {
            const percentage = total > 0 ? (current / total) * 100 : 0;
            progressFill.style.width = `${percentage}%`;
            
            // 접근성 속성 업데이트
            progressBar.setAttribute('aria-valuenow', Math.round(percentage));
            progressBar.setAttribute('aria-valuetext', `${current}개 중 ${total}개 완료, ${Math.round(percentage)}%`);
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
        this.progressModal.removeAttribute('data-deletion-in-progress');

        const deletingBlock = document.getElementById('deletingBlock');
        const resultBlock = document.getElementById('deleteResultBlock');
        const failedContainer = document.getElementById('failedDeleteInfoGroup');
        const failedSection = document.getElementById('failedImagesSection');
        
        // 진행 블록 숨기고 결과 블록 표시
        if (deletingBlock) deletingBlock.style.display = 'none';
        if (resultBlock) resultBlock.style.display = 'block';

        // 성공 메시지 업데이트
        const successCountElement = document.getElementById('deletedImageCount');
        if (successCountElement) {
            if (result.success > 0) {
                successCountElement.textContent = `${result.success}장의 이미지를 성공적으로 삭제했습니다.`;
            } else {
                successCountElement.textContent = '삭제된 이미지가 없습니다.';
            }
        }

        // 실패가 있는 경우
        if (result.failed > 0 && result.failedImages) {
            // 실패 정보 표시 (상세한 오류 분석 포함)
            if (failedContainer) {
                failedContainer.style.display = 'block';
                const failedCountElement = document.getElementById('deleteFailedImageCount');
                if (failedCountElement) {
                    let failedMessage = `${result.failed}장의 이미지는 삭제에 실패했습니다.`;
                    
                    // 오류 분석이 있는 경우 상세 정보 추가
                    if (result.errorAnalysis) {
                        const errorDetails = this.getErrorAnalysisMessage(result.errorAnalysis);
                        if (errorDetails) {
                            failedMessage += ` ${errorDetails}`;
                        }
                    }
                    
                    failedCountElement.textContent = failedMessage;
                }
            }

            // 실패한 이미지 갤러리 표시 (개선된 툴팁 포함)
            if (failedSection && result.failedImages.length > 0) {
                failedSection.style.display = 'block';
                this.createEnhancedFailedImagesGallery(result.failedImages);
            }
        } else {
            // 모든 삭제가 성공한 경우 실패 관련 요소 숨기기
            if (failedContainer) failedContainer.style.display = 'none';
            if (failedSection) failedSection.style.display = 'none';
        }

        // UI 요소 다시 활성화
        this.enableAllUIElements();

        // 페이지 이탈 방지 해제
        this.allowPageUnload();
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
     * 개선된 실패한 이미지 갤러리 생성 (상세한 오류 정보 포함)
     * @param {Array} failedImages - 실패한 이미지 배열
     */
    createEnhancedFailedImagesGallery(failedImages) {
        const gallery = document.getElementById('deleteFailedGallery');
        if (!gallery) return;

        gallery.innerHTML = '';

        failedImages.forEach(image => {
            // 이미지 컨테이너 생성
            const imageContainer = document.createElement('div');
            imageContainer.className = 'failed-image-container';
            imageContainer.style.cssText = `
                position: relative;
                display: inline-block;
                margin: 4px;
            `;
            
            // 이미지 요소 생성
            const imageElement = document.createElement('img');
            imageElement.src = image.thumbnailUrl || image.src;
            imageElement.alt = image.imageName || '실패한 이미지';
            imageElement.className = 'uploading-modal-gallery-image failed-image';
            
            // 오류 타입에 따른 스타일링
            const errorTypeClass = this.getErrorTypeClass(image.errorType);
            imageElement.classList.add(errorTypeClass);
            
            // 상세한 툴팁 메시지 생성
            const tooltipMessage = this.createDetailedTooltipMessage(image);
            imageElement.title = tooltipMessage;
            
            // 오류 아이콘 오버레이 생성
            const errorOverlay = document.createElement('div');
            errorOverlay.className = 'error-overlay';
            errorOverlay.style.cssText = `
                position: absolute;
                top: 2px;
                right: 2px;
                width: 16px;
                height: 16px;
                background-color: rgba(220, 53, 69, 0.9);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 10px;
                font-weight: bold;
            `;
            
            // 오류 타입에 따른 아이콘 설정
            errorOverlay.textContent = this.getErrorIcon(image.errorType);
            errorOverlay.title = this.getErrorTypeDescription(image.errorType);
            
            // 재시도 횟수 표시 (재시도가 있었던 경우)
            if (image.attempts && image.attempts > 1) {
                const retryBadge = document.createElement('div');
                retryBadge.className = 'retry-badge';
                retryBadge.style.cssText = `
                    position: absolute;
                    bottom: 2px;
                    left: 2px;
                    background-color: rgba(255, 193, 7, 0.9);
                    color: #000;
                    font-size: 8px;
                    padding: 1px 3px;
                    border-radius: 2px;
                    font-weight: bold;
                `;
                retryBadge.textContent = `${image.attempts}회`;
                retryBadge.title = `${image.attempts}회 시도 후 실패`;
                
                imageContainer.appendChild(retryBadge);
            }
            
            // 요소들 조립
            imageContainer.appendChild(imageElement);
            imageContainer.appendChild(errorOverlay);
            gallery.appendChild(imageContainer);
        });
    }
    
    /**
     * 오류 타입에 따른 CSS 클래스 반환
     * @param {string} errorType - 오류 타입
     * @returns {string} CSS 클래스명
     */
    getErrorTypeClass(errorType) {
        const classMap = {
            'auth_error': 'error-auth',
            'permission_error': 'error-permission',
            'not_found_error': 'error-not-found',
            'network_error': 'error-network',
            'server_error': 'error-server',
            'service_unavailable': 'error-server'
        };
        
        return classMap[errorType] || 'error-unknown';
    }
    
    /**
     * 오류 타입에 따른 아이콘 반환
     * @param {string} errorType - 오류 타입
     * @returns {string} 아이콘 문자
     */
    getErrorIcon(errorType) {
        const iconMap = {
            'auth_error': '🔒',
            'permission_error': '🚫',
            'not_found_error': '❓',
            'network_error': '📡',
            'server_error': '⚠️',
            'service_unavailable': '⚠️'
        };
        
        return iconMap[errorType] || '❌';
    }
    
    /**
     * 오류 타입 설명 반환
     * @param {string} errorType - 오류 타입
     * @returns {string} 오류 타입 설명
     */
    getErrorTypeDescription(errorType) {
        const descriptionMap = {
            'auth_error': '인증 오류 - 로그인이 필요합니다',
            'permission_error': '권한 오류 - 삭제 권한이 없습니다',
            'not_found_error': '이미지 없음 - 이미지를 찾을 수 없습니다',
            'network_error': '네트워크 오류 - 연결에 문제가 있습니다',
            'server_error': '서버 오류 - 서버에 문제가 있습니다',
            'service_unavailable': '서비스 불가 - 서버가 일시적으로 사용할 수 없습니다'
        };
        
        return descriptionMap[errorType] || '알 수 없는 오류';
    }
    
    /**
     * 상세한 툴팁 메시지 생성
     * @param {Object} image - 실패한 이미지 정보
     * @returns {string} 상세한 툴팁 메시지
     */
    createDetailedTooltipMessage(image) {
        let message = `이미지: ${image.imageName || image.imageId}\n`;
        message += `오류: ${image.reason || '알 수 없는 오류'}\n`;
        
        if (image.errorType) {
            message += `타입: ${this.getErrorTypeDescription(image.errorType)}\n`;
        }
        
        if (image.statusCode) {
            message += `상태 코드: ${image.statusCode}\n`;
        }
        
        if (image.attempts && image.attempts > 1) {
            message += `재시도: ${image.attempts}회 시도`;
        }
        
        return message;
    }

    /**
     * 진행 상황 모달 초기화
     */
    resetProgressModal() {
        // 진행률 초기화
        this.updateProgress(0, 0);
        
        // 결과 관련 요소 숨기기
        const failedContainer = document.getElementById('failedDeleteInfoGroup');
        const failedSection = document.getElementById('failedImagesSection');
        
        if (failedContainer) failedContainer.style.display = 'none';
        if (failedSection) failedSection.style.display = 'none';
    }

    /**
     * 진행 상황 모달 숨기기
     */
    hideProgressModal() {
        if (!this.progressModal) return;

        // 삭제 진행 상태 해제
        this.isDeletionInProgress = false;
        this.progressModal.removeAttribute('data-deletion-in-progress');

        this.progressModal.classList.remove('show');
        
        setTimeout(() => {
            this.progressModal.style.display = 'none';
        }, 300);

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
     * 확인 모달 키보드 이벤트 처리 (기본 ESC 키만)
     * @param {KeyboardEvent} e - 키보드 이벤트
     */
    handleConfirmModalKeydown(e) {
        if (e.key === 'Escape' && !this.isDeletionInProgress) {
            e.preventDefault();
            this.hideConfirmModal();
        }
    }
    
    /**
     * 진행 상황 모달 키보드 이벤트 처리 (ESC 키 방지)
     * @param {KeyboardEvent} e - 키보드 이벤트
     */
    handleProgressModalKeydown(e) {
        if (e.key === 'Escape' && this.isDeletionInProgress) {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    /**
     * 모달 접근성 속성 설정
     * @param {HTMLElement} modal - 모달 요소
     * @param {string} titleId - 제목 요소 ID
     * @param {string} descId - 설명 요소 ID
     */
    setupModalAccessibility(modal, titleId, descId) {
        if (!modal) return;
        
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', titleId);
        modal.setAttribute('aria-describedby', descId);
        
        // 모달이 열릴 때 배경 요소들을 스크린 리더에서 숨김
        const mainContent = document.querySelector('main, .main-content, body > *:not(.bulk-delete-confirm-modal):not(.bulk-delete-progress-modal)');
        if (mainContent) {
            mainContent.setAttribute('aria-hidden', 'true');
        }
    }
    
    /**
     * 모달 접근성 속성 제거
     */
    removeModalAccessibility() {
        // 배경 요소들을 다시 스크린 리더에서 보이도록 함
        const hiddenElements = document.querySelectorAll('[aria-hidden="true"]');
        hiddenElements.forEach(element => {
            if (!element.classList.contains('bulk-delete-confirm-modal') && 
                !element.classList.contains('bulk-delete-progress-modal')) {
                element.removeAttribute('aria-hidden');
            }
        });
    }
    
    /**
     * 리소스 정리
     */
    destroy() {
        this.hideAllModals();
        this.allowPageUnload();
        this.enableAllUIElements();
        this.removeModalAccessibility();
        
        // 이벤트 리스너 제거
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }
        
        if (this.confirmModal) {
            this.confirmModal.remove();
            this.confirmModal = null;
        }
        
        if (this.progressModal) {
            this.progressModal.remove();
            this.progressModal = null;
        }
        
        this.isInitialized = false;
        this.isDeletionInProgress = false;
        this.onConfirmDelete = null;
        this.onCancelDelete = null;
    }
}
