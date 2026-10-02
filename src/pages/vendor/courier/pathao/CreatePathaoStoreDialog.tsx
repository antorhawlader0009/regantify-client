import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '../../../../components/ui/Dialog';
import { courierApi } from '../../../../lib/courierApi';
import { apiErrorMessage } from '../../../../lib/api';
import { toast } from '../../../../lib/toast';
import { PathaoLocationSelects, type PathaoLocationValue } from '../../../../components/courier/PathaoLocationSelects';

const inputClass =
  'w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-regantify-text outline-none transition placeholder:text-neutral-400 focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500';

const BD_PHONE = /^01\d{9}$/;

interface CreatePathaoStoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Creates a new pickup store on the vendor's Pathao account, without
 * leaving the dashboard. Client-side checks mirror CreatePathaoStoreDto
 * (Pathao's own length/phone rules) so most mistakes never reach the
 * server. Pathao reviews new stores (~1 hour) before they turn active.
 */
export function CreatePathaoStoreDialog({ open, onOpenChange }: CreatePathaoStoreDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [secondaryContact, setSecondaryContact] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<PathaoLocationValue>({ cityId: null, zoneId: null, areaId: null });
  const { cityId, zoneId, areaId } = location;
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName('');
    setContactName('');
    setContactNumber('');
    setSecondaryContact('');
    setAddress('');
    setLocation({ cityId: null, zoneId: null, areaId: null });
    setError(null);
  }

  const mutation = useMutation({
    mutationFn: () =>
      courierApi.createPathaoStore({
        name: name.trim(),
        contactName: contactName.trim(),
        contactNumber: contactNumber.trim(),
        ...(secondaryContact.trim() ? { secondaryContact: secondaryContact.trim() } : {}),
        address: address.trim(),
        cityId: cityId!,
        zoneId: zoneId!,
        areaId: areaId!,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pathao-store-list'] });
      toast.success(`${result.message} It will appear in your store list once Pathao approves it.`);
      reset();
      onOpenChange(false);
    },
    onError: (err) => setError(apiErrorMessage(err, 'Couldn’t create the store. Try again in a minute.')),
  });

  function validate(): string | null {
    if (name.trim().length < 3 || name.trim().length > 50) return 'Store name must be 3-50 characters.';
    if (contactName.trim().length < 3 || contactName.trim().length > 50) return 'Contact name must be 3-50 characters.';
    if (!BD_PHONE.test(contactNumber.trim())) return 'Contact number must be an 11-digit number starting with 01.';
    if (secondaryContact.trim() && !BD_PHONE.test(secondaryContact.trim())) {
      return 'Secondary number must be an 11-digit number starting with 01.';
    }
    if (address.trim().length < 15 || address.trim().length > 120) return 'Address must be 15-120 characters.';
    if (!cityId || !zoneId || !areaId) return 'Select the store’s city, zone and area.';
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title="Create Pathao pickup store"
      maxWidth="max-w-lg"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const problem = validate();
          if (problem) {
            setError(problem);
            return;
          }
          setError(null);
          mutation.mutate();
        }}
        className="p-6 pt-4 space-y-4"
      >
        <p className="text-sm text-neutral-500">
          Pathao picks up parcels from this address. New stores need Pathao’s approval (usually about an hour).
        </p>

        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Store name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} placeholder="e.g. Main Warehouse" className={inputClass} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Contact person</label>
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} maxLength={50} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Contact number</label>
            <input
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, ''))}
              maxLength={11}
              inputMode="numeric"
              placeholder="01XXXXXXXXX"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Secondary number (optional)</label>
          <input
            value={secondaryContact}
            onChange={(e) => setSecondaryContact(e.target.value.replace(/\D/g, ''))}
            maxLength={11}
            inputMode="numeric"
            placeholder="01XXXXXXXXX"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Pickup address</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={120}
            rows={2}
            placeholder="House, road, area — at least 15 characters"
            className={inputClass}
          />
          <p className="text-xs text-neutral-500 mt-1">{address.trim().length}/120</p>
        </div>

        <PathaoLocationSelects value={location} onChange={setLocation} selectClassName={inputClass} />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-4 text-sm text-regantify-text transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending ? 'Creating…' : 'Create store'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
