package com.trackery.trackeryfrontserver.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * packageName    : com.trackery.trackeryfrontserver.config
 * fileName       : SecurityConfig
 * author         : narilee
 * date           : 25. 02. 06.
 * description    : 프론트 서버의 Spring Security 설정을 담당하는 Configuration 클래스입니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 02. 06.        narilee       최초 생성
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

	/**
	 * Spring Security 필터 체인을 구성합니다.
	 *
	 * @param http Http Security 객체
	 * @return 구성된 SecurityFilterChain
	 * @throws Exception 보안 구성 중 발생할 수 있는 예외
	 */
	@Bean
	public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
		http
			.csrf(csrf -> csrf.disable())
			.authorizeHttpRequests(auth -> auth
				.requestMatchers("/", "/css/**", "/js/**", "/images/**", "/error", "/proxy/**").permitAll()
				.anyRequest().authenticated()
			)
			.formLogin(login -> login.disable())
			.httpBasic(httpBasic -> httpBasic.disable());

		return http.build();
	}
}
