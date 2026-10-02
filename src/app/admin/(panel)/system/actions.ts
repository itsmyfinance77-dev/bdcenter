'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/modules/auth/service';
import { setErrorResolved } from '@/modules/errors/service';

export async function setErrorResolvedAction(id: string, resolved: boolean) {
  const admin = await requireAdmin('ADMIN');
  await setErrorResolved(id, resolved, admin.id);
  revalidatePath('/admin/system');
  revalidatePath(`/admin/system/errors/${id}`);
}
