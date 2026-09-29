# Requirements — Business Development Center microsite

Source: employer brief `الگوی صفحه سایت - مرکز کسب و کار.docx` (received 2026-09-29),
translated and structured below. This is a standalone project, independent of the
"Roshd Afarinan" platform, even though both are affiliated with the Yazd Chamber
of Commerce and share a street address.

## Context

- Parent organization: اتاق بازرگانی، صنایع، معادن و کشاورزی یزد (Yazd Chamber of Commerce).
- This site is the public face of the Chamber's **Business Development Center**
  (مرکز توسعه کسب‌وکار), housed at Yazd Science and Technology Park.
- Planned domain: `bdcenter.yazdccima.com` (a subdomain of the Chamber's own site).
- The Chamber's home page (yazdccima.com, out of our control) will add a link to
  this site next to "شورای گفت‌وگو".

## Page structure (brief §"در صفحه مرکز توسعه کسب کار")

1. **Top navigation:** خدمات (submenu: آموزش, مرکز مشاوره, رویدادها, میز خدمت, میز صنعت), فرم‌ها, درباره مرکز, تماس با ما.
2. **Header banner**, matching the Chamber site's own banner style.
3. **Building photo** below the banner; hovering (or focusing, for keyboard users)
   shows the "درباره مرکز" text (see `src/content/site.ts#aboutText` for the approved copy).
4. **News & events of the center**, next to the photo.
5. **Service tiles** (7): آموزش و توانمندسازی (links out to the Chamber's own
   `/services/edu`), مرکز مشاوره (tech/knowledge-based companies), میز صنعت,
   میز خدمت (a form, like the Chamber's own), رویدادهای فناورانه, کافه تجربه,
   خدمات سرمایه‌گذاری. The last four ship as announced-soon tiles until their
   content arrives.
6. **Outbound links to the Chamber's own services** (9 links) — registration/membership
   card, member directory, "علم و کار", commissions, economic research center,
   international affairs, foreign/domestic exhibitions, Chamber trade events.
7. **Footer:** contact info (address confirmed; postal code, phone extension and
   email pending — see open questions), "useful links" (pending).
8. **Dynamic form builder**: staff can create a form (fields + type + required)
   without a deploy, and view/export its submissions.

## Membership-tier pricing (brief §5, note under 2-5)

The brief proposes three membership tiers that should gate training/consulting
pricing:

1. **عادی (normal)** — non-member, non-tech company.
2. **ویژه (special)** — tech/knowledge-based company, not a Chamber member.
3. **ممتاز (premium)** — Chamber member.

Per the employer's decision, **this pricing rule is not implemented yet** — see
`OQ-BD-01` in `open-questions.md`. `MembershipRecord` and `MembershipTier` exist
in the schema only to store the imported roster; no price or free/paid gate is
computed from them until the rule is confirmed.

## Non-functional (carried over from the Chamber site's own bar and the
sibling Roshd Afarinan project's baseline, unless the employer says otherwise)

| Area          | Requirement                                                   |
| ------------- | -------------------------------------------------------------- |
| Language      | Persian, RTL, Persian digits in UI                              |
| Responsive    | Mobile-first                                                    |
| SEO           | Metadata, canonical, OG, JSON-LD, sitemap, robots (the Chamber's own site lacks JSON-LD — we do better) |
| Accessibility | Semantic HTML, keyboard navigation (the hover-reveal about text must also work on focus) |
| Ownership     | The client owns the source, database and content                |

## Out of scope for this phase

Everything the Chamber's own site (yazdccima.com) already provides and this
site only needs to **link to**: bazaar card issuance, member directory, arbitration
center, dialogue council, commissions, press clips. We do not rebuild these.
