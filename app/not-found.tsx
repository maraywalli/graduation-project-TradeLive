import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="text-7xl font-black bg-gradient-to-br from-orange-500 to-red-500 bg-clip-text text-transparent mb-3">404</div>
      <p className="text-zinc-500 font-bold mb-6">Page not found</p>
      <Link href="/" className="px-5 py-2.5 rounded-xl bg-orange-500 text-white font-black">Go home</Link>
    </div>
  );
}
