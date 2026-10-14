import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { HelpPanel, type HelpTab } from '../../../components/help/HelpPanel';

/** /vendor/help and /vendor/help/:slug (super-admin-new.md Step 11): the Help drawer's panel as a page, so support can send a link to an article. */
export default function HelpCenter() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const tabParam = params.get('tab');
  const tab: HelpTab = slug ? 'help' : tabParam === 'new' || tabParam === 'ideas' ? tabParam : 'help';

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-3 text-lg font-semibold text-regantify-text">Help center</h1>
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <HelpPanel
          wide
          tab={tab}
          onTab={(t) => (slug ? navigate(t === 'help' ? '/vendor/help' : `/vendor/help?tab=${t}`) : setParams(t === 'help' ? {} : { tab: t }))}
          slug={slug ?? null}
          onSlug={(s) => navigate(s ? `/vendor/help/${s}` : '/vendor/help')}
        />
      </div>
    </div>
  );
}
