import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ExternalLink,
  Layers,
  LayoutTemplate,
  MessageCircle,
  Monitor,
  Plus,
  Settings2,
  Smartphone,
  Sparkles,
  Type as TypeIcon,
} from 'lucide-react';
import {
  landingPagesApi,
  type LandingPage,
  type LandingPagePayload,
  type LandingPageSection,
} from '../../../../lib/landingPagesApi';
import { createSection, sectionLabel } from '../../../../lib/landingSections';
import { toast } from '../../../../lib/toast';
import { useAuthStore } from '../../../../store/authStore';
import { storefrontLandingPageUrl } from '../../../../lib/storefrontUrl';
import { SectionList } from '../../../../components/landing/SectionList';
import { SectionSettings } from '../../../../components/landing/SectionSettings';
import { SectionPreview } from '../../../../components/landing/SectionPreview';
import { AddSectionModal } from '../../../../components/landing/AddSectionModal';
import {
  AdvancedPanel,
  ChatButtonPanel,
  FontsPanel,
  PageDisplayPanel,
} from '../../../../components/landing/SettingsPanels';

type DeviceMode = 'desktop' | 'mobile';

function Panel({
  icon,
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-white/[0.04]"
      >
        <span className="text-slate-400">{icon}</span>
        <span className="flex-1">
          <span className="block text-[13px] font-medium text-slate-100">{title}</span>
          {subtitle && <span className="block text-[11px] text-slate-500">{subtitle}</span>}
        </span>
        <ChevronDown size={15} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-white/10 px-3.5 py-3">{children}</div>}
    </div>
  );
}

type PanelKey = 'sections' | 'display' | 'chat' | 'fonts' | 'advanced';

