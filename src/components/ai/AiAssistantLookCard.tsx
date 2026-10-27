import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { useDesignSettings, SaveButton } from '../../pages/vendor/store/design/designShared';
import { useViewer } from '../../lib/useStaffAccess';
import { canAccess } from '../../lib/staffPermissions';
import { mediaApi } from '../../lib/mediaApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { BANGLA_ONLY_MESSAGE, hasEnglishLetters } from '../../lib/banglaOnly';

/** Same limits as the server (store-settings/ai-assistant-look.ts). */
const NAME_MAX = 30;
const GREETING_MAX = 300;
const STARTER_MAX = 60;
const VOICE_MAX = 200;

/** The built-in texts, shown as placeholders so the owner sees what an empty box means. */
const DEFAULT_NAME = 'এআই শপিং সহকারী';
const DEFAULT_GREETING = 'হ্যালো! আমি আপনার শপিং অ্যাসিস্ট্যান্ট। যেকোনো পণ্যের সাইজ, দাম বা স্টক সম্পর্কে জিজ্ঞেস করুন। কিছু কিনতে চাইলে বলুন, এখানেই অর্ডার নিয়ে নেব।';
const DEFAULT_STARTERS = ['নতুন কী এসেছে?', 'ডেলিভারি চার্জ কত?', 'আমার অর্ডার কোথায়?', 'কোনো অফার আছে?'];
const DEFAULT_VOICE = 'আসসালামু আলাইকুম! আমি [দোকানের নাম]-এর এআই সহকারী। বলুন, কীভাবে সাহায্য করতে পারি?';

const SPEEDS = [
  { value: 'SLOW', label: 'Slow' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'FAST', label: 'Fast' },
] as const;

const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-regantify-text outline-none placeholder:text-neutral-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

/**
 * AI Usages > "Your AI assistant": the store's own assistant on its website. Its name and picture in the chat header, the
 * chat's first message, the four ready questions, what the voice call says first and how fast it speaks, and which corner
 * the chat button sits in. The texts are Bangla only (English letters are removed as they are typed, and the server
 * refuses them too), because the assistant talks and speaks in Bangla. An empty box keeps the built-in text.
 */
