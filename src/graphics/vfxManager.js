/**
 * ARGONIA: Crown of the Spire
 * 파티클, 투사체, 충격파, 장판, 피해 숫자.
 */

import * as THREE from 'three';

export class VfxManager {
  constructor(scene, overlayContainer = null) {
    this.scene = scene;
    this.overlayContainer = overlayContainer;
    this.root = new THREE.Group();
    this.root.name = 'VfxRoot';
    if (this.scene) {
      this.scene.add(this.root);
    }

    this.particles = [];
    this.shockwaves = [];
    this.beams = [];
    this.groundZones = [];
    this.floatingTexts = [];

    // Shared geometries for fast instancing/cloning
    this.boxGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
    this.ringGeo = new THREE.RingGeometry(0.75, 1.0, 28);
    this.ringGeo.rotateX(-Math.PI / 2);
    this.cylGeo = new THREE.CylinderGeometry(1.0, 1.0, 22, 18, 1, true);
    this.discGeo = new THREE.CircleGeometry(1.0, 32);
    this.discGeo.rotateX(-Math.PI / 2);
  }

  clearAll() {
    for (const p of this.particles) {
      this.root.remove(p.mesh);
      p.mesh.material?.dispose();
    }
    for (const s of this.shockwaves) {
      this.root.remove(s.mesh);
      s.mesh.material?.dispose();
    }
    for (const b of this.beams) {
      this.root.remove(b.mesh);
      b.mesh.geometry?.dispose?.();
      b.mesh.material?.dispose();
    }
    for (const z of this.groundZones) {
      this.root.remove(z.mesh);
      z.mesh.material?.dispose();
    }
    this.particles = [];
    this.shockwaves = [];
    this.beams = [];
    this.groundZones = [];
    this.floatingTexts = [];
    if (this.overlayContainer) {
      this.overlayContainer.innerHTML = '';
    }
  }

