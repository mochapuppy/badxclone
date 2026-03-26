## BadXClone
https://badxclone.com/

A barebones Twitter-like social media site written in pure HTML, CSS, and JS
using MySQL and a basic API using PHP

This project is essentially meant to test my understanding of database systems
and apply my understanding of relational databases to real-world applications (using a LAMP stack)

## Roadmap
- [x] Login/Register UX
- [x] Create Post UI
- [x] API integration with schema
 - [ ] Authentification system
  - [x] Account creation
  - [x] Password encryption
  - [x] Login system
  - [x] Session data stored in cookies
  - [x] Moderation
  - [ ] Account deletion system
 - [x] Post creation and retrieval
 - [x] Comment creation and retrieval
  - [ ] Allow for upload of (optionally) one image when a user adds a comment
 - [x] Post and comment deletion
 - [x] Interactions on posts (Fix bugs with interactions not being highlighted sometimes)
- [x] Make a profile page for each user
 - [ ] Allow site moderators to delete users via their user-page
- [x] Allow users to change appearance/bio settings
- [ ] Fix UX inconsistencies and clean up inefficient code (e.g. fix animation when collapsing comments)
- [ ] Fix reply-bar so it properly displays the relation to each parent post/comment
- [ ] Clean up sub-URLs
 - [ ] Make badxclone.com/index.html --> badxclone.com/
 - [ ] Make badxclone.com/u/foobar (or /u/user_id) --> Make badxclone.com/user/foobar
- [ ] Fix navigation bar on user-pages
- [ ] Make the "Login" nav button that becomes user-page button display the user profile picture when logged in
- [ ] Increase functionality via adding redundancy in specific places (multiple buttons will do the same thing)
