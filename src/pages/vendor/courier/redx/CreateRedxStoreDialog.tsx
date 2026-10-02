import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '../../../../components/ui/Dialog';
import { RedxAreaSelect } from '../../../../components/courier/RedxAreaSelect';
import { courierApi } from '../../../../lib/courierApi';
import { apiErrorMessage } from '../../../../lib/api';
import { toast } from '../../../../lib/toast';

const inputClass =
  'w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-regantify-text outline-none transition placeholder:text-neutral-400 focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500';

/**
 * "Add pickup store" — creates a pickup store on the vendor's RedX account
 * (RedX: POST /pickup/store). When no store was chosen yet, the new one
 * becomes the store every booking picks up from.
 */
export function CreateRedxStoreDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [areaId, setAreaId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setPhone('');
      setAddress('');
      setAreaId(null);
      setError(null);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => courierApi.createRedxStore({ name: name.trim(), phone: phone.trim(), address: address.trim(), areaId: areaId! }),
    onSuccess: ({ store, selected }) => {
      queryClient.invalidateQueries({ queryKey: ['redx-stores'] });
      queryClient.invalidateQueries({ queryKey: ['redx-overview'] });
      queryClient.invalidateQueries({ queryKey: ['courier-accounts'] });
      toast.success(selected ? `Pickup store "${store.name}" added and selected.` : `Pickup store "${store.name}" added.`);
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Couldn’t add the pickup store. Try again in a minute.')),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !mutation.isPending && onClose()} title="Add RedX pickup store" maxWidth="max-w-md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim().length < 3) return setError('Store name must be at least 3 characters.');
          if (!/^(?:\+?88)?01\d{9}$/.test(phone.trim())) return setError('Enter an 11-digit mobile number starting with 01.');
          if (address.trim().length < 10) return setError('Address must be at least 10 characters.');
          if (!areaId) return setError('Select the area the store is in.');
          setError(null);
          mutation.mutate();
        }}
        className="p-6 pt-4 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Store name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="e.g. Mirpur warehouse" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Contact phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={14} placeholder="01XXXXXXXXX" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Address</label>
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} rows={2} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Area</label>
          <RedxAreaSelect value={areaId} onChange={(area) => setAreaId(area?.id ?? null)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-4 text-sm text-regantify-text transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending ? 'Adding…' : 'Add store'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
