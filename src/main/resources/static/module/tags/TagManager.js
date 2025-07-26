/**
 * 태그 관리 전용 모듈
 * 위치 태그, 계절 태그, 커스텀 태그의 생성, 업데이트, 병합 로직을 담당
 */

import { TagApiService } from './TagApiService.js';

export class TagManager {
    constructor() {
        this.apiService = new TagApiService();
    }

    /**
     * 위치 변경 시 태그 처리
     * @param {Array} existingTags - 기존 태그 배열
     * @param {Object} newLocationData - 새로운 위치 데이터 {sdName, sggName, regionalTags}
     * @returns {Array} 업데이트된 태그 배열
     */
    handleLocationChange(existingTags, newLocationData) {
        const { sdName, sggName, regionalTags } = newLocationData;

        // 새로운 위치태그 구성
        let newLocationTags = [];
        if (sdName) newLocationTags.push({ tagName: sdName, tagId: 'sdName' });
        if (sggName) newLocationTags.push({ tagName: sggName, tagId: 'sggName' });

        if (regionalTags && Array.isArray(regionalTags)) {
            newLocationTags = [...newLocationTags, ...regionalTags];
        }

        // 기존 위치 태그와 새로운 위치 태그 비교
        const existingLocationTags = existingTags.filter(tag => 
            tag.tagId === 'sdName' || tag.tagId === 'sggName'
        );
        
        const isLocationChanged = !this.isLocationTagsSame(existingLocationTags, newLocationTags);
        
        if (isLocationChanged) {
            // 위치가 변경된 경우: 기존 위치 태그 제거하고 새 위치 태그 추가
            const nonLocationTags = existingTags.filter(tag => 
                tag.tagId !== 'sdName' && tag.tagId !== 'sggName'
            );
            return [...newLocationTags, ...nonLocationTags];
        } else {
            // 위치가 동일한 경우: 좌표만 업데이트, 태그는 그대로 유지
            return existingTags;
        }
    }

    /**
     * 날짜 변경 시 계절 태그 처리
     * @param {Array} existingTags - 기존 태그 배열
     * @param {Array} newSeasonTags - 새로운 계절 태그 배열
     * @returns {Array} 업데이트된 태그 배열
     */
    handleSeasonChange(existingTags, newSeasonTags) {
        // 기존 계절 태그 제거
        const nonSeasonTags = existingTags.filter(tag => {
            const tagName = tag.tagName;
            return !(tagName && (tagName.includes('봄') || tagName.includes('여름') || 
                               tagName.includes('가을') || tagName.includes('겨울')));
        });

        // 새로운 계절 태그와 중복 검사 후 병합
        const finalTags = [...nonSeasonTags];
        newSeasonTags.forEach(seasonTag => {
            if (!finalTags.some(tag => tag.tagName === seasonTag.tagName)) {
                finalTags.push(seasonTag);
            }
        });

        return finalTags;
    }

    /**
     * 초기 태그 생성 (업로드 시)
     * @param {Object} locationData - 위치 데이터 {sdName, sggName, regionalTags}
     * @param {Array} seasonTags - 계절 태그 배열
     * @returns {Array} 생성된 태그 배열
     */
    createInitialTags(locationData, seasonTags) {
        const { sdName, sggName, regionalTags } = locationData;

        // 위치태그 구성
        let newLocationTags = [];
        if (sdName) newLocationTags.push({ tagName: sdName, tagId: 'sdName' });
        if (sggName) newLocationTags.push({ tagName: sggName, tagId: 'sggName' });

        if (regionalTags && Array.isArray(regionalTags)) {
            newLocationTags = [...newLocationTags, ...regionalTags];
        }

        // 계절태그 추가 (중복 제거)
        let combinedTags = [...newLocationTags];
        if (seasonTags && Array.isArray(seasonTags)) {
            seasonTags.forEach(seasonTag => {
                if (!combinedTags.some(tag => tag.tagName === seasonTag.tagName)) {
                    combinedTags.push(seasonTag);
                }
            });
        }

        return combinedTags;
    }

    /**
     * 위치 태그가 동일한지 비교
     * @param {Array} existingLocationTags - 기존 위치 태그
     * @param {Array} newLocationTags - 새로운 위치 태그
     * @returns {boolean} 동일 여부
     */
    isLocationTagsSame(existingLocationTags, newLocationTags) {
        // sdName, sggName만 비교 (regionalTags는 제외)
        const existingMain = existingLocationTags.filter(tag => 
            tag.tagId === 'sdName' || tag.tagId === 'sggName'
        );
        const newMain = newLocationTags.filter(tag => 
            tag.tagId === 'sdName' || tag.tagId === 'sggName'
        );
        
        if (existingMain.length !== newMain.length) {
            return false;
        }
        
        // 각 태그 비교
        for (const newTag of newMain) {
            const exists = existingMain.some(existingTag => 
                existingTag.tagId === newTag.tagId && existingTag.tagName === newTag.tagName
            );
            if (!exists) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * 커스텀 태그 추가
     * @param {Array} existingTags - 기존 태그 배열
     * @param {string} customTagName - 추가할 커스텀 태그명
     * @returns {Array} 업데이트된 태그 배열
     */
    addCustomTag(existingTags, customTagName) {
        if (!customTagName || customTagName.trim() === '') {
            return existingTags;
        }

        const trimmedName = customTagName.trim();
        
        // 중복 체크
        const isDuplicate = existingTags.some(tag => tag.tagName === trimmedName);
        if (isDuplicate) {
            throw new Error('이미 추가된 태그입니다.');
        }

        // 새 커스텀 태그 추가
        const newTag = {
            tagName: trimmedName,
            tagId: 'custom-' + Date.now(),
            isCustom: true
        };

        return [...existingTags, newTag];
    }

    /**
     * 태그 제거
     * @param {Array} existingTags - 기존 태그 배열  
     * @param {string} tagToRemove - 제거할 태그명
     * @returns {Array} 업데이트된 태그 배열
     */
    removeTag(existingTags, tagToRemove) {
        return existingTags.filter(tag => tag.tagName !== tagToRemove);
    }

    /**
     * 태그 배열을 백엔드 API 형식으로 변환
     * @param {Array} tags - 태그 배열
     * @returns {Array} 태그명만 포함된 배열
     */
    convertTagsForApi(tags) {
        return tags.map(tag => tag.tagName);
    }

    /**
     * 위치 및 계절 태그 통합 처리 (업로드용)
     * @param {number} latitude - 위도
     * @param {number} longitude - 경도  
     * @param {string} dateTime - 날짜 정보
     * @returns {Promise<Array>} 생성된 태그 배열
     */
    async fetchAndCreateTags(latitude, longitude, dateTime) {
        try {
            const [locationData, seasonTags] = await Promise.all([
                this.apiService.fetchLocationTags(latitude, longitude),
                this.apiService.fetchSeasonTags(dateTime)
            ]);

            return this.createInitialTags(locationData, seasonTags);
        } catch (error) {
            console.error('태그 생성 중 오류:', error);
            return [];
        }
    }
}

// 싱글톤 인스턴스 내보내기
export const tagManager = new TagManager();