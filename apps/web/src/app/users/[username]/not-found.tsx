import Link from 'next/link';

export default function UserNotFound() {
  return (
    <div className='container mx-auto px-4 py-16'>
      <div className='max-w-md mx-auto text-center'>
        <h1 className='text-3xl font-bold mb-4'>User Not Found</h1>
        <p className='text-zinc-400 mb-8'>
          The user you are looking for could not be found. They may have changed their username or
          the account may no longer exist.
        </p>
        <Link
          href='/'
          className='inline-flex px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 transition-colors duration-200'>
          Return to Home
        </Link>
      </div>
    </div>
  );
}
