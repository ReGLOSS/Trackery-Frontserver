package com.trackery.trackeryfrontserver.domain.mypage.controller;

import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

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
 */
@Slf4j
@Controller
@RequestMapping("/mypage")
public class MyPageController {
	@GetMapping("")
	public String myPage() {
		return "mypage/mypage-content";
	}

	@GetMapping("/update-user-info-modal")
	public String updateUserInfoModal() {
		return "mypage/update-user-info-modal";
	}

}
