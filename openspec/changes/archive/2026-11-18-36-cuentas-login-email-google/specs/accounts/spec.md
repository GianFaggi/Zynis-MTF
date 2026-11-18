# Spec Delta

## Purpose

Defines what an MTF account is and how it is created, verified, recovered and linked to Google, how it is protected from abuse, and how the user reaches it from Settings. An account is always optional.

## ADDED Requirements

### Requirement: An account is optional
MTF SHALL open and work fully with no account and no connection. No Card, Area, Win or setting SHALL depend on having an account, and signing in or out SHALL NOT change anything on the Desk.

#### Scenario: Never signed in
- **WHEN** a user who never created an account uses MTF
- **THEN** every feature of the Desk, the Jar, Mis logros and the Backup works as before

#### Scenario: Signing in leaves the Desk alone
- **WHEN** the user signs in
- **THEN** every Card, Area and Win on this device is unchanged

#### Scenario: Nothing is uploaded
- **WHEN** the user signs in or registers
- **THEN** no Card, Area or Win is sent to the server

### Requirement: Minimal account data
An account SHALL hold only an id (uuid), an email, a password hash when it has a password, a Google id when it is linked to Google, whether the email is verified, and its created and updated times. It SHALL NOT hold a name or a photo.

#### Scenario: Created with a password
- **WHEN** an account is created with email and password
- **THEN** it stores no name and no photo, and no Google id

#### Scenario: Created with Google
- **WHEN** an account is created by signing in with Google
- **THEN** MTF has asked Google only for the email identity, and stores no name and no photo

### Requirement: Emails are compared without case
The server SHALL treat emails as case-insensitive and ignore surrounding spaces, so one address can only ever have one account.

#### Scenario: Different case at sign-in
- **WHEN** the user registered as `gian@example.com` and signs in as ` Gian@Example.com `
- **THEN** it is the same account

### Requirement: Register with email and password
The user SHALL be able to register with an email and a password of at least 8 characters and at most 72 bytes. The password SHALL be stored only as a bcrypt hash. Registering SHALL send a verification mail and SHALL NOT sign the user in.

#### Scenario: New account
- **WHEN** the user registers with a new email and a valid password
- **THEN** the account exists with its email not verified
- **AND** a verification mail is sent
- **AND** Account shows a message asking the user to check their mail, with the address they typed

#### Scenario: Password too short
- **WHEN** the user tries to register with a 7-character password
- **THEN** the form says the password needs at least 8 characters and no account is created

#### Scenario: Password too long
- **WHEN** the server receives a password longer than 72 bytes
- **THEN** it refuses the request and creates no account

#### Scenario: Invalid email
- **WHEN** the server receives a text that is not an email address
- **THEN** it refuses the request and creates no account

### Requirement: Registering does not reveal who has an account
Registering with an email that already has an account SHALL give exactly the same answer as a new email. A verified account's owner SHALL get a mail saying the account exists, with a link to set a new password; an unverified one SHALL get a new verification mail. Neither mail changes the account's password.

#### Scenario: Email already verified
- **WHEN** someone registers with the email of a verified account
- **THEN** the answer is the same as for a new email
- **AND** the owner receives a mail saying they already have an account, with a recovery link
- **AND** the account's password does not change

#### Scenario: Email not verified yet
- **WHEN** someone registers again with the email of an unverified account
- **THEN** the answer is the same as for a new email
- **AND** a new verification mail is sent, subject to the minimum wait
- **AND** the account's password does not change

### Requirement: Verify the email by mail
The verification mail SHALL hold a link to MTF that confirms the email when opened. The link SHALL work once and expire after 24 hours. Confirming SHALL NOT sign the user in, because the link may open in a different browser from the installed app.

#### Scenario: Link opened
- **WHEN** the user opens a valid verification link
- **THEN** the email is verified and Account says so and invites the user to sign in

#### Scenario: Registered in the installed app, link opened in the browser
- **WHEN** the user registered in the installed app on an iPhone and the link opens in Safari
- **THEN** the email is verified
- **AND** signing in afterwards in the installed app succeeds

#### Scenario: Link used or expired
- **WHEN** the user opens a verification link that was already used or is more than 24 hours old
- **THEN** Account says the link no longer works, that they can sign in if they already confirmed, and offers to send a new one

