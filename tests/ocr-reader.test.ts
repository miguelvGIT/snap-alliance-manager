import { it, expect, vi, afterEach } from 'vitest';
const fake = vi.hoisted(() => ({
  terminate: vi.fn(async () => {}),
  recognize: vi.fn(),
  setParameters: vi.fn(async () => {}),
}));
vi.mock('tesseract.js', () => ({ createWorker: async () => fake, PSM: { SPARSE_TEXT: '11' } }));
import { readImages } from '../src/ocr/reader';
import type { ImageInput } from '../src/ocr/rows';
afterEach(() => vi.unstubAllGlobals());
it('cancels a stalled recognition without waiting for a terminated worker to respond', async () => {
  vi.stubGlobal('location', { href: 'http://127.0.0.1/' });
  vi.stubGlobal('createImageBitmap', async () => ({ width: 100, height: 100, close() {} }));
  vi.stubGlobal('document', {
    createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {} }) }),
  });
  let started!: () => void;
  const recognizing = new Promise<void>((resolve) => {
    started = resolve;
  });
  fake.recognize.mockImplementation(() => {
    started();
    return new Promise(() => {});
  });
  const controller = new AbortController();
  const result = readImages(
    [{ file: new File(['x'], 'test.png'), id: 'image' }] as ImageInput[],
    3,
    0,
    () => {},
    controller.signal,
  );
  const rejection = expect(result).rejects.toMatchObject({ name: 'AbortError' });
  await recognizing;
  controller.abort();
  await rejection;
  expect(fake.terminate).toHaveBeenCalled();
});
