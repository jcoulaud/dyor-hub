import Link from 'next/link';

export default function NotFound() {
  return (
    <div className='flex flex-col items-center justify-center min-h-[70vh] px-4 text-center'>
      <h1 className='text-4xl font-bold mb-4'>404 - Page Not Found</h1>
      <p className='text-zinc-400 mb-8'>The page you are looking for does not exist.</p>
      <Link
        href='/'
        className='px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md transition-colors'>
        Return Home
      </Link>
    </div>
  );
}
