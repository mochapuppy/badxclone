<?php
// settings.php
// Profile settings page. Requires login.

session_start();
require_once __DIR__ . '/../config/db.php';

if (!isset($_SESSION['user_id'])) {
    header('Location: /login');
    exit;
}

$user_id = (int)$_SESSION['user_id'];

$stmt = $pdo->prepare("
    SELECT username, display_name, bio, avatar_path, banner_path
    FROM users WHERE id = ? LIMIT 1
");
$stmt->execute([$user_id]);
$user = $stmt->fetch();

$success = isset($_GET['success']);
$errors  = isset($_GET['errors']) ? explode(',', $_GET['errors']) : [];

$error_messages = [
    'display_name_too_long'  => 'Display name must be 60 characters or fewer.',
    'bio_too_long'           => 'Bio must be 280 characters or fewer.',
    'password_too_short'     => 'New password must be at least 8 characters.',
    'password_mismatch'      => 'New passwords do not match.',
    'wrong_current_password' => 'Current password is incorrect.',
    'avatar_upload_failed'   => 'Avatar upload failed — check file type.',
    'banner_upload_failed'   => 'Banner upload failed — check file type.',
];

$avatar = $user['avatar_path'] ? '/' . $user['avatar_path'] : '/assets/images/profile_picture.jpg';
$banner = $user['banner_path'] ? '/' . $user['banner_path'] : '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="/css/style.css?v=22">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous">
    <title>Settings - BadXClone</title>
    <link rel="icon" href="/favicon.ico" type="image/x-icon">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
</head>
<body id="settings-page">
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
                <a href="/user/<?= htmlspecialchars($user['username']) ?>" id="login-btn">
                    <i id="login-icon" class="fa-solid fa-user"></i>
                    <?= htmlspecialchars($user['username']) ?>
                </a>
            </div>
        </div>
    </div>

    <div id="main">
        <div class="content-left"></div>
        <div class="content-center" id="settings-center">
            <div id="settings-card">

                <div class="settings-header">
                    <h2>Edit profile</h2>
                </div>

                <?php if ($success): ?>
                    <div class="settings-alert settings-success">
                        <i class="fa-solid fa-circle-check"></i> Settings saved successfully.
                    </div>
                <?php endif; ?>

                <?php if (!empty($errors)): ?>
                    <div class="settings-alert settings-error">
                        <i class="fa-solid fa-circle-exclamation"></i>
                        <?php foreach ($errors as $e): ?>
                            <div><?= htmlspecialchars($error_messages[$e] ?? $e) ?></div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>

                <form action="/api/update_settings.php" method="POST" enctype="multipart/form-data">

                    <!-- Banner preview + upload -->
                    <div class="settings-section">
                        <div class="settings-label">Banner image</div>
                        <div id="settings-banner-preview" <?= $banner ? 'style="background-image:url(' . $banner . ')"' : '' ?>>
                            <label class="settings-upload-overlay" for="banner-input">
                                <i class="fa-solid fa-camera"></i> Change banner
                            </label>
                            <input type="file" id="banner-input" name="banner" accept="image/*" style="display:none">
                        </div>
                    </div>

                    <!-- Avatar preview + upload -->
                    <div class="settings-section settings-avatar-section">
                        <div class="settings-label">Profile picture</div>
                        <div id="settings-avatar-wrap">
                            <img id="settings-avatar-preview" src="<?= $avatar ?>" alt="Avatar">
                            <label class="settings-avatar-overlay" for="avatar-input">
                                <i class="fa-solid fa-camera"></i>
                            </label>
                            <input type="file" id="avatar-input" name="avatar" accept="image/*" style="display:none">
                        </div>
                    </div>

                    <!-- Display name -->
                    <div class="settings-section">
                        <div class="settings-label">Display name</div>
                        <div class="auth-field">
                            <i class="fa-solid fa-pen field-icon"></i>
                            <input type="text" name="display_name" class="text-input"
                                   value="<?= htmlspecialchars($user['display_name']) ?>"
                                   placeholder="Display name" maxlength="60">
                        </div>
                    </div>

                    <!-- Bio -->
                    <div class="settings-section">
                        <div class="settings-label">Bio</div>
                        <textarea name="bio" class="settings-bio-input"
                                  placeholder="Tell the world about yourself..." maxlength="280"
                        ><?= htmlspecialchars($user['bio']) ?></textarea>
                        <div class="settings-char-count" id="bio-count">
                            <?= mb_strlen($user['bio']) ?>/280
                        </div>
                    </div>

                    <!-- Change password -->
                    <div class="settings-section">
                        <div class="settings-label">Change password <span class="settings-optional">(optional)</span></div>
                        <div class="auth-field" style="margin-bottom:0.6rem">
                            <i class="fa-solid fa-lock field-icon"></i>
                            <input type="password" name="current_password" class="text-input" placeholder="Current password">
                        </div>
                        <div class="auth-field" style="margin-bottom:0.6rem">
                            <i class="fa-solid fa-lock field-icon"></i>
                            <input type="password" name="new_password" class="text-input" placeholder="New password">
                        </div>
                        <div class="auth-field">
                            <i class="fa-solid fa-lock field-icon"></i>
                            <input type="password" name="confirm_password" class="text-input" placeholder="Confirm new password">
                        </div>
                    </div>

                    <div class="settings-footer">
                        <a href="/user/<?= htmlspecialchars($user['username']) ?>" class="auth-secondary-btn">Cancel</a>
                        <button type="submit" class="auth-primary-btn">
                            Save changes <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>

                </form>
            </div>
        </div>
        <div class="content-right"></div>
    </div>
</div>

<script>
// Live bio character count
const bioInput = document.querySelector('textarea[name="bio"]');
const bioCount = document.getElementById('bio-count');
if (bioInput) {
    bioInput.addEventListener('input', () => {
        bioCount.textContent = bioInput.value.length + '/280';
    });
}

// Avatar preview before upload
document.getElementById('avatar-input').addEventListener('change', function() {
    if (this.files[0]) {
        document.getElementById('settings-avatar-preview').src = URL.createObjectURL(this.files[0]);
    }
});

// Banner preview before upload
document.getElementById('banner-input').addEventListener('change', function() {
    if (this.files[0]) {
        document.getElementById('settings-banner-preview').style.backgroundImage =
            'url(' + URL.createObjectURL(this.files[0]) + ')';
    }
});
</script>
</body>
</html>
