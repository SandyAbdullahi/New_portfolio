// app.js (ESM)
// Requires: import map in HTML for "three" and "three/addons/", and GSAP loaded globally.

import * as THREE from 'three';
import { GLTFLoader }    from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader }   from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader }    from 'three/addons/loaders/KTX2Loader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader }    from 'three/addons/loaders/RGBELoader.js';


/* ------------------ Animated “TV static” grain (in-place) ------------------ */
(() => {
  const canvas = document.getElementById('grain');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });

  // Tunables
  const TILE_SIZE = 256;     // 128–512: lower = chunkier noise, higher = finer
  const FRAMES    = 10;      // how many unique noise tiles we cycle through
  const FPS       = 18;      // 12–24 feels like classic CRT flicker
  const OPACITY   = 1.0;     // leave at 1.0; use CSS .grain { opacity: ... } to set strength
  const CONTRAST  = 1.0;     // >1 = punchier speckle, <1 = softer (e.g., 0.8–1.3)

  const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targetFPS = prefersReduce ? 2 : FPS;

  let wCSS = 0, hCSS = 0;

  function makeNoiseTile(size = TILE_SIZE) {
    const off = document.createElement('canvas');
    off.width = size; off.height = size;
    const octx = off.getContext('2d');
    const img = octx.createImageData(size, size);
    const data = img.data;

    for (let i = 0; i < size * size; i++) {
      let v = Math.random();
      v = Math.pow(v, 1 / CONTRAST);           // simple contrast curve
      const g = Math.floor(v * 255);
      const j = i * 4;
      data[j + 0] = g;
      data[j + 1] = g;
      data[j + 2] = g;
      data[j + 3] = Math.floor(255 * OPACITY);
    }
    octx.putImageData(img, 0, 0);
    return off;
  }

  // Prebuild a few frames and cycle through them (cheap + looks authentic)
  let tiles = [];
  let patterns = [];
  function buildFrames() {
    tiles = Array.from({ length: FRAMES }, () => makeNoiseTile());
    patterns = tiles.map(t => ctx.createPattern(t, 'repeat'));
  }

  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    wCSS = window.innerWidth;
    hCSS = window.innerHeight;

    canvas.width  = Math.max(1, Math.floor(wCSS * dpr));
    canvas.height = Math.max(1, Math.floor(hCSS * dpr));
    canvas.style.width  = wCSS + 'px';
    canvas.style.height = hCSS + 'px';

    // Map CSS pixels to device pixels (keeps the pattern anchored = no drifting)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawFrame(i) {
    ctx.fillStyle = patterns[i];
    ctx.fillRect(0, 0, wCSS, hCSS);   // fill entire viewport
  }

  // Init
  buildFrames();
  sizeCanvas();
  let frame = 0, last = 0, step = 1000 / targetFPS;

  function loop(ts) {
    if (ts - last >= step) {
      frame = (frame + 1) % patterns.length;
      drawFrame(frame);
      last = ts;
    }
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => {
    sizeCanvas();
    drawFrame(frame);
  }, { passive: true });

  requestAnimationFrame(loop);
})();


