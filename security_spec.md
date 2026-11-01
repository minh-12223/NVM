# Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Master Gate & Ownership**: Every `StudySet` belongs to an authenticated, email-verified user (`authorId == request.auth.uid`). Every `Flashcard` inside `/studySets/{setId}/cards/{cardId}` must belong to an existing parent `StudySet` owned by `request.auth.uid`.
2. **Strict Schema & Key Validation**: No extra/shadow fields are allowed on `StudySet`, `Flashcard`, or `StudyStats`. All strings have strict `.size()` upper bounds, and all IDs match `^[a-zA-Z0-9_\-]+$` with max 128 chars.
3. **Temporal Integrity**: `createdAt` and `updatedAt` must strictly equal `request.time`. `createdAt` and `authorId` are immutable on updates.
4. **Query Enforcer**: List queries on `/studySets` require `resource.data.authorId == request.auth.uid || resource.data.isPublic == true`. List queries on `/studyStats` require `resource.data.userId == request.auth.uid`.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: Creating a `StudySet` with `request.auth == null` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: Creating a `StudySet` with `email_verified == false` -> `PERMISSION_DENIED`.
3. **Identity Spoofing**: Creating a `StudySet` where `authorId != request.auth.uid` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection**: Updating a `StudySet` with an extra field `isAdmin: true` -> `PERMISSION_DENIED`.
5. **Immutable Field Mutation**: Updating `authorId` or `createdAt` on an existing `StudySet` -> `PERMISSION_DENIED`.
6. **Client Timestamp Forgery**: Setting `createdAt` to a past/future timestamp (`!= request.time`) -> `PERMISSION_DENIED`.
7. **Denial-of-Wallet String Overflow**: Creating a `Flashcard` with `definition.size() > 1500` -> `PERMISSION_DENIED`.
8. **ID Poisoning**: Creating a document with an invalid ID containing spaces or special characters -> `PERMISSION_DENIED`.
9. **Orphaned Subcollection Write**: Creating a `Flashcard` in `/studySets/{setId}/cards/{cardId}` where parent `/studySets/{setId}` does not exist or belongs to another user -> `PERMISSION_DENIED`.
10. **Unauthorized Private Set Read**: Reading a `StudySet` where `isPublic == false` and `authorId != request.auth.uid` -> `PERMISSION_DENIED`.
11. **Cross-User Stats Tampering**: Updating `/studyStats/{statId}` where `userId != request.auth.uid` -> `PERMISSION_DENIED`.
12. **Value Poisoning on Status Enum**: Updating a `Flashcard` `status` to `'hacked_status'` outside `['new', 'learning', 'mastered']` -> `PERMISSION_DENIED`.
