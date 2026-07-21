import type { Order } from '@/lib/types';

/** The shop's own latest photo of each style — used so garment/measurement
 *  catalog cards double as the atelier's own portfolio instead of stock art. */
export function getStylePhotos(
  orders: Order[],
  styles: { name: string; keywords: string[] }[]
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const style of styles) {
    for (const o of orders) {
      const text = o.orderDetails.toLowerCase();
      if (!style.keywords.some((k) => text.includes(k))) continue;
      const photo = (o.images || [])[o.images!.length - 1];
      if (photo) {
        map[style.name] = photo.url;
        break;
      }
    }
  }
  return map;
}
