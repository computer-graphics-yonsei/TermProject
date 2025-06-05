import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { initStats, initCamera, initRenderer, initOrbitControls, 
    initDefaultDirectionalLighting } from './util.js';

const scene = new THREE.Scene();
// scene.background = new THREE.Color( 0x00000 );

// 하늘 배경 -> 더 어울리는 걸로 변경하자
const urls = [
    './assets/Textures/Background/px.png',
    './assets/Textures/Background/nx.png',
    './assets/Textures/Background/py.png',
    './assets/Textures/Background/ny.png',
    './assets/Textures/Background/pz.png',
    './assets/Textures/Background/nz.png'
    
];

var cubeLoader = new THREE.CubeTextureLoader();
scene.background = cubeLoader.load(urls);


const renderer = initRenderer();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = initCamera();
camera.position.set( 200, 200, 500 );
scene.add(camera);

// 햇빛
const sunLight = new THREE.DirectionalLight(0xffffff, 2);
sunLight.position.set(200, 300, 200);
sunLight.castShadow = true;

sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 1000;
sunLight.shadow.camera.left = -200;
sunLight.shadow.camera.right = 200;
sunLight.shadow.camera.top = 200;
sunLight.shadow.camera.bottom = -200;

scene.add(sunLight);

// 주변광
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

const orbitControls = initOrbitControls(camera, renderer);
orbitControls.target.set(0, 0, 0); 
orbitControls.update();

// 필드 로드
const loader = new GLTFLoader();
loader.load('./assets/models/GameField.glb', (gltf) => {
  gltf.scene.traverse(function (child) {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  gltf.scene.position.set(100, 0, -200)
  scene.add(gltf.scene);
});

animate();

function animate() {
    requestAnimationFrame( animate );
    renderer.render( scene, camera );
}

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
});