#### Scenario: A mail scanner fetches the link
- **WHEN** a program requests the link's address without running the page
- **THEN** the email is not verified and the link still works

### Requirement: Sign in only with a verified email
Signing in with email and password SHALL succeed only with the right password and a verified email. A wrong password, an unknown email and an account with no password SHALL get the same answer, in a similar time.

#### Scenario: Right password, verified
- **WHEN** the user signs in with the right password and a verified email
- **THEN** a session starts and Account shows the account's email

#### Scenario: Right password, not verified
- **WHEN** the user signs in with the right password and an unverified email
- **THEN** no session starts, Account asks them to confirm their email and offers to send the mail again

#### Scenario: Wrong password or unknown email
- **WHEN** the password is wrong, or the email has no account
- **THEN** Account shows the same message in both cases and does not say which it was

#### Scenario: Account with Google only
- **WHEN** someone tries a password on an account that has only Google
- **THEN** the answer is the same as for a wrong password

### Requirement: Resend the verification
The user SHALL be able to ask for a new verification mail. The server SHALL send at most one every 60 seconds per account, and SHALL give the same answer whether or not it sent one. A new mail SHALL make the previous link stop working.

#### Scenario: Resend
- **WHEN** an unverified user asks for the mail again after more than 60 seconds
- **THEN** a new mail is sent, and the link in the previous one no longer works

#### Scenario: Too soon
- **WHEN** the same account asks again within 60 seconds
- **THEN** no mail is sent and the answer is the same

#### Scenario: The button waits
- **WHEN** the user has just asked for the mail
- **THEN** the resend button is unavailable for 60 seconds

#### Scenario: Unknown or verified email
- **WHEN** the email has no account or is already verified
- **THEN** no mail is sent and the answer is the same

### Requirement: Recover the password by mail
The user SHALL be able to ask for a recovery mail, with the same answer whether or not the account exists and at most one mail every 60 seconds per account. Its link SHALL set a new password, work once and expire after 1 hour.

#### Scenario: Recovery asked
- **WHEN** the user asks to recover the password of an existing account
- **THEN** a recovery mail is sent and Account says to check the mail

#### Scenario: Unknown email
- **WHEN** the email has no account
- **THEN** no mail is sent and the answer is the same

#### Scenario: New password set
- **WHEN** the user opens a valid recovery link and sets a valid new password
- **THEN** the password changes, the link stops working and Account invites them to sign in

#### Scenario: Link expired
- **WHEN** the recovery link is more than 1 hour old or was already used
- **THEN** the password does not change and Account offers to send a new mail

#### Scenario: A mail scanner fetches the link
- **WHEN** a program requests the link's address without running the page
- **THEN** the link still works for the user

### Requirement: Recovery proves the email
Setting a new password through a recovery link SHALL mark the email as verified, and SHALL end every session of that account. An account with only Google SHALL be able to get a password this way.

#### Scenario: Unverified account recovers
- **WHEN** an unverified account sets a new password through a recovery link
- **THEN** its email is verified and it can sign in with the new password

#### Scenario: Other devices are signed out
- **WHEN** a user sets a new password and has a session on another device
- **THEN** that session ends the next time that device reaches the server

#### Scenario: Google account gets a password
- **WHEN** an account with only Google sets a password through a recovery link
- **THEN** it can sign in with Google and with the password

### Requirement: Sign in with Google
The user SHALL be able to sign in with Google in a window of its own, while Account waits with a message and a cancel button. The window SHALL open on MTF's own page, which shows the paper-plane wait until the server answers `/health` and then goes on to Google by itself, so the hosting's loading page never shows. The server SHALL validate Google's ID token, and SHALL accept only an email Google marks as verified. An email with no account SHALL get a new verified account.

#### Scenario: Google while the server sleeps
- **WHEN** the user starts signing in with Google and the server is asleep
- **THEN** the window shows the paper plane with its messages, in the current language
- **AND** it goes on to Google by itself once the server answers, with no loading page from the hosting

#### Scenario: Google while the server is awake
- **WHEN** the user starts signing in with Google and the server answers within 1.5 seconds
- **THEN** the window goes on to Google and no plane appears

#### Scenario: The server does not answer the window
- **WHEN** the window has waited 90 seconds with no answer from the server
- **THEN** it shows the calm message of the wait timeline and does not go on to Google

