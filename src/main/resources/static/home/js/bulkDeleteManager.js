import { NotificationHelper } from '../../module/notification/notificationHelper.js';
import { SelectionModeUI } from './selectionModeUI.js';
import { BulkDeleteModal } from './bulkDeleteModal.js';

/**
 * 다중 이미지 삭제 기능을 전담하는 매니저 클래스
 * 선택 모드 상태 관리, 선택된 이미지 관리, 다중 삭제 실행을 담당
 */
export class BulkDeleteManager {
    constructor() {
        // 선택 모드 상태
        this.isSelectionMode = false;
        
        // 선택된 이미지들 (Set으로 관리하여 O(1) 검색 성능)
        this.selectedImages = new Set();
        
        // 현재 지역 정보
        this.currentRegionType = null; // 'sido' | 'sigungu'
        this.currentRegionId = null;
        
        // 현재 표시된 이미지 목록 (전체 선택/해제를 위해)
        this.currentImageList = [];
        
        // 의존성 (의존성 주입으로 설정)
        this.imageManager = null;
        this.modalManager = null;
        this.mapManager = null;
        this.notificationHelper = null;
        
        // UI 관련 요소들
        this.selectionModeButton = null;
        this.selectionModeUI = new SelectionModeUI(this);
        this.bulkDeleteModal = new BulkDeleteModal();
        
        // 삭제 진행 상태
        this.isDeletingInProgress = false;
        
        // 모달 초기화 및 콜백 설정
        this.initializeModal();
    }
    
    /**
     * 의존성 주입 메서드
     * @param {Object} dependencies - 의존성 객체들
     * @param {ImageManager} dependencies.imageManager - 이미지 매니저
     * @param {ModalManager} dependencies.modalManager - 모달 매니저  
     * @param {MapManager} dependencies.mapManager - 지도 매니저
     * @param {NotificationHelper} dependencies.notificationHelper - 알림 헬퍼
     */
    setDependencies({ imageManager, modalManager, mapManager, notificationHelper }) {
        this.imageManager = imageManager;
        this.modalManager = modalManager;
        this.mapManager = mapManager;
        this.notificationHelper = notificationHelper || NotificationHelper;
    }
    
    /**
     * 선택 모드 토글 (활성화/비활성화)
     * @param {string} regionType - 지역 타입 ('sido' | 'sigungu')
     * @param {string} regionId - 지역 ID
     * @param {Array} imageList - 현재 표시된 이미지 목록
     */
    toggleSelectionMode(regionType, regionId, imageList = []) {
        if (this.isDeletingInProgress) {
            this.notificationHelper.showNotification('삭제 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.', 'warning');
            return;
        }
        
        this.currentRegionType = regionType;
        this.currentRegionId = regionId;
        this.currentImageList = imageList;
        
        if (this.isSelectionMode) {
            this.exitSelectionMode();
        } else {
            this.enterSelectionMode();
        }
    }
    
    /**
     * 선택 모드 진입
     */
    enterSelectionMode() {
        this.isSelectionMode = true;
        this.selectedImages.clear();
        
        // SelectionModeUI를 통한 UI 업데이트
        this.selectionModeUI.renderSelectionModeUI(true);
        
        // 선택 모드 버튼 텍스트 및 접근성 속성 변경
        if (this.selectionModeButton) {
            this.selectionModeButton.textContent = '선택 모드 해제';
            this.selectionModeButton.classList.remove('btn-outline-primary');
            this.selectionModeButton.classList.add('btn-outline-secondary');
            this.selectionModeButton.setAttribute('aria-pressed', 'true');
            this.selectionModeButton.setAttribute('aria-label', '선택 모드 해제. 현재 선택 모드가 활성화되어 있습니다.');
        }
    }
    
    /**
     * 선택 모드 해제
     */
    exitSelectionMode() {
        this.isSelectionMode = false;
        this.selectedImages.clear();
        
        // SelectionModeUI를 통한 UI 업데이트
        this.selectionModeUI.renderSelectionModeUI(false);
        
        // 선택 모드 버튼 텍스트 및 접근성 속성 변경
        if (this.selectionModeButton) {
            this.selectionModeButton.textContent = '선택 모드';
            this.selectionModeButton.classList.remove('btn-outline-secondary');
            this.selectionModeButton.classList.add('btn-outline-primary');
            this.selectionModeButton.setAttribute('aria-pressed', 'false');
            this.selectionModeButton.setAttribute('aria-label', '선택 모드 활성화. 여러 이미지를 선택하여 삭제할 수 있습니다.');
        }
    }
    
