import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../lib/toast';
import { ChevronRight } from 'lucide-react';
import { Section } from '../ui/FormKit';
import { RadioGroup, SaveButton, useDesignSettings } from '../../pages/vendor/store/design/designShared';
import { BanglaDigitsCheckbox } from '../../pages/vendor/store/design/StoreLanguageCard';
import { storeSettingsApi } from '../../lib/storeSettingsApi';
import { apiErrorMessage } from '../../lib/api';
import { useViewer } from '../../lib/useStaffAccess';
import { canAccess } from '../../lib/staffPermissions';

type ChatLanguage = 'bn' | 'en' | 'auto';

/**
 * Settings > Language: one place to choose the language of each thing the shopper sees or gets from the store. Each part
 * saves on its own and edits a setting that already lives elsewhere (Store > Design for the store's text, Store > Order
 * Tracking for the customer SMS), so the other pages keep showing the same choice.
 */
export function LanguageSettings() {
  const viewer = useViewer();
  const canDesign = canAccess(viewer, 'store.design');
  const canSms = canAccess(viewer, 'store.checkout');
  return (
    <div className="space-y-4">
      {canDesign && <StoreTextSection />}
      {canDesign && <AiChatSection />}
      {canSms && <CustomerSmsSection />}
    </div>
  );
}

/** Whether this person can change any part of the Language tab (the tab is hidden otherwise). */
export function canUseLanguageSettings(viewer: ReturnType<typeof useViewer>): boolean {
  return canAccess(viewer, 'store.design') || canAccess(viewer, 'store.checkout');
}

function StoreTextSection() {
  const { settings, save } = useDesignSettings();
  const [storeLanguage, setStoreLanguage] = useState<'en' | 'bn'>('en');
  const [banglaDigits, setBanglaDigits] = useState(false);
  useEffect(() => {
    if (!settings) return;
    setStoreLanguage(settings.storeLanguage ?? 'en');
    setBanglaDigits(settings.storeBanglaDigits ?? false);
  }, [settings]);
  if (!settings) return null;
  return (
    <Section title="Store buttons and prices" description="The words on your store's buttons and labels (Add to Cart, Buy Now, Cart, Search...).">
      <div className="space-y-4">
        <RadioGroup
          label="Language"
          value={storeLanguage}
          onChange={setStoreLanguage}
          options={[
            { value: 'en', label: 'English' },
            { value: 'bn', label: 'বাংলা (Bangla)' },
          ]}
        />
        {storeLanguage === 'bn' && <BanglaDigitsCheckbox checked={banglaDigits} onChange={setBanglaDigits} />}
        <p className="text-xs text-regantify-text-muted">Your product names and descriptions stay exactly as you wrote them.</p>
        <SaveButton pending={save.isPending} onClick={() => save.mutate({ storeLanguage, storeBanglaDigits: banglaDigits })} />
      </div>
    </Section>
  );
}

function AiChatSection() {
  const { settings, save } = useDesignSettings();
  const [lang, setLang] = useState<ChatLanguage>('bn');
  useEffect(() => {
    if (settings) setLang(settings.aiChatLanguage ?? 'bn');
  }, [settings]);
  if (!settings) return null;
  return (
    <Section title="AI chat replies" description="The language your store's AI assistant answers shoppers in.">
      <div className="space-y-4">
        <RadioGroup
          label="Reply in"
          value={lang}
          onChange={setLang}
          options={[
            { value: 'bn', label: 'বাংলা (Bangla)' },
            { value: 'en', label: 'English' },
            { value: 'auto', label: "The shopper's own language" },
          ]}
        />
        <p className="text-xs text-regantify-text-muted">
          {lang === 'auto'
            ? 'Bangla when the shopper writes in Bangla or Banglish, English when they write in English.'
            : 'A shopper can still ask for the other language and the assistant will switch.'}{' '}
          Voice calls are always in Bangla.
        </p>
        <SaveButton pending={save.isPending} onClick={() => save.mutate({ aiChatLanguage: lang })} />
      </div>
    </Section>
  );
}

const TRACKING_NOTIFY_KEY = ['tracking-notify-settings'] as const;

function CustomerSmsSection() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: TRACKING_NOTIFY_KEY, queryFn: storeSettingsApi.getTrackingNotify });
  const [lang, setLang] = useState<'en' | 'bn'>('en');
  useEffect(() => {
    if (data) setLang(data.language);
  }, [data]);
  const save = useMutation({
    mutationFn: () => storeSettingsApi.updateTrackingNotify({ language: lang }),
    onSuccess: (updated) => {
      queryClient.setQueryData(TRACKING_NOTIFY_KEY, updated);
      toast.success('Saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save. Please try again.')),
  });
  if (!data) return null;
  return (
    <Section
      title="Customer SMS"
      description="The order texts your customers get: confirmed, shipped, out for delivery, delivered and so on."
    >
      <div className="space-y-4">
        <RadioGroup
          label="Language"
          value={lang}
          onChange={setLang}
          options={[
            { value: 'en', label: 'English' },
            { value: 'bn', label: 'বাংলা (Bangla)' },
          ]}
        />
        <p className="text-xs text-regantify-text-muted">
          {lang === 'bn' ? 'A Bangla SMS holds 70 letters per credit instead of 160, so each text may cost more credits. ' : ''}
          Texts you wrote yourself stay as you wrote them.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <SaveButton pending={save.isPending} onClick={() => save.mutate()} />
          <Link to="/vendor/store/order-tracking" className="inline-flex items-center gap-0.5 text-sm font-medium text-regantify-cta hover:underline">
            Which texts are sent <ChevronRight size={15} />
          </Link>
        </div>
      </div>
    </Section>
  );
}
