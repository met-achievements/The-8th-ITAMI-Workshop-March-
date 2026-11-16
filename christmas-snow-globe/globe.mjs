// Procedural geometry shared by the 3D viewer and AR.js (A-Frame's THREE).
import { loadSnowman } from './snowman.mjs';

export const globeRadius = 1.69;
export const globeCenterY = 1.47;

export function createSnowGlobe(THREE, initialCanvas) {
  const root = new THREE.Group();
  const owned = new Set();
  let disposed = false;
  function material(options) {
    const result = new THREE.MeshStandardMaterial(options);
    owned.add(result);
    return result;
  }
  function mesh(geometry, surface, x, y, z, parent = root) {
    owned.add(geometry);
    const object = new THREE.Mesh(geometry, surface);
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  }

  const wood = material({ color: 0x4c2f25, roughness: .72 });
  const gold = material({ color: 0xc29a59, roughness: .47, metalness: .3 });
  const snow = material({ color: 0xf4f6f4, roughness: .94 });
  const pine = material({ color: 0x174b3d, roughness: .92 });
  const fir = material({ color: 0x2b6454, roughness: .92 });
  const floorY = .38;
  const footRadius = Math.sqrt(globeRadius ** 2 - (globeCenterY - floorY) ** 2);

  mesh(new THREE.CylinderGeometry(1.30, 1.36, .26, 64), wood, 0, .13, 0);
  mesh(new THREE.CylinderGeometry(1.37, 1.37, .035, 64), gold, 0, .035, 0);
  mesh(new THREE.CylinderGeometry(1.35, 1.35, .045, 64), gold, 0, .27, 0);
  mesh(new THREE.CylinderGeometry(footRadius + .012, 1.33, .10, 64), snow, 0, .33, 0);

  // The shell is clear face-on and catches more light at grazing angles.
  const glass = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    vertexShader: /* glsl */ `
      varying vec3 surfaceNormal;
      varying vec3 toEye;
      void main() {
        vec4 point = modelViewMatrix * vec4(position, 1.0);
        surfaceNormal = normalMatrix * normal;
        toEye = -point.xyz;
        gl_Position = projectionMatrix * point;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 surfaceNormal;
      varying vec3 toEye;
      float highlight(float radius, float angle, float ring, float width, vec2 sweep) {
        float band = 1.0 - smoothstep(width * .24, width, abs(radius - ring));
        return band * smoothstep(sweep.x, sweep.x + .15, angle)
          * (1.0 - smoothstep(sweep.y - .15, sweep.y, angle));
      }
      void main() {
        vec3 normal = normalize(surfaceNormal);
        vec3 eye = isOrthographic ? vec3(0.0, 0.0, 1.0) : normalize(toEye);
        float facing = clamp(dot(normal, eye), 0.0, 1.0);
        float edge = pow(1.0 - facing, 2.8);
        float outline = 1.0 - smoothstep(.02, .26, facing);
        float radius = length(normal.xy);
        float angle = atan(normal.y, normal.x);
        float margin = max(smoothstep(.56, .69, normal.y), smoothstep(.70, .84, abs(normal.x)));
        float reflection = highlight(radius, angle, .84, .054, vec2(1.98, 2.73)) * .79
          + highlight(radius, angle, .94, .018, vec2(1.87, 2.68)) * .43
          + highlight(radius, angle, .92, .044, vec2(-.44, .76)) * .37;
        reflection *= margin;
        float reflectedShade = highlight(radius, angle, .84, .115, vec2(1.91, 2.80)) * margin * .12;
        float tint = .016 + edge * .32 + outline * .24 + reflectedShade;
        vec3 blueGlass = mix(vec3(.67, .86, .89), vec3(.34, .61, .66), max(outline, reflectedShade * 2.0));
        vec3 light = mix(blueGlass, vec3(.99, 1.0, 1.0), reflection / (tint + reflection));
        gl_FragColor = vec4(light, min(.83, tint + reflection));
      }
    `,
  });
  owned.add(glass);
  const cutoff = Math.acos((floorY - globeCenterY) / globeRadius);
  const shell = mesh(new THREE.SphereGeometry(globeRadius, 64, 48, 0, Math.PI * 2, 0, cutoff),
    glass, 0, globeCenterY, 0);
  shell.name = 'Glass dome';
  shell.renderOrder = 8;
  const rim = new THREE.MeshBasicMaterial({
    color: 0xa9ccd0, transparent: true, opacity: .56, depthWrite: false, toneMapped: false,
  });
  owned.add(rim);
  const foot = mesh(new THREE.TorusGeometry(footRadius, .019, 10, 80), rim, 0, floorY + .012, 0);
  foot.rotation.x = Math.PI / 2;

  const frame = new THREE.Group();
  frame.name = 'Photo frame';
  frame.position.set(-.15, 1.52, .16);
  root.add(frame);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const backing = mesh(box, wood, 0, 0, -.045, frame);
  const upperRail = mesh(box, gold, 0, 0, .016, frame);
  const lowerRail = mesh(box, gold, 0, 0, .016, frame);
  const leftRail = mesh(box, gold, 0, 0, .016, frame);
  const rightRail = mesh(box, gold, 0, 0, .016, frame);
  const stand = mesh(box, wood, 0, .59, -.17);
  stand.scale.set(.09, .46, .10);
  stand.rotation.x = .42;

  const pictureMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const inscriptionMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  owned.add(pictureMaterial);
  owned.add(inscriptionMaterial);
  const plane = new THREE.PlaneGeometry(1, 1);
  const picture = mesh(plane, pictureMaterial, 0, 0, .066, frame);
  picture.name = 'Photo';
  const inscription = mesh(plane, inscriptionMaterial, 0, 0, .074, frame);
  inscription.name = 'Merry Christmas';
  let pictureWidth, pictureHeight;

  function setTexture(surface, canvas) {
    surface.map?.dispose();
    const texture = new THREE.CanvasTexture(canvas);
    if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
    else if (THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
    texture.anisotropy = 4;
    surface.map = texture;
    surface.needsUpdate = true;
  }

  function setPhoto(canvas) {
    const aspect = canvas.width / canvas.height;
    pictureWidth = Math.min(2.16, 1.76 * aspect);
    pictureHeight = pictureWidth / aspect;
    picture.scale.set(pictureWidth, pictureHeight, 1);

    const trim = .062;
    const captionRail = .216;
    const outerWidth = pictureWidth + 2 * trim;
    backing.scale.set(outerWidth, pictureHeight + trim + captionRail, .12);
    backing.position.y = (trim - captionRail) / 2;
    upperRail.position.y = (pictureHeight + trim) / 2;
    upperRail.scale.set(outerWidth, trim, .108);
    lowerRail.position.y = -(pictureHeight + captionRail) / 2;
    lowerRail.scale.set(outerWidth, captionRail, .108);
    leftRail.position.x = -(pictureWidth + trim) / 2;
    rightRail.position.x = (pictureWidth + trim) / 2;
    leftRail.scale.set(trim, pictureHeight, .108);
    rightRail.scale.copy(leftRail.scale);

    const plaqueWidth = outerWidth - .068;
    const plaqueHeight = captionRail - .038;
    inscription.position.y = lowerRail.position.y;
    inscription.scale.set(plaqueWidth, plaqueHeight, 1);
    const plaque = document.createElement('canvas');
    plaque.width = Math.round(plaqueWidth * 640);
    plaque.height = Math.round(plaqueHeight * 640);
    const ink = plaque.getContext('2d');
    ink.fillStyle = '#1d4238';
    ink.fillRect(0, 0, plaque.width, plaque.height);
    ink.fillStyle = '#ffebbb';
    ink.textAlign = 'center';
    ink.textBaseline = 'middle';
    ink.font = 'italic bold 80px Georgia, serif';
    ink.fillText('Merry Christmas', plaque.width / 2, plaque.height * .54, plaque.width - 56);

    setTexture(inscriptionMaterial, plaque);
    setTexture(pictureMaterial, canvas);
    update(0);
  }

  function tree(x, z, height, foliage) {
    const trunk = .23 * height;
    mesh(new THREE.CylinderGeometry(.023, .039, trunk, 9), wood, x, floorY + trunk / 2, z);
    for (let tier = 0; tier < 3; tier++) {
      const width = (.255 - .044 * tier) * Math.sqrt(height);
      const y = floorY + height * (.30 + .19 * tier);
      const crown = height * .46;
      mesh(new THREE.ConeGeometry(width, crown, 16), foliage, x, y, z);
      mesh(new THREE.ConeGeometry(width * .70, crown * .65, 16), snow, x, y + crown * .19, z);
    }
  }
  tree(-1.05, -.23, 1.21, pine);
  tree(-.58, -.66, 2.17, fir);
  tree(1.03, -.40, 1.29, pine);

  const snowman = new THREE.Group();
  snowman.name = 'Snowman';
  snowman.position.set(1.02, floorY, .53);
  snowman.rotation.y = -.08;
  snowman.scale.setScalar(.80);
  root.add(snowman);
  loadSnowman(THREE).then(figure => {
    const resources = [figure.geometry, ...figure.material];
    if (disposed) {
      resources.forEach(resource => resource.dispose());
      return;
    }
    resources.forEach(resource => owned.add(resource));
    snowman.add(figure);
  }).catch(error => console.warn(error.message));

  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 32;
  const brush = sprite.getContext('2d');
  const gradient = brush.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(.55, 'rgba(255,255,255,.95)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  brush.fillStyle = gradient;
  brush.fillRect(0, 0, 32, 32);
  const snowTexture = new THREE.CanvasTexture(sprite);
  owned.add(snowTexture);

  const count = 132;
  const positions = new Float32Array(count * 3);
  const flakes = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * 1.42;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const verticalRadius = Math.sqrt(globeRadius ** 2 - radius ** 2);
    const top = globeCenterY + verticalRadius - .06;
    const bottom = Math.max(floorY, globeCenterY - verticalRadius + .06);
    return { x, z, top, bottom, y: bottom + Math.random() * (top - bottom),
      speed: .13 + Math.random() * .19, phase: Math.random() * Math.PI * 2 };
  });
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  owned.add(snowGeo);
  const snowMaterial = new THREE.PointsMaterial({
    color: 0xffffff, size: .031, map: snowTexture, transparent: true, opacity: .86, depthWrite: false, alphaTest: .03,
  });
  owned.add(snowMaterial);
  const particles = new THREE.Points(snowGeo, snowMaterial);
  particles.frustumCulled = false;
  root.add(particles);
  let time = 0;
  let burst = 0;

  function update(dt) {
    dt = Math.min(Math.max(dt, 0), .05);
    time += dt;
    burst = Math.max(0, burst - dt * .38);
    flakes.forEach((flake, index) => {
      flake.y -= dt * (flake.speed + burst * .75);
      if (flake.y < flake.bottom) flake.y = flake.top;
      let x = flake.x + Math.sin(time * .65 + flake.phase) * (.025 + burst * .04);
      let z = flake.z + Math.cos(time * .5 + flake.phase) * .02;
      if (z > frame.position.z && Math.abs(x - frame.position.x) < pictureWidth / 2 + .12
          && Math.abs(flake.y - frame.position.y) < pictureHeight / 2 + .25) {
        z = -z;
      }
      const boundary = Math.sqrt(Math.max(0, globeRadius ** 2 - (flake.y - globeCenterY) ** 2)) - .035;
      const horizontal = Math.hypot(x, z);
      if (horizontal > boundary && horizontal > 0) {
        const fit = Math.max(0, boundary) / horizontal;
        x *= fit;
        z *= fit;
      }
      positions.set([x, flake.y, z], index * 3);
    });
    snowGeo.attributes.position.needsUpdate = true;
  }

  setPhoto(initialCanvas);
  return {
    root, setPhoto, update,
    swirl() { burst = 1; },
    dispose() {
      disposed = true;
      pictureMaterial.map.dispose();
      inscriptionMaterial.map.dispose();
      owned.forEach(object => object.dispose());
    },
  };
}
