import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus } from 'lucide-react';
import { staffApi, type StaffMember } from '../../../lib/staffApi';
import { useAuthStore } from '../../../store/authStore';
import { toast } from '../../../lib/toast';

function formatLastLogin(iso: string | null, ip: string | null) {
  if (!iso) return null;
  const date = new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return { date, ip };
}

const PER_PAGE = 10;

/**
 * Staff — see StaffMember model's schema comment for the overall shape.
 * The owner's own account always shows first as a non-deletable "Owner"
 * row (see StaffService.findAllForVendor); everyone else is a real
 * StaffMember. "+ Add New" and "Delete" are owner-only — hidden here
 * for a logged-in staff member viewing their own team, matching what
 * the backend would 403 on anyway (see StaffController.requireOwner).
 */
export default function Staff() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isOwner = currentUser?.role === 'VENDOR';

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [search]);

  const { data: allMembers = [], isLoading } = useQuery({
    queryKey: ['staff', search],
    queryFn: () => staffApi.list(search.trim() || undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => staffApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member removed.');
    },
    onError: () => toast.error('Could not remove this staff member. Please try again.'),
  });

  const handleDelete = (member: StaffMember) => {
    if (window.confirm(`Remove ${member.name} from your team? They will no longer be able to log in.`)) {
      deleteMutation.mutate(member.id);
    }
  };

  const total = allMembers.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const members = allMembers.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, page - 3),
    Math.max(0, page - 3) + 5,
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Staff</h1>
        {isOwner && (
          <button
            onClick={() => navigate('/vendor/staff/add')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
              text-white text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Add New
          </button>
        )}
      </div>

      <div className="relative w-64 mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search staff members"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 bg-white text-sm
            text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
        />
      </div>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-regantify-text-muted uppercase tracking-wide bg-regantify-content border-b border-black/5">
                <th className="p-4">Name</th>
                <th className="p-4">Role</th>
                <th className="p-4">Email</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Last Login</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-regantify-text-muted">
                    Loading…
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-regantify-text-muted">
                    No staff members found.
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const lastLogin = formatLastLogin(member.lastLoginAt, member.lastLoginIp);
                  return (
                    <tr key={member.id} className="border-b border-black/5 last:border-b-0 align-top">
                      <td className="p-4">
                        <span className="text-sm font-medium text-regantify-cta">
                          {member.name}
                          {currentUser && member.email === currentUser.email && member.phone === currentUser.phone && (
                            <span className="text-regantify-text-muted font-normal"> (me)</span>
                          )}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-regantify-text">{member.role}</span>
                          {member.isOwner && (
                            <span className="inline-flex items-center text-[11px] font-medium text-white bg-regantify-black px-2 py-0.5 rounded-full">
                              Owner
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-regantify-cta">{member.email ?? '—'}</td>
                      <td className="p-4 text-sm text-regantify-text-muted whitespace-nowrap">{member.phone ?? '—'}</td>
                      <td className="p-4 text-sm text-regantify-text-muted whitespace-nowrap">
                        {lastLogin ? (
                          <>
                            <p>At: {lastLogin.date}</p>
                            {lastLogin.ip && <p>IP: {lastLogin.ip}</p>}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-4">
                        {isOwner && !member.isOwner && (
                          <button
                            onClick={() => handleDelete(member)}
                            disabled={deleteMutation.isPending}
                            className="text-sm text-red-600 hover:underline disabled:opacity-50"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
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
