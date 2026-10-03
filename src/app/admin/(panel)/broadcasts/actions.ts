'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { formatNumber } from '@/lib/format';
import { formValues, GENERIC_ERROR, type FormState } from '@/lib/form-state';
import { fieldErrors } from '@/lib/validation';
import { requireAdmin } from '@/modules/auth/service';
import { broadcastSchema, runBroadcast, startBroadcast } from '@/modules/broadcasts/service';

export async function sendBroadcastAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin('ADMIN');
  const values = formValues(formData);
  const parsed = broadcastSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: GENERIC_ERROR, errors: fieldErrors(parsed.error), values };
  }
  const started = await startBroadcast(parsed.data, admin.id);
  if (!started.ok) return { status: 'error', message: started.error, errors: {}, values };
  after(() => runBroadcast(started.id, started.phones, parsed.data.text));
  revalidatePath('/admin/broadcasts');
  return {
    status: 'success',
    message: `ارسال به ${formatNumber(started.recipients)} نفر شروع شد. نتیجه در فهرست پایین به‌روز می‌شود.`,
  };
}
