// main.js

const MAX_VISUAL_DEPTH = 4;

// ── Auth state ────────────────────────────────────────────────────────────────
let currentUser = null;

async function checkAuth() {
    const res  = await fetch('/api/auth_status.php');
    const data = await res.json();
    if (data.logged_in) {
        currentUser = data; // includes is_admin from updated auth_status.php
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

    const trashBtn = post.can_delete
        ? `<div class="delete-btn delete-post-btn" data-post-id="${post.id}">
               <i class="fa-regular fa-trash-can"></i>
           </div>`
        : '';

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
            ${trashBtn}
        </div>
        <div class="comment-section"></div>
    `;

    // Render top comment only (no children) on feed
    if (post.top_comment) {
        const section = div.querySelector('.comment-section');
        const hasMore = post.comment_count > 1;
        // Pass the top comment with empty children — children load on "show more"
        const topWithNoChildren = { ...post.top_comment, children: [] };
        renderCommentTree([topWithNoChildren], section, post.id, 1, hasMore, post.top_comment.id);
    }

    return div;
}

// ── Render comment tree recursively ──────────────────────────────────────────
// hasMore / excludeId only used at depth=1 for the "show more" button
function renderCommentTree(comments, container, postId, depth, hasMore, excludeId) {
    comments.forEach((comment, index) => {
        const isLast       = index === comments.length - 1;
        // Show more/less goes on the last comment at depth 1 only
        const showMore     = hasMore && isLast && depth === 1;
        const row          = buildCommentRow(comment, postId, depth, showMore, false, excludeId);
        container.appendChild(row);

        if (comment.children && comment.children.length > 0) {
            renderCommentTree(comment.children, container, postId, depth + 1, false, null);
        }
    });
}

// ── Build comment row ─────────────────────────────────────────────────────────
// showMore = show "show more comments" button on this row's footer
// showLess = show "show less" button on this row's footer
function buildCommentRow(comment, postId, depth, showMore, showLess, excludeId) {
    const avatar       = comment.avatar_path ? `/${comment.avatar_path}` : 'assets/images/profile_picture.jpg';
    const likeDisplay  = comment.like_count  > 0 ? comment.like_count  : '';
    const replyDisplay = comment.reply_count > 0 ? comment.reply_count : '';
    const likeMargin   = comment.like_count  > 0 ? '' : 'style="margin:0"';
    const replyMargin  = comment.reply_count > 0 ? '' : 'style="margin:0"';
    const visualDepth  = Math.min(depth, MAX_VISUAL_DEPTH);
    const bars         = '<div class="reply-bar"></div>'.repeat(visualDepth);

    const showMoreBtn = showMore
        ? `<div class="show-more-btn" data-post-id="${postId}" data-exclude-id="${excludeId}">
               <i class="fa-regular fa-comments"></i> Show more
           </div>`
        : '';

    const showLessBtn = showLess
        ? `<div class="show-less-btn" data-post-id="${postId}">
               <i class="fa-solid fa-chevron-up"></i> Show less
           </div>`
        : '';

    const trashBtn = comment.can_delete
        ? `<div class="delete-btn delete-comment-btn" data-comment-id="${comment.id}">
               <i class="fa-regular fa-trash-can"></i>
           </div>`
        : '';

    const row = document.createElement('div');
    row.className         = 'comment-row';
    row.dataset.commentId = comment.id;
    row.dataset.postId    = postId;
    row.dataset.depth     = depth;
    row.innerHTML         = `
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
                    <i class="comment-icon fa-regular fa-comment" ${replyMargin}></i>
                    <div class="comments">${replyDisplay}</div>
                </div>
                ${showMoreBtn}
                ${showLessBtn}
                ${trashBtn}
            </div>
        </div>
    `;
    return row;
}

// ── Build compose box ─────────────────────────────────────────────────────────
// buildComposeBox — parentUsername is the display name of who's being replied to
function buildComposeBox(postId, parentId, depth, parentUsername) {
    const username    = currentUser ? currentUser.username : 'Guest';
    const avatar      = (currentUser && currentUser.avatar_path)
        ? '/' + currentUser.avatar_path
        : 'assets/images/profile_picture.jpg';
    const replyingTo  = parentUsername
        ? `Replying to @${escapeHtml(parentUsername)}...`
        : 'Replying to post...';
    const visualDepth = Math.min(depth, MAX_VISUAL_DEPTH);
    const bars        = '<div class="reply-bar"></div>'.repeat(visualDepth);

    const row = document.createElement('div');
    row.className        = 'comment-row compose-box';
    row.dataset.postId   = postId;
    row.dataset.parentId = parentId || '';
    row.dataset.depth    = depth;
    row.innerHTML        = `
        <div class="comment-bars">${bars}</div>
        <div class="comment-body-wrap">
            <div class="reply-draft">
                <div class="reply-draft-header">
                    <img class="profile-picture" src="${avatar}" alt="Profile Picture">
                    <div class="draft-details">
                        <div class="username">${escapeHtml(username)}</div>
                        <div class="timestamp">${replyingTo}</div>
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
    document.querySelectorAll('.like-btn[data-post-id]:not([data-bound])').forEach(btn => {
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => handlePostLike(btn));
    });

    document.querySelectorAll('.comment-like-btn:not([data-bound])').forEach(btn => {
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => handleCommentLike(btn));
    });

    document.querySelectorAll('.share-btn:not([data-bound])').forEach(btn => {
        btn.dataset.bound = '1';
        let shared = false;
        btn.addEventListener('click', () => {
            toggleIcon(btn);
            shared ? decreaseCount(btn) : increaseCount(btn);
            shared = !shared;
        });
    });

    document.querySelectorAll('.comment-btn[data-post-id]:not(.comment-reply-btn):not([data-bound])').forEach(btn => {
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => handlePostCommentBtn(btn));
    });

    document.querySelectorAll('.comment-reply-btn:not([data-bound])').forEach(btn => {
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => handleCommentReplyBtn(btn));
    });

    document.querySelectorAll('.show-more-btn:not([data-bound])').forEach(btn => {
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => handleShowMore(btn));
    });

    document.querySelectorAll('.show-less-btn:not([data-bound])').forEach(btn => {
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => handleShowLess(btn));
    });

    // Delete post buttons
    document.querySelectorAll('.delete-post-btn:not([data-bound])').forEach(btn => {
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => {
            showConfirmDialog('Delete this post? This cannot be undone.', () => {
                deletePost(btn.dataset.postId, btn.closest('.post'));
            });
        });
    });

    // Delete comment buttons
    document.querySelectorAll('.delete-comment-btn:not([data-bound])').forEach(btn => {
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => {
            showConfirmDialog('Delete this comment? This cannot be undone.', () => {
                deleteComment(btn.dataset.commentId, btn.closest('.comment-row'));
            });
        });
    });
}

