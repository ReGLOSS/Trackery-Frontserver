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

import jakarta.servlet.http.HttpServletRequest;
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
 * 25. 6. 23.        inari       기존 회원 연동 기능 추가
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
			if (provider.equalsIgnoreCase("naver")) {
				// 네이버: state=random_state_{link_token} 형태로 처리
				int stateIndex = authUrl.indexOf("state=");
				if (stateIndex != -1) {
					// 기존 state 값 추출
					int stateEndIndex = authUrl.indexOf("&", stateIndex);
					if (stateEndIndex == -1)
						stateEndIndex = authUrl.length();
					String originalState = authUrl.substring(stateIndex + 6, stateEndIndex);

					// 원래 state값에 링크 토큰을 붙여서 새 state 생성
					// 형식: random_state_{link_token}
					String newStateParam = originalState + "_" + linkToken;

					// 기존 state 파라미터 제거 후 새 값으로 대체
					StringBuilder newUrl = new StringBuilder();
					newUrl.append(authUrl.substring(0, stateIndex));
					newUrl.append("state=").append(URLEncoder.encode(newStateParam, StandardCharsets.UTF_8));
					if (stateEndIndex < authUrl.length()) {
						newUrl.append(authUrl.substring(stateEndIndex));
					}
					authUrl = newUrl.toString();
				} else {
					// state 파라미터가 없으면 새로 추가
					String stateParam = "random_state_" + linkToken;
					authUrl += authUrl.contains("?") ? "&" : "?";
					authUrl += "state=" + URLEncoder.encode(stateParam, StandardCharsets.UTF_8);
				}
			} else {
				// GitHub/카카오/구글: state=link_{link_token} 형태로 처리
				int stateIndex = authUrl.indexOf("state=");
				if (stateIndex != -1) {
					// 기존 state 파라미터를 link_{link_token}으로 대체
					int stateEndIndex = authUrl.indexOf("&", stateIndex);
					if (stateEndIndex == -1)
						stateEndIndex = authUrl.length();

					String newStateParam = "link_" + linkToken;

					// 기존 state 파라미터 제거 후 새 값으로 대체
					StringBuilder newUrl = new StringBuilder();
					newUrl.append(authUrl.substring(0, stateIndex));
					newUrl.append("state=").append(URLEncoder.encode(newStateParam, StandardCharsets.UTF_8));
					if (stateEndIndex < authUrl.length()) {
						newUrl.append(authUrl.substring(stateEndIndex));
					}
					authUrl = newUrl.toString();
				} else {
					// state 파라미터가 없으면 새로 추가
					String stateParam = "link_" + linkToken;
					authUrl += authUrl.contains("?") ? "&" : "?";
					authUrl += "state=" + URLEncoder.encode(stateParam, StandardCharsets.UTF_8);
				}
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
		@RequestParam(value = "link_token", required = false) String linkTokenParam,
		HttpServletRequest request,
		HttpServletResponse response,
		Model model) {

		try {
			log.info("OAuth 리다이렉트 처리: provider={}, code={}, state={}, link_token={}", provider, code, state, linkTokenParam);

			// 링크 토큰 추출
			String linkToken = null;
			
			if (provider.equalsIgnoreCase("naver")) {
				// 네이버: state=random_state_<link_token> 형태에서 토큰 추출
				if (state != null) {
					log.info("네이버 state 파라미터 분석 시작: state={}", state);
					if (state.startsWith("random_state_") && state.length() > "random_state_".length()) {
						linkToken = state.substring("random_state_".length());
						log.info("네이버 OAuth state에서 링크 토큰 추출 성공: linkToken={}", linkToken);
					} else {
						log.info("네이버 OAuth state에 링크 토큰 없음 (일반 로그인), state={}", state);
					}
				} else {
					log.info("네이버 state 파라미터가 null입니다 (일반 로그인)");
				}
			} else {
				// GitHub/카카오/구글: state=link_<link_token> 형태에서 토큰 추출
				if (state != null) {
					log.info("{} state 파라미터 분석 시작: state={}", provider, state);
					if (state.startsWith("link_") && state.length() > "link_".length()) {
						linkToken = state.substring("link_".length());
						log.info("{} OAuth state에서 링크 토큰 추출 성공: linkToken={}", provider, linkToken);
					} else {
						log.info("{} OAuth state에 링크 토큰 없음 (일반 로그인), state={}", provider, state);
					}
				} else {
					log.info("{} state 파라미터가 null입니다 (일반 로그인)", provider);
				}
			}
			
			log.info("링크 토큰 추출 결과: linkToken={}", linkToken);

			// API URL 구성 - 모든 경우에 login API 사용
			StringBuilder apiUrl = new StringBuilder();
			apiUrl.append("/api/users/oauth/login/")
				.append(provider)
				.append("?code=").append(code);
			
			// 네이버의 경우 state 파라미터 필요
			if (provider.equalsIgnoreCase("naver") && state != null && !state.isEmpty()) {
				apiUrl.append("&state=").append(state);
			}
			
			if (linkToken != null && !linkToken.trim().isEmpty()) {
				log.info("기존 회원 연동 API 호출: {}", apiUrl.toString());
			} else {
				log.info("신규 가입/로그인 API 호출: {}", apiUrl.toString());
			}

			// 백엔드 API 호출
			HttpHeaders headers = new HttpHeaders();
			
			// 기존 회원 연동의 경우 인증 쿠키 전달
			if (linkToken != null && !linkToken.trim().isEmpty()) {
				String cookieHeader = request.getHeader("Cookie");
				if (cookieHeader != null) {
					headers.set("Cookie", cookieHeader);
					log.info("기존 회원 연동 - 쿠키 헤더 전달: {}", cookieHeader);
				}
			}
			
			ResponseEntity<String> apiResponse = proxyService.forwardRequest(
				apiUrl.toString(), HttpMethod.GET, headers, null);

			// 응답 헤더 복사 (쿠키 등)
			copyHeaders(apiResponse.getHeaders(), response);

			// 응답 본문 파싱 및 로깅
			String responseBody = apiResponse.getBody();
			JsonNode jsonResponse = objectMapper.readTree(responseBody);

			// 이미 존재하는 이메일 확인 (회원가입 시 간편로그인)
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

			// 성공적인 로그인/회원가입 처리
			if (apiResponse.getStatusCode().is2xxSuccessful()) {
				log.info("OAuth 로그인/회원가입 성공: provider={}", provider);
				return "oauth/close-popup";
			} else {
				log.error("OAuth 로그인/회원가입 실패: {} - {}", apiResponse.getStatusCode(), responseBody);
				return "redirect:/oauth/close-popup?error=auth_failed&error_description=" + 
					URLEncoder.encode("로그인에 실패했습니다", StandardCharsets.UTF_8);
			}

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
	 * 기존 사용자 OAuth 연동을 위한 OAuth URL을 생성하여 반환합니다.
	 * JavaScript에서 호출하여 팝업으로 OAuth 인증을 진행할 때 사용됩니다.
	 *
	 * @param provider OAuth 제공자 (google, kakao, naver, github)
	 * @param request HTTP 요청 객체 (쿠키 추출용)
	 * @return OAuth URL이 포함된 JSON 응답
	 */
	@PostMapping("/api/users/oauth/link/{provider}/url")
	public ResponseEntity<String> generateOAuthUrl(
		@PathVariable String provider,
		HttpServletRequest request) {

		try {
			log.info("기존 사용자 OAuth 연동 URL 생성 요청: provider={}", provider);

			// 백엔드 API 호출하여 OAuth URL 생성
			HttpHeaders headers = new HttpHeaders();
			headers.setContentType(MediaType.APPLICATION_JSON);
			
			// 현재 요청의 쿠키를 백엔드로 전달
			String cookieHeader = request.getHeader("Cookie");
			if (cookieHeader != null) {
				headers.set("Cookie", cookieHeader);
				log.info("기존 사용자 OAuth URL 생성 - 쿠키 헤더 전달: {}", cookieHeader);
			}

			ResponseEntity<String> apiResponse = proxyService.forwardRequest(
				"/api/users/oauth/link/" + provider + "/url",
				HttpMethod.POST,
				headers,
				"{}");

			log.info("백엔드 OAuth URL 생성 응답: {}", apiResponse.getStatusCode());
			log.info("백엔드 OAuth URL 응답 본문: {}", apiResponse.getBody());
			
			// 백엔드에서 받은 URL에 link_token이 포함되어 있는지 확인
			if (apiResponse.getBody() != null) {
				if (apiResponse.getBody().contains("link_token")) {
					log.info("백엔드에서 생성된 OAuth URL에 link_token 포함됨");
				} else {
					log.warn("백엔드에서 생성된 OAuth URL에 link_token이 포함되지 않음");
				}
			}
			
			return apiResponse;

		} catch (Exception e) {
			log.error("OAuth URL 생성 중 오류 발생: ", e);
			String errorResponse = "{\"success\":false,\"message\":\"OAuth URL 생성 중 오류가 발생했습니다: " + e.getMessage() + "\"}";
			return ResponseEntity.status(500).body(errorResponse);
		}
	}

	/**
	 * 기존 사용자 OAuth 연동 콜백을 처리합니다.
	 * OAuth 인증 완료 후 백엔드 API를 호출하여 연동을 완료합니다.
	 *
	 * @param provider OAuth 제공자 (google, kakao, naver, github)
	 * @param code OAuth 인증 코드
	 * @param state OAuth state 파라미터
	 * @param request HTTP 요청 객체
	 * @param response HTTP 응답 객체
	 * @return 연동 결과 페이지
	 */
	@GetMapping("/api/users/oauth/link/{provider}")
	public String handleOAuthLinkCallback(
		@PathVariable String provider,
		@RequestParam("code") String code,
		@RequestParam(value = "state", required = false) String state,
		HttpServletRequest request,
		HttpServletResponse response) {

		try {
			log.info("기존 사용자 OAuth 연동 콜백 처리: provider={}, code={}, state={}", provider, code, state);

			// 백엔드 API URL 구성
			StringBuilder apiUrl = new StringBuilder("/api/users/oauth/link/")
				.append(provider)
				.append("?code=").append(code);

			// 네이버의 경우 state 파라미터 필요
			if (provider.equalsIgnoreCase("naver") && state != null) {
				apiUrl.append("&state=").append(state);
			}

			// 백엔드 API 호출
			HttpHeaders headers = new HttpHeaders();
			
			// 현재 요청의 쿠키를 백엔드로 전달 (JWT 토큰 포함)
			String cookieHeader = request.getHeader("Cookie");
			if (cookieHeader != null) {
				headers.set("Cookie", cookieHeader);
				log.info("기존 사용자 연동 콜백 - 쿠키 헤더 전달: {}", cookieHeader);
			}
			
			ResponseEntity<String> apiResponse = proxyService.forwardRequest(
				apiUrl.toString(), HttpMethod.GET, headers, null);

			log.info("백엔드 OAuth 연동 응답: {}", apiResponse.getStatusCode());

			// 응답 헤더 복사 (쿠키 등)
			copyHeaders(apiResponse.getHeaders(), response);

			// 연동 결과에 따라 적절한 페이지로 리다이렉트
			if (apiResponse.getStatusCode().is2xxSuccessful()) {
				log.info("기존 사용자 OAuth 연동 성공: provider={}", provider);
				return "redirect:/oauth/close-popup?success=true";
			} else {
				String errorMessage = "OAuth 연동에 실패했습니다";
				if (apiResponse.getStatusCode().value() == 401) {
					errorMessage = "인증이 필요합니다. 로그인을 다시 시도해주세요";
				}
				
				log.error("기존 사용자 OAuth 연동 실패: {} - {}", apiResponse.getStatusCode(), apiResponse.getBody());
				return "redirect:/oauth/close-popup?error=auth_failed&error_description=" + 
					URLEncoder.encode(errorMessage, StandardCharsets.UTF_8);
			}

		} catch (Exception e) {
			log.error("OAuth 연동 콜백 처리 중 오류 발생: ", e);
			return "redirect:/oauth/close-popup?error=server_error&error_description=" + 
				URLEncoder.encode("서버 오류가 발생했습니다", StandardCharsets.UTF_8);
		}
	}

	/**
	 * OAuth 팝업 닫기 페이지를 표시합니다.
	 * 성공/실패 정보를 부모 창으로 전달합니다.
	 *
	 * @param success 성공 여부 (선택사항)
	 * @param error 오류 코드 (선택사항)
	 * @param errorDescription 오류 설명 (선택사항)
	 * @param model 뷰 모델
	 * @return close-popup 템플릿
	 */
	@GetMapping("/close-popup")
	public String closePopup(
		@RequestParam(value = "success", required = false) String success,
		@RequestParam(value = "error", required = false) String error,
		@RequestParam(value = "error_description", required = false) String errorDescription,
		Model model) {
		
		model.addAttribute("success", "true".equals(success));
		
		if (error != null) {
			model.addAttribute("error", error);
			model.addAttribute("errorDescription", errorDescription);
			log.info("OAuth 팝업 오류 처리: error={}, description={}", error, errorDescription);
		} else {
			log.info("OAuth 팝업 성공 처리: success={}", success);
		}
		
		return "oauth/close-popup";
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
