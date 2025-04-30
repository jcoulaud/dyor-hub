import { TipsTable } from '@/components/account/TipsTable';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tips History',
};

export default function TipsPage() {
  return (
    <div>
      <h2 className='text-2xl font-bold mb-6'>Tips History</h2>
      <TipsTable />
    </div>
  );
}
