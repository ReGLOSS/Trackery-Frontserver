package com.trackery.trackeryfrontserver.domain.oauth.controller;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.view.RedirectView;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trackery.trackeryfrontserver.domain.proxy.service.ProxyService;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * packageName    : com.trackery.trackeryfrontserver.domain.oauth.controller
 * fileName       : OAuthAccountController
 * author         : inari
 * date           : 25. 3. 14.
 * description    : OAuth를 통한 기존 계정과 계정 연동을 처리하는 컨트롤러입니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 3. 14.        inari       최초 생성
 * 25. 3. 16.        inari       팝업으로 변경
 */
@Slf4j
@Controller
@RequestMapping("/oauth-account")
@RequiredArgsConstructor
public class OAuthAccountController {

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
	 * 계정 연동 처리를 시작합니다 (폼 제출 방식).
	 * 해당 OAuth 제공자로 리다이렉트하기 전에 세션에 연동 의도를 저장합니다.
	 *
	 * @param provider OAuth 제공자 (google, kakao, naver, github)
	 * @param session HTTP 세션
	 * @return OAuth 인증 페이지로 리다이렉트
	 */
	@PostMapping("/link")
	public String linkAccount(
		@RequestParam("provider") String provider,
		HttpSession session) {

		try {
			log.info("계정 연동 프로세스 시작: provider={}", provider);

			// 연동 의도를 세션에 저장 (중요)
			session.setAttribute("link_account_intent", true);

			// 새로운 OAuth 인증 과정 시작
			return "redirect:/oauth/" + provider;
		} catch (Exception e) {
			log.error("계정 연동 처리 중 오류 발생: ", e);
			return "redirect:/oauth/error?message=" +
				URLEncoder.encode("계정 연동 중 오류가 발생했습니다", StandardCharsets.UTF_8);
		}
	}

	/**
	 * 새로운 OAuth 연동 요청을 처리합니다 (AJAX 또는 직접 호출용).
	 * 적절한 OAuth 제공자의 인증 URL로 리다이렉트하고 세션에 연동 의도를 저장합니다.
	 *
	 * @param provider OAuth 제공자 (google, kakao, naver, github)
	 * @param session HTTP 세션
	 * @return 적절한 OAuth URL로 리다이렉트
	 */
	@GetMapping("/process")
	public RedirectView processLinkAccount(
		@RequestParam("provider") String provider,
		HttpSession session) {

		try {
			// OAuth 인증 URL 선택
			String authUrl;
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
					return new RedirectView("/error?message=" +
						URLEncoder.encode("지원하지 않는 OAuth 제공자입니다", StandardCharsets.UTF_8));
			}

			// 계정 연동 플래그 추가
			if (!authUrl.contains("link_account=true")) {
				authUrl += authUrl.contains("?") ? "&link_account=true" : "?link_account=true";
			}

			// 세션에 연동 의도 저장
			session.setAttribute("link_account_intent", true);

			log.info("OAuth 인증 URL로 리다이렉션: {}", authUrl);
			return new RedirectView(authUrl);

		} catch (Exception e) {
			log.error("OAuth 리다이렉트 처리 중 오류: ", e);
			return new RedirectView("/error?message=" +
				URLEncoder.encode("인증 처리 중 오류가 발생했습니다", StandardCharsets.UTF_8));
		}
	}

	/**
	 * 백엔드에 계정 연동 요청을 전송합니다 (이미 토큰이 있는 경우).
	 * 기존 이메일과 OAuth 제공자 정보를 사용하여 계정을 연동합니다.
	 *
	 * @param provider OAuth 제공자 (google, kakao, naver, github)
	 * @param email 연동할 이메일 주소
	 * @param response HTTP 응답 객체
	 * @param session HTTP 세션
	 * @return 처리 후 리다이렉트할 뷰 이름
	 */
	@PostMapping("/backend-link")
	public String sendLinkRequest(
		@RequestParam("provider") String provider,
		@RequestParam("email") String email,
		HttpServletResponse response,
		HttpSession session) {

		try {
			log.info("백엔드 계정 연동 요청: provider={}, email={}", provider, email);

			// 백엔드 API에 직접 연동 요청
			Map<String, Object> requestBody = new HashMap<>();
			requestBody.put("provider", provider);
			requestBody.put("email", email);
			requestBody.put("linkAccount", true);

			// 백엔드 API URL
			String apiUrl = "/api/users/oauth/link-account";

			// 백엔드 API 호출
			HttpHeaders headers = new HttpHeaders();
			headers.add("Content-Type", "application/json");

			ResponseEntity<String> apiResponse = proxyService.forwardRequest(
				apiUrl,
				HttpMethod.POST,
				headers,
				objectMapper.writeValueAsString(requestBody));

			// 응답 헤더 복사 (쿠키 등)
			if (apiResponse.getHeaders().containsKey(HttpHeaders.SET_COOKIE)) {
				for (String cookie : apiResponse.getHeaders().get(HttpHeaders.SET_COOKIE)) {
					response.addHeader(HttpHeaders.SET_COOKIE, cookie);
				}
			}

			// 응답 본문 파싱
			JsonNode responseBody = objectMapper.readTree(apiResponse.getBody());
			int statusCode = responseBody.path("code").asInt();

			if (statusCode == 200) {
				// 세션에서 연동 관련 정보 제거
				session.removeAttribute("link_account_intent");

				// 연동 성공 시 메인 페이지로
				return "oauth/close-popup";

			} else {
				// 오류 발생 - 오류 페이지로
				String errorMessage = responseBody.path("message").asText("계정 연동 중 오류가 발생했습니다");

				// 오류 정보 전달
				session.setAttribute("errorMessage", errorMessage);
				return "redirect:/oauth/error";
			}

		} catch (Exception e) {
			log.error("계정 연동 요청 처리 중 오류: ", e);
			session.setAttribute("errorMessage", "계정 연동 중 오류가 발생했습니다: " + e.getMessage());
			return "redirect:/oauth/error";
		}
	}

	/**
	 * 계정 연동 프로세스를 취소합니다.
	 * 세션에서 연동 관련 정보를 제거하고 홈페이지로 리다이렉트합니다.
	 *
	 * @param session HTTP 세션
	 * @return 홈페이지로 리다이렉트
	 */
	@GetMapping("/cancel")
	public String cancelLinking(HttpSession session) {
		// 세션에서 연동 관련 정보 제거
		session.removeAttribute("link_account_intent");

		return "redirect:/";
	}
}
