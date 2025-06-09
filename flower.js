import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { initCamera, initRenderer, initOrbitControls } from './util/util.js';
import { Player } from './player.js';

let wateredCount = 0;
const scoreElement = document.getElementById('score');

const scene = new THREE.Scene();
const renderer = initRenderer();

// 카메라 로드
const camera = initCamera();
camera.position.set( 0, 0, -200 );
scene.add(camera);

// 카메라 회전 설정
const orbitControls = initOrbitControls(camera, renderer);

// ======================Field======================
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
const backgroundCube = cubeLoader.load(urls);
scene.background = backgroundCube;
const environmentCube = cubeLoader.load(urls);
scene.environment = environmentCube;

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

const loader = new GLTFLoader();

// 초록 땅 로드 -> *꽃밭 생성*
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

  // 수선화 생성
  for (let i = 0; i < 30; i++) {
    const x = THREE.MathUtils.randFloat(-60, -30);
    const z = THREE.MathUtils.randFloat(-35, -10);
    spawnFlower(daffodilUrl, new THREE.Vector3(x, 0, z), 0);
  };

  // 해바라기 생성
  for (let i = 0; i < 20; i++) {
    const x = THREE.MathUtils.randFloat(-35, 10);
    const z = THREE.MathUtils.randFloat(-55, -40);
    spawnFlower(sunflowerUrl, new THREE.Vector3(x, 0, z), 0);
  };

  // 히아신스 생성
  for (let i = 0; i < 35; i++) {
    const x = THREE.MathUtils.randFloat(0, 40);
    const z = THREE.MathUtils.randFloat(-40, -20);
    const yRot = THREE.MathUtils.degToRad(THREE.MathUtils.randFloat(0, 20));
    spawnFlower(hyacinthUrl, new THREE.Vector3(x, 0, z), yRot);
  };

  // 선인장꽃 생성
  for (let i = 0; i < 20; i++) {
    const x = THREE.MathUtils.randFloat(-35, -25);
    const z = THREE.MathUtils.randFloat(0, 20);
    spawnFlower(cactusBloomUrl, new THREE.Vector3(x, 0, z), 0);
  };

  // 코스모스 생성
  for (let i = 0; i < 50; i++) {
    const x = THREE.MathUtils.randFloat(-28, -15);
    const z = THREE.MathUtils.randFloat(30, 50);
    spawnFlower(cosmosUrl, new THREE.Vector3(x, 0, z), 0);
  };

  // 데이지 생성
  for (let i = 0; i < 50; i++) {
    const x = THREE.MathUtils.randFloat(10, 40);
    const z = THREE.MathUtils.randFloat(-5, 15);
    const yRot = THREE.MathUtils.degToRad(THREE.MathUtils.randFloat(0, 20));
    spawnFlower(daisyUrl, new THREE.Vector3(x, 0, z), yRot);
  };

  // 매리골드 생성
  for (let i = 0; i < 20; i++) {
    const x = THREE.MathUtils.randFloat(50, 65);
    const z = THREE.MathUtils.randFloat(-35, -5);
    spawnFlower(marigoldUrl, new THREE.Vector3(x, 0, z), 0);
  };

  // 나팔꽃 생성
  for (let i = 0; i < 20; i++) {
    const x = THREE.MathUtils.randFloat(-10, 5);
    const z = THREE.MathUtils.randFloat(20, 40);
    spawnFlower(morningGloryUrl, new THREE.Vector3(x, 0, z), 0);
  };

  // 튤립 생성
  for (let i = 0; i < 30; i++) {
    const x = THREE.MathUtils.randFloat(-30, -10);
    const z = THREE.MathUtils.randFloat(-20, 15);
    spawnFlower(tulipUrl, new THREE.Vector3(x, 0, z), 0);
  };

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

// ======================Player======================
// 플레이어 영역 생성 함수
function createPlayerZone(radius, segments, color, position){
  const geometry = new THREE.CircleGeometry(radius, segments);
  const material = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.1,  // 투명
  });
  const circle = new THREE.Mesh(geometry, material);
  circle.rotation.x = -Math.PI / 2;  // 바닥에 평행하게
  circle.position.copy(position);
  circle.receiveShadow = false;
  scene.add(circle);
  return circle;
}

