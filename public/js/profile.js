// profile.js
// Handles the user profile page feed and follow/unfollow button.
// Runs after main.js so checkAuth() and buildPostCard() are available.

(async () => {
    // Wait for auth check from main.js
    await checkAuth();

    // ── Load this user's posts ────────────────────────────────────────────────
    const container = document.getElementById('profile-posts');
    if (!container) return;

    let profilePage = 1;
    let profileDone = false;

    async function loadProfilePosts() {
        if (profileDone) return;

        const res   = await fetch(`/api/get_user_posts.php?username=${encodeURIComponent(PROFILE_USERNAME)}&page=${profilePage}`);
        const posts = await res.json();

        if (profilePage === 1) container.innerHTML = '';

        if (!posts.length) {
            profileDone = true;
            if (profilePage === 1) {
                container.innerHTML = '<div class="feed-empty">No posts yet.</div>';
            }
            return;
        }

        posts.forEach(post => container.appendChild(buildPostCard(post)));
        attachPostListeners();
        profilePage++;
    }

    await loadProfilePosts();

    // ── Follow / unfollow button ──────────────────────────────────────────────
    const followBtn = document.getElementById('follow-btn');
    if (followBtn) {
        followBtn.addEventListener('click', async () => {
            const userId    = followBtn.dataset.userId;
            const following = followBtn.dataset.following === '1';

            const formData = new FormData();
            formData.append('user_id', userId);

            const res  = await fetch('/api/toggle_follow.php', { method: 'POST', body: formData });
            if (res.status === 401) { window.location.href = '/login.html'; return; }

            const data = await res.json();
            if (data.error) return;

            // Update button state
            followBtn.dataset.following = data.followed ? '1' : '0';
            followBtn.className = 'profile-action-btn' + (data.followed ? ' following' : '');
            followBtn.innerHTML = data.followed
                ? '<i class="fa-solid fa-user-check"></i> Following'
                : '<i class="fa-solid fa-user-plus"></i> Follow';

            // Update follower count
            const countEl = document.getElementById('follower-count');
            if (countEl) countEl.textContent = data.follower_count.toLocaleString();
        });
    }
})();
