import * as THREE from 'three';
import { getAllFlowerInstances } from './loader.js';

// 꽃말
export const flowerInfo = {
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

// 꽃말 띄우기
export const labeledTypes = new Set();

// 활성 파티클 시스템 목록
const activeParticleSystems = [];

// 꽃잎 파티클 시스템 클래스
class FlowerParticleSystem {
  constructor(scene, position, color) {
    this.scene = scene;
    this.particles = [];
    this.position = position.clone();  // position 복제
    this.position.y += 4;  // 시작 위치를 위로 올림
    this.color = color;
    this.particleCount = 35;
    this.createParticles();
  }

  createParticles() {
    const petalGeometry = new THREE.PlaneGeometry(1.0, 1.0);
    const petalMaterial = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < this.particleCount; i++) {
      const petal = new THREE.Mesh(petalGeometry, petalMaterial.clone());
      petal.position.copy(this.position);
      
      // 더 넓게 퍼지도록 초기 위치 약간 랜덤하게 설정
      const horizontalSpread = 2.0;  // 수평 퍼짐 정도 증가
      const verticalSpread = 1.0;    // 수직 퍼짐 정도
      petal.position.x += (Math.random() - 0.5) * horizontalSpread;
      petal.position.y += (Math.random() - 0.5) * verticalSpread;
      petal.position.z += (Math.random() - 0.5) * horizontalSpread;
      
      // 구형으로 퍼지는 초기 속도 설정
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;
      const speed = 0.04 + Math.random() * 0.06;  // 속도 더 감소
      
      petal.velocity = new THREE.Vector3(
        speed * Math.sin(theta) * Math.cos(phi),
        speed * Math.cos(theta) * 0.6,  // 수직 방향 속도 더 감소
        speed * Math.sin(theta) * Math.sin(phi)
      );

      petal.rotationSpeed = {
        x: (Math.random() - 0.5) * 0.02,  // 회전 속도 더 감소
        y: (Math.random() - 0.5) * 0.02,
        z: (Math.random() - 0.5) * 0.02
      };

      // 수명과 페이드아웃 속도 조정
      petal.life = 1.0;
      petal.fadeSpeed = 0.003 + Math.random() * 0.004;  // 페이드아웃 더 느리게

      this.scene.add(petal);
      this.particles.push(petal);
    }
  }

  update() {
    let allDead = true;
    this.particles.forEach(petal => {
      if (petal.life > 0) {
        allDead = false;
        // 위치 업데이트
        petal.position.add(petal.velocity);
        
        // 회전 업데이트
        petal.rotation.x += petal.rotationSpeed.x;
        petal.rotation.y += petal.rotationSpeed.y;
        petal.rotation.z += petal.rotationSpeed.z;
        
        // 감속 및 중력 효과
        petal.velocity.y -= 0.001;  // 더 약한 중력
        petal.velocity.multiplyScalar(0.997);  // 더 약한 공기 저항
        
        // 좌우로 살짝 흔들리는 효과
        const windEffect = Math.sin(Date.now() * 0.0008 + petal.position.y) * 0.012;
        petal.position.x += windEffect;
        petal.position.z += windEffect * 0.5;
        
        // 페이드 아웃
        petal.life -= petal.fadeSpeed;
        petal.material.opacity = petal.life * 0.95;
      }
    });

    if (allDead) {
      this.dispose();
    }
  }

  dispose() {
    this.particles.forEach(petal => {
      this.scene.remove(petal);
      petal.geometry.dispose();
      petal.material.dispose();
    });
    this.particles = [];
  }
}

export function createTextSprite(message) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 1024;
  canvas.height = 256;
  
  // 텍스트 스타일 설정
  ctx.font = '40px "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 외곽선
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 6;
  ctx.strokeText(message, 512, 128);
  
  // 내부 텍스트
  ctx.fillStyle = 'white';
  ctx.fillText(message, 512, 128);

  ctx.shadowColor = 'rgb(235, 255, 121)';
  ctx.shadowBlur = 30;

  ctx.fillStyle = 'white';
  ctx.fillText(message, 512, 128);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ 
    map: texture,
    transparent: true,
    opacity: 0 // 시작할 때는 투명
  });
  
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(60, 16, 1);
  
  // 애니메이션 관련 속성 추가
  sprite.userData.animationStartTime = performance.now();
  sprite.userData.animationDuration = 1000; // 1초 동안 페이드 인
  
  return sprite;
}

