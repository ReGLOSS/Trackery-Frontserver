/**
 * 태그 UI 관리 모듈
 * 다양한 화면에서 태그 입력, 표시, 편집 기능을 제공하는 통합 UI 관리자
 */

export class TagUIManager {
    constructor(containerSelector, options = {}) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) {
            throw new Error(`TagUIManager: 컨테이너를 찾을 수 없습니다: ${containerSelector}`);
        }
        
        this.options = {
            editMode: false,
            allowCustomTags: true,
            maxTags: null,
            onTagAdd: null,
            onTagRemove: null,
            onTagsChange: null,
            ...options
        };
        
        this.originalTags = [];
        this.initializeElements();
        this.setupEventListeners();
    }
    
    /**
     * DOM 엘리먼트 초기화
     */
    initializeElements() {
        // 컨테이너 자체가 .tag-box인지 확인
        if (this.container.classList.contains('tag-box')) {
            this.tagBox = this.container;
        } else {
            this.tagBox = this.container.querySelector('.tag-box');
            
            if (!this.tagBox) {
                throw new Error('TagUIManager: .tag-box 엘리먼트가 필요합니다');
            }
        }
        
        this.tagInput = this.container.querySelector('.tag-input');
        this.tagAddButton = this.container.querySelector('.tag-add');
        
        // 태그 입력 UI가 없다면 생성
        this.ensureInputElements();
    }
    
    /**
     * 태그 입력 UI 엘리먼트 보장
     */
    ensureInputElements() {
        if (!this.tagInput && this.options.allowCustomTags) {
            this.tagInput = document.createElement('input');
            this.tagInput.type = 'text';
            this.tagInput.className = 'tag-input';
            this.tagInput.placeholder = '태그 입력 후 Enter';
            this.tagInput.style.display = 'none';
            this.tagBox.appendChild(this.tagInput);
        }
        
        if (!this.tagAddButton && this.options.allowCustomTags) {
            this.tagAddButton = document.createElement('button');
            this.tagAddButton.type = 'button';
            this.tagAddButton.className = 'tag-add';
            this.tagAddButton.textContent = '+';
            this.tagAddButton.title = '태그 추가';
            this.tagBox.appendChild(this.tagAddButton);
        }
    }
    
    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        if (this.tagAddButton && this.options.allowCustomTags) {
            this.tagAddButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.showTagInput();
            });
        }
        
        if (this.tagInput && this.options.allowCustomTags) {
            this.tagInput.addEventListener('keydown', (e) => {
                this.handleTagInputKeydown(e);
            });
            
            this.tagInput.addEventListener('blur', () => {
                this.hideTagInput();
            });
        }
    }
    
    /**
     * 태그 배열 표시
     * @param {Array} tags - 표시할 태그 배열
     */
    displayTags(tags) {
        this.clearTags();
        this.originalTags = Array.isArray(tags) ? [...tags] : [];
        
        if (this.originalTags.length > 0) {
            this.originalTags.forEach(tag => {
                const tagElement = this.createTagElement(tag);
                this.insertTagElement(tagElement);
            });
        }
        
        this.ensureInputElements();
        this.updateEditMode();
        this.triggerTagsChange();
    }
    
    /**
     * 태그 DOM 엘리먼트 생성
     * @param {Object|string} tag - 태그 객체 또는 문자열
     * @returns {HTMLElement} 생성된 태그 엘리먼트
     */
    createTagElement(tag) {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
        
        const tagId = typeof tag === 'object' ? tag.tagId : null;
        const tagName = typeof tag === 'object' ? (tag.tagName || tag.name || tag) : tag;
        
        tagElement.textContent = tagName;
        tagElement.dataset.tagId = tagId || '';
        tagElement.dataset.tagName = tagName;
        
        // 편집 모드에서만 삭제 버튼 추가
        if (this.options.editMode) {
            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'tag-delete';
            deleteButton.innerHTML = '×';
            deleteButton.title = '태그 삭제';
            
            deleteButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.removeTag(tagElement);
            });
            
            tagElement.appendChild(deleteButton);
        }
        
        return tagElement;
    }
    
    /**
     * 태그 엘리먼트를 적절한 위치에 삽입
     * @param {HTMLElement} tagElement - 삽입할 태그 엘리먼트
     */
    insertTagElement(tagElement) {
        // 태그 입력 버튼 앞에 삽입
        if (this.tagAddButton) {
            this.tagBox.insertBefore(tagElement, this.tagAddButton);
        } else {
            this.tagBox.appendChild(tagElement);
        }
    }
    
    /**
     * 기존 태그들 제거
     */
    clearTags() {
        const existingTags = this.tagBox.querySelectorAll('.tag:not(.tag-add):not(.tag-input)');
        existingTags.forEach(tag => tag.remove());
    }
    
    /**
     * 편집 모드 활성화
     */
    enableEditMode() {
        this.options.editMode = true;
        this.updateEditMode();
    }
    
    /**
     * 편집 모드 비활성화
     */
    disableEditMode() {
        this.options.editMode = false;
        this.updateEditMode();
        this.hideTagInput();
    }
    
    /**
     * 편집 모드 상태에 따라 UI 업데이트
     */
    updateEditMode() {
        const deleteButtons = this.tagBox.querySelectorAll('.tag-delete');
        
        deleteButtons.forEach(button => {
            button.style.display = this.options.editMode ? 'flex' : 'none';
        });
        
        if (this.tagAddButton) {
            this.tagAddButton.style.display = 
                (this.options.editMode && this.options.allowCustomTags) ? 'flex' : 'none';
        }
        
        // 기존 태그들에 편집 모드에 따른 삭제 버튼 추가/제거
        const tags = this.tagBox.querySelectorAll('.tag:not(.tag-add):not(.tag-input)');
        tags.forEach(tag => {
            let deleteButton = tag.querySelector('.tag-delete');
            
            if (this.options.editMode && !deleteButton) {
                deleteButton = document.createElement('button');
                deleteButton.type = 'button';
                deleteButton.className = 'tag-delete';
                deleteButton.innerHTML = '×';
                deleteButton.title = '태그 삭제';
                
                deleteButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.removeTag(tag);
                });
                
                tag.appendChild(deleteButton);
            } else if (!this.options.editMode && deleteButton) {
                deleteButton.remove();
            }
        });
    }
    
    /**
     * 태그 입력 필드 표시
     */
    showTagInput() {
        if (!this.tagInput || !this.options.allowCustomTags || !this.options.editMode) return;
        
        this.tagInput.style.display = 'inline-block';
        this.tagAddButton.style.display = 'none';
        this.tagInput.focus();
    }
    
    /**
     * 태그 입력 필드 숨김
     */
    hideTagInput() {
        if (!this.tagInput || !this.tagAddButton) return;
        
        const tagName = this.tagInput.value.trim();
        if (tagName) {
            this.addCustomTag(tagName);
        }
        
        this.tagInput.value = '';
        this.tagInput.style.display = 'none';
        
        if (this.options.editMode && this.options.allowCustomTags) {
            this.tagAddButton.style.display = 'flex';
        }
    }
    
    /**
     * 태그 입력 키보드 이벤트 처리
     * @param {KeyboardEvent} event - 키보드 이벤트
     */
    handleTagInputKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const tagName = this.tagInput.value.trim();
            if (tagName) {
                this.addCustomTag(tagName);
                this.tagInput.value = '';
            }
            this.hideTagInput();
        } else if (event.key === 'Escape') {
            this.tagInput.value = '';
            this.hideTagInput();
        }
    }
    
    /**
     * 커스텀 태그 추가
     * @param {string} tagName - 추가할 태그명
     */
    addCustomTag(tagName) {
        if (!tagName || tagName.trim() === '') return;
        
        const trimmedName = tagName.trim();
        
        // 최대 태그 수 체크
        if (this.options.maxTags) {
            const currentTags = this.getCurrentTags();
            if (currentTags.length >= this.options.maxTags) {
                console.warn(`최대 ${this.options.maxTags}개의 태그만 추가할 수 있습니다.`);
                return;
            }
        }
        
        // 중복 체크
        if (this.isDuplicateTag(trimmedName)) {
            console.warn(`이미 존재하는 태그입니다: ${trimmedName}`);
            return;
        }
        
        // 새 태그 생성
        const newTag = {
            tagId: 'custom-' + Date.now(),
            tagName: trimmedName
        };
        
        const tagElement = this.createTagElement(newTag);
        this.insertTagElement(tagElement);
        
        // 콜백 호출
        if (this.options.onTagAdd) {
            this.options.onTagAdd(newTag);
        }
        
        this.triggerTagsChange();
    }
    
    /**
     * 태그 제거
     * @param {HTMLElement} tagElement - 제거할 태그 엘리먼트
     */
    removeTag(tagElement) {
        const tagData = {
            tagId: tagElement.dataset.tagId,
            tagName: tagElement.dataset.tagName
        };
        
        tagElement.remove();
        
        // 콜백 호출
        if (this.options.onTagRemove) {
            this.options.onTagRemove(tagData);
        }
        
        this.triggerTagsChange();
    }
    
    /**
     * 중복 태그 체크
     * @param {string} tagName - 체크할 태그명
     * @returns {boolean} 중복 여부
     */
    isDuplicateTag(tagName) {
        const existingTags = this.tagBox.querySelectorAll('.tag:not(.tag-add):not(.tag-input)');
        return Array.from(existingTags).some(tag => 
            tag.dataset.tagName === tagName
        );
    }
    
    /**
     * 현재 태그 목록 반환
     * @returns {Array} 현재 태그 배열
     */
    getCurrentTags() {
        const tagElements = this.tagBox.querySelectorAll('.tag:not(.tag-add):not(.tag-input)');
        return Array.from(tagElements).map(tag => ({
            tagId: tag.dataset.tagId,
            tagName: tag.dataset.tagName
        }));
    }
    
    /**
     * 태그 변경 이벤트 트리거
     */
    triggerTagsChange() {
        if (this.options.onTagsChange) {
            const currentTags = this.getCurrentTags();
            this.options.onTagsChange(currentTags);
        }
    }
    
    /**
     * 인스턴스 정리
     */
    destroy() {
        // 이벤트 리스너 제거는 자동으로 처리됨 (엘리먼트 제거 시)
        this.container = null;
        this.tagBox = null;
        this.tagInput = null;
        this.tagAddButton = null;
        this.originalTags = [];
    }
}
