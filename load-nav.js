/**
 * load-nav.js - Injection dynamique de la navigation
 * Charge nav.html et l'injecte dans le placeholder #site-nav-placeholder
 * Gère également le surlignage du lien actif basé sur l'URL courante
 */

async function loadNavigation() {
    try {
        // Récupérer le contenu de nav.html
        const response = await fetch('nav.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const navContent = await response.text();

        // Trouver le placeholder et l'injecter
        const placeholder = document.getElementById('site-nav-placeholder');
        if (!placeholder) {
            console.warn('Placeholder #site-nav-placeholder not found');
            return;
        }

        placeholder.innerHTML = navContent;

        // Activer le lien correspondant à la page actuelle
        setActiveLink();

        // Re-initialiser la résolution Leaflet si elle existe
        if (typeof initializeResolution === 'function') {
            initializeResolution();
        }

    } catch (error) {
        console.error('Erreur lors du chargement de la navigation:', error);
    }
}

/**
 * Définit le lien actif basé sur le nom de fichier courant
 */
function setActiveLink() {
    // Obtenir le nom du fichier actuel (ex: "accueil.html" ou "le-projet.html")
    const currentPage = window.location.pathname.split('/').pop() || 'accueil.html';
    
    // Supprimer l'extension .html pour la comparaison
    const currentPageName = currentPage.replace('.html', '');

    // Récupérer tous les liens nav
    const navLinks = document.querySelectorAll('.nav-link[data-page]');
    
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('data-page');
        
        // Ajouter/retirer la classe active
        if (linkPage === currentPageName) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        } else {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
        }
    });

    // Cas spécial: "📺 Vue complète" pointe vers index.html
    const fullsiteLink = document.querySelector('.nav-link-fullsite');
    if (fullsiteLink && (currentPageName === 'index' || currentPage === 'index.html')) {
        fullsiteLink.classList.add('active');
        fullsiteLink.setAttribute('aria-current', 'page');
    }
}

/**
 * Appeler au chargement du DOM
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNavigation);
} else {
    loadNavigation();
}
