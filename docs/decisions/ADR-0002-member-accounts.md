# ADR-0002: Public member accounts with phone + SMS one-time code

- Status: Accepted
- Date: 2026-09-30

## Context

Until now the site had no public accounts: every service was a one-off
request (OQ-BD-07 default). On 2026-09-30 the owner asked for regular
visitors to be able to sign up with their phone number, and for training
enrollment to happen on this site instead of linking out to the Chamber.
Enrollments need a stable identity (no duplicates, "my enrollments"), which
anonymous forms cannot give.

The Chamber does not (yet) provide a shared login (OQ-BD-07 stays open for a
future SSO), and no SMS provider has been chosen (OQ-BD-11).

## Decision

- **New `members` domain** (`src/modules/members/service.ts`) owning the
  `Member` and `OtpChallenge` models. It is separate from `AdminUser`: a
  member can never reach `/admin`, and an admin account is not a member.
- **Sign-up and sign-in are one flow**: enter an Iranian mobile number
  (normalized to `09xxxxxxxxx`), receive a 6-digit code by SMS, enter it. The
  first successful verification creates the member. No passwords are stored.
- **Codes**: random 6 digits, stored only as an HMAC-SHA256 (keyed by
  `OTP_SECRET`), valid 2 minutes, one active code per phone, at most 5 wrong
  tries per code, compared in constant time. Sending and verifying are also
  rate limited per phone and per client address (`src/modules/ratelimit`).
- **Sessions**: the same signed-token format as admin sessions, but every
  token now carries an audience (`admin` / `member`) and a session version.
  Member cookies (`bd_member`, 30 days, `HttpOnly`, `SameSite=Lax`, path `/`)
  can never be accepted as admin cookies and vice versa. Bumping
  `sessionVersion` (logout-everywhere, deactivation, admin password change)
  revokes every copy of a cookie at once — this also closes the admin
  "stateless session" limitation.
- **SMS delivery behind an interface** (`src/modules/members/sms.ts`). The only
  provider implemented is `console`, which logs the code on the server and is
  refused in production. A real provider is a small adapter once OQ-BD-11 is
  answered.
- **Training**: a `training` domain (`src/modules/training/service.ts`) owns
  `Course` and `Enrollment`. Enrolling requires a signed-in member; the
  enrollment stores `memberId` as a plain column (no cross-domain Prisma
  relation), is unique per course and member, and respects `capacity` inside
  a row-locked transaction. Membership tier is recorded as for consulting;
  no price is computed (OQ-BD-01).

## Consequences

- Visitors get a real account area (`/account`) and admins a member list.
- Production sign-up cannot work until an SMS provider and account exist
  (OQ-BD-11); until then the login page says SMS is unavailable.
- Existing admin cookies (no audience claim) are invalid after this change;
  admins sign in once more.
- Personal data now includes verified phone numbers tied to accounts; the
  privacy notice and retention policy must cover it (OQ-BD-12).
