import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, X } from 'lucide-react';
import { toAvatarDataUrl } from '@/auth/avatar';

export function CameraCapture({ onCapture, onClose }: { onCapture: (dataUrl: string) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let stream: MediaStream | undefined;
    let cancelled = false;
    // Promise.resolve — чтобы отсутствие mediaDevices (не https) тоже ушло в catch
    Promise.resolve()
      .then(() => navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }))
      .then(s => {
        if (cancelled) { s.getTracks().forEach(tr => tr.stop()); return; }
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; stream?.getTracks().forEach(tr => tr.stop()); };
  }, []);

  const snap = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    onCapture(toAvatarDataUrl(v, v.videoWidth, v.videoHeight));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-5 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-bold">{t('settings.takePhoto')}</h3>
          <button onClick={onClose} aria-label={t('common.close')} className="p-1.5 rounded-lg hover:bg-black/5"><X className="w-4 h-4" /></button>
        </div>
        {error
          ? <p className="text-[13px] text-[#6e6e73] py-8 text-center">{t('settings.cameraError')}</p>
          : <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-square object-cover rounded-2xl bg-black -scale-x-100" />}
        {!error && (
          <button onClick={snap} className="w-full flex items-center justify-center gap-2 py-3 bg-[#0071e3] text-white rounded-xl text-[14px] font-bold hover:bg-[#0077ed]">
            <Camera className="w-4 h-4" /> {t('settings.capture')}
          </button>
        )}
      </div>
    </div>
  );
}
