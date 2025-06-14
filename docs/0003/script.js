
import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';

window.addEventListener('DOMContentLoaded', async () => {
  const wrapper = document.querySelector('#webgl');
  const app = new ThreeApp(wrapper);
  await app.load();
  app.init();
  app.render();
}, false);

class ThreeApp {
  static MOON_SCALE = 0.15;
  static MOON_DISTANCE = 3.0;
  static SATELLITE_SPEED = 0.05;
  static CAMERA_PARAM = {
    fovy: 60,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 50.0,
    position: new THREE.Vector3(0.0, 2.0, 10.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  static RENDERER_PARAM = {
    clearColor: 0x222222,
    width: window.innerWidth,
    height: window.innerHeight,
  };
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 3.0,
    position: new THREE.Vector3(1.0, 1.0, 1.0),
  };
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 0.2,
  };
  static MATERIAL_PARAM = {
    color: 0xffffff,
  };
  static FOG_PARAM = {
    color: 0xffffff,
    near: 10.0,
    far: 20.0,
  };

  wrapper;
  renderer;
  scene;
  camera;
  directionalLight;
  ambientLight;
  controls;
  axesHelper;
  isDown;
  clock;
  sphereGeometry;
  earth;
  earthMaterial;
  earthTexture;
  moon;
  moonMaterial;
  moonTexture;
  satellite;
  satelliteMaterial;

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   */
  constructor(wrapper) {
    this.wrapper = wrapper;

    this.render = this.render.bind(this);

    window.addEventListener('keydown', (keyEvent) => {
      switch (keyEvent.key) {
        case ' ':
          this.isDown = true;
          break;
        default:
      }
    }, false);
    window.addEventListener('keyup', (keyEvent) => {
      this.isDown = false;
    }, false);


    window.addEventListener('pointermove', (pointerEvent) => {

      const pointerX = pointerEvent.clientX;
      const pointerY = pointerEvent.clientY;

      const longitude = 2 * Math.PI * pointerX / window.innerWidth;
      const latitude = Math.PI * pointerY / window.innerHeight;
      const moon_unit = new THREE.Vector3(
        -Math.sin(latitude) * Math.sin(longitude),
        Math.cos(latitude),
        -Math.sin(latitude) * Math.cos(longitude)
      );
      this.moon.position.copy(moon_unit.clone().multiplyScalar(this.earthRadius*1.1));
    }, false);


    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }, false);
  }

  load() {
    return new Promise((resolve) => {
      const earthPath = './earth.jpg';
      const moonPath = './moon.jpg';
      const loader = new THREE.TextureLoader();
      loader.load(earthPath, (earthTexture) => {

        this.earthTexture = earthTexture;
        loader.load(moonPath, (moonTexture) => {

          this.moonTexture = moonTexture;
          resolve();
        });
      });
    });
  }

  init() {

    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(ThreeApp.RENDERER_PARAM.width, ThreeApp.RENDERER_PARAM.height);
    this.wrapper.appendChild(this.renderer.domElement);


    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(
      ThreeApp.FOG_PARAM.color,
      ThreeApp.FOG_PARAM.near,
      ThreeApp.FOG_PARAM.far
    );


    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      ThreeApp.CAMERA_PARAM.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far,
    );
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);


    this.directionalLight = new THREE.DirectionalLight(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.intensity
    );
    this.directionalLight.position.copy(ThreeApp.DIRECTIONAL_LIGHT_PARAM.position);
    this.scene.add(this.directionalLight);


    this.ambientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity,
    );
    this.scene.add(this.ambientLight);


    this.sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);


    this.earthMaterial = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);
    this.earthMaterial.map = this.earthTexture;
    this.earth = new THREE.Mesh(this.sphereGeometry, this.earthMaterial);
    this.earthRadius = 2.5;
    this.earth.scale.setScalar(this.earthRadius * 2.0);
    this.scene.add(this.earth);


    this.moonMaterial = new THREE.MeshPhongMaterial({ emissive: 0x00ffff });

    this.moon = new THREE.Mesh(this.sphereGeometry, this.moonMaterial);

    this.moon.scale.setScalar(ThreeApp.MOON_SCALE);
    this.scene.add(this.moon);
    this.moon.position.set(0.0, 0.0, this.earthRadius*1.1);


    this.coords = new THREE.Group();
    this.scene.add(this.coords);


    // this.coneGeometry = new THREE.ConeGeometry(0.1, 0.5, 32);
    this.satelliteMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    this.satellite = new THREE.Group();
    this.satellite.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.35, 32), this.satelliteMaterial));
    this.tailwing = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 3), this.satelliteMaterial);
    this.satellite.add(this.tailwing);
    this.satellite.scale.setScalar(2);
    this.tailwing.rotateZ(Math.PI / 2);
    this.tailwing.rotateY(Math.PI / 2);
    // this.satellite = new THREE.Mesh(this.coneGeometry, this.satelliteMaterial);
    this.coords.add(this.satellite);
    this.satellite.position.set(this.earthRadius * 1.1, 0.0, 0.0);
    this.satellite.velocity = new THREE.Vector3(0.0, 0.0, 0.0);


    this.controls = new OrbitControls(this.camera, this.renderer.domElement);


    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);


    this.isDown = false;


    this.clock = new THREE.Clock();
  }

  render() {

    requestAnimationFrame(this.render);

    this.controls.update();


    const moon_unit = this.moon.position.clone().normalize();
    const currX = new THREE.Vector3();
    const currY = new THREE.Vector3();
    const currZ = new THREE.Vector3();
    this.coords.matrixWorld.extractBasis(currX, currY, currZ);
    const targetZ = new THREE.Vector3().crossVectors(currX, moon_unit).normalize();
    const crossZ = new THREE.Vector3().crossVectors(currZ, targetZ);
    const theta = Math.asin(crossZ.dot(currX));

    const roll_target = - theta;
    const roll_delta = roll_target - this.satellite.rotation.y;
    this.satellite.rotateY(Math.sign(roll_delta)*Math.min(Math.abs(roll_delta), 0.03));
    const azimuth = Math.max(Math.min(0.01, theta), -0.01);
    this.coords.rotateX(azimuth);
    // this.satellite.setRotationFromAxisAngle(new THREE.Vector3(0,-1,0), azimuth*20.0);

    const phi = Math.acos(moon_unit.dot(currX));
    if (phi > 0.01) {
      this.coords.rotateZ(0.003);

    }


    this.renderer.render(this.scene, this.camera);
  }
}