/* ------------------------------------------------------------------ */
/* HERO RINGS (centered, morphing paths, dot-shape swaps)              */
/* ------------------------------------------------------------------ */
(() => {
  const canvas = document.getElementById('ringsCanvas');
  const hero   = document.getElementById('hero3d');
  if (!canvas || !hero) return;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#ffffff');

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 7.2);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });

  function setSize() {
    const { width, height } = hero.getBoundingClientRect();
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  setSize(); addEventListener('resize', setSize);

  scene.add(new THREE.AmbientLight(0xffffff, 0.95));
  const orbitRoot = new THREE.Group();
  scene.add(orbitRoot);

  // --- helpers to generate target point paths ---
  const V = (x, y) => new THREE.Vector3(x, y, 0);
  const makeCircle     = (n, r)       => Array.from({length:n},(_,i)=>{const a=i/n*2*Math.PI;return V(Math.cos(a)*r, Math.sin(a)*r);});
  const makeEllipse    = (n, rx,ry)   => Array.from({length:n},(_,i)=>{const a=i/n*2*Math.PI;return V(Math.cos(a)*rx,Math.sin(a)*ry);});
  const makeHeart      = (n, s) => {
    const pts=[]; let maxR=0;
    for(let i=0;i<n;i++){
      const t=i/n*2*Math.PI;
      const x=16*Math.sin(t)**3;
      const y=13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);
      maxR=Math.max(maxR,Math.hypot(x,y)); pts.push(V(x,y));
    }
    const k = s/(maxR||1); return pts.map(p=>p.multiplyScalar(k));
  };
  const makeStar       = (n,r1,r2,points=5) => {
    const m=Math.max(n,points*2), tmp=[];
    for(let i=0;i<m;i++){ const a=i/m*2*Math.PI, r=(i%2? r2:r1); tmp.push(V(Math.cos(a)*r,Math.sin(a)*r)); }
    return Array.from({length:n},(_,i)=>{ const t=i/(n-1)*(m-1), i0=Math.floor(t), i1=Math.min(m-1,i0+1), f=t-i0; return new THREE.Vector3().lerpVectors(tmp[i0], tmp[i1], f); });
  };
  const makeLissajous  = (n,ax,ay,ph,s) => Array.from({length:n},(_,i)=>{const t=i/n*2*Math.PI;return V(Math.sin(ax*t+ph)*s, Math.sin(ay*t)*s);});
  const makeSuperellipse=(n,a,b,pow=4)=> Array.from({length:n},(_,i)=>{const t=i/n*2*Math.PI,ct=Math.cos(t),st=Math.sin(t);return V(Math.sign(ct)*a*Math.abs(ct)**(2/pow), Math.sign(st)*b*Math.abs(st)**(2/pow));});
  const makeLemniscate = (n,s)        => Array.from({length:n},(_,i)=>{const t=i/n*2*Math.PI,d=1+Math.sin(t)**2;return V((s*Math.SQRT2*Math.cos(t))/d,(s*Math.SQRT2*Math.cos(t)*Math.sin(t))/d);});
  const makeSpiro      = (n,R,r,d,k=1)=> Array.from({length:n},(_,i)=>{const t=i/n*2*Math.PI;return V(((R-r)*Math.cos(t)+d*Math.cos((R-r)/r*t))*k,((R-r)*Math.sin(t)-d*Math.sin((R-r)/r*t))*k);});

  function makeDotGeometries(dotRadius){
    return {
      sphere:  new THREE.SphereGeometry(dotRadius, 16, 16),
      box:     new THREE.BoxGeometry(dotRadius*2, dotRadius*2, dotRadius*2),
      octa:    new THREE.OctahedronGeometry(dotRadius, 0),
      icosa:   new THREE.IcosahedronGeometry(dotRadius, 0),
      cone:    new THREE.ConeGeometry(dotRadius, dotRadius*2, 16),
      capsule: new THREE.CapsuleGeometry(dotRadius*0.75, dotRadius*1.2, 6, 12),
    };
  }

  function makeDotRing({ radius, count, dotRadius, color, tiltX, tiltY, initialShape='sphere' }){
    const mat  = new THREE.MeshStandardMaterial({ color, roughness:.35, metalness:.25, flatShading:true });
    const geos = makeDotGeometries(dotRadius);
    const ring = new THREE.Group();
    ring.rotation.x = tiltX; ring.rotation.y = tiltY;

    const base = makeCircle(count, radius);
    for(let i=0;i<count;i++){ const m = new THREE.Mesh(geos[initialShape], mat); m.position.copy(base[i]); ring.add(m); }
    orbitRoot.add(ring);

    ring.morphTo = (targets, dur=2.2) => {
      const kids = ring.children;
      gsap.killTweensOf(kids.map(k=>k.position));
      gsap.to(kids.map(k=>k.position), {
        x:(i)=>targets[i].x, y:(i)=>targets[i].y, z:(i)=>targets[i].z,
        duration:dur, ease:'power3.inOut', stagger:{ each:.012, from:'center' }
      });
    };
    ring.swapShape = (shape='sphere', dur=0.45) => {
      const g = geos[shape] || geos.sphere;
      ring.children.forEach((m,i)=>{
        gsap.to(m.scale, {
          x:0.001,y:0.001,z:0.001, duration:dur*0.5, ease:'power2.in', delay:i*0.003,
          onComplete:()=> gsap.to((m.geometry=g, m.scale), { x:1,y:1,z:1, duration:dur*0.5, ease:'power2.out' })
        });
      });
    };
    return ring;
  }

  // rings
  const inner = makeDotRing({ radius:2.1, count:20, dotRadius:.036, color:'#1A2318', tiltX:Math.PI*.22, tiltY:Math.PI*.15 });
  const mid   = makeDotRing({ radius:2.7, count:20, dotRadius:.034, color:'#6E8256', tiltX:Math.PI*.62, tiltY:-Math.PI*.18 });
  const outer = makeDotRing({ radius:3.3, count:20, dotRadius:.032, color:'#C6E376', tiltX:Math.PI*.40, tiltY:-Math.PI*1.0 });

  const pathPrograms = [
    (c)=>[ makeCircle(c,2.1), makeCircle(c,2.7), makeCircle(c,3.3) ],
    (c)=>[ makeEllipse(c,2.4,1.6), makeEllipse(c,3.0,2.0), makeEllipse(c,3.7,2.2) ],
    (c)=>[ makeLissajous(c,3,2,Math.PI/2,1.8), makeLissajous(c,5,4,Math.PI/3,2.4), makeLissajous(c,4,3,Math.PI/4,3.0) ],
    (c)=>[ makeHeart(c,2.2), makeHeart(c,2.8), makeHeart(c,3.4) ],
    (c)=>[ makeStar(c,2.3,1.2,5), makeStar(c,3.0,1.5,5), makeStar(c,3.8,1.8,5) ],
    (c)=>[ makeSuperellipse(c,2.1,2.1,3.6), makeSuperellipse(c,2.7,2.4,3.6), makeSuperellipse(c,3.4,2.9,3.6) ],
    (c)=>[ makeLemniscate(c,2.2), makeLemniscate(c,2.7), makeLemniscate(c,3.2) ],
    (c)=>[ makeSpiro(c,5,3,4,.35), makeSpiro(c,7,3,5,.36), makeSpiro(c,9,4,5,.37) ],
  ];
  const dotShapeCycle = ['sphere','box','octa','icosa','cone','capsule'];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MORPH_D = 2.4, HOLD_D = 1.1;

  if(!reduce){
    let i=0;
    const cycle=()=>{
      const [a,b,c] = pathPrograms[i % pathPrograms.length](inner.children.length);
      inner.morphTo(a, MORPH_D); mid.morphTo(b, MORPH_D); outer.morphTo(c, MORPH_D);
      const next = dotShapeCycle[i % dotShapeCycle.length];
      inner.swapShape(next, .42); mid.swapShape(next, .42); outer.swapShape(next, .42);
      const tilt = [
        { x:Math.PI*.22, y: Math.PI*.15 },
        { x:Math.PI*.35, y: Math.PI*.05 },
        { x:Math.PI*.55, y:-Math.PI*.10 },
        { x:Math.PI*.25, y:-Math.PI*.25 },
        { x:Math.PI*.42, y:-Math.PI*.90 },
      ][i % 5];
      gsap.to([inner.rotation, mid.rotation, outer.rotation], {
        x:(idx)=> tilt.x + (idx-1)*0.06,
        y:(idx)=> tilt.y - (idx-1)*0.08,
        duration:MORPH_D, ease:'power2.inOut'
      });
      i++; gsap.delayedCall(MORPH_D + HOLD_D, cycle);
    };
    cycle();
  }

  const clock = new THREE.Clock();
  (function tick(){
    if(!reduce){ inner.rotation.z += .0055; mid.rotation.z += -.0045; outer.rotation.z += .0038; }
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  })();
})();

