package com.trackery.trackeryfrontserver.domain.oauth.controller;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.view.RedirectView;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trackery.trackeryfrontserver.domain.proxy.service.ProxyService;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * packageName    : com.trackery.trackeryfrontserver.domain.oauth.controller
 * fileName       : OAuthController
 * author         : inari
 * date           : 25. 3. 10.
 * description    : 사용자를 각 소셜 로그인 제공자(구글, 카카오, 네이버, 깃허브)로 리디렉션하는 컨트롤러입니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 3. 10.        inari       최초 생성
 * 25. 3. 25.        inari       세션에서 토큰방식으로 변경
 * 25. 3. 26.        inari       OAuthAccountController 통합
 * 25. 3. 26.        inari       OAuthRedirectController 통합
 */
@Slf4j
@Controller
@RequestMapping("/oauth")
@RequiredArgsConstructor
public class OAuthController {

	private final ProxyService proxyService;
	private final ObjectMapper objectMapper;

	/**
	 * 구글 OAuth 인증 URL
	 */
	@Value("${oauth.google.auth-url}")
	private String googleAuthUrl;

	/**
	 * 카카오 OAuth 인증 URL
	 */
	@Value("${oauth.kakao.auth-url}")
	private String kakaoAuthUrl;

	/**
	 * 네이버 OAuth 인증 URL
	 */
	@Value("${oauth.naver.auth-url}")
	private String naverAuthUrl;

	/**
	 * 깃허브 OAuth 인증 URL
	 */
	@Value("${oauth.github.auth-url}")
	private String githubAuthUrl;

	/**
	 * 사용자를 선택한 OAuth 제공자의 인증 페이지로 리디렉션합니다.
	 * 지원되는 제공자: google, kakao, naver, github
	 *
	 * @param provider OAuth 제공자 (google, kakao, naver, github)
	 * @return 해당 제공자의 인증 페이지로 리다이렉트하는 RedirectView
	 */
	@GetMapping("/{provider}")
	public RedirectView redirectToProvider(
		@PathVariable String provider,
		@RequestParam(value = "link_token", required = false) String linkToken) {

		String authUrl;

		// 제공자에 따라 인증 URL 선택
		switch (provider.toLowerCase()) {
			case "google":
				authUrl = googleAuthUrl;
				break;
			case "kakao":
				authUrl = kakaoAuthUrl;
				break;
			case "naver":
				authUrl = naverAuthUrl;
				break;
			case "github":
				authUrl = githubAuthUrl;
				break;
			default:
				log.error("지원하지 않는 OAuth 제공자: {}", provider);
				return new RedirectView("/error?message=지원하지 않는 OAuth 제공자입니다");
		}

		// 링크 토큰이 있으면 처리
		if (linkToken != null && !linkToken.isEmpty()) {
			// 네이버의 경우 특별 처리
			if (provider.equalsIgnoreCase("naver")) {
				// 기존 state 파라미터 찾기
				String stateParam = null;
				int stateIndex = authUrl.indexOf("state=");

				if (stateIndex != -1) {
					// 기존 state 값 추출
					int stateEndIndex = authUrl.indexOf("&", stateIndex);
					if (stateEndIndex == -1) stateEndIndex = authUrl.length();
					String originalState = authUrl.substring(stateIndex + 6, stateEndIndex);

					// 원래 state값과 link_token을 합쳐서 새 state 생성
					// 형식: original_state:link_token=xxxxx
					stateParam = originalState + ":link_token=" + linkToken;

					// 기존 state 파라미터 제거 후 새 값으로 대체
					StringBuilder newUrl = new StringBuilder();
					newUrl.append(authUrl.substring(0, stateIndex));
					newUrl.append("state=").append(URLEncoder.encode(stateParam, StandardCharsets.UTF_8));
					if (stateEndIndex < authUrl.length()) {
						newUrl.append(authUrl.substring(stateEndIndex));
					}
					authUrl = newUrl.toString();
				} else {
					// state 파라미터가 없으면 새로 추가
					stateParam = "link_token=" + linkToken;
					authUrl += authUrl.contains("?") ? "&" : "?";
					authUrl += "state=" + URLEncoder.encode(stateParam, StandardCharsets.UTF_8);
				}
			} else {
				// 다른 제공자는 일반적인 방식으로 처리
				String stateParam = "link_token=" + linkToken;
				authUrl += authUrl.contains("?") ? "&" : "?";
				authUrl += "state=" + URLEncoder.encode(stateParam, StandardCharsets.UTF_8);
			}
		}

		log.info("OAuth 인증 URL로 리다이렉션: {}", authUrl);
		return new RedirectView(authUrl);
	}

