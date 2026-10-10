import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { ChatButtonChannel, ChatButtonPage } from '../../../../lib/designSettingsApi';
import { getVendorSocialLinks } from '../../../../lib/vendorApi';
import { toast } from '../../../../lib/toast';
import {
  DesignLoading,
  DesignPageHeader,
  DesignSection,
  RadioGroup,
  SaveButton,
  Switch,
  inputClass,
  useDesignSettings,
} from './designShared';

const PAGE_OPTIONS: { value: ChatButtonPage; label: string; hint: string }[] = [
  { value: 'HOME', label: 'Home and shop pages', hint: 'The home page, category and search lists.' },
  { value: 'PRODUCT', label: 'Product pages', hint: 'Each product page.' },
  { value: 'OTHER', label: 'Other pages', hint: 'Cart, order tracking, account, and your info pages.' },
];

/** Store > Design > Chat Button — the WhatsApp or Messenger bubble that floats over the StorePal storefront. */
export default function ChatButton() {
  const { settings, isLoading, save } = useDesignSettings();
  const social = useQuery({ queryKey: ['vendor-social-links'], queryFn: getVendorSocialLinks });
  const [enabled, setEnabled] = useState(true);
  const [channel, setChannel] = useState<ChatButtonChannel>('WHATSAPP');
  const [messengerLink, setMessengerLink] = useState('');
  const [side, setSide] = useState<'LEFT' | 'RIGHT'>('RIGHT');
  const [pages, setPages] = useState<ChatButtonPage[]>(['HOME', 'PRODUCT', 'OTHER']);
  const [productMessage, setProductMessage] = useState(true);

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings.chatButtonEnabled);
    setChannel(settings.chatButtonChannel);
    setMessengerLink(settings.chatButtonMessengerLink ?? '');
    setSide(settings.chatButtonSide);
    setPages(settings.chatButtonPages);
    setProductMessage(settings.chatButtonProductMessage);
  }, [settings]);

  const whatsappSet = !!social.data?.whatsappUrl?.trim();

  const togglePage = (page: ChatButtonPage) =>
    setPages((current) => (current.includes(page) ? current.filter((p) => p !== page) : [...current, page]));

  const onSave = () => {
    if (channel === 'MESSENGER' && !messengerLink.trim()) {
      toast.error('Add your Messenger page link, or choose WhatsApp.');
      return;
    }
    save.mutate({
      chatButtonEnabled: enabled,
      chatButtonChannel: channel,
      chatButtonMessengerLink: messengerLink.trim(),
      chatButtonSide: side,
      chatButtonPages: pages,
      chatButtonProductMessage: productMessage,
    });
  };

  return (
    <div className="max-w-4xl">
      <DesignPageHeader
        title="Chat Button"
        description="A WhatsApp or Messenger button that floats over your StorePal storefront, so shoppers can ask you a question in one tap."
      />
      {isLoading || !settings ? (
        <DesignLoading />
      ) : (
        <div className="space-y-8">
          <DesignSection title="Chat button">
            <div className="flex items-center gap-3">
              <Switch checked={enabled} onChange={setEnabled} label="Show the chat button" />
              <span className="text-sm text-regantify-text">Show the chat button on my store</span>
            </div>

            {enabled && (
              <>
                <RadioGroup
                  label="Chat on"
                  value={channel}
                  onChange={setChannel}
                  options={[
                    { value: 'WHATSAPP', label: 'WhatsApp' },
                    { value: 'MESSENGER', label: 'Messenger' },
                  ]}
                />

                {channel === 'WHATSAPP' ? (
                  <p className="text-xs text-regantify-text-muted -mt-3">
                    {whatsappSet ? (
                      <>
                        Opens the WhatsApp link you saved in{' '}
                        <Link to="/vendor/store/social" className="text-regantify-cta underline">
                          Store &gt; Social
                        </Link>
                        . Change the number there.
                      </>
                    ) : (
                      <>
                        You haven't added a WhatsApp link yet, so no button shows.{' '}
                        <Link to="/vendor/store/social" className="text-regantify-cta underline">
                          Add it in Store &gt; Social
                        </Link>{' '}
                        (for example https://wa.me/8801XXXXXXXXX).
                      </>
                    )}
                  </p>
                ) : (
                  <div>
                    <label className="text-sm font-medium text-regantify-text">Your Messenger page</label>
                    <input
                      value={messengerLink}
                      onChange={(e) => setMessengerLink(e.target.value)}
                      placeholder="https://m.me/yourpage or https://facebook.com/yourpage"
                      maxLength={200}
                      className={`${inputClass} mt-2`}
                    />
                    <p className="text-xs text-regantify-text-muted mt-1.5">
                      Paste your Facebook page link or just the page name. It's saved as an m.me link.
                    </p>
                  </div>
                )}

                <RadioGroup
                  label="Position"
                  value={side}
                  onChange={setSide}
                  options={[
                    { value: 'RIGHT', label: 'Bottom right' },
                    { value: 'LEFT', label: 'Bottom left' },
                  ]}
                  hint="The AI chat button, if you use it, sits just above this one on the right."
                />

                <div>
                  <p className="text-sm font-medium text-regantify-text mb-2">Show it on</p>
                  <div className="space-y-2.5">
                    {PAGE_OPTIONS.map((o) => (
                      <label key={o.value} className="flex items-start gap-2.5 text-sm text-regantify-text cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pages.includes(o.value)}
                          onChange={() => togglePage(o.value)}
                          className="accent-regantify-cta mt-0.5"
                        />
                        <span>
                          {o.label}
                          <span className="block text-xs text-regantify-text-muted">{o.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {channel === 'WHATSAPP' && (
                  <div className="flex items-start gap-3">
                    <Switch checked={productMessage} onChange={setProductMessage} label="Mention the product" />
                    <span className="text-sm text-regantify-text">
                      On a product page, start the chat with the product's name and link
                      <span className="block text-xs text-regantify-text-muted">
                        The shopper's message box opens with "I'd like to know about this product: name, link" already typed, so you
                        know which product they mean. They can edit it before sending. (Messenger can't do this.)
                      </span>
                    </span>
                  </div>
                )}
              </>
            )}

            <SaveButton pending={save.isPending} onClick={onSave} />
          </DesignSection>
        </div>
      )}
    </div>
  );
}
