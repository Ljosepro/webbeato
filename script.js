// =================================================================================
// VERSIÓN FINAL - CON GUARDADO DE COLORES INDIVIDUAL Y RESET DE BOTÓN
// =================================================================================

// --- SECCIÓN 1: CONFIGURACIÓN Y ESTADO GLOBAL ---
const PALETTES = {
    unified: { 
        'Verde':   { hex: '#1F7A1F' },
        'Amarillo':{ hex: '#FFD700' },
        'Azul':    { hex: '#0077FF' },
        'Blanco':  { hex: '#F5F5F5' },
        'Naranja': { hex: '#FF7300' },
        'Morado':  { hex: '#6A0DAD' },
        'Rojo':    { hex: '#D00000' },
        'Negro':   { hex: '#060606' },
        'Rosa':    { hex: '#FF007F' },
        'Gris':    { hex: '#808080' }
    }
};

const CAMERA_VIEWS = {
    normal: { pos: new THREE.Vector3(2, 1, -0.1), target: new THREE.Vector3(0, -0.5, -0.1) },
    top:     { pos: new THREE.Vector3(1, 2, -0.6), target: new THREE.Vector3(-0.1, -0.8, -0.6) },
};
const MODEL_PATH = 'Models/BEATO3.glb'; 
let scene, camera, renderer, controls, clock, model;

let chosenColors = { 
    chasis: 'Gris', 
    buttons: {}, 
    knobs: {}    
};
let state = {
    currentView: 'normal',
    selectedForColoring: null, 
    selectable: { chasis: [], buttons: [], knobs: [] }
};

// --- SECCIÓN 2: INICIALIZACIÓN ---
function init() {
    scene = new THREE.Scene();
    scene.background = null;
    clock = new THREE.Clock();
    const canvas = document.getElementById('webgl');
    
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); 
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    camera = new THREE.PerspectiveCamera(40, canvas.clientWidth / canvas.clientHeight, 0.1, 200);
    camera.position.copy(CAMERA_VIEWS.normal.pos);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.copy(CAMERA_VIEWS.normal.target);
    controls.enableDamping = true;
    controls.minDistance = 2;
    controls.maxDistance = 5;
    
    setupProfessionalLighting();
    loadModel();
    setupUI();
    
    window.addEventListener('resize', onWindowResize);
    canvas.addEventListener('click', onPointerClick);
    animate();
}

// --- SECCIÓN 3: CONFIGURACIÓN DE ESCENA 3D ---
function setupProfessionalLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 8.5);
    mainLight.position.set(5, 5, 5);
    mainLight.castShadow = true;

    mainLight.shadow.mapSize.width = 4096;
    mainLight.shadow.mapSize.height = 4096;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 20;
    mainLight.shadow.normalBias = 0.05;

    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.01);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);
}

function loadModel() {
    const loader = new THREE.GLTFLoader();
    loader.load(MODEL_PATH, (gltf) => {
        model = gltf.scene;
        prepareModelParts();
        centerAndScaleModel(model);
        scene.add(model);
        startIntroAnimation();
    }, undefined, (error) => { console.error(`ERROR AL CARGAR EL MODELO: Revisa la ruta "${MODEL_PATH}"`, error); });
}

// --- SECCIÓN 4: LÓGICA DE PREPARACIÓN DEL MODELO ---
function prepareModelParts() {
    state.selectable = { chasis: [], buttons: [], knobs: [] };
    model.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;
        
        const meshName = child.name.toLowerCase();
        
        if (meshName.includes('cubechasis')) {
            child.material = new THREE.MeshStandardMaterial({ color: PALETTES.unified['Gris'].hex, metalness: 0.9, roughness: 0.1 });
            state.selectable.chasis.push(child);
            chosenColors.chasis = 'Gris';
        } 
        else if (meshName.includes('boton')) {
            const defaultColor = 'Negro';
            child.material = new THREE.MeshStandardMaterial({ color: PALETTES.unified[defaultColor].hex, metalness: 0.4, roughness: 0.2 });
            state.selectable.buttons.push(child);
            chosenColors.buttons[child.name] = defaultColor;
        } 
        else if (meshName.includes('knob')) {
             if (child.material && child.material.color) {
                const lightness = (child.material.color.r + child.material.color.g + child.material.color.b) / 3;
                if (lightness < 0.5) {
                    const defaultColor = 'Rosa';
                    child.material = new THREE.MeshStandardMaterial({ color: PALETTES.unified[defaultColor].hex, metalness: 0, roughness: 1 });
                    state.selectable.knobs.push(child);
                    chosenColors.knobs[child.name] = defaultColor;
                } else {
                    child.material = new THREE.MeshStandardMaterial({ color: 0xffffff });
                }
            }
        }
    });
}

