import { AdminHeading } from '@/components/admin/ui';
import { requireAdmin } from '@/modules/auth/service';
import { FormBuilder } from '../form-builder';

export const metadata = { title: 'فرم جدید' };

export default async function NewFormPage() {
  await requireAdmin('ADMIN');
  return (
    <>
      <AdminHeading title="فرم جدید" />
      <FormBuilder
        id={null}
        initial={{ status: 'DRAFT' }}
        initialFields={[
          {
            key: 'full_name',
            label: 'نام و نام خانوادگی',
            type: 'TEXT',
            isRequired: true,
            options: [],
            settings: {},
          },
          {
            key: 'mobile',
            label: 'شمارهٔ همراه',
            type: 'MOBILE',
            isRequired: true,
            options: [],
            settings: {},
          },
        ]}
      />
    </>
  );
}
