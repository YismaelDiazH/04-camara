
const openCameraBtn = document.getElementById('openCameraBtn');
const cameraContainer = document.getElementById('cameraContainer');
const video = document.getElementById('video');
const takePhotoBtn = document.getElementById('takePhotoBtn');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const photoDisplay = document.getElementById('photoDisplay');
const retakePhotoBtn = document.getElementById('retakePhotoBtn');
const photoGalleryContainer = document.getElementById('photoGalleryContainer');
const photoGallery = document.getElementById('photoGallery');
const flipCameraBtn = document.getElementById('flipCameraBtn'); // Nuevo botón

let stream = null;
let currentFacingMode = 'environment'; // 'environment' (trasera), 'user' (frontal)
const DYNAMIC_CACHE_NAME = 'camara-dynamic-v1';

// --- Funciones Principales ---

/**
 * Carga las fotos guardadas desde el caché dinámico y las muestra en la galería.
 */
async function loadPhotosFromCache() {
    try {
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        const requests = await cache.keys();
        
        if (requests.length > 0) {
            photoGalleryContainer.style.display = 'block';
        }

        const photoPromises = requests.map(async (request) => {
            if (request.url.includes('photo-')) {
                const response = await cache.match(request);
                const blob = await response.blob();
                const objectURL = URL.createObjectURL(blob);
                addPhotoToGallery(objectURL);
            }
        });
        
        await Promise.all(photoPromises);
        console.log(`${requests.length} fotos cargadas desde el caché.`);

    } catch (error) {
        console.error('Error al cargar fotos desde el caché:', error);
    }
}

/**
 * Agrega una imagen (como URL de objeto o Data URL) a la galería del DOM.
 * @param {string} imageURL - La URL de la imagen a mostrar.
 */
function addPhotoToGallery(imageURL) {
    const img = document.createElement('img');
    img.src = imageURL;
    img.alt = "Foto de la galería";
    photoGallery.appendChild(img);
    photoGalleryContainer.style.display = 'block';
}

/**
 * Guarda una foto (como Data URL) en el caché dinámico.
 * @param {string} imageDataURL - La imagen en formato Data URL (Base64).
 */
async function savePhotoToCache(imageDataURL) {
    if (!('caches' in window)) return;
    
    const key = `photo-${Date.now()}.png`;
    
    try {
        const response = await fetch(imageDataURL); 
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        await cache.put(key, response);
        console.log(`Foto guardada en caché como: ${key}`);
    } catch (error) {
        console.error('Error al guardar la foto en caché:', error);
    }
}

/**
 * Detiene el stream de video actual.
 */
function closeCameraStream() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        console.log('Stream de cámara cerrado');
    }
}

/**
 * Prepara la UI y solicita el stream de la cámara.
 */
async function openCamera() {
    // 1. Detener cualquier stream anterior (clave para rotar la cámara)
    closeCameraStream();

    // 2. Reiniciar UI al estado "cámara activa"
    cameraContainer.style.display = 'block';
    openCameraBtn.style.display = 'none';
    retakePhotoBtn.style.display = 'none';
    photoDisplay.style.display = 'none';
    video.style.display = 'block';
    takePhotoBtn.style.display = 'flex';
    flipCameraBtn.style.display = 'flex'; // Mostrar botón de rotar

    try {
        // 3. Definición de Restricciones (usando la variable global)
        const constraints = {
            video: {
                facingMode: { ideal: currentFacingMode },
                // Eliminamos width/height fijos para obtener la mejor resolución
            }
        };

        // 4. Obtener y asignar el Stream
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        
        // 5. SOLUCIÓN A LA DISTORSIÓN:
        // Esperar a que el video tenga metadatos para leer su tamaño real
        video.onloadedmetadata = () => {
            // Obtener el tamaño real del video
            const track = stream.getVideoTracks()[0];
            const settings = track.getSettings();

            console.log(`Dimensiones reales del stream: ${settings.width}x${settings.height}`);

            // Asignar el tamaño real al canvas (esto evita la distorsión)
            canvas.width = settings.width;
            canvas.height = settings.height;
        };
        
        console.log('Cámara abierta exitosamente');

    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        alert('No se pudo acceder a la cámara. Asegúrate de dar permisos.');
        cameraContainer.style.display = 'none';
        openCameraBtn.style.display = 'block';
    }
}

/**
 * Captura el frame actual, lo guarda y actualiza la UI al estado "foto tomada".
 */
async function takePhoto() {
    if (!stream) {
        alert('No hay stream de cámara activo.');
        return;
    }

    // 1. Dibujar el Frame en el Canvas (usando el tamaño dinámico)
    console.log(`Dibujando en canvas de ${canvas.width}x${canvas.height}`);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // 2. Conversión a Data URL
    const imageDataURL = canvas.toDataURL('image/png');
    
    // 3. Detener el stream de la cámara
    closeCameraStream();
    
    // 4. Actualizar la UI al estado "foto tomada"
    video.style.display = 'none';
    takePhotoBtn.style.display = 'none';
    flipCameraBtn.style.display = 'none'; // Ocultar botón de rotar
    photoDisplay.src = imageDataURL;
    photoDisplay.style.display = 'block';
    retakePhotoBtn.style.display = 'block';
    
    // 5. Guardar en caché y agregar a la galería
    try {
        await savePhotoToCache(imageDataURL);
        addPhotoToGallery(imageDataURL);
    } catch (error) {
        console.error('Fallo al guardar o mostrar la foto en galería:', error);
    }
}

/**
 * Rota la cámara (frontal/trasera) y reinicia el stream.
 */
function flipCamera() {
    currentFacingMode = (currentFacingMode === 'environment') ? 'user' : 'environment';
    console.log(`Cambiando a cámara: ${currentFacingMode}`);
    openCamera(); // Volver a abrir la cámara con la nueva configuración
}


// --- Event Listeners ---

openCameraBtn.addEventListener('click', openCamera);
takePhotoBtn.addEventListener('click', takePhoto);
retakePhotoBtn.addEventListener('click', openCamera);
flipCameraBtn.addEventListener('click', flipCamera); // Nuevo listener

window.addEventListener('load', () => {
    loadPhotosFromCache();
});

window.addEventListener('beforeunload', () => {
    closeCameraStream();
});