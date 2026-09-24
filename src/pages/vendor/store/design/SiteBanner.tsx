import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { DESIGN_SETTINGS_KEY, designSettingsApi, type SiteBannerStyle } from '../../../../lib/designSettingsApi';
import { blankHtmlToEmpty } from '../../../../lib/storeSettingsApi';
import { apiErrorMessage } from '../../../../lib/api';
import { toast } from '../../../../lib/toast';
import { RichTextEditor } from '../../../../components/editor/RichTextEditor';
import { DesignLoading, DesignPageHeader, SaveButton, inputClass, useDesignSettings } from './designShared';

// StorePal's built-in banner text, shown while the content is empty
// (keep in sync with storefront's themes/storepal/components/StoreHeader.tsx).
const DEFAULT_TEXT = 'Cash On Delivery All Over Bangladesh · Guaranteed Pre-order Delivery in 20-25 Days';

/** Store > Design > Site Banner — the announcement strip above StorePal's header. */
export default function SiteBanner() {
  const queryClient = useQueryClient();
  const { settings, isLoading, save } = useDesignSettings();
  const [content, setContent] = useState('');
  const [style, setStyle] = useState<SiteBannerStyle>('MARQUEE');
  const [background, setBackground] = useState('');

  useEffect(() => {
    if (!settings) return;
    setContent(settings.bannerContent ?? '');
    setStyle(settings.bannerStyle);
    setBackground(settings.bannerBackgroundColor ?? '');
  }, [settings]);

  const remove = useMutation({
    mutationFn: designSettingsApi.deleteBanner,
    onSuccess: (updated) => {
      queryClient.setQueryData(DESIGN_SETTINGS_KEY, updated);
      toast.success('Site banner removed from your storefront.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete the banner. Please try again.')),
  });

  const handleDelete = () => {
    if (window.confirm('Remove the site banner from your storefront? Saving again brings it back.')) remove.mutate();
  };

  return (
    <div className="max-w-4xl">
      <DesignPageHeader title="Site Banner" description="The announcement strip shown above your StorePal storefront's header." />
      {isLoading || !settings ? (
        <DesignLoading />
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 p-5 space-y-5">
          {!settings.bannerEnabled && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
              The banner is deleted and hidden on your storefront. Save to show it again.
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Content</label>
            <RichTextEditor value={content} onChange={setContent} placeholder={DEFAULT_TEXT} />
            <p className="text-xs text-regantify-text-muted mt-1">Leave empty to show the default text above.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Style</label>
            <select value={style} onChange={(e) => setStyle(e.target.value as SiteBannerStyle)} className={inputClass}>
              <option value="MARQUEE">Marquee (scrolling)</option>
              <option value="STATIC">Static</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Background Color</label>
            <div className="flex items-center gap-2 max-w-xs">
              <input
                type="color"
                value={background || '#FFFFFF'}
                onChange={(e) => setBackground(e.target.value.toUpperCase())}
                className="w-10 h-10 rounded-full border border-black/10 cursor-pointer p-0.5 bg-white"
              />
              <input
                type="text"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                placeholder="Theme default"
                maxLength={7}
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SaveButton
              pending={save.isPending}
              onClick={() =>
                save.mutate({ bannerContent: blankHtmlToEmpty(content), bannerStyle: style, bannerBackgroundColor: background.trim() })
              }
            />
            {settings.bannerEnabled && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={remove.isPending}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-red-200 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                {remove.isPending && <Loader2 size={16} className="animate-spin" />}
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