  spawnBurst(x, y, z, color = 0xf59e0b, count = 12, speed = 7.5, scale = 1.0) {
    if (!this.scene) return;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(this.boxGeo, mat);
      mesh.position.set(x, y, z);
      const s = (0.6 + Math.random() * 0.9) * scale;
      mesh.scale.setScalar(s);

      const angle = Math.random() * Math.PI * 2;
      const horiz = (0.3 + Math.random() * 0.8) * speed;
      const vy = (0.5 + Math.random() * 0.9) * speed;

      this.root.add(mesh);
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * horiz,
        vy,
        vz: Math.sin(angle) * horiz,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.35,
      });
    }
  }

  spawnShockwave(x, z, maxRadius = 4.5, color = 0xf59e0b, duration = 0.45) {
    if (!this.scene) return;
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.ringGeo, mat);
    mesh.position.set(x, 0.14, z);
    mesh.scale.setScalar(0.2);
    this.root.add(mesh);
    this.shockwaves.push({
      mesh,
      maxRadius,
      life: 0,
      maxLife: duration,
    });
  }

  spawnSkyBeam(x, z, radius = 3.5, color = 0xfef08a, duration = 0.85) {
    if (!this.scene) return;
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.cylGeo, mat);
    mesh.position.set(x, 11, z);
    mesh.scale.set(radius, 1, radius);
    this.root.add(mesh);
    this.beams.push({
      mesh,
      baseRadius: radius,
      life: 0,
      maxLife: duration,
      isCylinder: true,
    });
    this.spawnShockwave(x, z, radius * 1.35, color, duration * 0.8);
  }

  spawnLightningChain(points, color = 0x38bdf8, duration = 0.26) {
    if (!this.scene || points.length < 2) return;
    const verts = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const steps = 4;
      let prev = new THREE.Vector3(a.x, a.y || 1.4, a.z);
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const jitter = s < steps ? (Math.random() - 0.5) * 0.85 : 0;
        const next = new THREE.Vector3(
           THREE.MathUtils.lerp(a.x, b.x, t) + jitter,
          THREE.MathUtils.lerp(a.y || 1.4, b.y || 1.4, t) + Math.abs(jitter) * 0.5,
          THREE.MathUtils.lerp(a.z, b.z, t) - jitter
        );
        verts.push(prev.x, prev.y, prev.z, next.x, next.y, next.z);
        prev = next;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
    });
    const line = new THREE.LineSegments(geo, mat);
    this.root.add(line);
    this.beams.push({
      mesh: line,
      life: 0,
      maxLife: duration,
      isLine: true,
    });
  }

  spawnGroundZone(x, z, radius = 6.0, color = 0xfde047, duration = 6.0) {
    if (!this.scene) return;
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.discGeo, mat);
    mesh.position.set(x, 0.11, z);
    mesh.scale.setScalar(radius);
    this.root.add(mesh);
    this.groundZones.push({
      mesh,
      radius,
      life: 0,
      maxLife: duration,
    });
  }

  spawnFloatingText(x, y, z, text, color = '#ffffff', isBig = false) {
    if (!this.overlayContainer) return;
    // Cap active floating texts to keep DOM blazingly fast
    if (this.floatingTexts.length > 42) {
      const oldest = this.floatingTexts.shift();
      oldest.el?.remove();
    }
    const el = document.createElement('div');
    el.className = `float-combat-text ${isBig ? 'float-big' : ''}`;
    el.textContent = text;
    el.style.color = color;
    this.overlayContainer.appendChild(el);

    this.floatingTexts.push({
      el,
      worldPos: new THREE.Vector3(x + (Math.random() - 0.5) * 0.7, y, z + (Math.random() - 0.5) * 0.7),
      vy: isBig ? 2.6 : 1.9,
      life: 0,
      maxLife: isBig ? 1.15 : 0.80,
    });
  }

  update(dt, camera, viewportWidth, viewportHeight) {
    // 1. Update 3D burst particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.root.remove(p.mesh);
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= 18 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y = Math.max(0.08, p.mesh.position.y + p.vy * dt);
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += 5 * dt;
      p.mesh.rotation.y += 5 * dt;
      p.mesh.material.opacity = 1 - p.life / p.maxLife;
    }

    // 2. Update ground shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.life += dt;
      if (s.life >= s.maxLife) {
        this.root.remove(s.mesh);
        s.mesh.material.dispose();
        this.shockwaves.splice(i, 1);
        continue;
      }
      const t = s.life / s.maxLife;
      const ease = 1 - Math.pow(1 - t, 3);
      s.mesh.scale.setScalar(0.2 + ease * s.maxRadius);
      s.mesh.material.opacity = (1 - t) * 0.85;
    }

    // 3. Update skybeams & lightning lines
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      b.life += dt;
      if (b.life >= b.maxLife) {
        this.root.remove(b.mesh);
        if (b.isLine) b.mesh.geometry.dispose();
        b.mesh.material.dispose();
        this.beams.splice(i, 1);
        continue;
      }
      const t = b.life / b.maxLife;
      if (b.isCylinder) {
        const w = b.baseRadius * (1 - t * 0.65);
        b.mesh.scale.set(w, 1, w);
        b.mesh.rotation.y += 6 * dt;
      }
      b.mesh.material.opacity = (1 - t) * 0.9;
    }

    // 4. Update persistent ground zones
    for (let i = this.groundZones.length - 1; i >= 0; i--) {
      const z = this.groundZones[i];
      z.life += dt;
      if (z.life >= z.maxLife) {
        this.root.remove(z.mesh);
        z.mesh.material.dispose();
        this.groundZones.splice(i, 1);
        continue;
      }
      const pulse = 0.22 + Math.sin(z.life * 6) * 0.06;
      const fadeOut = z.maxLife - z.life < 0.8 ? (z.maxLife - z.life) / 0.8 : 1;
      z.mesh.material.opacity = pulse * fadeOut;
    }

    // 5. Project 3D Floating Combat Texts to 2D Screen
    if (camera && this.floatingTexts.length > 0) {
      const tempV = new THREE.Vector3();
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.life += dt;
        if (ft.life >= ft.maxLife) {
          ft.el.remove();
          this.floatingTexts.splice(i, 1);
          continue;
        }
        ft.worldPos.y += ft.vy * dt;
        tempV.copy(ft.worldPos).project(camera);
        if (tempV.z > 1) {
          ft.el.style.display = 'none';
          continue;
        }
        const sx = (tempV.x * 0.5 + 0.5) * viewportWidth;
        const sy = (-tempV.y * 0.5 + 0.5) * viewportHeight;
        const alpha = 1 - Math.pow(ft.life / ft.maxLife, 2);
        ft.el.style.display = 'block';
        ft.el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -50%)`;
        ft.el.style.opacity = alpha.toFixed(2);
      }
    }
  }
}
