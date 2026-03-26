// main.js

// ── Auth state ────────────────────────────────────────────────────────────────
let currentUser = null;

async function checkAuth() {
    const res  = await fetch('/api/auth_status.php');
    const data = await res.json();

    if (data.logged_in) {
        currentUser = data;
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.href      = `/user/${data.username}`;
            loginBtn.innerHTML = `<i id="login-icon" class="fa-solid fa-user"></i>${data.username}`;
        }
    }
}

// ── Feed ──────────────────────────────────────────────────────────────────────
let currentPage = 1;
let isLoading   = false;
let noMorePosts = false;

async function loadPosts(page = 1) {
    if (isLoading || noMorePosts) return;
    isLoading = true;

    const feed = document.querySelector('.content-center');
    if (page === 1) feed.innerHTML = '<div class="feed-loading">Loading...</div>';

    const res   = await fetch(`/api/get_posts.php?page=${page}`);
    const posts = await res.json();

    if (page === 1) feed.innerHTML = '';

    if (posts.length === 0) {
        noMorePosts = true;
        if (page === 1) feed.innerHTML = '<div class="feed-empty">No posts yet. Be the first!</div>';
        isLoading = false;
        return;
    }

    posts.forEach(post => feed.appendChild(buildPostCard(post)));
    attachPostListeners();
    currentPage = page;
    isLoading   = false;
}

// ── Build a post card ─────────────────────────────────────────────────────────
function buildPostCard(post) {
    const avatar      = post.avatar_path ? `/${post.avatar_path}` : 'assets/images/profile_picture.jpg';
    const imageHtml   = post.image_path  ? `<div class="image"><img src="/${post.image_path}" alt="Post image"></div>` : '';
    const likeIcon    = post.user_liked  ? 'fa-solid' : 'fa-regular';
    const likeDisplay = post.like_count    > 0 ? post.like_count    : '';
    const commDisplay = post.comment_count > 0 ? post.comment_count : '';
    const likeMargin  = post.like_count    > 0 ? '' : 'style="margin:0"';
    const commMargin  = post.comment_count > 0 ? '' : 'style="margin:0"';

    const div = document.createElement('div');
    div.className  = 'post';
    div.dataset.id = post.id;
    div.innerHTML  = `
        <div class="post-header">
            <img class="profile-picture" src="${avatar}" alt="Profile Picture">
            <div class="post-details">
                <div class="username">${escapeHtml(post.display_name || post.username)}</div>
                <div class="timestamp">${escapeHtml(post.timestamp_formatted)}</div>
            </div>
        </div>
        <div class="post-content">
            <div class="text">${escapeHtml(post.body)}</div>
            ${imageHtml}
        </div>
        <div class="post-footer">
            <div class="like-btn" data-post-id="${post.id}" data-liked="${post.user_liked ? '1' : '0'}">
                <i class="like-icon ${likeIcon} fa-heart" ${likeMargin}></i>
                <div class="likes">${likeDisplay}</div>
            </div>
            <div class="comment-btn" data-post-id="${post.id}">
                <i class="comment-icon fa-regular fa-comment" ${commMargin}></i>
                <div class="comments">${commDisplay}</div>
            </div>
            <div class="share-btn">
                <i class="share-icon fa-regular fa-share-from-square" style="margin:0"></i>
                <div class="shares"></div>
            </div>
        </div>
        <div class="highlighted-reply"></div>
    `;

    // ── Render top comment immediately if one exists ───────────────────────────
    if (post.top_comment) {
        const replyArea = div.querySelector('.highlighted-reply');
        const hasMore   = post.comment_count > 1;
        replyArea.appendChild(
            buildCommentCard(post.top_comment, post.id, hasMore, true)
        );
    }

    return div;
}

// ── Build a comment card ──────────────────────────────────────────────────────
// isTop    = true if this is the auto-rendered top comment
// hasMore  = true if there are more comments beyond this one (show "Show more" button)

