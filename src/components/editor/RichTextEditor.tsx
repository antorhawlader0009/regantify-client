import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
  Image as ImageIcon,
  Minus,
  Eraser,
  Youtube as YoutubeIcon,
  Code2,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const FONT_SIZES = [
  { label: '1', px: '13px' },
  { label: '2', px: '15px' },
  { label: '3', px: '17px' },
  { label: '4', px: '20px' },
  { label: '5', px: '24px' },
];

// TextStyle doesn't carry a fontSize attribute out of the box — this adds
// one (as an inline style on the existing <span> mark TextStyle already
// wraps text in) so the toolbar's font-size <select> has something real
// to set/read. Kept local to this file since nothing else needs it.
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: { fontSize?: string | null }) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
});

const TEXT_COLORS = [
  '#302A2A', '#DC2626', '#EA580C', '#CA8A04', '#16A34A', '#2563EB', '#7C3AED',
];
const HIGHLIGHT_COLORS = [
  'transparent', '#FEF08A', '#FECACA', '#BBF7D0', '#BFDBFE', '#E9D5FF',
];

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors shrink-0 ${
        active ? 'bg-regantify-black text-white' : 'text-regantify-text hover:bg-regantify-content'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Tiptap-based rich text editor for the product description field —
 * mirrors the reference toolbar: bold/italic/underline/strike, alignment,
 * lists, font size, text/highlight color, link, image, divider, clear
 * formatting, embedded video, and an HTML source view toggle.
 */
export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showSourceView, setShowSourceView] = useState(false);
  const [sourceHtml, setSourceHtml] = useState(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Underline,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['paragraph'] }),
      Link.configure({ openOnClick: false, autolink: true }),
      ImageExtension,
      Youtube.configure({ width: 480, height: 270 }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[110px] px-4 py-3 focus:outline-none text-regantify-text',
      },
    },
  });

  // Keep the editor in sync if `value` is reset from outside (e.g. form reset).
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !showSourceView) {
      editor.commands.setContent(value, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Link URL', previousUrl ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const addImageFromUrl = () => {
    const url = window.prompt('Image URL');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const addVideo = () => {
    const url = window.prompt('YouTube video URL');
    if (url) editor.commands.setYoutubeVideo({ src: url });
  };

  const toggleSourceView = () => {
    if (!showSourceView) {
      setSourceHtml(editor.getHTML());
    } else {
      editor.commands.setContent(sourceHtml, false);
      onChange(sourceHtml);
    }
    setShowSourceView((v) => !v);
  };

  return (
    <div className="rounded-xl border border-black/10 bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-black/10 bg-regantify-content">
        <ToolbarButton
          title="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={16} />
        </ToolbarButton>

        <div className="w-px h-5 bg-black/10 mx-1" />

        <ToolbarButton
          title="Align left"
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Align center"
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Align right"
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Justify"
          active={editor.isActive({ textAlign: 'justify' })}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        >
          <AlignJustify size={16} />
        </ToolbarButton>

        <div className="w-px h-5 bg-black/10 mx-1" />

        <ToolbarButton
          title="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={16} />
        </ToolbarButton>

        <div className="w-px h-5 bg-black/10 mx-1" />

        {/* Font size */}
        <select
          title="Font size"
          className="h-8 px-1.5 rounded-md text-sm bg-white border border-black/10 text-regantify-text"
          onChange={(e) => {
            const size = FONT_SIZES.find((f) => f.label === e.target.value);
            if (size) {
              editor.chain().focus().setMark('textStyle', { fontSize: size.px }).run();
            }
          }}
          defaultValue="2"
        >
          {FONT_SIZES.map((f) => (
            <option key={f.label} value={f.label}>
              {f.label}
            </option>
          ))}
        </select>

        <div className="w-px h-5 bg-black/10 mx-1" />

        {/* Text color */}
        <div className="relative">
          <ToolbarButton
            title="Text color"
            onClick={() => {
              setShowColorPicker((v) => !v);
              setShowHighlightPicker(false);
            }}
          >
            <span className="text-xs font-bold border-b-2" style={{ borderColor: '#DC2626' }}>
              A
            </span>
          </ToolbarButton>
          {showColorPicker && (
            <div className="absolute top-9 left-0 z-20 bg-white rounded-lg shadow-lg border border-black/10 p-2 flex gap-1.5">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    editor.chain().focus().setColor(c).run();
                    setShowColorPicker(false);
                  }}
                  className="w-6 h-6 rounded-full border border-black/10"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          )}
        </div>

        {/* Highlight color */}
        <div className="relative">
          <ToolbarButton
            title="Highlight color"
            onClick={() => {
              setShowHighlightPicker((v) => !v);
              setShowColorPicker(false);
            }}
          >
            <span className="text-xs font-bold px-0.5 bg-yellow-200 rounded-sm">A</span>
          </ToolbarButton>
          {showHighlightPicker && (
            <div className="absolute top-9 left-0 z-20 bg-white rounded-lg shadow-lg border border-black/10 p-2 flex gap-1.5">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    if (c === 'transparent') {
                      editor.chain().focus().unsetHighlight().run();
                    } else {
                      editor.chain().focus().toggleHighlight({ color: c }).run();
                    }
                    setShowHighlightPicker(false);
                  }}
                  className="w-6 h-6 rounded-full border border-black/10"
                  style={{ backgroundColor: c === 'transparent' ? '#fff' : c }}
                  title={c}
                />
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-black/10 mx-1" />

        <ToolbarButton title="Insert link" onClick={setLink} active={editor.isActive('link')}>
          <LinkIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Remove link"
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          <Unlink size={16} />
        </ToolbarButton>
        <ToolbarButton title="Insert image" onClick={addImageFromUrl}>
          <ImageIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Horizontal rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Clear formatting"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        >
          <Eraser size={16} />
        </ToolbarButton>
        <ToolbarButton title="Source code" active={showSourceView} onClick={toggleSourceView}>
          <Code2 size={16} />
        </ToolbarButton>
        <ToolbarButton title="Embed video" onClick={addVideo}>
          <YoutubeIcon size={16} />
        </ToolbarButton>
      </div>

      {/* Editor / source view */}
      {showSourceView ? (
        <textarea
          value={sourceHtml}
          onChange={(e) => setSourceHtml(e.target.value)}
          className="w-full min-h-[110px] px-4 py-3 font-mono text-xs text-regantify-text focus:outline-none resize-y"
          spellCheck={false}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}
