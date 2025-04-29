package com.trackery.trackeryfrontserver.domain.register.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * packageName    : com.trackery.trackeryfrontserver.domain.register.controller
 * fileName       : ModalTestController
 * author         : durururuk
 * date           : 25. 2. 17.
 * description    : 프론트서버의 회원가입 페이지 컨트롤러입니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 2. 17.        durururuk       최초 생성
 * 25. 3. 17.        inari           주석 추가
 */
@Controller
@RequestMapping("/register")
public class RegisterController {
	//TODO 로그인 페이지 후 삭제

	/**
	 * 로그인 모달 창을 만들기 전 사용될 임시 회원가입 모달 버튼용 페이지
	 * @return : 임시 버튼 페이지
	 */
	@GetMapping("/modal-test")
	public String testModal() {
		return "register/temporal-plate";
	}

	/**
	 * 실제 회원가입을 담당하는 모달용 HTML
	 * @return : 회원가입 모달용 HTML
	 */
	@GetMapping("/modal-html")
	public String modalHtml() {
		return "register/register-modal";
	}

	//TODO 기능 개발 후 이 엔드포인트 삭제 후 진짜 메인페이지로 이동되게 수정

	/**
	 * 회원가입이 완료되면 이동될 임시 메인페이지입니다.
	 * @return : 메인페이지
	 */
	@GetMapping("/temporal-main")
	public String toMain() {
		return "home";
	}
}
