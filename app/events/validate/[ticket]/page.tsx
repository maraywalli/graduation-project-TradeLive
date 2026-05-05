import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Props = {
  params: {
    ticket: string;
  };
};

export default async function TicketValidationPage({ params }: Props) {
  const supabase = createAdminClient();
  const { data: ticket, error } = await supabase
    .from('tickets')
    .select('id,status,event:events(title,venue,starts_at)')
    .eq('qr_code', params.ticket)
    .single();

  let pageStatus: 'valid' | 'used' | 'invalid' | 'refunded' = 'invalid';
  let title = 'Ticket validation';
  let message = 'This ticket is invalid or has already been used.';

  if (!error && ticket) {
    const event = ticket.event;
    title = event?.title || 'Ticket validation';

    if (ticket.status === 'used') {
      pageStatus = 'used';
      message = 'This ticket has already been redeemed.';
    } else if (ticket.status === 'refunded') {
      pageStatus = 'refunded';
      message = 'This ticket has been refunded and is no longer valid.';
    } else {
      const { error: updateError } = await supabase.from('tickets').update({ status: 'used' }).eq('id', ticket.id);
      if (!updateError) {
        pageStatus = 'valid';
        message = 'Access granted. Ticket successfully validated.';
      } else {
        pageStatus = 'invalid';
        message = 'Unable to validate this ticket right now. Please try again.';
      }
    }
  }

  const colorClass =
    pageStatus === 'valid'
      ? 'from-emerald-500 to-teal-600'
      : pageStatus === 'used'
      ? 'from-yellow-500 to-orange-500'
      : 'from-red-500 to-rose-600';

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5 bg-white dark:bg-zinc-900">
        <div className={`p-8 bg-gradient-to-r ${colorClass} text-white`}> 
          <h1 className="text-3xl font-black">{title}</h1>
          <p className="mt-2 text-sm opacity-90">
            {pageStatus === 'valid'
              ? 'Scan confirmed. This ticket is now marked as used.'
              : pageStatus === 'used'
              ? 'This ticket was already used earlier.'
              : 'No valid ticket was found for this code.'}
          </p>
        </div>
        <div className="p-8 space-y-4">
          <div className="rounded-3xl bg-zinc-100 dark:bg-zinc-800 p-5">
            <p className="text-sm font-bold">Ticket code</p>
            <p className="mt-2 text-xs font-mono break-all text-zinc-600 dark:text-zinc-300">{params.ticket}</p>
          </div>
          <div className="rounded-3xl bg-zinc-100 dark:bg-zinc-800 p-5">
            <p className="text-sm font-bold">Result</p>
            <p className="mt-2 text-base font-semibold">{message}</p>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            If you are scanning this at the door, refresh to confirm if the ticket is no longer valid after the first scan.
          </p>
        </div>
      </div>
    </main>
  );
}
