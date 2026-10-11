import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../../lib/ordersApi';
import { productInputClass } from '../product/ProductFormPieces';
import { useCan } from '../../lib/useStaffAccess';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

const MAX_CUSTOM = 8;

/**
 * "Where did this order come from?" on Add Order (TellMe idea 121): Facebook, WhatsApp, Instagram, Phone call, Walk-in, Other, and up to 8 names of the store's
 * own. Optional. The owner can add a name of their own from the list ("+ Add my own…"). The channel is for the store's eyes only (Orders list filter, and
 * Analytics > Marketing).
 */
export function ChannelPicker({ value, onChange }: { value: string; onChange: (channel: string) => void }) {
  const queryClient = useQueryClient();
  const isOwner = useCan('owner');
  const { data } = useQuery({ queryKey: ['order-channels'], queryFn: ordersApi.channelCatalog, staleTime: 60_000 });
  const save = useMutation({
    mutationFn: (custom: string[]) => ordersApi.saveChannelCatalog(custom),
    onSuccess: (res, custom) => {
      queryClient.setQueryData(['order-channels'], res);
      const added = custom[custom.length - 1];
      if (added && res.custom.some((c) => c.toLowerCase() === added.toLowerCase())) onChange(res.custom.find((c) => c.toLowerCase() === added.toLowerCase()) as string);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the channel.')),
  });

  const addOwn = () => {
    const name = window.prompt('Name of your channel (up to 20 letters), like “TikTok” or “Shop visit”');
    if (!name || !name.trim() || !data) return;
    if (data.custom.length >= MAX_CUSTOM) {
      toast.error(`You can keep ${MAX_CUSTOM} channels of your own.`);
      return;
    }
    save.mutate([...data.custom, name.trim()]);
  };

  return (
    <select
      value={value}
      onChange={(e) => (e.target.value === '__add' ? addOwn() : onChange(e.target.value))}
      className={productInputClass}
      aria-label="Channel"
    >
      <option value="">Not set</option>
      {(data?.builtIn ?? []).map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
      {(data?.custom ?? []).map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
      {isOwner && (data?.custom.length ?? 0) < MAX_CUSTOM && <option value="__add">+ Add my own…</option>}
    </select>
  );
}
