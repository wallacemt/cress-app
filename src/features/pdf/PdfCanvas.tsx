import { t } from "../../lib/i18n";
import { useLanguageStore } from "../../stores/languageStore";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { RenderTask } from "pdfjs-dist/types/src/display/api";
import { getDocument, pdfOptions } from "./pdfSetup";

export function PdfCanvas({
  src,
  page,
  scale,
  onPageCount,
  onPageSize,
  onError,
}: {
  src: string;
  page: number;
  scale: number;
  onPageCount: (count: number) => void;
  onPageSize: (size: { width: number; height: number }) => void;
  onError: (message: string) => void;
}) {
  useLanguageStore((state) => state.language);
  const canvas = useRef<HTMLCanvasElement>(null);
  const documentRef = useRef<PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setReady(false);
    const task = getDocument({ url: src, ...pdfOptions });
    void task.promise.then((document) => {
      if (!active) { void task.destroy(); return; }
      documentRef.current = document;
      onPageCount(document.numPages);
      setReady(true);
      setLoading(false);
    }).catch((error: unknown) => {
      if (active) { setLoading(false); onError(error instanceof Error ? error.message : t("score.open_error")); }
    });
    return () => {
      active = false;
      documentRef.current = null;
      void task.destroy();
    };
  }, [src, onError, onPageCount]);

  useEffect(() => {
    let active = true;
    let renderTask: RenderTask | undefined;
    const target = canvas.current;
    const document = documentRef.current;
    if (!target || !document || !ready) return;
    void document.getPage(page).then((pdfPage) => {
      if (!active) return;
      const viewport = pdfPage.getViewport({ scale });
      onPageSize({ width: viewport.width / scale, height: viewport.height / scale });
      const ratio = window.devicePixelRatio || 1;
      target.width = Math.floor(viewport.width * ratio);
      target.height = Math.floor(viewport.height * ratio);
      target.style.width = `${viewport.width}px`;
      target.style.height = `${viewport.height}px`;
      const context = target.getContext("2d");
      if (!context) { onError(t("score.create_canvas_error")); return; }
      renderTask = pdfPage.render({ canvas: target, canvasContext: context, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] });
      return renderTask.promise.catch((error: unknown) => {
        if (active && !(error instanceof Error && error.name === "RenderingCancelledException")) onError(t("score.render_error"));
      });
    }).catch(() => { if (active) onError(t("score.load_page_error")); });
    return () => { active = false; renderTask?.cancel(); };
  }, [page, scale, onError, onPageSize, ready]);

  return <div className="cress-score-canvas-wrap">{loading && <span role="status">{t("score.loading")}</span>}<canvas ref={canvas} aria-label={t("score.page_number", { page })} /></div>;
}
