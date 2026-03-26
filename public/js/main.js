// main.js

// ── Auth state ────────────────────────────────────────────────────────────────
// We check the session via API on every page load.
// This tells us whether to show the Post button or the Login button.

let currentUser = null;

async function checkAuth() {
    const res  = await fetch('/api/auth_status.php');
    const data = await res.json();

    if (data.logged_in) {
        currentUser = data;

        // Show post button, hide login button
        document.getElementById('post-btn').style.display  = 'flex';
        document.getElementById('login-btn').style.display = 'none';

        // Show logout button if it exists in your header
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.style.display = 'flex';
    } else {
        currentUser = null;

        // Hide post button, show login button
        document.getElementById('post-btn').style.display  = 'none';
        document.getElementById('login-btn').style.display = 'flex';
    }
}

// ── Feed ──────────────────────────────────────────────────────────────────────
// Fetches posts from the API and renders them into .content-center.
// Called once on page load. Pass page=2, page=3 etc. for pagination later.

let currentPage  = 1;
let isLoading    = false;
let noMorePosts  = false;

async function loadPosts(page = 1) {
    if (isLoading || noMorePosts) return;
    isLoading = true;

    const feed = document.querySelector('.content-center');

    // Show a subtle loading indicator on first load
    if (page === 1) {
        feed.innerHTML = '<div class="feed-loading">Loading...</div>';
    }

    const res   = await fetch(`/api/get_posts.php?page=${page}`);
    const posts = await res.json();

    if (page === 1) feed.innerHTML = ''; // clear loading indicator

    if (posts.length === 0) {
        noMorePosts = true;
        if (page === 1) {
            feed.innerHTML = '<div class="feed-empty">No posts yet. Be the first!</div>';
        }
        isLoading = false;
        return;
    }

    posts.forEach(post => {
        feed.appendChild(buildPostCard(post));
    });

    // Re-attach interaction listeners to new cards
    attachPostListeners();

    currentPage = page;
    isLoading   = false;
}

// ── Build a post card from a post object ──────────────────────────────────────
// Returns a DOM element matching your existing .post HTML structure.

function buildPostCard(post) {
    const avatar = post.avatar_path
        ? `/${post.avatar_path}`
        : 'assets/images/profile_picture.jpg';

    const imageHtml = post.image_path
        ? `<div class="image"><img src="/${post.image_path}" alt="Post image"></div>`
        : '';

    const likeMargin  = post.like_count    === 0 ? 'style="margin:0"' : '';
    const commentMargin = post.comment_count === 0 ? 'style="margin:0"' : '';

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
            <div class="like-btn" data-count="${post.like_count}">
                <i class="like-icon fa-regular fa-heart" ${likeMargin}></i>
                <div class="likes">${post.like_count || ''}</div>
            </div>
            <div class="comment-btn" data-count="${post.comment_count}">
                <i class="comment-icon fa-regular fa-comment" ${commentMargin}></i>
                <div class="comments">${post.comment_count || ''}</div>
            </div>
            <div class="share-btn" data-count="0">
                <i class="share-icon fa-regular fa-share-from-square" style="margin:0"></i>
                <div class="shares"></div>
            </div>
        </div>
        <div class="highlighted-reply"></div>
    `;
    return div;
}

// Prevent XSS — always escape user-generated content before putting it in the DOM
function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// ── Post modal ────────────────────────────────────────────────────────────────
// Opens when the Post button is clicked.
// Submits to create_post.php and prepends the new post to the feed.

function openPostModal() {
    // If not logged in, send to login page
    if (!currentUser) {
        window.location.href = '/login.html';
        return;
    }

    // Remove any existing modal first
    const existing = document.getElementById('post-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id        = 'post-modal-overlay';
    overlay.innerHTML = `
        <div id="post-modal">
            <div class="modal-header">
                <div class="modal-title">New post</div>
                <div id="modal-close-btn">
                    <i class="fa-solid fa-xmark"></i>
                </div>
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

    // Close on overlay click or X button
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.remove();
    });
    closeBtn.addEventListener('click', () => overlay.remove());

    // Character counter
    textarea.addEventListener('input', () => {
        const len = textarea.value.length;
        charCount.textContent = `${len}/500`;
        charCount.style.color = len >= 450 ? '#bf3322' : '';
    });

    // Image file name display
    imageInput.addEventListener('change', () => {
        const file = imageInput.files[0];
        imageName.textContent = file ? `${formatFileSize(file.size)} — ${file.name}` : '';
    });

    // Submit
    submitBtn.addEventListener('click', () => submitPost(overlay));

    // Focus the textarea immediately
    textarea.focus();
}

async function submitPost(overlay) {
    const body       = document.getElementById('modal-body-input').value.trim();
    const imageInput = document.getElementById('modal-image-input');
    const submitBtn  = document.getElementById('modal-submit-btn');

    if (!body) return;

    // Disable button while submitting to prevent double-posts
    submitBtn.style.opacity = '0.5';
    submitBtn.style.pointerEvents = 'none';

    const formData = new FormData();
    formData.append('body', body);
    if (imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }

    const res = await fetch('/api/create_post.php', {
        method: 'POST',
        body:   formData,
    });

    if (res.status === 401) {
        window.location.href = '/login.html';
        return;
    }

    const post = await res.json();

    if (post.error) {
        submitBtn.style.opacity = '1';
        submitBtn.style.pointerEvents = 'auto';
        alert('Could not post: ' + post.error);
        return;
    }

    // Close modal and prepend the new post to the top of the feed
    overlay.remove();
    const feed    = document.querySelector('.content-center');
    const newCard = buildPostCard(post);
    feed.insertBefore(newCard, feed.firstChild);
    attachPostListeners();
}

