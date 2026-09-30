'use server';

import { redirect } from 'next/navigation';
import { logout } from '@/modules/auth/service';

export async function logoutAction() {
  await logout();
  redirect('/admin/login');
}
