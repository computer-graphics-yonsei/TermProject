import * as THREE from 'three';
import { initCamera as utilInitCamera, initOrbitControls as utilInitOrbitControls } from './util/util.js';

let camera;
let orbitControls;
let openingFollowStartTime = performance.now();
const OPENING_FOLLOW_DURATION = 3000;
let isZoomIn = false;
let isZoomOut = false;
let zoomStartTime = 0;
const ZOOM_DURATION = 1000; // 1초 동안 줌인

// 카메라 초기 위치
export function setupCamera(renderer, position = new THREE.Vector3(0, 100, 100)) {
  camera = utilInitCamera(position);
  orbitControls = utilInitOrbitControls(camera, renderer);
  return { camera, orbitControls };
}

// 카메라 이동 함수
export function updateCameraFollow(playerZone, player, isFirstPerson, firstPersonStartTime, autoFollowFlag) {
//   if (isFirstPerson && player && player.model) {
//     const headOffset = new THREE.Vector3(0, 20, 0); // 머리 높이
//     const forward = new THREE.Vector3(0, 0, -1); // 정면 방향

//     // 캐릭터의 머리 위치 계산
//     const headPos = new THREE.Vector3();
//     player.model.getWorldPosition(headPos);
//     headPos.add(headOffset);

//     // 회전 적용: 캐릭터가 바라보는 방향
//     forward.applyQuaternion(player.model.quaternion).normalize();
    
//     // 카메라를 머리 바로 앞에 놓는다 (몸보다 살짝 앞)
//     const cameraPos = headPos.clone().add(forward.clone().multiplyScalar(-100));
//     camera.position.copy(cameraPos);

//     // 바라보는 곳: 캐릭터가 바라보는 방향 10유닛 앞
//     const lookTarget = cameraPos.clone().add(forward.clone().multiplyScalar(0));
//     camera.lookAt(headPos); // lookTarget으로 하니까 하늘을 바라보게 되길래...

//     orbitControls.enabled = false;

//     if (performance.now() - firstPersonStartTime > 3000) {
//       window.isFirstPerson = false;
//       window.autoFollowPlayer = true;
//       orbitControls.enabled = true;
//     }
//   }

  // 물 줄 때 줌인
  const basePos = playerZone.position.clone().add(new THREE.Vector3(0, 50, 50));
  const zoomTargetPos = playerZone.position.clone().add(new THREE.Vector3(0, 30, 30)); // 더 가까운 위치

  if (isZoomIn && playerZone) {
    const elapsed = performance.now() - zoomStartTime;
    const t = Math.min(elapsed / ZOOM_DURATION, 1);
    
    const lerped = basePos.clone().lerp(zoomTargetPos, t);

    camera.position.copy(lerped);
    camera.lookAt(playerZone.position);

    if (t >= 1) {
      isZoomIn = false;
      isZoomOut = true;
      zoomStartTime = performance.now(); // 줌아웃 타이머 시작
    }
    return;
  }

  if (isZoomOut && playerZone) {
    const elapsed = performance.now() - zoomStartTime;
    const t = Math.min(elapsed / ZOOM_DURATION, 1);
    const lerped = zoomTargetPos.clone().lerp(basePos, t);

    camera.position.copy(lerped);
    camera.lookAt(playerZone.position);

    if (t >= 1) {
      isZoomOut = false;
    }
    return;
  }

  // 기본적으로 플레이어를 따라감
  if (autoFollowFlag && playerZone) {
    const cameraOffset = new THREE.Vector3(0, 50, 50);
    const targetCamPos = playerZone.position.clone().add(cameraOffset);

    const elapsed = performance.now() - openingFollowStartTime;
    const smoothLerpAlpha = Math.min(elapsed / OPENING_FOLLOW_DURATION, 1) * 0.05; 

    camera.position.lerp(targetCamPos, smoothLerpAlpha);
    camera.lookAt(playerZone.position);
    orbitControls.target.copy(playerZone.position);
    orbitControls.update();

    // // Opening
    // const elapsed = performance.now() - openingFollowStartTime;
    // const t = Math.min(elapsed / OPENING_FOLLOW_DURATION, 1); // 진행 비율 (0~1)

    // const center = playerZone.position.clone();
    // const radiusStart = 700;
    // const radiusEnd = 50;
    // const radius = THREE.MathUtils.lerp(radiusStart, radiusEnd, t);

    // const angle = THREE.MathUtils.degToRad(180 * t); // 반바퀴 회전

    // const x = center.x + radius * Math.sin(angle);
    // const z = center.z + radius * Math.cos(angle);
    // const y = THREE.MathUtils.lerp(-400, 50, t); // y축도 점점 내려옴

    // camera.position.set(x, y, z);
    // camera.lookAt(center);

    // orbitControls.target.copy(center);
    // orbitControls.update();
  }
}

export function triggerZoomIn() {
  isZoomIn = true;
  isZoomOut = false;
  zoomStartTime = performance.now();
}

export function getCamera() {
  return camera;
}

export function getOrbitControls() {
  return orbitControls;
}