    /**
     * 개별 이미지 선택/해제 토글
     * @param {string} imageId - 이미지 ID
     */
    toggleImageSelection(imageId) {
        if (!this.isSelectionMode || this.isDeletingInProgress) {
            return;
        }
        
        if (this.selectedImages.has(imageId)) {
            this.selectedImages.delete(imageId);
        } else {
            this.selectedImages.add(imageId);
        }
        
        // UI 업데이트
        this.selectionModeUI.updateImageSelectionState(imageId, this.selectedImages.has(imageId));
        this.selectionModeUI.updateDeleteButtonState();
        this.updateGalleryHeader();
    }
    
    /**
     * 전체 이미지 선택
     */
    selectAll() {
        if (!this.isSelectionMode || this.isDeletingInProgress) {
            return;
        }
        
        console.log('=== selectAll 호출됨 ===');
        console.log('currentImageList 길이:', this.currentImageList.length);
        
        // 현재 DOM에 표시된 모든 이미지 카드에서 imageId 추출
        const imageCards = document.querySelectorAll('.region-image-card');
        const availableImageIds = Array.from(imageCards)
            .map(card => card.dataset.imageId)
            .filter(id => id); // undefined나 빈 문자열 제거
            
        console.log('DOM에서 찾은 이미지 IDs:', availableImageIds);
        
        // 찾은 모든 이미지 ID를 선택 목록에 추가
        availableImageIds.forEach(imageId => {
            this.selectedImages.add(imageId);
        });
        
        console.log('선택된 이미지들:', Array.from(this.selectedImages));
        
        // UI 업데이트
        this.selectionModeUI.updateAllImageSelectionStates();
        this.selectionModeUI.updateDeleteButtonState();
        this.updateGalleryHeader();
        
        this.notificationHelper.showNotification(`${this.selectedImages.size}장의 이미지를 선택했습니다.`, 'info');
    }
    
    /**
     * 전체 이미지 선택 해제
     */
    deselectAll() {
        if (!this.isSelectionMode || this.isDeletingInProgress) {
            return;
        }
        
        this.selectedImages.clear();
        
        // UI 업데이트
        this.selectionModeUI.updateAllImageSelectionStates();
        this.selectionModeUI.updateDeleteButtonState();
        this.updateGalleryHeader();
        
        this.notificationHelper.showNotification('모든 선택을 해제했습니다.', 'info');
    }
    
    /**
     * 선택된 이미지들 삭제 실행
     */
    async deleteSelectedImages() {
        if (!this.isSelectionMode) {
            this.notificationHelper.showNotification('선택 모드가 활성화되지 않았습니다.', 'warning');
            return;
        }
        
        if (this.isDeletingInProgress) {
            this.notificationHelper.showNotification('삭제 작업이 이미 진행 중입니다.', 'warning');
            return;
        }
        
        if (this.selectedImages.size === 0) {
            this.notificationHelper.showNotification('선택된 이미지가 없습니다. 먼저 삭제할 이미지를 선택해주세요.', 'warning');
            return;
        }
        
        // 선택된 이미지 정보 수집
        const selectedImageData = this.getSelectedImageData();
        
        // 삭제 확인 모달 표시
        this.bulkDeleteModal.showConfirmModal(selectedImageData);
    }
    
    /**
     * 선택된 이미지 데이터 수집
     * @returns {Array} 선택된 이미지 데이터 배열
     */
    getSelectedImageData() {
        const selectedData = [];
        
        console.log('=== getSelectedImageData 호출됨 ===');
        console.log('선택된 이미지들:', Array.from(this.selectedImages));
        console.log('currentImageList 길이:', this.currentImageList.length);
        
        this.selectedImages.forEach(imageId => {
            // DOM에서 직접 이미지 카드 정보 가져오기
            const imageCard = document.querySelector(`[data-image-id="${imageId}"]`);
            
            if (imageCard) {
                // 이미지 요소에서 썸네일 URL 추출
                const imgElement = imageCard.querySelector('img');
                const thumbnailUrl = imgElement ? imgElement.src : null;
                
                selectedData.push({
                    imageId: imageId,
                    thumbnailUrl: thumbnailUrl,
                    imageName: `이미지 ${imageId}`,
                    regionType: this.currentRegionType,
                    regionId: this.currentRegionId
                });
                
                console.log(`이미지 ${imageId} 데이터 추가됨:`, {
                    imageId,
                    thumbnailUrl,
                    regionType: this.currentRegionType,
                    regionId: this.currentRegionId
                });
            } else {
                console.warn(`이미지 카드를 찾을 수 없음: ${imageId}`);
            }
        });
        
        console.log('최종 선택된 이미지 데이터:', selectedData);
        return selectedData;
    }
    
