package com.trackery.trackeryfrontserver.domain.home.controller.dto;

import java.io.Serializable;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * packageName    : com.trackery.trackeryfrontserver.domain.home.controller.dto
 * fileName       : UserProfileViewModel
 * author         : inari
 * date           : 25. 4. 15.
 * description    : 사용자 프로필 정보를 담는 ViewModel 클래스입니다.
 * 					세션에 저장되기 위해 Serializable 인터페이스를 구현합니다.
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 4. 15.        inari       최초 생성
 */
@Getter
@AllArgsConstructor
public class UserProfileViewModel implements Serializable {
	/** 직렬화 버전 UID */
	private static final long serialVersionUID = 1L;

	/** 사용자의 고유 식별자 */
	private Long userId;

	/** 사용자의 로그인 아이디 */
	private String userName;

	/** 사용자의 표시 이름 */
	private String nickname;

	/** 사용자의 프로필 이미지 URL */
	private String userProfile;
}
