// Hitmonchanning store intro — plays hmc_intro.glb (choreographed in Blender) over the home page,
// then reveals the store out of the light pouring from the Signature Deck Box.
// Loaded by the small gate snippet in Big Cartel > Design > Code > Body, which has already put a
// full-screen #hmc-intro overlay up and decided this visitor should see it.
const V = '0.187.0';
const NPM = `https://cdn.jsdelivr.net/npm/three@${V}`;
const cfg = window.HMC_INTRO || {};
const overlay = document.getElementById('hmc-intro');
const BASE = cfg.base || new URL('./', import.meta.url).href;
const FPS = 30;
const T = (frame) => (frame - 1) / FPS;            // Blender frame -> seconds
const FLASH_START = T(168), FLASH_FULL = T(192), END = T(200);
const html = document.documentElement;
const prevOverflow = html.style.overflow;
let done = false;

function markSeen() { try { sessionStorage.setItem('hmcIntroSeen', '1'); } catch (e) {} }

function teardown() {
  html.style.overflow = prevOverflow;
  overlay && overlay.remove();
  window.removeEventListener('keydown', onKey);
}

function onKey(e) { if (e.key === 'Escape') skip(); }

let renderer, stopLoop = false;
function skip() {
  if (done) return;
  done = true; stopLoop = true; markSeen();
  overlay.style.transition = 'opacity .35s ease';
  overlay.style.opacity = '0';
  setTimeout(() => { renderer && renderer.dispose(); teardown(); }, 380);
}

function chrome() {
  html.style.overflow = 'hidden';
  const css = document.createElement('style');
  css.textContent = `
  #hmc-intro{display:block;cursor:pointer;-webkit-tap-highlight-color:transparent}
  #hmc-intro canvas{position:absolute;inset:0;width:100%!important;height:100%!important;display:block}
  #hmc-intro .hmc-skip{position:absolute;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));
    z-index:3;font:600 13px/1 system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.08em;text-transform:uppercase;
    color:#fff;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.28);border-radius:999px;padding:11px 16px;
    cursor:pointer;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;animation:hmcIn .5s .4s forwards}
  #hmc-intro .hmc-skip:hover{background:rgba(255,255,255,.18)}
  #hmc-intro .hmc-flash{position:absolute;inset:0;z-index:2;background:#fff8ec;opacity:0;pointer-events:none}
  #hmc-intro .hmc-tag{position:absolute;left:14px;top:14px;z-index:3;font:700 11px/1 system-ui,sans-serif;letter-spacing:.12em;
    color:#ffcf5a;border:1px solid #ffcf5a88;border-radius:4px;padding:6px 8px;background:#0008}
  #hmc-intro .hmc-load{position:absolute;left:50%;top:50%;width:90px;height:90px;margin:-45px 0 0 -45px;border-radius:50%;
    background:radial-gradient(circle,#e8341c 0,#b3140a 55%,transparent 72%);filter:blur(2px);animation:hmcPulse 1.4s ease-in-out infinite}
  @keyframes hmcIn{to{opacity:.9}}
  @keyframes hmcPulse{50%{transform:scale(1.12);opacity:.75}}`;
  document.head.appendChild(css);
  const btn = document.createElement('button');
  btn.className = 'hmc-skip'; btn.type = 'button'; btn.textContent = 'Skip intro ›';
  btn.setAttribute('aria-label', 'Skip intro');
  btn.addEventListener('click', (e) => { e.stopPropagation(); skip(); });
  const flash = document.createElement('div'); flash.className = 'hmc-flash';
  const load = document.createElement('div'); load.className = 'hmc-load';
  overlay.append(load, flash, btn);
  if (cfg.preview) { const t = document.createElement('div'); t.className = 'hmc-tag'; t.textContent = 'INTRO PREVIEW'; overlay.append(t); }
  overlay.addEventListener('pointerdown', skip);
  window.addEventListener('keydown', onKey);
  return { flash, load };
}

