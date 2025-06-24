// =================================================================================
// VERSIÓN FINAL - REDIRECCIÓN A PÁGINA DE PRODUCTO
// =================================================================================

// --- SECCIÓN 1: CONFIGURACIÓN Y ESTADO GLOBAL ---
const PALETTES = {
    unified: { 
        'Verde':   { hex: '#1F7A1F' }, 'Amarillo':{ hex: '#FFD700' }, 'Azul':    { hex: '#0077FF' },
        'Blanco':  { hex: '#F5F5F5' }, 'Naranja': { hex: '#FF7300' }, 'Morado':  { hex: '#6A0DAD' },
        'Rojo':    { hex: '#D00000' }, 'Negro':   { hex: '#060606' }, 'Rosa':    { hex: '#FF007F' },
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
    type: 'configData', // Un tipo de mensaje claro
    chasis: 'Gris', 
    buttons: {}, 
    knobs: {}    
};
let state = { currentView: 'normal', selectedForColoring: null, selectable: { chasis: [], buttons: [], knobs: [] } };

// --- FUNCIÓN PARA ENVIAR ACTUALIZACIONES ---
function sendConfigToWix() {
    window.parent.postMessage(chosenColors, "*");
}

// --- SECCIÓN 2 y 3 no cambian (init, setupProfessionalLighting, loadModel) ---
// ... (El resto de tu código de inicialización y 3D va aquí sin cambios) ...

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
        } else if (meshName.includes('boton')) {
            const defaultColor = 'Negro';
            child.material = new THREE.MeshStandardMaterial({ color: PALETTES.unified[defaultColor].hex, metalness: 0.4, roughness: 0.2 });
            state.selectable.buttons.push(child);
            chosenColors.buttons[child.name] = defaultColor;
        } else if (meshName.includes('knob')) {
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

    // Este botón ahora solo envía la configuración final
    document.getElementById('btn-comprar').addEventListener('click', () => {
        sendConfigToWix();
    });

    changeView('normal');
}

function updateColorPalette() {
    const paletteContainer = document.getElementById('color-palette');
    if (!paletteContainer) return;
    paletteContainer.innerHTML = '';
    const colors = PALETTES.unified;
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

// --- SECCIONES 6 y 7 no cambian (onPointerClick, changeView, etc.) ---
// ... (El resto de tu código de lógica de vistas y animación va aquí sin cambios) ...

// Al final, asegúrate de llamar a init()
init();
