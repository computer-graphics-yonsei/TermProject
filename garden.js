import * as THREE from 'three';
import { initRenderer } from './util/util.js';
import { backgroundCube, lighting, loadGround, spawnFlower, flowerModels, getAllFlowerInstances } from './loader.js';
import { setupCamera, updateCameraFollow, getCamera, triggerZoomIn } from './camera.js';
import { Player } from './player.js';

window.isFirstPerson = false;
window.firstPersonStartTime = 0;

let wateredCount = 0;
const scoreElement = document.getElementById('score');

const scene = new THREE.Scene();
const renderer = initRenderer();

// 카메라 세팅
const { camera, orbitControls } = setupCamera(renderer); // util 기반으로 생성
scene.add(camera);

// 방향키 처리
const keyState = {
  w: false,
  a: false,
  s: false,
  d: false,
  ArrowUp: false,
  ArrowLeft: false,
  ArrowDown: false,
  ArrowRight: false
};

// raycaster 
const raycaster = new THREE.Raycaster();
const downDirection = new THREE.Vector3(0, -1, 0);
let groundMeshes = [];

// ======================Background======================
// Cube Map 하늘 배경
backgroundCube(scene);

// Lighting
lighting(scene);

// ======================Flower======================
// 꽃말
const flowerInfo = {
  daffodil: { name: '수선화', meaning: '자기애' },
  sunflower: { name: '해바라기', meaning: '숭배, 동경' },
  hyacinth: { name: '히아신스', meaning: '슬픔, 기쁨' },
  cactus: { name: '선인장', meaning: '불타는 사랑' },
  cosmos: { name: '코스모스', meaning: '순정' },
  daisy: { name: '데이지', meaning: '희망' },
  marigold: { name: '금잔화', meaning: '항상 생각함' },
  morningGlory: { name: '나팔꽃', meaning: '덧없는 사랑' },
  tulip: { name: '튤립', meaning: '사랑의 고백' },
};

// 땅 로드 후 꽃 생성 콜백으로 처리
const flowerSpawnConfigs = [
  { type: 'daffodil', url: flowerModels.daffodil, count: 30, xRange: [-70, -40], zRange: [-30, -10], randomYRot: true },
  { type: 'sunflower', url: flowerModels.sunflower, count: 20, xRange: [-40, 10],  zRange: [-60, -40] },
  { type: 'hyacinth', url: flowerModels.hyacinth, count: 35, xRange: [0, 40],    zRange: [-35, -20], randomYRot: true },
  { type: 'cactus', url: flowerModels.cactus, count: 10, xRange: [-42, -35], zRange: [0, 20] },
  { type: 'cosmos', url: flowerModels.cosmos, count: 50, xRange: [-30, -15], zRange: [30, 50], randomYRot: true },
  { type: 'daisy', url: flowerModels.daisy, count: 100, xRange: [10, 40],   zRange: [-5, 20], randomYRot: true },
  { type: 'marigold', url: flowerModels.marigold, count: 30, xRange: [50, 65],   zRange: [-25, 10], randomYRot: true },
  { type: 'morningGlory', url: flowerModels.morningGlory, count: 20, xRange: [-5, 5],   zRange: [25, 50], randomYRot: true },
  { type: 'tulip', url: flowerModels.tulip, count: 30, xRange: [-25, -5], zRange: [-20, 15], randomYRot: true },
];

loadGround(scene, groundMeshes, () => {
  const totalCount = flowerSpawnConfigs.reduce((sum, config) => sum + config.count, 0);
  scoreElement.innerText = `Watered: 0 / ${totalCount}`;

  flowerSpawnConfigs.forEach(({ type, url, count, xRange, zRange, randomYRot }) => {
    for (let i = 0; i < count; i++) {
      const x = THREE.MathUtils.randFloat(xRange[0], xRange[1]);
      const z = THREE.MathUtils.randFloat(zRange[0], zRange[1]);
      const yRot = randomYRot ? THREE.MathUtils.degToRad(THREE.MathUtils.randFloat(0, 20)) : 0;
      spawnFlower(url, new THREE.Vector3(x, 0, z), yRot, groundMeshes, scene, type);
    }
  });
});

const activeScale = new THREE.Vector3(2, 2, 2); // 성장했을 때 크기

// 꽃 성장 함수
function animateFlowers(inst) {
  const now = performance.now();
  const { group, materials, isActivated, startTime } = inst;
  if (!isActivated) return;
  
  // 0.5초 선딜레이 후 성장 시작
  const delay = 500; // ms
  let growthTime = 3000; // 3초
  let t = (now - startTime - delay) / growthTime;
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
    inst.growthFinished = true;
  }
}

// ======================text======================
// 꽃말 띄우기
const labeledTypes = new Set();

