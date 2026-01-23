let commentButtons = document.getElementsByClassName('comment-btn');
let likeButtons = document.getElementsByClassName('like-btn');
let shareButtons = document.getElementsByClassName('share-btn');
let loginButton = document.getElementById('login-btn');
let replyTextInputs = document.getElementsByClassName('reply-text-input')

for (let i = 0; i < likeButtons.length; i++) {
    let likeButton = likeButtons[i];
    let pressed = true;
    parseEmptyCount(likeButton);
    likeButton.addEventListener('click', function() {
        toggleIcon(likeButton);

        switch(pressed) {
            case true:
                pressed = false;
                increaseCount(likeButton);
                break;
            case false:
                pressed = true;
                decreaseCount(likeButton);
                break;
        }
    });

}

for (let i = 0; i < commentButtons.length; i++) {
    let commentButton = commentButtons[i];
    let pressed = true;
    parseEmptyCount(commentButton);
    commentButton.addEventListener('click', function() {
        let elementToModify = this.parentElement.parentElement.lastElementChild;
        toggleIcon(commentButton);
        elementToModify.classList.toggle('highlighted-comment-reply');
        elementToModify.classList.toggle('compose-reply');

        switch(pressed) {
            case true:
                pressed = false;
                elementToModify.innerHTML = '<div class="reply-bar"></div> <div class="reply-draft"> <div class="reply-draft-header"> <img class="profile-picture" src="assets/images/profile_picture1.jpg" alt="Profile Picture"> <div class="draft-details"> <div class="username"> sodaseal </div> <div class="timestamp"> Replying to i_hate_sodaseal </div> </div> </div> <div class="reply-draft-content"> <textarea class="reply-text-input" placeholder="Type your Magnum Opus..."></textarea> </div> <div class="reply-draft-footer"> <div class="post-btn"> <i class="post-icon fa-solid fa-arrow-up"></i> <div class="post-text">Post</div> </div> <div class="attachment-btn"> <input type="file" class="file-input" style="display: none;" /> <i class="attachment-icon fa-solid fa-link"></i> <div class="attachment-text">Add Attachment</div> </div> <div class="character-count">0/500</div> </div> </div>';

                for (let i = 0; i < replyTextInputs.length; i++) {
                    let replyTextInput = replyTextInputs[i];
                    let characterCount = replyTextInput.parentElement.parentElement.lastElementChild.lastElementChild;
                    let attachmentButton = replyTextInput.parentElement.parentElement.getElementsByClassName('attachment-btn')[0];
                    let fileInput = attachmentButton.firstElementChild;


                    replyTextInput.addEventListener('input', function() {
                        adjustTextAreaHeight(replyTextInput);
                    } );

                    replyTextInput.addEventListener('keyup', function() {
                        console.log(characterCount.innerText);
                        characterCount.innerText = replyTextInput.value.length + "/500";
                    });

                    replyTextInput.addEventListener('keydown', function(event) {
                        if (replyTextInput.value.length >= 500 && event.key !== "Backspace" && event.key !== "Delete") {
                            event.preventDefault();
                        }
                    });

                    replyTextInput.addEventListener('paste', function(event) {
                        let pastedText = (event.clipboardData || window.clipboardData).getData('text');
                        let currentLength = replyTextInput.value.length;
                        let remainingChars = 500 - currentLength;
                        if (pastedText.length > remainingChars) {
                            pastedText = pastedText.substring(0, remainingChars);
                        }

                        replyTextInput.value = replyTextInput.value.substring(0, replyTextInput.selectionStart) + pastedText + replyTextInput.value.substring(replyTextInput.selectionEnd);
                        characterCount.innerText = replyTextInput.value.length + "/500";

                        event.preventDefault();
                    });

                    attachmentButton.addEventListener('click', function() {
                        fileInput.click();
                    });

                    fileInput.addEventListener('change', function() {
                        const file = this.files[0];

                        attachmentButton.lastElementChild.innerText = formatFileSize(file.size) + " - " + file.name;
                    });
                }

                break;
            case false:
                pressed = true;
                elementToModify.innerHTML = '';
                break;
        }
    });
}

for (let i = 0; i < shareButtons.length; i++) {
    let shareButton = shareButtons[i];
    let pressed = true;
    parseEmptyCount(shareButton);
    shareButton.addEventListener('click', function() {
        toggleIcon(shareButton);

        switch(pressed) {
            case true:
                pressed = false;
                increaseCount(shareButton);
                break;
            case false:
                pressed = true;
                decreaseCount(shareButton);
                break;
        }
    });

}

loginButton.addEventListener('click', function() {
    // Send the user to another page for logging in
});

function toggleIcon(element) {
    let icon = element.firstElementChild;
    icon.classList.toggle('fa-regular');
    icon.classList.toggle('fa-solid');
}

function parseEmptyCount(element) {
    if (element.lastElementChild.innerText === '0') {
        element.firstElementChild.style.margin = '0';
        element.lastElementChild.innerText = '';
    }
}

function increaseCount(element) {
    let count = element.lastElementChild;
    if (count.innerText !== '') {
        count.innerText = parseInt(count.innerText) + 1;
    } else {
        element.firstElementChild.style.margin = '0 0.5rem 0 0';
        count.innerText = '1';
    }
}

function decreaseCount(element) {
    let count = element.lastElementChild;
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
    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(size) / Math.log(1024));
    return parseFloat((size / Math.pow(1024, i)).toFixed(2)) + ' ' + units[i];
}