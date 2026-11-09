import { THREE_URL, PREVIEW_KEY } from './config.mjs';
import { createSnowGlobe } from './globe.mjs';
import { photoCanvas, preparePhoto, readCurrentPhoto, relatedUrl } from './media.mjs';
const status=document.getElementById('photo-status'),error=document.getElementById('error-message');
const input=document.getElementById('photo-input'),choose=document.getElementById('choose-photo');
const arLink=document.getElementById('ar-link'),register=document.getElementById('register-link');
const swirl=document.getElementById('swirl'),pause=document.getElementById('pause-snow');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let paused=reduced.matches,globe,renderer,currentState;
function fail(e){error.textContent=e?.message||'表示できませんでした。ページを再読み込みしてください。';error.hidden=false;}
function updateLinks(){arLink.href=relatedUrl('ar.html');const target=relatedUrl('admin.html');target.searchParams.set('tab','upload');register.href=target;}
function updatePause(){pause.textContent=paused?'雪を動かす':'雪を止める';pause.setAttribute('aria-pressed',String(paused));}
async function loadPhoto(){
  error.hidden=true;
  try{
    currentState=await readCurrentPhoto();
    const isTicket=!!currentState.ticket;
    choose.hidden=isTicket;
    document.getElementById('privacy-note').textContent=isTicket?'印刷したQRから、いつでもこの写真を開けます。':'選んだ写真は、このタブ内だけでプレビューします。アップロードはされません。';
    document.getElementById('pending-actions').hidden=currentState.state!=='pending';
    status.textContent=({demo:'サンプル · 写真を選んで試せます',preview:'あなたの写真でプレビュー中',ready:'あなたの写真が届いています',pending:'写真を準備しています。登録後、同じQRで開けます。'})[currentState.state];
    globe?.setPhoto(photoCanvas(currentState.image,currentState.state==='pending'));
    arLink.hidden=currentState.state==='pending';
  }catch(e){status.textContent='写真を読み込めませんでした';arLink.hidden=true;choose.hidden=new URL(location.href).searchParams.has('id');document.getElementById('pending-actions').hidden=false;fail(e);}
  updateLinks();
}
async function initialize(){
  await loadPhoto();
  const THREE=await import(THREE_URL);
  const holder=document.getElementById('globe-canvas');
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(37,1,.1,100);camera.position.set(.2,2.35,6.3);camera.lookAt(0,1.35,0);
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}
  catch{
    const {createFallback}=await import('./fallback.mjs');
    globe=createFallback(holder,photoCanvas(currentState?.image,currentState?.state==='pending'));
    document.querySelector('.stage-tag').textContent='2D PREVIEW';document.querySelector('.stage-detail').hidden=true;
    document.querySelector('.stage-caption').textContent='この環境では2Dで表示しています。ARは対応スマホでお試しください。';
    let last=performance.now(),animation;
    function render(now){const dt=(now-last)/1000;last=now;if(!paused&&!document.hidden)globe.update(dt);globe.render();animation=requestAnimationFrame(render);}animation=requestAnimationFrame(render);
    window.addEventListener('pagehide',()=>{cancelAnimationFrame(animation);globe.dispose();},{once:true});
    window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
    swirl.disabled=false;pause.disabled=false;updatePause();return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000,0);renderer.domElement.tabIndex=0;
  renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','写真立ての周囲に雪が降るスノードーム。左右の矢印キーでも回転できます。');holder.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xeef5ff,0x6f6553,2.4));
  const key=new THREE.DirectionalLight(0xffeed5,3.2);key.position.set(3,6,4);scene.add(key);
  const fill=new THREE.DirectionalLight(0xdcefff,1.4);fill.position.set(-4,3,-3);scene.add(fill);
  globe=createSnowGlobe(THREE,photoCanvas(currentState?.image,currentState?.state==='pending'));scene.add(globe.root);globe.root.rotation.y=-.10;
  const shadowGeo=new THREE.CircleGeometry(1.52,64),shadowMat=new THREE.MeshBasicMaterial({color:0x355749,transparent:true,opacity:.08,depthWrite:false});
  const shadow=new THREE.Mesh(shadowGeo,shadowMat);shadow.rotation.x=-Math.PI/2;shadow.position.y=-.02;scene.add(shadow);
  const resize=()=>{const w=holder.clientWidth,h=holder.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(holder);resize();
  let pointer=null,lastX=0;
  renderer.domElement.addEventListener('pointerdown',e=>{pointer=e.pointerId;lastX=e.clientX;renderer.domElement.setPointerCapture(e.pointerId);});
  renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;globe.root.rotation.y+=(e.clientX-lastX)*.008;lastX=e.clientX;});
  const release=()=>{pointer=null;};renderer.domElement.addEventListener('pointerup',release);renderer.domElement.addEventListener('pointercancel',release);
  renderer.domElement.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();globe.root.rotation.y+=(e.key==='ArrowLeft'?-.12:.12);}});
  let last=performance.now(),animation;
  function render(now){const dt=(now-last)/1000;last=now;if(!paused&&!document.hidden)globe.update(dt);renderer.render(scene,camera);animation=requestAnimationFrame(render);}animation=requestAnimationFrame(render);
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(animation);renderer.dispose();globe.dispose();shadowGeo.dispose();shadowMat.dispose();},{once:true});
  window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
  swirl.disabled=false;pause.disabled=false;updatePause();
}
choose.addEventListener('click',()=>input.click());
input.addEventListener('change',async()=>{
  if(!input.files[0])return;choose.disabled=true;error.hidden=true;
  try{
    const photo=await preparePhoto(input.files[0]);
    try{sessionStorage.setItem(PREVIEW_KEY,photo.dataUrl);const url=new URL(location.href);url.search='?preview=1';url.hash='';history.replaceState(null,'',url);}catch{document.getElementById('privacy-note').textContent='この画面だけでプレビューしています。ARに切り替えるにはタブ内の保存を許可してください。';}
    globe?.setPhoto(photoCanvas(photo.image));status.textContent='あなたの写真でプレビュー中';updateLinks();
  }catch(e){fail(e);}finally{choose.disabled=false;input.value='';}
});
document.getElementById('reload-photo').addEventListener('click',()=>loadPhoto());
swirl.addEventListener('click',()=>{globe?.swirl();if(!reduced.matches){paused=false;updatePause();}});
pause.addEventListener('click',()=>{paused=!paused;updatePause();});
reduced.addEventListener('change',e=>{if(e.matches){paused=true;updatePause();}});
initialize().catch(()=>{status.textContent='3D表示を開始できませんでした';fail(new Error('3D表示を開始できませんでした。通信を確認し、SafariまたはChromeで開き直してください。'));});
