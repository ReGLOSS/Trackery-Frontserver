package com.trackery.trackeryfrontserver.domain.home.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;

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
 * 25. 03. 27.		  narilee    	사이드바 유저 정보 GlobalModelAttributeController로 이관
 * 25. 07. 25.		  narilee    	홈 위치 수정 및 이름 변경
 */
@Controller
public class homeController {

	/**
	 * 유저가 접속시 최초로 보게 되는 기본 페이지 입니다.
	 *
	 * @return 액세스 토큰이 없다면 랜딩페이지로, 있다면 /home으로 리다이렉트합니다.
	 */
	@GetMapping("/")
	public String landing(@CookieValue(value = "accessToken", required = false) String accessToken,
						  jakarta.servlet.http.HttpServletRequest request) {
		// 에러 처리 중인 요청은 LandingController가 처리하지 않음
		if (request.getAttribute("jakarta.servlet.error.status_code") != null) {
			return "forward:/error";
		}
		
		if (accessToken != null) {
			return "redirect:/home";
		}
		return "home/landing";
	}

	@GetMapping("/home")
	public String mainPage() {
		return "home/home";
	}
}
