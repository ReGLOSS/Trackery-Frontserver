package com.trackery.trackeryfrontserver.domain.upload.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * packageName    : com.trackery.trackeryfrontserver.domain.upload.controller
 * fileName       : ImageUploadController
 * author         : durururuk
 * date           : 25. 4. 14.
 * description    : 이 컨트롤러는 이미지 업로드와 관련된 웹 페이지를 처리합니다. 사용자가 이미지 업로드 페이지를 요청하면,
 * 					이 컨트롤러가 해당 요청을 받아 upload/image-upload-content 템플릿을 반환하여 사용자에게 보여줍니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 4. 14.		durururuk		최초 생성
 * 25. 7. 7.		inari			주석 생성
 */
@Controller
@RequestMapping("/image-upload")
public class ImageUploadController {

	/**
	 * 이 메서드는 사용자가 이미지 업로드 페이지를 요청할 때 호출됩니다. HTTP GET 요청을 처리하여
	 * 이미지 업로드 UI를 사용자에게 보여주기 위한 뷰 템플릿의 이름을 반환합니다.
	 *
	 * @return upload/image-upload-content 페이지
	 */
	@GetMapping("")
	public String imageUploadPage() {
		return "upload/image-upload-content";
	}
}