function buildCommentCard(comment, postId, hasMore = false, isTop = false) {
    const avatar      = comment.avatar_path ? `/${comment.avatar_path}` : 'assets/images/profile_picture.jpg';
    const likeDisplay = comment.like_count > 0 ? comment.like_count : '';
    const likeMargin  = comment.like_count > 0 ? '' : 'style="margin:0"';

    const showMoreBtn = (hasMore && isTop)
        ? `<div class="show-more-btn" data-post-id="${postId}" data-exclude-id="${comment.id}">
               <i class="fa-solid fa-ellipsis"></i>
               Show more comments
           </div>`
        : '';

    const wrapper         = document.createElement('div');
    wrapper.className     = 'highlighted-reply';
    wrapper.innerHTML     = `
        <div class="reply-bar"></div>
        <div class="comment">
            <div class="comment-header">
                <img class="profile-picture" src="${avatar}" alt="Profile Picture">
                <div class="comment-details">
                    <div class="username">${escapeHtml(comment.display_name || comment.username)}</div>
                    <div class="timestamp">${escapeHtml(comment.timestamp_formatted)}</div>
                </div>
            </div>
            <div class="comment-content">
                <div class="text">${escapeHtml(comment.body)}</div>
            </div>
            <div class="comment-footer">
                <div class="like-btn" data-comment-id="${comment.id}" data-liked="0">
                    <i class="like-icon fa-regular fa-heart" ${likeMargin}></i>
                    <div class="likes">${likeDisplay}</div>
                </div>
                ${showMoreBtn}
            </div>
        </div>
    `;
    return wrapper;
}

// ── Build compose box ─────────────────────────────────────────────────────────
function buildComposeBox(postId) {
    const username = currentUser ? currentUser.username : 'Guest';
    const avatar   = 'assets/images/profile_picture.jpg';

    const wrapper         = document.createElement('div');
    wrapper.className     = 'highlighted-reply compose-box';
    wrapper.dataset.postId = postId;
    wrapper.innerHTML     = `
        <div class="reply-bar"></div>
        <div class="reply-draft">
            <div class="reply-draft-header">
                <img class="profile-picture" src="${avatar}" alt="Profile Picture">
                <div class="draft-details">
                    <div class="username">${escapeHtml(username)}</div>
                    <div class="timestamp">Replying...</div>
                </div>
            </div>
            <div class="reply-draft-content">
                <textarea class="reply-text-input" placeholder="Type your reply..."></textarea>
            </div>
            <div class="reply-draft-footer">
                <div class="post-btn reply-submit-btn">
                    <i class="post-icon fa-solid fa-arrow-up"></i>
                    <div class="post-text">Post</div>
                </div>
                <div class="character-count">0/500</div>
            </div>
        </div>
    `;

    const textarea  = wrapper.querySelector('.reply-text-input');
    const charCount = wrapper.querySelector('.character-count');
    const submitBtn = wrapper.querySelector('.reply-submit-btn');

    textarea.addEventListener('input', () => {
        adjustTextAreaHeight(textarea);
        charCount.textContent = textarea.value.length + '/500';
    });

    textarea.addEventListener('keydown', e => {
        if (textarea.value.length >= 500 && e.key !== 'Backspace' && e.key !== 'Delete') {
            e.preventDefault();
        }
    });

    submitBtn.addEventListener('click', () => submitComment(postId, textarea, wrapper));

    return wrapper;
}

// ── Attach listeners to post cards ────────────────────────────────────────────
function attachPostListeners() {
    // Post like buttons
    document.querySelectorAll('.like-btn[data-post-id]:not([data-bound])').forEach(btn => {
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => handleLike(btn));
    });

    // Share buttons
    document.querySelectorAll('.share-btn:not([data-bound])').forEach(btn => {
        btn.dataset.bound = '1';
        let shared = false;
        btn.addEventListener('click', () => {
            toggleIcon(btn);
            shared ? decreaseCount(btn) : increaseCount(btn);
            shared = !shared;
        });
    });

    // Comment buttons — open compose box below existing comments
    document.querySelectorAll('.comment-btn[data-post-id]:not([data-bound])').forEach(btn => {
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => handleCommentBtn(btn));
    });

    // Show more comments buttons
    document.querySelectorAll('.show-more-btn:not([data-bound])').forEach(btn => {
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => handleShowMore(btn));
    });
}

// ── Comment button handler ────────────────────────────────────────────────────
// Toggles a compose box below the post's existing comment section.

