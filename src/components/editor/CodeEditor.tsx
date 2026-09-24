import Editor from '@monaco-editor/react';
import { Loader2 } from 'lucide-react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'css' | 'html' | 'javascript';
  height?: number | string;
}

/**
 * Dark Monaco editor used by Store > Design's Custom CSS / Head Scripts /
 * JavaScript Code pages. @monaco-editor/react loads Monaco itself from
 * the jsdelivr CDN on first use, so it adds almost nothing to our bundle.
 */
export function CodeEditor({ value, onChange, language, height = 560 }: CodeEditorProps) {
  return (
    <div className="rounded-xl overflow-hidden border border-black/10 bg-[#1e1e1e]">
      <Editor
        height={height}
        language={language}
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v ?? '')}
        loading={<Loader2 size={20} className="animate-spin text-white/60" />}
        options={{
          fontSize: 13,
          tabSize: 2,
          wordWrap: 'off',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 12 },
        }}
      />
    </div>
  );
}
