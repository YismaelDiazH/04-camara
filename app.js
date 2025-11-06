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

let stream = null;
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

        // Cargar todas las fotos en paralelo
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
    photoGalleryContainer.style.display = 'block'; // Asegurarse de que sea visible
}

/**
 * Guarda una foto (como Data URL) en el caché dinámico.
 * @param {string} imageDataURL - La imagen en formato Data URL (Base64).
 */
async function savePhotoToCache(imageDataURL) {
    if (!('caches' in window)) {
        console.log('El navegador no soporta Caché API.');
        return;
    }
    
    // Usamos un timestamp como clave única
    const key = `photo-${Date.now()}.png`;
    
    try {
        // La API de Fetch puede "consumir" un Data URL
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
    // 1. Reiniciar UI al estado "cámara activa"
    cameraContainer.style.display = 'block';
    openCameraBtn.style.display = 'none';
    retakePhotoBtn.style.display = 'none';
    photoDisplay.style.display = 'none';
    video.style.display = 'block';
    takePhotoBtn.style.display = 'flex';

    try {
        // 2. Definición de Restricciones
        const constraints = {
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 320 },
                height: { ideal: 240 }
            }
        };

        // 3. Obtener y asignar el Stream
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        
        console.log('Cámara abierta exitosamente');

    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        alert('No se pudo acceder a la cámara. Asegúrate de dar permisos.');
        // Revertir UI si falla
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

    // 1. Dibujar el Frame en el Canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // 2. Conversión a Data URL (formato Png)
    const imageDataURL = canvas.toDataURL('image/png');
    
    // 3. Detener el stream de la cámara
    closeCameraStream();
    
    // 4. Actualizar la UI al estado "foto tomada"
    video.style.display = 'none';
    takePhotoBtn.style.display = 'none';
    photoDisplay.src = imageDataURL;
    photoDisplay.style.display = 'block';
    retakePhotoBtn.style.display = 'block';
    
    // 5. Guardar en caché y agregar a la galería
    // Hacemos esto de forma asíncrona (no bloqueamos la UI)
    try {
        await savePhotoToCache(imageDataURL);
        addPhotoToGallery(imageDataURL);
    } catch (error) {
        console.error('Fallo al guardar o mostrar la foto en galería:', error);
    }
}

// --- Event Listeners ---

// Iniciar la cámara
openCameraBtn.addEventListener('click', openCamera);

// Tomar la foto
takePhotoBtn.addEventListener('click', takePhoto);

// Reiniciar para tomar otra foto
retakePhotoBtn.addEventListener('click', openCamera);

// Cargar fotos guardadas al iniciar la app
window.addEventListener('load', () => {
    loadPhotosFromCache();
});

// Limpiar stream si el usuario cierra la página
window.addEventListener('beforeunload', () => {
    closeCameraStream();
});