	/**
	 * OAuth 제공자로부터 리다이렉트된 요청을 처리합니다.
	 * 인증 코드를 받아 백엔드 서버로 전달하고 로그인 또는 계정 연동을 처리합니다.
	 *
	 * @param provider OAuth 제공자 (google, kakao, naver, github)
	 * @param code 인증 코드
	 * @param state 상태 값 (네이버 OAuth에서 필요)
	 * @param response 서블릿 응답 객체
	 * @param model 뷰 모델
	 * @return 처리 후 리다이렉트할 뷰 이름
	 */
	@GetMapping("/callback/{provider}")
	public String handleOAuthRedirect(
		@PathVariable String provider,
		@RequestParam("code") String code,
		@RequestParam(value = "state", required = false) String state,
		HttpServletResponse response,
		Model model) {

		try {
			log.info("OAuth 리다이렉트 처리: provider={}, code={}, state={}", provider, code, state);

			// state 파라미터에서 link_token 추출
			String linkToken = null;

			if (state != null) {
				if (provider.equalsIgnoreCase("naver")) {
					// 네이버 state 형식: original_state:link_token=xxxxx
					int tokenIndex = state.indexOf(":link_token=");
					if (tokenIndex != -1) {
						linkToken = state.substring(tokenIndex + ":link_token=".length());
						log.info("네이버 OAuth state에서 링크 토큰 추출: {}", linkToken);
					}
				} else if (state.startsWith("link_token=")) {
					// 다른 제공자
					linkToken = state.substring("link_token=".length());
					log.info("OAuth state에서 링크 토큰 추출: {}", linkToken);
				}
			}

			// 백엔드 API URL 구성
			StringBuilder apiUrl = new StringBuilder("/api/users/oauth/login/")
				.append(provider)
				.append("?code=").append(code);

			// 연동 토큰이 있으면 파라미터 추가
			if (linkToken != null && !linkToken.trim().isEmpty()) {
				apiUrl.append("&link_token=").append(linkToken);
			}

			// 네이버의 경우 state 파라미터 필요
			if (provider.equalsIgnoreCase("naver")) {
				// 원래 state 값 추출 (링크 토큰 부분 제외)
				String originalState = state;
				if (state != null && state.contains(":link_token=")) {
					originalState = state.substring(0, state.indexOf(":link_token="));
				}
				apiUrl.append("&state=").append(originalState);
			}

			// 백엔드 API 호출
			HttpHeaders headers = new HttpHeaders();
			ResponseEntity<String> apiResponse = proxyService.forwardRequest(
				apiUrl.toString(), HttpMethod.GET, headers, null);

			// 응답 헤더 복사 (쿠키 등)
			copyHeaders(apiResponse.getHeaders(), response);

			// 응답 본문 파싱 및 로깅
			String responseBody = apiResponse.getBody();

			JsonNode jsonResponse = objectMapper.readTree(responseBody);

			// 이미 존재하는 이메일 확인
			if (jsonResponse.has("data") &&
				jsonResponse.get("data").has("existingEmail") &&
				jsonResponse.get("data").get("existingEmail").asBoolean()) {

				// 이미 존재하는 이메일인 경우 연동 페이지로 이동
				String email = jsonResponse.path("data").path("email").asText("");

				// 백엔드에 계정 연동 토큰 요청
				HttpHeaders tokenHeaders = new HttpHeaders();
				tokenHeaders.setContentType(MediaType.APPLICATION_JSON);

				String requestBody = String.format(
					"{\"provider\":\"%s\",\"email\":\"%s\",\"linkAccount\":true}",
					provider, email);

				ResponseEntity<String> tokenResponse = proxyService.forwardRequest(
					"/api/users/oauth/link-account",
					HttpMethod.POST,
					tokenHeaders,
					requestBody);

				JsonNode tokenJson = objectMapper.readTree(tokenResponse.getBody());
				String newLinkToken = tokenJson.path("data").path("token").asText("");

				model.addAttribute("provider", provider);
				model.addAttribute("code", code);
				model.addAttribute("email", email);
				model.addAttribute("linkToken", newLinkToken);

				if (state != null) {
					model.addAttribute("state", state);
				}

				log.info("계정 연동 페이지로 이동: provider={}, email={}, linkToken={}",
					provider, email, newLinkToken);
				return "oauth/link-account";
			}

			return "oauth/close-popup";

		} catch (Exception e) {
			log.error("OAuth 리다이렉트 처리 중 오류 발생: ", e);
			model.addAttribute("errorMessage", "인증 처리 중 오류가 발생했습니다: " + e.getMessage());
			return "oauth/error";
		}
	}


	/**
	 * 계정 연동 처리를 시작합니다 (폼 제출 방식).
	 * 세션 대신 토큰을 사용합니다.
	 *
	 * @param provider OAuth 제공자 (google, kakao, naver, github)
	 * @param linkToken 연동 토큰
	 * @return OAuth 인증 페이지로 리다이렉트
	 */
	@PostMapping("/link")
	public String linkAccount(
		@RequestParam("provider") String provider,
		@RequestParam(value = "linkToken", required = false) String linkToken) {

		try {
			log.info("계정 연동 프로세스 시작: provider={}, linkToken={}", provider, linkToken);

			// 토큰 파라미터 전달
			if (linkToken != null && !linkToken.trim().isEmpty()) {
				return "redirect:/oauth/" + provider + "?link_token=" + linkToken;
			} else {
				return "redirect:/oauth/" + provider;
			}
		} catch (Exception e) {
			log.error("계정 연동 처리 중 오류 발생: ", e);
			return "redirect:/oauth/error?message=" +
				URLEncoder.encode("계정 연동 중 오류가 발생했습니다", StandardCharsets.UTF_8);
		}
	}

	/**
	 * HTTP 헤더(쿠키)를 소스에서 대상 응답으로 복사합니다.
	 *
	 * @param sourceHeaders 소스 HTTP 헤더
	 * @param response 대상 HTTP 응답 객체
	 */
	private void copyHeaders(HttpHeaders sourceHeaders, HttpServletResponse response) {
		if (sourceHeaders.containsKey(HttpHeaders.SET_COOKIE)) {
			for (String cookie : sourceHeaders.get(HttpHeaders.SET_COOKIE)) {
				response.addHeader(HttpHeaders.SET_COOKIE, cookie);
			}
		}
	}
}
