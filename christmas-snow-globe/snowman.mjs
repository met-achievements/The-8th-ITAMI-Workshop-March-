// The indexed geometry preserves the snowman components of the supplied STL.
const modelUrl = new URL('./assets/snowman.geometry.json', import.meta.url);
const colors = [0xeaf1f3, 0x263135, 0x684937, 0x272327, 0xe58a36];

export async function loadSnowman(THREE) {
  const response = await fetch(modelUrl);
  if (!response.ok) throw new Error('雪だるまのモデルを読み込めませんでした。');
  const geometry = new THREE.BufferGeometryLoader().parse(await response.json());
  geometry.computeVertexNormals();
  const materials = colors.map(color => new THREE.MeshStandardMaterial({ color, roughness: .82 }));
  const figure = new THREE.Mesh(geometry, materials);
  figure.name = 'Snowman mesh';
  return figure;
}
