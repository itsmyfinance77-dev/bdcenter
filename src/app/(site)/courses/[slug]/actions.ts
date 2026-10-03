'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireMember } from '@/modules/members/service';
import { enroll, getPublishedCourse } from '@/modules/training/service';
import { after } from 'next/server';
import { staffAlertText } from '@/content/admin';
import { alertStaff } from '@/modules/notifications/service';

/** Enrolls the signed-in member, then shows the outcome on the course page. */
export async function enrollAction(slug: string) {
  const coursePath = `/courses/${encodeURIComponent(slug)}`;
  const member = await requireMember(coursePath);
  const result = await enroll(slug, member);
  if (result.ok) {
    after(async () => {
      const course = await getPublishedCourse(slug);
      if (!course) return;
      await alertStaff(
        'enrollments',
        staffAlertText.enrollments(member.fullName ?? member.phone, course.title),
        `/admin/courses/${course.id}`,
      );
    });
  }
  revalidatePath('/account');
  redirect(`${coursePath}?result=${result.ok ? 'ok' : result.reason}`);
}
