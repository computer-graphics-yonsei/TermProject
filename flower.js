import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { initCamera, initRenderer, initOrbitControls } from './util/util.js';

const scene = new THREE.Scene();

// Cube Map 하늘 배경
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

// 카메라 로드
const camera = initCamera();
camera.position.set( 0, 100, 100 );
scene.add(camera);

// 카메라 회전 설정
const orbitControls = initOrbitControls(camera, renderer);
orbitControls.target.set(0, 0, 0); 
orbitControls.update();

// 햇빛
const sunLight = new THREE.DirectionalLight(0xffffff, 5);
sunLight.position.set(-200, 200, 200);
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
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const raycaster = new THREE.Raycaster();
const downDirection = new THREE.Vector3(0, -1, 0);
let groundMeshes = [];

// 초록 땅 로드
const loader = new GLTFLoader();
loader.load('./assets/models/Grounds.glb', (gltf) => {
  gltf.scene.traverse(function (child) {
    if (child.isMesh && child.name.startsWith('Ground')) {
    groundMeshes.push(child);
    child.castShadow = true;
    child.receiveShadow = true;
    child.updateMatrixWorld(true);
    }
  });

  gltf.scene.position.set(0, 0, 0);
  scene.add(gltf.scene);

  // 위치, 길이 랜덤하게 꽃 생성
  for (let i = 0; i < 100; i++) {
    const x = THREE.MathUtils.randFloat(-45, 10);
    const z = THREE.MathUtils.randFloat(-55, -40);
    const yScale = THREE.MathUtils.randFloat(1.0, 1.3);
    const yRot = THREE.MathUtils.degToRad(THREE.MathUtils.randFloat(0, 30));
    spawnDaffodil(new THREE.Vector3(x, 0, z), yScale, yRot);
  };

  // 위치, 길이 랜덤하게 꽃 생성
  for (let i = 0; i < 100; i++) {
    const x = THREE.MathUtils.randFloat(50, 67);
    const z = THREE.MathUtils.randFloat(-30, 20);
    const yScale = THREE.MathUtils.randFloat(1.0, 1.3);
    const yRot = THREE.MathUtils.degToRad(THREE.MathUtils.randFloat(0, 30));
    spawnDaffodil(new THREE.Vector3(x, 0, z), yScale, yRot);
  }
});

// 그 외 필드 로드 
loader.load('./assets/models/Field.glb', (gltf) => {
  gltf.scene.traverse(function (child) {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  gltf.scene.position.set(0, 0, 0)
  scene.add(gltf.scene);
});

// 꽃 상태 플래그
let isActivated = false;
const inactiveColor = new THREE.Color(0x111111);
const activeScale = new THREE.Vector3(4, 2, 4);
const daffodilInstances = [];
const sunflowerInstances = [];
const hyacinthInstances = [];

// Daffodil 스폰 함수
function spawnDaffodil(positionXZ, scaleY, yRot) {
  // ray
  const origin = new THREE.Vector3(positionXZ.x,5, positionXZ.z);
  raycaster.set(origin, downDirection);
  const intersects = raycaster.intersectObjects(groundMeshes, true);

  const hitPoint = intersects[0].point;
  const groundY = hitPoint.y;

  loader.load('./assets/models/Daffodil.glb', (gltf) => {
    const daffodil = gltf.scene;
    daffodil.scale.set(1, scaleY, 1);

    daffodil.traverse((child) => {
      if (child.isMesh) {
        const mat = child.material;
        mat.userData.activeColor = mat.color.clone();
        mat.color.set(inactiveColor);
        child.castShadow = true;
        child.receiveShadow = true;
        child.rotation.y = THREE.MathUtils.degToRad(yRot);
      }
    });

    const group = new THREE.Group();
    group.add(daffodil);
    group.scale.set(2, 1, 2);
    scene.add(group);

    const box = new THREE.Box3().setFromObject(group);
    const flowerMinY = box.min.y;
    const finalY = groundY - flowerMinY;
    group.position.set(positionXZ.x, finalY, positionXZ.z);

    daffodilInstances.push({
      group,
      mesh: daffodil,
      materials: daffodil.children.map(c => c.material),
      isActivated: false,
      startTime: null,
      finalY: finalY,
      activePosition: new THREE.Vector3(positionXZ.x, finalY+8, positionXZ.z),
      activeRot: yRot * 30,
      windEffect: yRot / 3
    });
  });
}

// (임시) 꽃 클릭하면 자라남
window.addEventListener('click', (event) => {
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(
    daffodilInstances.map(inst => inst.mesh), true
  );

  if (intersects.length > 0) {
    const clickedMesh = intersects[0].object;
    const instance = daffodilInstances.find(inst =>
      inst.mesh === clickedMesh || inst.mesh.children.includes(clickedMesh)
    );

    if (instance && !instance.isActivated) {
      instance.isActivated = true;
      instance.startTime = performance.now();
    }
  }
});


// function animateFlowers() {
//   console.log('animateFlowers()호출');
//   const now = performance.now();

//   daffodilInstances.forEach((inst) => {
//     const { group, materials, isActivated, startTime } = inst;
//     if (!isActivated) return;
//     const t = Math.min((now - startTime) / 500000, 1); // 최대 1초

//     group.scale.lerp(activeScale, t); // 스케일 보간
//     group.position.lerp(inst.activePosition, t); // 밑동 고정 보간 
//     materials.forEach(mat => {
//       mat.color.lerp(mat.userData.activeColor, t); // 색상 보간
//     });

//     const currentRotY = group.rotation.y;
//     const targetRotY = inst.activeRot;
//     group.rotation.y = THREE.MathUtils.lerp(currentRotY, targetRotY, t);

//     if (Math.abs(group.scale.y - activeScale.y) < 0.01) 
//       inst.isActivated = false; // 자라남 끝
//   });
// }

function animateFlowers(inst) {
  const now = performance.now();
  const { group, materials, isActivated, startTime } = inst;
  if (!isActivated) return;

  const t = Math.min((now - startTime) / 5000, 1); // 최대 5초
  group.scale.lerp(activeScale, t);
  group.position.lerp(inst.activePosition, t);
  materials.forEach(mat => {
    mat.color.lerp(mat.userData.activeColor, t);
  });
  group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, inst.activeRot, t);

  if (Math.abs(group.scale.y - activeScale.y) < 0.01) {
    inst.isActivated = false;
  }
}

animate();

function animate() {
    requestAnimationFrame( animate );
    daffodilInstances.forEach(inst => {
      if (inst.isActivated)  animateFlowers(inst)
    });
    renderer.render( scene, camera );
}

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}); 