/* ------------------------------------------------------------------ */
/* HERO PHRASES dissolve loop                                         */
/* ------------------------------------------------------------------ */
(() => {
  const phrases = gsap.utils.toArray('.phrase');
  if (!phrases.length) return;

  gsap.set(phrases, { opacity:0, filter:'blur(10px)', y:10, zIndex:(i)=>100-i });

  const tl = gsap.timeline({ repeat:-1, repeatDelay:0.2 });
  phrases.forEach(el => {
    tl.to(el, { opacity:1, filter:'blur(0px)', y:0,  duration:0.9, ease:'power3.out' })
      .to(el, { opacity:0, filter:'blur(12px)', y:-10, duration:0.8, ease:'power3.in' }, '+=0.9');
  });
})();

/* ------------------------------------------------------------------ */
/* SHOWCASE LOGIC (desktop vs mobile)                                 */
/* ------------------------------------------------------------------ */
(() => {
  const mq = window.matchMedia('(min-width: 768px)');
  let cleanup = () => {};

  function initDesktop(){
    const list   = document.getElementById('topicList');
    const panels = Array.from(document.querySelectorAll('#showcase .panel'));
    if (!list || !panels.length) return;

    const items  = Array.from(list.querySelectorAll('.scroll-item'));
    const onEnterHandlers = new Map();

    const activate = (id) => {
      panels.forEach(p => p.classList.toggle('active', p.id === id));
      if (window.gsap){
        const activeSel = `#${CSS.escape(id)} .panel-text`;
        const othersSel = panels.filter(p=>p.id!==id).map(p=>`#${CSS.escape(p.id)} .panel-text`).join(',');
        gsap.fromTo(activeSel, { y:10, opacity:0, filter:'blur(8px)' }, { y:0, opacity:1, filter:'blur(0px)', duration:0.5, ease:'power2.out', stagger:0.06 });
        if (othersSel){ gsap.to(othersSel, { y:-6, opacity:0, filter:'blur(8px)', duration:0.35, ease:'power2.in' }); }
      }
    };

    items.forEach(li => {
      const enter = () => activate(li.dataset.panel);
      li.addEventListener('mouseenter', enter);
      li.addEventListener('focus', enter);
      onEnterHandlers.set(li, enter);
    });

    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e => { if (e.isIntersecting) activate(e.target.dataset.panel); });
    }, { root:list, threshold:0.8 });
    items.forEach(el => io.observe(el));

    activate(items[0]?.dataset.panel || panels[0]?.id);

    cleanup = () => {
      io.disconnect();
      items.forEach(li => {
        const h = onEnterHandlers.get(li);
        if (h){ li.removeEventListener('mouseenter', h); li.removeEventListener('focus', h); }
      });
      onEnterHandlers.clear();
    };
  }

