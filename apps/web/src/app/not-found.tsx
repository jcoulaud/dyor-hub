import Link from 'next/link';

export default function NotFound() {
  return (
    <div className='flex flex-col items-center justify-center min-h-[60vh] px-4 text-center'>
      <h1 className='text-4xl font-bold mb-4'>404</h1>
      <h2 className='text-2xl font-semibold mb-6'>Page Not Found</h2>
      <p className='text-muted-foreground mb-8 max-w-md'>
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href='/'
        className='px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'>
        Return Home
      </Link>
    </div>
  );
}
