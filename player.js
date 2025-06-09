import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
  constructor(scene, raycaster, groundMeshes, zonePosition, downDirection) {
    this.scene = scene;
    this.raycaster = raycaster;
    this.groundMeshes = groundMeshes;
    this.zonePosition = zonePosition;
    this.downDirection = downDirection;
    this.model = null;
    this.loader = new GLTFLoader();
    this.mixer = null;
    this.action = null;
    this.lastUpdateTime = performance.now();
    this.currentAnim = 'idle';
    this.animations = {
      idle: { url: './assets/models/idle.glb', gltf: null },
      walk: { url: './assets/models/walk.glb', gltf: null },
      water: { url: './assets/models/water.glb', gltf: null }
    };
    this.isWatering = false;
    this.waterTimeoutId = null;
    this.isMoving = false;
    this._preloadAllAnimations();
  }

  _preloadAllAnimations() {
    // 모든 애니메이션 glb 미리 로드
    const keys = Object.keys(this.animations);
    let loadedCount = 0;
    keys.forEach((key) => {
      this.loader.load(this.animations[key].url, (gltf) => {
        this.animations[key].gltf = gltf;
        loadedCount++;
        // 최초 idle 로드 시 모델 세팅
        if (key === 'idle' && !this.model) {
          this._setModelFromGLTF(gltf);
        }
      });
    });
  }

  _setModelFromGLTF(gltf) {
    if (this.model) {
      this.scene.remove(this.model);
    }
    this.model = gltf.scene;
    this.model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    this.model.position.copy(this.zonePosition);
    this.model.position.y = 0;
    this.model.scale.set(10, 10, 10);
    this.scene.add(this.model);
    this.updateY();
    this._playAnimation(gltf);
  }

  _playAnimation(gltf) {
    if (this.mixer) this.mixer.stopAllAction();
    this.mixer = new THREE.AnimationMixer(this.model);
    if (gltf.animations && gltf.animations.length > 0) {
      this.action = this.mixer.clipAction(gltf.animations[0]);
      this.action.reset().play();
    }
  }

  setAnimation(name) {
    if (this.isWatering && name !== 'idle' && name !== 'water' && name !== 'walk') return;
    if (this.currentAnim === name) return;
    const anim = this.animations[name];
    if (anim && anim.gltf) {
      this.currentAnim = name;
      this._setModelFromGLTF(anim.gltf);
    }
  }

  setPosition(x, y, z) {
    if (this.model) {
      this.model.position.set(x, y, z);
    }
  }

  updateY() {
    if (this.groundMeshes.length > 0 && this.model) {
      const rayOrigin = new THREE.Vector3(this.zonePosition.x, 100, this.zonePosition.z);
      this.raycaster.set(rayOrigin, this.downDirection);
      const intersects = this.raycaster.intersectObjects(this.groundMeshes, true);
      if (intersects.length > 0) {
        const groundY = intersects[0].point.y;
        this.model.position.y = groundY + 1;
      }
    }
  }

  update(zonePosition) {
    if (this.model) {
      this.zonePosition.copy(zonePosition);
      this.model.position.x = this.zonePosition.x;
      this.model.position.z = this.zonePosition.z;
      this.updateY();
    }
    // 애니메이션 업데이트
    if (this.mixer) {
      const now = performance.now();
      const delta = (now - this.lastUpdateTime) / 1000;
      this.mixer.update(delta);
      this.lastUpdateTime = now;
    } else {
      this.lastUpdateTime = performance.now();
    }
  }

  // 애니메이션 테스트용 키(1: idle, 2: walk, 3: water)
  bindAnimationHotkeys() {
    window.addEventListener('keydown', (e) => {
      if (e.key === '1') this.setAnimation('idle');
      if (e.key === '2') this.setAnimation('walk');
      if (e.key === '3') {
        this.setAnimation('water');
        if (typeof window !== 'undefined') {
          window.isFirstPerson = true;
          console.log("카메라 1인칭 전환");
          window.firstPersonStartTime = performance.now();
        }
      }
    });
  }

  setLookDirection(direction) {
    // direction: THREE.Vector3, xz 평면 방향
    if (this.model && direction.lengthSq() > 0.0001) {
      // y축 회전만 적용 (heading)
      const angle = Math.atan2(direction.x, direction.z); // z축 기준
      this.model.rotation.y = angle;
    }
  }

  getAnimationDuration(name) {
    const anim = this.animations[name];
    if (anim && anim.gltf && anim.gltf.animations && anim.gltf.animations.length > 0) {
      return anim.gltf.animations[0].duration;
    }
    return null;
  }

  setMoving(isMoving) {
    // water 중에 이동 시작하면 water를 즉시 중단하고 walk로 전환
    if (isMoving && this.isWatering) {
      if (this.waterTimeoutId) clearTimeout(this.waterTimeoutId);
      this.isWatering = false;
      this.waterTimeoutId = null;
      this.setAnimation('walk');
    }
    // water가 끝나고 idle 상태인데 이동 중이면 walk로 전환
    if (isMoving && !this.isWatering && this.currentAnim === 'idle') {
      this.setAnimation('walk');
    }
    this.isMoving = isMoving;
  }

  playWaterOnceThenIdle() {
    if (this.isWatering) return; // 중복 방지
    this.isWatering = true;
    this.setAnimation('water');
    if (this.waterTimeoutId) clearTimeout(this.waterTimeoutId);
    const duration = this.getAnimationDuration('water') || 2.0;
    this.waterTimeoutId = setTimeout(() => {
      this.isWatering = false;
      this.waterTimeoutId = null;
      // water 끝난 뒤 이동 중이면 walk, 아니면 idle
      if (this.isMoving) {
        this.setAnimation('walk');
      } else {
        this.setAnimation('idle');
      }
    }, duration * 1000);
  }
} 
