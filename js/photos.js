// Fotos aufnehmen/wählen, verkleinern (2000 px, JPEG 0,85) und Thumbnail (400 px, JPEG 0,8) erzeugen.

// Skalierte Größe, nie hochskalieren
export function fitSize(w, h, maxEdge) {
  const k = Math.min(1, maxEdge / Math.max(w, h));
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

async function render(bmp, maxEdge, quality) {
  const { w, h } = fitSize(bmp.width, bmp.height, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
  if (!blob) throw new Error('Foto konnte nicht umgewandelt werden');
  return { blob, width: w, height: h };
}

// File -> { blob, thumb, width, height, createdAt }
export async function processFile(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const main = await render(bmp, 2000, 0.85);
    const thumb = await render(bmp, 400, 0.8);
    return { blob: main.blob, thumb: thumb.blob, width: main.width, height: main.height, createdAt: new Date().toISOString() };
  } finally {
    bmp.close?.();
  }
}

// Kamera (capture) oder Galerie des Handys. Löst mit null auf, wenn nichts gewählt wurde.
export function pickImage(camera) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (camera) input.capture = 'environment';
    input.addEventListener('change', () => resolve(input.files[0] || null));
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

// Object-URLs sammeln und beim Verlassen des Screens freigeben (Spec 3.7)
export class UrlBag {
  urls = new Set();
  make(blob) {
    const u = URL.createObjectURL(blob);
    this.urls.add(u);
    return u;
  }
  free(url) {
    if (this.urls.delete(url)) URL.revokeObjectURL(url);
  }
  freeAll() {
    this.urls.forEach((u) => URL.revokeObjectURL(u));
    this.urls.clear();
  }
}
