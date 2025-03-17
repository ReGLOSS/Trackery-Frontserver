package com.trackery.trackeryfrontserver.domain.oauth.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trackery.trackeryfrontserver.domain.proxy.service.ProxyService;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * packageName    : com.trackery.trackeryfrontserver.domain.oauth.controller
 * fileName       : OAuthRedirectController
 * author         : inari
 * date           : 25. 3. 13.
 * description    : OAuth 제공자로부터 인증 코드를 받아 처리하는 백엔드로 리다이렉트하는 컨트롤러입니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 3. 13.        inari       최초 생성
 * 25. 3. 16.        inari       팝업으로 변경
 */
@Slf4j
@Controller
@RequestMapping("/oauth-redirect")
@RequiredArgsConstructor
public class OAuthRedirectController {

	private final ProxyService proxyService;
	private final ObjectMapper objectMapper;

	/**
	 * OAuth 제공자로부터 리다이렉트된 요청을 처리합니다.
	 * 인증 코드를 받아 백엔드 서버로 전달하고 로그인 또는 계정 연동을 처리합니다.
	 *
	 * @param provider OAuth 제공자 (google, kakao, naver, github)
	 * @param code 인증 코드
	 * @param state 상태 값 (네이버 OAuth에서 필요)
	 * @param response 서블릿 응답 객체
	 * @param model 뷰 모델
	 * @param session HTTP 세션
	 * @return 처리 후 리다이렉트할 뷰 이름
	 */
	@GetMapping("/{provider}")
	public String handleOAuthRedirect(
		@PathVariable String provider,
		@RequestParam("code") String code,
		@RequestParam(value = "state", required = false) String state,
		HttpServletResponse response,
		Model model,
		HttpSession session) {

		try {
			log.info("OAuth 리다이렉트 처리: provider={}, code={}", provider, code);

			// 세션에서 계정 연동 의도 확인
			boolean isLinkingAccount = session.getAttribute("link_account_intent") != null;

			// 백엔드 API URL 구성
			StringBuilder apiUrl = new StringBuilder("/api/users/oauth/login/")
				.append(provider)
				.append("?code=").append(code);

			// 연동 의도가 있으면 link_account=true 파라미터 추가
			if (isLinkingAccount) {
				apiUrl.append("&link_account=true");
				session.removeAttribute("link_account_intent");
			}

			if (state != null && provider.equalsIgnoreCase("naver")) {
				apiUrl.append("&state=").append(state);
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

			// 중요: isExistingEmail 확인 추가
			if (jsonResponse.has("data") &&
				jsonResponse.get("data").has("existingEmail") &&
				jsonResponse.get("data").get("existingEmail").asBoolean()) {

				// 이미 존재하는 이메일인 경우 연동 페이지로 이동
				String email = jsonResponse.path("data").path("email").asText("");

				model.addAttribute("provider", provider);
				model.addAttribute("code", code);
				model.addAttribute("email", email);
				if (state != null) {
					model.addAttribute("state", state);
				}

				log.info("계정 연동 페이지로 이동: provider={}, email={}", provider, email);
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
