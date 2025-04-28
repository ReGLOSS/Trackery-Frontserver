package com.trackery.trackeryfrontserver.domain.upload.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * packageName    : com.trackery.trackeryfrontserver.domain.upload.controller
 * fileName       : ImageUploadController
 * author         : durururuk
 * date           : 25. 4. 14.
 * description    :
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 4. 14.		durururuk		최초 생성
 */
@Controller
@RequestMapping("/image-upload")
public class ImageUploadController {
    @GetMapping("")
    public String imageUploadPage() {
        return "upload/image-upload-content";
    }
}