// 영역 움직임 (플레이어도 이렇게 움직이면 되려나)
let playerZone; // 나중에 createPlayerZone 반환값 저장
const moveSpeed = 0.2; // 클릭 이동 속도(조절 가능)
const keyState = {};
const playerPosition = new THREE.Vector3(0, 0, 0);
playerZone = createPlayerZone(10, 32, 0xffee88, playerPosition); // Player zone

let targetPosition = null; // 전역에서 관리
let player = null;
let autoFollowPlayer = true; // 카메라 조정 플래그

// playerZone 생성 이후에 Player 인스턴스 생성
player = new Player(scene, raycaster, groundMeshes, playerZone.position.clone(), downDirection);
player.bindAnimationHotkeys();

// 영역 (및 플레이어) 이동 함수
function movePlayer(position) {
  autoFollowPlayer = true;
  const rayOrigin = new THREE.Vector3(position.x, 100, position.z);
  raycaster.set(rayOrigin, downDirection);
  const intersects = raycaster.intersectObjects(groundMeshes, true);

  if (intersects.length > 0) {
    const groundY = intersects[0].point.y;
    targetPosition = new THREE.Vector3(position.x, groundY + 1, position.z);
  }
}

// ======================Flower======================
// 꽃 URL
const daffodilUrl = './assets/models/Daffodil.glb';
const sunflowerUrl = './assets/models/Sunflower.glb';
const hyacinthUrl = './assets/models/Hyacinth.glb';
const cactusBloomUrl = './assets/models/CactusBloom.glb';
const cosmosUrl = './assets/models/Cosmos.glb';
const daisyUrl = './assets/models/Daisy.glb';
const marigoldUrl = './assets/models/Marigold.glb';
const morningGloryUrl = './assets/models/MorningGlory.glb';
const tulipUrl = './assets/models/Tulip.glb';

// 꽃 상태 플래그
const inactiveColor = new THREE.Color(0x555555);
const lerpFactor = 0.8;
const activeScale = new THREE.Vector3(2, 2, 2);

// 꽃 인스턴스
const daffodilInstances = [];
const sunflowerInstances = [];
const hyacinthInstances = [];
const cactusBloomInstances = [];
const cosmosInstances = [];
const daisyInstances = [];
const marigoldInstances = [];
const MorningGloryInstances = [];
const tulipInstances = [];

