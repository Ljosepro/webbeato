// =================================================================================
// VERSIÓN FINAL - CON PALETAS SEPARADAS Y RENDERIZADO MEJORADO
// =================================================================================

// --- SECCIÓN 1: CONFIGURACIÓN Y ESTADO GLOBAL ---
// ===== CORRECCIÓN: Paletas de colores separadas para cada categoría =====
const PALETTES = {
    chasis: { 
        'Rojo Metálico': { hex: '#D00000' }, 'Negro Ónix': { hex: '#1C1C1C' },
        'Plata Pulida': { hex: '#808080' }, 'Azul Eléctrico':{ hex: '#0077FF' },
        'Morado': { hex: '#6A0DAD' }, 'Dorado': { hex: '#FFD700' }
    },
    buttons: { 
        'Negro Clásico': { hex: '#1C1C1C' }, 'Blanco Puro': { hex: '#F5F5F5' },
        'Rojo Fuego': { hex: '#D00000' }, 'Amarillo': { hex: '#FFD700' },
        'Verde': { hex: '#1F7A1F' }, 'Naranja': { hex: '#FF7300' },
        'Rosa': { hex: '#FF007F' }
    },
    knobs: { 
        'Negro Mate': { hex: '#282828' }, 'Gris Oscuro': { hex: '#424242' },
        'Gris Claro': { hex: '#808080' }, 'Blanco': { hex: '#F5F5F5' }
    }
};

const CAMERA_VIEWS = {
    normal: { pos: new THREE.Vector3(2, 1, -0.1), target: new THREE.Vector3(0, -0.5, -0.1) },
    top:     { pos: new THREE.Vector3(1, 2, -0.6), target: new THREE.Vector3(-0.1, -0.8, -0.6) },
};
const MODEL_PATH = './models/BEATO3.glb'; 
const HDRI_PATH = './models/gem_studio_1k.hdr'; // Ruta al archivo de iluminación

let scene, camera, renderer, controls, clock, model;
let chosenColors = { chasis: 'Rojo Metálico', buttons: 'Negro Clásico', knobs: 'Negro Mate' };
let state = {
    currentView: 'normal',
    selectedForColoring: null,
    selectable: { chasis: [], buttons: [], knobs: [] }
};

// --- SECCIÓN 2: INICIALIZACIÓN ---
function init() {
    scene = new THREE.Scene();
    clock = new THREE.Clock();
    const canvas = document.getElementById('webgl');
    
    // ===== CORRECCIÓN: Ajustes de renderizador para calidad profesional =====
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); 
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
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

// ===== SECCIÓN 3: ILUMINACIÓN PROFESIONAL (HDRI) =====
function setupProfessionalLighting() {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    new THREE.RGBELoader()
        .setDataType(THREE.UnsignedByteType)
        .load(HDRI_PATH, (texture) => {
            const envMap = pmremGenerator.fromEquirectangular(texture).texture;
            scene.environment = envMap;
            scene.background = envMap;
            texture.dispose();
            pmremGenerator.dispose();
        }, undefined, (error) => {
            console.error(`No se pudo cargar el archivo HDRI: ${HDRI_PATH}. Usando luces de emergencia.`, error);
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
            scene.add(ambientLight);
        });

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(10, 10, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.bias = -0.0005;
    scene.add(mainLight);
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

// ===== SECCIÓN 4: MATERIALES PBR MEJORADOS =====
function prepareModelParts() {
    state.selectable = { chasis: [], buttons: [], knobs: [] };
    model.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;
        const meshName = child.name.toLowerCase();
        
        if (meshName.includes('cubechasis')) {
            child.material = new THREE.MeshStandardMaterial({
                color: PALETTES.chasis['Rojo Metálico'].hex,
                metalness: 0.9, roughness: 0.35,
            });
            state.selectable.chasis.push(child);
        } 
        else if (meshName.includes('boton')) {
            child.material = new THREE.MeshStandardMaterial({
                color: PALETTES.buttons['Negro Clásico'].hex,
                metalness: 0.1, roughness: 0.2,
            });
            state.selectable.buttons.push(child);
        } 
        else if (meshName.includes('knob')) {
            if (child.material && child.material.color) {
                const lightness = (child.material.color.r + child.material.color.g + child.material.color.b) / 3;
                if (lightness < 0.5) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: PALETTES.knobs['Negro Mate'].hex,
                        metalness: 0.0, roughness: 0.9,
                    });
                    state.selectable.knobs.push(child);
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
    document.getElementById('btn-comprar').addEventListener('click', () => {
        const yourEmail = "tu-email@dominio.com";
        const subject = "Nuevo Pedido de Controlador Personalizado";
        const body = `¡Hola!\n\nMe gustaría realizar un pedido con la siguiente configuración:\n\n- Chasis: ${chosenColors.chasis}\n- Botones: ${chosenColors.buttons}\n- Knobs: ${chosenColors.knobs}\n\nGracias.`;
        const mailtoLink = `mailto:${yourEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
    });
    changeView('normal');
}

// ===== FUNCIÓN DE PALETA DE COLORES ACTUALIZADA =====
function updateColorPalette(category) {
    const paletteContainer = document.getElementById('color-palette');
    if (!paletteContainer) return;
    paletteContainer.innerHTML = '';
    
    const colors = PALETTES[category]; // Usa la paleta específica de la categoría
    if (!colors) return;

    Object.entries(colors).forEach(([name, colorData]) => {
        const swatch = document.createElement('div');
        swatch.classList.add('color-swatch');
        swatch.style.backgroundColor = colorData.hex;
        swatch.title = name;
        if (chosenColors[category] === name) {
            swatch.classList.add('selected');
        }
        swatch.addEventListener('click', () => {
            const currentCategory = state.currentView;
            if (state.selectable[currentCategory] && state.selectable[currentCategory].length > 0) {
                state.selectable[currentCategory].forEach(mesh => {
                    mesh.material.color.set(colorData.hex);
                });
                chosenColors[currentCategory] = name;
                updateColorPalette(currentCategory);
            }
        });
        paletteContainer.appendChild(swatch);
    });
}

// --- El resto del código no tiene cambios ---

function changeView(viewName) {
    const uiContainer = document.getElementById('ui-container');
    state.currentView = viewName;
    updateColorPalette(viewName); // <-- Esto ahora mostrará la paleta correcta
    if (viewName === 'normal') {
        uiContainer.classList.remove('open');
    } else {
        uiContainer.classList.add('open');
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
function onPointerClick(event) {}
function setEmissive(object, color = 0x000000) {}
function startIntroAnimation() {if (!model) return;gsap.to(model.position, { y: `+=${0.05}`, duration: 3, ease: 'sine.inOut', repeat: -1, yoyo: true });}
function centerAndScaleModel(obj) {const box = new THREE.Box3().setFromObject(obj);const size = box.getSize(new THREE.Vector3());const center = box.getCenter(new THREE.Vector3());const maxSize = Math.max(size.x, size.y, size.z);const desiredSize = 1.8;const scale = desiredSize / maxSize;obj.scale.set(scale, scale, scale);obj.position.copy(center).multiplyScalar(-scale);obj.position.y -= (size.y / 2) * scale;}
function onWindowResize() {const canvasContainer = document.getElementById('canvas-container'); if (canvasContainer) {const width = canvasContainer.clientWidth;const height = canvasContainer.clientHeight;camera.aspect = width / height;camera.updateProjectionMatrix();renderer.setSize(width, height);}}
function animate() {requestAnimationFrame(animate);controls.update();renderer.render(scene, camera);}

init();
