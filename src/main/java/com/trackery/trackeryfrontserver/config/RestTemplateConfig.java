package com.trackery.trackeryfrontserver.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * packageName    : com.trackery.trackeryfrontserver.config
 * fileName       : RestTemplateConfig
 * author         : narilee
 * date           : 25. 02. 06.
 * description    : 프론트 서버의 RestTemplate 설정을 담당하는 Configuration 클래스입니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 02. 06.        narilee       최초 생성
 */
@Configuration
public class RestTemplateConfig {

	@Bean
	public RestTemplate restTemplate() {
		return new RestTemplate();
	}
}