// ── Close all compose boxes globally ─────────────────────────────────────────
function closeAllComposeBoxes(exceptBox) {
    document.querySelectorAll('.compose-box').forEach(c => {
        if (c === exceptBox) return;
        const post = c.closest('.post');
        if (!post) { c.remove(); return; }
        if (c.dataset.parentId) {
            const opener = post.querySelector(`.comment-reply-btn[data-comment-id="${c.dataset.parentId}"]`);
            if (opener) untoggleIcon(opener);
        } else {
            const opener = post.querySelector('.comment-btn[data-post-id]:not(.comment-reply-btn)');
            if (opener) untoggleIcon(opener);
        }
        c.remove();
    });
}

function untoggleIcon(element) {
    const icon = element.firstElementChild;
    if (icon.classList.contains('fa-solid')) {
        icon.classList.remove('fa-solid');
        icon.classList.add('fa-regular');
    }
}

// ── Post comment button ───────────────────────────────────────────────────────
function handlePostCommentBtn(btn) {
    if (!currentUser) { window.location.href = '/login.html'; return; }

    const postCard = btn.closest('.post');
    const postId   = btn.dataset.postId;
    const section  = postCard.querySelector('.comment-section');

    const firstChild = section.firstElementChild;
    if (firstChild && firstChild.classList.contains('compose-box')
        && firstChild.dataset.depth === '1'
        && !firstChild.dataset.parentId) {
        firstChild.remove();
        untoggleIcon(btn);
        return;
    }

    closeAllComposeBoxes(null);
    toggleIcon(btn);

    if (!section.querySelector('.comment-row:not(.compose-box)')) {
        loadCommentsIntoSection(postId, section, btn, true, null);
    } else {
        const compose = buildComposeBox(postId, null, 1, null);
        section.insertBefore(compose, section.firstChild);
        compose.querySelector('.reply-text-input').focus();
    }
}

