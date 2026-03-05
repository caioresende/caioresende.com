/**
 * VERTEX SHADER
 */
export const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

/**
 * FLUID FRAGMENT SHADER
 */
export const fluidFragmentShader = `
    uniform sampler2D uPrevTrails;
    uniform vec2 uMouse;
    uniform vec2 uPrevMouse;
    uniform bool uIsMoving;
    uniform float uTime;

    // ── Brush config (driven from BRUSH_CONFIG) ──
    uniform float uDecay;
    uniform float uStrokeWidth;
    uniform float uMaxIntensity;
    uniform float uRippleFrequency;
    uniform float uRippleSpeed;
    uniform float uRippleAmplitude;

    varying vec2 vUv;

    void main() {
        vec4 prevState = texture2D(uPrevTrails, vUv);
        float newValue = prevState.r * uDecay;

        if(uIsMoving) {
            vec2 mouseDirection = uMouse - uPrevMouse;
            float lineLength = length(mouseDirection);

            if (lineLength > 0.001) {
                vec2 mouseDir = mouseDirection / lineLength;
                float projAlong = clamp(dot(vUv - uPrevMouse, mouseDir), 0.0, lineLength);
                vec2 closestPoint = uPrevMouse + projAlong * mouseDir;
                float dist = length(vUv - closestPoint);

                float ripple = sin(dist * uRippleFrequency - uTime * uRippleSpeed) * uRippleAmplitude;
                float width = uStrokeWidth + ripple;
                float intensity = smoothstep(width, 0.0, dist) * uMaxIntensity;
                newValue += intensity;
            }
        }
        gl_FragColor = vec4(clamp(newValue, 0.0, 1.0), 0.0, 0.0, 1.0);
    }
`;

/**
 * DISPLAY FRAGMENT SHADER
 */
export const displayFragmentShader = `
    uniform sampler2D uFluid;
    uniform sampler2D uTopTexture;
    uniform sampler2D uBottomTexture;
    uniform vec2 uResolution;
    uniform vec2 uTopTextureSize;
    uniform vec2 uBottomTextureSize;

    // ── Brush config (driven from BRUSH_CONFIG) ──
    uniform float uFeatherStart;
    uniform float uFeatherEnd;

    varying vec2 vUv;

    vec2 getCorrectedUV(vec2 uv, vec2 textureSize) {
        if (textureSize.x < 1.0) return uv;
        vec2 s = uResolution / textureSize;
        float scale = max(s.x, s.y);
        vec2 scaledSize = textureSize * scale;
        vec2 offset = (uResolution - scaledSize) * 0.5;
        return (uv * uResolution - offset) / scaledSize;
    }

    void main () {
        float fluid = texture2D(uFluid, vUv).r;
        vec2 topUV = getCorrectedUV(vUv, uTopTextureSize);
        vec2 bottomUV = getCorrectedUV(vUv, uBottomTextureSize);

        vec4 topColor = texture2D(uTopTexture, topUV);
        vec4 bottomColor = texture2D(uBottomTexture, bottomUV);

        float mask = smoothstep(uFeatherStart, uFeatherEnd, fluid);
        gl_FragColor = mix(topColor, bottomColor, mask);
    }
`;