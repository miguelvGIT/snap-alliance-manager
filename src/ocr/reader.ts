import type { Worker } from 'tesseract.js';
import { imageCollection, imageRows, type ImageInput } from './rows';
function abortable<T>(task: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const cancel = () => reject(new DOMException('Reading cancelled', 'AbortError'));
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
    task.then(
      (value) => {
        signal.removeEventListener('abort', cancel);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', cancel);
        reject(error);
      },
    );
  });
}
export async function readImages(
  images: ImageInput[],
  columns: number,
  fromRight: number,
  progress: (message: string) => void,
  signal: AbortSignal,
) {
  let worker: Worker | undefined;
  const cancel = () => {
    void worker?.terminate().catch(() => {});
  };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    if (signal.aborted) throw new DOMException('Reading cancelled', 'AbortError');
    const { createWorker, PSM } = await import('tesseract.js');
    const starting = createWorker('eng', 1, {
      workerPath: new URL('/ocr/worker.min.js', location.href).href,
      corePath: new URL('/ocr/core/', location.href).href,
      langPath: new URL('/ocr/lang/', location.href).href,
      workerBlobURL: false,
      errorHandler: () => {},
      logger: (message) => {
        if (!signal.aborted)
          progress(
            message.status === 'recognizing text'
              ? 'Reading text · ' + Math.round(message.progress * 100) + '%'
              : 'Preparing local image reader…',
          );
      },
    });
    // Worker initialization cannot be interrupted through Tesseract's public API.
    // Release a late worker after cancellation without keeping the UI blocked.
    void starting
      .then((created) => {
        if (signal.aborted) void created.terminate().catch(() => {});
      })
      .catch(() => {});
    worker = await abortable(starting, signal);
    if (signal.aborted) throw new DOMException('Reading cancelled', 'AbortError');
    await abortable(
      worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        preserve_interword_spaces: '1',
      }),
      signal,
    );
    const lines = [];
    for (let index = 0; index < images.length; index++) {
      if (signal.aborted) throw new DOMException('Reading cancelled', 'AbortError');
      progress('Reading image ' + (index + 1) + ' of ' + images.length + '…');
      const bitmap = await createImageBitmap(images[index].file);
      const scale = Math.min(
        2,
        Math.max(1, 1600 / bitmap.width),
        4096 / Math.max(bitmap.width, bitmap.height),
      );
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext('2d')!;
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const { data } = await abortable(
        worker.recognize(canvas, {}, { text: true, blocks: true }),
        signal,
      );
      const words =
        data.blocks?.flatMap((block) =>
          block.paragraphs.flatMap((paragraph) => paragraph.lines.flatMap((line) => line.words)),
        ) ?? [];
      lines.push(...imageRows(words, images[index].id, columns, fromRight));
      canvas.width = 0;
      canvas.height = 0;
    }
    if (!lines.length)
      throw new Error(
        'No player rows were found. Use clear screenshots showing the player names and score columns. You can also try the Player / Total layout for a cropped table.',
      );
    return imageCollection(images, lines);
  } finally {
    signal.removeEventListener('abort', cancel);
    await worker?.terminate().catch(() => {});
  }
}
