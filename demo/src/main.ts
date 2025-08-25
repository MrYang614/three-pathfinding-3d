import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Pathfinding, PathfindingHelper, } from "three-pathfinding-3d";

const viewport = document.getElementById("app");

const Color = {
    GROUND: 0x606060,
    NAVMESH: 0xFFFFFF,
};

const ZONE = 'level';
const SPEED = 5;

let navmesh: THREE.Mesh;

let groupID: number, path: THREE.Vector3[];

const playerPosition = new THREE.Vector3(-3.5, 0.5, 5.5);
const targetPosition = new THREE.Vector3();

const pathfinder = new Pathfinding();
const helper = new PathfindingHelper();
const clock = new THREE.Clock();
const mouse = new THREE.Vector2();
const mouseDown = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xFFFFFF);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
viewport.appendChild(renderer.domElement);

const environment = new RoomEnvironment();
const pmremGenerator = new THREE.PMREMGenerator(renderer);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbbbbbb);
scene.environment = pmremGenerator.fromScene(environment).texture;
scene.add(helper);
environment.dispose();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
camera.position.x = -10;
camera.position.y = 14;
camera.position.z = 10;

const controls = new OrbitControls(camera, renderer.domElement);
controls.dampingFactor = 0.2;

const ambient = new THREE.AmbientLight(0x101030);
scene.add(ambient);

const directionalLight = new THREE.DirectionalLight(0xFFEEDD);
directionalLight.position.set(0, 0.5, 0.5);
scene.add(directionalLight);

init();
animate();

async function init() {

    const gltfLoader = new GLTFLoader();

    gltfLoader.load('/level.glb', function (gltf) {

        const levelMesh = gltf.scene.getObjectByName('Cube') as THREE.Mesh;
        const levelMat = new THREE.MeshStandardMaterial({
            color: Color.GROUND,
            flatShading: true,
            roughness: 1,
            metalness: 0
        });
        const mesh = new THREE.Mesh(levelMesh.geometry, levelMat);
        scene.add(mesh);
    }, null);

    gltfLoader.load('/level.nav.glb', function (gltf) {

        const _navmesh = gltf.scene.getObjectByName('Navmesh_Mesh') as THREE.Mesh;

        console.time('createZone()');
        const zone = Pathfinding.createZone(_navmesh.geometry);
        console.timeEnd('createZone()');

        pathfinder.setZoneData(ZONE, zone);

        const navWireframe = new THREE.Mesh(_navmesh.geometry, new THREE.MeshBasicMaterial({
            color: 0x808080,
            wireframe: true,
            // depthTest: false,
            // transparent: true,
        }));
        navWireframe.position.y = 0.1;
        scene.add(navWireframe);

        navmesh = new THREE.Mesh(_navmesh.geometry, new THREE.MeshBasicMaterial({
            color: Color.NAVMESH,
            side: THREE.DoubleSide
        }));

        scene.add(navmesh);

        // Set the player's navigation mesh group
        groupID = pathfinder.getGroup(ZONE, playerPosition);

    }, null);

    helper
        .setPlayerPosition(new THREE.Vector3(-3.5, 0.5, 5.5))
        .setTargetPosition(new THREE.Vector3(-3.5, 0.5, 5.5));

    document.addEventListener('pointerdown', onDocumentPointerDown, false);
    document.addEventListener('pointerup', onDocumentPointerUp, false);
    window.addEventListener('resize', onWindowResize, false);

}

function onDocumentPointerDown(event) {

    mouseDown.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouseDown.y = - (event.clientY / window.innerHeight) * 2 + 1;

}

function onDocumentPointerUp(event) {

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    if (Math.abs(mouseDown.x - mouse.x) > 0 || Math.abs(mouseDown.y - mouse.y) > 0) return; // Prevent unwanted click when rotate camera.

    camera.updateMatrixWorld();

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObject(navmesh);

    if (!intersects.length) return;

    targetPosition.copy(intersects[0].point);

    helper
        .reset()
        .setPlayerPosition(playerPosition);

    // Teleport on ctrl/cmd click or RMB.
    if (event.metaKey || event.ctrlKey || event.button === 2) {

        path = null;
        groupID = pathfinder.getGroup(ZONE, targetPosition, true);
        const closestNode = pathfinder.getClosestNode(playerPosition, ZONE, groupID, true);

        helper.setPlayerPosition(playerPosition.copy(targetPosition));
        if (closestNode) helper.setNodePosition(closestNode.centroid);

        return;

    }

    const targetGroupID = pathfinder.getGroup(ZONE, targetPosition, true);
    const closestTargetNode = pathfinder.getClosestNode(targetPosition, ZONE, targetGroupID, true);

    helper.setTargetPosition(targetPosition);
    if (closestTargetNode) helper.setNodePosition(closestTargetNode.centroid);

    // Calculate a path to the target and store it
    const result = pathfinder.findPath(playerPosition, targetPosition, ZONE, groupID);

    if (result && result.path.length) {
        path = result.path.map((c) => new THREE.Vector3(c.x, c.y, c.z));

        helper.setPath(path);
        // helper.setChannelPath(result.channelPath);
        // helper.setNodePath(result.nodePath);

    } else {

        const clamped = new THREE.Vector3();

        // TODO(donmccurdy): Don't clone targetPosition, fix the bug.
        pathfinder.clampStep(playerPosition, targetPosition.clone(), ZONE, groupID, clamped);

        helper.setStepPosition(clamped);

    }
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {

    requestAnimationFrame(animate);
    tick(clock.getDelta());
    renderer.render(scene, camera);

}

function tick(dt) {
    if (!(path || []).length) return;

    let targetPosition = path[0];
    const velocity = targetPosition.clone().sub(playerPosition);

    if (velocity.lengthSq() > 0.05 * 0.05) {
        velocity.normalize();
        // Move player to target
        playerPosition.add(velocity.multiplyScalar(dt * SPEED));
        helper.setPlayerPosition(playerPosition);
    } else {
        // Remove node from the path we calculated
        path.shift();
    }

}
