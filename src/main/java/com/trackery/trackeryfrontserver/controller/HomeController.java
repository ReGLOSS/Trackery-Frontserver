package com.trackery.trackeryfrontserver.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.ui.Model;
import com.trackery.trackeryfrontserver.service.ApiService;

import lombok.RequiredArgsConstructor;

/**
 * packageName    : com.trackery.trackeryfrontserver.config
 * fileName       : RestTemplateConfig
 * author         : narilee
 * date           : 25. 02. 06.
 * description    : 프론트 페이지 컨트롤러입니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 02. 06.        narilee       최초 생성
 */
@Controller
@RequiredArgsConstructor
public class HomeController {

	private final ApiService apiService;

	@GetMapping("/")
	public String home(Model model) {
		try {
			String message = apiService.getHello();
			model.addAttribute("message", message);
		} catch (Exception e) {
			model.addAttribute("error", "API 서버 연결 실패: " + e.getMessage());
		}
		return "home";
	}
}
