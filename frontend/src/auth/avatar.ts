import { useSyncExternalStore } from 'react';

// ponytail: фото хранится в localStorage этого браузера; для общего доступа — загрузка на бэкенд
const key = (id: string) => `soilink.avatar.${id}`;
const listeners = new Set<() => void>();

function read(id: string) {
  try { return localStorage.getItem(key(id)); } catch { return null; }
}

/** Сохраняет фото (data URL) или удаляет его при null. false — не хватило места / приватный режим */
export function setAvatar(id: string, dataUrl: string | null) {
  try {
    if (dataUrl) localStorage.setItem(key(id), dataUrl);
    else localStorage.removeItem(key(id));
  } catch {
    return false;
  }
  listeners.forEach(l => l());
  return true;
}

export function useAvatar(id: string) {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => read(id),
  );
}

/** Центральный квадрат кадра → JPEG 256×256, чтобы фото с телефона влезало в localStorage */
export function toAvatarDataUrl(src: CanvasImageSource, width: number, height: number) {
  const size = 256;
  const side = Math.min(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  canvas.getContext('2d')!.drawImage(src, (width - side) / 2, (height - side) / 2, side, side, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.85);
}
