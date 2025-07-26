/**
 * 태그 관련 API 호출 전용 서비스
 * 위치 태그, 계절 태그 API 통신을 담당
 */

export class TagApiService {
    
    /**
     * 위치 기반 태그 정보 가져오기
     * @param {number} latitude - 위도
     * @param {number} longitude - 경도
     * @returns {Promise<Object>} 위치 데이터 {sdName, sggName, regionalTags}
     */
    async fetchLocationTags(latitude, longitude) {
        try {
            const response = await fetch("/api/location/name", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                credentials: "include",
                body: JSON.stringify({ latitude, longitude })
            });

            if (response.status === 404) {
                console.warn("위치를 찾을 수 없습니다 (404 응답)");
                return { sdName: null, sggName: null, regionalTags: [] };
            }

            if (response.status !== 200) {
                console.warn("위치 정보 API 요청 실패:", response.status);
                return { sdName: null, sggName: null, regionalTags: [] };
            }

            const locationData = await response.json();
            
            if (!locationData.data) {
                console.warn("위치 데이터가 없습니다:", locationData);
                return { sdName: null, sggName: null, regionalTags: [] };
            }

            const { sdName, sggName, regionalTags } = locationData.data;
            return {
                sdName: sdName || null,
                sggName: sggName || null,
                regionalTags: Array.isArray(regionalTags) ? regionalTags : []
            };

        } catch (error) {
            console.error("위치 태그 요청 중 오류:", error);
            return { sdName: null, sggName: null, regionalTags: [] };
        }
    }

    /**
     * 날짜 기반 계절 태그 가져오기
     * @param {string} dateTime - 날짜 정보 (YYYY / MM / DD 형식)
     * @returns {Promise<Array>} 계절 태그 배열
     */
    async fetchSeasonTags(dateTime) {
        if (!dateTime) {
            console.warn("날짜 정보가 없습니다");
            return [];
        }

        try {
            const response = await fetch("/api/tags/season", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                credentials: "include",
                body: JSON.stringify({ date: dateTime })
            });

            if (!response.ok) {
                console.warn("계절 태그 API 요청 실패:", response.status);
                return [];
            }

            const seasonData = await response.json();
            
            if (seasonData.code !== 200 || !Array.isArray(seasonData.data)) {
                console.warn("계절 태그 데이터 형식 오류:", seasonData);
                return [];
            }

            return seasonData.data;

        } catch (error) {
            console.error("계절 태그 요청 중 오류:", error);
            return [];
        }
    }
}
