package com.trackery.trackeryfrontserver.domain.oauth.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.view.RedirectView;

import lombok.extern.slf4j.Slf4j;

/**
 * packageName    : com.trackery.trackeryfrontserver.domain.oauth.controller
 * fileName       : OAuthController
 * author         : inari
 * date           : 25. 3. 10.
 * description    : 사용자를 각 소셜 로그인 제공자(구글, 카카오, 네이버, 깃허브)로 리디렉션하는 컨트롤러입니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 3. 10.        inari       최초 생성
 */
@Slf4j
@Controller
@RequestMapping("/oauth")
public class OAuthController {

	/**
	 * 구글 OAuth 인증 URL
	 */
	@Value("${oauth.google.auth-url}")
	private String googleAuthUrl;

	/**
	 * 카카오 OAuth 인증 URL
	 */
	@Value("${oauth.kakao.auth-url}")
	private String kakaoAuthUrl;

	/**
	 * 네이버 OAuth 인증 URL
	 */
	@Value("${oauth.naver.auth-url}")
	private String naverAuthUrl;

	/**
	 * 깃허브 OAuth 인증 URL
	 */
	@Value("${oauth.github.auth-url}")
	private String githubAuthUrl;

	/**
	 * 사용자를 선택한 OAuth 제공자의 인증 페이지로 리디렉션합니다.
	 * 지원되는 제공자: google, kakao, naver, github
	 *
	 * @param provider OAuth 제공자 (google, kakao, naver, github)
	 * @return 해당 제공자의 인증 페이지로 리다이렉트하는 RedirectView
	 */
	@GetMapping("/{provider}")
	public RedirectView redirectToProvider(@PathVariable String provider) {
		String authUrl;

		// 제공자에 따라 인증 URL 선택
		switch (provider.toLowerCase()) {
			case "google":
				authUrl = googleAuthUrl;
				break;
			case "kakao":
				authUrl = kakaoAuthUrl;
				break;
			case "naver":
				authUrl = naverAuthUrl;
				break;
			case "github":
				authUrl = githubAuthUrl;
				break;
			default:
				log.error("지원하지 않는 OAuth 제공자: {}", provider);
				return new RedirectView("/error?message=지원하지 않는 OAuth 제공자입니다");
		}

		log.info("OAuth 인증 URL로 리다이렉션: {}", authUrl);
		return new RedirectView(authUrl);
	}
}