function showFlowerLabel(type, position) {
  const info = flowerInfo[type];
  if (!info) return;

  const message = `${info.name}: ${info.meaning}`;
  const sprite = createTextSprite(message);
  let textY = 5;
  if (type === 'sunflower') textY += 10;
  sprite.position.copy(position.clone().add(new THREE.Vector3(0, textY, 0)));
  scene.add(sprite);
}

function createTextSprite(message) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 512;
  canvas.height = 128;
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 6;
  ctx.strokeText(message, 256, 64);
  ctx.fillText(message, 256, 64);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(30, 8, 1); // 적절한 크기로 조절
  return sprite;
}

function checkFlowerCompletionAndLabel() {
  const allInstances = getAllFlowerInstances();
  const types = Object.keys(flowerInfo);

  types.forEach(type => {
    const group = allInstances.filter(inst => inst.type === type);
    if (group.length === 0 || labeledTypes.has(type)) return;
    const allWatered = group.every(inst => inst.growthFinished); // 또는 isActivated이 false로 전환된 상태 확인

    if (allWatered) {
      // 평균 위치 계산
      const center = group.reduce((sum, inst) => sum.add(inst.group.position), new THREE.Vector3())
                        .divideScalar(group.length);
      showFlowerLabel(type, center);
      labeledTypes.add(type);
    }
  });
}

// ======================wind======================
const wind = { strength: 0.12, speed: 1.8 };
function swayFlowers(timeSec) {
  getAllFlowerInstances().forEach(inst => {
    const sway = Math.sin(timeSec * wind.speed + inst.phase) * wind.strength;
    inst.group.rotation.z = sway;
  });
}

// ======================GameClear======================
let finishShown = false;

function checkGlobalCompletion() {
  if (finishShown) return;

  const allTypes = Object.keys(flowerInfo);
  if (labeledTypes.size === allTypes.length) {
    finishShown = true;
    setTimeout(() => {
      const div = document.createElement('div');
      div.innerText = '완료!';
      div.style.position = 'fixed';
      div.style.top = '50%';
      div.style.left = '50%';
      div.style.transform = 'translate(-50%, -50%)';
      div.style.fontSize = '64px';
      div.style.color = 'white';
      div.style.textShadow = '2px 2px 4px black';
      document.body.appendChild(div);

      // 모든 인풋 차단
      // TODO
    }, 2000);
  }
}

// ======================Player======================
// 플레이어 영역 생성 함수
function createPlayerZone(radius, segments, color, position){
  const geometry = new THREE.CircleGeometry(radius, segments);
  const material = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.2,  // 투명
  });
  const circle = new THREE.Mesh(geometry, material);
  circle.rotation.x = -Math.PI / 2;  // 바닥에 평행하게
  circle.position.copy(position);
  circle.receiveShadow = false;
  scene.add(circle);
  return circle;
}

// 영역 움직임
let playerZone;
const moveSpeed = 0.2; // 클릭 이동 속도(조절 가능)
const playerPosition = new THREE.Vector3(0, 0, 0);
playerZone = createPlayerZone(10, 32, 0x1111111, playerPosition); // Player zone

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