// 꽃 스폰 함수
function spawnFlower(flowerUrl, positionXZ, yRot) {
  // ray
  const origin = new THREE.Vector3(positionXZ.x,0, positionXZ.z);
  raycaster.set(origin, downDirection);
  const intersects = raycaster.intersectObjects(groundMeshes, true);

  const hitPoint = intersects[0].point;
  const groundY = hitPoint.y;

  loader.load(flowerUrl, (gltf) => {
    const flower = gltf.scene;
    const materials = [];
    flower.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone(); // 활성상태 material 기억

        const mat = child.material;
        if (mat.color) {
          mat.userData.activeColor = mat.color.clone(); // 활성 상태 색 기억
          mat.color.lerp(inactiveColor, lerpFactor); // 비활성화 상태로 시작
        }
        mat.color.lerp(inactiveColor, lerpFactor);

        child.rotation.y = THREE.MathUtils.degToRad(yRot);
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

    // 해당하는 꽃 인스턴스 배열 안에 넣어주기
    if (flowerUrl === daffodilUrl) // 수선화
    {
      daffodilInstances.push({
        group,
        mesh: flower,
        materials,
        isActivated: false,
        startTime: null,
        finalY: finalY,
        activePosition: new THREE.Vector3(positionXZ.x, finalY+2, positionXZ.z),
        activeRot: yRot * 30,
        windEffect: yRot / 3
      });
    }
    else if (flowerUrl === sunflowerUrl) // 해바라기
    {
      sunflowerInstances.push({
        group,
        mesh: flower,
        materials,
        isActivated: false,
        startTime: null,
        finalY: finalY,
        activePosition: new THREE.Vector3(positionXZ.x, finalY, positionXZ.z),
        activeRot: yRot * 10,
        windEffect: yRot / 3
      });
    }
    else if (flowerUrl === hyacinthUrl) // 히아신스
    {
      hyacinthInstances.push({
        group,
        mesh: flower,
        materials,
        isActivated: false,
        startTime: null,
        finalY: finalY,
        activePosition: new THREE.Vector3(positionXZ.x, finalY+2, positionXZ.z),
        activeRot: yRot * 30,
        windEffect: yRot / 3
      });
    }
    else if (flowerUrl === cactusBloomUrl) // 선인장꽃
    {
      cactusBloomInstances.push({
        group,
        mesh: flower,
        materials,
        isActivated: false,
        startTime: null,
        finalY: finalY,
        activePosition: new THREE.Vector3(positionXZ.x, finalY+1, positionXZ.z),
        activeRot: yRot * 30,
        windEffect: yRot / 3
      });
    }
    else if (flowerUrl === cosmosUrl) // 코스모스
    {
      cosmosInstances.push({
        group,
        mesh: flower,
        materials,
        isActivated: false,
        startTime: null,
        finalY: finalY,
        activePosition: new THREE.Vector3(positionXZ.x, finalY+1, positionXZ.z),
        activeRot: yRot * 30,
        windEffect: yRot / 3
      });
    }
    else if (flowerUrl === daisyUrl) // 데이지
    {
      daisyInstances.push({
        group,
        mesh: flower,
        materials,
        isActivated: false,
        startTime: null,
        finalY: finalY,
        activePosition: new THREE.Vector3(positionXZ.x, finalY, positionXZ.z),
        activeRot: yRot * 30,
        windEffect: yRot / 3
      });
    }
    else if (flowerUrl === marigoldUrl) // 금잔화
    {
      marigoldInstances.push({
        group,
        mesh: flower,
        materials,
        isActivated: false,
        startTime: null,
        finalY: finalY,
        activePosition: new THREE.Vector3(positionXZ.x, finalY+1, positionXZ.z),
        activeRot: yRot * 30,
        windEffect: yRot / 3
      });
    }
    else if (flowerUrl === morningGloryUrl) // 나팔꽃
    {
      MorningGloryInstances.push({
        group,
        mesh: flower,
        materials,
        isActivated: false,
        startTime: null,
        finalY: finalY,
        activePosition: new THREE.Vector3(positionXZ.x, finalY+2, positionXZ.z),
        activeRot: yRot * 30,
        windEffect: yRot / 3
      });
    }
    else if (flowerUrl === tulipUrl) // 튤립
    {
      tulipInstances.push({
        group,
        mesh: flower,
        materials,
        isActivated: false,
        startTime: null,
        finalY: finalY,
        activePosition: new THREE.Vector3(positionXZ.x, finalY+1, positionXZ.z),
        activeRot: yRot * 30,
        windEffect: yRot / 3
      });
    }
  });
}

// 꽃 성장 함수
function animateFlowers(inst) {
  const now = performance.now();
  const { group, materials, isActivated, startTime } = inst;
  if (!isActivated) return;
  
  // 0.5초 선딜레이 후 성장 시작
  const delay = 500; // ms
  let t = (now - startTime - delay) / 15000;
  t = Math.max(0, Math.min(t, 1));
  group.scale.lerp(activeScale, t);
  group.position.lerp(inst.activePosition, t);
  materials.forEach(mat => {
    if (mat && mat.color && mat.userData?.activeColor) {
      mat.color.lerp(mat.userData.activeColor, t);
    }
  });
  group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, inst.activeRot, t);
  
  if (Math.abs(group.scale.y - activeScale.y) < 0.01) {
    inst.isActivated = false;
  }
}

animate();
function animate() {
  requestAnimationFrame(animate);

  if (targetPosition) {
    const direction = new THREE.Vector3().subVectors(targetPosition, playerZone.position);
    const distance = direction.length();
    if (distance < moveSpeed) {
      playerZone.position.copy(targetPosition);
      targetPosition = null;
      if (player) {
        player.setMoving(false);
        if (!player.isWatering) player.setAnimation('idle'); // 도착 시 idle (단, 물주기 중이 아니면)
      }
    } else {
      direction.normalize();
      playerZone.position.addScaledVector(direction, moveSpeed);
      if (player) player.setLookDirection(direction);
      if (player) player.setMoving(true); // 이동 중임만 알림
    }
  } else {
    if (player) player.setMoving(false);
  }

  // 플레이어 위치 동기화
  if (player) player.update(playerZone.position);

  const allInstances = [...daffodilInstances, ...sunflowerInstances, 
                          ...hyacinthInstances, ...cactusBloomInstances, 
                          ...cosmosInstances, ...daisyInstances,
                          ...marigoldInstances, ...MorningGloryInstances,
                          ...tulipInstances];  

  allInstances.forEach(inst => {
    if (inst.isActivated) animateFlowers(inst);
  });

  if (autoFollowPlayer && playerZone) {
    const cameraOffset = new THREE.Vector3(0, 50, -50);
    const targetCamPos = playerZone.position.clone().add(cameraOffset);
    camera.position.lerp(targetCamPos, 0.05);

    camera.lookAt(playerZone.position);
    orbitControls.target.copy(playerZone.position);
    orbitControls.update();
  }
  
  renderer.render(scene, camera);
}