    /**
     * 실제 삭제 실행 (모달에서 확인 후 호출)
     */
    async executeDelete() {
        if (this.isDeletingInProgress) {
            return;
        }
        
        try {
            this.isDeletingInProgress = true;
            
            // 페이지 이탈 방지 활성화
            this.enableBeforeUnloadProtection();
            
            // 모든 UI 요소 비활성화 및 사용자 입력 차단
            this.disableAllUserInteractions();
            
            // 선택된 이미지 ID 배열로 변환
            const imageIds = Array.from(this.selectedImages);
            const totalCount = imageIds.length;
            
            // 진행 상황 모달 표시
            this.bulkDeleteModal.showProgressModal(totalCount);
            
            // Promise.allSettled를 사용하여 모든 삭제 요청을 병렬 처리
            const deleteResults = await this.executeParallelDelete(imageIds);
            
            // 결과 처리
            await this.handleDeleteResults(deleteResults);
            
        } catch (error) {
            console.error('다중 삭제 중 오류 발생:', error);
            this.notificationHelper.showNotification('삭제 중 오류가 발생했습니다.', 'error');
            this.bulkDeleteModal.hideProgressModal();
        } finally {
            // 상태 초기화
            this.isDeletingInProgress = false;
            
            // 페이지 이탈 방지 비활성화
            this.disableBeforeUnloadProtection();
            
            // UI 상태 복원
            this.enableAllUserInteractions();
        }
    }
    
