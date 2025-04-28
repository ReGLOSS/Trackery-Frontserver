package com.trackery.trackeryfrontserver.domain.home.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trackery.trackeryfrontserver.domain.home.controller.dto.UserProfileViewModel;
import com.trackery.trackeryfrontserver.domain.proxy.service.ProxyService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;

/**
 * packageName    : com.trackery.trackeryfrontserver.controller
 * fileName       : LandingController
 * author         : narilee
 * date           : 25. 02. 11.
 * description    : 프론트서버의 랜딩 페이지 컨트롤러입니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 02. 11.        narilee       최초 생성
 * 25. 02. 26.        narilee       경로 수정
 * 25. 03. 27.		  durururuk     인증 정보에 따른 리다이렉션 추가
 */
@Controller
@RequiredArgsConstructor
public class LandingController {

	private final ProxyService proxyService;
	private final ObjectMapper objectMapper = new ObjectMapper();


	/**
	 * 유저가 접속시 최초로 보게 되는 기본 페이지 입니다.
	 *
	 * @return 액세스 토큰이 없다면 랜딩페이지로, 있다면 /home으로 리다이렉트합니다.
	 */
	@GetMapping("/")
	public String landing(@CookieValue(value = "accessToken", required = false) String accessToken) {
		if (accessToken != null) {
			return "redirect:/home";
		}
		return "landing";
	}

	@GetMapping("/home")
	public String mainPage(Model model, HttpServletRequest request, HttpSession session) {
		// 세션에 프로필 정보가 없으면 API 호출
		if (session.getAttribute("userProfile") == null) {
			fetchAndStoreUserProfile(request, session, model);
		} else {
			// 세션에 이미 있으면 모델에 추가
			model.addAttribute("userProfile", session.getAttribute("userProfile"));
		}

		return "home";
	}

	/**
	 * 사용자 프로필 정보를 가져와 세션과 모델에 저장합니다.
	 */
	private void fetchAndStoreUserProfile(HttpServletRequest request, HttpSession session, Model model) {
		try {
			HttpHeaders headers = new HttpHeaders();
			String cookieHeader = request.getHeader(HttpHeaders.COOKIE);
			if (cookieHeader != null) {
				headers.add(HttpHeaders.COOKIE, cookieHeader);
			}

			ResponseEntity<String> response = proxyService.forwardRequest(
				"/api/users/profile/me",
				HttpMethod.GET,
				headers,
				null
			);

			if (response.getStatusCode().is2xxSuccessful()) {
				JsonNode rootNode = objectMapper.readTree(response.getBody());
				JsonNode dataNode = rootNode.get("data");

				UserProfileViewModel profile = new UserProfileViewModel(
					dataNode.get("userId").asLong(),
					dataNode.get("userName").asText(),
					dataNode.get("nickname").asText(),
					dataNode.get("userProfile").asText()
				);

				session.setAttribute("userProfile", profile);
				model.addAttribute("userProfile", profile);
			}
		} catch (Exception e) {
			// 프로필 조회 실패 시 기본 정보 설정 또는 로그 기록
			model.addAttribute("fetchProfileError", true);
		}
	}
}
