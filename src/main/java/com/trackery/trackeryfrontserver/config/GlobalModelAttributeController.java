package com.trackery.trackeryfrontserver.config;

import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

import com.trackery.trackeryfrontserver.domain.home.controller.dto.UserProfileViewModel;

import jakarta.servlet.http.HttpSession;

/**
 * packageName    : com.trackery.trackeryfrontserver.config
 * fileName       : GlobalModelAttributeController
 * author         : narilee
 * date           : 25. 06. 12.
 * description    : 모든 컨트롤러에 공통으로 사용되는 모델 속성을 제공하는 전역 컨트롤러 어드바이스입니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 06. 12.        narilee       최초 생성
 */
@ControllerAdvice
@Component
public class GlobalModelAttributeController {

    /**
     * 모든 컨트롤러에 userProfile 모델 속성을 자동으로 추가합니다.
     * AuthFilter에서 세션에 저장된 userProfile을 가져와서 모델에 추가합니다.
     * 
     * @param session HTTP 세션
     * @return 세션에 저장된 UserProfileViewModel 또는 null
     */
    @ModelAttribute("userProfile")
    public UserProfileViewModel addUserProfile(HttpSession session) {
        return (UserProfileViewModel) session.getAttribute("userProfile");
    }
}
