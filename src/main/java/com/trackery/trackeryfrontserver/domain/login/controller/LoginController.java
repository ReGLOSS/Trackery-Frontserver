package com.trackery.trackeryfrontserver.domain.login.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * packageName    : com.trackery.trackeryfrontserver.domain.login.controller
 * fileName       : LoginController
 * author         : durururuk
 * date           : 25. 2. 27.
 * description    :
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 2. 27.        durururuk      최초 생성
 */
@Controller
@RequestMapping("/login")
public class LoginController {

	@GetMapping("/modal-html")
	public String modalHtml() {
		return "login/login-modal";
	}

}
