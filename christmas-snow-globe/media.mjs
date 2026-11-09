import { PREVIEW_KEY } from './config.mjs';
import { parseTicket, decryptPhoto } from './tickets.mjs';
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('写真を開けませんでした。JPEG・PNG・WebPの写真を選んでください。'));
    image.src = src;
  });
}
export async function preparePhoto(file) {
  if (!file || file.size > 25_000_000) throw new Error('25MB以下の写真を選んでください。');
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('JPEG・PNG・WebPの写真を選んでください。HEICはJPEGに変換してください。');
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .86));
    if (!blob) throw new Error('写真を変換できませんでした。別の写真を選んでください。');
    return { blob, dataUrl: canvas.toDataURL('image/jpeg', .86), image };
  } finally { URL.revokeObjectURL(url); }
}
export function downloadFile(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export function relatedUrl(page) {
  const url = new URL(page, location.href);
  url.search = location.search; url.hash = location.hash;
  return url;
}
export async function readCurrentPhoto() {
  const url = new URL(location.href);
  if (url.searchParams.has('id')) {
    const ticket = parseTicket(url.href);
    const photoUrl = new URL(`photos/${ticket.id}.json`, import.meta.url);
    const response = await fetch(photoUrl, { cache: 'no-store', credentials: 'omit' });
    if (response.status === 404) return { state: 'pending', ticket };
    if (!response.ok) throw new Error('写真を取得できませんでした。通信を確認して、もう一度開いてください。');
    const size = Number(response.headers.get('content-length') || 0);
    if (size > 3_000_000) throw new Error('登録ファイルのサイズが大きすぎます。');
    let blob;
    try { blob = await decryptPhoto(await response.json(), ticket); }
    catch { throw new Error('このQRの写真を開けませんでした。登録したQRと写真の組み合わせを確認してください。'); }
    const objectUrl = URL.createObjectURL(blob);
    try { return { state: 'ready', image: await loadImage(objectUrl), ticket }; }
    finally { URL.revokeObjectURL(objectUrl); }
  }
  if (url.searchParams.get('preview') === '1') {
    let data;
    try { data = sessionStorage.getItem(PREVIEW_KEY); } catch { /* Private mode can block storage. */ }
    if (data) return { state: 'preview', image: await loadImage(data) };
  }
  return { state: 'demo' };
}
export function photoCanvas(image, pending = false) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 768;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f8f4e9'; ctx.fillRect(0, 0, 1024, 768);
  if (image) {
    const scale = Math.min(984 / image.naturalWidth, 728 / image.naturalHeight);
    const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
    ctx.drawImage(image, (1024-w)/2, (768-h)/2, w, h);
  } else {
    const g = ctx.createLinearGradient(0, 0, 1024, 768);
    g.addColorStop(0, '#153e3e'); g.addColorStop(1, '#2e6660');
    ctx.fillStyle = g; ctx.fillRect(24, 24, 976, 720);
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = 'rgba(255,255,255,.36)';ctx.beginPath();
      ctx.arc((i*137.5)%976+24, (i*89.2)%720+24, 1.5+(i%3), 0, Math.PI*2);ctx.fill();
    }
    ctx.textAlign = 'center'; ctx.fillStyle = '#e8d4a4';
    ctx.font = '34px Georgia, serif';ctx.fillText('CHRISTMAS MEMORIES', 512, 296);
    ctx.font = 'italic 100px Georgia, serif';ctx.fillText('Merry', 512, 414);
    ctx.fillText('Christmas', 512, 516);
    ctx.font = '28px system-ui, sans-serif';ctx.fillStyle = '#ffffff';
    ctx.fillText(pending ? '写真を準備しています' : 'あなたの思い出を、この中に。', 512, 644);
  }
  return canvas;
}
