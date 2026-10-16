/**
 * ARGONIA: Crown of the Spire
 * Three.js WebGL Scene Manager, Dynamic Day/Night Atmosphere, Starfield & Multi-Mode Camera Rig
 */

import * as THREE from 'three';

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true, // Required for 4K Chronicle Poster & WebM capture
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1e293b);
    this.scene.fog = new THREE.FogExp2(0x1e293b, 0.0085);

    this.camera = new THREE.PerspectiveCamera(42, this.width / this.height, 0.5, 220);
    this.cameraMode = 'tactical'; // 'tactical' | 'action' | 'overview'
    this.cameraYaw = 0;
    this.cameraZoom = 1.0; // 0.55 (close) .. 1.65 (wide)
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.cameraPos = new THREE.Vector3(0, 32, 30);
    this.shakeAmount = 0;

    // Ground intersection plane for accurate mouse aiming & socket picking
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.raycaster = new THREE.Raycaster();
    this.mouseNdc = new THREE.Vector2(0, 0);
    this.mouseWorld = new THREE.Vector3(0, 0, 0);

    // Day/Night transition state (0 = Day, 1 = Night)
    this.nightBlend = 0;
    this.targetNightBlend = 0;
    this.currentPalette = null;

    this.setupLights();
    this.setupAtmosphericParticles();

    this.handleResize = this.onResize.bind(this);
    window.addEventListener('resize', this.handleResize);
  }

  setupLights() {
    this.hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x3b6e38, 0.85);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfffbeb, 1.85);
    this.dirLight.position.set(28, 46, 24);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    const d = 48;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.camera.near = 4;
    this.dirLight.shadow.camera.far = 130;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    // Warm Citadel & Hero Point Lights (intensify at night!)
    this.citadelLight = new THREE.PointLight(0xf59e0b, 1.2, 28, 1.5);
    this.citadelLight.position.set(0, 6.5, 1);
    this.scene.add(this.citadelLight);

    this.heroLight = new THREE.PointLight(0x38bdf8, 0.8, 16, 1.5);
    this.heroLight.position.set(0, 3.2, 0);
    this.scene.add(this.heroLight);
  }

  setupAtmosphericParticles() {
    const count = 260;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 110;
      positions[i * 3 + 1] = 1.5 + Math.random() * 26;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 110;

      const c = new THREE.Color().setHSL(0.12 + Math.random() * 0.5, 0.85, 0.72);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.42,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    this.ambientSpores = new THREE.Points(geo, mat);
    this.scene.add(this.ambientSpores);
  }

  setRealmPalette(palette) {
    this.currentPalette = palette;
    this.applyAtmosphere(true);
  }

  setNightMode(isNight) {
    this.targetNightBlend = isNight ? 1.0 : 0.0;
  }

  applyAtmosphere(instant = false) {
    if (!this.currentPalette) return;
    if (instant) {
      this.nightBlend = this.targetNightBlend;
    }
    const t = this.nightBlend;
    const pal = this.currentPalette;

    const dayBg = new THREE.Color(pal.daySkyHorizon || 0x93c5fd);
    const nightBg = new THREE.Color(pal.nightSkyTop || 0x070b19);
    const bg = dayBg.lerp(nightBg, t);
    this.scene.background.copy(bg);
    this.scene.fog.color.copy(bg);
    this.scene.fog.density = THREE.MathUtils.lerp(0.0062, 0.0095, t);

    const daySun = new THREE.Color(pal.daySun || 0xfffbeb);
    const nightMoon = new THREE.Color(pal.nightMoon || 0x818cf8);
    this.dirLight.color.copy(daySun).lerp(nightMoon, t);
    this.dirLight.intensity = THREE.MathUtils.lerp(1.9, 0.95, t);

    // Shift sun/moon angle subtly between day and night
    this.dirLight.position.set(
      THREE.MathUtils.lerp(28, -22, t),
      THREE.MathUtils.lerp(48, 38, t),
      THREE.MathUtils.lerp(24, -18, t)
    );

    const dayHemiSky = new THREE.Color(pal.daySkyHorizon || 0xe0f2fe);
    const nightHemiSky = new THREE.Color(pal.nightSkyHorizon || 0x1e1b4b);
    this.hemiLight.color.copy(dayHemiSky).lerp(nightHemiSky, t);
    this.hemiLight.groundColor.setHex(pal.groundSecondary || 0x1e293b);
    this.hemiLight.intensity = THREE.MathUtils.lerp(0.9, 0.48, t);

    // Night boosts warm citadel & hero point lights for dramatic contrast
    this.citadelLight.intensity = THREE.MathUtils.lerp(0.8, 3.2, t);
    this.heroLight.intensity = THREE.MathUtils.lerp(0.5, 2.4, t);
  }

  cycleCameraMode() {
    const order = ['tactical', 'action', 'overview'];
    const nextIdx = (order.indexOf(this.cameraMode) + 1) % order.length;
    this.cameraMode = order[nextIdx];
    return this.cameraMode;
  }

  addScreenShake(amount = 0.5) {
    this.shakeAmount = Math.min(2.2, this.shakeAmount + amount);
  }

  updateMouseRay(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouseNdc, this.camera);
    const hit = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.groundPlane, hit)) {
      this.mouseWorld.copy(hit);
    }
    return this.mouseWorld;
  }

  update(dt, heroPosition = null, heroRotationY = 0) {
    // 1. Smoothly blend Day <-> Night atmosphere
    if (Math.abs(this.nightBlend - this.targetNightBlend) > 0.001) {
      const step = dt * 1.4;
      if (this.nightBlend < this.targetNightBlend) {
        this.nightBlend = Math.min(this.targetNightBlend, this.nightBlend + step);
      } else {
        this.nightBlend = Math.max(this.targetNightBlend, this.nightBlend - step);
      }
      this.applyAtmosphere(false);
    }

    // 2. Drift ambient spores
    if (this.ambientSpores) {
      this.ambientSpores.rotation.y += dt * 0.03;
      this.ambientSpores.material.opacity = THREE.MathUtils.lerp(0.38, 0.85, this.nightBlend);
    }

    // 3. Update Camera Rig based on mode
    const focus = heroPosition || new THREE.Vector3(0, 0, 0);
    this.heroLight.position.set(focus.x, 3.4, focus.z);

    let desiredTarget = new THREE.Vector3();
    let desiredPos = new THREE.Vector3();

    if (this.cameraMode === 'overview') {
      desiredTarget.set(0, 0, -2);
      const dist = 48 * this.cameraZoom;
      desiredPos.set(
        Math.sin(this.cameraYaw) * dist * 0.7,
        46 * this.cameraZoom,
        Math.cos(this.cameraYaw) * dist * 0.75
      );
    } else if (this.cameraMode === 'action') {
      // Close dynamic 3rd-person action view
      desiredTarget.set(focus.x, 1.8, focus.z - 3.5);
      const dist = 16.5 * this.cameraZoom;
      desiredPos.set(
        focus.x + Math.sin(this.cameraYaw) * dist,
        11.5 * this.cameraZoom,
        focus.z + Math.cos(this.cameraYaw) * dist
      );
    } else {
      // 'tactical' Thronefall-style tilted diorama camera following hero with battlefield tether
      const tetherX = focus.x * 0.72;
      const tetherZ = focus.z * 0.72;
      desiredTarget.set(tetherX, 0.5, tetherZ);
      const dist = 29 * this.cameraZoom;
      const height = 30 * this.cameraZoom;
      desiredPos.set(
        tetherX + Math.sin(this.cameraYaw) * dist,
        height,
        tetherZ + Math.cos(this.cameraYaw) * dist
      );
    }

    const smooth = 1 - Math.exp(-8.5 * dt);
    this.cameraTarget.lerp(desiredTarget, smooth);
    this.cameraPos.lerp(desiredPos, smooth);

    // Apply screen shake
    const finalPos = this.cameraPos.clone();
    if (this.shakeAmount > 0.01) {
      finalPos.x += (Math.random() - 0.5) * this.shakeAmount;
      finalPos.y += (Math.random() - 0.5) * this.shakeAmount * 0.7;
      finalPos.z += (Math.random() - 0.5) * this.shakeAmount;
      this.shakeAmount = Math.max(0, this.shakeAmount - dt * 4.2);
    }

    this.camera.position.copy(finalPos);
    this.camera.lookAt(this.cameraTarget);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }
}
