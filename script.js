// =================================================================================
// VERSIÓN FINAL - CON SELECCIÓN AUTOMÁTICA DE CHASIS
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
const MODEL_PATH = 'models/BEATO3.glb'; 
let scene, camera, renderer, controls, clock, model;
let chosenColors = { chasis: 'Gris', buttons: 'Amarillo', knobs: 'Negro' };
let state = {
    currentView: 'normal',
    selectedForColoring: null, // Guardará el objeto ÚNICO seleccionado
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
    mainLight.castShadow = true; // Esta luz proyecta las sombras

    // ================================================================
    // ===== MEJORAS PARA LA CALIDAD Y ESTABILIDAD DE LAS SOMBRAS =====
    // ================================================================

    // 1. Aumentamos la resolución del mapa de sombras a 4K.
    // Esto hace los bordes de la sombra mucho más nítidos.
    mainLight.shadow.mapSize.width = 4096;
    mainLight.shadow.mapSize.height = 4096;

    // 2. Ajustamos la "cámara de la sombra" para que sea más precisa.
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 20; // Reducimos la distancia máxima

    // 3. Añadimos un "normalBias" para eliminar el temblor en las superficies.
    // Este es el ajuste más importante para el problema de "temblor".
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
            child.material = new THREE.MeshStandardMaterial({
                color: PALETTES.unified['Gris'].hex,
                metalness: 0.9,
                roughness: 0.1
            });
            state.selectable.chasis.push(child);
        } 
        else if (meshName.includes('boton')) {
            child.material = new THREE.MeshStandardMaterial({
                color: PALETTES.unified['Negro'].hex,
                metalness: 0.4,
                roughness: 0.2
            });
            state.selectable.buttons.push(child);
        } 
        else if (meshName.includes('knob')) {
             if (child.material && child.material.color) {
                const lightness = (child.material.color.r + child.material.color.g + child.material.color.b) / 3;
                if (lightness < 0.5) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: PALETTES.unified['Rosa'].hex,
                        metalness: 0,
                        roughness: 1,
                    });
                    state.selectable.knobs.push(child);
                } 
                else {
                    child.material = new THREE.MeshStandardMaterial({
                        color: 0xffffff,
                    });
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

    // ========================================================
    // ===== AQUÍ ESTÁ LA LÓGICA DEL BOTÓN 'COMPRAR' ======
    // ========================================================
    document.getElementById('btn-comprar').addEventListener('click', () => {
        // ¡¡RECUERDA CAMBIAR ESTO POR TU EMAIL REAL!!
        const yourEmail = "tu-email@dominio.com"; 
        
        const subject = "Nuevo Pedido de Controlador Personalizado";
        
        // Se buscan los nombres de los colores seleccionados para el email
        const chasisColorName = Object.keys(PALETTES.chasis).find(name => PALETTES.chasis[name].hex === '#' + state.selectable.chasis[0].material.color.getHexString().toLowerCase()) || "No definido";
        const buttonsColorName = Object.keys(PALETTES.buttons).find(name => PALETTES.buttons[name].hex === '#' + state.selectable.buttons[0].material.color.getHexString().toLowerCase()) || "No definido";
        const knobsColorName = Object.keys(PALETTES.knobs).find(name => PALETTES.knobs[name].hex === '#' + state.selectable.knobs[0].material.color.getHexString().toLowerCase()) || "No definido";

        const body = `¡Hola!\n\nMe gustaría realizar un pedido con la siguiente configuración:\n\n- Color de Chasis: ${chasisColorName}\n- Color de Botones: ${buttonsColorName}\n- Color de Knobs: ${knobsColorName}\n\nGracias.`;
        
        const mailtoLink = `mailto:${yourEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
    });
    // ========================================================

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
                // Si el objeto seleccionado es el chasis, actualizamos el nombre del color guardado
                if (state.selectable.chasis.includes(state.selectedForColoring)) {
                    chosenColors.chasis = name;
                }
            } else {
                alert("Primero haz clic en una pieza del controlador o selecciona la vista de 'CHASIS'.");
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
    if (state.currentView === 'normal') return;
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
        // Si se hace clic fuera de una pieza seleccionable, pero estamos en una vista de edición,
        // no deseleccionamos si es el chasis (que está auto-seleccionado).
        if (state.currentView !== 'chasis') {
            state.selectedForColoring = null;
        }
    }
}

// ==========================================================
// ===== FUNCIÓN 'CHANGEVIEW' (CORREGIDA) ===================
// ==========================================================
function changeView(viewName) {
    setEmissive(state.selectedForColoring, 0x000000);
    state.selectedForColoring = null; // Limpia la selección manual anterior
    const uiContainer = document.getElementById('ui-container');
    state.currentView = viewName;
    updateColorPalette();

    if (viewName === 'normal') {
        uiContainer.classList.remove('open');
    } else {
        uiContainer.classList.add('open');
    }
    
    // --- LÓGICA DE SELECCIÓN AUTOMÁTICA PARA EL CHASIS ---
    if (viewName === 'chasis' && state.selectable.chasis.length > 0) {
        // Selecciona automáticamente la primera pieza del chasis
        state.selectedForColoring = state.selectable.chasis[0];
        console.log("Chasis seleccionado automáticamente para colorear.");
    }
    // ----------------------------------------------------
    
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
