package com.trackery.trackeryfrontserver.domain.mypage.controller;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trackery.trackeryfrontserver.domain.home.controller.dto.UserProfileViewModel;
import com.trackery.trackeryfrontserver.domain.proxy.service.ProxyService;

import jakarta.servlet.http.HttpServletRequest;

/**
 * packageName    : com.trackery.trackeryfrontserver.domain.mypage.controller
 * fileName       : MyPageController
 * author         : durururuk
 * date           : 25. 4. 8.
 * description    : 마이페이지 관련 url를 관리하는 컨트롤러입니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 4. 8.		durururuk		최초 생성
 * 25. 4. 8.		durururuk		마이페이지 url 작성
 * 25. 6. 26.		inari			세션 갱신 기능 추가
 */
@Slf4j
@Controller
@RequestMapping("/mypage")
@RequiredArgsConstructor
public class MyPageController {
	
	private final ProxyService proxyService;
	private final ObjectMapper objectMapper = new ObjectMapper();
	@GetMapping("")
	public String myPage() {
		return "mypage/mypage-content";
	}

	@GetMapping("/update-user-info-modal")
	public String updateUserInfoModal() {
		return "mypage/update-user-info-modal";
	}

	/**
	 * 회원정보 수정 후 세션의 userProfile을 새로고침합니다.
	 * AuthFilter의 fetchUserProfile 로직과 동일한 방식으로 세션을 갱신합니다.
	 * 
	 * @param request HTTP 요청 객체
	 * @return 새로고침 성공 여부를 담은 JSON 응답
	 */
	@PostMapping("/refresh-session")
	@ResponseBody
	public ResponseEntity<String> refreshUserProfileSession(HttpServletRequest request) {
		try {
			// AuthFilter의 fetchUserProfile과 동일한 로직
			fetchUserProfile(request);
			log.info("사용자 프로필 세션 새로고침 완료");
			return ResponseEntity.ok("{\"success\": true, \"message\": \"세션이 성공적으로 새로고침되었습니다.\"}");
		} catch (Exception e) {
			log.error("세션 새로고침 중 오류 발생", e);
			return ResponseEntity.internalServerError().body("{\"success\": false, \"message\": \"세션 새로고침 중 오류가 발생했습니다.\"}");
		}
	}

	/**
	 * AuthFilter의 fetchUserProfile 메서드와 동일한 로직으로 프로필 정보를 가져와서 세션에 저장합니다.
	 * 
	 * @param request HTTP 요청 객체
	 */
	private void fetchUserProfile(HttpServletRequest request) {
		try {
			HttpHeaders headers = new HttpHeaders();
			String cookieHeader = request.getHeader(HttpHeaders.COOKIE);
			if (cookieHeader != null) {
				headers.add(HttpHeaders.COOKIE, cookieHeader);
			}

			ResponseEntity<String> profileResponse = proxyService.forwardRequest(
				"/api/users/profile/me",
				HttpMethod.GET,
				headers,
				null
			);

			if (profileResponse.getStatusCode().is2xxSuccessful()) {
				JsonNode rootNode = objectMapper.readTree(profileResponse.getBody());
				JsonNode dataNode = rootNode.get("data");

				if (dataNode != null) {
					JsonNode userIdNode = dataNode.get("userId");
					JsonNode userNameNode = dataNode.get("userName");
					JsonNode nicknameNode = dataNode.get("nickname");
					JsonNode userProfileNode = dataNode.get("userProfile");

					if (userIdNode != null && userNameNode != null && nicknameNode != null) {
						UserProfileViewModel profile = new UserProfileViewModel(
							userIdNode.asLong(),
							userNameNode.asText(),
							nicknameNode.asText(),
							userProfileNode != null ? userProfileNode.asText() : null
						);

						request.getSession().setAttribute("userProfile", profile);
					}
				}
			}
		} catch (Exception e) {
			log.error("프로필 정보 가져오기 실패", e);
		}
	}

}
