import { createPublicClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Star, Crown } from 'lucide-react';
import { ItemCard } from '@/components/items/ItemCard';

// Public seller profile — cache 60s on Vercel; new items appear after one refresh.
// Use the cookie-less anon client so Next.js can actually cache the route.
export const revalidate = 60;

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = createPublicClient();
  const { data: profile } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle();
  if (!profile) notFound();
  const { data: items } = await supabase
    .from('items')
    .select('*, seller:profiles!items_seller_id_fkey(id, username, tier, avatar_url, rating)')
    .eq('seller_id', profile.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl p-6 text-white mb-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-black text-3xl overflow-hidden">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : profile.username[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2 flex-wrap">
              {profile.full_name || profile.username}
              {profile.tier === 'gold' && <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-black flex items-center gap-1"><Crown className="w-3 h-3" /> GOLD</span>}
              {profile.tier === 'premium' && <span className="text-xs bg-white text-orange-600 px-2 py-0.5 rounded-full font-black">🔥 PRO</span>}
            </h1>
            <p className="opacity-90 font-bold">@{profile.username}</p>
            {profile.bio && <p className="text-sm opacity-80 mt-2">{profile.bio}</p>}
            <div className="flex items-center gap-4 mt-2 text-sm font-bold">
              <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-300 text-yellow-300" /> {Number(profile.rating).toFixed(1)}</span>
              <span>{profile.sales_count} sales</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {(items || []).map((item: any) => <ItemCard key={item.id} item={item} />)}
      </div>
    </div>
  );
}
