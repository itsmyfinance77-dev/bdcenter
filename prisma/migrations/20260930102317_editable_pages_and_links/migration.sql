-- Data only: the Chamber-services links (brief §6) move from src/content/site.ts
-- into the admin-editable `external_links` table. Skipped if the section
-- already has rows.
INSERT INTO "external_links" ("id", "section", "title", "url", "sortOrder")
SELECT gen_random_uuid()::text, 'chamber-services', v.title, v.url, v.sort_order
FROM (VALUES
  ('خدمات کارت بازرگانی و عضویت', 'https://yazdccima.com/services/registration/', 10),
  ('بانک اطلاعات اعضای اتاق بازرگانی یزد', 'https://members.yazdccima.com/', 20),
  ('مرکز علم و کار', 'https://sad.yazdccima.com/', 30),
  ('کمیسیون‌های اتاق بازرگانی یزد', 'https://yazdccima.com/commission/', 40),
  ('مرکز پژوهش‌های اقتصادی استان یزد', 'https://yazdccima.com/research/', 50),
  ('امور بین‌الملل', 'https://yazdccima.com/inter/', 60),
  ('نمایشگاه خارجی', 'https://yazdccima.com/event-group/Foreign-exhibition/', 70),
  ('نمایشگاه داخلی', 'https://yazdccima.com/event-group/indoorexhibition/', 80),
  ('رویدادهای تجاری اتاق یزد', 'https://yazdccima.com/event-group/yazdevent/', 90)
) AS v(title, url, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM "external_links" WHERE "section" = 'chamber-services');