export function AiAssistantLookCard({ className }: { className: string }) {
  const viewer = useViewer();
  const { settings, save } = useDesignSettings();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [greeting, setGreeting] = useState('');
  const [starters, setStarters] = useState<string[]>(['', '', '', '']);
  const [voice, setVoice] = useState('');
  const [speed, setSpeed] = useState<'SLOW' | 'NORMAL' | 'FAST'>('NORMAL');
  const [side, setSide] = useState<'RIGHT' | 'LEFT'>('RIGHT');
  const [uploading, setUploading] = useState(false);
  // Which box last had English letters taken out, so its note shows under it.
  const [englishIn, setEnglishIn] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!settings) return;
    setName(settings.aiAssistantName ?? '');
    setAvatar(settings.aiAssistantAvatarUrl ?? null);
    setGreeting(settings.aiChatGreeting ?? '');
    const s = settings.aiChatStarters ?? [];
    setStarters([0, 1, 2, 3].map((i) => s[i] ?? ''));
    setVoice(settings.aiVoiceGreeting ?? '');
    setSpeed(settings.aiVoiceSpeed ?? 'NORMAL');
    setSide(settings.aiChatSide ?? 'RIGHT');
  }, [settings]);
  if (!canAccess(viewer, 'store.design') || !settings) return null;

  /** Bangla only: English letters are taken out as they are typed or pasted. */
  const bangla = (key: string, value: string, max: number) => {
    if (hasEnglishLetters(value)) {
      setEnglishIn(key);
      value = value.replace(/[A-Za-z]/g, '');
    } else if (englishIn === key) {
      setEnglishIn(null);
    }
    return value.slice(0, max);
  };
  const note = (key: string) => (englishIn === key ? <p className="mt-1 text-xs text-red-600">{BANGLA_ONLY_MESSAGE}</p> : null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(jpe?g|png|webp)$/.test(file.type)) {
      toast.error('Choose a JPG, PNG or WebP picture.');
      return;
    }
    setUploading(true);
    try {
      setAvatar((await mediaApi.upload(file)).url);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not upload the picture.'));
    } finally {
      setUploading(false);
    }
  };

  const onSave = () =>
    save.mutate({
      aiAssistantName: name.trim(),
      aiAssistantAvatarUrl: avatar ?? '',
      aiChatGreeting: greeting.trim(),
      aiChatStarters: starters.map((s) => s.trim()).filter(Boolean),
      aiVoiceGreeting: voice.trim(),
      aiVoiceSpeed: speed,
      aiChatSide: side,
    });

  return (
    <section className={className}>
      <h2 className="text-[15px] font-semibold text-regantify-text">Your AI assistant</h2>
      <p className="mt-0.5 text-[13px] text-neutral-500">
        Make the assistant on your website your own. Write everything in Bangla: the assistant talks and speaks in Bangla, so English letters can&apos;t be
        typed here. Leave a box empty to keep the built-in text.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-lg font-bold text-neutral-500">
          {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : 'অ'}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 size={16} className="animate-spin text-white" />
            </span>
          )}
        </span>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-regantify-text hover:border-indigo-300">
            <ImagePlus size={14} aria-hidden />
            {avatar ? 'Change picture' : 'Add a picture'}
          </button>
          {avatar && (
            <button type="button" onClick={() => setAvatar(null)} className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-sm text-neutral-600 hover:border-red-300 hover:text-red-600">
              <X size={14} aria-hidden />
              Remove
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      <p className="mt-1.5 text-xs text-neutral-500">Shown round in the chat header. Without a picture, your store name&apos;s first letter shows.</p>

      <label className="mt-4 block text-sm font-medium text-regantify-text">Assistant name</label>
      <input value={name} onChange={(e) => setName(bangla('name', e.target.value, NAME_MAX))} placeholder={DEFAULT_NAME} className={`mt-1.5 ${inputClass}`} />
      {note('name')}

      <label className="mt-4 block text-sm font-medium text-regantify-text">First message in the chat</label>
      <textarea
        value={greeting}
        onChange={(e) => setGreeting(bangla('greeting', e.target.value, GREETING_MAX))}
        rows={3}
        placeholder={DEFAULT_GREETING}
        className={`mt-1.5 resize-y leading-relaxed ${inputClass}`}
      />
      {note('greeting')}

      <label className="mt-4 block text-sm font-medium text-regantify-text">Ready questions (up to 4)</label>
      <p className="mt-0.5 text-xs text-neutral-500">Shown as buttons in a new chat; a tap sends the question.</p>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
        {starters.map((value, i) => (
          <div key={i}>
            <input
              value={value}
              onChange={(e) => {
                const next = [...starters];
                next[i] = bangla(`starter-${i}`, e.target.value, STARTER_MAX);
                setStarters(next);
              }}
              placeholder={DEFAULT_STARTERS[i]}
              className={inputClass}
            />
            {note(`starter-${i}`)}
          </div>
        ))}
      </div>
      <p className="mt-1 text-xs text-neutral-500">If you fill none, the four shown in grey are used.</p>

      <label className="mt-4 block text-sm font-medium text-regantify-text">What the voice call says first</label>
      <textarea
        value={voice}
        onChange={(e) => setVoice(bangla('voice', e.target.value, VOICE_MAX))}
        rows={2}
        placeholder={DEFAULT_VOICE}
        className={`mt-1.5 resize-y leading-relaxed ${inputClass}`}
      />
      {note('voice')}

      <p className="mt-4 text-sm font-medium text-regantify-text">Voice speed on calls</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {SPEEDS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setSpeed(s.value)}
            aria-pressed={speed === s.value}
            className={`rounded-full border px-3.5 py-1.5 text-sm ${speed === s.value ? 'border-regantify-cta bg-regantify-cta text-white' : 'border-line text-regantify-text hover:border-indigo-300'}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-neutral-500">There is one Bangla voice for now, so you choose how fast it speaks. More voices may come later.</p>

      <p className="mt-4 text-sm font-medium text-regantify-text">Chat button corner</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {(['RIGHT', 'LEFT'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            aria-pressed={side === s}
            className={`rounded-full border px-3.5 py-1.5 text-sm ${side === s ? 'border-regantify-cta bg-regantify-cta text-white' : 'border-line text-regantify-text hover:border-indigo-300'}`}
          >
            {s === 'RIGHT' ? 'Bottom right' : 'Bottom left'}
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-neutral-500">If your WhatsApp or Messenger button is in the same corner, the AI button sits just above it.</p>

      <div className="mt-5">
        <SaveButton pending={save.isPending || uploading} onClick={onSave} />
      </div>
    </section>
  );
}