export default function LandingPageBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const subdomain = useAuthStore((s) => s.user?.vendor?.subdomain);

  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [openPanel, setOpenPanel] = useState<PanelKey>('sections');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  // The whole page is edited locally and committed on Save. Keeping one
  // draft object (rather than a field-per-state) means section edits,
  // reorders and panel changes all flow through the same dirty-tracking
  // and the preview always renders exactly what would be saved.
  const [draft, setDraft] = useState<LandingPage | null>(null);

  const { data: page, isLoading, isError } = useQuery({
    queryKey: ['landing-page', id],
    queryFn: () => landingPagesApi.findOne(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (page) setDraft(page);
  }, [page]);

  const patchDraft = useCallback((patch: LandingPagePayload) => {
    setDraft((d) => (d ? ({ ...d, ...patch } as LandingPage) : d));
    setDirty(true);
  }, []);

  const setSections = useCallback(
    (sections: LandingPageSection[]) => {
      patchDraft({ sections });
    },
    [patchDraft],
  );

  const saveMutation = useMutation({
    mutationFn: (payload: LandingPagePayload) => landingPagesApi.update(id!, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(['landing-page', id], updated);
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
      setDraft(updated);
      setDirty(false);
      toast.success('Landing page saved.');
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not save. Please try again.';
      toast.error(message);
    },
  });

  const publishMutation = useMutation({
    mutationFn: (status: LandingPage['status']) => landingPagesApi.update(id!, { status }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['landing-page', id], updated);
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
      setDraft((d) => (d ? { ...d, status: updated.status } : d));
      toast.success(updated.status === 'PUBLISHED' ? 'Landing page published.' : 'Moved back to draft.');
    },
    onError: () => toast.error('Could not change the status. Please try again.'),
  });

  const handleSave = () => {
    if (!draft) return;
    saveMutation.mutate({
      title: draft.title.trim() || 'Untitled landing page',
      slug: draft.slug,
      sections: draft.sections,
      displayMode: draft.displayMode,
      chatButtonEnabled: draft.chatButtonEnabled,
      chatButtonLink: draft.chatButtonLink ?? undefined,
      chatButtonImageUrl: draft.chatButtonImageUrl ?? undefined,
      headingFont: draft.headingFont ?? undefined,
      bodyFont: draft.bodyFont ?? undefined,
      customCss: draft.customCss ?? undefined,
      metaTitle: draft.metaTitle ?? undefined,
      metaDescription: draft.metaDescription ?? undefined,
      metaKeywords: draft.metaKeywords ?? undefined,
      coverImageUrl: draft.coverImageUrl ?? undefined,
      metaPixelId: draft.metaPixelId ?? undefined,
      tiktokPixelId: draft.tiktokPixelId ?? undefined,
    });
  };

  // Warn before losing unsaved edits — a landing page can represent a lot
  // of typing, and the builder is a full-screen surface where an
  // accidental back-navigation is easy.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const leaveBuilder = () => {
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
    navigate('/vendor/store/landing-pages');
  };

  const sections = draft?.sections ?? [];
  const selectedSection = sections.find((s) => s.id === selectedSectionId) ?? null;

  const publicUrl = useMemo(
    () => (subdomain && draft ? storefrontLandingPageUrl(subdomain, draft.slug) : null),
    [subdomain, draft],
  );

  // -- Section operations ------------------------------------------------

  const addSection = (type: string) => {
    const section = createSection(type);
    setSections([...sections, section]);
    setSelectedSectionId(section.id);
    setAddOpen(false);
  };

  const duplicateSection = (sectionId: string) => {
    const index = sections.findIndex((s) => s.id === sectionId);
    if (index === -1) return;
    const copy = { ...sections[index], id: createSection(sections[index].type).id };
    const next = [...sections];
    next.splice(index + 1, 0, copy);
    setSections(next);
    setSelectedSectionId(copy.id);
  };

  const deleteSection = (sectionId: string) => {
    setSections(sections.filter((s) => s.id !== sectionId));
    if (selectedSectionId === sectionId) setSelectedSectionId(null);
  };

  const toggleVisibility = (sectionId: string, dev: DeviceMode) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              visibility: {
                desktop: s.visibility?.desktop ?? true,
                mobile: s.visibility?.mobile ?? true,
                [dev]: !(s.visibility?.[dev] ?? true),
              },
            }
          : s,
      ),
    );
  };

  const updateSectionProps = (sectionId: string, props: Record<string, unknown>) => {
    setSections(sections.map((s) => (s.id === sectionId ? { ...s, props } : s)));
  };

  // -- Render ------------------------------------------------------------

  if (isLoading || (!draft && !isError)) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0B0B10] text-sm text-slate-400">
        Loading builder…
      </div>
    );
  }

  if (isError || !draft) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#0B0B10]">
        <p className="text-sm text-slate-400">This landing page could not be loaded.</p>
        <button
          onClick={() => navigate('/vendor/store/landing-pages')}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm text-slate-100 hover:bg-white/15"
        >
          Back to Landing Pages
        </button>
      </div>
    );
  }

  const isPublished = draft.status === 'PUBLISHED';
  const togglePanel = (key: PanelKey) => setOpenPanel((p) => (p === key ? ('' as PanelKey) : key));

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0B0B10] text-slate-100">
      {/* Top bar */}
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-2.5">
        <button
          onClick={leaveBuilder}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-slate-400 hover:bg-white/5 hover:text-slate-100"
        >
          <ArrowLeft size={15} />
          Landing Pages
        </button>

        <div className="h-5 w-px bg-white/10" />

        <input
          value={draft.title}
          onChange={(e) => patchDraft({ title: e.target.value })}
          className="min-w-0 max-w-xs flex-1 rounded-lg bg-transparent px-2 py-1.5 text-[15px] font-semibold
            text-slate-100 outline-none transition-colors hover:bg-white/5 focus:bg-white/5"
          aria-label="Landing page title"
        />

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            isPublished ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/10 text-slate-400'
          }`}
        >
          {isPublished ? 'PUBLISHED' : 'DRAFT'}
        </span>

        {dirty && <span className="shrink-0 text-[11px] text-amber-400/80">Unsaved changes</span>}

        <div className="mx-auto flex shrink-0 items-center gap-0.5 rounded-xl bg-white/5 p-1">
          <button
            onClick={() => setDevice('desktop')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
              device === 'desktop' ? 'bg-white/10 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor size={14} />
            Desktop
          </button>
          <button
            onClick={() => setDevice('mobile')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
              device === 'mobile' ? 'bg-white/10 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone size={14} />
            Mobile
          </button>
        </div>

        <button
          disabled
          title="AI Generate — coming in Step 10"
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-violet-400/30 bg-violet-500/10
            px-3 py-2 text-[12px] font-medium text-violet-300 opacity-60"
        >
          <Sparkles size={14} />
          AI Generate
        </button>

        {publicUrl && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium
              text-slate-400 hover:bg-white/5 hover:text-slate-100"
          >
            <ExternalLink size={14} />
            Preview
          </a>
        )}

        <button
          onClick={handleSave}
          disabled={saveMutation.isPending || !dirty}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-[12px]
            font-medium text-slate-100 transition-colors hover:bg-white/15 disabled:opacity-40"
        >
          <Check size={14} />
          {saveMutation.isPending ? 'Saving…' : 'Save'}
        </button>

        <button
          onClick={() => publishMutation.mutate(isPublished ? 'DRAFT' : 'PUBLISHED')}
          disabled={publishMutation.isPending}
          className={`shrink-0 rounded-xl px-3.5 py-2 text-[12px] font-medium transition-colors disabled:opacity-60 ${
            isPublished
              ? 'bg-white/10 text-slate-100 hover:bg-white/15'
              : 'bg-violet-600 text-white hover:bg-violet-500'
          }`}
        >
          {publishMutation.isPending ? '…' : isPublished ? 'Unpublish' : 'Publish'}
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left rail */}
        <aside className="w-[310px] shrink-0 overflow-y-auto border-r border-white/10 p-3">
          {selectedSection ? (
            // Section settings replace the panel list while a section is
            // selected — the rail is narrow, and showing both at once
            // would mean scrolling past the panel list on every edit.
            <div>
              <button
                onClick={() => setSelectedSectionId(null)}
                className="mb-3 flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-slate-100"
              >
                <ChevronLeft size={14} />
                All sections
              </button>
              <h2 className="mb-3 text-[14px] font-semibold text-slate-100">
                {sectionLabel(selectedSection.type)}
              </h2>
              <SectionSettings
                type={selectedSection.type}
                props={selectedSection.props}
                onChange={(props) => updateSectionProps(selectedSection.id, props)}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Panel
                icon={<Layers size={15} />}
                title="Sections"
                subtitle={sections.length === 1 ? '1 section' : `${sections.length} sections`}
                open={openPanel === 'sections'}
                onToggle={() => togglePanel('sections')}
              >
                {sections.length === 0 ? (
                  <p className="text-[12px] leading-relaxed text-slate-500">
                    This page is empty. Sections are the building blocks — a hero, your product, reviews,
                    an order form.
                  </p>
                ) : (
                  <SectionList
                    sections={sections}
                    selectedId={selectedSectionId}
                    onSelect={setSelectedSectionId}
                    onReorder={setSections}
                    onDuplicate={duplicateSection}
                    onDelete={deleteSection}
                    onToggleVisibility={toggleVisibility}
                  />
                )}

                <button
                  onClick={() => setAddOpen(true)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed
                    border-white/15 py-2 text-[12px] font-medium text-slate-400 transition-colors
                    hover:border-violet-400/50 hover:text-violet-300"
                >
                  <Plus size={14} />
                  Add Section
                </button>
              </Panel>

              <Panel
                icon={<LayoutTemplate size={15} />}
                title="Page Display"
                open={openPanel === 'display'}
                onToggle={() => togglePanel('display')}
              >
                <PageDisplayPanel page={draft} onChange={patchDraft} />
              </Panel>

              <Panel
                icon={<MessageCircle size={15} />}
                title="Chat Button"
                open={openPanel === 'chat'}
                onToggle={() => togglePanel('chat')}
              >
                <ChatButtonPanel page={draft} onChange={patchDraft} />
              </Panel>

              <Panel
                icon={<TypeIcon size={15} />}
                title="Fonts"
                open={openPanel === 'fonts'}
                onToggle={() => togglePanel('fonts')}
              >
                <FontsPanel page={draft} onChange={patchDraft} />
              </Panel>

              <Panel
                icon={<Settings2 size={15} />}
                title="Advanced"
                subtitle="SEO, tracking, custom CSS"
                open={openPanel === 'advanced'}
                onToggle={() => togglePanel('advanced')}
              >
                <AdvancedPanel page={draft} onChange={patchDraft} />
              </Panel>
            </div>
          )}
        </aside>

        {/* Preview canvas */}
        <main className="flex min-w-0 flex-1 items-start justify-center overflow-y-auto bg-[#101017] p-6">
          <div
            className={`overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/40 transition-all ${
              device === 'mobile' ? 'w-[390px]' : 'w-full max-w-5xl'
            }`}
          >
            {sections.length === 0 ? (
              <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-8 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
                  <LayoutTemplate size={26} strokeWidth={1.5} />
                </span>
                <h2 className="text-base font-semibold text-regantify-text">Your page starts here</h2>
                <p className="max-w-xs text-sm text-regantify-text-muted">
                  Add your first section from the left panel to start building.
                </p>
                <button
                  onClick={() => setAddOpen(true)}
                  className="mt-2 flex items-center gap-1.5 rounded-xl bg-regantify-cta px-4 py-2.5
                    text-sm font-medium text-white hover:bg-regantify-cta-dark"
                >
                  <Plus size={16} />
                  Add a section
                </button>
              </div>
            ) : (
              <div className="min-h-[70vh]">
                {sections.map((section) => {
                  const hiddenHere = section.visibility?.[device] === false;
                  const isSelected = section.id === selectedSectionId;

                  return (
                    <div
                      key={section.id}
                      onClick={() => setSelectedSectionId(section.id)}
                      className={`relative cursor-pointer transition-all ${
                        isSelected ? 'ring-2 ring-inset ring-violet-500' : 'hover:ring-1 hover:ring-inset hover:ring-violet-300'
                      } ${hiddenHere ? 'opacity-40' : ''}`}
                    >
                      {hiddenHere && (
                        <span
                          className="absolute right-2 top-2 z-10 rounded-md bg-regantify-black/80 px-2 py-1
                            text-[10px] font-medium text-white"
                        >
                          Hidden on {device}
                        </span>
                      )}
                      <SectionPreview section={section} device={device} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {addOpen && <AddSectionModal onPick={addSection} onClose={() => setAddOpen(false)} />}
    </div>
  );
}