export function showFlowerLabel(type, position, scene) {
  const info = flowerInfo[type];
  if (!info) return;

  const message = `${info.name}: ${info.meaning}`;
  const sprite = createTextSprite(message);
  let textY = 5;
  if (type === 'daffodil') textY += 3;
  if (type === 'sunflower') textY += 10;
  if (type === 'hyacinth') textY += 5;
  sprite.position.copy(position.clone().add(new THREE.Vector3(0, textY, 0)));
  scene.add(sprite);

  // 꽃 종류에 따른 파티클 색상 설정
  let particleColor;
  switch(type) {
    case 'daffodil': particleColor = 0xFFFF00; break;    // 노랑
    case 'sunflower': particleColor = 0xFFA500; break;   // 주황
    case 'hyacinth': particleColor = 0x9370DB; break;    // 보라
    case 'cactus': particleColor = 0xFF69B4; break;      // 분홍
    case 'cosmos': particleColor = 0xFF69B4; break;      // 분홍
    case 'daisy': particleColor = 0xFFFFFF; break;       // 하양
    case 'marigold': particleColor = 0xFFA500; break;    // 주황
    case 'morningGlory': particleColor = 0x4169E1; break;// 파랑
    case 'tulip': particleColor = 0xFF0000; break;       // 빨강
    default: particleColor = 0xFFFFFF;
  }

  // 파티클 시스템 생성
  const particleSystem = new FlowerParticleSystem(scene, position, particleColor);
  activeParticleSystems.push(particleSystem);
}

export function updateTextSystems() {
  const now = performance.now();
  activeParticleSystems.forEach((ps, i) => {
    ps.update();
    if (ps.particles.length === 0) activeParticleSystems.splice(i, 1);
  });

  // 텍스트 페이드 인
  const sprites = document.querySelectorAll('canvas');
  // 만약 canvas 외 텍스트 Sprite도 쓰였다면 scene.children 내에서 `.isSprite` 검사로 처리
}

export function checkFlowerCompletionAndLabel(scene) {
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
      showFlowerLabel(type, center, scene);
      labeledTypes.add(type);
    }
  });
}

export function showCompletionText() {
  const completionTextDiv = document.createElement('div');
  completionTextDiv.style.position = 'fixed';
  completionTextDiv.style.left = '50%';
  completionTextDiv.style.top = '50%';
  completionTextDiv.style.transform = 'translate(-50%, 30%) scale(0.8)';
  completionTextDiv.style.color = '#ffffff';
  completionTextDiv.style.fontSize = '64px';
  completionTextDiv.style.fontFamily = '"Malgun Gothic", sans-serif';
  completionTextDiv.style.textAlign = 'center';
  completionTextDiv.style.opacity = '0';
  completionTextDiv.style.transition = 'all 2s cubic-bezier(0.4, 0, 0.2, 1)';
  completionTextDiv.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
  completionTextDiv.style.pointerEvents = 'none';
  completionTextDiv.style.whiteSpace = 'pre-line';
  completionTextDiv.innerHTML = '완료!';
  document.body.appendChild(completionTextDiv);

  // 시작 위치 설정 (아래에서 위로 올라오는 효과)
  completionTextDiv.style.transform = 'translate(-50%, 30%) scale(0.8)';
  completionTextDiv.style.opacity = '0';

  // 애니메이션 시작
  setTimeout(() => {
    completionTextDiv.style.transform = 'translate(-50%, -50%) scale(1)';
    completionTextDiv.style.opacity = '1';
  }, 100);

  // 텍스트 제거 (8초 후)
  setTimeout(() => {
    completionTextDiv.style.opacity = '0';
    completionTextDiv.style.transform = 'translate(-50%, -100%) scale(0.8)';
    setTimeout(() => {
      document.body.removeChild(completionTextDiv);
    }, 2000);
  }, 8000);
}
