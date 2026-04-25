'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { createClient } from '@/lib/supabase/browser';
import { toast } from '@/components/ui/Toaster';

function chatId(a: string, b: string) {
  return [a, b].sort().join(':');
}

export function MessagesClient({ me, partners, initialPartnerId }: { me: any; partners: any[]; initialPartnerId: string | null }) {
  const { t, locale } = useI18n();
  const [partnerId, setPartnerId] = useState<string | null>(initialPartnerId);
  const [partnerList, setPartnerList] = useState(partners);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const supabase = createClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const partner = partnerList.find((p) => p.id === partnerId);

  useEffect(() => {
    if (!partnerId) return;
    const cid = chatId(me.id, partnerId);
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', cid)
        .order('created_at', { ascending: true });
      if (active) setMessages(data || []);
    })();
    const ch = supabase
      .channel(`msgs:${cid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${cid}` }, (payload) => {
        setMessages((m) => [...m, payload.new]);
      })
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId, me.id]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerId || !text.trim()) return;
    const cid = chatId(me.id, partnerId);
    const t0 = text.trim();
    setText('');
    const { error } = await supabase.from('messages').insert({
      chat_id: cid, sender_id: me.id, recipient_id: partnerId, text: t0,
    });
    if (error) toast(error.message, 'error');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 grid md:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-7rem)]">
      <aside className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 font-black">{t.nav.messages}</div>
        {partnerList.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center font-bold p-6">{locale === 'ku' ? 'هیچ گفتوگۆیەک نییە' : 'No conversations yet'}</p>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {partnerList.map((p) => (
              <button key={p.id} onClick={() => setPartnerId(p.id)} className={`w-full text-start px-4 py-3 flex items-center gap-3 ${partnerId === p.id ? 'bg-orange-50 dark:bg-orange-950/30' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-black shrink-0">{p.username?.[0]?.toUpperCase()}</div>
                <div className="font-black text-sm truncate">@{p.username}</div>
              </button>
            ))}
          </div>
        )}
      </aside>
      <main className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col">
        {!partner ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-2">
            <MessageCircle className="w-12 h-12" />
            <p className="font-bold">{locale === 'ku' ? 'گفتوگۆیەک هەڵبژێرە' : 'Pick a conversation'}</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 font-black flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-sm font-black">{partner.username?.[0]?.toUpperCase()}</div>
              @{partner.username}
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {messages.length === 0 && <p className="text-xs text-zinc-400 text-center font-bold my-auto">{locale === 'ku' ? 'یەکەم نامە بنێرە' : 'Send the first message'}</p>}
              {messages.map((m) => {
                const mine = m.sender_id === me.id;
                return (
                  <div key={m.id} className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm font-medium ${mine ? 'self-end bg-orange-500 text-white' : 'self-start bg-zinc-100 dark:bg-zinc-800'}`}>
                    {m.text}
                  </div>
                );
              })}
            </div>
            <form onSubmit={send} className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder={locale === 'ku' ? 'نامەیەک بنێرە...' : 'Send a message...'} className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500" />
              <button type="submit" className="px-3 py-2 rounded-lg bg-orange-500 text-white"><Send className="w-4 h-4" /></button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
