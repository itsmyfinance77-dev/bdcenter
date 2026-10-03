'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/modules/auth/service';
import { clearSandboxSms, smsSandboxEnabled } from '@/modules/messaging/sandbox';

export async function clearSandboxSmsAction() {
  await requireAdmin();
  if (!smsSandboxEnabled()) return;
  await clearSandboxSms();
  revalidatePath('/admin/sms-sandbox');
}