function handleCommentBtn(btn) {
    if (!currentUser) { window.location.href = '/login.html'; return; }

    const postCard = btn.closest('.post');
    const postId   = btn.dataset.postId;

    // Check if a compose box is already open for this post
    const existing = postCard.querySelector('.compose-box');
    if (existing) {
        existing.remove();
        toggleIcon(btn);
        return;
    }

    toggleIcon(btn);

    const compose = buildComposeBox(postId);

    // Insert compose box after the last .highlighted-reply,
    // or after post-footer if no comments yet
    const allReplies = postCard.querySelectorAll('.highlighted-reply');
    if (allReplies.length > 0) {
        allReplies[allReplies.length - 1].insertAdjacentElement('afterend', compose);
    } else {
        postCard.querySelector('.post-footer').insertAdjacentElement('afterend', compose);
    }

    compose.querySelector('.reply-text-input').focus();
}

// ── Show more comments handler ────────────────────────────────────────────────
async function handleShowMore(btn) {
    const postId    = btn.dataset.postId;
    const excludeId = btn.dataset.excludeId;

    // Remove the button immediately so it can't be double-clicked
    btn.remove();

    const res      = await fetch(`/api/get_comments.php?post_id=${postId}&exclude_id=${excludeId}`);
    const comments = await res.json();

    if (!comments.length) return;

    // Find the post card to insert into
    const postCard = document.querySelector(`.post[data-id="${postId}"]`);
    if (!postCard) return;

    // Find insertion point — after the last .highlighted-reply currently in the post
    // but before any compose box
    const composeBox   = postCard.querySelector('.compose-box');
    const allReplies   = postCard.querySelectorAll('.highlighted-reply');
    const lastReply    = allReplies[allReplies.length - 1];
    const insertBefore = composeBox || null;
    const parent       = postCard;

    comments.forEach((comment, index) => {
        const isLast    = index === comments.length - 1;
        // No "show more" button on these — they're all the comments
        const card = buildCommentCard(comment, postId, false, false);
        if (insertBefore) {
            parent.insertBefore(card, insertBefore);
        } else if (lastReply) {
            lastReply.insertAdjacentElement('afterend', card);
        } else {
            postCard.querySelector('.post-footer').insertAdjacentElement('afterend', card);
        }
    });
}

// ── Submit comment ────────────────────────────────────────────────────────────
async function submitComment(postId, textarea, composeWrapper) {
    const body = textarea.value.trim();
    if (!body) return;

    const formData = new FormData();
    formData.append('post_id', postId);
    formData.append('body', body);

    const res = await fetch('/api/create_comment.php', { method: 'POST', body: formData });
    if (res.status === 401) { window.location.href = '/login.html'; return; }

    const comment = await res.json();
    if (comment.error) return;

    textarea.value        = '';
    textarea.style.height = 'auto';

    // Insert new comment card just before the compose box
    const newCard = buildCommentCard(comment, postId, false, false);
    composeWrapper.insertAdjacentElement('beforebegin', newCard);

    // Bump the comment count on the post's comment button
    const postCard  = composeWrapper.closest('.post');
    const commentBtn = postCard.querySelector('.comment-btn[data-post-id]');
    if (commentBtn) increaseCount(commentBtn);
}

// ── Like handler ──────────────────────────────────────────────────────────────
async function handleLike(btn) {
    if (!currentUser) { window.location.href = '/login.html'; return; }

    const postId   = btn.dataset.postId;
    const icon     = btn.querySelector('.like-icon');
    const count    = btn.querySelector('.likes');
    const wasLiked = btn.dataset.liked === '1';

    // Optimistic update
    btn.dataset.liked = wasLiked ? '0' : '1';
    icon.classList.toggle('fa-regular', wasLiked);
    icon.classList.toggle('fa-solid',   !wasLiked);

    const formData = new FormData();
    formData.append('post_id', postId);

    const res = await fetch('/api/toggle_like.php', { method: 'POST', body: formData });
    if (res.status === 401) { window.location.href = '/login.html'; return; }

    const data = await res.json();
    if (data.error) {
        // Revert on error
        btn.dataset.liked = wasLiked ? '1' : '0';
        icon.classList.toggle('fa-regular', !wasLiked);
        icon.classList.toggle('fa-solid',   wasLiked);
        return;
    }

    count.textContent = data.like_count > 0 ? data.like_count : '';
    icon.style.margin = data.like_count > 0 ? '0 0.5rem 0 0' : '0';
}

