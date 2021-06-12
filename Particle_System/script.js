import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';
// 프레임 마지막에 셰이더 추가

// vertex shader
// 위치를 지정하고 점의 크기를 설정
const _VS = `
uniform float pointMultiplier;

attribute float size;
attribute vec4 colour;

varying vec4 vColour;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize =  size * pointMultiplier / gl_Position.w;

  vColour = colour;
}`;

// fragment shader
// 모든 작업이 완료되면 로드
const _FS = `
uniform sampler2D diffuseTexture;

varying vec4 vColour;

void main() {
  gl_FragColor = texture2D(diffuseTexture, gl_PointCoord) * vColour;
}`;


// ParticleSystem 클래스 정의
class ParticleSystem {
  constructor(params) {
    const uniforms = {
      diffuseTexture: {
        value: new THREE.TextureLoader().load('./resources/fire.png')
      },
      pointMultiplier: {
        value: window.innerHeight / (2.0 * Math.tan(0.5 * 60.0 * Math.PI / 180.0))
      }
    };

    // 머티리얼을 생성
    this._material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: _VS,
      fragmentShader: _FS,
      blending: THREE.NormalBlending,
      depthTest: true,
      depthWrite: false,
      transparent: true,
      vertexColors: true
  });

    this._camera = params.camera;
    this._particles = [];

    // buffergeometry
    // 항상 정점을 유지하기 위해 bufferGeometry 생성
    this._geometry = new THREE.BufferGeometry();
    this._geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    // 사이즈 변경
    this._geometry.setAttribute('size', new THREE.Float32BufferAttribute([], 1));
    // 색상 변형
    this._geometry.setAttribute('colour', new THREE.Float32BufferAttribute([],3));
    
    // 데이터를 렌더링 할 포인트 목록
    this._points = new THREE.Points(this._geometry, this._material);

    params.parent.add(this._points);

    this._AddParticles();
    this._UpdateGeometry();
  }

  // particle 추가 함수
  _AddParticles(timeElapsed) {
    // 10개의 입자를 만들어서 각각 임의의 위치에서 시작
    for (let i=0; i<10; i++) {
      const life = (Math.random() * 0.75 + 0.25) * 10.0;
      this._particles.push({
        position: new THREE.Vector3(
          (Math.random() * 2 - 1) * 1.0,
          (Math.random() * 2 - 1) * 1.0,
          (Math.random() * 2 - 1) * 1.0),
        // 입자 크기를 무작위로 
        size: Math.random() * 2.0,
        // rgb를 랜덤화하여 색상 변경
        colour: new THREE.Color(Math.random(), Math.random(), Math.random()),
        alpha: Math.random(),
      });
    }
  }

  // 입자 배열을 반복해서 버퍼 형상 오브젝트를
  // 분리하여 매개 변수를 애니메이션화
  _UpdateGeometry() {
    // 입자 배열
    const positions = [];
    // 크기 배열
    const sizes = [];
    // 색상 배열
    const colours = [];

    // 입자 분리
    for (let p of this._particles) {
      positions.push(p.position.x, p.position.y, p.position.z);
      sizes.push(p.size);
      colours.push(p.colour.r, p.position.g, p.position.b, p.alpha);
    }

    // geometry에 업데이트
    // 이거 안하면 안됨..
    this._geometry.setAttribute(
      'position', new THREE.Float32BufferAttribute(positions, 3));
    this._geometry.setAttribute(
      'size', new THREE.Float32BufferAttribute(sizes, 1));
    this._geometry.setAttribute(
      'colour', new THREE.Float32BufferAttribute(colours, 4));

    this._geometry.attributes.position.needsUpdate = true;
    this._geometry.attributes.size.needsUpdate = true;
    this._geometry.attributes.colour.needsUpdate = true;
  }

  _UpdateParticles(timeElapsed) {
    this._particles.sort((a,b) => {
      // 카메라를 particle에 추가하여 가장 가까운 거리에서
      const d1 = this._camera.position.distanceTo(a.position);
      const d2 = this._camera.position.distanceTo(b.position);

      if (d1 > d2) {
        return -1;
      }

      if (d1 < d2) {
        return 1;
      }

      return 0
    });
  }

  // 가장 먼 곳에서 입자를 정렬
  Step(timeElapsed) {
    this._UpdateParticles(timeElapsed);
    this._UpdateGeometry();
  }

}

class ParticleSystemDemo {
  constructor() {
    this._Initialize();
  }

  _Initialize() {
    this._threejs = new THREE.WebGLRenderer({
      antialias: true,
    });
    this._threejs.shadowMap.enabled = true;
    this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
    this._threejs.setPixelRatio(window.devicePixelRatio);
    this._threejs.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(this._threejs.domElement);

    window.addEventListener('resize', () => {
      this._OnWindowResize();
    }, false);

    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 1000.0;
    this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this._camera.position.set(25, 10, 0);

    this._scene = new THREE.Scene();

    let light = new THREE.DirectionalLight(0xFFFFFF, 1.0);
    light.position.set(20, 100, 10);
    light.target.position.set(0,0,0);
    light.shadow.bias = -0.001;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.left = 100;
    light.shadow.camera.right = -100;
    light.shadow.camera.top = 100;
    light.shadow.camera.bottom = -100;
    this._scene.add(light);

    light = new THREE.AmbientLight(0x101010);
    this._scene.add(light);

    const controls = new OrbitControls(
      this._camera, this._threejs.domElement);
    controls.target.set(0, 0, 0);
    controls.update();

    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
      './resources/posx.jpg',
      './resources/negx.jpg',
      './resources/posy.jpg',
      './resources/negy.jpg',
      './resources/posz.jpg',
      './resources/negz.jpg',
    ]);
    this._scene.background = texture;

    this._particles = new ParticleSystem({
      parent: this._scene,
      camera: this._camera,
    });

    this._LoadModel();

    this._previousRAF = null;
    this._RAF();
  }

  _LoadModel() {
    const loader = new GLTFLoader();
    loader.load('./shiba/scene.gltf', (gltf) => {
      gltf.scene.traverse(c => {
        c.castShadow = true;
      });
      this._scene.add(gltf.scene);
    });
  }

  _OnWindowResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._threejs.setSize(window.innerWidth, window.innerHeight);
  }

  _RAF() {
    requestAnimationFrame((t) => {
      if (this._previousRAF === null) {
        this._previousRAF = t;
      }

      this._RAF();

      this._threejs.render(this._scene, this._camera);
      
    });
  }
}

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new ParticleSystemDemo();
});
