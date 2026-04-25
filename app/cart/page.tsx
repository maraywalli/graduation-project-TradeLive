import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CartClient } from './CartClient';

export const dynamic = 'force-dynamic';

export default async function CartPage() {
  // Server-side auth gate prevents the brief "empty cart" flash before
  // the client-side redirect kicks in.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/cart');
  return <CartClient />;
}
