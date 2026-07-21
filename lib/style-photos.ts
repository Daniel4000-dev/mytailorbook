/** Each style's photo — the catalog's static placeholder for built-in
 *  styles (permanent, never overridden by anything that happens in an
 *  order), or the shop's own uploaded photo for a custom style added via
 *  "Add Custom Item". There is no scanning of past orders for a keyword
 *  match: that used to let an unrelated order's photo silently hijack a
 *  built-in style's card whenever its description happened to mention the
 *  same word (e.g. a stray test photo overriding the real Kaftan photo). */
export function getStylePhotos(
  styles: { name: string; photoUrl?: string }[]
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const style of styles) {
    if (style.photoUrl) map[style.name] = style.photoUrl;
  }
  return map;
}
