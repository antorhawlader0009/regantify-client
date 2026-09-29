import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MessageCircle, MessageSquareText } from 'lucide-react';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { lmsApi, type LmsLeadDetail, type LmsMe, type LmsTemplate, type LmsTemplateChannel } from '../../lib/lmsApi';
import { fillTemplate, leadTemplateVars, whatsappLink } from './format';
import { LmsButton, LmsDialog, LmsTextarea } from './ui';

export const LMS_TEMPLATES_KEY = ['lms', 'templates'] as const;

const CHANNEL_WORDS: Record<LmsTemplateChannel, { title: string; send: string; done: string }> = {
  WHATSAPP: { title: 'WhatsApp message', send: 'Open WhatsApp', done: 'WhatsApp opened' },
  SMS: { title: 'SMS', send: 'Send SMS', done: 'SMS sent' },
};

/**
 * The lead's WhatsApp and SMS keys. Each opens a composer: pick a template,
 * the lead's details are filled in, edit if needed, then send. WhatsApp
 * opens the chat with the text ready (free; the agent taps send there);
 * SMS goes out now and spends the store's SMS credits. Both are logged.
 */
export function MessageButtons({
  lead,
  me,
  onSent,
  size = 'md',
}: {
  lead: LmsLeadDetail;
  me: LmsMe;
  onSent: (lead: LmsLeadDetail) => void;
  size?: 'md' | 'lg';
}) {
  const [channel, setChannel] = useState<LmsTemplateChannel | null>(null);
  const button = size === 'lg' ? '!h-11 px-4' : '!h-10 px-4';
  return (
    <>
      <LmsButton className={button} onClick={() => setChannel('WHATSAPP')}>
        <MessageCircle size={16} /> WhatsApp
      </LmsButton>
      <LmsButton className={button} onClick={() => setChannel('SMS')}>
        <MessageSquareText size={16} /> SMS
      </LmsButton>
      {channel && <Composer key={channel} channel={channel} lead={lead} me={me} onClose={() => setChannel(null)} onSent={onSent} />}
    </>
  );
}

function Composer({
  channel,
  lead,
  me,
  onClose,
  onSent,
}: {
  channel: LmsTemplateChannel;
  lead: LmsLeadDetail;
  me: LmsMe;
  onClose: () => void;
  onSent: (lead: LmsLeadDetail) => void;
}) {
  const templates = useQuery({ queryKey: LMS_TEMPLATES_KEY, queryFn: lmsApi.templates, staleTime: 60_000 });
  const mine = (templates.data ?? []).filter((t) => t.channel === channel);
  const [picked, setPicked] = useState<LmsTemplate | null>(null);
  const [text, setText] = useState('');
  const words = CHANNEL_WORDS[channel];

  const pick = (t: LmsTemplate) => {
    setPicked(t);
    setText(fillTemplate(t.body, leadTemplateVars(lead, me)));
  };

  const send = useMutation({
    mutationFn: () => lmsApi.sendMessage(lead.id, { channel, text: text.trim(), templateName: picked?.name }),
    onSuccess: ({ lead: fresh }) => {
      toast.success(words.done);
      onSent(fresh);
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, `The ${channel === 'SMS' ? 'SMS' : 'message'} wasn't sent. Try again.`)),
  });

  const submit = () => {
    if (!text.trim()) return;
    // Open WhatsApp inside the click itself, or the browser blocks the new tab.
    if (channel === 'WHATSAPP') window.open(whatsappLink(lead.phone, text.trim()), '_blank', 'noopener');
    send.mutate();
  };

  // SMS in Bangla letters costs more credits per message: say how many this one takes.
  const smsParts = channel === 'SMS' ? smsCount(text) : 0;

  return (
    <LmsDialog open onOpenChange={(open) => !open && onClose()} title={words.title} width="max-w-xl">
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-[13px] font-medium">Start from a template</p>
          {templates.isPending ? (
            <p className="text-sm text-lms-muted">Loading…</p>
          ) : mine.length === 0 ? (
            <p className="text-sm text-lms-muted">No {channel === 'SMS' ? 'SMS' : 'WhatsApp'} templates yet. Write the message below.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {mine.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pick(t)}
                  aria-pressed={picked?.id === t.id}
                  className={`h-9 rounded-md border px-3 text-sm ${
                    picked?.id === t.id ? 'border-lms-ink bg-lms-ink text-white' : 'border-lms-line bg-lms-surface hover:bg-lms-page'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <label className="block">
          <span className="mb-1 block text-[13px] font-medium">Message to {lead.name}</span>
          <LmsTextarea rows={5} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Write the message" />
          {channel === 'SMS' && text.trim() && (
            <span className="mt-1 block text-xs text-lms-muted tabular-nums">
              {text.length} characters, uses {smsParts} SMS credit{smsParts === 1 ? '' : 's'}
            </span>
          )}
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <LmsButton variant="primary" disabled={!text.trim() || send.isPending} onClick={submit}>
            {send.isPending ? 'Sending…' : words.send}
          </LmsButton>
          <LmsButton variant="quiet" onClick={onClose}>
            Cancel
          </LmsButton>
        </div>
      </div>
    </LmsDialog>
  );
}

/** The same count the server charges (SmsService.estimateSmsCount): 160 / 153 per part in plain letters, 70 / 67 with Bangla. */
function smsCount(text: string): number {
  // eslint-disable-next-line no-control-regex
  const gsm7 = /^[\x00-\x7F£¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./0-9:;<=>?¡A-Z¿a-zÄÖÑÜ§äöñüà]*$/.test(text);
  const [single, multi] = gsm7 ? [160, 153] : [70, 67];
  return text.length <= single ? 1 : Math.ceil(text.length / multi);
}