#### Scenario: First time with Google
- **WHEN** a user with no account signs in with Google
- **THEN** a verified account is created and a session starts in the MTF that started it

#### Scenario: Returning with Google
- **WHEN** a user whose account is linked to Google signs in with Google, even with a different email at Google now
- **THEN** a session starts on that same account

#### Scenario: Google's email is not verified
- **WHEN** Google reports the email as not verified
- **THEN** no session starts, no account is linked or created, and Account says it could not sign in

#### Scenario: A token that does not validate
- **WHEN** the ID token fails validation or is meant for another application
- **THEN** no session starts

#### Scenario: The user cancels at Google
- **WHEN** the user cancels on Google's screen
- **THEN** no session starts, the window says to go back to MTF, and Account returns to the sign-in form

#### Scenario: The user cancels in MTF
- **WHEN** Account is waiting for Google and the user activates the cancel button
- **THEN** Account stops waiting and returns to the sign-in form

#### Scenario: Nobody finishes
- **WHEN** 5 minutes pass with no answer from Google
- **THEN** Account stops waiting and says it could not sign in, and the Desk is untouched

### Requirement: Google reaches the installed app
The session SHALL reach the MTF that started the sign-in, wherever Google's screen ran, so it works on an installed iPhone, whose browser windows have storage of their own. The window SHALL end on a short page, in the current language, saying to go back to MTF.

#### Scenario: Installed on an iPhone
- **WHEN** the user signs in with Google in MTF installed on an iPhone and finishes in the browser window it opens
- **THEN** after returning to MTF the installed app shows the account, with the session saved in its own storage

#### Scenario: Browser on a PC
- **WHEN** the user signs in with Google in a browser tab on a PC
- **THEN** the Google window closes itself if the browser allows it, and the original tab shows the account

#### Scenario: Coming back resumes at once
- **WHEN** the user returns to MTF after finishing at Google
- **THEN** Account checks right away instead of waiting for its next check

### Requirement: The Google session stays secret
A session started with Google SHALL be handed over only in answer to a secret that the starting MTF generated and never put in an address. It SHALL be handed over once, within 5 minutes. No token SHALL ever appear in an address, in a redirect or in the window's page.

#### Scenario: Nothing in the address
- **WHEN** Google's sign-in completes
- **THEN** no address visited during the sign-in contains a session token or the secret itself

#### Scenario: Handed over once
- **WHEN** the session was handed over and the same secret is used again
- **THEN** no session is given

#### Scenario: Someone else's window
- **WHEN** a browser that does not hold the secret finishes the Google sign-in
- **THEN** that browser receives no session

### Requirement: Google links an existing account
Signing in with Google SHALL link to the account with the same email instead of creating a second one. If that account's email was not verified, its password SHALL be removed, because nobody ever proved it belonged to the owner of the address.

#### Scenario: Verified account links
- **WHEN** a verified account with a password signs in with Google using the same email
- **THEN** the Google id is added, and the account can sign in both ways

#### Scenario: Someone registered the address first
- **WHEN** an unverified account with a password exists and the real owner signs in with Google using that email
- **THEN** the account is linked and verified, and its previous password stops working

### Requirement: Secrets are not stored readable
The server SHALL store passwords only as bcrypt hashes and every other secret (mail links, renewal tokens, Google sign-in secrets) only as a one-way hash, so a copy of the database cannot sign anyone in.

#### Scenario: Reading the database
- **WHEN** someone reads the stored rows of a user with an open session and a pending recovery link
- **THEN** no row holds the renewal token, the recovery token or the password in readable form

### Requirement: Abuse is rate limited
Every account endpoint SHALL be limited per client address, and exceeding a limit SHALL answer "too many requests" and do nothing else. Account SHALL show a calm message asking to try again in a moment. `/health` SHALL NOT be limited.

#### Scenario: Too many sign-in attempts
- **WHEN** one address exceeds the limit on sign-in attempts within a minute
- **THEN** the next attempts answer "too many requests" and do not check the password

#### Scenario: The message
- **WHEN** Account receives "too many requests"
- **THEN** it asks to try again in a minute, and the form keeps what the user typed

#### Scenario: Health is free
- **WHEN** `/health` is requested many times in a minute
- **THEN** every request gets its normal answer

