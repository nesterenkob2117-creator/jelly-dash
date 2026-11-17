# Security Specification & Payload Audit

## Data Invariants
1. `users/{userId}` holds PII (`email`, `uid`, `displayName`, `photoURL`) and can ONLY be read, created, updated, or deleted when `request.auth.uid == userId` (and `email_verified == true` for writes). Listing `users` is strictly denied (`allow list: if false`).
2. `levels/{levelId}` holds published community levels without PII (`authorUid`, `authorName`, level geometry).
3. Publishing (`create`), editing (`update`), or deleting (`delete`) a level requires a verified authenticated user whose `request.auth.uid` matches `authorUid`.
4. `allow list` on `levels` explicitly enforces `resource.data.published == true`.
5. All strings, IDs, numeric bounds, timestamps (`request.time`), and `objects` array length (`1..2500`) are strictly validated.

## Adversarial Payloads Rejected
1. Unauthenticated `create` on `/levels/lvl_1` -> DENIED (`isVerifiedUser()` fails).
2. Unverified email spoofing (`email_verified == false`) -> DENIED (`email_verified == true` required).
3. Author spoofing (`authorUid != request.auth.uid`) -> DENIED (`isValidLevel` checks `authorUid == request.auth.uid`).
4. Cross-user `get` on `/users/otherUid` -> DENIED (`request.auth.uid == userId` fails).
5. Blanket `list` on `/users` -> DENIED (`allow list: if false`).
6. Invalid document ID (`../bad` or >128 chars) -> DENIED (`isValidId` regex & length).
7. Ghost/shadow field injection (`isAdmin: true`) -> DENIED (`keys().hasOnly(...)` & `affectedKeys().hasOnly(...)`).
8. Client timestamp tampering (`createdAt` != `request.time`) -> DENIED.
9. Immutable field overwrite on update (`authorUid` or `createdAt` changed) -> DENIED.
10. Oversized `objects` array (>2500) or empty `objects` array -> DENIED.
11. Unbounded `title` (>40 chars) or `description` (>200 chars) -> DENIED.
12. Querying unpublished levels (`published == false`) -> DENIED (`resource.data.published == true`).
