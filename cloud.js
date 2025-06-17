import * as THREE from 'three';

const CENTER = new THREE.Vector3(0, -50, 0); // 공전 중심점

export class FloatingCloud {
  constructor(scene) {
    const size = THREE.MathUtils.randFloat(5, 10);
    const geometry = new THREE.SphereGeometry(size, 16, 16);

    const material = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: THREE.MathUtils.randFloat(0.3, 0.7),
      shininess: 10
    });

    this.mesh = new THREE.Mesh(geometry, material);

    this.center = new THREE.Vector3(0, THREE.MathUtils.randFloat(-2000, 0), 0);

    // 공전 궤도 파라미터
    this.orbitRadius = THREE.MathUtils.randFloat(3000, 200); // 중심으로부터 거리
    this.orbitSpeed = THREE.MathUtils.randFloat(0.05, 0.1); // 속도 (rad/sec)
    this.orbitAngle = Math.random() * Math.PI * 2; // 초기 각도

    // Y축 위아래 부유 애니메이션
    this.floatPhase = Math.random() * Math.PI * 2;
    this.floatSpeed = THREE.MathUtils.randFloat(0.5, 1.5);
    this.floatAmplitude = THREE.MathUtils.randFloat(2, 5);

    scene.add(this.mesh);
  }

  update(timeSec) {
    // 공전 (XZ 평면)
    this.orbitAngle += this.orbitSpeed * 0.01;
    const x = this.center.x + this.orbitRadius * Math.cos(this.orbitAngle);
    const z = this.center.z + this.orbitRadius * Math.sin(this.orbitAngle);

    // 위아래 부유 (Y축)
    const y = this.center.y + Math.sin(timeSec * this.floatSpeed + this.floatPhase) * this.floatAmplitude;

    this.mesh.position.set(x, y, z);
  }
}
