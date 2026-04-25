import { createClient } from '@/lib/supabase/server';
import { EventsClient } from './EventsClient';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Parallelize the two reads to save a Supabase round-trip on cold starts.
  const [eventsRes, ticketsRes] = await Promise.all([
    supabase
      .from('events')
      .select('*, organizer:profiles!events_organizer_id_fkey(username, tier)')
      .order('starts_at', { ascending: true }),
    user
      ? supabase
          .from('tickets')
          .select('*, event:events(*)')
          .eq('user_id', user.id)
          .order('purchased_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
  ]);

  return <EventsClient events={eventsRes.data || []} myTickets={ticketsRes.data || []} />;
}
