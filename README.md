## BadXClone
https://badxclone.com/

A barebones Twitter-like social media site written in pure HTML, CSS, and JS
using MySQL and a basic API using PHP

This project is essentially meant to test my understanding of database systems
and apply my understanding of relational databases to real-world applications (using a LAMP stack)

![How I be acting when someone tells me my website looks good](https://i.pinimg.com/originals/27/23/6e/27236eac523762edde10b87ce21385b9.gif)

### Project Roadmap
- [x] Login/Register UX
- [x] Create Post UI
- [x] API integration with schema
- - [ ] Authentification system
- - [x] Account creation
- - [x] Password encryption
- - [x] Login system
- - [x] Session data stored in cookies
- - [x] Moderation
- - [ ] Account deletion system
- [x] Post creation and retrieval
- [x] Comment creation and retrieval
- - [ ] Allow for upload of (optionally) one image when a user adds a comment
- [x] Post and comment deletion
- [x] Interactions on posts
- [x] Make a profile page for each user
- - [ ] Allow site moderators to delete users via their user-page
- - [x] Allow users to change appearance/bio settings
- - [ ] Make the "Login" nav button display the user profile picture when its a user-page button

### Bug Fixing Checklist
- [ ] Fix CSS inconsistencies (spacing issues)
- [ ] Increase functionality via adding redundant buttons in specific places
- [ ] Clean up inefficient code (e.g. fix animation when collapsing comments)
- [ ] Fix reply-bar so it properly displays the relation to each parent post/comment
- [x] Clean up sub-URLs
- - [x] badxclone.com/index.html --> badxclone.com/
- - [x] badxclone.com/u/foobar (also /u/user_id, /user/user_id) --> badxclone.com/user/foobar
- [ ] Fix navigation bar on user-pages
- [ ] Fix issues with interactions not being highlighted sometimes