### Requirement: Account in Settings
The Settings sheet SHALL show a "Cuenta" / "Account" section with the current state, opening an Account sheet. Settings SHALL close first, and opening Settings alone SHALL make no network request.

#### Scenario: No account
- **WHEN** the user opens Settings with no session
- **THEN** the section says the Desk lives on this device and offers to sign in
- **AND** no network request is made

#### Scenario: Signed in
- **WHEN** the user opens Settings with a session, online or not
- **THEN** the section shows the account's email

#### Scenario: The Account sheet
- **WHEN** the user activates the section
- **THEN** Settings closes and the Account sheet opens with sign in, register and recover if there is no session, or the email and sign out if there is one

#### Scenario: Password managers
- **WHEN** a sign-in or register form is shown
- **THEN** its fields are marked as email, current password or new password, so a password manager can fill them

### Requirement: Mail links open the Account sheet
Opening a verification or recovery link SHALL open MTF with the Account sheet on the right step, and SHALL remove the token from the address at once. A token SHALL travel in a part of the address that is never sent to the web server.

#### Scenario: Recovery link
- **WHEN** the user opens a recovery link
- **THEN** the Account sheet opens asking for a new password
- **AND** the address bar no longer shows the token

#### Scenario: The web server never sees it
- **WHEN** a browser with nothing cached opens a mail link
- **THEN** the request to the web server does not include the token

### Requirement: Waking the server while signing in
Opening the Account sheet with no session SHALL ask `/health` in the background until it answers, so Render wakes while the user types. No plane SHALL show while typing. Each request SHALL show the paper-plane wait from the moment the user submits, and SHALL be sent once the server has answered `/health`.

#### Scenario: Sheet opens
- **WHEN** the Account sheet opens with no session and a connection
- **THEN** wake requests go only to `/health`, and the form is ready to use at once with no plane on screen

#### Scenario: A request is sent once
- **WHEN** the user sets a new password from a recovery link while the server is asleep
- **THEN** the new password is sent once, after the server has answered `/health`

#### Scenario: Asleep server
- **WHEN** the user submits the form and the server has not answered after 8 seconds
- **THEN** the form gives way to the paper plane with the message that the server is waking up

#### Scenario: Awake server
- **WHEN** the server answers within 1.5 seconds of submitting
- **THEN** no plane appears

#### Scenario: Waiting does not block the Desk
- **WHEN** a request is waiting and the user closes the Account sheet
- **THEN** the Desk works normally

### Requirement: A server that does not answer stays calm
A request with no answer after 90 seconds SHALL stop and show the positive message of the wait timeline, with the form back and what the user typed still there, so they can try again.

#### Scenario: No answer in 90 seconds
- **WHEN** a sign-in request has no answer after 90 seconds
- **THEN** Account shows "No pudimos conectar ahora. Tu escritorio sigue funcionando; probá en un rato."
- **AND** the form is back with the email still typed

### Requirement: Account with no connection
With no connection, the Account sheet SHALL say that signing in needs a connection and that the Desk keeps working, and it SHALL NOT start a wait or a wake request.

#### Scenario: Offline, no session
- **WHEN** the device is offline and the user opens the Account sheet with no session
- **THEN** it says a connection is needed to sign in and that the Desk keeps working
- **AND** no plane appears

### Requirement: Account in both languages
Every text of the Account sheet, every error and every mail SHALL be in the user's current language, Spanish or English. The server SHALL NOT store the language: each request that sends a mail carries it. Nothing in the Account sheet SHALL use the accent color.

#### Scenario: Mail in English
- **WHEN** the UI is in English and the user asks for a recovery mail
- **THEN** the mail is in English

#### Scenario: Error in Spanish
- **WHEN** the UI is in Spanish and the server refuses a sign-in
- **THEN** the message is in Spanish, whatever the server's own wording is

#### Scenario: No accent
- **WHEN** the Account sheet is shown in any state
- **THEN** no control on it uses the accent color

### Requirement: Mails come from Zynis
Verification and recovery mails SHALL be sent from an address at `zynis.com.ar` and SHALL say that they can be ignored by someone who did not ask for them.

#### Scenario: Sender
- **WHEN** a verification or recovery mail arrives
- **THEN** its sender is at `zynis.com.ar`, and it says it can be ignored if the reader did not ask for it
