export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-2 gap-8 animate-pulse">
      <div className="aspect-square bg-zinc-200 dark:bg-zinc-800 rounded-3xl" />
      <div className="space-y-4">
        <div className="h-8 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded-xl mt-6" />
      </div>
    </div>
  );
}