// ======================Input======================
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  
  renderer.setSize(width, height);
}); 

orbitControls.addEventListener('start', () => {
  autoFollowPlayer = false;  // 사용자가 마우스로 조작 시작
});

// 꽃 클릭 시 water 애니메이션 1회 재생 (player 메서드로 변경)
// 유저 클릭 처리
window.addEventListener('click', (event) => {
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(mouse, camera);

  const clickPosition = new THREE.Vector3();
  const groundIntersects = raycaster.intersectObjects(groundMeshes, true);

  if (groundIntersects.length > 0) {
    clickPosition.copy(groundIntersects[0].point);

    const allInstances = [...daffodilInstances, ...sunflowerInstances, 
                          ...hyacinthInstances, ...cactusBloomInstances, 
                          ...cosmosInstances, ...daisyInstances,
                          ...marigoldInstances, ...MorningGloryInstances,
                          ...tulipInstances];

    const distanceToZone = playerZone.position.distanceTo(
      new THREE.Vector3(clickPosition.x, playerZone.position.y, clickPosition.z)
    );
    const playerZoneRadius = 10;

    if (distanceToZone <= playerZoneRadius) {
      // 영역 내부 클릭
      const flowersInZone = allInstances.filter(inst => {
        const pos = inst.group.position;
        const d = playerZone.position.distanceTo(new THREE.Vector3(pos.x, playerZone.position.y, pos.z));
        return d <= playerZoneRadius && !inst.isActivated;
      });

      if (flowersInZone.length > 0) {
        // 가장 가까운 꽃 방향을 바라보게
        if (player) {
          const flowerPos = flowersInZone[0].group.position;
          const lookDir = new THREE.Vector3().subVectors(flowerPos, playerZone.position);
          player.setLookDirection(lookDir);
        }

        if (player) player.playWaterOnceThenIdle();
        wateredCount += flowersInZone.length;
        scoreElement.innerText = `Watered: ${wateredCount}`;

        flowersInZone.forEach(inst => {
          inst.isActivated = true;
          inst.startTime = performance.now();
        });
      
        flowersInZone.forEach(inst => {
          inst.isActivated = true;
          inst.startTime = performance.now();
        });
        // 이동 중이라면 즉시 멈추고 현재 위치에 고정
        targetPosition = null;
        // playerZone.position은 이미 현재 위치이므로 별도 이동 불필요
        if (player) player.playWaterOnceThenIdle(); // 꽃 클릭 시 물주기 애니메이션
      } else {
        movePlayer(clickPosition);
      }
    } else {
      // 영역 외부 클릭
      movePlayer(clickPosition);
    }
  }
});

// (임시) wasd로 영역 이동
window.addEventListener('keydown', (e) => {
  keyState[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (e) => {
  keyState[e.key.toLowerCase()] = false;
});

function updatePlayerZonePosition() {
  const dir = new THREE.Vector3();
  if (keyState['w']) dir.z -= 1;
  if (keyState['s']) dir.z += 1;
  if (keyState['a']) dir.x -= 1;
  if (keyState['d']) dir.x += 1;

  dir.normalize().multiplyScalar(moveSpeed);
  playerZone.position.add(dir);

  const rayOrigin = new THREE.Vector3(playerZone.position.x, 100, playerZone.position.z);
  raycaster.set(rayOrigin, downDirection);

  const intersects = raycaster.intersectObjects(groundMeshes, true);
  if (intersects.length > 0) {
    const groundY = intersects[0].point.y;
    playerZone.position.y = groundY + 1; // z-fighting 방지
  }
}

// (임시) 엔터 누르면 모든 꽃 다 자라남
window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {

    const allInstances = [...daffodilInstances, ...sunflowerInstances, 
                          ...hyacinthInstances, ...cactusBloomInstances, 
                          ...cosmosInstances, ...daisyInstances,
                          ...marigoldInstances, ...MorningGloryInstances,
                          ...tulipInstances];

    const now = performance.now();
    allInstances.forEach(inst => {
      if (!inst.isActivated) {
        inst.isActivated = true;
        inst.startTime = now;
      }
    });
  }
});