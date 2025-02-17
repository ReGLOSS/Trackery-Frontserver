package com.trackery.trackeryfrontserver.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import lombok.Getter;

/**
 * packageName    : com.trackery.trackeryfrontserver.config
 * fileName       : ApiProperties
 * author         : narilee
 * date           : 25. 02. 06.
 * description    : API 관련 설정 프로퍼티입니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 02. 06.        narilee       최초 생성
 */
@Getter
@Component
public class ApiProperties {

	@Value("${api.base-url}")
	private String baseUrl;
}
