import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

/** Written by scripts/e2e-server.mjs for this run (generated admin login, URLs). */
type State = {
  /** Unique per run; names created by a run include it. */
  runId: string;
  siteUrl: string;
  databaseUrl: string;
  smsOutbox: string;
  admin: { email: string; password: string };
  /** CRON_SECRET of the site under test. */
  cronSecret: string;
};

export function state(): State {
  return JSON.parse(readFileSync('.tmp-build/e2e-state.json', 'utf8')) as State;
}

let client: PrismaClient | undefined;

/**
 * Direct access to the e2e database, for setting up data a flow needs. Lazy:
 * test files are loaded before the server (and its state file) exists.
 */
export function db(): PrismaClient {
  client ??= new PrismaClient({ datasources: { db: { url: state().databaseUrl } } });
  return client;
}

/** The newest 6-digit code the fake SMS server recorded for `phone`. */
export async function latestCode(phone: string): Promise<string> {
  let code: string | undefined;
  await expect
    .poll(async () => {
      const outbox = (await (await fetch(state().smsOutbox)).json()) as {
        to: string;
        text: string;
      }[];
      const text = outbox.filter((sms) => sms.to === phone).at(-1)?.text ?? '';
      // Codes may arrive in Persian digits.
      const latin = text.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
      code = latin.match(/\b\d{6}\b/)?.[0];
      return code;
    })
    .toBeTruthy();
  return code!;
}

/** Signs a member in with phone + SMS code; a new number gets an account. */
export async function signInMember(page: Page, phone: string, next = '/account') {
  const before = ((await (await fetch(state().smsOutbox)).json()) as { to: string }[]).filter(
    (sms) => sms.to === phone,
  ).length;
  await page.goto(`/account/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel('شماره همراه').fill(phone);
  await page.getByRole('button', { name: 'دریافت کد' }).click();
  await expect(page.getByLabel('کد ورود')).toBeVisible();
  await expect
    .poll(
      async () =>
        ((await (await fetch(state().smsOutbox)).json()) as { to: string }[]).filter(
          (sms) => sms.to === phone,
        ).length,
    )
    .toBeGreaterThan(before);
  await page.getByLabel('کد ورود').fill(await latestCode(phone));
  await page.getByRole('button', { name: 'ورود', exact: true }).click();
}

export async function signInAdmin(page: Page) {
  const { admin } = state();
  await page.goto('/admin/login');
  await page.getByLabel('ایمیل').fill(admin.email);
  await page.getByLabel('رمز عبور').fill(admin.password);
  await page.getByRole('button', { name: 'ورود', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);
}

/** A unique test phone number, 0991 + 7 digits. */
export function testPhone(): string {
  return `0991${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;
}
