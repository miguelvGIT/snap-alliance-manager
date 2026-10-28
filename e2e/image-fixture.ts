import type { Page } from '@playwright/test';
export async function scoreImage(page: Page, rows: [string, string][]) {
  const data = await page.evaluate((rows) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 100 + rows.length * 90;
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#111';
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = '#fff';
    c.font = '32px Arial';
    c.textBaseline = 'middle';
    c.fillText('Player', 40, 40);
    c.fillText('Cube', 450, 40);
    c.fillText('Bounty', 620, 40);
    c.fillText('Total', 830, 40);
    rows.forEach(([name, points], i) => {
      const y = 125 + i * 90;
      c.fillText(name, 40, y);
      c.fillText('0', 450, y);
      c.fillText(points, 620, y);
      c.fillText(points, 830, y);
    });
    return canvas.toDataURL('image/png').split(',')[1];
  }, rows);
  return Buffer.from(data, 'base64');
}
