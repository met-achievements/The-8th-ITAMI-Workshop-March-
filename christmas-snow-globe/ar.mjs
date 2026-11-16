import { createSnowGlobe } from './globe.mjs';
import { readCurrentPhoto, photoCanvas, relatedUrl } from './media.mjs';
import { ticketUrl } from './tickets.mjs';
import { createTicketPattern, ticketPatternRatio } from './ticket-marker.mjs';

const setup = document.getElementById('ar-start');
const start = document.getElementById('start-camera');
const retry = document.getElementById('retry-photo');
const message = document.getElementById('ar-message');
const error = document.getElementById('ar-error');
const status = document.getElementById('tracking-status');
const params = new URL(location.href).searchParams;
const isTicket = params.has('id');
const usesKeychain = isTicket && params.get('marker') !== 'hiro';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const globeViewTilt = Math.PI / 12;
const trackingHint = usesKeychain
  ? '番号を下にして、キーホルダーの黒枠全体を画面に入れてください。'
  : 'マーカーの黒枠全体を画面に入れてください。';

const previewUrl = relatedUrl('./');
previewUrl.searchParams.delete('marker');
if (isTicket) previewUrl.searchParams.set('view', '3d');
document.getElementById('back-link').href = previewUrl;

const staffLink = document.getElementById('ar-register');
staffLink.href = relatedUrl('admin.html');
staffLink.hidden = !isTicket;
const hiroLink = document.getElementById('hiro-link');
const hiroUrl = relatedUrl('ar.html');
hiroUrl.searchParams.set('marker', 'hiro');
hiroLink.href = hiroUrl;

let photo, scene, globe, patternUrl, cameraSize;
let leaving = false;

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = resolve;
    script.onerror = () => reject(new Error('ARの読み込みに失敗しました。通信を確認して再度お試しください。'));
    document.head.append(script);
  });
}

async function loadPhoto() {
  error.hidden = true;
  start.hidden = true;
  retry.hidden = true;
  message.textContent = '写真を確認しています…';
  try {
    photo = await readCurrentPhoto();
    if (photo.state === 'pending') {
      message.textContent = '写真を準備しています。登録が済んだら、もう一度確認してください。';
      retry.hidden = false;
      return;
    }
    message.textContent = trackingHint;
    start.hidden = false;
    hiroLink.hidden = !usesKeychain;
    document.getElementById('hiro-help').hidden = usesKeychain;
  } catch (cause) {
    message.textContent = '写真を読み込めませんでした。';
    error.textContent = cause.message;
    error.hidden = false;
    retry.hidden = false;
  }
}

function stopCamera() {
  window.removeEventListener('camera-error', cameraError);
  window.removeEventListener('arjs-video-loaded', cameraReady);
  cameraSize?.disconnect();
  cameraSize = null;
  document.querySelectorAll('video').forEach(video => {
    video.srcObject?.getTracks?.().forEach(track => track.stop());
    video.remove();
  });
  scene?.remove();
  scene = null;
  globe?.dispose();
  globe = null;
  if (patternUrl) URL.revokeObjectURL(patternUrl);
  patternUrl = null;
  document.documentElement.classList.remove('camera-active');
}

function showCameraError(text) {
  stopCamera();
  setup.hidden = false;
  status.hidden = true;
  start.disabled = false;
  start.textContent = 'カメラで見る';
  error.textContent = text;
  error.hidden = false;
}

function cameraError() {
  showCameraError('カメラを起動できませんでした。ブラウザのカメラ許可を確認してください。');
}

function cameraReady(event) {
  status.textContent = trackingHint;
  const video = event.detail.component;
  cameraSize = new ResizeObserver(() => {
    if (!scene) return;
    // Clip the renderer and the camera feed to the same rectangle on phones.
    const { width, height } = video.getBoundingClientRect();
    const viewport = document.documentElement;
    scene.style.width = width + 'px';
    scene.style.height = height + 'px';
    scene.style.left = (viewport.clientWidth - width) / 2 + 'px';
    scene.style.top = (viewport.clientHeight - height) / 2 + 'px';
    scene.resize();
  });
  cameraSize.observe(video);
  cameraSize.observe(document.documentElement);
}

