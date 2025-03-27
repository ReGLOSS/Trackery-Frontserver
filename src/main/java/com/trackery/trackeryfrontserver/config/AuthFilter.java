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

	@Override
	protected void doFilterInternal(HttpServletRequest request, @NonNull HttpServletResponse response,
		@NonNull FilterChain filterChain) throws ServletException, IOException {

		Optional<Cookie> accessTokenCookie = Optional.ofNullable(request.getCookies())
			.flatMap(cookies -> Arrays.stream(cookies)
				.filter(cookie -> "accessToken".equals(cookie.getName()))
				.findFirst());

		if (accessTokenCookie.isEmpty()) {
			response.sendError(HttpServletResponse.SC_FORBIDDEN);
			return;
		}

		HttpHeaders headers = new HttpHeaders();
		headers.add(HttpHeaders.COOKIE, String.format("accessToken=%s", accessTokenCookie.get().getValue()));

		ResponseEntity<String> responseEntity = proxyService.forwardRequest("/api/auth/me", HttpMethod.GET, headers,
			null);

		if (!responseEntity.getStatusCode().is2xxSuccessful()) {
			response.sendError(HttpServletResponse.SC_FORBIDDEN);
			return;
		}

		String body = responseEntity.getBody();

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

		filterChain.doFilter(request, response);
	}
}
