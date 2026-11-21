// Screenshot routes for Leonida Key Art Studio. Two families of query:
//   ?shot=1|3|4  deterministic full-window renders (landscape key art, portrait panels, square duo)
//   ?shot=2      the editor, plain
//   ?shot=cover  the kit route: square key art, with ?photo=<sample>&caption=<words>
//   ?shot=editor the kit route: the editor with a sample photo loaded and the caption as title
// Returns a plain descriptor; main.js applies it. Null means "just open the studio".

export function parseShot(params) {
  const shot = params.get('shot');
  if (!shot) return null;
  if (shot === '1') return { kind: 'render', w: 1920, h: 1080, mode: 'keyart', popOut: true };
  if (shot === '3') return { kind: 'render', w: 1080, h: 1350, mode: 'panels', panelCount: 6 };
  if (shot === '4') return { kind: 'render', w: 1080, h: 1080, mode: 'duo' };
  if (shot === 'cover') {
    return {
      kind: 'render', w: 1080, h: 1080, mode: 'keyart', popOut: true,
      photo: params.get('photo'), caption: params.get('caption'),
    };
  }
  if (shot === '2') return { kind: 'editor' };
  if (shot === 'editor') {
    return { kind: 'editor', photo: params.get('photo'), caption: params.get('caption') };
  }
  return null;
}
