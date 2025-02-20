package com.trackery.trackeryfrontserver.domain.proxy.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.trackery.trackeryfrontserver.domain.proxy.service.ProxyService;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

/**
 * packageName    : com.trackery.trackeryfrontserver.domain.proxy.controller
 * fileName       : ProxyController
 * author         : inari
 * date           : 25. 2. 19.
 * description    : 프록시 역활을 하는 컨트롤러
 *  				프론트엔드에서 들어오는 API 요청을 백엔드 서버로 전달합니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 2. 18.        inari       최초 생성
 * 25. 2. 19.        inari       경로 변경
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ProxyController {

	/**
	 * 실제 프록시 요청을 처리하는 서비스
	 */
	private final ProxyService proxyService;

	/**
	 * 모든 API 요청을 처리하는 메서드입니다.
	 * /api 이하의 모든 경로를 매칭합니다.
	 *
	 * @param request HTTP 요청 정보를 담고 있는 객체
	 * @param body 요청 본문 (없으면 GET, 있을경우 POST 등등)
	 * @param headers HTTP 요청 헤더
	 * @return 백엔드 서버로부터 받은 응답을 그대로 반환
	 */
	@RequestMapping("/**")
	public ResponseEntity<String> handleRequest(HttpServletRequest request,
		@RequestBody(required = false) String body,
		@RequestHeader HttpHeaders headers) {

		return proxyService.forwardRequest(
			request.getRequestURI(),
			HttpMethod.valueOf(request.getMethod()),
			headers,
			body
		);
	}
}
