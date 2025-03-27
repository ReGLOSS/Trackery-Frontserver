package com.trackery.trackeryfrontserver.domain.login.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * packageName    : com.trackery.trackeryfrontserver.domain.login.controller
 * fileName       : LoginController
 * author         : durururuk
 * date           : 25. 2. 27.
 * description    : 프론트서버의 로그인 페이지 컨트롤러입니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 2. 27.        durururuk      최초 생성
 * 25. 3. 17.        inari          주석 추가
 */
@Controller
@RequestMapping("/login")
public class LoginController {

	@GetMapping("/login-modal-html")
	public String getLoginModalHtml() {
		return "login/login-modal";
	}

	@GetMapping("/find-account-modal-html")
	public String getFindAccountModalHtml() {
		return "login/find-account-modal";
	}

}
