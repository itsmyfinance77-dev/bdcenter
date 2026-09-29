# Open Questions — Business Development Center microsite

The employer must decide these. Do not hard-code them as business rules until
answered; each blocks a specific feature and has a documented safe default.

| ID        | Topic                       | Question                                                                                   | Blocks                    | Temporary default                                             |
| --------- | ---------------------------- | -------------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------- |
| OQ-BD-01  | Membership-tier pricing      | Exact price/discount per tier (عادی/ویژه/ممتاز) for training and consulting, and how the "Excel data" roster is delivered and kept current (format, update cadence, source of truth). | Course/Consulting pricing  | Requests are captured with `membershipTier` recorded but no price is computed or charged. |
| OQ-BD-02  | Postal code                  | The center's postal code.                                                                     | Footer                     | Shown as "—".                                                   |
| OQ-BD-03  | Email & phone extension      | The center's public email address and phone extension.                                        | Footer, contact page       | Shown as "—".                                                   |
| OQ-BD-04  | Visual identity               | Logo, official colors — reuse the Chamber's palette or a distinct one for the center?          | Header, tokens              | Neutral placeholder palette in `globals.css`.                   |
| OQ-BD-05  | Building photo                | Real photo of the center's building at the Science & Technology Park.                          | Home page hero              | Placeholder block with alt text "نمای مرکز".                    |
| OQ-BD-06  | Content for 4 service tiles   | میز صنعت, رویدادهای فناورانه, کافه تجربه, خدمات سرمایه‌گذاری — content and whether each needs its own request form. | Services section            | Rendered as "به‌زودی" tiles (`isPlaceholder: true`).             |
| OQ-BD-07  | SSO with the Chamber site     | Does the Chamber provide a shared login/identity, or does a visitor register separately here? | Auth, if any public account is ever needed | No public account in this phase; services are request-based.  |
| OQ-BD-08  | Subdomain DNS & hosting        | Who configures `bdcenter.yazdccima.com` DNS, and where is this app hosted (same box as the Chamber's WordPress, or separate)? | Deployment                  | `NEXT_PUBLIC_SITE_URL` in `.env` defaults to the target domain; infra decided later. |
| OQ-BD-09  | "میز خدمت" form fields         | Exact fields the Chamber's own میز خدمت form collects, to mirror it (brief says "فرم مشابه فرم اتاق ساخته شود"). | Service desk form            | A generic `FormDefinition` seed with a reasonable field set; adjust once confirmed. |
| OQ-BD-10  | Useful links (footer)          | The actual "پیوندهای مفید" list.                                                              | Footer                       | Section renders "به‌زودی اضافه می‌شود".                          |
