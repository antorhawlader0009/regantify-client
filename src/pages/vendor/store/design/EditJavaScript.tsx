import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { customCodeApi, type StoreScriptInput, type StoreScriptPosition } from '../../../../lib/customCodeApi';
import { apiErrorMessage } from '../../../../lib/api';
import { toast } from '../../../../lib/toast';
import { CodeEditor } from '../../../../components/editor/CodeEditor';

const EMPTY: StoreScriptInput = { name: '', position: 'HEAD', code: '' };

/** Store > Design > JavaScript Code's Add New and Edit page (edit when the route has :id). */
export default function EditJavaScript() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const { data, isLoading } = useQuery({
    queryKey: ['store-scripts', id],
    queryFn: () => customCodeApi.getScript(id!),
    enabled: isEdit,
  });
  const [form, setForm] = useState<StoreScriptInput | null>(isEdit ? null : EMPTY);

  useEffect(() => {
    if (data) setForm({ name: data.name, position: data.position, code: data.code });
  }, [data]);

  const save = useMutation({
    mutationFn: (value: StoreScriptInput) =>
      isEdit ? customCodeApi.updateScript(id!, value) : customCodeApi.createScript(value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-scripts'] });
      toast.success('Script saved. Your storefront will reflect this shortly.');
      navigate('/vendor/store/javascript');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save this script. Please try again.')),
  });

  const handleSave = () => {
    if (!form) return;
    if (!form.name.trim()) {
      toast.error('Enter a name for this script.');
      return;
    }
    save.mutate(form);
  };

  const set = <K extends keyof StoreScriptInput>(key: K, value: StoreScriptInput[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/vendor/store/javascript"
          className="inline-flex items-center gap-1.5 text-xs text-regantify-cta hover:underline mb-1"
        >
          <ArrowLeft size={14} />
          JavaScript Code
        </Link>
        <h1 className="text-2xl font-semibold text-regantify-text">{isEdit ? 'Edit JavaScript' : 'Add JavaScript'}</h1>
      </div>

      {(isEdit && isLoading) || !form ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-black/5 p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-regantify-text mb-1.5">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                maxLength={120}
                placeholder="e.g. Change search placeholder"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text
                  focus:outline-none focus:border-regantify-cta transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-regantify-text mb-1.5">Position</label>
              <select
                value={form.position}
                onChange={(e) => set('position', e.target.value as StoreScriptPosition)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text bg-white
                  focus:outline-none focus:border-regantify-cta transition-colors"
              >
                <option value="HEAD">Head</option>
                <option value="BODY">Body (end of page)</option>
              </select>
              <p className="text-xs text-regantify-text-muted mt-1.5">
                Plain JavaScript, no &lt;script&gt; tag. Runs on every page of your StorePal storefront. Head scripts
                run first, Body scripts after the page content.
              </p>
            </div>
            <CodeEditor value={form.code} onChange={(v) => set('code', v)} language="javascript" />
          </div>
          <button
            onClick={handleSave}
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
