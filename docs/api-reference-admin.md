# Admin API Reference

**Base path:** `/api/admin/`
**Auth required:** Authenticated Supabase session + `profiles.role === 'admin'`
**Error format:** `{ "error": { "code": "...", "message": "..." } }`

All admin endpoints follow the [4-step guard pattern](../docs/project-context.md): env check → JWT auth → input validation → role DB check.

---

## GET /api/admin/metrics

Returns aggregate platform health metrics.

**Auth:** Admin role required.

### Response 200

```json
{
  "data": {
    "dau": 42,
    "briefingDeliveryRate": 87,
    "checkinRate": 63,
    "totalUsers": 214
  }
}
```

| Field | Type | Description |
|---|---|---|
| `dau` | integer | Distinct users with a check-in today (UTC midnight) — computed via `get_dau()` Postgres RPC |
| `briefingDeliveryRate` | integer | `delivered briefings today ÷ total briefings today × 100`, clamped 0–100 |
| `checkinRate` | integer | `distinct users checked in today ÷ total users × 100`, clamped 0–100 |
| `totalUsers` | integer | Total rows in `profiles` table |

### Error Responses

| Status | Code | Cause |
|---|---|---|
| 401 | `UNAUTHORIZED` | Not authenticated |
| 403 | `FORBIDDEN` | Authenticated but not admin |
| 500 | `CONFIG_ERROR` | `SUPABASE_SERVICE_ROLE_KEY` missing |
| 500 | `DB_ERROR` | Database query failed |

### Notes

- `briefingDeliveryRate` and `checkinRate` are integers (0–100). Zero when no briefings/check-ins today.
- DAU uses `COUNT(DISTINCT user_id)` via Postgres RPC to bypass PostgREST's 1,000-row default cap.
- No user-identifying data in response — aggregates only.

---

## GET /api/admin/users?userId={uuid}

Looks up email delivery status for a specific user by UUID.

**Auth:** Admin role required.

### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `userId` | UUID string | Yes | Target user's Supabase auth UUID |

### Response 200

```json
{
  "data": {
    "accountStatus": "verified",
    "profileComplete": true,
    "briefings": [
      { "briefingDate": "2026-06-14", "emailStatus": "delivered" },
      { "briefingDate": "2026-06-13", "emailStatus": "delivered" }
    ],
    "reengagements": [
      { "sentAt": "2026-06-01T09:00:00Z", "emailStatus": "delivered" }
    ]
  }
}
```

| Field | Type | Description |
|---|---|---|
| `accountStatus` | `"verified"` \| `"unverified"` | Whether email is confirmed in Supabase Auth |
| `profileComplete` | boolean | Whether a profile row exists for this user |
| `briefings` | array (max 10) | Last 10 briefing records — date + email_status only, no content |
| `reengagements` | array (max 5) | Last 5 re-engagement notification records |

### Error Responses

| Status | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `userId` missing or not a valid UUID |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 403 | `FORBIDDEN` | Not admin |
| 404 | `NOT_FOUND` | No user found with that UUID |
| 500 | `CONFIG_ERROR` | `SUPABASE_SERVICE_ROLE_KEY` missing |
| 500 | `DB_ERROR` | Database query failed |
| 502 | `AUTH_ERROR` | Supabase Auth service failure (distinct from user-not-found 404) |

### Audit Log

Every successful lookup writes an `audit_logs` row:
```json
{ "event_type": "admin_user_lookup", "metadata": { "target_user_id": "uuid" } }
```

### Notes

- No personal data returned — no name, email address, health data, goals, or check-in content.
- `briefings` contains `briefingDate` and `emailStatus` only. `emailStatus` values: `"pending"`, `"delivered"`, `"failed"`.
- UUID validation happens **before** any DB query — invalid UUIDs return 400 without hitting the database.

---

## POST /api/admin/broadcast

Queues a system-wide broadcast email to all opted-in users.

**Auth:** Admin role required.

### Request Body

```json
{
  "subject": "Platform Update — June 2026",
  "body": "We've added several new features this month...\n\nThank you for being part of LifePilot."
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `subject` | string | Yes | 1–120 characters (whitespace-only rejected) |
| `body` | string | Yes | 1–2,000 characters (whitespace-only rejected) |

### Response 200

```json
{
  "data": {
    "message": "Broadcast queued — users will receive it shortly."
  }
}
```

### Error Responses

| Status | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Subject/body missing, empty, whitespace-only, or over length limit |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 403 | `FORBIDDEN` | Not admin |
| 500 | `CONFIG_ERROR` | `SUPABASE_SERVICE_ROLE_KEY` missing |
| 500 | `DB_ERROR` | Role check DB query failed |

### What Happens After 200

1. A `notification/broadcast.requested` Inngest event is emitted with `{ adminUserId, subject, body, triggeredAt }`.
2. The `sendBroadcast` Inngest function runs asynchronously:
   - Fetches all users with `broadcastEmails: true` in notification preferences and at least one goal (complete profile)
   - Sends each user a CAN-SPAM-compliant email via Resend with a per-user unsubscribe link
   - Skips users with unverified email addresses (logs `broadcast_recipient_skipped`)
   - Writes `audit_logs` row: `event_type: 'admin_broadcast_sent'`, `metadata: { subject, recipientCount }` — no body stored
3. An `admin_broadcast_queued` audit row is also written on the route path for lifecycle tracking.

### Scale Notes

- Fan-out batches recipients in groups of 100 (`BATCH_SIZE=100`)
- Supabase queries paginate in groups of 1,000 (`PAGE_SIZE=1000`)
- Inngest step ceiling: ~1,000 steps = ~99,800 maximum recipients per broadcast

### Notes

- `body` is rendered as plain text — each `\n` creates a new paragraph in the HTML email
- No markdown or HTML in body — admin-authored plain text only
- Users who have opted out via `broadcastEmails: false` in notification preferences are automatically skipped

---

## Shared Behaviours

### Authentication Header

Supabase cookie-based session auth — no explicit `Authorization` header required. Session is read from the `sb-*` cookies automatically.

### Admin Role Check

The `profiles.role` column must equal `'admin'`. Default for all users is `'user'`. Set admin role directly in the database:

```sql
UPDATE profiles SET role = 'admin' WHERE id = 'your-user-uuid';
```

### Audit Logging

All admin operations write to `audit_logs`:

| Endpoint | `event_type` | `metadata` |
|---|---|---|
| GET /api/admin/users | `admin_user_lookup` | `{ target_user_id }` |
| POST /api/admin/broadcast (route) | `admin_broadcast_queued` | `{ subject, adminUserId }` |
| POST /api/admin/broadcast (Inngest) | `admin_broadcast_sent` | `{ subject, recipientCount }` |

No body content, email addresses, or health data is stored in audit log metadata.

---

*Generated: 2026-06-14 — Paige (Technical Writer)*