function initMobile() {
  const mobileContainer = document.querySelector('#showcase .mobile-slides');
  if (!mobileContainer) { cleanup = () => {}; return; }

  const slides = Array.from(mobileContainer.querySelectorAll('.mobile-slide'));
  const cards  = mobileContainer.querySelectorAll('.mobile-card .border-2.bg-white');

  // Fade-in nicety (optional)
  const fadeIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && window.gsap) {
        gsap.fromTo(e.target, { y: 16, opacity: 0, filter: 'blur(8px)' },
                              { y: 0,  opacity: 1, filter: 'blur(0px)', duration: 0.45, ease: 'power2.out' });
      }
    });
  }, { root: mobileContainer, threshold: 0.2 });
  cards.forEach(c => fadeIO.observe(c));

  // Size the container to the active slide's card height
  const setToCardHeight = (li) => {
    const card = li.querySelector('.mobile-card');
    if (!card) return;
    const cs = getComputedStyle(li);
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    mobileContainer.style.height = (card.offsetHeight + padY) + 'px';
  };

  // Observe which slide is active (center-ish) and resize container
  const activeIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) setToCardHeight(e.target);
    });
  }, { root: mobileContainer, threshold: 0.6 });
  slides.forEach(s => activeIO.observe(s));

  // Initial size + on resize
  setToCardHeight(slides[0] || mobileContainer);
  const onWinResize = () => {
    const current = slides.find(s => {
      const r  = s.getBoundingClientRect();
      const rc = mobileContainer.getBoundingClientRect();
      return r.top >= rc.top && r.bottom <= rc.bottom;
    }) || slides[0];
    if (current) setToCardHeight(current);
  };
  window.addEventListener('resize', onWinResize);

  // Teardown
  cleanup = () => {
    fadeIO.disconnect();
    activeIO.disconnect();
    window.removeEventListener('resize', onWinResize);
  };
}


  function boot(){ cleanup(); if (mq.matches) initDesktop(); else initMobile(); }
  if (mq.addEventListener) mq.addEventListener('change', boot); else mq.addListener(boot);
  boot();
})();

