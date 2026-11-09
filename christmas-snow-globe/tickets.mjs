// Keys live in the QR fragment and in the staff's downloaded ticket list, never in photos/.
const ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const encoder = new TextEncoder();
export function toBase64Url(bytes) {
  let text = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    text += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function fromBase64Url(text) {
  if (typeof text !== 'string' || !/^[A-Za-z0-9_-]+$/.test(text) || text.length % 4 === 1) {
    throw new Error('データの形式が正しくありません。');
  }
  return Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}
export function validateTicket(ticket) {
  if (!ID_PATTERN.test(ticket?.id) || !KEY_PATTERN.test(ticket?.key) || fromBase64Url(ticket.key).length !== 32) {
    throw new Error('QRの情報が不足しています。印刷したQRを読み直してください。');
  }
  return ticket;
}
export function createTicket(number) {
  return {
    id: toBase64Url(crypto.getRandomValues(new Uint8Array(16))),
    key: toBase64Url(crypto.getRandomValues(new Uint8Array(32))),
    number: String(number).padStart(3, '0')
  };
}
export function ticketUrl(ticket, baseUrl) {
  validateTicket(ticket);
  const url = new URL('./', baseUrl);
  url.search = '';
  url.searchParams.set('id', ticket.id);
  if (ticket.number) url.searchParams.set('n', ticket.number);
  url.hash = new URLSearchParams({ k: ticket.key }).toString();
  return url.href;
}
export function parseTicket(input, baseUrl) {
  let url;
  try { url = new URL(input, baseUrl); } catch { throw new Error('QRのURLを入力してください。'); }
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('QRのURLを入力してください。');
  const ticket = {
    id: url.searchParams.get('id'),
    key: new URLSearchParams(url.hash.slice(1)).get('k'),
    number: (url.searchParams.get('n') || '').slice(0, 12)
  };
  return validateTicket(ticket);
}
export async function encryptPhoto(bytes, ticket) {
  validateTicket(ticket);
  if (!bytes.byteLength || bytes.byteLength > 2_000_000) throw new Error('写真のサイズが大きすぎます。');
  const key = await crypto.subtle.importKey('raw', fromBase64Url(ticket.key), 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(ticket.id), tagLength: 128 }, key, bytes);
  return { version: 1, algorithm: 'AES-GCM', iv: toBase64Url(iv), data: toBase64Url(new Uint8Array(cipher)) };
}
export async function decryptPhoto(record, ticket) {
  validateTicket(ticket);
  if (record?.version !== 1 || record.algorithm !== 'AES-GCM' || typeof record.data !== 'string' || record.data.length > 2_700_000) {
    throw new Error('写真の登録ファイルを読み込めません。');
  }
  const iv = fromBase64Url(record.iv);
  if (iv.length !== 12) throw new Error('写真の登録ファイルを読み込めません。');
  const key = await crypto.subtle.importKey('raw', fromBase64Url(ticket.key), 'AES-GCM', false, ['decrypt']);
  const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(ticket.id), tagLength: 128 }, key, fromBase64Url(record.data));
  if (bytes.byteLength > 2_000_000) throw new Error('写真のサイズが大きすぎます。');
  return new Blob([bytes], { type: 'image/jpeg' });
}
