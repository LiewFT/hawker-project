# Turning on visitor reviews

Reviews use Firebase Authentication (email + password) and Cloud Firestore. Until
`js/firebase-config.js` is filled in, the site shows "Visitor reviews are not
switched on yet" and makes no Firebase requests. About 15 minutes, one time.
The site owner does this in their own Google account.

1. **Create a project** at https://console.firebase.google.com (Google Analytics: off).
2. **Authentication → Get started → Sign-in method → Email/Password → Enable**
   (leave "Email link" off).
   - Settings → Password policy: minimum length 8.
   - Settings → Authorized domains: add `liewft.github.io` (and the custom domain
     once there is one). Sign-in fails on any domain not listed.
   - Templates → Email address verification: set the sender name and wording.
3. **Firestore Database → Create database.** Location `asia-southeast1` (Singapore),
   production mode.
4. **Firestore → Rules:** paste all of `firebase/firestore.rules` and Publish.
5. **Project settings → Your apps → Web (`</>`)**: register an app, copy the config
   object into `js/firebase-config.js`, commit and push.
6. **Recommended before launch:** App Check (reCAPTCHA) to limit bots, and a budget
   alert under Google Cloud billing.

## What is stored, and where
| Data | Where | Public? |
|---|---|---|
| Email, password hash | Firebase Authentication | No |
| Nickname | Authentication, copied onto each review | Yes, with the review |
| Rating, text, date | Firestore `reviews/<venue-slug>__<uid>` | Yes |

Google encrypts both services in transit (TLS) and at rest. Passwords are hashed by
Firebase and never reach our code. This is provider-side encryption, not end-to-end.

## Rules in short
Anyone reads. Writing needs a signed-in user with a **verified email**; one review
per venue per user; a user can only edit or delete their own; rating is 1 to 5, text
up to 1000 characters; the review's name must match the account's name.

## Moderation and deletion
Reviews appear without pre-approval. To remove one, delete its document in the
Firestore console. Users can delete their own review, or their whole account and all
their reviews, from any venue page. Handle privacy requests from people who lost
access to their account by deleting their user in Authentication and their documents
in Firestore.
