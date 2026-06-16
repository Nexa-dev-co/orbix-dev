/**
 * GLSL for the blue star. Planets use a standard PBR material, no custom shader.
 * Adapted from the orbit prototype's orange sun, re-tinted to a cyan-blue palette.
 */

const NOISE = /* glsl */ `
  float hash(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float vnoise(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float fbm(vec3 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.02; a*=0.5; } return v; }
`;

export const POSITION_VERT = /* glsl */ `
  varying vec3 vWorldNormal; varying vec3 vView; varying vec3 vPos;
  void main(){
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - wp.xyz);
    vPos = position;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

/** Blue-white churning core — emits > 1 so bloom picks it up. */
export const STAR_CORE_FRAG = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorldNormal; varying vec3 vView; varying vec3 vPos;
  ${NOISE}
  void main(){
    vec3 V = normalize(vView); vec3 N = normalize(vWorldNormal);
    float n = fbm(vPos * 2.5 + uTime * 0.12);
    // Blue-white ramp: deep blue → bright white based on noise
    vec3 hot = mix(vec3(0.18, 0.45, 1.0), vec3(0.7, 0.88, 1.0), n);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 1.6);
    gl_FragColor = vec4(hot * (1.6 + fres * 2.2), 1.0); // > 1 → blooms
  }
`;

/** Soft blue glow shell rendered on a back-facing sphere around the core. */
export const STAR_CORONA_FRAG = /* glsl */ `
  varying vec3 vWorldNormal; varying vec3 vView;
  void main(){
    float fres = pow(1.0 - max(dot(normalize(vWorldNormal), normalize(vView)), 0.0), 2.0);
    gl_FragColor = vec4(0.25, 0.55, 1.0, fres * 0.8);
  }
`;
