import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { customCodeApi, type CustomCode } from '../../../../lib/customCodeApi';
import { apiErrorMessage } from '../../../../lib/api';
import { toast } from '../../../../lib/toast';
import { CodeEditor } from '../../../../components/editor/CodeEditor';

interface CustomCodePageProps {
  field: keyof CustomCode;
  title: string;
  description: string;
  language: 'css' | 'html';
}

/**
 * Store > Design > Custom CSS and Custom Head Scripts — one code editor +
 * Save each, backed by the same StoreCustomCode row. Each page only
 * sends its own field, so saving one never overwrites the other.
 */
function CustomCodePage({ field, title, description, language }: CustomCodePageProps) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['custom-code'], queryFn: customCodeApi.get });
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    if (data) setValue(data[field] ?? '');
  }, [data, field]);

  const save = useMutation({
    mutationFn: (code: string) => customCodeApi.update({ [field]: code }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['custom-code'], updated);
      toast.success(`${title} saved. Your storefront will reflect this shortly.`);
    },
    onError: (err) => toast.error(apiErrorMessage(err, `Could not save ${title}. Please try again.`)),
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">{title}</h1>
        <p className="text-sm text-regantify-text-muted mt-1">{description}</p>
      </div>

      {isLoading || value === null ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-black/5 p-3">
            <CodeEditor value={value} onChange={setValue} language={language} />
          </div>
          <button
            onClick={() => save.mutate(value)}
            disabled={save.isPending}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
              text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {save.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}

export function CustomCss() {
  return (
    <CustomCodePage
      field="customCss"
      title="Custom CSS"
      language="css"
      description="Extra CSS added to every page of your StorePal storefront. Plain CSS only, no <style> tag."
    />
  );
}

export function CustomHeadScripts() {
  return (
    <CustomCodePage
      field="headScripts"
      title="Custom Head Scripts"
      language="html"
      description="Code added to the <head> of every page of your StorePal storefront, e.g. Google Analytics, Meta Pixel or verification tags. Paste full tags like <script>…</script> or <meta …>, or plain JavaScript on its own."
    />
  );
}
