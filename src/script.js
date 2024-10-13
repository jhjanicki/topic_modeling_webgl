import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import * as d3 from 'd3'



let points;
let pointsMaterial;
let topics = [];
let activeTopics = new Set();
let data; // Declare data at the top level
let raycaster;
let mouse;
// At the top of your file, with other global variables
let tooltip;

// In your initialization code (e.g., at the start of createScatterPlot or in a separate init function)
function initTooltip() {
    tooltip = document.getElementById('tooltip');
}

function updateTooltip(content, x, y) {
    tooltip.innerHTML = content;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    tooltip.style.display = 'block';
}

function hideTooltip() {
    tooltip.style.display = 'none';
}

// In your createScatterPlot function, add:
initTooltip();

const createTopicButtons = () => {
    const filterContainer = document.getElementById('topic-filters');
    if (!filterContainer) {
        console.error('Filter container not found');
        return;
    }
    filterContainer.innerHTML = ''; // Clear existing buttons
    topics.forEach(topic => {
        const button = document.createElement('button');
        button.textContent = topic;
        button.classList.add('topic-button');
        button.addEventListener('click', () => toggleTopic(topic));
        filterContainer.appendChild(button);
    });
}

const toggleTopic = (topic) => {
    console.log(`Toggling topic: ${topic}`);
    const button = document.querySelector(`.topic-button:nth-child(${topics.indexOf(topic) + 1})`);
    if (activeTopics.has(topic)) {
        activeTopics.delete(topic);
        button.classList.remove('active');
    } else {
        activeTopics.add(topic);
        button.classList.add('active');
    }
    console.log(`Active topics: ${Array.from(activeTopics)}`);
    updatePointsVisibility();
}

const updatePointsVisibility = () => {
    if (!points || !data) {
        console.error('Points or data not initialized');
        return;
    }

    const geometry = points.geometry;
    const colors = geometry.attributes.color.array;

    let visibleCount = 0;
    for (let i = 0; i < data.length; i++) {
        const topic = data[i].Topic;
        const visible = activeTopics.size === 0 || !activeTopics.has(topic);
        colors[i * 4 + 3] = visible ? 1 : 0; // Update alpha component
        if (visible) visibleCount++;
    }

    geometry.attributes.color.needsUpdate = true;
    console.log(`Updated visibility. Visible points: ${visibleCount}/${data.length}`);

    // Force a re-render
    renderer.render(scene, camera);
}

/**
 * Base
 */
// Debug
const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
/**
 * Scatter Plot
 */
const loadData = async () => {
    const data = await d3.csv("/data/topic_model_tweet_data.csv")
    return data
}

const createScatterPlot = (loadedData) => {
    data = loadedData; // Assign loadedData to the global data variable
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(data.length * 3);
    const colors = new Float32Array(data.length * 4); // RGBA

    // Find min and max for UMAP1 and UMAP2 for scaling
    const umap1Extent = d3.extent(data, d => +d.UMAP1);
    const umap2Extent = d3.extent(data, d => +d.UMAP2);

    // Scale function for positions
    const scalePosition = (value, min, max) => (value - min) / (max - min) * 2 - 1;

    // Color scale
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    data.forEach((d, i) => {
        const x = scalePosition(+d.UMAP1, -15, 15)
        const y = scalePosition(+d.UMAP2, -15, 15)
        const z = 0

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        const color = new THREE.Color(colorScale(d.Topic));
        colors[i * 4] = color.r;
        colors[i * 4 + 1] = color.g;
        colors[i * 4 + 2] = color.b;
        colors[i * 4 + 3] = 1; // Alpha, initially all points are visible
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));

    pointsMaterial = new THREE.PointsMaterial({
        size: 0.003,
        vertexColors: true,
        sizeAttenuation: true,
        transparent: true,
        alphaTest: 0.01
    });

    points = new THREE.Points(geometry, pointsMaterial);
    scene.add(points);

    // Initialize raycaster and mouse
    raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 0.01;
    mouse = new THREE.Vector2();


    // Add mouse move event listener
    window.addEventListener('mousemove', onMouseMove);

    // Extract unique topics from the existing data
    topics = [...new Set(data.map(d => d.Topic))];
    createTopicButtons();

    console.log(`Added ${data.length} points to the scene`);
    console.log(`Topics: ${topics.join(', ')}`);

    // Add axes helper
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
}


function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}


// Load data and create scatter plot
loadData().then(loadedData => {
    createScatterPlot(loadedData);
    animate(); // Start the animation loop after creating the scatter plot
});

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.00001, 1000)
camera.position.set(0, 0, 2)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.minDistance = 0.01
controls.maxDistance = 10
controls.zoomSpeed = 0.5

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */

const animate = () => {
    requestAnimationFrame(animate);
    controls.update();

    // Update point size based on camera distance
    if (points && camera) {
        const distance = camera.position.distanceTo(controls.target);
        const baseSize = 0.001;
        const minSize = 0.0005;
        const scaleFactor = Math.max(distance * 0.1, 1);
        pointsMaterial.size = Math.max(baseSize / scaleFactor, minSize);
    }

   // Check for hover
   if (raycaster && mouse && camera && points && data) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(points);

    if (intersects.length > 0) {
        const index = intersects[0].index;
        const point = data[index];
        if (point && point.User && point.Topic) {
            const tooltipContent = `<strong>User:</strong> ${point.User}<br><strong>Topic:</strong> ${point.Topic}`;
            const vector = new THREE.Vector3().fromBufferAttribute(points.geometry.attributes.position, index);
            vector.project(camera);
            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
            updateTooltip(tooltipContent, x + 10, y + 10);
        } else {
            hideTooltip();
        }
    } else {
        hideTooltip();
    }
}

    renderer.render(scene, camera);
}
animate();

// Debug info
console.log('Scene children:', scene.children)
console.log('Camera position:', camera.position)

// Add GUI controls for camera and points
gui.add(camera, 'fov', 1, 180).onChange(() => camera.updateProjectionMatrix())
gui.add(camera.position, 'z', 0.01, 10).name('Camera Z')
// gui.add(pointsMaterial, 'size', 0.0001, 0.01).name('Point Size')


