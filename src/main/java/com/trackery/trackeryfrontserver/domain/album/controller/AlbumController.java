package com.trackery.trackeryfrontserver.domain.album.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * packageName    : com.trackery.trackeryfrontserver.domain.album.controller
 * fileName       : AlbumController
 * author         : durururuk
 * date           : 25. 5. 30.
 * description    : 앨범 페이지로 가는 컨트롤러입니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 5. 30.		durururuk		최초 생성
 */
@Controller
@RequestMapping("/albums")
public class AlbumController {
	@GetMapping
	public String albumPage() {
		return "/album/album-content";
	}
}
