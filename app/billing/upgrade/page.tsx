import { UpgradeClient } from './UpgradeClient';

export const dynamic = 'force-dynamic';

export default async function UpgradePage({ searchParams }: { searchParams: Promise<{ kind?: string; value?: string }> }) {
  const sp = await searchParams;
  const kind = sp.kind === 'role' ? 'role' : 'tier';
  const allowed = kind === 'role' ? ['seller', 'delivery'] : ['gold', 'premium'];
  const value = sp.value && allowed.includes(sp.value) ? sp.value : (kind === 'role' ? 'seller' : 'gold');
  return <UpgradeClient kind={kind} value={value} />;
}
