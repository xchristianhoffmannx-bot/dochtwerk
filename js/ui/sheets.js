// Die beiden Sheets rund ums Foto: Quelle wählen, Kerze benennen.
import { h, sheet, field, textInput, selectInput } from './components.js';
import { T } from '../texts.js';

const P = T.photo, K = T.candle;

// -> 'camera' | 'gallery' | null
export const pickSource = () => sheet({
  title: P.addTitle,
  actions: [
    { label: P.camera, value: 'camera', primary: true },
    { label: P.gallery, value: 'gallery' },
    { label: P.cancel, value: null },
  ],
});

// -> { name, side } | null (side nur sinnvoll mit Foto)
export async function askName({ withPhoto }) {
  const name = textInput({ id: 'sheet-name', inputmode: 'text' });
  const side = selectInput({ id: 'sheet-side', value: 'yes', options: [['yes', P.yes], ['no', P.no]], onchange: () => {} });
  const body = h('div', { class: 'form' },
    field(K.name, name),
    withPhoto && field(K.thisIsSide, side));
  const ok = await sheet({
    title: K.saveTitle, body,
    actions: [{ label: K.save, value: 'ok', primary: true }, { label: P.cancel, value: null }],
  });
  return ok ? { name: name.value, side: side.value === 'yes' } : null;
}
