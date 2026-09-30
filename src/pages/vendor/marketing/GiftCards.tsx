import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus } from 'lucide-react';
import { giftCardsApi, giftCardStatus, type GiftCard } from '../../../lib/giftCardsApi';

const money = (value: string | number) => `৳${Number(value).toLocaleString()}`;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function GiftCardRow({ card }: { card: GiftCard }) {
  const navigate = useNavigate();
  const status = giftCardStatus(card);
  const recipient = [card.recipientName, card.recipientPhone].filter(Boolean).join(' · ');

  return (
    <tr className="border-b border-black/5 align-top">
      <td className="p-4">
        <button
          onClick={() => navigate(`/vendor/marketing/gift-cards/${card.id}`)}
          className="text-sm font-mono font-medium text-regantify-cta hover:text-regantify-cta-dark text-left"
        >
          {card.code}
        </button>
      </td>
      <td className="p-4">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>{status.label}</span>
      </td>
      <td className="p-4 text-sm text-regantify-text">{money(card.balance)}</td>
      <td className="p-4 text-sm text-regantify-text-muted">{money(card.initialAmount)}</td>
      <td className="p-4 text-sm text-regantify-text-muted">{recipient || '—'}</td>
      <td className="p-4 text-sm text-regantify-text-muted whitespace-nowrap">
        {card.expiresAt ? formatDate(card.expiresAt) : 'Never'}
      </td>
      <td className="p-4 text-sm text-regantify-text-muted whitespace-nowrap">{formatDate(card.createdAt)}</td>
    </tr>
  );
}

/**
 * Marketing > Gift Cards — prepaid store credit the vendor issues (see the
 * GiftCard model's schema comment). A shopper can redeem a code at a StorePal
 * checkout; the vendor can still record usage by hand on each card's page.
 */
export default function GiftCards() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => setPage(1), [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['gift-cards', { search, page }],
    queryFn: () => giftCardsApi.list({ search: search.trim() || undefined, page, perPage }),
  });

  const giftCards = data?.giftCards ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, page - 3),
    Math.max(0, page - 3) + 5,
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-semibold text-regantify-text">Gift Cards</h1>
        <button
          onClick={() => navigate('/vendor/marketing/gift-cards/add')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
            text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add New
        </button>
      </div>
      <p className="text-sm text-regantify-text-muted mb-6">
        Issue prepaid store credit with a code you can sell or hand out. For now, record each use on the gift
        card’s page; customers can’t enter the code at checkout yet.
      </p>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="p-4 border-b border-black/5 flex flex-wrap items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code, name or phone"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 text-sm
                text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-regantify-text-muted uppercase tracking-wide border-b border-black/5">
                <th className="p-4">Code</th>
                <th className="p-4">Status</th>
                <th className="p-4">Balance</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Recipient</th>
                <th className="p-4">Expires</th>
                <th className="p-4">Issued</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-regantify-text-muted">
                    Loading…
                  </td>
                </tr>
              ) : giftCards.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-regantify-text-muted">
                    No gift cards yet.
                  </td>
                </tr>
              ) : (
                giftCards.map((card) => <GiftCardRow key={card.id} card={card} />)
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-black/5">
          <span className="text-xs text-regantify-text-muted">Total: {total}</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
