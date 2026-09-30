'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/modules/auth/service';
import { requestStatusSchema, setConsultingStatus } from '@/modules/consulting/service';

export async function setConsultingStatusAction(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const status = requestStatusSchema.parse(formData.get('status'));
  await setConsultingStatus(id, status, admin.id);
  revalidatePath('/admin/consulting');
}
