'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { requireAdmin } from '@/modules/auth/service';
import { requestStatusSchema, setConsultingStatus } from '@/modules/consulting/service';
import { notifyConsultingStatus } from '@/modules/notifications/service';

export async function setConsultingStatusAction(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const status = requestStatusSchema.parse(formData.get('status'));
  const changed = await setConsultingStatus(id, status, admin.id);
  if (changed && formData.get('notify') === 'on') {
    // After the response: a slow SMS provider must not hold up the panel.
    after(() => notifyConsultingStatus(id, status));
  }
  revalidatePath('/admin/consulting');
}
