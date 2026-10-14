import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as RadixDialog from '@radix-ui/react-dialog';
import { CircleHelp, X } from 'lucide-react';
import { helpApi } from '../../lib/helpApi';
import { HelpPanel, type HelpTab } from './HelpPanel';

/**
 * The top bar's Help button (super-admin-new.md Step 11): a side drawer with Help (the article for this page first), What's new and Ideas. A red dot means
 * What's new has entries this person has not seen; the drawer then opens on that tab.
 */
export function HelpButton() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<HelpTab>('help');
  const [slug, setSlug] = useState<string | null>(null);
  const { data } = useQuery({ queryKey: ['help-changelog'], queryFn: helpApi.changelog, staleTime: 5 * 60_000, refetchInterval: 30 * 60_000 });
  const unread = data?.unread ?? 0;

  const openDrawer = () => {
    setTab(unread > 0 ? 'new' : 'help');
    setSlug(null);
    setOpen(true);
  };

  return (
    <RadixDialog.Root open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={openDrawer}
        aria-label={unread > 0 ? `Help and what's new (${unread} new)` : 'Help'}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-white text-neutral-700 transition hover:border-neutral-300 hover:shadow-sm active:scale-95"
      >
        <CircleHelp size={17} />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />}
      </button>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/30" />
        <RadixDialog.Content className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-line bg-white shadow-xl focus:outline-none" aria-describedby={undefined}>
          <div className="flex items-center justify-between px-4 pt-4">
            <RadixDialog.Title className="text-[15px] font-semibold text-regantify-text">Help</RadixDialog.Title>
            <RadixDialog.Close className="flex h-8 w-8 items-center justify-center rounded-lg text-regantify-text-muted hover:bg-regantify-search" aria-label="Close">
              <X size={16} />
            </RadixDialog.Close>
          </div>
          <div className="min-h-0 flex-1">
            <HelpPanel tab={tab} onTab={setTab} pathname={pathname} slug={slug} onSlug={setSlug} />
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
