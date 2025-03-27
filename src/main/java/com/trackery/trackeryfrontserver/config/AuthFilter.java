package com.trackery.trackeryfrontserver.config;

import java.io.IOException;
import java.util.Arrays;
import java.util.Optional;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.filter.OncePerRequestFilter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trackery.trackeryfrontserver.domain.proxy.service.ProxyService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * packageName    : com.trackery.trackeryfrontserver.config
 * fileName       : AuthFilter
 * author         : durururuk
 * date           : 25. 3. 26.
 * description    : 백엔드 서버에 인증 api를 요청하는 필터
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 3. 26.        durururuk      최초 생성
 */
@Slf4j
@RequiredArgsConstructor
public class AuthFilter extends OncePerRequestFilter {
	private final ProxyService proxyService;
	private final ObjectMapper objectMapper = new ObjectMapper();

	private static final String ACCESS_TOKEN_COOKIE_NAME = "accessToken";
	private static final String AUTH_ENDPOINT = "/api/auth/me";

	@Override
	protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
		@NonNull FilterChain filterChain) throws ServletException, IOException {

		Optional<Cookie> accessTokenCookie = extractAccessTokenCookie(request);

		if (accessTokenCookie.isEmpty()) {
			response.sendError(HttpServletResponse.SC_FORBIDDEN);
			return;
		}

		ResponseEntity<String> responseEntity = fetchAuthentication(accessTokenCookie.get());

		if (!responseEntity.getStatusCode().is2xxSuccessful()) {
			response.sendError(HttpServletResponse.SC_FORBIDDEN);
			return;
		}

		try {
			createAuthentication(responseEntity.getBody());
		} catch (JsonProcessingException ex) {
			log.error("인증 응답 파싱 실패 ", ex);
			response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
			return;
		}

		filterChain.doFilter(request, response);
	}

	private Optional<Cookie> extractAccessTokenCookie(HttpServletRequest request) {

		return Optional.ofNullable(request.getCookies())
			.flatMap(cookies -> Arrays.stream(cookies)
				.filter(cookie -> ACCESS_TOKEN_COOKIE_NAME.equals(cookie.getName()))
				.findFirst());
	}

	private ResponseEntity<String> fetchAuthentication(Cookie accessTokenCookie) {
		HttpHeaders headers = new HttpHeaders();
		headers.add(HttpHeaders.COOKIE,
			String.format("%s=%s", ACCESS_TOKEN_COOKIE_NAME, accessTokenCookie.getValue()));

		return proxyService.forwardRequest(AUTH_ENDPOINT, HttpMethod.GET, headers,
			null);
	}

	private void createAuthentication(String body) throws JsonProcessingException {
		JsonNode rootNode = objectMapper.readTree(body);
		JsonNode dataNode = rootNode.get("data");

		String userName = dataNode.get("userName").asText();
		String userRoleId = dataNode.get("userRoleId").asText();

		UserDetails userDetails = User
			.withUsername(userName)
			.password("")
			.authorities(userRoleId)
			.build();

		Authentication authentication = new UsernamePasswordAuthenticationToken(userDetails, null,
			userDetails.getAuthorities());

		SecurityContextHolder.getContext().setAuthentication(authentication);
	}
}