async function main() {
  if (!overlay) return;
  cfg.started = true;
  const ui = chrome();
  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return skip();

  const [THREE, { GLTFLoader }, { DRACOLoader }, { EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { RoomEnvironment }] =
    await Promise.all([
      import(`${NPM}/+esm`),
      import(`${NPM}/examples/jsm/loaders/GLTFLoader.js/+esm`),
      import(`${NPM}/examples/jsm/loaders/DRACOLoader.js/+esm`),
      import(`${NPM}/examples/jsm/postprocessing/EffectComposer.js/+esm`),
      import(`${NPM}/examples/jsm/postprocessing/RenderPass.js/+esm`),
      import(`${NPM}/examples/jsm/postprocessing/UnrealBloomPass.js/+esm`),
      import(`${NPM}/examples/jsm/postprocessing/OutputPass.js/+esm`),
      import(`${NPM}/examples/jsm/environments/RoomEnvironment.js/+esm`),
    ]);
  if (done) return;

  const mobile = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#070d1c');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.22;

  // lights (Blender z-up -> three y-up: (x, y, z) -> (x, z, -y))
  const key = new THREE.DirectionalLight(0xfff1e0, 1.5); key.position.set(0.35, 0.45, 0.45);
  const fill = new THREE.DirectionalLight(0xd9e6ff, 0.35); fill.position.set(-0.5, 0.25, 0.3);
  const rim = new THREE.DirectionalLight(0xffffff, 1.0); rim.position.set(0, 0.4, -0.5);
  scene.add(key, fill, rim, new THREE.HemisphereLight(0x9fb4ff, 0x1a1208, 0.12));

  const draco = new DRACOLoader().setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), cfg.preview ? 20000 : 7000));
  let gltf;
  try { gltf = await Promise.race([loader.loadAsync(BASE + 'hmc_intro.glb'), timeout]); }
  catch (e) { console.warn('[hmc-intro]', e.message); return skip(); }
  if (done) return;
  scene.add(gltf.scene);

  // light-effect materials: additive, bloom-friendly, not tone-mapped
  let rays, core, sun, boxRoot;
  gltf.scene.traverse((o) => {
    if (o.name === 'DeckBox') boxRoot = o;
    if (!o.isMesh) return;
    if (o.name.startsWith('DB_LightRays')) {
      const m = o.material, tex = m.emissiveMap || m.map;
      o.material = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(0.55, 0.45, 0.32), transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
      rays = o;
    } else if (o.name.startsWith('DB_LightCore')) {
      o.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.05, 1.6), toneMapped: false }); core = o;
    } else if (o.name.startsWith('SunGlow')) {
      o.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 0.09, 0.025), toneMapped: false }); sun = o;
    }
  });
  if (sun) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 40, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,70,30,0.55)'); gr.addColorStop(0.45, 'rgba(230,40,15,0.18)'); gr.addColorStop(1, 'rgba(200,20,10,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.0), new THREE.MeshBasicMaterial({ map: tex, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = -0.01; halo.renderOrder = -1;
    sun.add(halo);
  }
  const boxLamp = new THREE.PointLight(0xffd9a0, 0, 0.6, 2);
  boxLamp.position.set(0, 0.112, 0);
  (boxRoot || scene).add(boxLamp);

  // camera from Blender; keep its horizontal framing on narrow screens
  const cam = gltf.cameras[0];
  const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * (16 / 9));
  function fit() {
    const w = innerWidth, h = innerHeight, a = w / h;
    renderer.setSize(w, h, false); composer && composer.setSize(w, h);
    cam.aspect = a;
    const effA = Math.max(a, mobile ? 0.8 : 1.1); // portrait: zoom out, but not all the way
    cam.fov = a >= 16 / 9 ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hfov / 2) / (16 / 9)))
                          : THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hfov / 2) / effA));
    if (a < 1) cam.setViewOffset(w, h, 0, -0.17 * h, w, h); else cam.clearViewOffset(); // portrait: frame lower
    cam.updateProjectionMatrix();
  }

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.6, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  if (mobile) bloom.resolution.set(innerWidth / 2, innerHeight / 2);
  fit();
  addEventListener('resize', fit);

  const mixer = new THREE.AnimationMixer(gltf.scene);
  for (const clip of gltf.animations) {
    const a = mixer.clipAction(clip); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.play();
  }

  renderer.domElement.setAttribute('aria-hidden', 'true');
  overlay.prepend(renderer.domElement);
  mixer.setTime(0);
  renderer.compile(scene, cam);
  ui.load.remove();

  const clock = new THREE.Timer();
  let t = 0;
  const freeze = cfg.preview ? parseFloat(new URLSearchParams(location.search).get('t')) : NaN; // preview-only: hold a moment
  const openAt = new THREE.Vector3();
  function frame() {
    if (stopLoop) return;
    clock.update(); t += Math.min(clock.getDelta(), 0.1);
    if (!isNaN(freeze)) t = freeze;
    mixer.setTime(Math.min(t, END));
    const open = THREE.MathUtils.clamp((t - T(127)) / (T(140) - T(127)), 0, 1);
    boxLamp.intensity = open * (0.05 + 0.012 * Math.sin(t * 7));
    bloom.strength = 0.5 + 0.45 * open + 1.6 * THREE.MathUtils.clamp((t - FLASH_START) / (FLASH_FULL - FLASH_START), 0, 1);
    ui.flash.style.opacity = THREE.MathUtils.clamp((t - FLASH_START) / (FLASH_FULL - FLASH_START), 0, 1) ** 1.6;
    composer.render();
    if (t >= END && isNaN(freeze)) return reveal();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // the store opens up out of the light: a hole grows in the white from the deck box opening
  function reveal() {
    if (done) return;
    done = true; stopLoop = true; markSeen();
    let cx = 50, cy = 45;
    if (boxRoot) {
      boxRoot.updateWorldMatrix(true, false);
      openAt.set(0, 0.12, 0).applyMatrix4(boxRoot.matrixWorld).project(cam);
      cx = THREE.MathUtils.clamp((openAt.x * 0.5 + 0.5) * 100, 20, 80);
      cy = THREE.MathUtils.clamp((-openAt.y * 0.5 + 0.5) * 100, 20, 80);
    }
    renderer.domElement.remove(); renderer.dispose();
    overlay.style.background = 'transparent';
    overlay.style.pointerEvents = 'none';
    const f = ui.flash, start = performance.now(), dur = 950;
    f.style.opacity = '1';
    (function grow(now) {
      const k = Math.min((now - start) / dur, 1), e = 1 - Math.pow(1 - k, 3);
      const r = e * 150;
      const m = `radial-gradient(circle at ${cx}% ${cy}%, transparent ${r}vmax, #000 ${r + 12}vmax)`;
      f.style.webkitMaskImage = m; f.style.maskImage = m;
      f.style.opacity = String(1 - k * k * 0.5);
      if (k < 1) requestAnimationFrame(grow); else teardown();
    })(start);
  }
}

main().catch((e) => { console.warn('[hmc-intro]', e); skip(); });
