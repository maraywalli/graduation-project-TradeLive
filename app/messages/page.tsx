import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MessagesClient } from './MessagesClient';

export const dynamic = 'force-dynamic';

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ with?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/messages');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

  // Get all messages and derive chats
  const { data: msgs } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  const partnerIds = new Set<string>();
  (msgs || []).forEach((m) => partnerIds.add(m.sender_id === user.id ? m.recipient_id : m.sender_id));
  if (sp.with) partnerIds.add(sp.with);

  let partners: any[] = [];
  if (partnerIds.size) {
    const { data } = await supabase.from('profiles').select('id, username, avatar_url, tier').in('id', Array.from(partnerIds));
    partners = data || [];
  }

  return <MessagesClient me={profile} partners={partners} initialPartnerId={sp.with || partners[0]?.id || null} />;
}