    /**
     * Promise.allSettled를 사용한 병렬 이미지 삭제 실행 (재시도 로직 포함)
     * @param {Array<string>} imageIds - 삭제할 이미지 ID 배열
     * @returns {Promise<Object>} 삭제 결과
     */
    async executeParallelDelete(imageIds) {
        const results = {
            successful: [],
            failed: []
        };
        
        const total = imageIds.length;
        let completed = 0;
        
        // 각 이미지별 삭제 Promise 생성 (재시도 로직 포함)
        const deletePromises = imageIds.map(async (imageId) => {
            const maxRetries = 3;
            let lastError = null;
            
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    
                    const response = await this.deleteImageWithTimeout(imageId, 10000); // 10초 타임아웃
                    
                    if (response.ok) {
                        
                        // 완료된 작업 수 증가 및 진행률 업데이트
                        completed++;
                        this.bulkDeleteModal.updateProgress(completed, total);
                        
                        return {
                            success: true,
                            imageId: imageId,
                            attempts: attempt
                        };
                    } else {
                        const errorInfo = await this.getDetailedErrorInfo(response);
                        lastError = errorInfo;
                        
                        // 권한 오류나 404 오류는 재시도하지 않음
                        if (response.status === 401 || response.status === 403 || response.status === 404) {
                            break;
                        }
                        
                        
                        // 마지막 시도가 아니면 잠시 대기 후 재시도
                        if (attempt < maxRetries) {
                            await this.delay(1000 * attempt); // 점진적 백오프
                        }
                    }
                    
                } catch (error) {
                    lastError = {
                        message: error.message,
                        type: 'network_error',
                        statusCode: null
                    };
                    
                    
                    // 마지막 시도가 아니면 잠시 대기 후 재시도
                    if (attempt < maxRetries) {
                        await this.delay(1000 * attempt); // 점진적 백오프
                    }
                }
            }
            
            // 모든 재시도 실패
            completed++;
            this.bulkDeleteModal.updateProgress(completed, total);
            
            
            return {
                success: false,
                imageId: imageId,
                reason: lastError?.message || '알 수 없는 오류',
                errorType: lastError?.type || 'unknown',
                statusCode: lastError?.statusCode,
                attempts: maxRetries
            };
        });
        
        // Promise.allSettled로 모든 삭제 요청을 병렬 처리
        const settledResults = await Promise.allSettled(deletePromises);
        
        // 결과 분류
        settledResults.forEach((settledResult, index) => {
            if (settledResult.status === 'fulfilled') {
                const result = settledResult.value;
                if (result.success) {
                    results.successful.push(result.imageId);
                } else {
                    results.failed.push({
                        imageId: result.imageId,
                        reason: result.reason,
                        errorType: result.errorType,
                        statusCode: result.statusCode,
                        attempts: result.attempts
                    });
                }
            } else {
                // Promise 자체가 reject된 경우
                const imageId = imageIds[index];
                results.failed.push({
                    imageId: imageId,
                    reason: settledResult.reason?.message || 'Promise 실행 실패',
                    errorType: 'promise_error',
                    statusCode: null,
                    attempts: 0
                });
            }
        });
        
        return results;
    }
    
    /**
     * 타임아웃이 있는 이미지 삭제 요청
     * @param {string} imageId - 이미지 ID
     * @param {number} timeout - 타임아웃 (밀리초)
     * @returns {Promise<Response>} HTTP 응답
     */
    async deleteImageWithTimeout(imageId, timeout = 10000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(`/api/images/${imageId}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json'
                },
                credentials: 'include',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('요청 시간이 초과되었습니다');
            }
            throw error;
        }
    }
    
    /**
     * HTTP 응답에서 상세한 오류 정보 추출
     * @param {Response} response - HTTP 응답 객체
     * @returns {Promise<Object>} 오류 정보 객체
     */
    async getDetailedErrorInfo(response) {
        let errorMessage = '';
        let errorType = 'http_error';
        
        try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || '';
            } else {
                const textError = await response.text();
                errorMessage = textError || '';
            }
        } catch (parseError) {
            console.warn('오류 응답 파싱 실패:', parseError);
        }
        
        // 상태 코드별 기본 메시지 및 타입 설정
        switch (response.status) {
            case 401:
                return {
                    message: '로그인이 필요합니다. 다시 로그인해주세요.',
                    type: 'auth_error',
                    statusCode: 401
                };
            case 403:
                return {
                    message: '이미지를 삭제할 권한이 없습니다.',
                    type: 'permission_error',
                    statusCode: 403
                };
            case 404:
                return {
                    message: '이미지를 찾을 수 없습니다.',
                    type: 'not_found_error',
                    statusCode: 404
                };
            case 500:
                return {
                    message: '서버 내부 오류가 발생했습니다.',
                    type: 'server_error',
                    statusCode: 500
                };
            case 503:
                return {
                    message: '서버가 일시적으로 사용할 수 없습니다.',
                    type: 'service_unavailable',
                    statusCode: 503
                };
            default:
                return {
                    message: errorMessage || `HTTP ${response.status} 오류`,
                    type: errorType,
                    statusCode: response.status
                };
        }
    }
    
    /**
     * 지연 함수 (재시도 간격 조절용)
     * @param {number} ms - 지연 시간 (밀리초)
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 삭제 결과 처리 (개선된 오류 분석 포함)
     * @param {Object} results - 삭제 결과
     */
    async handleDeleteResults(results) {
        const successCount = results.successful.length;
        const failCount = results.failed.length;
        
        // 오류 타입별 분석
        const errorAnalysis = this.analyzeDeleteErrors(results.failed);
        
        // 각 이미지별 성공/실패 결과를 수집하여 최종 결과 표시
        const failedImages = results.failed.map(failedItem => {
            const imageData = this.currentImageList.find(img => img.imageId === failedItem.imageId);
            return {
                imageId: failedItem.imageId,
                thumbnailUrl: imageData?.thumbnailUrl || imageData?.src,
                imageName: imageData?.imageName || `이미지 ${failedItem.imageId}`,
                reason: failedItem.reason,
                errorType: failedItem.errorType,
                statusCode: failedItem.statusCode,
                attempts: failedItem.attempts
            };
        });
        
        // 모달에 결과 표시
        const result = {
            success: successCount,
            failed: failCount,
            failedImages: failedImages,
            errorAnalysis: errorAnalysis
        };
        
        this.bulkDeleteModal.showResult(result);
        
        // 실패한 이미지가 있는 경우 상세 정보 로그
        if (failCount > 0) {
            console.warn('삭제 실패한 이미지들:', results.failed);
            console.warn('오류 분석:', errorAnalysis);
        }
        
        // 성공한 삭제가 있는 경우 관련 데이터 새로고침
        if (successCount > 0) {
            await this.refreshAfterDelete();
        }
        
        // 삭제 완료 후에만 UI 상태 초기화 및 선택 모드 해제
        this.resetUIStateAfterDelete();
        
        // 성공/실패 결과에 따른 상세 알림 표시
        this.showDetailedDeleteResultNotification(successCount, failCount, errorAnalysis);
    }
    
    /**
     * 삭제 오류 분석
     * @param {Array} failedResults - 실패한 삭제 결과 배열
     * @returns {Object} 오류 분석 결과
     */
    analyzeDeleteErrors(failedResults) {
        const analysis = {
            authErrors: 0,           // 인증 오류 (401)
            permissionErrors: 0,     // 권한 오류 (403)
            notFoundErrors: 0,       // 이미지 없음 (404)
            serverErrors: 0,         // 서버 오류 (500, 503)
            networkErrors: 0,        // 네트워크 오류
            unknownErrors: 0,        // 기타 오류
            totalRetries: 0          // 총 재시도 횟수
        };
        
        failedResults.forEach(failed => {
            // 재시도 횟수 누적
            if (failed.attempts) {
                analysis.totalRetries += (failed.attempts - 1); // 첫 시도 제외
            }
            
            // 오류 타입별 분류
            switch (failed.errorType) {
                case 'auth_error':
                    analysis.authErrors++;
                    break;
                case 'permission_error':
                    analysis.permissionErrors++;
                    break;
                case 'not_found_error':
                    analysis.notFoundErrors++;
                    break;
                case 'server_error':
                case 'service_unavailable':
                    analysis.serverErrors++;
                    break;
                case 'network_error':
                    analysis.networkErrors++;
                    break;
                default:
                    analysis.unknownErrors++;
                    break;
            }
        });
        
        return analysis;
    }
    
    /**
     * 삭제 완료 후 UI 상태 초기화
     */
    resetUIStateAfterDelete() {
        // 선택된 이미지 목록 초기화
        this.selectedImages.clear();
        
        // 선택 모드 해제
        this.exitSelectionMode();
        
        // UI 상태 완전 초기화
        if (this.selectionModeUI) {
            this.selectionModeUI.resetAllStates();
        }
        
    }
    
    /**
     * 상세한 삭제 결과 알림 표시 (오류 분석 포함)
     * @param {number} successCount - 성공한 삭제 개수
     * @param {number} failCount - 실패한 삭제 개수
     * @param {Object} errorAnalysis - 오류 분석 결과
     */
    showDetailedDeleteResultNotification(successCount, failCount, errorAnalysis) {
        if (successCount > 0 && failCount === 0) {
            // 모든 삭제 성공
            this.notificationHelper.showSuccess(
                `${successCount}장의 이미지를 성공적으로 삭제했습니다.`
            );
        } else if (successCount > 0 && failCount > 0) {
            // 부분 성공 - 상세한 오류 정보 제공
            let message = `${successCount}장 삭제 성공, ${failCount}장 삭제 실패`;
            
            // 주요 오류 타입 표시
            const errorMessages = [];
            if (errorAnalysis.authErrors > 0) {
                errorMessages.push(`로그인 필요 ${errorAnalysis.authErrors}장`);
            }
            if (errorAnalysis.permissionErrors > 0) {
                errorMessages.push(`권한 없음 ${errorAnalysis.permissionErrors}장`);
            }
            if (errorAnalysis.notFoundErrors > 0) {
                errorMessages.push(`이미지 없음 ${errorAnalysis.notFoundErrors}장`);
            }
            if (errorAnalysis.networkErrors > 0) {
                errorMessages.push(`네트워크 오류 ${errorAnalysis.networkErrors}장`);
            }
            if (errorAnalysis.serverErrors > 0) {
                errorMessages.push(`서버 오류 ${errorAnalysis.serverErrors}장`);
            }
            
            if (errorMessages.length > 0) {
                message += ` (${errorMessages.join(', ')})`;
            }
            
            this.notificationHelper.showNotification(message, 'warning');
            
            // 재시도 가능한 오류가 있는 경우 추가 안내
            if (errorAnalysis.networkErrors > 0 || errorAnalysis.serverErrors > 0) {
                setTimeout(() => {
                    this.notificationHelper.showInfo(
                        '네트워크 또는 서버 오류로 실패한 이미지는 나중에 다시 시도해보세요.'
                    );
                }, 1000);
            }
            
        } else if (successCount === 0 && failCount > 0) {
            // 모든 삭제 실패 - 주요 원인 분석
            let message = `${failCount}장의 이미지 삭제에 실패했습니다.`;
            
            // 가장 많은 오류 타입 확인
            const maxErrorType = this.getMostCommonErrorType(errorAnalysis);
            
            switch (maxErrorType) {
                case 'auth_error':
                    message = '로그인이 만료되었습니다. 다시 로그인 후 시도해주세요.';
                    // 인증 오류 시 로그인 페이지로 리다이렉션 제안
                    this.notificationHelper.showError(message);
                    setTimeout(() => {
                        if (confirm('로그인 페이지로 이동하시겠습니까?')) {
                            window.location.href = '/login';
                        }
                    }, 2000);
                    return; // 추가 알림 방지
                    
                case 'permission_error':
                    message = '이미지를 삭제할 권한이 없습니다. 본인의 이미지인지 확인해주세요.';
                    break;
                case 'not_found_error':
                    message = '선택한 이미지들을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.';
                    // 이미지 목록 새로고침 제안
                    this.notificationHelper.showError(message);
                    setTimeout(() => {
                        this.notificationHelper.showInfo('페이지를 새로고침하여 최신 상태를 확인하세요.');
                    }, 1500);
                    return; // 추가 알림 방지
                    
                case 'network_error':
                    message = '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인하고 다시 시도해주세요.';
                    break;
                case 'server_error':
                    message = '서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.';
                    break;
            }
            
            this.notificationHelper.showError(message);
            
            // 재시도 횟수가 많은 경우 추가 안내
            if (errorAnalysis.totalRetries > 0) {
                setTimeout(() => {
                    this.notificationHelper.showInfo(
                        `총 ${errorAnalysis.totalRetries}회 재시도했지만 실패했습니다.`
                    );
                }, 1000);
            }
        }
    }
    
    /**
     * 가장 많이 발생한 오류 타입 반환
     * @param {Object} errorAnalysis - 오류 분석 결과
     * @returns {string} 가장 많은 오류 타입
     */
    getMostCommonErrorType(errorAnalysis) {
        const errorCounts = {
            auth_error: errorAnalysis.authErrors,
            permission_error: errorAnalysis.permissionErrors,
            not_found_error: errorAnalysis.notFoundErrors,
            network_error: errorAnalysis.networkErrors,
            server_error: errorAnalysis.serverErrors,
            unknown_error: errorAnalysis.unknownErrors
        };
        
        let maxCount = 0;
        let maxType = 'unknown_error';
        
        Object.entries(errorCounts).forEach(([type, count]) => {
            if (count > maxCount) {
                maxCount = count;
                maxType = type;
            }
        });
        
        return maxType;
    }
    
    /**
     * 삭제 후 관련 데이터 새로고침
     */
    async refreshAfterDelete() {
        try {
            if (this.mapManager && typeof this.mapManager.onImageUpdated === 'function') {
                await this.mapManager.onImageUpdated();
            } else if (window.trackeryImageUpdated) {
                await window.trackeryImageUpdated();
            }
            
            if (this.imageManager) {
                this.imageManager.refreshCurrentImageList(
                    this.mapManager?.currentView,
                    this.mapManager?.currentSigunguId,
                    this.mapManager?.currentSidoId
                );
            }
            
        } catch (error) {
            console.error('삭제 후 데이터 새로고침 중 오류:', error);
            
            // 오류 발생 시 사용자에게 알림
            if (this.notificationHelper) {
                this.notificationHelper.showNotification(
                    '지도 업데이트 중 오류가 발생했습니다. 페이지를 새로고침해주세요.', 
                    'warning'
                );
            }
        }
    }
    
    /**
     * 모달 초기화 및 콜백 설정
     */
    initializeModal() {
        // 모달 초기화
        this.bulkDeleteModal.initialize();
        
        // 콜백 설정
        this.bulkDeleteModal.setCallbacks(
            // 삭제 확인 콜백
            () => {
                this.executeDelete();
            },
            // 삭제 취소 콜백
            () => {}
        );
    }
    
    /**
     * 페이지 이탈 방지 활성화 (강화된 버전)
     */
    enableBeforeUnloadProtection() {
        // beforeunload 이벤트 핸들러
        this.beforeUnloadHandler = (e) => {
            if (this.isDeletingInProgress) {
                const message = '이미지 삭제가 진행 중입니다. 페이지를 떠나면 작업이 중단될 수 있습니다.';
                e.preventDefault();
                e.returnValue = message;
                
                // 사용자에게 추가 경고 표시
                this.notificationHelper.showNotification(
                    '삭제 작업이 진행 중입니다. 페이지를 새로고침하거나 닫지 마세요.',
                    'warning'
                );
                
                return message;
            }
        };
        
        // unload 이벤트 핸들러 (추가 보호)
        this.unloadHandler = (e) => {
            if (this.isDeletingInProgress) {
                // 삭제 진행 중 페이지 이탈 시 로그 기록
                
                // 가능한 경우 서버에 중단 신호 전송 (선택적)
                if (navigator.sendBeacon) {
                    navigator.sendBeacon('/api/images/bulk-delete/cancel', JSON.stringify({
                        action: 'page_unload_during_delete',
                        timestamp: new Date().toISOString()
                    }));
                }
            }
        };
        
        // 페이지 가시성 변경 감지 (탭 전환 등)
        this.visibilityChangeHandler = () => {
            if (document.hidden && this.isDeletingInProgress) {
                this.notificationHelper.showNotification(
                    '삭제 작업이 진행 중입니다. 다른 탭으로 이동하지 마세요.',
                    'warning'
                );
            }
        };
        
        // 이벤트 리스너 등록
        window.addEventListener('beforeunload', this.beforeUnloadHandler);
        window.addEventListener('unload', this.unloadHandler);
        document.addEventListener('visibilitychange', this.visibilityChangeHandler);
        
        // 브라우저 뒤로가기 방지 (히스토리 조작)
        this.preventBackNavigation();
        
    }
    
    /**
     * 브라우저 뒤로가기 방지
     */
    preventBackNavigation() {
        // 현재 상태를 히스토리에 추가
        if (window.history && window.history.pushState) {
            window.history.pushState({ bulkDeleteInProgress: true }, '', window.location.href);
            
            // popstate 이벤트 핸들러
            this.popstateHandler = (e) => {
                if (this.isDeletingInProgress) {
                    // 뒤로가기 시도 시 다시 앞으로 이동
                    window.history.pushState({ bulkDeleteInProgress: true }, '', window.location.href);
                    
                    this.notificationHelper.showNotification(
                        '삭제 작업이 진행 중입니다. 뒤로가기를 할 수 없습니다.',
                        'warning'
                    );
                }
            };
            
            window.addEventListener('popstate', this.popstateHandler);
        }
    }
    
    /**
     * 페이지 이탈 방지 비활성화 (강화된 버전)
     */
    disableBeforeUnloadProtection() {
        // 모든 이벤트 핸들러 제거
        if (this.beforeUnloadHandler) {
            window.removeEventListener('beforeunload', this.beforeUnloadHandler);
            this.beforeUnloadHandler = null;
        }
        
        if (this.unloadHandler) {
            window.removeEventListener('unload', this.unloadHandler);
            this.unloadHandler = null;
        }
        
        if (this.visibilityChangeHandler) {
            document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
            this.visibilityChangeHandler = null;
        }
        
        if (this.popstateHandler) {
            window.removeEventListener('popstate', this.popstateHandler);
            this.popstateHandler = null;
        }
        
        // 히스토리 상태 정리 (가능한 경우)
        if (window.history && window.history.state && window.history.state.bulkDeleteInProgress) {
            try {
                window.history.replaceState(null, '', window.location.href);
            } catch (error) {
                console.warn('히스토리 상태 정리 실패:', error);
            }
        }
        
    }
    
    /**
     * 모든 사용자 상호작용 비활성화
     */
    disableAllUserInteractions() {
        // SelectionModeUI를 통한 컨트롤 비활성화
        this.selectionModeUI.disableAllControls();
        
        // 전역 오버레이 생성하여 모든 클릭 차단
        this.createGlobalOverlay();
        
        // 키보드 이벤트 차단
        this.disableKeyboardEvents();
        
    }
    
    /**
     * 모든 사용자 상호작용 활성화
     */
    enableAllUserInteractions() {
        // SelectionModeUI를 통한 컨트롤 활성화
        this.selectionModeUI.enableAllControls();
        
        // 전역 오버레이 제거
        this.removeGlobalOverlay();
        
        // 키보드 이벤트 활성화
        this.enableKeyboardEvents();
        
    }
    
    /**
     * 전역 오버레이 생성 (모든 클릭 차단)
     */
    createGlobalOverlay() {
        if (this.globalOverlay) {
            return; // 이미 존재하면 중복 생성 방지
        }
        
        this.globalOverlay = document.createElement('div');
        this.globalOverlay.id = 'bulk-delete-global-overlay';
        this.globalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.1);
            z-index: 9998;
            cursor: not-allowed;
            pointer-events: all;
        `;
        
        // 클릭 이벤트 차단
        this.globalOverlay.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.notificationHelper.showNotification('삭제 작업이 진행 중입니다. 잠시만 기다려주세요.', 'warning');
        });
        
        document.body.appendChild(this.globalOverlay);
    }
    
    /**
     * 전역 오버레이 제거
     */
    removeGlobalOverlay() {
        if (this.globalOverlay) {
            document.body.removeChild(this.globalOverlay);
            this.globalOverlay = null;
        }
    }
    
    /**
     * 키보드 이벤트 비활성화
     */
    disableKeyboardEvents() {
        this.keyboardEventHandler = (e) => {
            // ESC, Enter, Space 등 주요 키 차단
            if (['Escape', 'Enter', ' ', 'Tab'].includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();
                this.notificationHelper.showNotification('삭제 작업이 진행 중입니다. 잠시만 기다려주세요.', 'warning');
            }
        };
        
        document.addEventListener('keydown', this.keyboardEventHandler, true);
    }
    
    /**
     * 키보드 이벤트 활성화
     */
    enableKeyboardEvents() {
        if (this.keyboardEventHandler) {
            document.removeEventListener('keydown', this.keyboardEventHandler, true);
            this.keyboardEventHandler = null;
        }
    }
    
    /**
     * ImageManager와의 연동을 위한 갤러리 헤더 업데이트 요청
     */
    updateGalleryHeader() {
        if (this.imageManager) {
            const selectedCount = this.selectedImages.size;
            const totalCount = this.currentImageList.length;
            this.imageManager.updateGalleryHeader(selectedCount, totalCount);
        }
    }
    
    /**
     * 특정 이미지가 선택되어 있는지 확인
     * @param {string} imageId - 이미지 ID
     * @returns {boolean} 선택 여부
     */
    isImageSelected(imageId) {
        return this.selectedImages.has(imageId);
    }
    
    /**
     * 선택 모드 상태 반환
     * @returns {boolean} 선택 모드 활성화 여부
     */
    getIsSelectionMode() {
        return this.isSelectionMode;
    }
    
    /**
     * 선택된 이미지 개수 반환
     * @returns {number} 선택된 이미지 개수
     */
    getSelectedCount() {
        return this.selectedImages.size;
    }
    
    /**
     * 삭제 진행 상태 반환
     * @returns {boolean} 삭제 진행 중 여부
     */
    getIsDeletingInProgress() {
        return this.isDeletingInProgress;
    }
    
    /**
     * 현재 이미지 목록 업데이트
     * @param {Array} imageList - 새로운 이미지 목록
     */
    updateCurrentImageList(imageList) {
        this.currentImageList = imageList || [];
        
        // 선택 모드가 활성화된 상태에서 이미지 목록이 변경되면
        // 존재하지 않는 이미지는 선택에서 제거
        if (this.isSelectionMode) {
            const currentImageIds = new Set(this.currentImageList.map(img => img.imageId));
            const selectedToRemove = [];
            
            this.selectedImages.forEach(imageId => {
                if (!currentImageIds.has(imageId)) {
                    selectedToRemove.push(imageId);
                }
            });
            
            selectedToRemove.forEach(imageId => {
                this.selectedImages.delete(imageId);
            });
            
            this.selectionModeUI.updateDeleteButtonState();
        }
    }
    
    /**
     * 현재 지역 정보 설정
     * @param {string} regionType - 지역 타입 ('sido' | 'sigungu')
     * @param {string} regionId - 지역 ID
     */
    setCurrentRegion(regionType, regionId) {
        this.currentRegionType = regionType;
        this.currentRegionId = regionId;
    }
    
    /**
     * 갤러리 컨테이너 설정
     * @param {HTMLElement} container - 갤러리 컨테이너 요소
     */
    setGalleryContainer(container) {
        this.galleryContainer = container;
        
        if (this.selectionModeUI) {
            this.selectionModeUI.setGalleryContainer(container);
        }
    }
    
    /**
     * 선택 모드 버튼 설정
     * @param {HTMLElement} button - 선택 모드 버튼 요소
     */
    setSelectionModeButton(button) {
        this.selectionModeButton = button;
        
        if (button) {
            button.setAttribute('aria-pressed', 'false');
            button.setAttribute('aria-label', '선택 모드 활성화. 여러 이미지를 선택하여 삭제할 수 있습니다.');
            button.setAttribute('role', 'switch');
        }
    }
}
