package com.trackery.trackeryfrontserver.domain.proxy.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

import com.trackery.trackeryfrontserver.domain.proxy.ServerException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * packageName    : com.trackery.trackeryfrontserver.domain.proxy.controller
 * fileName       : ProxyService
 * author         : inari
 * date           : 25. 2. 19.
 * description    : 프록시 요청을 실제로 처리하는 서비스 클래스입니다.
 * 					프론트엔드에서 받는 요청을 백엔드 서버로 전달하고 응답을 받아옵니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 2. 19.        inari       최초 생성
 */
@Slf4j
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

		log.info("전체 요청 URL: {}", fullUrl);

		// body가 있는 경우와 없는 경우를 구분하여 HttpEntity 생성
		HttpEntity<String> httpEntity = body != null && !body.isEmpty()
			? new HttpEntity<>(body, headers)
			: new HttpEntity<>(null, headers);

		log.debug("Created HttpEntity: {}", httpEntity);

		// 실제 HTTP 요청을 보내고 응답을 받아옴
		try {
			ResponseEntity<String> response = restTemplate.exchange(fullUrl, method, httpEntity, String.class);

			log.info("응답 상태 코드: {}", response.getStatusCode());
			log.debug("응답 헤더: {}", response.getHeaders());
			//log.info("응답 본문: {}", response.getBody());

			HttpHeaders proxyHeaders = new HttpHeaders();
			proxyHeaders.putAll(response.getHeaders());
			proxyHeaders.remove("Content-Length");
			proxyHeaders.remove("Transfer-Encoding");
			proxyHeaders.remove("Connection");

			return ResponseEntity
				.status(response.getStatusCode())
				.headers(proxyHeaders)
				.body(response.getBody());

		} catch (ServerException | RestClientException e) {
			log.error("프록시 작업 중 서버 에러 발생 : {}", e.getMessage());
			return ResponseEntity.status(500)
				.body("{\"code\":\"500\",\"message\":\"현재 요청을 처리할 수 없습니다. 잠시 후에 다시 시도해주십시오.\"}");
		}
	}

	/**
	 * SSE 요청을 백엔드 서버로 전달하는 메서드입니다.
	 *
	 * @param url 요청 URL
	 * @param headers HTTP 요청 헤더
	 * @return SSE 연결을 위한 SseEmitter
	 */
	public SseEmitter forwardSseRequest(String url, HttpHeaders headers) {
		String fullUrl = apiServerUrl + url;
		log.info("SSE 요청 전달: {}", fullUrl);

		SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);

		// 백그라운드 스레드에서 SSE 연결 처리
		Thread sseThread = new Thread(() -> {
			try {
				URL sseUrl = new URL(fullUrl);
				HttpURLConnection connection = (HttpURLConnection) sseUrl.openConnection();
				connection.setRequestMethod("GET");
				connection.setRequestProperty("Accept", "text/event-stream");
				connection.setRequestProperty("Cache-Control", "no-cache");
				
				// 쿠키 헤더 전달
				String cookieHeader = headers.getFirst("Cookie");
				if (cookieHeader != null) {
					connection.setRequestProperty("Cookie", cookieHeader);
				}

				try (BufferedReader reader = new BufferedReader(
					new InputStreamReader(connection.getInputStream()))) {
					
					String line;
					while ((line = reader.readLine()) != null) {
						if (!line.isEmpty()) {
							// SSE 데이터를 클라이언트로 전달
							emitter.send(SseEmitter.event().data(line));
						}
					}
				}
			} catch (Exception e) {
				log.error("SSE 연결 중 오류 발생: {}", e.getMessage());
				emitter.completeWithError(e);
			}
		});

		sseThread.start();

		// 연결 정리 설정
		emitter.onCompletion(() -> log.info("SSE 연결 완료"));
		emitter.onTimeout(() -> log.info("SSE 연결 타임아웃"));
		emitter.onError(throwable -> log.error("SSE 연결 오류: {}", throwable.getMessage()));

		return emitter;
	}
}