// ── Comment reply button ──────────────────────────────────────────────────────
function handleCommentReplyBtn(btn) {
    if (!currentUser) { window.location.href = '/login.html'; return; }

    const postId     = btn.dataset.postId;
    const commentId  = btn.dataset.commentId;
    const depth      = parseInt(btn.dataset.depth) + 1;
    const commentRow = btn.closest('.comment-row');

    const next = commentRow.nextElementSibling;
    if (next && next.classList.contains('compose-box') && next.dataset.parentId === commentId) {
        next.remove();
        untoggleIcon(btn);
        return;
    }

    closeAllComposeBoxes(null);
    toggleIcon(btn);

    // Get the username from the comment row's header
    const replyToUsername = commentRow.querySelector('.comment-details .username')?.textContent?.trim() || null;

    const compose = buildComposeBox(postId, commentId, depth, replyToUsername);
    commentRow.insertAdjacentElement('afterend', compose);
    compose.querySelector('.reply-text-input').focus();
}

// ── Load full comment tree into section ───────────────────────────────────────
async function loadCommentsIntoSection(postId, section, triggerBtn, insertComposeAtTop, parentUsername) {
    section.innerHTML = '<div class="feed-loading" style="padding:0.75rem 1rem">Loading comments...</div>';

    const res      = await fetch(`/api/get_comments.php?post_id=${postId}`);
    const comments = await res.json();

    section.innerHTML = '';

    if (comments.length > 0) {
        renderCommentTree(comments, section, postId, 1, false, null);
        attachPostListeners();
    }

    if (triggerBtn) {
        const compose = buildComposeBox(postId, null, 1, parentUsername);
        if (insertComposeAtTop) {
            section.insertBefore(compose, section.firstChild);
        } else {
            section.appendChild(compose);
        }
        compose.querySelector('.reply-text-input').focus();
    }
}

// ── Show more ─────────────────────────────────────────────────────────────────
async function handleShowMore(btn) {
    const postId    = btn.dataset.postId;
    const excludeId = btn.dataset.excludeId;

    // Remove the show more button from the top comment's footer
    btn.remove();

    const postCard = document.querySelector(`.post[data-id="${postId}"]`);
    const section  = postCard.querySelector('.comment-section');

    const res      = await fetch(`/api/get_comments.php?post_id=${postId}&exclude_id=${excludeId}`);
    const comments = await res.json();

    if (!comments.length) {
        // No more comments — add show less to the last visible comment
        addShowLessToLastComment(section, postId);
        return;
    }

    // Insert remaining comments before any open compose box
    const compose = section.querySelector('.compose-box');
    comments.forEach(comment => {
        const row = buildCommentRow(comment, postId, 1, false, false, null);
        compose ? section.insertBefore(row, compose) : section.appendChild(row);
        if (comment.children && comment.children.length > 0) {
            renderCommentTree(comment.children, section, postId, 2, false, null);
        }
    });

    attachPostListeners();

    // Add "show less" to the footer of the last displayed comment
    addShowLessToLastComment(section, postId);
}

// ── Add show less button to last comment in section ───────────────────────────
function addShowLessToLastComment(section, postId) {
    // Find last comment-row that's not a compose box
    const allRows   = [...section.querySelectorAll('.comment-row:not(.compose-box)')];
    const lastRow   = allRows[allRows.length - 1];
    if (!lastRow) return;

    const footer = lastRow.querySelector('.comment-footer');
    if (!footer) return;

    // Don't add if already there
    if (footer.querySelector('.show-less-btn')) return;

    const btn = document.createElement('div');
    btn.className        = 'show-less-btn';
    btn.dataset.postId   = postId;
    btn.innerHTML        = `<i class="fa-solid fa-chevron-up"></i> Show less`;
    btn.addEventListener('click', () => handleShowLess(btn));
    footer.appendChild(btn);
}

