package com.trackery.trackeryfrontserver.domain.home.controller.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * packageName    : com.trackery.trackeryfrontserver.domain.home.controller.dto
 * fileName       : UserProfileViewModel
 * author         : inari
 * date           : 25. 4. 15.
 * description    :
 * ===========================================================
 * DATE              AUTHOR             NOTE
 * -----------------------------------------------------------
 * 25. 4. 15.        inari       최초 생성
 */
@Getter
@AllArgsConstructor
public class UserProfileViewModel {
	private Long userId;
	private String userName;
	private String nickname;
	private String userProfile;
}
