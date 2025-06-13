package com.trackery.trackeryfrontserver.domain.docs.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.trackery.trackeryfrontserver.domain.proxy.service.ProxyService;

import lombok.RequiredArgsConstructor;

/**
 * packageName    : com.trackery.trackeryfrontserver.domain.docs.controller
 * fileName       : DocsController
 * author         : inari
 * date           : 25. 6. 12.
 * description    : /docs 요청을 프록시를 통해 백엔드로 전달하는 컨트롤러입니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 6. 12.        inari       최초 생성
 */
@RestController
@RequiredArgsConstructor
public class DocsController {

	private final ProxyService proxyService;

	/**
	 * API 문서를 조회합니다.
	 * 
	 * 클라이언트의 /docs 요청을 백엔드 서버의 /api/docs 엔드포인트로 프록시합니다.
	 * Spring REST Docs로 생성된 API 문서 페이지를 반환합니다.
	 * 
	 * @param headers 클라이언트 요청의 HTTP 헤더 정보
	 * @return API 문서 HTML 페이지를 포함한 ResponseEntity
	 */
	@GetMapping("/docs")
	public ResponseEntity<String> getDocs(@RequestHeader HttpHeaders headers) {
		return proxyService.forwardRequest("/api/docs", HttpMethod.GET, headers, null);
	}
}
