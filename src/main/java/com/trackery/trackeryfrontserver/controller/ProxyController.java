package com.trackery.trackeryfrontserver.controller;

import java.net.URI;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import jakarta.servlet.http.HttpServletRequest;

/**
 * packageName    : com.trackery.trackeryfrontserver.controller
 * fileName       : ProxyController
 * author         : inari
 * date           : 25. 2. 18.
 * description    : 프록시 역활을 하는 컨트롤러
 * 					프론트엔드에서 들어오는 API 요청을 백엔드 서버로 전달합니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 2. 18.        inari       최초 생성
 */
@RestController
@RequestMapping("/proxy")
public class ProxyController {

	/**
	 * HTTP 요청을 외부 api 서버로 전달하는 RestTemplate 객체
	 */
	private final RestTemplate restTemplate;

	/**
	 * 백엔드 서버 주소
	 */
	@Value("${api.server.url}")
	private String apiServerUrl;

	/**
	 * RestTemplate를 초기화하는 기본 생성자
	 */
	public ProxyController(RestTemplate restTemplate) {
		this.restTemplate = restTemplate;
	}

	/**
	 * 모든 /proxy/api/** 요청을 처리하는 메서드
	 * 예시: /proxy/api/** -> http://backend-server:8080/api/** 로 전달
	 */
	@RequestMapping("/api/**")
	public ResponseEntity<String> proxyRequest(
		HttpServletRequest request,
		@RequestBody(required = false) String body,
		@RequestHeader HttpHeaders headers) {

		// 원래 요청 URI에서 /proxy 제거
		String originalUri = request.getRequestURI();
		String proxyUri = originalUri.replace("/proxy", "");

		// 백엔드 서버 URL 생성
		URI uri = UriComponentsBuilder.fromUriString(apiServerUrl)
			.path(proxyUri)
			.query(request.getQueryString())
			.build()
			.toUri();

		// 요청 메서드 가져오기
		HttpMethod method = HttpMethod.valueOf(request.getMethod());

		// HTTP 엔티티 생성
		HttpEntity<String> httpEntity;
		if (body != null && body.isEmpty()) {
			httpEntity = new HttpEntity<>(body, headers);
		} else {
			httpEntity = new HttpEntity<>(headers);
		}

		// 백엔드 서버로 요청을 전달
		return restTemplate.exchange(uri, method, httpEntity, String.class);
	}
}
