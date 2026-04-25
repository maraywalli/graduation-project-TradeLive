import { createAdminClient, createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfileClient } from './ProfileClient';

export const dynamic = 'force-dynamic';

async function ensureProfile(userId: string, user: any) {
  const admin = createAdminClient();
  const meta = (user.user_metadata || {}) as Record<string, any>;
  const baseName =
    String(meta.username || (user.email || 'user').split('@')[0])
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .slice(0, 20) || 'user';

  // Try once with the requested name, then up to 8 retries with random suffixes
  // (and finally a uuid-style fallback) so we are robust against username
  // collisions even under concurrent self-heal calls.
  const candidates = [baseName];
  for (let i = 0; i < 8; i++) {
    candidates.push(`${baseName}${Math.floor(Math.random() * 1_000_000)}`);
  }
  candidates.push(`${baseName}_${userId.replace(/-/g, '').slice(0, 12)}`);

  for (const uname of candidates) {
    const { data, error } = await admin
      .from('profiles')
      .insert({
        id: userId,
        email: user.email,
        username: uname,
        full_name: meta.full_name || null,
        language: meta.language || 'ku',
      })
      .select('*')
      .single();

    if (!error && data) return data;

    // 23505 = unique_violation. Distinguish id-conflict vs username-conflict.
    if (error && (error as any).code === '23505') {
      // If the row for this user already exists (id conflict, e.g. another
      // request created it concurrently), return that existing row.
      const { data: existing } = await admin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (existing) return existing;
      // Otherwise it was a username collision — try the next candidate.
      continue;
    }

    // Any other error — bail out, don't loop forever.
    break;
  }
  return null;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/profile');

  const [profileRes, items, orders, enrollments, tickets] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('items').select('*').eq('seller_id', user.id),
    supabase.from('orders').select('*, item:items(title), seller:profiles!orders_seller_id_fkey(username)').eq('buyer_id', user.id).order('created_at', { ascending: false }),
    supabase.from('course_enrollments').select('*, course:courses(title)').eq('user_id', user.id),
    supabase.from('tickets').select('*, event:events(title)').eq('user_id', user.id),
  ]);

  // Self-heal: if the auth-trigger never fired (or failed silently) the user
  // has no profile row. Create one on the fly using their auth metadata so the
  // page stays functional instead of showing an empty/loading screen.
  let profile = profileRes.data;
  if (!profile) {
    profile = await ensureProfile(user.id, user);
  }

  return (
    <ProfileClient
      profile={profile}
      items={items.data || []}
      orders={orders.data || []}
      enrollments={enrollments.data || []}
      tickets={tickets.data || []}
    />
  );
}
