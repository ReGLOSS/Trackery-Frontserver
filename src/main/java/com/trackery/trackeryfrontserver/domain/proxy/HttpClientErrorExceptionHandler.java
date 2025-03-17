package com.trackery.trackeryfrontserver.domain.proxy;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResponseErrorHandler;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.micrometer.core.instrument.util.IOUtils;
import lombok.extern.slf4j.Slf4j;

/**
 * packageName    : com.trackery.trackeryfrontserver.domain.proxy
 * fileName       : HttpClientErrorExceptionHandler
 * author         : durururuk
 * date           : 25. 3. 14.
 * description    : HttpClientErrorException 핸들러
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 3. 14.        durururuk      최초 생성
 */
@Slf4j
@Component
public class HttpClientErrorExceptionHandler implements ResponseErrorHandler {

	private final ObjectMapper objectMapper = new ObjectMapper();

	/**
	 * 500 에러를 제외한 응답은 HttpClientErrorException 던지지 않고 그대로 응답합니다.
	 *
	 * @param response : 응답 객체
	 * @return : 500 에러가 아닌 경우 그대로 반환
	 */
	@Override
	public boolean hasError(@NonNull ClientHttpResponse response) throws IOException {
		return response.getStatusCode() == HttpStatus.INTERNAL_SERVER_ERROR;
	}

	/**
	 * 500 에러 발생 시 세부 내용을 로그로 기록하고 클라이언트에는 공통 메시지만 응답합니다.
	 *
	 * @param response : 응답 객체
	 */
	@Override
	public void handleError(@NonNull ClientHttpResponse response) throws IOException {
		String responseBody = IOUtils.toString(response.getBody(), StandardCharsets.UTF_8);
		Map<String, Object> errorResponse = objectMapper.readValue(responseBody, new TypeReference<>() {});

		log.error("프록시 컨트롤러 500 에러 발생: {}", errorResponse);

		throw new ServerException("현재 요청을 처리할 수 없습니다.");
	}
}
