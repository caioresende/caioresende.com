import * as THREE from 'three';
import { vertexShader, fluidFragmentShader, displayFragmentShader } from './shaders.js';

/**
 * ─── BRUSH CONFIG ───────────────────────────────────────────
 * Tweak these values to change the brush reveal effect.
 *
 *  STROKE
 *    strokeWidth     – radius of the brush   (try 0.01–0.15)
 *    maxIntensity    – peak opacity per frame (0.0–1.0)
 *    decay           – trail persistence      (0.90 = fast fade, 0.999 = lingers)
 *
 *  RIPPLE  (edge wobble)
 *    rippleFrequency – ripple count along edge (0 = smooth, 60+ = jagged)
 *    rippleSpeed     – animation speed         (needs uTime, see animate())
 *    rippleAmplitude – wobble amount            (0 = clean edge)
 *
 *  REVEAL MASK
 *    featherStart    – fluid value where reveal begins       (lower = earlier)
 *    featherEnd      – fluid value where reveal is full      (higher = softer)
 * ────────────────────────────────────────────────────────────
 */
const BRUSH_CONFIG = {
    // Stroke
    strokeWidth:      0.05,
    maxIntensity:     0.5,
    decay:            0.985,

    // Ripple (edge wobble)
    rippleFrequency:  1,
    rippleSpeed:      2,
    rippleAmplitude:  0.0025,

    // Reveal mask
    featherStart:     0.1,
    featherEnd:       0.3,
};

export function init() {
    const canvas = document.querySelector("canvas");
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        precision: "highp"
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const mouse = new THREE.Vector2(0.5, 0.5);
    const prevMouse = new THREE.Vector2(0.5, 0.5);
    let isMoving = false;
    let lastMoveTime = 0;

    const size = 512; // Power of two is better for performance
    const pingPongTargets = [
        new THREE.WebGLRenderTarget(size, size, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
        }),
        new THREE.WebGLRenderTarget(size, size, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
        }),
    ];
    let currentTarget = 0;

    const topTexture = createPlaceholderTexture("#ffffffff");
    const bottomTexture = createPlaceholderTexture("#ff0000");

    const topTextureSize = new THREE.Vector2(1, 1);
    const bottomTextureSize = new THREE.Vector2(1, 1);

    const trailsMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uPrevTrails:      { value: null },
            uMouse:           { value: mouse },
            uPrevMouse:       { value: prevMouse },
            uResolution:      { value: new THREE.Vector2(size, size) },
            uIsMoving:        { value: false },
            uTime:            { value: 0 },
            // ── Brush config ──
            uDecay:           { value: BRUSH_CONFIG.decay },
            uStrokeWidth:     { value: BRUSH_CONFIG.strokeWidth },
            uMaxIntensity:    { value: BRUSH_CONFIG.maxIntensity },
            uRippleFrequency: { value: BRUSH_CONFIG.rippleFrequency },
            uRippleSpeed:     { value: BRUSH_CONFIG.rippleSpeed },
            uRippleAmplitude: { value: BRUSH_CONFIG.rippleAmplitude },
        },
        vertexShader,
        fragmentShader: fluidFragmentShader,
    });

    const displayMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uFluid:            { value: null },
            uTopTexture:       { value: topTexture },
            uBottomTexture:    { value: bottomTexture },
            uResolution:       { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            uDpr:              { value: window.devicePixelRatio },
            uTopTextureSize:   { value: topTextureSize },
            uBottomTextureSize:{ value: bottomTextureSize },
            // ── Brush config ──
            uFeatherStart:     { value: BRUSH_CONFIG.featherStart },
            uFeatherEnd:       { value: BRUSH_CONFIG.featherEnd },
        },
        vertexShader,
        fragmentShader: displayFragmentShader,
    });

    loadImage("/images/portrait-top.jpg", topTexture, topTextureSize);
    loadImage("/images/portrait-bottom.jpg", bottomTexture, bottomTextureSize);

    const planeGeometry = new THREE.PlaneGeometry(2, 2);
    const displayMesh = new THREE.Mesh(planeGeometry, displayMaterial);
    scene.add(displayMesh);

    const simMesh = new THREE.Mesh(planeGeometry, trailsMaterial);
    const simScene = new THREE.Scene();
    simScene.add(simMesh);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("resize", onWindowResize);

    function createPlaceholderTexture(color) {
        const canvas = document.createElement("canvas");
        canvas.width = 2; canvas.height = 2;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 2, 2);
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    function loadImage(url, targetTexture, textureSizeVector) {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = function () {
            textureSizeVector.set(img.width, img.height);
            const tex = new THREE.Texture(img);
            tex.needsUpdate = true;
            if (url.includes("top")) {
                displayMaterial.uniforms.uTopTexture.value = tex;
            } else {
                displayMaterial.uniforms.uBottomTexture.value = tex;
            }
        };
        img.src = url;
    }

    function onMouseMove(event) {
        const rect = canvas.getBoundingClientRect();
        // FIXED: Correct boundary check logic
        if (
            event.clientX >= rect.left && event.clientX <= rect.right &&
            event.clientY >= rect.top && event.clientY <= rect.bottom
        ) {
            prevMouse.copy(mouse);
            mouse.x = (event.clientX - rect.left) / rect.width;
            mouse.y = 1 - (event.clientY - rect.top) / rect.height;
            isMoving = true;
            lastMoveTime = performance.now();
        }
    }

    function onTouchMove(event) {
        if (event.touches.length > 0) {
            const rect = canvas.getBoundingClientRect();
            const touch = event.touches[0];
            if (
                touch.clientX >= rect.left && touch.clientX <= rect.right &&
                touch.clientY >= rect.top && touch.clientY <= rect.bottom
            ) {
                event.preventDefault();
                prevMouse.copy(mouse);
                mouse.x = (touch.clientX - rect.left) / rect.width;
                mouse.y = 1 - (touch.clientY - rect.top) / rect.height;
                isMoving = true;
                lastMoveTime = performance.now();
            }
        }
    }

    function onWindowResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setSize(w, h);
        displayMaterial.uniforms.uResolution.value.set(w, h);
    }

    function animate() {
        requestAnimationFrame(animate);

        // Reset moving state if mouse stops
        if (isMoving && performance.now() - lastMoveTime > 200) {
            isMoving = false;
        }

        const prevTarget = pingPongTargets[currentTarget];
        currentTarget = (currentTarget + 1) % 2;
        const currentRenderTarget = pingPongTargets[currentTarget];

        trailsMaterial.uniforms.uPrevTrails.value = prevTarget.texture;
        trailsMaterial.uniforms.uIsMoving.value = isMoving;
        trailsMaterial.uniforms.uTime.value = performance.now() * 0.001;

        renderer.setRenderTarget(currentRenderTarget);
        renderer.render(simScene, camera);

        displayMaterial.uniforms.uFluid.value = currentRenderTarget.texture;
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
    }
    animate();
}