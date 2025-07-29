/**
 * 태그 관리 전용 모듈
 * 위치 태그, 계절 태그, 커스텀 태그의 생성, 업데이트, 병합 로직을 담당
 */

import { TagApiService } from './tagApiService.js';

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

        // 기존 위치 태그와 새로운 위치 태그 비교 (태그명으로 판별)
        const existingLocationTags = existingTags.filter(tag => 
            this.isLocationTag(tag.tagName)
        );
        
        const isLocationChanged = !this.isLocationTagsSame(existingLocationTags, newLocationTags);
        
        if (isLocationChanged) {
            // 위치가 변경된 경우: 기존 위치 태그 제거하고 새 위치 태그 추가
            const nonLocationTags = existingTags.filter(tag => 
                !this.isLocationTag(tag.tagName)
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
     * 위치 태그인지 판별
     * @param {string} tagName - 태그명
     * @returns {boolean} 위치 태그 여부
     */
    isLocationTag(tagName) {
        if (!tagName) return false;
        
        // 시도 태그 (특별시, 광역시, 도)
        if (tagName.includes('특별시') || tagName.includes('광역시') || 
            tagName.includes('특별자치시') || tagName.includes('도')) {
            return true;
        }
        
        // 시군구 태그 (구, 시, 군)
        if (tagName.endsWith('구') || tagName.endsWith('시') || tagName.endsWith('군')) {
            return true;
        }
        
        return false;
    }

    /**
     * 위치 태그가 동일한지 비교
     * @param {Array} existingLocationTags - 기존 위치 태그
     * @param {Array} newLocationTags - 새로운 위치 태그
     * @returns {boolean} 동일 여부
     */
    isLocationTagsSame(existingLocationTags, newLocationTags) {
        // 새로운 위치 태그에서 sdName, sggName 추출
        const newSdName = newLocationTags.find(tag => tag.tagId === 'sdName')?.tagName;
        const newSggName = newLocationTags.find(tag => tag.tagId === 'sggName')?.tagName;
        
        // 기존 태그에서 시도, 시군구 태그 찾기
        const existingSdName = existingLocationTags.find(tag => 
            tag.tagName && (tag.tagName.includes('특별시') || tag.tagName.includes('광역시') || 
                           tag.tagName.includes('특별자치시') || tag.tagName.includes('도')))?.tagName;
        const existingSggName = existingLocationTags.find(tag => 
            tag.tagName && (tag.tagName.endsWith('구') || tag.tagName.endsWith('시') || tag.tagName.endsWith('군')))?.tagName;
        
        // 태그명으로 비교
        return existingSdName === newSdName && existingSggName === newSggName;
    }


    /**
     * 태그 배열에서 위치명 추출
     * @param {Array} tags - 태그 배열
     * @returns {string} 위치명 (시도 + 시군구)
     */
    extractLocationName(tags) {
        // tagId 기반 우선 검색 (새로 생성된 태그)
        const locationTags = tags.filter(tag => tag.tagId === 'sdName' || tag.tagId === 'sggName');
        let sdName = locationTags.find(tag => tag.tagId === 'sdName')?.tagName || '';
        let sggName = locationTags.find(tag => tag.tagId === 'sggName')?.tagName || '';
        
        // tagId가 없는 경우 tagName 패턴으로 검색 (기존 DB 태그)
        if (!sdName || !sggName) {
            const locationTagsByName = tags.filter(tag => this.isLocationTag(tag.tagName));
            if (!sdName) {
                sdName = locationTagsByName.find(tag => 
                    tag.tagName && (tag.tagName.includes('특별시') || tag.tagName.includes('광역시') || 
                                   tag.tagName.includes('특별자치시') || tag.tagName.includes('도')))?.tagName || '';
            }
            if (!sggName) {
                sggName = locationTagsByName.find(tag => 
                    tag.tagName && (tag.tagName.endsWith('구') || tag.tagName.endsWith('시') || tag.tagName.endsWith('군')))?.tagName || '';
            }
        }
        
        return `${sdName} ${sggName}`.trim();
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