animate();
function animate() {
  // 바람 효과
  const now  = performance.now();
  const tSec = now * 0.001;
  swayFlowers(tSec);

  // 플레이어 애니메이션
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
    // if (player) player.setMoving(false);
    
    // 방향키 이동
    const moveVec = new THREE.Vector3();
    if (keyState.w || keyState.ArrowUp) moveVec.z -= 1;
    if (keyState.s || keyState.ArrowDown) moveVec.z += 1;
    if (keyState.a || keyState.ArrowLeft) moveVec.x -= 1;
    if (keyState.d || keyState.ArrowRight) moveVec.x += 1;

  //   if (moveVec.lengthSq() > 0) {
  //     moveVec.normalize().multiplyScalar(moveSpeed);
  //     playerZone.position.add(moveVec);
  //     if (player) {
  //       player.setMoving(true);
  //       player.setLookDirection(moveVec);
  //     }
  //   } else {
  //     if (player) player.setMoving(false);
  //   }
  // }
  const isKeyDown = Object.values(keyState).some(v => v);
  if (isKeyDown && moveVec.lengthSq() > 0) {
    moveVec.normalize().multiplyScalar(moveSpeed);
    playerZone.position.add(moveVec);
    if (player) {
      player.setMoving(true);
      player.setLookDirection(moveVec);
    }
  } else {
    if (player) player.setMoving(false);
    if (!player.isWatering) player.setAnimation('idle');  
  }
}

  // 플레이어 위치 동기화
  if (player) player.update(playerZone.position);

  const allInstances = getAllFlowerInstances();
  allInstances.forEach(inst => {
    if (inst.isActivated) animateFlowers(inst);
  });

  // updateCameraFollow(playerZone, player, window.isFirstPerson, window.firstPersonStartTime, autoFollowPlayer);
  updateCameraFollow(playerZone, player, window.isFirstPerson, window.firstPersonStartTime, autoFollowPlayer);

  // 모두 성장한 꽃은 꽃말 띄우기
  checkFlowerCompletionAndLabel();

  // 게임 종료 인풋 막기
  checkGlobalCompletion();
  
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// ======================Input======================
window.addEventListener('resize', () => {
  const cam = getCamera();
  cam.aspect = window.innerWidth / window.innerHeight;
  cam.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

orbitControls.addEventListener('start', () => {
  autoFollowPlayer = false;  // 사용자가 마우스로 조작 시작
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'w') keyState.w = true;
  if (e.key === 'a') keyState.a = true;
  if (e.key === 's') keyState.s = true;
  if (e.key === 'd') keyState.d = true;
  if (e.key in keyState) keyState[e.key] = true;

  // 스페이스바로 가까운 꽃에 물주기
  if (e.code === 'Space') {
    const allInstances = getAllFlowerInstances();
    const flowersInZone = allInstances.filter(inst => {
      const pos = inst.group.position;
      const d = playerZone.position.distanceTo(
        new THREE.Vector3(pos.x, playerZone.position.y, pos.z)
      );
      return (
        d <= 10 &&  // playerZoneRadius와 동일
        !inst.isActivated &&          // 지금 성장 애니메이션 중이 아님
        !inst.growthFinished          // 과거에 이미 물을 준 적도 없음
      );
    });

    if (flowersInZone.length > 0) {
      // 가장 가까운 꽃 방향을 바라보게
      if (player) {
        const flowerPos = flowersInZone[0].group.position;
        const lookDir = new THREE.Vector3().subVectors(flowerPos, playerZone.position);
        player.setLookDirection(lookDir);
      }

      if (player) {
        triggerZoomIn();
        player.playWaterOnceThenIdle();
      }

      const totalCount = allInstances.length;
      wateredCount += flowersInZone.length;
      scoreElement.innerText = `Watered: ${wateredCount} / ${totalCount}`;

      flowersInZone.forEach(inst => {
        inst.isActivated = true;
        inst.startTime = performance.now();
        inst.growthFinished = true;
      });

      // 이동 중이라면 즉시 멈추고 현재 위치에 고정
      targetPosition = null;
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'w') keyState.w = false;
  if (e.key === 'a') keyState.a = false;
  if (e.key === 's') keyState.s = false;
  if (e.key === 'd') keyState.d = false;
  if (e.key in keyState) keyState[e.key] = false;
});
// 유저 클릭 처리
// 꽃 클릭 시 water 애니메이션 1회 재생 (player 메서드로 변경)
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

    const allInstances = getAllFlowerInstances();

    const distanceToZone = playerZone.position.distanceTo(
      new THREE.Vector3(clickPosition.x, playerZone.position.y, clickPosition.z)
    );
    const playerZoneRadius = 10;

    if (distanceToZone <= playerZoneRadius) {
      // 영역 내부 클릭
      const flowersInZone = allInstances.filter(inst => {
        const pos = inst.group.position;
        const d = playerZone.position.distanceTo(
          new THREE.Vector3(pos.x, playerZone.position.y, pos.z)
        );
        return (
          d <= playerZoneRadius &&
          !inst.isActivated &&          // 지금 성장 애니메이션 중이 아님
          !inst.growthFinished          // 과거에 이미 물을 준 적도 없음
        );
      });

      if (flowersInZone.length > 0) {
        // 가장 가까운 꽃 방향을 바라보게
        if (player) {
          const flowerPos = flowersInZone[0].group.position;
          const lookDir = new THREE.Vector3().subVectors(flowerPos, playerZone.position);
          player.setLookDirection(lookDir);
        }

        if (player) {
          // isFirstPerson = true;
          // firstPersonStartTime = performance.now();
          triggerZoomIn();
          player.playWaterOnceThenIdle();
        }
        const allInstances = getAllFlowerInstances();
        const totalCount = allInstances.length;
        wateredCount += flowersInZone.length;
        scoreElement.innerText = `Watered: ${wateredCount} / ${totalCount}`;

        flowersInZone.forEach(inst => {
          inst.isActivated = true;
          inst.startTime = performance.now();
          inst.growthFinished = true;  
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

// (임시) 엔터 누르면 모든 꽃 다 자라남
window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const allInstances = getAllFlowerInstances();
    const now = performance.now();
    allInstances.forEach(inst => {
      if (!inst.isActivated) {
        inst.isActivated = true;
        inst.startTime = now;
      }
    });
  }
});