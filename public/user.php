<?php
// user.php
// Public profile page. Reads ?username= from URL (set by .htaccess rewrite).
// Renders profile header server-side, posts loaded via JS.

session_start();
require_once __DIR__ . '/../config/db.php';

$username = trim($_GET['username'] ?? '');

// Could be a numeric ID or a username
if (ctype_digit($username)) {
    $stmt = $pdo->prepare("
        SELECT ... FROM users WHERE id = ? LIMIT 1
    ");
    $stmt->execute([(int)$username]);
} else {
    $stmt = $pdo->prepare("
        SELECT ... FROM users WHERE username = ? LIMIT 1
    ");
    $stmt->execute([$username]);
}

if (empty($username)) {
    header('Location: /index');
    exit;
}

// ── Fetch profile user ────────────────────────────────────────────────────────
$stmt = $pdo->prepare("
    SELECT
        u.id,
        u.username,
        u.display_name,
        u.bio,
        u.avatar_path,
        u.banner_path,
        u.date_created,
        u.is_admin,
        COUNT(DISTINCT f.follower_id) AS follower_count,
        COUNT(DISTINCT f2.following_id) AS following_count
    FROM users u
    LEFT JOIN follows f  ON f.following_id = u.id
    LEFT JOIN follows f2 ON f2.follower_id  = u.id
    WHERE u.username = ?
    GROUP BY u.id
    LIMIT 1
");
$stmt->execute([$username]);
$profile = $stmt->fetch();

if (!$profile) {
    // User not found — show a simple 404 message
    http_response_code(404);
    echo '<!DOCTYPE html><html><body style="background:#111;color:#ddd;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><h2>User not found</h2></body></html>';
    exit;
}

$current_user_id = (int)($_SESSION['user_id'] ?? 0);
$is_own_profile  = $current_user_id === (int)$profile['id'];

// ── Check if current user follows this profile ────────────────────────────────
$is_following = false;
if ($current_user_id && !$is_own_profile) {
    $stmt = $pdo->prepare("
        SELECT 1 FROM follows
        WHERE follower_id = ? AND following_id = ?
        LIMIT 1
    ");
    $stmt->execute([$current_user_id, $profile['id']]);
    $is_following = (bool)$stmt->fetch();
}

$avatar = $profile['avatar_path']
    ? '/' . htmlspecialchars($profile['avatar_path'])
    : '/assets/images/profile_picture.jpg';

$banner = $profile['banner_path']
    ? '/' . htmlspecialchars($profile['banner_path'])
    : '';

$joined = (new DateTime($profile['date_created']))->format('F Y');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="/css/style.css?v=22">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous">
    <title><?= htmlspecialchars($profile['display_name'] ?: $profile['username']) ?> - BadXClone</title>
    <link rel="icon" href="/favicon.ico" type="image/x-icon">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
</head>
<body id="profile-page">
<div id="app">
    <div id="header">
        <div class="header-left">
            <a href="/index" id="logo">
                <i id="logo-icon" class="fa-solid fa-database"></i>
                BadXClone
            </a>
        </div>
        <div class="header-center"></div>
        <div class="header-right">
            <div class="header-right-button-wrapper">
                <div id="post-btn">
                    <i id="post-icon" class="fa-solid fa-pen-to-square"></i>
                    Post
                </div>
                <a href="/login" id="login-btn">
                    <i id="login-icon" class="fa-solid fa-user"></i>
                    Login
                </a>
            </div>
        </div>
    </div>

    <div id="main">
        <div class="content-left"></div>
        <div class="content-center" id="profile-center">

            <!-- Banner -->
            <div id="profile-banner" <?= $banner ? 'style="background-image: url(' . $banner . ')"' : '' ?>>
                <div id="profile-avatar-wrap">
                    <img id="profile-avatar" src="<?= $avatar ?>" alt="Avatar">
                </div>
            </div>

            <!-- Profile info -->
            <div id="profile-info">
                <div id="profile-actions">
                    <?php if ($is_own_profile): ?>
                        <a href="/settings.php" class="profile-action-btn">
                            <i class="fa-solid fa-gear"></i> Edit profile
                        </a>
                    <?php elseif ($current_user_id): ?>
                        <button
                            id="follow-btn"
                            class="profile-action-btn <?= $is_following ? 'following' : '' ?>"
                            data-user-id="<?= $profile['id'] ?>"
                            data-following="<?= $is_following ? '1' : '0' ?>">
                            <?= $is_following ? '<i class="fa-solid fa-user-check"></i> Following' : '<i class="fa-solid fa-user-plus"></i> Follow' ?>
                        </button>
                    <?php endif; ?>
                </div>

                <div id="profile-display-name">
                    <?= htmlspecialchars($profile['display_name'] ?: $profile['username']) ?>
                    <?php if ($profile['is_admin']): ?>
                        <span class="admin-badge">admin</span>
                    <?php endif; ?>
                </div>
                <div id="profile-username">@<?= htmlspecialchars($profile['username']) ?></div>

                <?php if ($profile['bio']): ?>
                    <div id="profile-bio"><?= htmlspecialchars($profile['bio']) ?></div>
                <?php endif; ?>

                <div id="profile-meta">
                    <span><i class="fa-regular fa-calendar"></i> Joined <?= $joined ?></span>
                </div>

                <div id="profile-stats">
                    <span><strong><?= number_format($profile['following_count']) ?></strong> Following</span>
                    <span id="follower-count-wrap"><strong id="follower-count"><?= number_format($profile['follower_count']) ?></strong> Followers</span>
                </div>
            </div>

            <!-- Posts feed -->
            <div id="profile-posts" class="content-center">
                <div class="feed-loading">Loading posts...</div>
            </div>

        </div>
        <div class="content-right"></div>
    </div>
</div>

<script>
    const PROFILE_USERNAME = <?= json_encode($profile['username']) ?>;
    const PROFILE_USER_ID  = <?= json_encode((int)$profile['id']) ?>;
    const IS_OWN_PROFILE   = <?= json_encode($is_own_profile) ?>;
</script>
<script src="/js/main.js?v=18"></script>
<script src="/js/profile.js?v=3"></script>
</body>
</html>
