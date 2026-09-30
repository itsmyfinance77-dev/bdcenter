'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireMember } from '@/modules/members/service';
import { enroll } from '@/modules/training/service';

/** Enrolls the signed-in member, then shows the outcome on the course page. */
export async function enrollAction(slug: string) {
  const coursePath = `/courses/${encodeURIComponent(slug)}`;
  const member = await requireMember(coursePath);
  const result = await enroll(slug, member);
  revalidatePath('/account');
  redirect(`${coursePath}?result=${result.ok ? 'ok' : result.reason}`);
}
