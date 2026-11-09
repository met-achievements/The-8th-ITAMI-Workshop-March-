import { createSnowGlobe } from './globe.mjs';
import { readCurrentPhoto,photoCanvas,relatedUrl } from './media.mjs';
const start=document.getElementById('start-camera'),error=document.getElementById('ar-error'),status=document.getElementById('tracking-status');
document.getElementById('back-link').href=relatedUrl('./');
function loadScript(url){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=url;script.onload=resolve;script.onerror=()=>reject(new Error('ARの読み込みに失敗しました。通信を確認して再度お試しください。'));document.head.append(script);});}
let scene,globe;
function stopCamera(){document.querySelectorAll('video').forEach(video=>video.srcObject?.getTracks?.().forEach(track=>track.stop()));scene?.remove();scene=null;globe?.dispose();globe=null;}
window.addEventListener('pagehide',stopCamera);
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
start.addEventListener('click',async()=>{
  start.disabled=true;start.textContent='準備しています…';error.hidden=true;
  try{
    const photo=await readCurrentPhoto();
    if(photo.state==='pending')throw new Error('写真を準備しています。写真の登録後に、同じQRからもう一度開いてください。');
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('このブラウザではカメラを使えません。SafariまたはChromeで開いてください。');
    if(!window.AFRAME)await loadScript('https://aframe.io/releases/1.4.0/aframe.min.js');
    if(!window.AFRAME.systems.arjs)await loadScript('https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/aframe/build/aframe-ar.js');
    const THREE=window.AFRAME.THREE;
    if(!window.AFRAME.components['christmas-snow'])window.AFRAME.registerComponent('christmas-snow',{tick(_time,delta){if(globe&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&this.el.object3D.visible)globe.update(delta/1000);}});
    scene=document.createElement('a-scene');
    scene.setAttribute('embedded','');scene.setAttribute('vr-mode-ui','enabled: false');
    scene.setAttribute('renderer','alpha: true; antialias: true; colorManagement: true');
    scene.setAttribute('arjs','sourceType: webcam; debugUIEnabled: false; detectionMode: mono; trackingMethod: best;');
    const ambient=document.createElement('a-light');ambient.setAttribute('type','ambient');ambient.setAttribute('intensity','1.5');scene.append(ambient);
    const directional=document.createElement('a-light');directional.setAttribute('type','directional');directional.setAttribute('intensity','1.8');directional.setAttribute('position','2 5 3');scene.append(directional);
    const marker=document.createElement('a-marker');marker.setAttribute('preset','hiro');marker.setAttribute('emitevents','true');marker.setAttribute('smooth','true');marker.setAttribute('smoothCount','5');
    marker.setAttribute('christmas-snow','');scene.append(marker);
    const entity=document.createElement('a-entity');marker.append(entity);
    globe=createSnowGlobe(THREE,photoCanvas(photo.image));globe.root.scale.setScalar(.60);
    entity.addEventListener('loaded',()=>entity.object3D.add(globe.root),{once:true});
    const camera=document.createElement('a-entity');camera.setAttribute('camera','');camera.setAttribute('look-controls','enabled: false');scene.append(camera);
    marker.addEventListener('markerFound',()=>status.textContent='スノードームを表示中 · 台紙を画面に入れたまま動かせます');
    marker.addEventListener('markerLost',()=>status.textContent='台紙の黒枠マーカー全体を画面に入れてください');
    const cameraError=()=>{
      stopCamera();document.getElementById('ar-start').hidden=false;status.hidden=true;
      error.textContent='カメラを起動できませんでした。ブラウザのカメラ許可を確認して、ページを開き直してください。';error.hidden=false;
      start.disabled=false;start.textContent='カメラを起動する ↗';
    };
    window.addEventListener('camera-error',cameraError,{once:true});scene.addEventListener('camera-error',cameraError,{once:true});
    document.getElementById('ar-start').hidden=true;status.hidden=false;document.body.append(scene);
  }catch(e){stopCamera();error.textContent=e.message;error.hidden=false;start.disabled=false;start.textContent='カメラを起動する ↗';}
});
