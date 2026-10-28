import { test, expect } from '@playwright/test';
import { scoreImage } from './image-fixture';
async function start(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByLabel('Alliance name', { exact: true }).fill('Image team');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Image team', exact: true })).toBeVisible();
  await page.goto('/#week');
}
test('AC11 AC55 AC67 AC90: multiple images and clipboard OCR stay local and await review', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const outside: string[] = [],
    sent: string[] = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (['http:', 'https:'].includes(url.protocol) && url.hostname !== '127.0.0.1')
      outside.push(r.url());
    if (r.method() === 'POST' || r.method() === 'PUT') sent.push(r.url());
  });
  await start(page);
  await expect(page.getByLabel('Names and points')).toHaveCount(0);
  await expect(page.getByLabel('Screenshot columns')).toHaveCount(0);
  const a = await scoreImage(page, [['Ana', '2700']]),
    b = await scoreImage(page, [['Bruno', '3500']]);
  await page.getByLabel('Add images', { exact: true }).setInputFiles([
    { name: 'first.png', mimeType: 'image/png', buffer: a },
    { name: 'second.png', mimeType: 'image/png', buffer: b },
  ]);
  await expect(page.getByLabel('Capture time · image 1')).toHaveValue('');
  await page.getByLabel('Capture time · image 1').fill('2026-10-27T18:55');
  await page.getByRole('button', { name: 'View image 1', exact: true }).click();
  const viewer = page.getByRole('dialog', { name: 'Image preview' });
  await expect(viewer).toBeVisible();
  await viewer.getByRole('button', { name: 'Actual size', exact: true }).click();
  await expect(viewer.getByLabel('Image zoom')).toHaveText('100%');
  await viewer.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(viewer.getByLabel('Image zoom')).toHaveText('150%');
  await viewer.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await expect(viewer.getByLabel('Image zoom')).toHaveText('100%');
  await viewer.getByRole('button', { name: 'Fit image', exact: true }).click();
  await page.screenshot({ path: info.outputPath('image-zoom.png') });
  await page.keyboard.press('Escape');
  await expect(viewer).toHaveCount(0);
  await page.getByRole('region', { name: 'Paste screenshots here' }).evaluate((element, base64) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const clipboardData = new DataTransfer();
    clipboardData.items.add(new File([bytes], 'clipboard.png', { type: 'image/png' }));
    element.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }),
    );
  }, a.toString('base64'));
  await expect(page.getByLabel('Capture time · image 3')).toHaveValue('');
  await page.screenshot({ path: info.outputPath('image-intake.png'), fullPage: true });
  await page.getByRole('button', { name: 'Read 3 images', exact: true }).click();
  await expect(page.getByLabel('Observed name · row 1')).toBeVisible({ timeout: 90000 });
  expect(
    await page
      .getByLabel(/Observed name · row/)
      .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value)),
  ).toEqual(['Ana', 'Bruno']);
  expect(
    await page
      .getByLabel('Points', { exact: true })
      .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value)),
  ).toEqual(['2700', '3500']);
  await expect(page.getByLabel('I confirm this list is complete')).not.toBeChecked();
  await expect(page.getByText('Unknown name', { exact: true })).toHaveCount(2);
  await expect(page.getByText('2 matching observations · one score')).toBeVisible();
  await page.getByRole('button', { name: 'View reference image 1', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Image preview' })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.screenshot({ path: info.outputPath('image-review.png'), fullPage: true });
  expect(outside).toEqual([]);
  expect(sent).toEqual([]);
});
test('AC09 AC55: repeated names with different totals need one explicit choice', async ({
  page,
}) => {
  test.setTimeout(120000);
  await start(page);
  await page.getByLabel('Add images', { exact: true }).setInputFiles([
    {
      name: 'earlier.png',
      mimeType: 'image/png',
      buffer: await scoreImage(page, [['Alpha', '2700']]),
    },
    {
      name: 'later.png',
      mimeType: 'image/png',
      buffer: await scoreImage(page, [['Alpha', '2900']]),
    },
  ]);
  await page.getByRole('button', { name: 'Read 2 images', exact: true }).click();
  await expect(page.getByLabel('Observed name · row 1')).toBeVisible({ timeout: 90000 });
  await expect(page.getByLabel(/Observed name · row/)).toHaveCount(1);
  await expect(page.getByLabel('Points', { exact: true })).toHaveValue('');
  await expect(page.getByText('Different totals in these images.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: /Use 2.?900 points/ }).click();
  await expect(page.getByLabel('Points', { exact: true })).toHaveValue('2900');
  await page.getByText('Original observations', { exact: true }).click();
  await expect(page.getByText(/earlier.png · 2.?700 points/)).toBeVisible();
  await expect(page.getByText(/later.png · 2.?900 points/)).toBeVisible();
});
test('AC56: assisted capture timestamps frames and releases sharing on stop and exit', async ({
  page,
}) => {
  test.setTimeout(120000);
  await start(page);
  const png = await scoreImage(page, [['Ana', '2700']]);
  await page.evaluate(async (base64) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 190;
    const c = canvas.getContext('2d')!;
    const bitmap = await createImageBitmap(
      new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], { type: 'image/png' }),
    );
    c.drawImage(bitmap, 0, 0);
    bitmap.close();
    (window as any).__streams = [];
    Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
      configurable: true,
      value: async () => {
        const stream = canvas.captureStream(2);
        (window as any).__streams.push(stream);
        const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
        const timer = setInterval(() => {
          if (track.readyState === 'ended') clearInterval(timer);
          else {
            c.fillRect(0, 0, 1, 1);
            track.requestFrame();
          }
        }, 100);
        return stream;
      },
    });
  }, png.toString('base64'));
  await page.getByRole('button', { name: 'Capture game window' }).click();
  await expect(page.getByLabel('Capture time · image 1')).not.toHaveValue('');
  await page.getByRole('button', { name: 'Stop capture' }).click();
  expect(
    await page.evaluate(() =>
      (window as any).__streams[0]
        .getTracks()
        .every((t: MediaStreamTrack) => t.readyState === 'ended'),
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'View image 1', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Image preview' })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Read image', exact: true }).click();
  await expect(page.getByLabel('Observed name · row 1', { exact: true })).toHaveValue('Ana', {
    timeout: 90000,
  });
  await expect(page.getByLabel('Points', { exact: true })).toHaveValue('2700');
  await page.getByRole('button', { name: 'Back to images', exact: true }).click();
  await page.getByRole('button', { name: 'Capture game window' }).click();
  await expect(page.getByLabel('Capture time · image 2')).toBeVisible();
  await page.goto('/#overview');
  expect(
    await page.evaluate(() =>
      (window as any).__streams.every((s: MediaStream) =>
        s.getTracks().every((t) => t.readyState === 'ended'),
      ),
    ),
  ).toBe(true);
});
test('AC90: clipboard button accepts images without a saved file and invalid files leave data unchanged', async ({
  page,
}) => {
  await start(page);
  const png = await scoreImage(page, [['Ana', '2700']]);
  await page.evaluate((base64) => {
    const blob = new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], {
      type: 'image/png',
    });
    Object.defineProperty(navigator.clipboard, 'read', {
      configurable: true,
      value: async () => [{ types: ['image/png'], getType: async () => blob }],
    });
  }, png.toString('base64'));
  await page.getByRole('button', { name: 'Paste images', exact: true }).click();
  await expect(page.getByLabel('Capture time · image 1')).toBeVisible();
  await page.getByRole('button', { name: 'Remove image 1' }).click();
  await page.getByLabel('Add images', { exact: true }).setInputFiles({
    name: 'wrong.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not an image'),
  });
  await expect(page.getByRole('alert')).toContainText('Use PNG, JPEG or WebP');
  await expect(page.getByRole('button', { name: 'Read image', exact: true })).toHaveCount(0);
});
