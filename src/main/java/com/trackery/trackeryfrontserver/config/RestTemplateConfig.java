package com.trackery.trackeryfrontserver.config;

import java.time.Duration;

import org.apache.hc.client5.http.config.ConnectionConfig;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.core5.util.Timeout;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import com.trackery.trackeryfrontserver.domain.proxy.HttpClientErrorExceptionHandler;

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
 * 25. 02. 19.        narilee       주석 추가
 */
@Configuration
public class RestTemplateConfig {

	/**
	 * RestTemplate 빈 생성
	 * Spring의 DI 컨테이너에 RestTemplate 객체를 등록합니다.
	 */
	@Bean
	public RestTemplate restTemplate(HttpClientErrorExceptionHandler errorHandler) {
		RequestConfig requestConfig = RequestConfig.custom()
			.setResponseTimeout(Timeout.of(Duration.ofSeconds(5)))
			.build();

		CloseableHttpClient httpClient = HttpClients.custom()
			.setDefaultRequestConfig(requestConfig)
			.setConnectionManager(
				PoolingHttpClientConnectionManagerBuilder.create()
					.setDefaultConnectionConfig(ConnectionConfig.custom()
						.setSocketTimeout(Timeout.of(Duration.ofSeconds(5)))
						.build())
					.build()
			)
			.build();

		HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory(httpClient);

		RestTemplate restTemplate = new RestTemplate(factory);
		restTemplate.setErrorHandler(errorHandler);

		return restTemplate;
	}


}
