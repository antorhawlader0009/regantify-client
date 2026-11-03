import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, PageSection, PillTabs } from '../../../components/ui/PageKit';
import { PageLoading } from '../../../components/PageLoading';

const ResellerFind = lazy(() => import('../product/ResellerFind'));
const ResellerSupply = lazy(() => import('../product/ResellerSupply'));
const ResellerMoney = lazy(() => import('./ResellerMoney'));

type View = 'sell' | 'supply' | 'money';

/**
 * Marketing > Reseller (2026-11-03, the owner's rule): the one place for the reseller system, open to every store.
 * - Sell others' products: find a supplier, call it, ask (it must approve), add its products; the supplier ships.
 * - Let others sell mine: offer products, approve the stores that ask.
 * - Money record: what is owed and paid. Money is settled directly between the two stores; Regantify holds none of it.
 * `?view=` picks the part; each part keeps its own `?tab=`.
 */
export default function Reseller() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('view');
  const view: View = raw === 'supply' || raw === 'money' ? raw : 'sell';

  return (
    <div className="space-y-3">
      <PageSection>
        <PageHeader
          title="Reseller"
          description="Sell other stores' products in your store, or let other stores sell yours. A store can use another store's products only after that store approves it. The two stores settle money directly; Regantify does not hold or take any of it."
        />
        <PillTabs
          tabs={[
            { id: 'sell', label: "Sell others' products" },
            { id: 'supply', label: 'Let others sell mine' },
            { id: 'money', label: 'Money record' },
          ]}
          value={view}
          onChange={(v) => setParams(v === 'sell' ? {} : { view: v }, { replace: true })}
        />
      </PageSection>
      <Suspense fallback={<PageLoading />}>
        {view === 'supply' ? <ResellerSupply /> : view === 'money' ? <ResellerMoney /> : <ResellerFind />}
      </Suspense>
    </div>
  );
}
