package com.trackery.trackeryfrontserver.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.trackery.trackeryfrontserver.domain.proxy.service.ProxyService;

import lombok.RequiredArgsConstructor;

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
@RequiredArgsConstructor
public class SecurityConfig {
	private final ProxyService proxyService;

	private static final String[] PUBLIC_URIS = {"/register/**", "/login/**", "/", "/resources/**", "/css/**", "/js/**",
		"/images/**", "/error", "/api/**", "/icons/**", "/module/**", "/error", "/users/oauth/**", "/oauth/**",
		"/oauth-account", "/oauth-redirect/**"};

	/**
	 * Spring Security 필터 체인을 구성합니다.
	 *
	 * @param http Http Security 객체
	 * @return 구성된 SecurityFilterChain
	 * @throws Exception 보안 구성 중 발생할 수 있는 예외
	 */
	@Bean
	@Order(1)
	public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
		http
			.securityMatcher(PUBLIC_URIS)
			.csrf(AbstractHttpConfigurer::disable)
			.authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
			.formLogin(AbstractHttpConfigurer::disable)
			.httpBasic(AbstractHttpConfigurer::disable);

		return http.build();
	}

	@Bean
	@Order(2)
	public SecurityFilterChain filterChain2(HttpSecurity http) throws Exception {
		http
			.csrf(AbstractHttpConfigurer::disable)
			.authorizeHttpRequests(auth -> auth
				.anyRequest().authenticated()
			)
			.addFilterBefore(new AuthFilter(proxyService), UsernamePasswordAuthenticationFilter.class)
			.formLogin(AbstractHttpConfigurer::disable)
			.httpBasic(AbstractHttpConfigurer::disable);

		return http.build();
	}
}