function registerSnow(AFRAME) {
  if (AFRAME.components['christmas-snow']) return;
  const { THREE } = AFRAME;
  AFRAME.registerComponent('christmas-snow', {
    init() {
      this.markerRotation = new THREE.Quaternion();
      this.cameraRotation = new THREE.Quaternion();
      this.viewUp = new THREE.Vector3();
    },
    tick(_time, delta) {
      const marker = this.el.object3D;
      const camera = this.el.sceneEl.camera;
      if (!globe || !marker.visible || !camera) return;

      // Keep the frame upright in the camera view as the keychain tilts.
      marker.getWorldQuaternion(this.markerRotation);
      camera.getWorldQuaternion(this.cameraRotation);
      this.viewUp.set(0, 1, 0)
        .applyQuaternion(this.cameraRotation)
        .applyQuaternion(this.markerRotation.invert());
      const { y, z } = this.viewUp;
      if (Math.hypot(y, z) > 0.1) {
        globe.root.rotation.x = Math.atan2(z, y) + globeViewTilt;
      }
      if (!reducedMotion.matches) globe.update(delta / 1000);
    },
  });
}

async function startCamera() {
  if (!photo || photo.state === 'pending' || start.disabled) return;
  start.disabled = true;
  start.textContent = 'カメラを準備しています…';
  error.hidden = true;
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('このブラウザではカメラを使えません。SafariまたはChromeで開いてください。');
    }
    if (!window.AFRAME) await loadScript('https://aframe.io/releases/1.4.0/aframe.min.js');
    if (!window.AFRAME.systems.arjs) {
      await loadScript('https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/aframe/build/aframe-ar.js');
    }
    const pattern = usesKeychain ? await createTicketPattern(ticketUrl(photo.ticket, location.href)) : null;
    if (leaving) return;
    if (pattern) patternUrl = URL.createObjectURL(pattern);

    const AFRAME = window.AFRAME;
    registerSnow(AFRAME);
    scene = document.createElement('a-scene');
    scene.setAttribute('embedded', '');
    scene.setAttribute('vr-mode-ui', 'enabled: false');
    scene.setAttribute('renderer', 'alpha: true; antialias: true; colorManagement: true');
    const ratio = usesKeychain ? ticketPatternRatio : 0.5;
    scene.setAttribute('arjs', 'sourceType: webcam; debugUIEnabled: false; detectionMode: mono; trackingMethod: best; patternRatio: ' + ratio);

    const ambient = document.createElement('a-light');
    ambient.setAttribute('type', 'ambient');
    ambient.setAttribute('intensity', '1.5');
    const directional = document.createElement('a-light');
    directional.setAttribute('type', 'directional');
    directional.setAttribute('intensity', '1.8');
    directional.setAttribute('position', '2 5 3');

    const marker = document.createElement('a-marker');
    if (patternUrl) {
      marker.setAttribute('type', 'pattern');
      marker.setAttribute('url', patternUrl);
    } else {
      marker.setAttribute('preset', 'hiro');
    }
    marker.setAttribute('emitevents', 'true');
    marker.setAttribute('smooth', 'true');
    marker.setAttribute('smoothCount', '5');
    marker.setAttribute('christmas-snow', '');
    marker.addEventListener('markerFound', () => { status.textContent = 'スノードームを表示中'; });
    marker.addEventListener('markerLost', () => { status.textContent = trackingHint; });

    const entity = document.createElement('a-entity');
    globe = createSnowGlobe(AFRAME.THREE, photoCanvas(photo.image));
    globe.root.scale.setScalar(0.60);
    entity.addEventListener('loaded', () => { if (globe) entity.object3D.add(globe.root); }, { once: true });
    marker.append(entity);

    const camera = document.createElement('a-entity');
    camera.setAttribute('camera', '');
    camera.setAttribute('look-controls', 'enabled: false');
    scene.append(ambient, directional, marker, camera);
    window.addEventListener('camera-error', cameraError, { once: true });
    window.addEventListener('arjs-video-loaded', cameraReady, { once: true });
    status.textContent = 'カメラを起動しています…';
    status.hidden = false;
    setup.hidden = true;
    document.documentElement.classList.add('camera-active');
    document.body.append(scene);
  } catch (cause) {
    if (!leaving) showCameraError(cause.message);
  }
}

window.addEventListener('pagehide', () => { leaving = true; stopCamera(); });
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
start.addEventListener('click', startCamera);
retry.addEventListener('click', loadPhoto);
loadPhoto();
