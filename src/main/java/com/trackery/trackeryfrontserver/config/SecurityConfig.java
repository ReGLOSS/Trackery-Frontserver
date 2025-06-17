package com.trackery.trackeryfrontserver.config;

import java.util.Arrays;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

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
 * 25. 06. 12.        narilee       /docs 주석 추가
 * 25. 06. 17.        durururuk     정적 파일은 시큐리티 인증을 거치지 않도록 설정
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {
	private final ProxyService proxyService;

	private static final String[] PUBLIC_URIS = {"/register/**", "/login/**", "/", "/resources/**", "/css/**", "/js/**",
		"/images/**", "/error", "/api/**", "/icons/**", "/module/**", "/error", "/users/oauth/**", "/oauth/**",
		"/oauth-account", "/oauth-redirect/**", "/maps/**", "/docs/**"};

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
			.securityMatcher(request -> {
				String uri = request.getRequestURI();

				boolean isPublic = Arrays.stream(PUBLIC_URIS)
					.filter(pattern -> !pattern.contains("**/"))
					.anyMatch(pattern -> new AntPathRequestMatcher(pattern).matches(request));

				boolean isStaticResource =
					uri.contains("/css/")
						|| uri.contains("/js/")
						|| uri.contains("/images/")
						|| uri.contains("/icons/")
						|| uri.endsWith(".ico")
						|| uri.endsWith(".png")
						|| uri.endsWith(".jpg")
						|| uri.endsWith(".jpeg")
						|| uri.endsWith(".gif")
						|| uri.endsWith(".webp")
						|| uri.endsWith(".svg")
						|| uri.endsWith(".woff")
						|| uri.endsWith(".woff2")
						|| uri.endsWith(".ttf");

				return isPublic || isStaticResource;
			})
			.csrf(AbstractHttpConfigurer::disable)
			.httpBasic(AbstractHttpConfigurer::disable)
			.formLogin(AbstractHttpConfigurer::disable)
			.authorizeHttpRequests(auth -> auth.anyRequest().permitAll());

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
