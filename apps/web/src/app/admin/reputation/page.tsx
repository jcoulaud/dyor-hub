'use client';

import { ReputationAdmin } from '../../../components/admin/ReputationAdmin';

export default function ReputationAdminPage() {
  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <h1 className='text-2xl font-bold tracking-tight'>Reputation Management</h1>
      </div>

      <ReputationAdmin />
    </div>
  );
}
