// main.js

const MAX_VISUAL_DEPTH = 4; // bars cap at 4, nesting continues logically

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

// ── Build post card ───────────────────────────────────────────────────────────
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
        <div class="comment-section"></div>
    `;

    // Render top comment tree immediately if one exists
    if (post.top_comment) {
        const section = div.querySelector('.comment-section');
        const hasMore = post.comment_count > 1;
        renderCommentTree([post.top_comment], section, post.id, 1, hasMore, post.top_comment.id);
    }

    return div;
}

// ── Render a comment tree recursively ─────────────────────────────────────────
// comments  = array of comment objects (each may have .children)
// container = DOM element to append into
// postId    = the parent post id
// depth     = current depth level (1 = direct reply to post)
// hasMore   = show "show more" button after last top-level comment
// excludeId = the comment id to exclude from "show more" fetch

function renderCommentTree(comments, container, postId, depth = 1, hasMore = false, excludeId = null) {
    comments.forEach((comment, index) => {
        const isLast       = index === comments.length - 1;
        const showMoreHere = hasMore && isLast && depth === 1;

        const row = buildCommentRow(comment, postId, depth, showMoreHere, excludeId);
        container.appendChild(row);

        // Recursively render children indented one level deeper
        if (comment.children && comment.children.length > 0) {
            const childContainer = document.createElement('div');
            childContainer.className = 'comment-children';
            container.appendChild(childContainer);
            renderCommentTree(comment.children, childContainer, postId, depth + 1, false, null);
        }
    });
}

// ── Build a single comment row ────────────────────────────────────────────────
function buildCommentRow(comment, postId, depth, showMore = false, excludeId = null) {
    const avatar      = comment.avatar_path ? `/${comment.avatar_path}` : 'assets/images/profile_picture.jpg';
    const likeDisplay = comment.like_count > 0 ? comment.like_count : '';
    const likeMargin  = comment.like_count > 0 ? '' : 'style="margin:0"';

    // Visual depth caps at MAX_VISUAL_DEPTH but logical depth keeps going
    const visualDepth = Math.min(depth, MAX_VISUAL_DEPTH);
    const bars        = '<div class="reply-bar"></div>'.repeat(visualDepth);

    const showMoreBtn = showMore
        ? `<div class="show-more-btn" data-post-id="${postId}" data-exclude-id="${excludeId}">
               <i class="fa-solid fa-ellipsis"></i>
               Show more comments
           </div>`
        : '';

    const row = document.createElement('div');
    row.className           = 'comment-row';
    row.dataset.commentId   = comment.id;
    row.dataset.postId      = postId;
    row.dataset.depth       = depth;
    row.innerHTML           = `
        <div class="comment-bars">${bars}</div>
        <div class="comment-body-wrap">
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
                <div class="like-btn comment-like-btn" data-comment-id="${comment.id}" data-liked="0">
                    <i class="like-icon fa-regular fa-heart" ${likeMargin}></i>
                    <div class="likes">${likeDisplay}</div>
                </div>
                <div class="comment-btn comment-reply-btn" data-post-id="${postId}" data-comment-id="${comment.id}" data-depth="${depth}">
                    <i class="comment-icon fa-regular fa-comment" style="margin:0"></i>
                </div>
                ${showMoreBtn}
            </div>
        </div>
    `;
    return row;
}

// ── Build compose box ─────────────────────────────────────────────────────────
function buildComposeBox(postId, parentId, depth) {
    const username    = currentUser ? currentUser.username : 'Guest';
    const visualDepth = Math.min(depth, MAX_VISUAL_DEPTH);
    const bars        = '<div class="reply-bar"></div>'.repeat(visualDepth);

    const row = document.createElement('div');
    row.className            = 'comment-row compose-box';
    row.dataset.postId       = postId;
    row.dataset.parentId     = parentId || '';
    row.dataset.depth        = depth;
    row.innerHTML            = `
        <div class="comment-bars">${bars}</div>
        <div class="comment-body-wrap">
            <div class="reply-draft">
                <div class="reply-draft-header">
                    <img class="profile-picture" src="assets/images/profile_picture.jpg" alt="Profile Picture">
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
        </div>
    `;

    const textarea  = row.querySelector('.reply-text-input');
    const charCount = row.querySelector('.character-count');
    const submitBtn = row.querySelector('.reply-submit-btn');

    textarea.addEventListener('input', () => {
        adjustTextAreaHeight(textarea);
        charCount.textContent = textarea.value.length + '/500';
    });

    textarea.addEventListener('keydown', e => {
        if (textarea.value.length >= 500 && e.key !== 'Backspace' && e.key !== 'Delete') {
            e.preventDefault();
        }
    });

    submitBtn.addEventListener('click', () => submitComment(postId, parentId, textarea, row));

    return row;
}

// ── Attach listeners ──────────────────────────────────────────────────────────
function attachPostListeners() {
    // Post like buttons
    document.querySelectorAll('.like-btn[data-post-id]:not([data-bound])').forEach(btn => {
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => handlePostLike(btn));
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

    // Post-level comment buttons (on post footer, not on comments)
    document.querySelectorAll('.comment-btn[data-post-id]:not(.comment-reply-btn):not([data-bound])').forEach(btn => {
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => handlePostCommentBtn(btn));
    });

    // Comment reply buttons
    document.querySelectorAll('.comment-reply-btn:not([data-bound])').forEach(btn => {
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => handleCommentReplyBtn(btn));
    });

    // Show more buttons
    document.querySelectorAll('.show-more-btn:not([data-bound])').forEach(btn => {
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => handleShowMore(btn));
    });
}

// ── Post comment button ───────────────────────────────────────────────────────
function handlePostCommentBtn(btn) {
    if (!currentUser) { window.location.href = '/login.html'; return; }

    const postCard = btn.closest('.post');
    const postId   = btn.dataset.postId;
    const section  = postCard.querySelector('.comment-section');

    // Toggle existing depth-1 compose box at the end of the section
    const existing = section.querySelector('.compose-box[data-depth="1"]');
    if (existing) {
        existing.remove();
        toggleIcon(btn);
        return;
    }

    toggleIcon(btn);

    // If no comments loaded yet, load them first then add compose box
    if (!section.querySelector('.comment-row')) {
        loadCommentsIntoSection(postId, section, btn);
    } else {
        const compose = buildComposeBox(postId, null, 1);
        section.appendChild(compose);
        compose.querySelector('.reply-text-input').focus();
    }
}

// ── Load full comment tree into a section ─────────────────────────────────────
async function loadCommentsIntoSection(postId, section, triggerBtn) {
    section.innerHTML = '<div class="feed-loading" style="padding:0.75rem 1rem">Loading comments...</div>';

    const res      = await fetch(`/api/get_comments.php?post_id=${postId}`);
    const comments = await res.json();

    section.innerHTML = '';

    if (comments.length > 0) {
        renderCommentTree(comments, section, postId, 1, false, null);
        attachPostListeners();
    }

    // Add compose box at the end
    if (triggerBtn) {
        const compose = buildComposeBox(postId, null, 1);
        section.appendChild(compose);
        compose.querySelector('.reply-text-input').focus();
    }
}

// ── Comment reply button ──────────────────────────────────────────────────────
function handleCommentReplyBtn(btn) {
    if (!currentUser) { window.location.href = '/login.html'; return; }

    const postId    = btn.dataset.postId;
    const commentId = btn.dataset.commentId;
    const depth     = parseInt(btn.dataset.depth) + 1;
    const commentRow = btn.closest('.comment-row');

    // Toggle: close if already open for this comment
    const next = commentRow.nextElementSibling;
    if (next && next.classList.contains('compose-box') && next.dataset.parentId === commentId) {
        next.remove();
        toggleIcon(btn);
        return;
    }

    toggleIcon(btn);

    // Close any other open compose boxes within this post first
    const postCard = commentRow.closest('.post');
    postCard.querySelectorAll('.compose-box').forEach(c => c.remove());

    // Re-toggle the icon since we just closed everything
    // (only re-toggle if the btn icon was already set above)

    const compose = buildComposeBox(postId, commentId, depth);
    commentRow.insertAdjacentElement('afterend', compose);
    compose.querySelector('.reply-text-input').focus();
}

// ── Show more ────────────────────────────────────────────────────────────────
async function handleShowMore(btn) {
    const postId    = btn.dataset.postId;
    const excludeId = btn.dataset.excludeId;

    btn.textContent = 'Loading...';
    btn.style.pointerEvents = 'none';

    const res      = await fetch(`/api/get_comments.php?post_id=${postId}&exclude_id=${excludeId}`);
    const comments = await res.json();

    btn.remove();

    if (!comments.length) return;

    const postCard = document.querySelector(`.post[data-id="${postId}"]`);
    const section  = postCard.querySelector('.comment-section');

    renderCommentTree(comments, section, postId, 1, false, null);
    attachPostListeners();
}

// ── Submit comment ────────────────────────────────────────────────────────────
async function submitComment(postId, parentId, textarea, composeRow) {
    const body = textarea.value.trim();
    if (!body) return;

    const submitBtn = composeRow.querySelector('.reply-submit-btn');
    submitBtn.style.opacity       = '0.5';
    submitBtn.style.pointerEvents = 'none';

    const formData = new FormData();
    formData.append('post_id', postId);
    formData.append('body', body);
    if (parentId) formData.append('parent_id', parentId);

    const res = await fetch('/api/create_comment.php', { method: 'POST', body: formData });
    if (res.status === 401) { window.location.href = '/login.html'; return; }

    const comment = await res.json();

    submitBtn.style.opacity       = '1';
    submitBtn.style.pointerEvents = 'auto';

    if (comment.error) return;

    textarea.value        = '';
    textarea.style.height = 'auto';

    const depth  = parseInt(composeRow.dataset.depth) || 1;
    const newRow = buildCommentRow(comment, postId, depth, false, null);

    // Insert before the compose box
    composeRow.insertAdjacentElement('beforebegin', newRow);
    attachPostListeners();

    // Bump post comment count
    const postCard   = composeRow.closest('.post');
    const commentBtn = postCard.querySelector('.comment-btn[data-post-id]:not(.comment-reply-btn)');
    if (commentBtn) increaseCount(commentBtn);
}

// ── Post like handler ─────────────────────────────────────────────────────────
async function handlePostLike(btn) {
    if (!currentUser) { window.location.href = '/login.html'; return; }

    const postId   = btn.dataset.postId;
    const icon     = btn.querySelector('.like-icon');
    const count    = btn.querySelector('.likes');
    const wasLiked = btn.dataset.liked === '1';

    btn.dataset.liked = wasLiked ? '0' : '1';
    icon.classList.toggle('fa-regular', wasLiked);
    icon.classList.toggle('fa-solid',   !wasLiked);

    const formData = new FormData();
    formData.append('post_id', postId);

    const res  = await fetch('/api/toggle_like.php', { method: 'POST', body: formData });
    if (res.status === 401) { window.location.href = '/login.html'; return; }

    const data = await res.json();
    if (data.error) {
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
