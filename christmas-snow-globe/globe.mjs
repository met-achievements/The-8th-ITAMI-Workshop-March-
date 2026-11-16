// Procedural geometry shared by the 3D viewer and AR.js (A-Frame's THREE).
export const globeRadius = 1.64;
export const globeCenterY = 1.47;

export function createSnowGlobe(THREE, initialCanvas) {
  const root = new THREE.Group();
  const owned = new Set();
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
  const scarlet = material({ color: 0xab312e, roughness: .79 });
  const coal = material({ color: 0x221e24, roughness: .84 });
  const carrot = material({ color: 0xe78336, roughness: .85 });
  const floorY = .38;

  mesh(new THREE.CylinderGeometry(1.30, 1.36, .26, 64), wood, 0, .13, 0);
  mesh(new THREE.CylinderGeometry(1.37, 1.37, .035, 64), gold, 0, .035, 0);
  mesh(new THREE.CylinderGeometry(1.35, 1.35, .045, 64), gold, 0, .27, 0);
  mesh(new THREE.CylinderGeometry(1.21, 1.29, .10, 64), snow, 0, .33, 0);

  // Leave the glass clear across the image, with its rim and reflections at the sides.
  const glass = material({
    color: 0xcbe9ef, transparent: true, opacity: .035, roughness: .12, depthWrite: false,
  });
  const cutoff = Math.acos((floorY - globeCenterY) / globeRadius);
  mesh(new THREE.SphereGeometry(globeRadius, 48, 32, 0, Math.PI * 2, 0, cutoff),
    glass, 0, globeCenterY, 0).renderOrder = 8;
  const rim = new THREE.LineBasicMaterial({ color: 0x88b8c0, transparent: true, opacity: .52, depthWrite: false });
  owned.add(rim);
  const outline = Array.from({ length: 97 }, (_, index) => {
    const angle = -cutoff + 2 * cutoff * index / 96;
    return new THREE.Vector3(Math.sin(angle) * globeRadius, globeCenterY + Math.cos(angle) * globeRadius, 0);
  });
  const contour = new THREE.BufferGeometry().setFromPoints(outline);
  owned.add(contour);
  root.add(new THREE.Line(contour, rim));
  const reflection = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .26, depthWrite: false });
  owned.add(reflection);
  mesh(new THREE.SphereGeometry(globeRadius * 1.002, 8, 16, 1.87, .12, .35, .54),
    reflection, 0, globeCenterY, 0).renderOrder = 9;

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
  tree(-1.03, -.20, 1.18, pine);
  tree(-.77, -.48, 2.59, fir);
  tree(-.23, -.92, 1.41, pine);
  tree(.70, -.50, 2.66, pine);
  tree(.99, -.33, 1.35, fir);

  const snowman = new THREE.Group();
  snowman.name = 'Snowman';
  snowman.position.set(1.165, floorY, .17);
  root.add(snowman);
  function ball(radius, surface, x, y, z) {
    return mesh(new THREE.SphereGeometry(radius, 18, 12), surface, x, y, z, snowman);
  }
  ball(.173, snow, 0, .17, 0);
  ball(.136, snow, .02, .385, .02);
  ball(.104, snow, .041, .565, .035);
  ball(.017, coal, .002, .58, .128);
  ball(.017, coal, .078, .58, .128);
  const nose = mesh(new THREE.ConeGeometry(.025, .09, 12), carrot, .045, .546, .165, snowman);
  nose.rotation.x = Math.PI / 2;
  ball(.016, coal, .028, .393, .154);
  ball(.017, coal, .011, .236, .169);
  mesh(new THREE.CylinderGeometry(.100, .107, .055, 24), scarlet, .032, .474, .025, snowman);
  const scarf = mesh(box, scarlet, .089, .412, .122, snowman);
  scarf.scale.set(.047, .135, .026);
  scarf.rotation.z = .26;
  mesh(new THREE.CylinderGeometry(.116, .116, .023, 24), coal, .041, .655, .035, snowman);
  mesh(new THREE.CylinderGeometry(.072, .084, .108, 24), coal, .041, .712, .035, snowman);
  mesh(new THREE.CylinderGeometry(.084, .086, .025, 24), scarlet, .041, .673, .035, snowman);

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
      pictureMaterial.map.dispose();
      inscriptionMaterial.map.dispose();
      owned.forEach(object => object.dispose());
    },
  };
}
