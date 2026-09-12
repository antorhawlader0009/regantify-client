import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus } from 'lucide-react';
import { campaignsApi, type CampaignListRow } from '../../../lib/campaignsApi';
import { toast } from '../../../lib/toast';

/** "N products" — matches the SCOPE column; blank when the campaign has no products yet. */
function scopeLabel(campaign: CampaignListRow): string {
  const count = campaign.items.length;
  return count > 0 ? `${count} product${count === 1 ? '' : 's'}` : '';
}

interface CampaignRowProps {
  campaign: CampaignListRow;
  selected: boolean;
  onToggleSelect: () => void;
}

function CampaignRow({ campaign, selected, onToggleSelect }: CampaignRowProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => campaignsApi.remove(campaign.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign deleted.');
    },
    onError: () => toast.error('Could not delete this campaign. Please try again.'),
  });

  const handleDelete = () => {
    if (window.confirm(`Delete the campaign "${campaign.name}"? This cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <tr className="border-b border-black/5 align-top">
      <td className="p-4">
        <input type="checkbox" checked={selected} onChange={onToggleSelect} />
      </td>
      <td className="p-4">
        <button
          onClick={() => navigate(`/vendor/marketing/campaigns/${campaign.id}/edit`)}
          className="text-sm font-medium text-regantify-cta hover:text-regantify-cta-dark"
        >
          {campaign.name}
        </button>
      </td>
      <td className="p-4 text-sm text-regantify-text-muted">{scopeLabel(campaign)}</td>
      <td className="p-4 text-right">
        <div className="inline-flex items-center gap-2">
          <button
            onClick={() => navigate(`/vendor/marketing/campaigns/${campaign.id}/edit`)}
            className="px-3.5 py-1.5 rounded-lg border border-black/10 text-sm text-regantify-cta hover:bg-regantify-content"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="px-3.5 py-1.5 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function Campaigns() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const perPage = 10;

  useEffect(() => setPage(1), [search]);
  useEffect(() => setSelected(new Set()), [search, page]);

  // Campaigns has no server-side pagination (a vendor's active campaign
  // count is typically small, unlike Products/Orders) — fetched whole
  // and paged client-side, same "fetch everything" convention as
  // Collections' own list.
  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', search],
    queryFn: () => campaignsApi.list(search.trim() || undefined),
  });

  const allCampaigns = data ?? [];
  const total = allCampaigns.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const campaigns = allCampaigns.slice((page - 1) * perPage, (page - 1) * perPage + perPage);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, page - 3),
    Math.max(0, page - 3) + 5,
  );

  const toggleSelectAll = () => {
    if (selected.size === campaigns.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(campaigns.map((c) => c.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Campaigns</h1>
        <button
          onClick={() => navigate('/vendor/marketing/campaigns/add')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
            text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add New
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="p-4 border-b border-black/5 flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaigns"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 text-sm
                text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-regantify-text-muted uppercase tracking-wide border-b border-black/5">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={campaigns.length > 0 && selected.size === campaigns.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-4">Name</th>
                <th className="p-4">Scope</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-sm text-regantify-text-muted">
                    Loading…
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-sm text-regantify-text-muted">
                    No campaigns yet.
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <CampaignRow
                    key={campaign.id}
                    campaign={campaign}
                    selected={selected.has(campaign.id)}
                    onToggleSelect={() => toggleSelectOne(campaign.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-black/5">
          <span className="text-xs text-regantify-text-muted">Total: {total}</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                «
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                ‹
              </button>
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    n === page ? 'bg-regantify-black text-white' : 'text-regantify-text hover:bg-regantify-content'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                ›
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                »
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
