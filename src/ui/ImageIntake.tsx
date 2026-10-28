import { useEffect, useRef, useState } from 'react';
import { ClipboardPaste, ImagePlus, Monitor, Square, Trash2 } from 'lucide-react';
import { uuid, type Collection } from '../domain/model';
import { toLocalInput, fromLocalInput } from '../domain/weeks';
import type { ImageInput } from '../ocr/rows';
import { readImages } from '../ocr/reader';
import { Field, Notice } from './Modal';
import s from './ui.module.css';
import ImageViewer from './ImageViewer';

const MAX_IMAGES = 20;
export default function ImageIntake({
  hidden,
  onReview,
}: {
  hidden: boolean;
  onReview: (collection: Collection, images: ImageInput[]) => void;
}) {
  const [images, setImages] = useState<ImageInput[]>([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [preview, setPreview] = useState<ImageInput | null>(null);
  const urls = useRef(new Set<string>());
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const abort = useRef<AbortController | null>(null);
  const captureRequest = useRef(0);
  const capture = useRef<{
    stream: MediaStream;
    video: HTMLVideoElement;
    timer?: ReturnType<typeof setInterval>;
  } | null>(null);
  const stopCapture = () => {
    captureRequest.current++;
    const active = capture.current;
    capture.current = null;
    if (active) {
      clearInterval(active.timer);
      active.stream.getTracks().forEach((track) => track.stop());
      active.video.srcObject = null;
    }
    setCapturing(false);
  };
  useEffect(
    () => () => {
      captureRequest.current++;
      abort.current?.abort();
      const active = capture.current;
      capture.current = null;
      if (active) {
        clearInterval(active.timer);
        active.stream.getTracks().forEach((track) => track.stop());
        active.video.srcObject = null;
      }
      urls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );
  const add = (files: File[], source: ImageInput['source'], observedAt: string | null = null) => {
    const accepted = files.filter(
      (file) => /^image\/(png|jpeg|webp)$/.test(file.type) && file.size <= 20 * 1024 * 1024,
    );
    if (accepted.length !== files.length)
      setError('Use PNG, JPEG or WebP images, up to 20 MB each. Convert other formats first.');
    const room = MAX_IMAGES - imagesRef.current.length;
    if (accepted.length > room)
      setError('Read up to 20 images at a time. Save this collection before adding another batch.');
    const additions = accepted.slice(0, room).map((file) => {
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      return {
        id: uuid(),
        file,
        url,
        name: file.name,
        source,
        observedAt,
        timeSource: observedAt ? ('automatic' as const) : ('unknown' as const),
      };
    });
    imagesRef.current = [...imagesRef.current, ...additions];
    setImages(imagesRef.current);
  };
  const pasteImages = async () => {
    setError('');
    try {
      if (!navigator.clipboard?.read) throw new Error();
      const items = await navigator.clipboard.read();
      const files: File[] = [];
      for (const item of items) {
        const type = item.types.find((type) => /^image\/(png|jpeg|webp)$/.test(type));
        if (type)
          files.push(
            new File([await item.getType(type)], 'Pasted image ' + (files.length + 1) + '.png', {
              type,
            }),
          );
      }
      if (!files.length) {
        setError('No image was found in the clipboard. Copy a screenshot, then paste it here.');
        return;
      }
      add(files, 'clipboard');
    } catch {
      setError(
        'Clipboard access was not available. Focus the paste area and use Paste or Ctrl+V / Cmd+V.',
      );
    }
  };
  const startCapture = async () => {
    setError('');
    const request = ++captureRequest.current;
    setCapturing(true);
    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 2 },
        audio: false,
      });
      if (request !== captureRequest.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      const active = {
        stream,
        video,
        timer: undefined as ReturnType<typeof setInterval> | undefined,
      };
      capture.current = active;
      stream.getVideoTracks()[0].addEventListener(
        'ended',
        () => {
          if (capture.current !== active) return;
          stopCapture();
          setStatus('Capture ended. Check the images and read them when ready.');
        },
        { once: true },
      );
      await video.play();
      if (capture.current !== active) return;
      setCapturing(true);
      setStatus(
        'Capturing visible rows. Scroll slowly and pause on each group of rows, then stop capture.',
      );
      let last = '',
        grabbing = false;
      const frame = async () => {
        if (grabbing || capture.current !== active || !video.videoWidth) return;
        grabbing = true;
        try {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, 2560 / Math.max(video.videoWidth, video.videoHeight));
          canvas.width = Math.round(video.videoWidth * scale);
          canvas.height = Math.round(video.videoHeight * scale);
          canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
          const at = new Date().toISOString();
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/png'),
          );
          if (!blob || capture.current !== active) return;
          const signature = Array.from(
            new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())),
          ).join(',');
          if (signature === last || capture.current !== active) return;
          last = signature;
          add(
            [
              new File([blob], 'Screen ' + at.replace(/[:.]/g, '-') + '.png', {
                type: 'image/png',
              }),
            ],
            'screen',
            at,
          );
          if (imagesRef.current.length >= MAX_IMAGES) {
            stopCapture();
            setStatus('Capture stopped at 20 images. Review this batch before continuing.');
          }
        } finally {
          grabbing = false;
        }
      };
      active.timer = setInterval(() => {
        void frame().catch(() => {
          stopCapture();
          setError('Capture stopped. Try again or add screenshots instead.');
        });
      }, 1500);
      await frame();
    } catch (e) {
      stream?.getTracks().forEach((track) => track.stop());
      if (request !== captureRequest.current) return;
      stopCapture();
      setError(
        (e as Error).name === 'NotAllowedError'
          ? 'Screen capture was cancelled or denied. You can still add screenshots.'
          : 'Screen capture is unavailable here. Add or paste screenshots instead.',
      );
    }
  };
  const read = async () => {
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError('');
    try {
      const result = await readImages(images, 3, 0, setStatus, controller.signal);
      if (!controller.signal.aborted) onReview(result, images);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (!controller.signal.aborted)
        setError(
          message.includes('No player rows')
            ? message
            : 'The images could not be read. Use clear PNG, JPEG or WebP screenshots and try again.',
        );
    } finally {
      if (!controller.signal.aborted) setStatus('');
      setBusy(false);
      abort.current = null;
    }
  };
  return (
    <div hidden={hidden}>
      <p>
        Add screenshots of the alliance table. Read them on this device, then review the names and
        total points before saving.
      </p>
      {error && (
        <div role="alert">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      <div className={s.actions}>
        <label className={s.fileButton} aria-disabled={busy || capturing}>
          <ImagePlus size={16} /> Add images
          <input
            aria-label="Add images"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            disabled={busy || capturing}
            className={s.srOnly}
            onChange={(e) => {
              setError('');
              add(Array.from(e.target.files ?? []), 'image');
              e.target.value = '';
            }}
          />
        </label>
        <button disabled={busy || capturing} onClick={() => void pasteImages()}>
          <ClipboardPaste size={16} /> Paste images
        </button>
        {typeof navigator.mediaDevices?.getDisplayMedia === 'function' && (
          <button
            disabled={busy || capturing || images.length >= MAX_IMAGES}
            onClick={() => void startCapture()}
          >
            <Monitor size={16} /> Capture game window
          </button>
        )}
        {capturing && (
          <button
            className={s.primary}
            onClick={() => {
              stopCapture();
              setStatus('Capture stopped. Check the images and read them when ready.');
            }}
          >
            <Square size={14} /> Stop capture
          </button>
        )}
      </div>
      <div
        className={s.pasteArea}
        tabIndex={0}
        role="region"
        aria-label="Paste screenshots here"
        onPaste={(e) => {
          if (busy || capturing) return;
          const files = Array.from(e.clipboardData.items)
            .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
            .map((item) => item.getAsFile())
            .filter((file): file is File => !!file);
          if (files.length) {
            e.preventDefault();
            setError('');
            add(files, 'clipboard');
          }
        }}
      >
        Copy a screenshot and paste here — Ctrl+V / Cmd+V, or your device’s Paste action. No saved
        file needed.
      </div>
      {images.length > 0 && (
        <>
          <div className={s.imageIntake}>
            {images.map((image, index) => (
              <figure key={image.id}>
                <button
                  type="button"
                  className={s.imagePreviewButton}
                  aria-label={'View image ' + (index + 1)}
                  disabled={busy || capturing}
                  onClick={() => setPreview(image)}
                >
                  <img src={image.url} alt={'Screenshot ' + (index + 1)} />
                  <span>View and zoom</span>
                </button>
                <figcaption>{image.name}</figcaption>
                <Field
                  label={'Capture time · image ' + (index + 1)}
                  hint={
                    image.timeSource === 'automatic'
                      ? 'Recorded when this frame was captured.'
                      : 'Optional. Importing or pasting does not tell us when it was captured.'
                  }
                >
                  <input
                    type="datetime-local"
                    disabled={busy || capturing}
                    value={image.observedAt ? toLocalInput(image.observedAt) : ''}
                    onChange={(e) =>
                      setImages((current) =>
                        current.map((i) =>
                          i.id === image.id
                            ? {
                                ...i,
                                observedAt: e.target.value ? fromLocalInput(e.target.value) : null,
                                timeSource: e.target.value ? 'manual' : 'unknown',
                              }
                            : i,
                        ),
                      )
                    }
                  />
                </Field>
                <button
                  disabled={busy || capturing}
                  onClick={() => {
                    URL.revokeObjectURL(image.url);
                    urls.current.delete(image.url);
                    setImages((current) => current.filter((i) => i.id !== image.id));
                  }}
                >
                  <Trash2 size={14} /> Remove image {index + 1}
                </button>
              </figure>
            ))}
          </div>
          <div className={s.actions}>
            <button className={s.primary} disabled={busy || capturing} onClick={() => void read()}>
              Read {images.length === 1 ? 'image' : images.length + ' images'}
            </button>
            {busy && (
              <button
                onClick={() => {
                  abort.current?.abort();
                  setStatus('Reading cancelled. Your images are still here.');
                }}
              >
                Cancel reading
              </button>
            )}
          </div>
          <p className={s.hint}>
            Repeated names appear once, with their original observations available for review.
            Different totals need your choice. Image files are kept only while this screen is open;
            saved data includes their names and capture times.
          </p>
        </>
      )}
      {status && <p role="status">{status}</p>}
      {preview && <ImageViewer image={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
