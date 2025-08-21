// 처리 중 표시 UI 모듈
export const ProcessingIndicator = {
    // 처리 중 표시 UI 생성 및 표시
    show(message = "처리하는 중입니다...") {
        const indicator = document.createElement('div');
        indicator.className = 'processing-indicator';
        indicator.innerHTML = `
            <div class="processing-content">
                <div class="spinner-border text-primary" role="status" aria-hidden="true"></div>
                <h4 class="processing-message">${message}</h4>
                <div class="progress-info">
                    <div class="progress-text">
                        <span class="current-count">0</span> / <span class="total-count">0</span> 완료
                    </div>
                    <div class="progress progress-sm mb-2">
                        <div class="progress-bar" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <div class="progress-percentage text-secondary">0%</div>
                </div>
            </div>
        `;

        document.body.appendChild(indicator);

        // 애니메이션 효과
        requestAnimationFrame(() => {
            indicator.style.opacity = '1';
        });

        return indicator;
    },

    // 진행률 업데이트
    updateProgress(indicator, currentCount, totalCount) {
        if (!indicator) return;

        const percentage = Math.round((currentCount / totalCount) * 100);

        const currentCountElement = indicator.querySelector('.current-count');
        const totalCountElement = indicator.querySelector('.total-count');
        const progressBar = indicator.querySelector('.progress-bar');
        const progressPercentage = indicator.querySelector('.progress-percentage');

        if (currentCountElement) currentCountElement.textContent = currentCount;
        if (totalCountElement) totalCountElement.textContent = totalCount;
        if (progressBar) {
            progressBar.style.width = percentage + '%';
            progressBar.setAttribute('aria-valuenow', percentage);
        }
        if (progressPercentage) progressPercentage.textContent = percentage + '%';
    },

    // 처리 시작 시 총 개수 설정
    initializeProgress(indicator, totalCount) {
        if (!indicator) return;

        const totalCountElement = indicator.querySelector('.total-count');
        if (totalCountElement) totalCountElement.textContent = totalCount;

        this.updateProgress(indicator, 0, totalCount);
    },

    // 처리 중 표시 UI 제거
    hide(indicator) {
        if (indicator) {
            indicator.style.opacity = '0';
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.parentNode.removeChild(indicator);
                }
            }, 300);
        }
    },

    // 메시지만 표시하는 간단한 버전 (진행률 없음)
    showSimple(message = "처리하는 중입니다...") {
        const indicator = document.createElement('div');
        indicator.className = 'processing-indicator';
        indicator.innerHTML = `
            <div class="processing-content">
                <div class="spinner-border text-primary" role="status" aria-hidden="true"></div>
                <h4 class="processing-message">${message}</h4>
            </div>
        `;

        document.body.appendChild(indicator);

        // 애니메이션 효과
        requestAnimationFrame(() => {
            indicator.style.opacity = '1';
        });

        return indicator;
    },

    // 메시지 업데이트
    updateMessage(indicator, message) {
        if (!indicator) return;

        const messageElement = indicator.querySelector('.processing-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
    },

    // 결과 표시 기능이 포함된 처리 중 표시
    showWithResult(message = "처리하는 중입니다...", type = "process") {
        const indicator = document.createElement('div');
        indicator.className = `processing-indicator ${type}-indicator`;
        indicator.innerHTML = `
            <div class="processing-content">
                <div class="spinner-border text-primary" role="status" aria-hidden="true"></div>
                <h4 class="processing-message">${message}</h4>
                <div class="processing-submessage">잠시만 기다려주세요...</div>
                <div class="progress-info">
                    <div class="progress-text">
                        <span class="current-count">0</span> / <span class="total-count">0</span> 완료
                    </div>
                    <div class="progress progress-sm mb-2">
                        <div class="progress-bar" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <div class="progress-percentage text-secondary">0%</div>
                </div>
                
                <!-- 결과 표시 영역 (초기에는 숨김) -->
                <div class="result-block" style="display: none;">
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
                        <div class="result-main-title">작업 완료!</div>
                        <div class="result-main-message success-message">작업을 성공적으로 완료했습니다.</div>
                    </div>

                    <!-- 실패 결과 -->
                    <div class="result-failed-container" style="display: none;">
                        <div class="result-icon-large warning">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"
                                stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round"
                                stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                <path d="M12 9v2m0 4v.01"></path>
                                <path d="M5 19h14a2 2 0 0 0 1.84 -2.75l-7.1 -12.25a2 2 0 0 0 -3.5 0l-7.1 12.25a2 2 0 0 0 1.75 2.75"></path>
                            </svg>
                        </div>
                        <div class="result-warning-title">일부 작업 실패</div>
                        <div class="result-warning-message failed-message">일부 항목의 작업이 실패했습니다.</div>
                    </div>

                    <!-- 실패한 항목 갤러리 -->
                    <div class="failed-items-section" style="display: none;">
                        <div class="failed-items-header">
                            <div class="failed-items-icon">
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
                            <div class="failed-items-title">작업에 실패한 항목</div>
                        </div>
                        <div class="failed-items-gallery"></div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(indicator);

        // 애니메이션 효과
        requestAnimationFrame(() => {
            indicator.style.opacity = '1';
        });

        return indicator;
    },

    // 작업 결과 표시
    showResult(indicator, successCount, failedCount, failedItems = [], options = {}) {
        if (!indicator) return;

        // 진행률 관련 요소들을 모두 숨김
        const progressInfo = indicator.querySelector('.progress-info');
        const processingMessage = indicator.querySelector('.processing-message');
        const processingSubmessage = indicator.querySelector('.processing-submessage');
        const spinner = indicator.querySelector('.spinner-border');
        const resultBlock = indicator.querySelector('.result-block');
        const failedContainer = indicator.querySelector('.result-failed-container');
        const failedSection = indicator.querySelector('.failed-items-section');

        // 로딩 관련 요소들 숨기기
        if (progressInfo) progressInfo.style.display = 'none';
        if (processingMessage) processingMessage.style.display = 'none';
        if (processingSubmessage) processingSubmessage.style.display = 'none';
        if (spinner) spinner.style.display = 'none';
        
        // 결과 블록 표시
        if (resultBlock) resultBlock.style.display = 'block';

        // 성공 메시지 업데이트
        const successMessage = indicator.querySelector('.success-message');
        if (successMessage && options.successMessage) {
            successMessage.textContent = options.successMessage;
        } else if (successMessage) {
            successMessage.textContent = `${successCount}개의 항목을 성공적으로 처리했습니다.`;
        }

        // 실패가 있는 경우
        if (failedCount > 0) {
            if (failedContainer) failedContainer.style.display = 'block';
            
            const failedMessage = indicator.querySelector('.failed-message');
            if (failedMessage && options.failedMessage) {
                failedMessage.textContent = options.failedMessage;
            } else if (failedMessage) {
                failedMessage.textContent = `${failedCount}개의 항목이 실패했습니다.`;
            }

            // 실패한 항목 표시
            if (failedItems.length > 0 && failedSection) {
                failedSection.style.display = 'block';
                this.addFailedItemsToGallery(indicator, failedItems);
            }
        }
    },

    // 실패한 항목들을 갤러리에 추가
    addFailedItemsToGallery(indicator, failedItems) {
        const gallery = indicator.querySelector('.failed-items-gallery');
        if (!gallery) return;

        gallery.innerHTML = '';
        
        failedItems.forEach(itemData => {
            const item = document.createElement('div');
            item.className = 'failed-item';
            
            // 이미지인 경우
            if (itemData.src || itemData.type === 'image') {
                item.innerHTML = `
                    <img src="${itemData.src}" alt="실패한 이미지" class="failed-item-thumbnail">
                `;
            } else {
                // 일반 항목인 경우
                item.innerHTML = `
                    <div class="failed-item-text">
                        <span class="failed-item-name">${itemData.name || itemData.title || '알 수 없는 항목'}</span>
                        ${itemData.reason ? `<small class="failed-item-reason">${itemData.reason}</small>` : ''}
                    </div>
                `;
            }
            
            gallery.appendChild(item);
        });
    }
};