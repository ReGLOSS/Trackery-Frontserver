package com.trackery.trackeryfrontserver.domain.proxy.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import lombok.RequiredArgsConstructor;

/**
 * packageName    : com.trackery.trackeryfrontserver.domain.proxy.controller
 * fileName       : ProxyService
 * author         : inari
 * date           : 25. 2. 19.
 * description    : 프록시 요청을 실제로 처리하는  서비스 클래스입니다.
 * 					프론트엔드에서 받는 요청을 백엔드 서버로 전달하고 응답을 받아옵니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 2. 19.        inari       최초 생성
 */
@Service
@RequiredArgsConstructor
public class ProxyService {

	/**
	 * HTTP 요청을 보내기 위한 RestTemplate 객체
	 */
	private final RestTemplate restTemplate;

	/**
	 * 백엔드 API 서버의 주소
	 */
	@Value("${api.server.url}")
	public String apiServerUrl;

	/**
	 * 실제 백엔드 서버로 요청을 전달하고 응답을 받아오는 메서드입니다.
	 *
	 * @param url 요청 URL
	 * @param method HTTP 메서드 (GET, POST 등등)
	 * @param headers HTTP 요청 헤더
	 * @param body 요청 본문 (있을 경우)
	 * @return 백엔드 서버로부터 받은 응답
	 */
	public ResponseEntity<String> forwardRequest(String url, HttpMethod method, HttpHeaders headers, String body) {
		// 백엔드 서버의 전체 URL 생성
		String fullUrl = apiServerUrl + url;

		// body가 있는 경우와 없는 경우를 구분하여 HttpEntity 생성
		HttpEntity<String> httpEntity = body != null && !body.isEmpty()
			? new HttpEntity<>(body, headers)
			: new HttpEntity<>(null, headers);

		// 실제 HTTP 요청을 보내고 응답을 받아옴
		return restTemplate.exchange(fullUrl, method, httpEntity, String.class);
	}
}
