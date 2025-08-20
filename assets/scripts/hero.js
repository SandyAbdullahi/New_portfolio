// assets/scripts/hero.js
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Water } from "three/examples/jsm/objects/Water.js";

/* ===== Renderer / Scene / Camera ===== */
const canvas = document.getElementById("hero-canvas");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbfd6e5, 60, 260); // soft horizon

const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1000);
camera.position.set(-50, 7.5, 66);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 10;
controls.maxDistance = 120;
controls.target.set(0, 0.8, 0);

/* ===== Lights (match the sun direction) ===== */
const hemi = new THREE.HemisphereLight(0xffffff, 0x7fb1c5, 0.55);
scene.add(hemi);
const sunLight = new THREE.DirectionalLight(0xffffff, 0.95);
scene.add(sunLight);

/* ===== Simple gradient sky dome (no add-ons) ===== */
const skyUniforms = {
  topColor:    { value: new THREE.Color(0x8fc6ff) }, // upper blue
  bottomColor: { value: new THREE.Color(0xcfe6ff) }, // near-horizon blue
  offset:      { value: 0.0 },
  exponent:    { value: 1.5 }
};
// big inverted sphere with a vertical gradient
const skyGeo = new THREE.SphereGeometry(800, 32, 15);
const skyMat = new THREE.ShaderMaterial({
  uniforms: skyUniforms,
  vertexShader: /* glsl */`
    varying vec3 vWorld;
    void main(){
      vec4 p = modelMatrix * vec4(position,1.0);
      vWorld = p.xyz;
      gl_Position = projectionMatrix * viewMatrix * p;
    }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float offset;
    uniform float exponent;
    varying vec3 vWorld;
    void main(){
      float h = normalize(vWorld).y;
      float t = max(h + offset, 0.0);
      t = pow(t, exponent);
      vec3 col = mix(bottomColor, topColor, t);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
  side: THREE.BackSide,
  depthWrite: false
});
const skyDome = new THREE.Mesh(skyGeo, skyMat);
scene.add(skyDome);

/* ===== Sun sprite (glow disc; no external texture) ===== */
function makeSunTexture(size = 256, inner = "#ffffff", outer = "rgba(255,255,255,0)") {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const r = size / 2;
  const grd = g.createRadialGradient(r, r, r * 0.05, r, r, r);
  grd.addColorStop(0, inner);
  grd.addColorStop(1, outer);
  g.fillStyle = grd; g.fillRect(0,0,size,size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const sunTex = makeSunTexture(512, "#fff", "rgba(255,255,255,0)");
const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
  map: sunTex,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending
}));
sunSprite.scale.setScalar(35); // apparent size
scene.add(sunSprite);

// set sun position (elevation/azimuth in degrees)
function setSun(elevation = 18, azimuth = 120) {
  const phi = THREE.MathUtils.degToRad(90 - elevation);
  const theta = THREE.MathUtils.degToRad(azimuth);
  const dir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

  // place the sprite far away in that direction
  sunSprite.position.copy(dir).multiplyScalar(400);

  // aim the directional light the same way
  sunLight.position.copy(dir).multiplyScalar(100);
  sunLight.target.position.set(0, 0, 0);
  scene.add(sunLight.target);
}
setSun(18, 120);

/* ===== Ocean (Water addon) ===== */
const waterGeometry = new THREE.PlaneGeometry(1200, 1200, 64, 64);
const waterNormals = new THREE.TextureLoader().load(
  "https://threejs.org/examples/textures/waternormals.jpg",
  () => { waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping; }
);
const water = new Water(waterGeometry, {
  textureWidth: 1024,
  textureHeight: 1024,
  waterNormals,
  sunDirection: sunLight.position.clone().normalize(),
  sunColor: 0xffffff,
  waterColor: 0x07598C,   // palette blue
  distortionScale: 2.2,
  fog: !!scene.fog
});
water.rotation.x = -Math.PI / 2;
scene.add(water);

/* ===== Procedural Sand (ripples + slope) ===== */
const sandGeo = new THREE.PlaneGeometry(90, 34, 220, 80);
sandGeo.rotateX(-Math.PI / 2);

const sandUniforms = {
  uTime: { value: 0 },
  uAmp:  { value: 0.08 },
  uFreq: { value: 1.2 },
  uColorA:   { value: new THREE.Color(0xF2AA80) }, // Graphic-Design-5
  uColorB:   { value: new THREE.Color(0xD79571) },
  uLightDir: { value: sunLight.position.clone().normalize() }
};
const sandVert = /* glsl */`
  uniform float uTime, uAmp, uFreq;
  varying vec3 vPos, vNormal;
  float fbm(vec2 p){
    float a=0.5,f=uFreq,h=0.0;
    for(int i=0;i<4;i++){ h+=a*(sin(p.x*f+uTime*0.25)*cos(p.y*f-uTime*0.21)); f*=1.8; a*=0.5; }
    return h;
  }
  void main(){
    vec3 pos = position;
    float slope = smoothstep(-14.0, 10.0, pos.z) * 0.3;
    float ripples = fbm(pos.xz * 0.35);
    pos.y += uAmp * ripples - slope * 0.10;

    vec3 dx = dFdx(vec3(pos)), dy = dFdy(vec3(pos));
    vNormal = normalize(cross(dy, dx));
    vPos = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;
const sandFrag = /* glsl */`
  precision mediump float;
  uniform vec3 uColorA, uColorB, uLightDir;
  varying vec3 vPos, vNormal;
  void main(){
    float ndl = clamp(dot(normalize(vNormal), normalize(uLightDir)), 0.0, 1.0);
    float shore = smoothstep(7.0, -1.5, vPos.z);
    vec3 base = mix(uColorB, uColorA, 0.55 + 0.45 * ndl);
    base = mix(base, vec3(0.92,0.93,0.95), shore * 0.12);
    gl_FragColor = vec4(base, 1.0);
  }
`;
const sand = new THREE.Mesh(
  sandGeo,
  new THREE.ShaderMaterial({ uniforms: sandUniforms, vertexShader: sandVert, fragmentShader: sandFrag })
);
sand.position.set(-14, 0.02, 10);
scene.add(sand);

/* ===== Shoreline Foam (thin animated band) ===== */
const foamGeo = new THREE.PlaneGeometry(70, 2.2, 2, 2);
foamGeo.rotateX(-Math.PI / 2);
const foamUniforms = { uTime: { value: 0 } };
const foam = new THREE.Mesh(
  foamGeo,
  new THREE.ShaderMaterial({
    uniforms: foamUniforms,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      precision mediump float; uniform float uTime; varying vec2 vUv;
      float n(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p);
        float a=n(i), b=n(i+vec2(1.,0.)), c=n(i+vec2(0.,1.)), d=n(i+vec2(1.,1.));
        vec2 u=f*f*(3.-2.*f);
        return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y; }
      void main(){
        float t=uTime*0.35;
        float mask=smoothstep(0.25,0.0,vUv.y);
        float breakup=noise(vUv*15.+t)*0.6 + noise(vUv*40.-t)*0.4;
        float foam=smoothstep(0.55,0.75,breakup)*mask;
        gl_FragColor=vec4(vec3(1.0), foam*0.75);
      }`,
    transparent: true, depthWrite: false
  })
);
foam.position.set(-6.5, 0.03, 5.2);
foam.rotation.y = THREE.MathUtils.degToRad(6);
scene.add(foam);

/* ===== Optional clouds (sprite bands; safe texture host) ===== */
function makeCloudBand({ count, yMin, yMax, zMin, zMax, sizeMin, sizeMax, speedBase, opacity }){
  const group = new THREE.Group();
  const tex = new THREE.TextureLoader().load(
    "https://threejs.org/examples/textures/sprites/cloud.png"
  );
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  for (let i=0; i<count; i++){
    const mat = new THREE.SpriteMaterial({ map: tex, transparent:true, opacity, depthWrite:false });
    const s = new THREE.Sprite(mat);
    s.scale.setScalar(sizeMin + Math.random()*(sizeMax-sizeMin));
    s.position.set((Math.random()-0.5)*160, yMin + Math.random()*(yMax-yMin), zMin - Math.random()*(zMax-zMin));
    s.userData.vx = speedBase + Math.random()*0.002;
    group.add(s);
  }
  scene.add(group);
  return group;
}
const highClouds = makeCloudBand({ count: 10, yMin: 9,  yMax: 12, zMin: 30, zMax: 160, sizeMin: 9, sizeMax: 16, speedBase: 0.004, opacity: 0.55 });
const midClouds  = makeCloudBand({ count: 8,  yMin: 6.0,yMax: 8.0, zMin: 10, zMax: 100, sizeMin: 7, sizeMax: 12, speedBase: 0.006, opacity: 0.65 });
function animateClouds(){
  [highClouds, midClouds].forEach((band, idx)=>{
    band.children.forEach((s)=>{
      s.position.x += s.userData.vx * (idx===0 ? 1 : 1.3);
      const limit = 90;
      if (s.position.x >  limit) s.position.x = -limit;
      if (s.position.x < -limit) s.position.x =  limit;
    });
  });
}

/* ===== Resize ===== */
function resize(){
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);
window.addEventListener("resize", resize);
resize();

/* ===== Animate ===== */
let t = 0;
function animate(){
  requestAnimationFrame(animate);
  t += 0.016;

  water.material.uniforms.time.value = t * 0.5;
  foamUniforms.uTime.value = t;
  sandUniforms.uTime.value = t;

  animateClouds();
  controls.update();
  renderer.render(scene, camera);
}
animate();
