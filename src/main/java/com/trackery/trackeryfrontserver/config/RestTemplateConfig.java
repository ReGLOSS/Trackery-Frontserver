package com.trackery.trackeryfrontserver.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * packageName    : com.trackery.trackeryfrontserver.config
 * fileName       : RestTemplateConfig
 * author         : inari
 * date           : 25. 2. 06.
 * description    : RestTemplate 설정 클래스입니다.
 * 					HTTP 요청을 보내기 위한 RestTemplate 빈을 생성합니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 02. 06.        narilee       최초 생성
 */
@Configuration
public class RestTemplateConfig {

	/**
	 * RestTemplate 빈 생성
	 * Spring의 DI 컨테이너에 RestTemplate 객체를 등록합니다.
	 */
	@Bean
	public RestTemplate restTemplate() {
		return new RestTemplate();
	}
}