// ── Interaction listeners ─────────────────────────────────────────────────────
// Attach like/comment/share listeners to all current post cards.
// Called after loadPosts() and after prepending a new post.

function attachPostListeners() {
    // Like buttons
    document.querySelectorAll('.like-btn:not([data-bound])').forEach(btn => {
        btn.dataset.bound = '1';
        let liked = false;
        parseEmptyCount(btn);
        btn.addEventListener('click', () => {
            toggleIcon(btn);
            liked ? decreaseCount(btn) : increaseCount(btn);
            liked = !liked;
        });
    });

    // Share buttons
    document.querySelectorAll('.share-btn:not([data-bound])').forEach(btn => {
        btn.dataset.bound = '1';
        let shared = false;
        parseEmptyCount(btn);
        btn.addEventListener('click', () => {
            toggleIcon(btn);
            shared ? decreaseCount(btn) : increaseCount(btn);
            shared = !shared;
        });
    });

    // Comment buttons
    document.querySelectorAll('.comment-btn:not([data-bound])').forEach(btn => {
        btn.dataset.bound = '1';
        let open = false;
        parseEmptyCount(btn);
        btn.addEventListener('click', function () {
            const replyArea = this.closest('.post').querySelector('.highlighted-reply');
            toggleIcon(btn);
            open ? decreaseCount(btn) : increaseCount(btn);
            open = !open;

            if (open) {
                replyArea.classList.add('compose-reply');
                replyArea.innerHTML = buildReplyDraft();
                attachReplyListeners(replyArea);
            } else {
                replyArea.classList.remove('compose-reply');
                replyArea.innerHTML = '';
            }
        });
    });
}

function buildReplyDraft() {
    const avatar = currentUser ? 'assets/images/profile_picture.jpg' : 'assets/images/profile_picture.jpg';
    const name   = currentUser ? currentUser.username : 'Guest';
    return `
        <div class="reply-bar"></div>
        <div class="reply-draft">
            <div class="reply-draft-header">
                <img class="profile-picture" src="${avatar}" alt="Profile Picture">
                <div class="draft-details">
                    <div class="username">${escapeHtml(name)}</div>
                    <div class="timestamp">Replying...</div>
                </div>
            </div>
            <div class="reply-draft-content">
                <textarea class="reply-text-input" placeholder="Type your Magnum Opus..."></textarea>
            </div>
            <div class="reply-draft-footer">
                <div class="post-btn">
                    <i class="post-icon fa-solid fa-arrow-up"></i>
                    <div class="post-text">Post</div>
                </div>
                <label class="attachment-btn">
                    <input type="file" class="file-input" style="display:none">
                    <i class="attachment-icon fa-solid fa-link"></i>
                    <div class="attachment-text">Add Attachment</div>
                </label>
                <div class="character-count">0/500</div>
            </div>
        </div>
    `;
}

function attachReplyListeners(replyArea) {
    const textarea   = replyArea.querySelector('.reply-text-input');
    const charCount  = replyArea.querySelector('.character-count');
    const fileInput  = replyArea.querySelector('.file-input');
    const attachBtn  = replyArea.querySelector('.attachment-btn');

    textarea.addEventListener('input', () => {
        adjustTextAreaHeight(textarea);
        charCount.textContent = textarea.value.length + '/500';
    });

    textarea.addEventListener('keydown', e => {
        if (textarea.value.length >= 500 && e.key !== 'Backspace' && e.key !== 'Delete') {
            e.preventDefault();
        }
    });

    textarea.addEventListener('paste', e => {
        const pasted    = (e.clipboardData || window.clipboardData).getData('text');
        const remaining = 500 - textarea.value.length;
        if (pasted.length > remaining) {
            const start = textarea.selectionStart;
            textarea.value = textarea.value.substring(0, start)
                + pasted.substring(0, remaining)
                + textarea.value.substring(textarea.selectionEnd);
            charCount.textContent = textarea.value.length + '/500';
            e.preventDefault();
        }
    });

    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) {
            attachBtn.querySelector('.attachment-text').textContent =
                formatFileSize(fileInput.files[0].size) + ' — ' + fileInput.files[0].name;
        }
    });
}

// ── Post button ───────────────────────────────────────────────────────────────
const postBtn = document.getElementById('post-btn');
if (postBtn) {
    postBtn.addEventListener('click', openPostModal);
}

// ── Utility functions (unchanged from your original) ─────────────────────────
function toggleIcon(element) {
    const icon = element.firstElementChild;
    icon.classList.toggle('fa-regular');
    icon.classList.toggle('fa-solid');
}

function parseEmptyCount(element) {
    if (element.lastElementChild.innerText === '0' || element.dataset.count === '0') {
        element.firstElementChild.style.margin = '0';
        element.lastElementChild.innerText = '';
    }
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
// Check auth first, then load the feed.
// We use an async IIFE (immediately invoked function) to run both in order.

(async () => {
    await checkAuth();

    // Only load feed on the main page
    if (document.querySelector('.content-center') && document.getElementById('main-page')) {
        await loadPosts(1);
    }
})();
