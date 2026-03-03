import * as THREE from 'three';
import { vertexShader, fluidFragmentShader, displayFragmentShader } from './shaders.js';

window.addEventListener("load", init);

function init() {
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
            uPrevTrails: { value: null },
            uMouse: { value: mouse },
            uPrevMouse: { value: prevMouse },
            uResolution: { value: new THREE.Vector2(size, size) },
            uDecay: { value: 0.98 },
            uIsMoving: { value: false },
        },
        vertexShader,
        fragmentShader: fluidFragmentShader,
    });

    const displayMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uFluid: { value: null },
            uTopTexture: { value: topTexture },
            uBottomTexture: { value: bottomTexture },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            uDpr: { value: window.devicePixelRatio },
            uTopTextureSize: { value: topTextureSize },
            uBottomTextureSize: { value: bottomTextureSize },
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

        renderer.setRenderTarget(currentRenderTarget);
        renderer.render(simScene, camera);

        displayMaterial.uniforms.uFluid.value = currentRenderTarget.texture;
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
    }
    animate();
}