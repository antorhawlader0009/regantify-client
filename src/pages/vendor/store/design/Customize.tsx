import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { HomeHighlight, HomeSection } from '../../../../lib/designSettingsApi';
import { DEFAULT_HIGHLIGHTS, HOME_SECTION_INFO, completeHomeSections, sameHighlights } from '../../../../lib/homeSections';
import { toast } from '../../../../lib/toast';
import { HighlightsEditor } from './HighlightsEditor';
import { DesignLoading, DesignPageHeader, DesignSection, SaveButton, Switch, useDesignSettings } from './designShared';

/**
 * Store > Design > Customize — the sections of the StorePal home page: which
 * ones show, in what order, and the store highlights (up to 9 short points with
 * an icon, such as free delivery or easy returns), which every store used to
 * get as the same placeholder text. One Save button covers everything.
 *
 * What an empty highlights list means: StorePal's three built-in highlights. So
 * the editor starts from them, saves "nothing" while they are unchanged, and when
 * the vendor deletes them all it saves nothing and turns the section off, which
 * is what they mean by it.
 */
export default function Customize() {
  const { settings, isLoading, save } = useDesignSettings();
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [highlights, setHighlights] = useState<HomeHighlight[]>(DEFAULT_HIGHLIGHTS);
  const [heading, setHeading] = useState('');

  useEffect(() => {
    if (!settings) return;
    setSections(completeHomeSections(settings.homeSections));
    setHighlights(settings.homeHighlights.length > 0 ? settings.homeHighlights : DEFAULT_HIGHLIGHTS);
    setHeading(settings.homeHighlightsHeading ?? '');
  }, [settings]);

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next);
  };

  const toggle = (index: number, enabled: boolean) =>
    setSections(sections.map((s, i) => (i === index ? { ...s, enabled } : s)));

  const handleSave = () => {
    if (highlights.some((h) => !h.title.trim())) {
      toast.error('Every highlight needs a title.');
      return;
    }
    const none = highlights.length === 0;
    save.mutate({
      // Deleting every highlight means "show none", so the section is switched off with it.
      homeSections: none ? sections.map((s) => (s.id === 'HIGHLIGHTS' ? { ...s, enabled: false } : s)) : sections,
      // The built-in highlights are saved as "nothing", so StorePal keeps using its own.
      homeHighlights: none || sameHighlights(highlights, DEFAULT_HIGHLIGHTS) ? [] : highlights,
      homeHighlightsHeading: heading.trim(),
    });
  };

  return (
    <div className="max-w-4xl">
      <DesignPageHeader
        title="Customize"
        description="Choose which sections your StorePal home page shows, in what order, and write your store highlights."
        actions={settings && <SaveButton pending={save.isPending} onClick={handleSave} />}
      />
      {isLoading || !settings ? (
        <DesignLoading />
      ) : (
        <div className="space-y-8">
          <DesignSection
            title="Home page sections"
            hint="Use the arrows to move a section up or down. Turn a section off to hide it. The header and footer stay where they are."
          >
            <ul className="-my-2 divide-y divide-black/5">
              {sections.map((section, index) => {
                const info = HOME_SECTION_INFO[section.id];
                return (
                  <li key={section.id} className="flex items-center gap-3 py-3">
                    <div className="flex shrink-0 flex-col">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move ${info.label} up`}
                        className="rounded p-1 text-regantify-text-muted hover:bg-black/5 hover:text-regantify-text disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === sections.length - 1}
                        aria-label={`Move ${info.label} down`}
                        className="rounded p-1 text-regantify-text-muted hover:bg-black/5 hover:text-regantify-text disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ArrowDown size={15} />
                      </button>
                    </div>
                    <div className={`min-w-0 flex-1 ${section.enabled ? '' : 'opacity-50'}`}>
                      <p className="text-sm font-medium text-regantify-text">{info.label}</p>
                      <p className="text-xs text-regantify-text-muted">{info.description}</p>
                    </div>
                    <Switch checked={section.enabled} onChange={(v) => toggle(index, v)} label={`Show ${info.label}`} />
                  </li>
                );
              })}
            </ul>
          </DesignSection>

          <DesignSection
            title="Store highlights"
            hint="Short points with an icon that show shoppers why to buy from you. Shown only while Store highlights is on above."
          >
            <HighlightsEditor items={highlights} onChange={setHighlights} heading={heading} onHeadingChange={setHeading} />
          </DesignSection>

          <SaveButton pending={save.isPending} onClick={handleSave} />
        </div>
      )}
    </div>
  );
}
