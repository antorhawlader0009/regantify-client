import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { updateVendorSocialLinks } from '../../lib/vendorApi';
import { dashboardApi } from '../../lib/dashboardApi';
import { useAuthStore } from '../../store/authStore';
import { storefrontStoreUrl } from '../../lib/storefrontUrl';
import { toast } from '../../lib/toast';
import { SetupChecklist, setupRequiredDone } from './SetupChecklist';

// Once per page load (the owner's rule, 2026-10-28): a module flag, so moving between dashboard pages never reopens it,
// and a reload or a fresh visit shows it again.
let shownThisLoad = false;

/**
 * "Set up your store" as a dialog: opened by itself once on every page load of the vendor dashboard until the required
 * steps are done (the optional delivery-charge step never keeps it coming). Store owner only, never in "Login as store".
 * Closing it, or following a step, closes it for this load. Mounted once in VendorLayout.
 */
export function SetupDialog() {
  const user = useAuthStore((s) => s.user);
  const impersonated = useAuthStore((s) => s.impersonated);
  const isOwner = user?.role === 'VENDOR' && !impersonated;
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const decided = useRef(false);

  // Same query as the Dashboard, so the summary is fetched once and shared.
  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.summary, enabled: isOwner });
  const setup = dashboard.data?.setup;

  useEffect(() => {
    if (decided.current || shownThisLoad || !isOwner || !setup) return;
    decided.current = true;
    if (setupRequiredDone(setup)) return;
    shownThisLoad = true;
    setOpen(true);
  }, [isOwner, setup]);

  // Following a step (it goes to another page) closes the dialog.
  const firstPath = useRef(pathname);
  useEffect(() => {
    if (open && pathname !== firstPath.current) setOpen(false);
  }, [pathname, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open || !setup || !user) return null;

  const storeUrl = user.vendor?.subdomain ? storefrontStoreUrl(user.vendor.subdomain) : null;
  // The owner's own mobile in 01XXXXXXXXX form, offered for the WhatsApp step (saved only on their tap).
  const ownerDigits = (user.phone ?? '').replace(/\D/g, '').replace(/^88(?=01)/, '');
  const whatsappPhone = /^01[3-9]\d{8}$/.test(ownerDigits) ? ownerDigits : null;
  const useWhatsApp = async () => {
    if (!whatsappPhone) return;
    try {
      await updateVendorSocialLinks({ whatsappUrl: `https://wa.me/88${whatsappPhone}` });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-social-links'] });
      toast.success('WhatsApp chat button is on. Shoppers can now message you from your store.');
    } catch {
      toast.error('Could not save your WhatsApp number. Please try again in Store > Social.');
    }
  };
  const copyStoreLink = async () => {
    if (!storeUrl) return;
    try {
      await navigator.clipboard.writeText(storeUrl);
      toast.success('Store link copied. Share it on Facebook, Instagram or WhatsApp.');
    } catch {
      toast.error('Could not copy. Your store link is ' + storeUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6" onMouseDown={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-title"
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <SetupChecklist
          setup={setup}
          storeKey={user.vendor?.subdomain ?? user.id}
          storeUrl={storeUrl}
          onShareStore={copyStoreLink}
          onClose={() => setOpen(false)}
          whatsappPhone={whatsappPhone}
          onUseWhatsApp={useWhatsApp}
        />
      </div>
    </div>
  );
}
