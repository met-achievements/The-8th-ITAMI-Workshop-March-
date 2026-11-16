// Canvas preview for browsers where WebGL is unavailable.
export function createFallback(holder, initialPhoto) {
  const canvas = document.createElement('canvas');
  holder.append(canvas);
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '写真と雪だるまと雪が入ったスノードームの2Dプレビュー');
  const ctx = canvas.getContext('2d');
  let photo = initialPhoto;
  let time = 0;
  let boost = 0;
  let width = 0;
  let height = 0;
  const flakes = Array.from({ length: 84 }, (_, i) => ({
    x: Math.sin(i * 17.17) * .92, y: (i * .618034) % 1, front: i % 3 === 0,
    size: 1.1 + i % 4 * .25, speed: .07 + i % 5 * .013, phase: i * 1.9,
  }));

  function ellipse(x, y, rx, ry, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function triangle(x, bottom, halfWidth, height, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x - halfWidth, bottom);
    ctx.lineTo(x, bottom - height);
    ctx.lineTo(x + halfWidth, bottom);
    ctx.fill();
  }
  function tree(x, bottom, height, color) {
    ctx.fillStyle = '#674638';
    ctx.fillRect(x - height * .04, bottom - height * .15, height * .08, height * .15);
    for (let tier = 0; tier < 3; tier++) {
      const y = bottom - height * (.13 + tier * .21);
      const half = height * (.19 - tier * .034);
      triangle(x, y, half, height * .45, color);
      triangle(x, y - height * .14, half * .68, height * .31, '#f2f6f2');
    }
  }
  function drawSnowman(x, floor, unit) {
    ctx.save();
    ctx.translate(x, floor);
    ctx.scale(unit, unit);
    ellipse(0, -.106, .116, .112, '#edf4f6');
    ellipse(.01, -.249, .089, .083, '#f3f7f8');
    ellipse(.018, -.363, .070, .065, '#fff');
    ellipse(-.006, -.374, .009, .011, '#25252b');
    ellipse(.042, -.379, .009, .011, '#25252b');
    ctx.fillStyle = '#de8540';
    ctx.beginPath();
    ctx.moveTo(.015, -.357);
    ctx.lineTo(.080, -.350);
    ctx.lineTo(.016, -.332);
    ctx.fill();
    ctx.fillStyle = '#ab312e';
    ctx.fillRect(-.045, -.312, .123, .027);
    ctx.fillRect(.047, -.304, .028, .070);
    ellipse(.005, -.240, .008, .008, '#29242a');
    ellipse(.001, -.171, .008, .008, '#29242a');
    ctx.fillStyle = '#27252a';
    ctx.fillRect(-.030, -.477, .096, .056);
    ellipse(.018, -.421, .077, .013, '#27252a');
    ctx.fillStyle = '#ab312e';
    ctx.fillRect(-.030, -.438, .096, .014);
    ctx.restore();
  }

  function drawFlakes(front, cx, cy, r, clear) {
    for (const flake of flakes) {
      if (flake.front !== front) continue;
      const y = ((flake.y + time * flake.speed) % 1) * 1.83 - .92;
      const x = flake.x + Math.sin(time + flake.phase) * .025;
      if (x * x + y * y > .94 || y > .72) continue;
      const px = cx + x * r;
      const py = cy + y * r;
      if (front && px > clear.left && px < clear.right && py > clear.top && py < clear.bottom) continue;
      const opacity = front ? .9 : .48;
      ellipse(px, py, flake.size, flake.size, 'rgba(255,255,255,' + opacity + ')');
    }
  }

  function render() {
    ctx.clearRect(0, 0, width, height);
    const r = Math.min(width * .466, height * .457);
    if (!r) return;
    const cx = width / 2;
    const cy = height * .491;
    const floor = cy + r * .73;
    const edge = Math.asin((floor - cy) / r);
    const aspect = photo.width / photo.height;
    const photoWidth = r * Math.min(1.36, 1.10 * aspect);
    const photoHeight = photoWidth / aspect;
    const photoLeft = cx - r * .086 - photoWidth / 2;
    const photoTop = cy - photoHeight * .565;
    const trim = r * .034;
    const plaque = r * .143;
    const frame = { left: photoLeft - trim, top: photoTop - trim,
      right: photoLeft + photoWidth + trim, bottom: photoTop + photoHeight + plaque + trim };

    ellipse(cx, floor + r * .25, r * .95, r * .075, 'rgba(35,78,66,.10)');
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI - edge, 2 * Math.PI + edge);
    ctx.closePath();
    ctx.clip();
    const glass = ctx.createRadialGradient(cx - r * .40, cy - r * .53, r * .04, cx, cy, r);
    glass.addColorStop(0, '#f9fdfd');
    glass.addColorStop(.78, '#e2f0ed');
    glass.addColorStop(1, '#bfd8d8');
    ctx.fillStyle = glass;
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    drawFlakes(false, cx, cy, r, frame);

    ellipse(cx, floor, r * .83, r * .137, '#f9fcfa');
    tree(cx - .72 * r, floor - .02 * r, .89 * r, '#174b3d');
    tree(cx - .48 * r, floor - .12 * r, 1.44 * r, '#2b6454');
    tree(cx - .13 * r, floor - .18 * r, 1.12 * r, '#174b3d');
    tree(cx + .40 * r, floor - .14 * r, 1.47 * r, '#174b3d');
    tree(cx + .71 * r, floor - .04 * r, .93 * r, '#2b6454');

    ctx.fillStyle = '#694337';
    ctx.fillRect(cx - r * .114, frame.bottom - trim, r * .055, Math.max(0, floor - frame.bottom + trim));
    const frameWidth = frame.right - frame.left;
    const frameHeight = frame.bottom - frame.top;
    ctx.fillStyle = '#694337';
    ctx.fillRect(frame.left + r * .022, frame.top + r * .025, frameWidth, frameHeight);
    ctx.fillStyle = '#c29a59';
    ctx.fillRect(frame.left, frame.top, frameWidth, frameHeight);
    ctx.drawImage(photo, photoLeft, photoTop, photoWidth, photoHeight);
    const labelY = photoTop + photoHeight;
    ctx.fillStyle = '#1d4238';
    ctx.fillRect(photoLeft, labelY, photoWidth, plaque);
    ctx.fillStyle = '#ffebbb';
    ctx.font = 'italic ' + r * .085 + 'px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Merry Christmas', photoLeft + photoWidth / 2, labelY + plaque * .54, photoWidth * .95);

    drawSnowman(cx + r * .74, floor - r * .045, r);
    drawFlakes(true, cx, cy, r, frame);
    ctx.restore();

    ctx.strokeStyle = 'rgba(120,173,179,.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI - edge, 2 * Math.PI + edge);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.70)';
    ctx.lineWidth = Math.max(2, r * .022);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r * .90, Math.PI * 1.19, Math.PI * 1.36);
    ctx.stroke();

    const base = r * .83;
    ctx.fillStyle = '#58372a';
    ctx.fillRect(cx - base, floor, base * 2, r * .18);
    ellipse(cx, floor + r * .18, base, r * .060, '#58372a');
    ellipse(cx, floor, base, r * .083, '#c29a59');
    ellipse(cx, floor - r * .025, base * .96, r * .055, '#fffef8');
  }

  function resize() {
    width = holder.clientWidth;
    height = holder.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(holder);
  resize();
  return {
    setPhoto(value) { photo = value; render(); },
    update(dt) { time += Math.min(dt, .05) * (1 + boost * 2); boost = Math.max(0, boost - dt * .3); },
    render,
    swirl() { boost = 1; },
    dispose() { observer.disconnect(); },
  };
}
