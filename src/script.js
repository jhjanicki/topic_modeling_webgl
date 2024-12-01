import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import * as d3 from 'd3'



let points;
let pointsMaterial;
let topics = [];
let activeTopics = new Set();
let data; // Declare data at the top level
let userData;
let raycaster;
let mouse;
// At the top of your file, with other global variables

// Add this at the top to select the tooltip element
const tooltip = document.getElementById('tooltip');

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Perform raycasting
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(points);

    if (intersects.length > 0) {
        // Get the first intersected point
        const intersected = intersects[0];
        const index = intersected.index;
        const datasetType = intersected.object.userData.type;
        console.log(datasetType)
        // Get the data corresponding to the intersected point
        const pointData = data[index];
        if (pointData) {
            // Update tooltip content
        if (datasetType === "tweets") {
            tooltip.innerHTML = `
                <strong>Tweet Data</strong><br>
                Topic: ${pointData.Topic}<br>
                UMAP1: ${pointData.UMAP1}<br>
                UMAP2: ${pointData.UMAP2}
            `;
        } else  {
            tooltip.innerHTML = `
                <strong>User Data</strong><br>
                Name: ${pointData.Name}<br>
                UMAP1: ${pointData.UMAP1}<br>
                UMAP2: ${pointData.UMAP2}
            `;
        }
            tooltip.style.display = 'block';
            tooltip.style.left = `${event.clientX + 10}px`;
            tooltip.style.top = `${event.clientY + 10}px`;
        }
    } else {
        // Hide tooltip if no intersection
        tooltip.style.display = 'none';
    }
}


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
// const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene()
/**
 * Scatter Plot
 */
const loadData = async () => {
    const data = await d3.csv("./topic_model_tweet_data.csv")
    return data
}

const loadUserData = async () => {
    const data = await d3.csv("./topic_model_user_data.csv")
    return data
}

const createScatterPlot = (loadedData, datasetType) => {

    // Scale function for positions
    const scalePosition = (value, min, max) => (value - min) / (max - min) * 2 - 1;

    const zPosition = datasetType === "tweets" ? 0 : 0.001; // User points slightly in front of tweet points

    if (datasetType === "tweets") {
        data = loadedData; // Assign loadedData to the global data variable
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(data.length * 3);
        const colors = new Float32Array(data.length * 4); // RGBA

        // Color scale
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        data.forEach((d, i) => {
            const x = scalePosition(+d.UMAP1, -15, 15)
            const y = scalePosition(+d.UMAP2, -15, 15)
            const z = zPosition;

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
        points.userData = {
            type: datasetType,
            data: loadedData
        };


        scene.add(points);


        // Extract unique topics from the existing data
        topics = [...new Set(data.map(d => d.Topic))];
        createTopicButtons();

    }else{
        userData = loadedData; // Assign loadedData to the global data variable
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(userData.length * 3);
        const color = new Float32Array(0xff5733); // RGBA

        userData.forEach((d, i) => {
            const x = scalePosition(+d.UMAP1, -15, 15);
            const y = scalePosition(+d.UMAP2, -15, 15);
            const z = zPosition;

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        });


        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Create a material for these points
        const material = new THREE.PointsMaterial({
            size: 0.005,
            color: color,
            sizeAttenuation: true,
            transparent: true,
        });

        const points = new THREE.Points(geometry, material);
        points.userData = { type: "additional", data: userData }; // Tag with metadata
        points.userData = {
            type: datasetType,
            data: loadedData
        };


        scene.add(points);

    }

    // Initialize raycaster and mouse
    raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 0.01;
    mouse = new THREE.Vector2();


    // Add mouse move event listener
    window.addEventListener('mousemove', onMouseMove);



    // console.log(`Added ${data.length} points to the scene`);
    // console.log(`Topics: ${topics.join(', ')}`);

    // Add axes helper
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
}


// Load data and create scatter plot
loadData().then(loadedData => {
    createScatterPlot(loadedData,"tweets");
    // animate(); // Start the animation loop after creating the scatter plot
});

loadUserData().then(loadedData => {
    createScatterPlot(loadedData,"users");
});

// animate(); // Start the animation loop after creating the scatter plot


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


    renderer.render(scene, camera);
}
animate();


// Add mouse move event listener
window.addEventListener('mousemove', onMouseMove);

// Ensure tooltip hides on window resize or if user moves outside canvas
canvas.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
});



