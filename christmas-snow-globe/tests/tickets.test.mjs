import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createTicket,ticketUrl,parseTicket,encryptPhoto,decryptPhoto,fromBase64Url,toBase64Url } from '../tickets.mjs';
globalThis.crypto ??= webcrypto;
const base='https://met-achievements.github.io/The-8th-ITAMI-Workshop-March-/christmas-snow-globe/';
test('preprinted URLs retain ID, number, and secret through viewer/admin/AR links',()=>{
  const ticket=createTicket(12),url=ticketUrl(ticket,base);
  assert.deepEqual(parseTicket(url),ticket);
  assert.ok(!new URL(url).search.includes(ticket.key));
  const ar=new URL('ar.html',url);ar.search=new URL(url).search;ar.hash=new URL(url).hash;
  assert.deepEqual(parseTicket(ar.href),ticket);
});
test('a photo registered later is decrypted with exactly the original preprinted QR',async()=>{
  const ticket=createTicket(1),original=ticketUrl(ticket,base),bytes=new TextEncoder().encode('sample jpeg bytes');
  const encrypted=await encryptPhoto(bytes,ticket);
  const restored=await decryptPhoto(JSON.parse(JSON.stringify(encrypted)),parseTicket(original));
  assert.deepEqual(new Uint8Array(await restored.arrayBuffer()),bytes);
  assert.ok(!JSON.stringify(encrypted).includes(ticket.key));
});
test('wrong key, swapped ID, tampered ciphertext and malformed IV cannot open a photo',async()=>{
  const a=createTicket(1),b=createTicket(2),record=await encryptPhoto(new Uint8Array([1,2,3,4,5]),a);
  await assert.rejects(decryptPhoto(record,{...a,key:b.key}));
  await assert.rejects(decryptPhoto(record,{...a,id:b.id}));
  const bytes=fromBase64Url(record.data);bytes[0]^=1;
  await assert.rejects(decryptPhoto({...record,data:toBase64Url(bytes)},a));
  await assert.rejects(decryptPhoto({...record,iv:'AA'},a));
});
test('replacements keep the URL stable and use a fresh nonce',async()=>{
  const ticket=createTicket(5),url=ticketUrl(ticket,base),bytes=new Uint8Array([7,8,9]);
  const first=await encryptPhoto(bytes,ticket),second=await encryptPhoto(bytes,ticket);
  assert.notEqual(first.iv,second.iv);assert.notEqual(first.data,second.data);
  assert.equal(ticketUrl(ticket,base),url);
});
test('incomplete, malformed and non-web QR inputs are rejected',()=>{
  for(const value of [base,base+'?id=../bad#k=abc','javascript:alert(1)','https://example.com/?id=x#k=y'])assert.throws(()=>parseTicket(value));
});
