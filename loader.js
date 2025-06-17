import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function backgroundCube(scene) {
  // Cube Map 하늘 배경
  const urls = [
      './assets/Textures/Sky/px.png',
      './assets/Textures/Sky/nx.png',
      './assets/Textures/Sky/py.png',
      './assets/Textures/Sky/ny.png',
      './assets/Textures/Sky/pz.png',
      './assets/Textures/Sky/nz.png'
  ];
  
  var cubeLoader = new THREE.CubeTextureLoader();
  const backgroundCube = cubeLoader.load(urls);
  scene.background = backgroundCube;
  const environmentCube = cubeLoader.load(urls);
  scene.environment = environmentCube;
}

export function lighting(scene) {
  // 햇빛
  const sunLight = new THREE.DirectionalLight(0xffffff, 5);
  sunLight.position.set(200, 200, 200);
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
}

// flower URL 목록
export const flowerModels = {
  daffodil: './assets/models/Daffodil.glb',
  sunflower: './assets/models/Sunflower.glb',
  hyacinth: './assets/models/Hyacinth.glb',
  cactus: './assets/models/CactusBloom.glb',
  cosmos: './assets/models/Cosmos.glb',
  daisy: './assets/models/Daisy.glb',
  marigold: './assets/models/Marigold.glb',
  morningGlory: './assets/models/MorningGlory.glb',
  tulip: './assets/models/Tulip.glb',
};

// 꽃 인스턴스 저장소
export const flowerInstances = {
  daffodil: [],
  sunflower: [],
  hyacinth: [],
  cactus: [],
  cosmos: [],
  daisy: [],
  marigold: [],
  morningGlory: [],
  tulip: [],
};

const loader = new GLTFLoader();

// 꽃 상태 플래그
const inactiveColor = new THREE.Color(0x555555);
const lerpFactor = 0.8;

// Field Load
export function loadGround(scene, groundMeshes, collisionMeshes, callback) {
  loader.load('./assets/models/Grounds.glb', (gltf) => {
    gltf.scene.traverse((child) => {
      if (child.isMesh && child.name.startsWith('Ground')) {
        groundMeshes.push(child);
        child.castShadow = true;
        child.receiveShadow = true;
        child.updateMatrixWorld(true);
      }

    });
    gltf.scene.position.set(0, 0, 0);
    scene.add(gltf.scene);
    if (callback) callback(); // 예: spawnFlower 반복 호출
  });

  loader.load('./assets/models/Field.glb', (gltf) => {
    gltf.scene.traverse(function (child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        child.updateMatrixWorld(true);

        // 이름 유추: 본인 → 부모 → 조부모
        const name = (
          child.name ||
          child.parent?.name ||
          child.parent?.parent?.name ||
          ''
        ).toLowerCase();

        const isRock = name.includes('rock');
        const isFence = name.includes('fence');

        if (isRock || isFence) {
          child.updateMatrixWorld(true);
          child.userData.boundingBox = new THREE.Box3().setFromObject(child);
          collisionMeshes.push(child);
        }
      }
    });
    gltf.scene.position.set(0, 0, 0)
    scene.add(gltf.scene);
  });
}

// 꽃 생성 함수
export function spawnFlower(flowerUrl, positionXZ, yRot, groundMeshes, scene, type) {
  const raycaster = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  raycaster.set(new THREE.Vector3(positionXZ.x, 0, positionXZ.z), down);
  const intersects = raycaster.intersectObjects(groundMeshes, true);

  if (intersects.length === 0) return;

  const groundY = intersects[0].point.y;

  loader.load(flowerUrl, (gltf) => {
    const flower = gltf.scene;
    const materials = [];

    flower.traverse((child) => {
      if (child.isMesh) {
        const mat = child.material.clone();
        if (mat.color) {
          mat.userData.activeColor = mat.color.clone();
          mat.color.lerp(inactiveColor, lerpFactor);
        }
        child.material = mat;
        child.castShadow = true;
        child.receiveShadow = true;
        materials.push(mat);
      }
    });

    const group = new THREE.Group();
    group.add(flower);
    group.scale.set(2, 0.7, 2);
    scene.add(group);

    const box = new THREE.Box3().setFromObject(group);
    const flowerMinY = box.min.y;
    const finalY = groundY - flowerMinY;
    group.position.set(positionXZ.x, finalY, positionXZ.z);

    const kind = Object.keys(flowerModels).find(key => flowerModels[key] === flowerUrl);
    if (kind) {
      flowerInstances[kind].push({
        group,
        mesh: flower,
        materials,
        isActivated: false,
        startTime: null,
        finalY: finalY,
        activePosition: new THREE.Vector3(positionXZ.x, finalY + 1, positionXZ.z),
        activeRot: yRot * 30,
        phase: Math.random() * Math.PI * 2,
        type: kind
      });
    }
  });
}

// 인스턴스 생성
export function getAllFlowerInstances() {
  return Object.values(flowerInstances).flat();
}