/* ------------------------------------------------------------------ */
/* PANEL 3D VIEWERS (stars, RGB bg, shadows, lazy init)               */
/* ------------------------------------------------------------------ */
(() => {
  const reduce   = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const viewers  = [];
  const viewerOf = new WeakMap();

  function makeStars({ count=900, radius=50, size=0.8, color='#FFFFFF' }){
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count*3);
    for (let i=0;i<count;i++){
      const u=Math.random(), v=Math.random();
      const theta=2*Math.PI*u, phi=Math.acos(2*v-1);
      const r=radius*(0.85+Math.random()*0.15);
      pos[i*3+0]=r*Math.sin(phi)*Math.cos(theta);
      pos[i*3+1]=r*Math.sin(phi)*Math.sin(theta);
      pos[i*3+2]=r*Math.cos(phi);
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos,3));
    const m = new THREE.PointsMaterial({ color, size, sizeAttenuation:true, transparent:true, opacity:0.9, depthWrite:false });
    return new THREE.Points(g, m);
  }

  function initViewer(container){
    if (viewerOf.has(container)) return viewerOf.get(container);

    // data attrs
    const modelURL   = container.dataset.model;
    const autoRotate = container.dataset.autorotate === 'true';

    const bgColorStr = container.dataset.bgColor;
    const bgAlphaStr = container.dataset.bgAlpha;
    const envHdrURL  = container.dataset.envHdr;
    const envAsBg    = container.dataset.envBackground === 'true';

    const withShadows = container.dataset.shadow === 'true' || container.dataset.shadows === 'true';
    const withGround  = container.dataset.ground === 'true';
    const groundColor = container.dataset.groundColor || '#ffffff';
    const groundOpStr = container.dataset.groundOpacity;
    const exposureStr = container.dataset.exposure;

    const withStars   = container.dataset.stars === 'true';
    const starsCount  = parseInt(container.dataset.starsCount || '900', 10);
    const starsColor  = container.dataset.starsColor || '#FFFFFF';
    const starsSize   = parseFloat(container.dataset.starsSize || '0.8');
    const starsRadius = parseFloat(container.dataset.starsRadius || '50');

    const canvas   = container.querySelector('canvas');
    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(45, 1, 0.01, 2000);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });

    renderer.outputColorSpace    = THREE.SRGBColorSpace;
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = parseFloat(exposureStr ?? '1');

    if (bgColorStr){
      renderer.setClearColor(new THREE.Color(bgColorStr), isFinite(bgAlphaStr) ? parseFloat(bgAlphaStr) : 1);
    } else if (withStars){
      renderer.setClearColor(0x000000, 1);
    } else {
      renderer.setClearColor(0x000000, 0);
    }

    // lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.9);
    const dir  = new THREE.DirectionalLight(0xffffff, 0.9); dir.position.set(3,4,6);
    scene.add(hemi, dir);

    // shadows
    if (withShadows){
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
      dir.castShadow = true;
      dir.shadow.mapSize.set(2048,2048);
      dir.shadow.camera.near = 0.1;
      dir.shadow.camera.far  = 80;
      dir.shadow.bias        = -0.00015;
    }

    // controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping      = true; controls.dampingFactor = 0.08;
    controls.enablePan          = true; controls.screenSpacePanning = true;
    controls.panSpeed           = 0.9;  controls.rotateSpeed = 0.7; controls.zoomSpeed = 0.9;
    controls.minPolarAngle      = 0.05; controls.maxPolarAngle = Math.PI - 0.05;
    if ('zoomToCursor' in controls) controls.zoomToCursor = true;

    const setSize = () => {
      const w = container.clientWidth || 1, h = container.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      camera.aspect = w/h; camera.updateProjectionMatrix();
    };
    setSize(); (new ResizeObserver(setSize)).observe(container);

    // stars / env
    let starGroup = null;
    if (withStars){
      starGroup = new THREE.Group();
      starGroup.add(
        makeStars({ count:starsCount, radius:starsRadius,    size:starsSize,     color:starsColor }),
        makeStars({ count:Math.floor(starsCount*0.4), radius:starsRadius*0.65, size:starsSize*0.7, color:starsColor })
      );
      scene.add(starGroup);
    } else if (envHdrURL){
      new RGBELoader().setCrossOrigin('anonymous').load(envHdrURL, (hdr)=>{
        hdr.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = hdr; if (envAsBg) scene.background = hdr;
      });
    }

    // loaders
    const loader = new GLTFLoader().setCrossOrigin('anonymous');
    const draco  = new DRACOLoader(); draco.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/'); loader.setDRACOLoader(draco);
    const ktx2   = new KTX2Loader();  ktx2.setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.159.0/examples/jsm/libs/basis/'); ktx2.detectSupport(renderer); loader.setKTX2Loader(ktx2);

    let mixer=null, root=null, auto=autoRotate;
    let reEnableAutoTO=null;

    loader.load(
      modelURL,
      (gltf)=>{
        root = gltf.scene; scene.add(root);
        root.traverse(o=>{ if (o.isMesh){ o.castShadow = !!withShadows; o.receiveShadow = false; } });

        // frame
        const box    = new THREE.Box3().setFromObject(root);
        const size   = box.getSize(new THREE.Vector3()).length();
        const center = box.getCenter(new THREE.Vector3());
        root.position.sub(center);

        const fov=camera.fov*(Math.PI/180);
        let dist=(size/2)/Math.tan(fov/2); dist*=1.25;
        camera.position.set(0,0,dist);
        camera.near = size/1000; camera.far = Math.max(2000, size*10); camera.updateProjectionMatrix();

        controls.minDistance = dist*0.6; controls.maxDistance = dist*4.0;
        controls.target.set(0,0,0); controls.update();

        if (withShadows && withGround){
          const centeredBox = new THREE.Box3().setFromObject(root);
          const groundY = centeredBox.min.y - 0.02 * size;
          const groundMat = new THREE.ShadowMaterial({ opacity: parseFloat(groundOpStr ?? '0.25') });
          const ground = new THREE.Mesh(new THREE.PlaneGeometry(size*4, size*4), groundMat);
          ground.rotation.x = -Math.PI/2; ground.position.y = groundY; ground.receiveShadow = true; scene.add(ground);
        }

        if (gltf.animations && gltf.animations.length){
          mixer = new THREE.AnimationMixer(root);
          gltf.animations.forEach(clip => mixer.clipAction(clip).play());
          auto = false;
        }
      },
      undefined,
      (err)=> console.warn('GLTF load error:', modelURL, err)
    );

    const startUser = () => { auto = false; clearTimeout(reEnableAutoTO); container.classList.add('grabbing'); };
    const endUser   = () => {
      container.classList.remove('grabbing');
      reEnableAutoTO = setTimeout(()=>{ if (!mixer && (container.dataset.autorotate==='true') && !reduce) auto = true; }, 1800);
    };
    renderer.domElement.addEventListener('pointerdown', startUser);
    addEventListener('pointerup', endUser, { passive:true });
    renderer.domElement.addEventListener('wheel', startUser, { passive:true });

    const state = { visible:false };
    const viewer = {
      renderer, scene, camera, controls, state, starGroup,
      get mixer(){ return mixer; },
      get root(){  return root;  },
      get auto(){  return auto;  },
      resize: setSize
    };
    viewerOf.set(container, viewer);
    viewers.push(viewer);
    return viewer;
  }

  // lazy init on visibility
  document.querySelectorAll('.panel-3d').forEach(container => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const v = initViewer(container);
          v.state.visible = true;
          v.resize();
        } else {
          const v = viewerOf.get(container);
          if (v) v.state.visible = false;
        }
      });
    }, { threshold: 0.01 });
    obs.observe(container);
  });

  // render loop
  const clock = new THREE.Clock();
  (function loop(){
    const dt = clock.getDelta();
    viewers.forEach(v => {
      if (!v.state.visible) return;
      if (v.starGroup && !reduce){ v.starGroup.rotation.y += 0.0015; v.starGroup.rotation.x += 0.0006; }
      if (v.mixer) v.mixer.update(dt);
      if (v.root && v.auto && !reduce) v.root.rotation.y += 0.6*dt;
      v.controls.update();
      v.renderer.render(v.scene, v.camera);
    });
    requestAnimationFrame(loop);
  })();
})();
