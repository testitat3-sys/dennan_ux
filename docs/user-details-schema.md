# `users.details` schema

`users.details` (convex/schema.ts) is an optional, free-form string-to-string
dictionary on the `users` table for tagging account-level facts that don't
warrant their own dedicated column. It is never required — most users won't
have it set.

Any code that writes into `details` must **merge**, not overwrite:

```ts
await ctx.db.patch(userId, {
  details: { ...(user.details ?? {}), someKey: "someValue" },
});
```

Every key ever written here must be documented below in the same change that
introduces it.

| Key | Value | Set by | Meaning |
|---|---|---|---|
| `storeRequestSubmitted` | `"true"` | `convex/storeRequests.ts` → `submitStoreRequest` | User has submitted at least one "request from physical store" form. |
| `lastStoreRequestId` | `<storeRequests _id>` | `convex/storeRequests.ts` → `submitStoreRequest` | Points at the most recent `storeRequests` row for this user. |
