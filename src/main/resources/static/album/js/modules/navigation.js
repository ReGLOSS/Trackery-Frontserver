// ============================================================
// navigation.js - 내비게이션 모듈
// ============================================================

export const Navigation = {
    // 앨범 내비게이션 초기화
    initAlbumNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');

        navButtons.forEach(button => {
            button.addEventListener('click', function() {
                // 이전 활성 버튼 해제
                navButtons.forEach(btn => btn.classList.remove('active'));
                
                // 현재 버튼 활성화
                this.classList.add('active');
                
                // 필터 적용
                const filter = this.dataset.filter;
                Navigation.filterAlbums(filter);
            });
        });
    },

    // 앨범 필터링
    filterAlbums(filter) {
        const albumCards = document.querySelectorAll('.album-card');

        albumCards.forEach(card => {
            const isPublic = card.dataset.isPublic;
            let shouldShow = false;

            switch(filter) {
                case 'all':
                    shouldShow = true;
                    break;
                case 'public':
                    shouldShow = isPublic === '1' || isPublic === 'true';
                    break;
                case 'private':
                    shouldShow = isPublic === '0' || isPublic === 'false';
                    break;
            }

            if (shouldShow) {
                card.style.display = 'block';
                card.style.animation = 'fadeIn 0.3s ease';
            } else {
                card.style.display = 'none';
            }
        });

        console.log(`${filter} 필터 적용됨`);
    }
};
