'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { formValues, GENERIC_ERROR, type FormState } from '@/lib/form-state';
import { fieldErrors } from '@/lib/validation';
import { requireAdmin } from '@/modules/auth/service';
import { notifyEnrollmentStatus } from '@/modules/notifications/service';
import { refreshCertificate } from '@/modules/training/certificates';
import {
  courseInputSchema,
  deleteCourse,
  enrollmentStatusSchema,
  saveCourse,
  setEnrollmentStatus,
} from '@/modules/training/service';

export async function saveCourseAction(
  id: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const values = formValues(formData);
  const parsed = courseInputSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: GENERIC_ERROR, errors: fieldErrors(parsed.error), values };
  }
  const result = await saveCourse(id, parsed.data, admin.id);
  if (!result.ok) {
    return { status: 'error', message: GENERIC_ERROR, errors: result.errors, values };
  }
  revalidatePath('/courses', 'layout');
  redirect(`/admin/courses/${result.id}?saved=1`);
}

export async function deleteCourseAction(id: string) {
  const admin = await requireAdmin();
  await deleteCourse(id, admin.id);
  revalidatePath('/courses', 'layout');
  redirect('/admin/courses');
}

export async function setEnrollmentStatusAction(enrollmentId: string, formData: FormData) {
  const admin = await requireAdmin();
  const status = enrollmentStatusSchema.parse(formData.get('status'));
  const { courseId, changed } = await setEnrollmentStatus(enrollmentId, status, admin.id);
  if (changed && formData.get('notify') === 'on') {
    // After the response: a slow SMS provider must not hold up the panel.
    after(() => notifyEnrollmentStatus(enrollmentId, status));
  }
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function refreshCertificateAction(courseId: string, enrollmentId: string) {
  const admin = await requireAdmin();
  await refreshCertificate(enrollmentId, admin.id);
  revalidatePath(`/admin/courses/${courseId}`);
}
