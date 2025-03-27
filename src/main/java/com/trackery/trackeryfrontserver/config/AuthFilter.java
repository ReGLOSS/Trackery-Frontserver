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
 * 25. 3. 26.       durururuk       최초 생성
 * 25. 3. 26.		durururuk		필터 작성
 * 25. 3. 26.		durururuk		메서드 분리
 * 25. 3. 26.		durururuk		주석 작성
 */
@Slf4j
@RequiredArgsConstructor
public class AuthFilter extends OncePerRequestFilter {
	private final ProxyService proxyService;
	private final ObjectMapper objectMapper = new ObjectMapper();

	private static final String ACCESS_TOKEN_COOKIE_NAME = "accessToken";
	private static final String AUTH_ENDPOINT = "/api/auth/me";

	/**
	 * 클라이언트가 인증이 필요한 URI에 접근할 때,
	 * 백엔드 API를 호출해서 인증 정보를 확인하고
	 * 인증 정보를 시큐리티 컨텍스트에 담는 필터입니다.
	 *
	 * @param request : 클라이언트 요청 객체 (HttpServletRequest)
	 * @param response : 서버 응답 객체 (HttpServletResponse)
	 * @param filterChain : 인증 필요한 URI에서 작동하는 시큐리티 필터체인
	 */
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

	/**
	 * 요청 객체에서 쿠키를 파싱해서 액세스 토큰 쿠키를 Optional로 반환하는 메서드
	 *
	 * @param request : 클라이언트 요청 객체 (HttpServletRequest)
	 * @return : 액세스 토큰 쿠키
	 */
	private Optional<Cookie> extractAccessTokenCookie(HttpServletRequest request) {

		return Optional.ofNullable(request.getCookies())
			.flatMap(cookies -> Arrays.stream(cookies)
				.filter(cookie -> ACCESS_TOKEN_COOKIE_NAME.equals(cookie.getName()))
				.findFirst());
	}

	/**
	 * 백엔드서버에 인증 여부를 확인하는 api를 호출하는 메서드
	 *
	 * @param accessTokenCookie : 액세스 토큰 쿠키
	 * @return 인증 성공 시 200 코드와 유저 데이터(id, 유저명, 권한 id)를 담고있는 ResponseEntity 객체 반환
	 */
	private ResponseEntity<String> fetchAuthentication(Cookie accessTokenCookie) {
		HttpHeaders headers = new HttpHeaders();
		headers.add(HttpHeaders.COOKIE,
			String.format("%s=%s", ACCESS_TOKEN_COOKIE_NAME, accessTokenCookie.getValue()));

		return proxyService.forwardRequest(AUTH_ENDPOINT, HttpMethod.GET, headers,
			null);
	}

	/**
	 * ResponseEntity의 body를 파싱해서 인증 정보를 Spring Security Context Holder에 저장합니다.
	 * 단순 인증 필터지만 userName, userRoleId를 받는 이유는 시큐리티 컨텍스트 홀더에 담아서
	 * 다음 필터에도 인증 정보를 넘기기 위해서는 인증 정보가 필요합니다.
	 * userRoleId는 사용자 권한(Role)에 따른 페이지 접근을 관리하기 위해 저장합니다.
 	 *
	 * @param body : 백엔드서버에서 반환된 응답의 body를 String으로 저장한 객체입니다.
	 *               JSON 형식, userId, userName, userRoleId 포함
	 * @throws JsonProcessingException : Json 프로세싱 시 던져질 수 있는 예외
	 */
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
