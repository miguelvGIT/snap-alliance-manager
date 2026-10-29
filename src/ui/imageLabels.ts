import type { Collection } from '../domain/model';

export function imageLabel(observations: Collection['observations'], id: string) {
  const index = observations?.findIndex((image) => image.id === id) ?? -1;
  return index < 0 ? 'Source image unavailable' : `Image ${index + 1}`;
}
export const imageSourceLabel = (source: string) =>
  source === 'screen'
    ? 'Screen capture'
    : source === 'clipboard'
      ? 'Pasted image'
      : 'Uploaded screenshot';
