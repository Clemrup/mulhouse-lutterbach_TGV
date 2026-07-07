
const galleryImages = Array.from(document.querySelectorAll('.exploitation-gallery-item img'));
const lightbox = document.getElementById('image-lightbox');
const lightboxImage = document.getElementById('lightbox-image');
const lightboxCaption = document.getElementById('lightbox-caption');
const lightboxStage = document.getElementById('lightbox-stage');
const lightboxClose = document.getElementById('lightbox-close');
const lightboxPrev = document.getElementById('lightbox-prev');
const lightboxNext = document.getElementById('lightbox-next');
const lightboxZoomIn = document.getElementById('lightbox-zoom-in');
const lightboxZoomOut = document.getElementById('lightbox-zoom-out');
const lightboxZoomReset = document.getElementById('lightbox-zoom-reset');

let lightboxIndex = 0;
let lightboxScale = 1;
let lightboxBaseWidth = 0;
let lightboxBaseHeight = 0;

function updateLightboxBaseSize() {
    if (!lightboxImage) {
        return;
    }

    const naturalWidth = lightboxImage.naturalWidth;
    const naturalHeight = lightboxImage.naturalHeight;

    if (!naturalWidth || !naturalHeight) {
        return;
    }

    // Reproduit le comportement visuel initial: image ajustee au viewport de la lightbox.
    // Ne pas utiliser lightboxStage.clientWidth/clientHeight ici, car ces valeurs
    // peuvent devenir tres petites quand le contenu vient d'etre redimensionne.
    const availableWidth = Math.max(1, Math.min(1200, Math.round(window.innerWidth * 0.9)) - 2);
    const availableHeight = Math.max(1, Math.round(window.innerHeight - 140) - 2);
    const fitRatio = Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight, 1);

    lightboxBaseWidth = Math.max(1, Math.round(naturalWidth * fitRatio));
    lightboxBaseHeight = Math.max(1, Math.round(naturalHeight * fitRatio));
}

function updateLightboxZoom() {
    if (!lightboxImage) {
        return;
    }

    if (!lightboxBaseWidth || !lightboxBaseHeight) {
        updateLightboxBaseSize();
    }

    const width = Math.max(1, Math.round(lightboxBaseWidth * lightboxScale));
    const height = Math.max(1, Math.round(lightboxBaseHeight * lightboxScale));

    lightboxImage.style.width = width + 'px';
    lightboxImage.style.height = height + 'px';

    if (lightboxZoomReset) {
        const zoomPercent = Math.round(lightboxScale * 100);
        lightboxZoomReset.textContent = zoomPercent + '%';
        lightboxZoomReset.setAttribute('aria-label', 'Reinitialiser le zoom (' + zoomPercent + '%)');
    }
}

function setLightboxScale(nextScale) {
    lightboxScale = Math.min(5, Math.max(1, nextScale));
    updateLightboxZoom();
}

function updateLightboxContent(index) {
    if (!galleryImages.length || !lightboxImage || !lightboxCaption) {
        return;
    }

    const normalizedIndex = (index + galleryImages.length) % galleryImages.length;
    const image = galleryImages[normalizedIndex];
    const figure = image.closest('figure');
    const captionText = figure?.querySelector('figcaption')?.textContent?.trim() || image.alt || '';

    lightboxIndex = normalizedIndex;
    lightboxBaseWidth = 0;
    lightboxBaseHeight = 0;
    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt || captionText;
    lightboxCaption.textContent = captionText;
    setLightboxScale(1);

    if (lightboxStage) {
        lightboxStage.scrollTop = 0;
        lightboxStage.scrollLeft = 0;
    }
}

function openLightbox(index) {
    if (!lightbox) {
        return;
    }

    updateLightboxContent(index);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
        updateLightboxBaseSize();
        updateLightboxZoom();
    });
}

function closeLightbox() {
    if (!lightbox) {
        return;
    }

    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

if (galleryImages.length && lightbox) {
    galleryImages.forEach((image, index) => {
        image.addEventListener('click', () => {
            openLightbox(index);
        });
    });

    lightboxClose?.addEventListener('click', closeLightbox);
    lightboxPrev?.addEventListener('click', () => updateLightboxContent(lightboxIndex - 1));
    lightboxNext?.addEventListener('click', () => updateLightboxContent(lightboxIndex + 1));

    lightboxImage?.addEventListener('load', () => {
        updateLightboxBaseSize();
        updateLightboxZoom();
    });

    lightboxZoomIn?.addEventListener('click', () => setLightboxScale(lightboxScale + 0.25));
    lightboxZoomOut?.addEventListener('click', () => setLightboxScale(lightboxScale - 0.25));
    lightboxZoomReset?.addEventListener('click', () => setLightboxScale(1));

    lightbox.addEventListener('click', (event) => {
        if (event.target === lightbox) {
            closeLightbox();
        }
    });

    lightboxImage?.addEventListener('click', () => {
        if (lightboxScale > 1) {
            setLightboxScale(1);
        } else {
            setLightboxScale(2);
        }
    });

    lightboxStage?.addEventListener('wheel', (event) => {
        event.preventDefault();
        const delta = event.deltaY > 0 ? -0.2 : 0.2;
        setLightboxScale(lightboxScale + delta);
    }, { passive: false });

    window.addEventListener('keydown', (event) => {
        if (!lightbox.classList.contains('is-open')) {
            return;
        }

        if (event.key === 'Escape') {
            closeLightbox();
            return;
        }

        if (event.key === 'ArrowLeft') {
            updateLightboxContent(lightboxIndex - 1);
            return;
        }

        if (event.key === 'ArrowRight') {
            updateLightboxContent(lightboxIndex + 1);
        }
    });

    window.addEventListener('resize', () => {
        if (!lightbox.classList.contains('is-open')) {
            return;
        }

        updateLightboxBaseSize();
        updateLightboxZoom();
    });
}