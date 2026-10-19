import { useEffect, useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';

/**
 * Drop photos anywhere on Add / Edit Product to add them to the product. While files are dragged over the window a
 * frosted layer says so; it never takes the drop itself (pointer-events none), so the Photos box and the photo dialog
 * keep their own drop handling: a drop they already handled (defaultPrevented) or one while a dialog is open is left alone.
 */
export function PageFileDrop({ onFiles, disabled = false }: { onFiles: (files: FileList) => void; disabled?: boolean }) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const onFilesRef = useRef(onFiles);
  onFilesRef.current = onFiles;

  useEffect(() => {
    if (disabled) return;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
    const dialogOpen = () => Boolean(document.querySelector('[role="dialog"]'));

    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e) || dialogOpen()) return;
      depth.current += 1;
      setOver(true);
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setOver(false);
    };
    // Without this the browser opens the file in the tab instead of letting the page take it.
    const onOver = (e: DragEvent) => {
      if (hasFiles(e) && !dialogOpen()) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      depth.current = 0;
      setOver(false);
      if (!hasFiles(e) || e.defaultPrevented || dialogOpen()) return;
      e.preventDefault();
      if (e.dataTransfer?.files.length) onFilesRef.current(e.dataTransfer.files);
    };

    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('dragover', onOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [disabled]);

  if (!over) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-brand/10 p-6 backdrop-blur-[3px]" aria-live="polite">
      <div className="absolute inset-3 rounded-2xl border-2 border-dashed border-brand/60" aria-hidden />
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/60 bg-white/80 px-8 py-6 text-center shadow-2xl backdrop-blur-md">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white">
          <ImagePlus size={22} />
        </span>
        <p className="text-[15px] font-semibold text-regantify-text">Drop to add photos</p>
        <p className="text-xs text-regantify-text-muted">JPG, PNG, WEBP or GIF, up to 8 MB each</p>
      </div>
    </div>
  );
}
