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
 */
@Controller
public class LandingController {

	/**
	 * 유저가 접속시 최초로 보게 되는 웹페이지 입니다.
	 *
	 * @return
	 */
	@GetMapping("/")
	public String landing(@CookieValue(value = "accessToken", required = false) String accessToken) {
		if(accessToken != null) {
			return "redirect:/register/temporal-main";
		}
		return "landing";
	}

	@GetMapping("/home")
	public String mainPage() {
		return "home";
	}
}
