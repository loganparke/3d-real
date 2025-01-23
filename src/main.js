import * as THREE from 'three';
import ForceGraph3D from '3d-force-graph';
import { createPlaneWithParticles } from '/src/star.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import data from "./miserables.js"
const sizes = { width: window.innerWidth, height: window.innerHeight };

let data1 = data

function transformData(data) {
  const nodesMap = new Map();
  const links = [];

  data.forEach(record => {
    const { path } = record;
    const { segments } = path;

    segments.forEach(segment => {
      const { start, end, relationship } = segment;

      if (!nodesMap.has(start.identity)) {
        nodesMap.set(start.identity, {
          id: start.identity,
          label: start.labels[0],
          name: start.properties.name,
          elementId: start.elementId
        });
      }

      if (!nodesMap.has(end.identity)) {
        nodesMap.set(end.identity, {
          id: end.identity,
          label: end.labels[0],
          name: end.properties.name,
          elementId: end.elementId
        });
      }

      links.push({
        source: start.identity,
        target: end.identity,
        relationshipType: relationship.type,
        relationshipName: relationship.properties.name
      });
    });
  });

  const nodes = Array.from(nodesMap.values());
  return { nodes, links };
}

const { nodes, links } = transformData(data);

// -----------------------------------------------------------------------

// Create the 3D force graph using the transformed data
const Graph = ForceGraph3D()(document.getElementById('graph-container'))
  .graphData({ nodes, links })
  .nodeLabel(node => `<div class="graph-tooltip">${node.name}</div>`)
  .nodeThreeObject(node => {
    const lod = new THREE.LOD();

    // Add detailed geometry (e.g., plane with particles)
    const highDetail = createPlaneWithParticles('./static/starmodels3.glb', 30, 0xffffff);
    highDetail.userData.nodeId = node.id;
    lod.addLevel(highDetail, 500); // Full detail at distance 0

    // Add medium-detail geometry
    const mediumDetailGeometry = new THREE.PlaneGeometry(20, 20);
    const mediumDetailMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
    const mediumDetail = new THREE.Mesh(mediumDetailGeometry, mediumDetailMaterial);
    lod.addLevel(mediumDetail, 4999); // Medium detail at distance 1400

    // Add low-detail geometry
    const lowDetailGeometry = new THREE.SphereGeometry(5, 8, 8); 
    const lowDetailMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lowDetail = new THREE.Mesh(lowDetailGeometry, lowDetailMaterial);
    lod.addLevel(lowDetail, 5000); // Low detail at distance 1401

      // Add an invisible larger sphere for easier clicking
  const clickAreaGeometry = new THREE.SphereGeometry(15, 16, 16); // Larger geometry
  const clickAreaMaterial = new THREE.MeshBasicMaterial({ visible: false }); // Invisible
  const clickArea = new THREE.Mesh(clickAreaGeometry, clickAreaMaterial);
  clickArea.userData = { nodeId: node.id }; // Attach data for identification
  lod.addLevel(clickArea, 10000); // Use the largest level for interaction

    return lod;
  })
  .linkWidth(2)
  .linkColor('#aaa')
  .onNodeClick(function(node) {
    console.log(node);

    var sideOffset = 200; // Controls how far the camera is from the node on the X-axis
    var distance = 150;   // Controls the zoom level or distance from the node
    
    // Calculate a fixed offset position relative to the node
    var newPos = {
        x: node.x + sideOffset, // Place the camera to the side of the node
        y: node.y,              // Align vertically with the node
        z: node.z               // Maintain depth alignment
    };

    // Adjust the lookAt target to focus directly on the selected node
    var lookAtPos = {
        x: node.x, // Focus on the node's position
        y: node.y,
        z: node.z
    };

    // Reset the camera position and lookAt target with every click
    Graph.cameraPosition(
        newPos,      // Camera position (to the side of the node)
        lookAtPos,   // LookAt target (focus on the node itself)
        3000         // Transition duration in ms
    );
});

//   .onNodeClick(function(node) {
//     console.log(node)
//     // Aim at node from outside it
//     var distance = 150;
//     var distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

//     var newPos = (node.x || node.y || node.z)
//         ? { x: node.x * distRatio + 200, y: node.y * distRatio, z: node.z * distRatio }
//         : { x: 200, y: 0, z: distance }; // special case if node is in (0,0,0)

//     Graph.cameraPosition(
//         newPos, // new position
//         node,   // lookAt ({ x, y, z })
//         3000    // ms transition duration
//     );
// });

// Configure camera controls
const controls = Graph.controls();
controls.rotateSpeed = 1.5; 
controls.zoomSpeed = 0.5; 
controls.enableDamping = true; 
controls.dampingFactor = 2.5; 
controls.screenSpacePanning = true; 
controls.panSpeed = .8;
controls.zoomSpeed = 1.2; // Adjust to balance zooming speed
controls.minDistance = 50; // Prevent zooming too close
controls.maxDistance = 2000; // Prevent zooming too far

// Adjust the link distance
Graph.d3Force('link').distance(200);
Graph.linkWidth(1); 

// Access the scene (created by ForceGraph3D)
const scene = Graph.scene();

// Adjust camera
const camera = Graph.camera();
camera.position.set(1800, 150, 150);
camera.lookAt(new THREE.Vector3(0, 0, 0));

// Adjust camera near/far planes
camera.near = 1;
camera.far = 700;
camera.updateProjectionMatrix(); 

// Add lighting
const ambientLight = new THREE.AmbientLight(0x404040, 1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(100, 100, 100);
scene.add(directionalLight);

const spotLight = new THREE.SpotLight(0xffffff, 0.5);
spotLight.position.set(0, 100, 100);
scene.add(spotLight);

// Add environment sphere with HDRI
function addEnvironmentSphere(hdriPath, brightness = 1) {
  const sphereGeometry = new THREE.SphereGeometry(5000, 64, 64); 
  const hdrLoader = new RGBELoader();

  hdrLoader.load(hdriPath, texture => {
    texture.mapping = THREE.EquirectangularReflectionMapping;

    const sphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: texture },
        uBrightness: { value: brightness },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform float uBrightness;
        varying vec2 vUv;

        void main() {
          vec4 texColor = texture2D(uTexture, vUv);
          gl_FragColor = vec4(texColor.rgb * uBrightness, texColor.a);
        }
      `,
      side: THREE.BackSide,
      transparent: false,
    });

    const environmentSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(environmentSphere);
  });
}

// Add the HDRI environment sphere
addEnvironmentSphere('./static/spaceStarsE2.hdr', 5.0);

// Ensure renderer settings
const renderer = Graph.renderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

// Add EffectComposer and BloomPass
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.0, 
  0.4, 
  0.85
);
bloomPass.threshold = 0.1; 
bloomPass.strength = 0.03; 
bloomPass.radius = 0.5; 
composer.setSize(window.innerWidth / 4, window.innerHeight / 4);

// Add resize listener
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  sizes.width = width;
  sizes.height = height;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  composer.setSize(width, height);
});

// Animate loop
function animate() {
  requestAnimationFrame(animate);

  // Make all planes face the camera
  scene.traverse(object => {
    if (object.isMesh && object.geometry.type === 'PlaneGeometry') {
      object.lookAt(camera.position);
    }
  });

  composer.render();
}
animate();

