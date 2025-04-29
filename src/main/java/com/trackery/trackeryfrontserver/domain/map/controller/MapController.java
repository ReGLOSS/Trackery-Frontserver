package com.trackery.trackeryfrontserver.domain.map.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.client.RestTemplate;

/**
 * packageName    : com.trackery.trackeryfrontserver.domain.map.controller
 * fileName       : MapController
 * author         : durururuk
 * date           : 25. 4. 25.
 * description    : kostat에서 제공하는 지도 관련 api를 프록시로 사용하는 컨트롤러입니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 4. 25.		durururuk		최초 생성
 */
@Slf4j
@Controller
@RequiredArgsConstructor
@RequestMapping("/maps")
public class MapController {
	private final RestTemplate restTemplate;

	@Value("${kostat.consumerKey}")
	private String consumerKey;

	//TODO 프록시 서버 리팩토링 하면서 이 부분도 수정 할 수 있게 변경

	/**
	 * 지도를 생성할 수 있게 kostat에서 자바스크립트와 css를 로드하는 프록시 API입니다.
	 * @return 지도 SOP css, JS
	 */
	@GetMapping("/sop")
	public ResponseEntity<String> loadKostatMapResources(HttpServletRequest request) {
		String protocol = request.isSecure() ? "https://" : "http://";

		String url = protocol + "sgisapi.kostat.go.kr/OpenAPI3/auth/javascriptAuth?consumer_key=" + consumerKey;

		HttpHeaders headers = new HttpHeaders();
		headers.set("Accept", "*/*");

		HttpEntity<String> entity = new HttpEntity<>(null, headers);

		ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

		HttpHeaders responseHeaders = new HttpHeaders();
		responseHeaders.putAll(response.getHeaders());
		responseHeaders.set("Content-Type", "text/javascript;charset=UTF-8");

		return ResponseEntity
			.status(response.getStatusCode())
			.headers(responseHeaders)
			.body(response.getBody());
	}
}
