# ADR-0003: Appointment booking for consulting and the service desk

- Status: Accepted
- Date: 2026-09-30

## Context

On 2026-09-30 the owner asked for the consulting center (مرکز مشاوره) and the
service desk (میز خدمت) to publish their staff and bookable times: admins
define a profile for each consultant / service-desk person and add time slots;
signed-in members reserve a slot; one slot must never go to more than one
person.

Until now consulting was a free-form request (`ConsultingRequest`) and the
service desk a dynamic form. Both stay; booking is an additional path.

## Decision

- **New `appointments` domain** (`src/modules/appointments/service.ts`) owning
  three models:
  - `StaffProfile` — name, role title, bio (Markdown), optional contact email
    for new-booking alerts, which service it belongs to (`CONSULTING` or
    `SERVICE_DESK`), active flag, display order.
  - `AppointmentSlot` — one staff member, start and end time, optional place
    or meeting note, cancelled flag. Unique per staff member and start time.
  - `Booking` — the member (plain `memberId`, as for enrollments), a copy of
    their contact details, topic and description, and a status
    (`BOOKED`, `CANCELLED`, `DONE`, `NO_SHOW`).
- **One booking per slot, enforced by the database**: a booking holds
  `activeSlotId` (unique) while it is `BOOKED` or `DONE`, and `null` once
  cancelled, so a cancelled slot can be booked again but two live bookings on
  one slot are impossible. Booking also locks the slot row (`FOR UPDATE`) and
  re-checks inside the transaction, like course enrollment.
- **Admins manage everything** in the panel (profiles, single slots, a bulk
  "weekly pattern" generator that skips overlaps, bookings). Staff do not get
  their own panel accounts in this phase.
- **Members** must be signed in with a completed profile to book; they see
  their bookings on `/account`, can cancel until the slot starts, and can add
  the appointment to their phone calendar (.ics).
- **Safe defaults, pending the center's decision (OQ-BD-14)**: a member may
  hold at most 3 upcoming bookings per service and never two that overlap;
  cancelling is allowed until the start time; no price is shown (OQ-BD-01).
- **Notifications** reuse the notifications domain: the member gets an SMS /
  email on booking and when staff cancel; the staff member gets an email for
  each new booking when an address is set.

## Consequences

- Visitors can reserve concrete times instead of waiting for a call back.
- A slot cancelled by staff cancels its booking and notifies the member.
- Deleting a slot that has (or had) a booking is refused; admins cancel it
  instead, so the booking history stays intact.
- The booking limits and cancellation window are constants in the service;
  changing them later is a one-line edit once OQ-BD-14 is answered.
