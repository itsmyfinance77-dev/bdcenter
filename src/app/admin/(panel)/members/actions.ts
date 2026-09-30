'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/modules/auth/service';
import { setMemberActive } from '@/modules/members/service';

export async function setMemberActiveAction(memberId: string, isActive: boolean) {
  const admin = await requireAdmin('ADMIN');
  await setMemberActive(memberId, isActive, admin.id);
  revalidatePath('/admin/members');
}