// ── Show less ─────────────────────────────────────────────────────────────────
function handleShowLess(btn) {
    const postId   = btn.dataset.postId;
    const postCard = document.querySelector(`.post[data-id="${postId}"]`);
    const section  = postCard.querySelector('.comment-section');

    // Close any open compose boxes first
    closeAllComposeBoxes(null);
    const commentBtnOpener = postCard.querySelector('.comment-btn[data-post-id]:not(.comment-reply-btn)');
    if (commentBtnOpener) untoggleIcon(commentBtnOpener);

    // Remember the top comment (first non-compose row)
    const firstRow = section.querySelector('.comment-row:not(.compose-box)');
    if (!firstRow) { section.innerHTML = ''; return; }

    const topCommentId = firstRow.dataset.commentId;

    // Remove everything from section
    section.innerHTML = '';

    // Re-fetch just the top comment from what we already have
    // (simpler than re-querying: just rebuild from the original top comment data)
    // We re-fetch to get fresh data
    fetch(`/api/get_posts.php?page=1`)
        .then(r => r.json())
        .then(posts => {
            const post = posts.find(p => String(p.id) === String(postId));
            if (!post || !post.top_comment) return;
            const hasMore = post.comment_count > 1;
            const topWithNoChildren = { ...post.top_comment, children: [] };
            renderCommentTree([topWithNoChildren], section, postId, 1, hasMore, post.top_comment.id);
            attachPostListeners();
        });
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

    const depth    = parseInt(composeRow.dataset.depth) || 1;
    const newRow   = buildCommentRow(comment, postId, depth, false, false, null);
    const postCard = composeRow.closest('.post');

    composeRow.insertAdjacentElement('beforebegin', newRow);
    attachPostListeners();

    // Untoggle opener and remove compose box
    if (composeRow.dataset.parentId) {
        const opener = postCard.querySelector(`.comment-reply-btn[data-comment-id="${composeRow.dataset.parentId}"]`);
        if (opener) {
            untoggleIcon(opener);
            // Bump reply count on the parent comment's button
            increaseCount(opener);
        }
    } else {
        const opener = postCard.querySelector('.comment-btn[data-post-id]:not(.comment-reply-btn)');
        if (opener) untoggleIcon(opener);
    }

    composeRow.remove();

    // Bump post comment count
    const commentBtn = postCard.querySelector('.comment-btn[data-post-id]:not(.comment-reply-btn)');
    if (commentBtn) increaseCount(commentBtn);
}

// ── Post like ─────────────────────────────────────────────────────────────────
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

// ── Comment like ──────────────────────────────────────────────────────────────
async function handleCommentLike(btn) {
    if (!currentUser) { window.location.href = '/login.html'; return; }

    const commentId = btn.dataset.commentId;
    const icon      = btn.querySelector('.like-icon');
    const count     = btn.querySelector('.likes');
    const wasLiked  = btn.dataset.liked === '1';

    btn.dataset.liked = wasLiked ? '0' : '1';
    icon.classList.toggle('fa-regular', wasLiked);
    icon.classList.toggle('fa-solid',   !wasLiked);

    const formData = new FormData();
    formData.append('comment_id', commentId);

    const res  = await fetch('/api/toggle_comment_like.php', { method: 'POST', body: formData });
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

// ── Confirmation dialog ───────────────────────────────────────────────────────
// Custom dark-themed dialog — much better than window.confirm()
function showConfirmDialog(message, onConfirm) {
    const existing = document.getElementById('confirm-overlay');
    if (existing) existing.remove();

    const overlay     = document.createElement('div');
    overlay.id        = 'confirm-overlay';
    overlay.innerHTML = `
        <div id="confirm-dialog">
            <div id="confirm-icon"><i class="fa-regular fa-trash-can"></i></div>
            <div id="confirm-message">${escapeHtml(message)}</div>
            <div id="confirm-buttons">
                <button id="confirm-cancel-btn" class="auth-secondary-btn">Cancel</button>
                <button id="confirm-ok-btn" class="auth-primary-btn danger-btn">
                    <i class="fa-solid fa-trash-can"></i> Delete
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.getElementById('confirm-cancel-btn').addEventListener('click', () => overlay.remove());
    document.getElementById('confirm-ok-btn').addEventListener('click', () => {
        overlay.remove();
        onConfirm();
    });
}

// ── Delete post ───────────────────────────────────────────────────────────────
async function deletePost(postId, postEl) {
    const formData = new FormData();
    formData.append('post_id', postId);

    const res  = await fetch('/api/delete_post.php', { method: 'POST', body: formData });
    const data = await res.json();

    if (data.error) {
        alert('Could not delete post: ' + data.error);
        return;
    }

    // Fade out and remove the post card
    postEl.style.transition = 'opacity 0.2s ease';
    postEl.style.opacity    = '0';
    setTimeout(() => postEl.remove(), 200);
}

// ── Delete comment ────────────────────────────────────────────────────────────
async function deleteComment(commentId, commentEl) {
    const formData = new FormData();
    formData.append('comment_id', commentId);

    const res  = await fetch('/api/delete_comment.php', { method: 'POST', body: formData });
    const data = await res.json();

    if (data.error) {
        alert('Could not delete comment: ' + data.error);
        return;
    }

    // Fade out and remove the comment row
    commentEl.style.transition = 'opacity 0.2s ease';
    commentEl.style.opacity    = '0';
    setTimeout(() => commentEl.remove(), 200);
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
