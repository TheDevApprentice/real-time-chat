export type MediaPermission = 'microphone' | 'camera';

function storageKey(name: MediaPermission) {
  return `perm:${name}`;
}

export function getStoredPermission(name: MediaPermission): 'granted' | 'denied' | 'prompt' | null {
  try {
    const v = localStorage.getItem(storageKey(name));
    return (v as any) || null;
  } catch {
    return null;
  }
}

export function setStoredPermission(name: MediaPermission, state: 'granted' | 'denied' | 'prompt') {
  try { localStorage.setItem(storageKey(name), state); } catch {}
}

async function queryPermission(name: MediaPermission): Promise<'granted' | 'denied' | 'prompt' | null> {
  try {
    const p: any = (navigator as any).permissions;
    if (p?.query) {
      const res = await p.query({ name } as PermissionDescriptor);
      return res.state as any;
    }
  } catch {}
  return null;
}

export async function ensureAudioPermission(): Promise<boolean> {
  // 1) Check stored flag
  const stored = getStoredPermission('microphone');
  if (stored === 'granted') return true;

  // 2) Ask the Permissions API
  const q = await queryPermission('microphone');
  if (q === 'granted') { setStoredPermission('microphone', 'granted'); return true; }

  // 3) Fallback: try to getUserMedia
  try {
    if (navigator?.mediaDevices?.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      try { stream.getTracks().forEach(t => t.stop()); } catch {}
      setStoredPermission('microphone', 'granted');
      return true;
    }
  } catch (e) {
    setStoredPermission('microphone', 'denied');
    return false;
  }
  return false;
}

export async function ensureVideoPermission(): Promise<boolean> {
  // 1) Check stored flag
  const storedMic = getStoredPermission('microphone');
  const storedCam = getStoredPermission('camera');
  if (storedMic === 'granted' && storedCam === 'granted') return true;

  // 2) Ask the Permissions API
  const qMic = await queryPermission('microphone');
  const qCam = await queryPermission('camera');
  if (qMic === 'granted' && qCam === 'granted') {
    setStoredPermission('microphone', 'granted');
    setStoredPermission('camera', 'granted');
    return true;
  }

  // 3) Fallback: try to getUserMedia
  try {
    if (navigator?.mediaDevices?.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      try { stream.getTracks().forEach(t => t.stop()); } catch {}
      setStoredPermission('microphone', 'granted');
      setStoredPermission('camera', 'granted');
      return true;
    }
  } catch (e) {
    if (qMic !== 'granted') setStoredPermission('microphone', 'denied');
    if (qCam !== 'granted') setStoredPermission('camera', 'denied');
    return false;
  }
  return false;
}