// --- SECCIÓN 5: LÓGICA DE LA INTERFAZ DE USUARIO (UI) ---
function setupUI() {
    document.getElementById('btn-normal').addEventListener('click', () => changeView('normal'));
    document.getElementById('btn-chasis').addEventListener('click', () => changeView('chasis'));
    document.getElementById('btn-buttons').addEventListener('click', () => changeView('buttons'));
    document.getElementById('btn-knobs').addEventListener('click', () => changeView('knobs'));

    // ===================================================================
    // ===== CAMBIO FINAL: LÓGICA DEL BOTÓN CON RESET AUTOMÁTICO ========
    // ===================================================================
    document.getElementById('btn-comprar').addEventListener('click', () => {
        const boton = document.getElementById('btn-comprar');
        boton.textContent = 'PROCESANDO...';
        boton.disabled = true;

        const selectionData = {
            type: 'addToCart',
            chasis: chosenColors.chasis,
            buttons: chosenColors.buttons,
            knobs: chosenColors.knobs
        };
        
        window.parent.postMessage(selectionData, "*");
        console.log("Datos de configuración detallados enviados a Wix.", selectionData);

        // Restaura el botón después de 1.5 segundos para dar tiempo a que Wix reaccione
        // y para que el usuario vea que su clic fue registrado.
        setTimeout(() => {
            boton.textContent = 'AÑADIR AL CARRITO';
            boton.disabled = false;
        }, 1500);
    });
    // ===================================================================

    changeView('normal');
}

function updateColorPalette() {
    const paletteContainer = document.getElementById('color-palette');
    if (!paletteContainer) return;
    paletteContainer.innerHTML = '';
    const colors = PALETTES.unified;
    if (!colors) return;

    Object.entries(colors).forEach(([name, colorData]) => {
        const swatch = document.createElement('div');
        swatch.classList.add('color-swatch');
        swatch.style.backgroundColor = colorData.hex;
        swatch.title = name;
        
        swatch.addEventListener('click', () => {
            if (state.selectedForColoring) {
                state.selectedForColoring.material.color.set(colorData.hex);

                const selectedName = state.selectedForColoring.name;
                if (state.selectable.chasis.includes(state.selectedForColoring)) {
                    chosenColors.chasis = name;
                } else if (state.selectable.buttons.includes(state.selectedForColoring)) {
                    chosenColors.buttons[selectedName] = name;
                } else if (state.selectable.knobs.includes(state.selectedForColoring)) {
                    chosenColors.knobs[selectedName] = name;
                }
            } else {
                alert("Primero haz clic en una pieza del controlador o selecciona una vista de edición.");
            }
        });
        paletteContainer.appendChild(swatch);
    });
}

// --- SECCIÓN 6: MANEJO DE INTERACCIONES Y VISTAS ---
function setEmissive(object, color = 0x000000) {
    if (object && object.material && object.material.emissive) {
        object.material.emissive.setHex(color);
    }
}

function onPointerClick(event) {
    if (state.currentView === 'normal' || state.currentView === 'chasis') return;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const objectsToIntersect = state.selectable[state.currentView] || [];
    if (objectsToIntersect.length === 0) return;

    const intersects = raycaster.intersectObjects(objectsToIntersect, false);

    setEmissive(state.selectedForColoring, 0x000000); 
    
    if (intersects.length > 0) {
        const selectedObject = intersects[0].object;
        state.selectedForColoring = selectedObject;
        setEmissive(state.selectedForColoring, 0x666660);
    } else {
        if (state.currentView !== 'chasis') {
            state.selectedForColoring = null;
        }
    }
}

function changeView(viewName) {
    const uiContainer = document.getElementById('ui-container');
    
    state.currentView = viewName;
    updateColorPalette();

    if (viewName === 'normal') {
        uiContainer.classList.remove('open');
    } else {
        uiContainer.classList.add('open');
    }
    
    if (viewName === 'chasis' && state.selectable.chasis.length > 0) {
        state.selectedForColoring = state.selectable.chasis[0];
    } else {
        state.selectedForColoring = null;
    }
    
    let targetPos, targetLookAt, enableOrbit;
    if (viewName === 'normal') {
        targetPos = CAMERA_VIEWS.normal.pos;
        targetLookAt = CAMERA_VIEWS.normal.target;
        enableOrbit = true;
    } else {
        targetPos = CAMERA_VIEWS.top.pos;
        targetLookAt = CAMERA_VIEWS.top.target;
        enableOrbit = false;
    }
    controls.enabled = enableOrbit;
    gsap.to(camera.position, { duration: 1.2, ease: 'power3.inOut', ...targetPos });
    gsap.to(controls.target, { duration: 1.2, ease: 'power3.inOut', ...targetLookAt, onUpdate: () => controls.update() });
    
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-${viewName}`).classList.add('active');
}


// --- SECCIÓN 7: FUNCIONES AUXILIARES Y BUCLE DE ANIMACIÓN ---
function startIntroAnimation() {if (!model) return;gsap.to(model.position, { y: `+=${0.05}`, duration: 3, ease: 'sine.inOut', repeat: -1, yoyo: true });}
function centerAndScaleModel(obj) {const box = new THREE.Box3().setFromObject(obj);const size = box.getSize(new THREE.Vector3());const center = box.getCenter(new THREE.Vector3());const maxSize = Math.max(size.x, size.y, size.z);const desiredSize = 1.8;const scale = desiredSize / maxSize;obj.scale.set(scale, scale, scale);obj.position.copy(center).multiplyScalar(-scale);obj.position.y -= (size.y / 2) * scale;}
function onWindowResize() {const canvasContainer = document.getElementById('canvas-container'); if (canvasContainer) {const width = canvasContainer.clientWidth;const height = canvasContainer.clientHeight;camera.aspect = width / height;camera.updateProjectionMatrix();renderer.setSize(width, height);}}
function animate() {requestAnimationFrame(animate);controls.update();renderer.render(scene, camera);}

init();
