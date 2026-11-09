// Procedural geometry shared by the Three.js viewer and AR.js (A-Frame's THREE).
export function createSnowGlobe(THREE, initialCanvas) {
  const root = new THREE.Group();
  const owned = new Set();
  const mat = (options) => { const m = new THREE.MeshStandardMaterial(options); owned.add(m); return m; };
  const wood = mat({ color: 0x5b3328, roughness: .65, metalness: .04 });
  const gold = mat({ color: 0xcaa46e, roughness: .34, metalness: .65 });
  const snow = mat({ color: 0xf8f7ef, roughness: .95 });
  const green = mat({ color: 0x1e564b, roughness: .9 });
  function mesh(geometry, material, x, y, z) {
    owned.add(geometry); const object = new THREE.Mesh(geometry, material);
    object.position.set(x,y,z); root.add(object); return object;
  }
  mesh(new THREE.CylinderGeometry(1.25,1.30,.26,64),wood,0,.13,0);
  mesh(new THREE.CylinderGeometry(1.31,1.31,.035,64),gold,0,.035,0);
  mesh(new THREE.CylinderGeometry(1.29,1.29,.045,64),gold,0,.27,0);
  mesh(new THREE.CylinderGeometry(1.19,1.23,.10,64),snow,0,.33,0);
  const radius = 1.39, centerY = 1.43, minY = .40;
  const glassMaterial = mat({ color: 0xc8e6e9, transparent: true, opacity: .055, metalness: .12, roughness: .08, side: THREE.FrontSide, depthWrite: false });
  // Crop the lower spherical cap at the snow-covered platform.
  const glass = mesh(new THREE.SphereGeometry(radius,48,32,0,Math.PI*2,0,Math.acos((minY-centerY)/radius)), glassMaterial,0,centerY,0);
  glass.renderOrder = 8;
  const rimMat = new THREE.LineBasicMaterial({ color: 0xd3eaeb, transparent: true, opacity: .33, depthWrite: false });owned.add(rimMat);
  const rimPoints=[];
  for(let i=0;i<=90;i++){const a=i/90*Math.PI*2;rimPoints.push(new THREE.Vector3(Math.cos(a)*radius,centerY+Math.sin(a)*radius,0));}
  const rimGeo = new THREE.BufferGeometry().setFromPoints(rimPoints);owned.add(rimGeo);
  root.add(new THREE.Line(rimGeo,rimMat));
  const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent:true, opacity:.22, depthWrite:false });owned.add(shineMat);
  const shine = mesh(new THREE.SphereGeometry(radius*1.002,8,16,.33,.16,.38,.76),shineMat,0,centerY,0);shine.renderOrder=9;
  const frame = new THREE.Group(); frame.position.set(0,1.22,.07);frame.rotation.y=-.10;root.add(frame);
  function frameBox(w,h,d,m,x,y,z) { const g=new THREE.BoxGeometry(w,h,d);owned.add(g);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);frame.add(o);return o; }
  frameBox(1.60,1.25,.075,wood,0,0,-.015);
  frameBox(1.70,.075,.11,gold,0,.65,.03);frameBox(1.70,.075,.11,gold,0,-.65,.03);
  frameBox(.075,1.25,.11,gold,-.815,0,.03);frameBox(.075,1.25,.11,gold,.815,0,.03);
  const support=frameBox(.06,.69,.06,wood,0,-.38,-.30);support.rotation.x=.43;
  let texture;
  const pictureMat = new THREE.MeshBasicMaterial({ color:0xffffff });owned.add(pictureMat);
  const pictureGeo = new THREE.PlaneGeometry(1.55,1.18);owned.add(pictureGeo);
  const picture = new THREE.Mesh(pictureGeo,pictureMat);picture.position.z=.035;frame.add(picture);
  function setPhoto(canvas) {
    if(texture)texture.dispose();texture=new THREE.CanvasTexture(canvas);
    if(THREE.SRGBColorSpace)texture.colorSpace=THREE.SRGBColorSpace;
    else if(THREE.sRGBEncoding)texture.encoding=THREE.sRGBEncoding;
    pictureMat.map=texture;pictureMat.needsUpdate=true;
  }
  setPhoto(initialCanvas);
  function tree(x,z,scale) {
    mesh(new THREE.CylinderGeometry(.04,.055,.28,8),wood,x,.49,z);
    for(let i=0;i<3;i++){
      mesh(new THREE.ConeGeometry((.28-i*.055)*scale,.47*scale,16),green,x,.65+i*.19*scale,z);
      mesh(new THREE.ConeGeometry((.22-i*.045)*scale,.31*scale,16),snow,x,.76+i*.19*scale,z);
    }
  }
  tree(-.84,-.05,.84);tree(.86,-.28,.67);
  const sprite=document.createElement('canvas');sprite.width=32;sprite.height=32;
  const context=sprite.getContext('2d');const gradient=context.createRadialGradient(16,16,0,16,16,15);
  gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.5,'rgba(255,255,255,.9)');gradient.addColorStop(1,'rgba(255,255,255,0)');
  context.fillStyle=gradient;context.fillRect(0,0,32,32);
  const snowTexture=new THREE.CanvasTexture(sprite);owned.add(snowTexture);
  const count=200,positions=new Float32Array(count*3),flakes=[];
  for(let i=0;i<count;i++) {
    const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*1.24;
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    const top=centerY+Math.sqrt(Math.max(0,radius*radius-x*x-z*z))-.06;
    const bottom=Math.max(minY,centerY-Math.sqrt(Math.max(0,radius*radius-x*x-z*z))+.06);
    const y=bottom+Math.random()*(top-bottom);
    flakes.push({x,z,y,top,bottom,speed:.13+Math.random()*.18,phase:Math.random()*Math.PI*2});
    positions.set([x,y,z],i*3);
  }
  const snowGeo=new THREE.BufferGeometry();snowGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));owned.add(snowGeo);
  const snowMat=new THREE.PointsMaterial({color:0xffffff,size:.039,map:snowTexture,transparent:true,opacity:.92,depthWrite:false,alphaTest:.03});owned.add(snowMat);
  const particles=new THREE.Points(snowGeo,snowMat);particles.frustumCulled=false;root.add(particles);
  let time=0,burst=0;
  function update(dt) {
    dt=Math.min(Math.max(dt,0),.05);time+=dt;burst=Math.max(0,burst-dt*.38);
    flakes.forEach((f,i)=>{
      f.y-=dt*(f.speed+burst*.75);
      if(f.y<f.bottom)f.y=f.top;
      const offset=Math.sin(time*.65+f.phase)*(.025+burst*.04);
      let x=f.x+offset,z=f.z+Math.cos(time*.5+f.phase)*.02;
      // Keep particles inside the sphere, including while swirling.
      const allowed=Math.sqrt(Math.max(0,radius*radius-(f.y-centerY)**2))-.045;
      const horizontal=Math.hypot(x,z);
      if(horizontal>allowed&&horizontal>0){const s=Math.max(0,allowed)/horizontal;x*=s;z*=s;}
      positions.set([x,f.y,z],i*3);
    });
    snowGeo.attributes.position.needsUpdate=true;
  }
  return { root,setPhoto,update,swirl(){burst=1;},dispose(){texture?.dispose();owned.forEach(o=>o.dispose());} };
}
