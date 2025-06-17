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
export function updateCameraFollow(playerZone, autoFollowFlag) {
  // 물 줄 때 줌인
  const basePos = playerZone.position.clone().add(new THREE.Vector3(0, 30, 60));
  const zoomTargetPos = playerZone.position.clone().add(new THREE.Vector3(0, 25, 48)); // 줌인 거리 조정

  if (isZoomIn && playerZone) {
    const elapsed = performance.now() - zoomStartTime;
    const t = Math.min(elapsed / ZOOM_DURATION, 1);
    
    // 부드러운 easing 함수 적용
    const easedT = t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
    
    const lerped = basePos.clone().lerp(zoomTargetPos, easedT);

    camera.position.copy(lerped);
    camera.lookAt(playerZone.position);

    if (t >= 1) {
      isZoomIn = false;
      isZoomOut = true;
      zoomStartTime = performance.now();
    }
    return;
  }

  if (isZoomOut && playerZone) {
    const elapsed = performance.now() - zoomStartTime;
    const t = Math.min(elapsed / ZOOM_DURATION, 1);
    
    // 부드러운 easing 함수 적용
    const easedT = t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
    
    const lerped = zoomTargetPos.clone().lerp(basePos, easedT);

    camera.position.copy(lerped);
    camera.lookAt(playerZone.position);

    if (t >= 1) {
      isZoomOut = false;
    }
    return;
  }

  // 기본적으로 플레이어를 따라감
  if (autoFollowFlag && playerZone) {
    const cameraOffset = new THREE.Vector3(0, 30, 60);
    const targetCamPos = playerZone.position.clone().add(cameraOffset);

    const elapsed = performance.now() - openingFollowStartTime;
    const smoothLerpAlpha = Math.min(elapsed / OPENING_FOLLOW_DURATION, 1) * 0.05; 

    camera.position.lerp(targetCamPos, smoothLerpAlpha);
    camera.lookAt(playerZone.position);
    orbitControls.target.copy(playerZone.position);
    orbitControls.update();
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
