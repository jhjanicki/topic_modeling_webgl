import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import * as d3 from 'd3'

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

const createScatterPlot = (data) => {
    // Create geometry and material for points
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(data.length * 3)
    const colors = new Float32Array(data.length * 3)

    // Find min and max for UMAP1 and UMAP2 for scaling
    const umap1Extent = d3.extent(data, d => +d.UMAP1)
    const umap2Extent = d3.extent(data, d => +d.UMAP2)

    // Scale function for positions
    const scalePosition = (value, min, max) => (value - min) / (max - min) * 2 - 1

    // Color scale
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)

    data.forEach((d, i) => {
        const x = scalePosition(+d.UMAP1, -15, 15)
        const y = scalePosition(+d.UMAP2, -15, 15)
        const z = 0

        console.log(umap1Extent, umap2Extent)

        positions[i * 3] = x
        positions[i * 3 + 1] = y
        positions[i * 3 + 2] = z

        const color = new THREE.Color(colorScale(d.Topic))
        colors[i * 3] = color.r
        colors[i * 3 + 1] = color.g
        colors[i * 3 + 2] = color.b
    })

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({ size: 0.001, vertexColors: true })
    const points = new THREE.Points(geometry, material)
    scene.add(points)

    console.log(`Added ${data.length} points to the scene`)

    // Add axes helper
    const axesHelper = new THREE.AxesHelper(5)
    scene.add(axesHelper)
}

// Load data and create scatter plot
loadData().then(data => {
    createScatterPlot(data)
})

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
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.0001, 1000)
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
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

// Debug info
console.log('Scene children:', scene.children)
console.log('Camera position:', camera.position)

tick()

// Add GUI controls for camera and points
gui.add(camera, 'fov', 1, 180).onChange(() => camera.updateProjectionMatrix())
gui.add(camera.position, 'x', 0.01, 10).name('Camera X')
gui.add(camera.position, 'y', 0.01, 10).name('Camera Y')
gui.add(camera.position, 'z', 0.01, 10).name('Camera Z')
gui.add(material, 'size', 0.0001, 0.01).name('Point Size')
