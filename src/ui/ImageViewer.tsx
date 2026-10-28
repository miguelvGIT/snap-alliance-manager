import { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Modal } from './Modal';
import s from './ui.module.css';
export default function ImageViewer({
  image,
  onClose,
}: {
  image: { name: string; url: string };
  onClose: () => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [natural, setNatural] = useState({ width: 1, height: 1 });
  const [scale, setScale] = useState<number | null>(null);
  const dragging = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  useEffect(() => {
    const node = viewport.current!;
    const observer = new ResizeObserver(() =>
      setSize({ width: node.clientWidth, height: node.clientHeight }),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const fit = Math.min(1, size.width / natural.width, size.height / natural.height);
  const zoom = scale ?? fit;
  const change = (factor: number) => setScale(Math.max(0.05, Math.min(8, zoom * factor)));
  return (
    <Modal title="Image preview" onClose={onClose} className={s.imageViewer}>
      <p>{image.name}</p>
      <div className={s.actions}>
        <button aria-label="Zoom out" onClick={() => change(1 / 1.5)}>
          <ZoomOut size={18} />
        </button>
        <output aria-label="Image zoom">{Math.round(zoom * 100)}%</output>
        <button aria-label="Zoom in" onClick={() => change(1.5)}>
          <ZoomIn size={18} />
        </button>
        <button onClick={() => setScale(null)}>
          <Maximize2 size={16} /> Fit image
        </button>
        <button onClick={() => setScale(1)}>Actual size</button>
      </div>
      <p className={s.hint}>Zoom in to check the text. Scroll or drag to move around the image.</p>
      <div
        ref={viewport}
        className={s.imageViewport}
        tabIndex={0}
        aria-label="Zoomed image"
        onKeyDown={(e) => {
          if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            change(1.5);
          }
          if (e.key === '-') {
            e.preventDefault();
            change(1 / 1.5);
          }
        }}
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse' || e.button !== 0) return;
          dragging.current = {
            x: e.clientX,
            y: e.clientY,
            left: e.currentTarget.scrollLeft,
            top: e.currentTarget.scrollTop,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = dragging.current;
          if (d) {
            e.currentTarget.scrollLeft = d.left + d.x - e.clientX;
            e.currentTarget.scrollTop = d.top + d.y - e.clientY;
          }
        }}
        onPointerUp={() => {
          dragging.current = null;
        }}
        onPointerCancel={() => {
          dragging.current = null;
        }}
      >
        <img
          src={image.url}
          alt={image.name}
          draggable={false}
          onLoad={(e) =>
            setNatural({
              width: e.currentTarget.naturalWidth,
              height: e.currentTarget.naturalHeight,
            })
          }
          style={{ width: natural.width * zoom, height: natural.height * zoom }}
        />
      </div>
    </Modal>
  );
}
