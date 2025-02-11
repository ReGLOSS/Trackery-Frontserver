package com.trackery.trackeryfrontserver.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.trackery.trackeryfrontserver.config.ApiProperties;

import lombok.RequiredArgsConstructor;
/**
 * packageName    : com.trackery.trackeryfrontserver.service
 * fileName       : RestTemplateConfig
 * author         : narilee
 * date           : 25. 02. 06.
 * description    : 프론트 서버의 API 통신을 담당하는 서비스입니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 02. 06.        narilee       최초 생성
 */
@Service
@RequiredArgsConstructor
public class ApiService {

	private final RestTemplate restTemplate;
	private final ApiProperties apiProperties;

	public String getHello() {
		return restTemplate.getForObject(apiProperties.getBaseUrl() + "/hello", String.class);
	}
}
