// wind.js – vertex‑shader–based wind system for flowers
// ------------------------------------------------------
// * attachWind(materials)  →  patch materials so vertices sway
// * updateWind(deltaSec)   →  advance animation (call every frame)
// * windParams            →  tweak strength / freq / direction at runtime
//
// Integration example (in spawnFlower):
//   import { attachWind } from './wind.js';
//   ... after you have the 'materials' array ...
//   attachWind(materials);
//
// In your main animation loop:
//   import { updateWind } from './wind.js';
//   const now   = performance.now();
//   const delta = (now - prev) * 0.001; // ms → s
//   updateWind(delta);
//   prev = now;
// ------------------------------------------------------

import * as THREE from 'three';

// ---- user‑tweakable global parameters ----
export const windParams = {
  strength: 0.25,                      // 최대 횡변위 (world unit)
  frequency: 1.5,                      // 진동수 (rad/sec)
  direction: new THREE.Vector2(1, 0),  // 풍향 (xz 평면)
};

// 모든 shader uniform 세트를 저장해 두었다가 매 프레임 갱신한다
const _uniformSets = [];

/**
 * 꽃의 각 Mesh.material 에 바람 변위를 주입한다.
 * materials 배열은 같은 꽃 인스턴스의 material 들이어야 하며,
 * 이 함수는 **단 한 번만** 호출해도 된다.
 */
export function attachWind(materials) {
  materials.forEach(mat => {
    // 이미 패치한 재질은 건너뛰기
    if (mat.userData?.windPatched) return;
    mat.userData.windPatched = true;

    mat.onBeforeCompile = shader => {
      shader.uniforms.uTime     = { value: 0 };
      shader.uniforms.uStrength = { value: windParams.strength };
      shader.uniforms.uFreq     = { value: windParams.frequency };
      shader.uniforms.uDir      = { value: windParams.direction };

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
          #include <begin_vertex>
          float weight = clamp(position.y / 5.0, 0.0, 1.0);
          float sway   = sin(uFreq * uTime + position.y) *
                         uStrength * weight;
          transformed.x += sway * uDir.x;
          transformed.z += sway * uDir.y;
        `
      );
      _uniformSets.push(shader.uniforms);
    };

    // 반드시 재컴파일 지시
    mat.needsUpdate = true;
  });
}

/**
 * 매 프레임 wind animation advance 함수.
 * @param {number} deltaSec – 이전 프레임 이후 경과 시간(초)
 */
export function updateWind(deltaSec) {
  for (const u of _uniformSets) {
    u.uTime.value += deltaSec;
  }
}

export function getWindUniformCount() { return _uniformSets.length; }