// ── Post modal ────────────────────────────────────────────────────────────────
function openPostModal() {
    if (!currentUser) { window.location.href = '/login.html'; return; }

    const existing = document.getElementById('post-modal-overlay');
    if (existing) existing.remove();

    const overlay     = document.createElement('div');
    overlay.id        = 'post-modal-overlay';
    overlay.innerHTML = `
        <div id="post-modal">
            <div class="modal-header">
                <div class="modal-title">New post</div>
                <div id="modal-close-btn"><i class="fa-solid fa-xmark"></i></div>
            </div>
            <div class="modal-body">
                <textarea id="modal-body-input" placeholder="What's on your mind?" maxlength="500"></textarea>
                <div class="modal-footer">
                    <div class="modal-footer-left">
                        <label class="attachment-btn" id="modal-attachment-btn">
                            <input type="file" id="modal-image-input" accept="image/*" style="display:none">
                            <i class="attachment-icon fa-solid fa-image"></i>
                            <div class="attachment-text">Add image</div>
                        </label>
                        <div id="modal-image-name"></div>
                    </div>
                    <div class="modal-footer-right">
                        <div id="modal-char-count">0/500</div>
                        <div id="modal-submit-btn" class="post-btn">
                            <i class="post-icon fa-solid fa-arrow-up"></i>
                            <div class="post-text">Post</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const textarea   = document.getElementById('modal-body-input');
    const charCount  = document.getElementById('modal-char-count');
    const imageInput = document.getElementById('modal-image-input');
    const imageName  = document.getElementById('modal-image-name');
    const submitBtn  = document.getElementById('modal-submit-btn');
    const closeBtn   = document.getElementById('modal-close-btn');

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    closeBtn.addEventListener('click', () => overlay.remove());

    textarea.addEventListener('input', () => {
        const len = textarea.value.length;
        charCount.textContent = `${len}/500`;
        charCount.style.color = len >= 450 ? '#bf3322' : '';
    });

    imageInput.addEventListener('change', () => {
        const file = imageInput.files[0];
        imageName.textContent = file ? `${formatFileSize(file.size)} — ${file.name}` : '';
    });

    submitBtn.addEventListener('click', () => submitPost(overlay));
    textarea.focus();
}

async function submitPost(overlay) {
    const body       = document.getElementById('modal-body-input').value.trim();
    const imageInput = document.getElementById('modal-image-input');
    const submitBtn  = document.getElementById('modal-submit-btn');
    if (!body) return;

    submitBtn.style.opacity       = '0.5';
    submitBtn.style.pointerEvents = 'none';

    const formData = new FormData();
    formData.append('body', body);
    if (imageInput.files[0]) formData.append('image', imageInput.files[0]);

    const res = await fetch('/api/create_post.php', { method: 'POST', body: formData });
    if (res.status === 401) { window.location.href = '/login.html'; return; }

    const post = await res.json();
    if (post.error) {
        submitBtn.style.opacity       = '1';
        submitBtn.style.pointerEvents = 'auto';
        return;
    }

    overlay.remove();
    const feed    = document.querySelector('.content-center');
    const newCard = buildPostCard(post);
    feed.insertBefore(newCard, feed.firstChild);
    attachPostListeners();
}

// ── Post button ───────────────────────────────────────────────────────────────
const postBtn = document.getElementById('post-btn');
if (postBtn) postBtn.addEventListener('click', openPostModal);

// ── Utilities ─────────────────────────────────────────────────────────────────
function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str ?? ''));
    return div.innerHTML;
}

function toggleIcon(element) {
    const icon = element.firstElementChild;
    icon.classList.toggle('fa-regular');
    icon.classList.toggle('fa-solid');
}

function increaseCount(element) {
    const count = element.lastElementChild;
    if (count.innerText !== '') {
        count.innerText = parseInt(count.innerText) + 1;
    } else {
        element.firstElementChild.style.margin = '0 0.5rem 0 0';
        count.innerText = '1';
    }
}

function decreaseCount(element) {
    const count = element.lastElementChild;
    if (count.innerText !== '1') {
        count.innerText = parseInt(count.innerText) - 1;
    } else {
        element.firstElementChild.style.margin = '0';
        count.innerText = '';
    }
}

function adjustTextAreaHeight(element) {
    element.style.height = 'auto';
    element.style.height = element.scrollHeight + 'px';
}

function formatFileSize(size) {
    if (size === 0) return '0 Bytes';
    const units = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(size) / Math.log(1024));
    return parseFloat((size / Math.pow(1024, i)).toFixed(2)) + ' ' + units[i];
}

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => {
    await checkAuth();
    if (document.querySelector('.content-center') && document.getElementById('main-page')) {
        await loadPosts(1);
    }
})();
