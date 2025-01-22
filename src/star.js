import * as THREE from 'three';

// Shared TextureLoader instance for caching
const sharedTextureLoader = new THREE.TextureLoader();

/**
 * Creates a group containing a plane with emissive properties and a surrounding particle system.
 * The plane and particle system share a synchronized random scale across nodes.
 * 
 * @param {string} modelPath - Path to the model (unused in current implementation).
 * @param {number} planeSize - Base size of the plane.
 * @param {number|string|THREE.Color} planeColor - Base color of the plane.
 * @param {number} [emissionBrightness=3] - Brightness multiplier for emissive color.
 * @param {THREE.TextureLoader} [textureLoader=sharedTextureLoader] - TextureLoader instance.
 * @returns {THREE.Group} A group containing the plane and particles with static effects.
 */
export function createPlaneWithParticles(
  modelPath,
  planeSize,
  planeColor,
  emissionBrightness = .6,
  textureLoader = sharedTextureLoader, // Default to shared loader
) {
  const group = new THREE.Group();
//  console.log(nodeDetails)
  // Generate a random scale factor for the node
  const randomScale = THREE.MathUtils.randFloat(0.5, 2.0); // Random scale between 0.5 and 2.0

  // Load point texture using the provided texture loader
  const pointTexture = textureLoader.load(
    'https://threejs.org/examples/textures/sprites/circle.png',
    undefined,
    undefined,
    (err) => {
      console.error('An error occurred loading the texture.', err);
    }
  );

  // Define four specific emissive colors
  const emissiveColors = [
    new THREE.Color(0xffffff), // White
    new THREE.Color(0x5AB7FA), // Blue
    new THREE.Color(0xEF4444), // Red
    new THREE.Color(0xFF7700)  // Orange
  ];

  // Select one emissive color randomly from the four
  const selectedEmissiveColor = emissiveColors[Math.floor(Math.random() * emissiveColors.length)];

  // Plane Material with static brightness
  const planeMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(planeColor) },          // Base color
      uBrightness: { value: emissionBrightness },              // Brightness multiplier
      uEmissiveColor: { value: selectedEmissiveColor }         // Selected emissive color
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv; // Pass UV coordinates to the fragment shader
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uBrightness;
      uniform vec3 uEmissiveColor;
      varying vec2 vUv;

      void main() {
        float dist = distance(vUv, vec2(0.5));
        float intensity = smoothstep(0.0, 0.5, 0.5 - dist) * uBrightness;
        vec3 emissive = uEmissiveColor * intensity;
        float alpha = smoothstep(0.5, 0.48, 0.5 - dist);
        if (alpha <= 0.01) discard;
        gl_FragColor = vec4(uColor * intensity + emissive, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // Plane Geometry
  const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.scale.set(randomScale, randomScale, 1); // Apply random scale
  group.add(plane);

  // Declare sphereRadius based on planeSize and randomScale
  const sphereRadius = (planeSize / 2) * randomScale;

  // Particles in a sphere
  const particleCount = 200; // Adjust particle count as needed
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    // Generate random spherical coordinates
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = sphereRadius * Math.cbrt(Math.random()); // Adjust distribution

    // Convert spherical to Cartesian coordinates
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    sizes[i] = Math.random() * 4.0 + 1.5; // Random particle sizes
  }

  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  // Particle Material with static brightness
  const particleMaterial = new THREE.ShaderMaterial({
    uniforms: {
      pointTexture: { value: pointTexture },
      uEmissiveColor: { value: selectedEmissiveColor },  // Shared emissive color
      uBrightness: { value: emissionBrightness },          // Brightness multiplier
    },
    vertexShader: `
      attribute float size;
      uniform vec3 uEmissiveColor;
      uniform float uBrightness;
      varying vec3 vEmissive;

      void main() {
        vEmissive = uEmissiveColor * uBrightness;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D pointTexture;
      varying vec3 vEmissive;

      void main() {
        vec4 textureColor = texture2D(pointTexture, gl_PointCoord);
        if (textureColor.a < 0.5) discard;
        gl_FragColor = vec4(vEmissive, textureColor.a);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  group.add(particles);

  /**
   * Disposes of all geometries, materials, and textures to free memory.
   * Should be called when the group is no longer needed.
   */
  group.dispose = function () {
    // Dispose plane geometry and material
    planeGeometry.dispose();
    planeMaterial.dispose();

    // Dispose particle geometry and material
    particleGeometry.dispose();
    particleMaterial.dispose();

    // Dispose texture
    pointTexture.dispose();
  };

  return group;
}
