package com.trackery.trackeryfrontserver.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
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
 * 25. 03. 10.        narilee       간편 로그인 추가
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

	private final String[] publicUris = {
		"/register/**",
		"/login/**",
		"/users/oauth/**",
		"/oauth/**",
		"/oauth-account/**",
		"/oauth-redirect/**"
	};

	//TODO "/api/**/" permitAll() 삭제 후 퍼블릭 API를 제외하고 권한 인증 필요하게 수정
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
			.csrf(AbstractHttpConfigurer::disable)
			.authorizeHttpRequests(auth -> auth
				.requestMatchers("/", "/resources/**", "/css/**", "/js/**", "/images/**", "/error", "/api/**", "/icons/**", "/module/**").permitAll()
				.requestMatchers(publicUris).permitAll()
				.anyRequest().authenticated()
			)
			.formLogin(AbstractHttpConfigurer::disable)
			.httpBasic(AbstractHttpConfigurer::disable);

		return http.build();
	}
}
