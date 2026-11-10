# Google sign-in hands the session over by a secret, in a window of its own

Signing in with Google opens Google's screen in a window of its own. The app that started it generates a secret, sends only its hash through that window (`GET /api/auth/google/login?handoff=<hash>`, carried to Google as `state`), and asks the API with the secret itself (`POST /api/auth/google/exchange`) every 3 seconds, and at once on returning. The back runs the code flow, validates the ID token and marks the hand-off finished. The window ends on a small "go back to MTF" page and never receives a token. The tokens go, once and within 5 minutes, only to whoever holds the secret.

**Why not a redirect, as in Zynis Cal.** A redirect delivers the session to whichever browser context the redirect ended in. On an iPhone, an installed web app has storage of its own, and a screen on another origin opens outside it, so the session would land where the app can never read it. Developer reports up to 2026 still describe this, although they conflict on the details and this was not tested on a device. The hand-off does not care where Google ran, so one flow serves a PC tab, an Android install and an iPhone install.

## Considered Options

- **Redirect, tokens in the address (Zynis Cal)**: rejected. It fails on the installed iPhone, and addresses end up in history and logs.
- **Redirect, with a one-time code in the address fragment**: rejected for the same iPhone reason. It keeps the tokens out of the address, but it does not solve where they land.
- **Google Identity Services button**: rejected. It loads a third-party script into an app that promises none, and it needs that script online; its popup is reported to hang in installed iOS apps; and its button is Google's iframe, not Paper.
- **The redirect, and only email + password on the installed iPhone**: rejected. It would leave the author's main device without the feature, in the install MTF recommends.
- **Google's device flow, with a code the user types**: rejected. It makes the user type a code on another page to get what the hand-off gives with one tap.

## Consequences

- **A hand-off can be phished.** Someone could start a sign-in, send the Google address to a victim, and receive the session if the victim finishes Google's screen within 5 minutes. It takes a victim who follows a stranger's link and picks their account on a screen that names MTF. Accepted while MTF is built for its author. **Before MTF opens to other people, add a check**: a short code shown in the app and on the window's last page that the user must confirm.
- Login CSRF goes away, because the browser that runs the callback receives nothing, so no state cookie is needed.
- A polling loop of at most 5 minutes runs while the Account sheet waits. It has its own rate limit, so it never spends the sign-in attempts.
- The window has to open inside the click, so it cannot wait for the API. If Render is still asleep, its own loading page may appear in that window. Opening the Account sheet wakes the API in advance, which makes that rare.
- If the window fails on some device, email and password still work there.
