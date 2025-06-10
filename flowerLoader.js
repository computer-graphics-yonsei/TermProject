import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
export function loadGround(scene, groundMeshes, callback) {
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
        type: kind
      });
    }
  });
}

// 인스턴스 생성
export function getAllFlowerInstances() {
  return Object.values(flowerInstances).flat();
}
