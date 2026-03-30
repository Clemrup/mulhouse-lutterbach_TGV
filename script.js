// Initialisation de la carte
const map = L.map('map').setView([47.77, 7.26], 12);

// Couche fond de carte - OpenStreetMap (par défaut)
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19
});

// Couche fond de carte - Satellite Esri
const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri',
    maxZoom: 18
});

// Couche fond de carte - Fond dark (gris foncé)
const darkLayer = L.tileLayer('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iIzMzMzMzMyIvPjwvc3ZnPg==', {
    attribution: 'Fond dark',
    maxZoom: 20
});

// Ajouter la couche satellite par défaut
satellite.addTo(map);

function applyBaseLayerZoomLimits(baseLayer) {
    const maxZoom = baseLayer?.options?.maxZoom ?? 18;
    map.setMaxZoom(maxZoom);

    if (map.getZoom() > maxZoom) {
        map.setZoom(maxZoom);
    }
}

// Appliquer la limite correspondant au fond initial
applyBaseLayerZoomLimits(satellite);

// Contrôle des couches personnalisé avec opacité
const baseLayers = {
    'Satellite': satellite,
    'Plan': osm
};

// Créer un contrôle personnalisé qui combine les couches et l'opacité
L.Control.LayersWithOpacity = L.Control.Layers.extend({
    onAdd: function(map) {
        // Appeler le onAdd de la classe mère
        const container = L.Control.Layers.prototype.onAdd.call(this, map);
        
        // Ajouter un séparateur
        const divider = L.DomUtil.create('div', 'layers-divider');
        container.appendChild(divider);
        
        // Ajouter la section opacité
        const opacitySection = L.DomUtil.create('div', 'opacity-section');
        opacitySection.id = 'opacity-section';
        
        const label = L.DomUtil.create('label');
        label.textContent = 'Opacité du fond';
        opacitySection.appendChild(label);
        
        const slider = L.DomUtil.create('input');
        slider.type = 'range';
        slider.id = 'opacity-slider';
        slider.min = '0';
        slider.max = '100';
        slider.value = '50';
        
        slider.addEventListener('input', function() {
            const opacity = 1 - (this.value / 100);
            darkLayer.setOpacity(opacity);
        });
        
        opacitySection.appendChild(slider);
        container.appendChild(opacitySection);
        
        // ✅ OPTIMISATION : Utiliser un MutationObserver avec nettoyage automatique
        this._opacityObserver = new MutationObserver(() => {
            const isExpanded = container.classList.contains('leaflet-control-layers-expanded');
            const opacityDiv = document.getElementById('opacity-section');
            
            if (opacityDiv) {
                if (isExpanded) {
                    opacityDiv.classList.remove('hidden');
                } else {
                    opacityDiv.classList.add('hidden');
                }
            }
        });
        
        this._opacityObserver.observe(container, { attributes: true, attributeFilter: ['class'] });
        
        return container;
    },
    
    onRemove: function(map) {
        // ✅ OPTIMISATION : Arrêter proprement l'observateur pour éviter les fuites mémoire
        if (this._opacityObserver) {
            this._opacityObserver.disconnect();
            this._opacityObserver = null;
        }
        L.Control.Layers.prototype.onRemove.call(this, map);
    }
});

// Créer le contrôle personnalisé
const layerControl = new L.Control.LayersWithOpacity(baseLayers);
layerControl.addTo(map);

const mobileMapToggle = document.querySelector('.mobile-map-toggle');
const mobileViewport = window.matchMedia('(max-width: 768px)');
const desktopViewport = window.matchMedia('(min-width: 769px)');
const container = document.querySelector('.container');
const desktopResizer = document.querySelector('.desktop-resizer');
const sidebar = document.querySelector('.sidebar');
const mapInfo = document.querySelector('.map-info');
const quickNav = document.querySelector('.quick-nav');
const quickNavLinks = document.querySelector('.quick-nav-links');

function updateQuickNavHeight() {
    if (!quickNav || !quickNavLinks) {
        return;
    }

    // Mesure la hauteur réelle des liens pour éviter qu'un lien soit coupé.
    const measuredHeight = quickNavLinks.scrollHeight + 4;
    quickNav.style.setProperty('--quick-nav-open-height', measuredHeight + 'px');
}

updateQuickNavHeight();
window.addEventListener('resize', updateQuickNavHeight);

function setMapInfoVisible(isVisible) {
    if (!mapInfo) {
        return;
    }

    mapInfo.classList.toggle('is-hidden', !isVisible);
}

if (mapInfo) {
    // Masquer l'aide dès que l'utilisateur manipule la carte.
    map.on('mousedown wheel touchstart dragstart zoomstart movestart', () => {
        setMapInfoVisible(false);
    });

    // Réafficher l'aide dès interaction avec la colonne de texte.
    if (sidebar) {
        ['pointerdown', 'wheel', 'touchstart', 'scroll', 'keydown'].forEach((eventName) => {
            sidebar.addEventListener(eventName, () => {
                setMapInfoVisible(true);
            }, { passive: true });
        });
    }
}

function updateMobileMapToggleLabel() {
    if (!mobileMapToggle) {
        return;
    }

    const isExpanded = document.body.classList.contains('map-expanded');
    mobileMapToggle.setAttribute('aria-expanded', String(isExpanded));
    mobileMapToggle.textContent = isExpanded ? 'Masquer la carte' : 'Afficher la carte';
}

function setMobileMapExpanded(isExpanded) {
    if (!mobileViewport.matches) {
        document.body.classList.remove('map-expanded');
        updateMobileMapToggleLabel();
        return;
    }

    document.body.classList.toggle('map-expanded', isExpanded);
    updateMobileMapToggleLabel();

    if (isExpanded) {
        // Leaflet doit recalculer la taille après l'animation du panneau mobile.
        setTimeout(() => map.invalidateSize(), 260);
    }
}

if (mobileMapToggle) {
    updateMobileMapToggleLabel();

    mobileMapToggle.addEventListener('click', () => {
        const willExpand = !document.body.classList.contains('map-expanded');
        setMobileMapExpanded(willExpand);
    });

    mobileViewport.addEventListener('change', () => {
        if (!mobileViewport.matches) {
            document.body.classList.remove('map-expanded');
            updateMobileMapToggleLabel();
            map.invalidateSize();
            return;
        }

        updateMobileMapToggleLabel();
        map.invalidateSize();
    });
}

let isDesktopResizing = false;

function setSidebarWidthFromPointer(clientX) {
    if (!container || !desktopViewport.matches) {
        return;
    }

    const rect = container.getBoundingClientRect();
    const minSidebarWidth = 360;
    const minMapWidth = 420;
    const desiredWidth = clientX - rect.left;
    const maxSidebarWidth = Math.max(minSidebarWidth, rect.width - minMapWidth);
    const clampedWidth = Math.min(Math.max(desiredWidth, minSidebarWidth), maxSidebarWidth);
    const widthPercent = (clampedWidth / rect.width) * 100;

    container.style.setProperty('--sidebar-width', widthPercent.toFixed(2) + '%');
    updateQuickNavHeight();
    map.invalidateSize();
}

function stopDesktopResize() {
    isDesktopResizing = false;
    document.body.classList.remove('desktop-resizing');
}

if (desktopResizer) {
    desktopResizer.addEventListener('pointerdown', (event) => {
        if (!desktopViewport.matches) {
            return;
        }

        isDesktopResizing = true;
        document.body.classList.add('desktop-resizing');
        desktopResizer.setPointerCapture(event.pointerId);
        setSidebarWidthFromPointer(event.clientX);
    });

    desktopResizer.addEventListener('pointermove', (event) => {
        if (!isDesktopResizing) {
            return;
        }

        setSidebarWidthFromPointer(event.clientX);
    });

    desktopResizer.addEventListener('pointerup', stopDesktopResize);
    desktopResizer.addEventListener('pointercancel', stopDesktopResize);
}

desktopViewport.addEventListener('change', () => {
    if (!desktopViewport.matches) {
        stopDesktopResize();
        return;
    }

    map.invalidateSize();
});

// Ajouter le fond sombre par défaut
darkLayer.addTo(map);
darkLayer.setOpacity(0.5);

// Garder le voile sombre au-dessus du fond choisi (sinon le slider semble ne plus marcher)
map.on('baselayerchange', function(event) {
    applyBaseLayerZoomLimits(event.layer);
    if (map.hasLayer(darkLayer)) {
        darkLayer.bringToFront();
    }
});

// Créer un Pane pour les marqueurs (au-dessus du KML)
map.createPane('markerPane').style.zIndex = 650;

// Variables globales
const colorCache = new Map();  // Cache pour les couleurs KML converties

const kmlSources = [
    {
        key: 'lgv',
        label: 'LGV',
        file: 'LGV.kml',
        defaultStyle: { color: '#f57c00', weight: 4, opacity: 0.95 }
    },
    {
        key: 'tramTrain',
        label: 'Tram-train',
        file: 'tram-train.kml',
        defaultStyle: { color: '#00897b', weight: 3, opacity: 0.95 }
    },
    {
        key: 'railActuel',
        label: 'Rail actuel',
        file: 'rail_actuel.kml',
        defaultStyle: { color: '#5d4037', weight: 2, opacity: 0.9 }
    }
];

// Fonction pour convertir couleur KML (AABBGGRR) en couleur Leaflet (RRGGBB hex + opacity)
function convertKMLColor(kmlColor) {
    if (!kmlColor) return { color: '#502a00', opacity: 0.85 };
    
    // Vérifier le cache
    if (colorCache.has(kmlColor)) {
        return colorCache.get(kmlColor);
    }
    
    let result;
    
    // KML utilise AABBGGRR (Alpha Blue Green Red)
    // HTML utilise RRGGBB (Red Green Blue)
    // Exemple: ff502a00 → ff (alpha=opaque), 50 (blue), 2a (green), 00 (red)
    
    if (kmlColor.length >= 8) {
        // Extraire les composantes
        const alpha = kmlColor.substring(0, 2);       // AA
        const blue = kmlColor.substring(2, 4);        // BB
        const green = kmlColor.substring(4, 6);       // GG
        const red = kmlColor.substring(6, 8);         // RR
        
        // Réarranger en RRGGBB
        const color = '#' + red + green + blue;
        
        // Convertir alpha en opacity (0-255 → 0-1)
        const opacity = parseInt(alpha, 16) / 255;
        
        result = { color: color, opacity: opacity };
    } else if (kmlColor.length >= 6) {
        // Fallback si format incomplet
        result = { color: '#' + kmlColor.substring(kmlColor.length - 6), opacity: 0.85 };
    } else {
        result = { color: '#502a00', opacity: 0.85 };
    }
    
    // Stocker dans le cache
    colorCache.set(kmlColor, result);
    return result;
}

// Charger un fichier KML en utilisant fetch et togeojson
function loadKMLLayer(source) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    return fetch(source.file, { signal: controller.signal })
        .then(response => {
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(source.file + ' - Erreur ' + response.status + ': ' + response.statusText);
            }
            return response.text();
        })
        .then(kmlText => {
            const parser = new DOMParser();
            const kmlDom = parser.parseFromString(kmlText, 'text/xml');

            if (kmlDom.documentElement.nodeName === 'parsererror') {
                throw new Error(source.file + ' - Erreur de parsing XML');
            }

            const geojson = toGeoJSON.kml(kmlDom);

            // Garder seulement les tracés/surfaces (pas les points de repère)
            const filteredFeatures = geojson.features.filter(feature => {
                const geometryType = feature?.geometry?.type;
                return geometryType === 'LineString' ||
                    geometryType === 'MultiLineString' ||
                    geometryType === 'Polygon' ||
                    geometryType === 'MultiPolygon';
            });

            if (!filteredFeatures.length) {
                throw new Error(source.file + ' - Aucun tracé trouvé');
            }

            const filteredGeoJSON = {
                type: 'FeatureCollection',
                features: filteredFeatures
            };

            const placemarks = kmlDom.querySelectorAll('Placemark');
            const styleMap = new Map();

            placemarks.forEach((placemark, index) => {
                const styleObj = {};

                const lineStyle = placemark.querySelector('LineStyle');
                if (lineStyle) {
                    const colorEl = lineStyle.querySelector('color');
                    const widthEl = lineStyle.querySelector('width');
                    const colorData = colorEl ? convertKMLColor(colorEl.textContent) : { color: source.defaultStyle.color, opacity: 1 };

                    styleObj.lineStyle = {
                        color: colorData.color,
                        weight: widthEl ? parseInt(widthEl.textContent, 10) : source.defaultStyle.weight,
                        opacity: source.defaultStyle.opacity
                    };
                }

                const polyStyle = placemark.querySelector('PolyStyle');
                if (polyStyle) {
                    const colorEl = polyStyle.querySelector('color');
                    const colorData = colorEl ? convertKMLColor(colorEl.textContent) : { color: source.defaultStyle.color, opacity: 0.5 };

                    styleObj.polyStyle = {
                        color: colorData.color,
                        fillColor: colorData.color,
                        weight: 1,
                        opacity: source.defaultStyle.opacity,
                        fillOpacity: colorData.opacity
                    };
                }

                if (Object.keys(styleObj).length > 0) {
                    styleMap.set(index, styleObj);
                }
            });

            const featureStyleMap = new Map();
            let featureIndex = 0;

            placemarks.forEach((placemark, pmIndex) => {
                const geometry = placemark.querySelector('LineString, MultiGeometry, Polygon');

                if (geometry) {
                    if (styleMap.has(pmIndex)) {
                        featureStyleMap.set(featureIndex, styleMap.get(pmIndex));
                    }
                    featureIndex++;
                }
            });

            let currentFeatureIndex = 0;

            const layer = L.geoJSON(filteredGeoJSON, {
                style: function(feature) {
                    const styleData = featureStyleMap.get(currentFeatureIndex);
                    currentFeatureIndex++;

                    const isPolygon = feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon';

                    if (styleData) {
                        if (isPolygon && styleData.polyStyle) {
                            return styleData.polyStyle;
                        }
                        if (!isPolygon && styleData.lineStyle) {
                            return styleData.lineStyle;
                        }
                    }

                    if (isPolygon) {
                        return {
                            color: source.defaultStyle.color,
                            fillColor: source.defaultStyle.color,
                            weight: 1,
                            opacity: source.defaultStyle.opacity,
                            fillOpacity: 0.35
                        };
                    }

                    return {
                        color: source.defaultStyle.color,
                        weight: source.defaultStyle.weight,
                        opacity: source.defaultStyle.opacity
                    };
                }
            });

            return { source, layer };
        })
        .catch(error => {
            clearTimeout(timeoutId);
            throw error;
        });
}

function showMapError(message) {
    const mapInfo = document.querySelector('.map-info');
    if (mapInfo) {
        mapInfo.innerHTML = `<strong style="color: #d32f2f;">⚠️ Erreur KML</strong><br>${message}<br><br>Assurez-vous que :<br>• Les fichiers KML sont dans le dossier<br>• Vous utilisez un serveur local`;
    }
}

function updateMapInfo() {
    const mapInfo = document.querySelector('.map-info');
    if (mapInfo) {
        mapInfo.innerHTML = '<strong>Carte interactive</strong>Activez/désactivez LGV, Tram-train et Rail actuel via le filtre en haut à droite.';
    }
}

function loadAllKMLLayers() {
    Promise.allSettled(kmlSources.map(loadKMLLayer))
        .then(results => {
            const loadedLayers = [];
            const errors = [];

            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    loadedLayers.push(result.value);
                } else {
                    errors.push(result.reason.message || String(result.reason));
                }
            });

            if (!loadedLayers.length) {
                throw new Error(errors.length ? errors.join('<br>') : 'Aucune couche KML chargée');
            }

            const groupForBounds = L.featureGroup();

            loadedLayers.forEach(({ source, layer }) => {
                layer.addTo(map);
                groupForBounds.addLayer(layer);
                layerControl.addOverlay(layer, source.label);
            });

            const bounds = groupForBounds.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds.pad(0.1));
            }

            updateMapInfo();

            if (errors.length) {
                console.warn('Certaines couches KML n\'ont pas pu être chargées :', errors);
            }

            console.log('✅ Couches KML chargées :', loadedLayers.map(item => item.source.file));
        })
        .catch(error => {
            console.error('❌ Erreur lors du chargement des KML:', error);
            showMapError(error.message || String(error));
        });
}

// Charger les couches KML au démarrage
loadAllKMLLayers();

// Créer des marqueurs pour les gares avec les coordonnées EXACTES du KML
// Toutes les gares extraites directement du fichier KML de QGIS
const stations = [
    {
        name: 'Mulhouse-Lutterbach TGV',
        lat: 47.76944181370993,
        lng: 7.256109066861087,
        desc: 'Nouvelle gare TGV - Point d\'échange multimodal'
    },
    {
        name: 'Graffenwald',
        lat: 47.78059453717054,
        lng: 7.22565113852967,
        desc: 'Gare existante'
    },
    {
        name: 'Lutterbach Gare',
        lat: 47.75823730050314,
        lng: 7.27699782134006,
        desc: 'Gare existante réhabilitée'
    },
    {
        name: 'Richwiller',
        lat: 47.786986198998505,
        lng: 7.262183182174024,
        desc: 'Gare ancienne réhabilitée'
    },
    {
        name: 'Wittelsheim',
        lat: 47.81674224037286,
        lng: 7.264561393516166,
        desc: 'Gare ancienne réhabilitée'
    },
    {
        name: 'Staffelfelden',
        lat: 47.828073954109385,
        lng: 7.265484717813402,
        desc: 'Gare existante réhabilitée'
    },
    {
        name: 'Bollwiller',
        lat: 47.85785588101561,
        lng: 7.268545951967131,
        desc: 'Gare existante réhabilitée'
    },
    {
        name: 'Soultz Zone-Industrielle',
        lat: 47.8955722255927,
        lng: 7.228014322380694,
        desc: 'Gare nouvelle'
    },
    {
        name: 'Soultz Centre',
        lat: 47.88747174246896,
        lng: 7.234064609565214,
        desc: 'Gare ancienne réhabilitée'
    },
    {
        name: 'Soultz Nouveau Monde',
        lat: 47.87836048879973,
        lng: 7.247774664472354,
        desc: 'Gare nouvelle'
    },
    {
        name: 'Guebwiller - Storck',
        lat: 47.90067951249736,
        lng: 7.224246632152631,
        desc: 'Gare nouvelle'
    },
    {
        name: 'Guebwiller Gare',
        lat: 47.90678948513951,
        lng: 7.2179360052561465,
        desc: 'Gare ancienne réhabilitée'
    },
    {
        name: 'Guebwiller Centre',
        lat: 47.91364668529852,
        lng: 7.20931428843324,
        desc: 'Gare nouvelle'
    },
    {
        name: 'Guebwiller Heissenstein',
        lat: 47.917737510081224,
        lng: 7.203332249402171,
        desc: 'Gare ancienne réhabilitée - terminus ligne Bollwiller-Guebwiller'
    }
];

// Affichage des marqueurs réactivé
stations.forEach(function(station) {
    const marker = L.circleMarker([station.lat, station.lng], {
        radius: 6,
        fillColor: '#d32f2f',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
        pane: 'markerPane'  // Afficher au-dessus du KML
    }).addTo(map);

    marker.bindPopup(`<strong>${station.name}</strong><br>${station.desc}`);
});

// Ajouter un contrôle d'échelle
L.control.scale({
    metric: true,
    imperial: false,
    updateWhenIdle: true
}).addTo(map);

// Créer une légende personnalisée
const legend = L.control({ position: 'bottomright' });

legend.onAdd = function(map) {
    const div = L.DomUtil.create('div', 'map-legend');
    
    const legendHTML = `
        <div class="legend-content">
            <h4>Légende</h4>

            <!-- Tracés de lignes -->
            <p style="margin: 8px 0; font-weight: bold;">Types de tracés</p>
            <div class="legend-item">
                <span class="legend-color" style="background-color: #f00;"></span>
                <span class="legend-label">LGV</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background-color: #d4ff00;"></span>
                <span class="legend-label">Tram-train</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background-color: #002a50;"></span>
                <span class="legend-label">Rail actuel</span>
            </div>

            <!-- Quais -->
            <p style="margin: 8px 0; font-weight: bold;">Types de quais</p>
            <div class="legend-item">
                <span class="legend-rectangle" style="background-color: #006b00; border: 2px solid #002a50; opacity: 0.75;"></span>
                <span class="legend-label">Nouveaux quais</span>
            </div>
            <div class="legend-item">
                <span class="legend-rectangle" style="background-color: #6b6b00; border: 2px solid #002a50; opacity: 0.75;"></span>
                <span class="legend-label">Ancien quais réhabilité</span>
            </div>
            <div class="legend-item">
                <span class="legend-rectangle" style="background-color: #6b0000; border: 2px solid #002a50; opacity: 0.75;"></span>
                <span class="legend-label">Ancien quais toujours inutilisés</span>
            </div>
            <div class="legend-item">
                <span class="legend-rectangle" style="background-color: #00006b; border: 2px solid #002a50; opacity: 0.75;"></span>
                <span class="legend-label">Ancien quais toujours utilisés</span>
            </div>

            <!-- Gares -->
            <p style="margin: 8px 0; font-weight: bold;">Types de gares</p>
            <div class="legend-item">
                <span class="legend-rectangle" style="background-color: #006b00; border: 1px solid #000; opacity: 0.5;"></span>
                <span class="legend-label">Nouvelles gares</span>
            </div>
            <div class="legend-item">
                <span class="legend-rectangle" style="background-color: #6b6b00; border: 1px solid #000; opacity: 0.5;"></span>
                <span class="legend-label">Anciennes gares réhabilit.</span>
            </div>
            <div class="legend-item">
                <span class="legend-rectangle" style="background-color: #00006b; border: 1px solid #000; opacity: 0.5;"></span>
                <span class="legend-label">Anciennes gares toujours utilisées</span>
            </div>

            <!-- Ouvrages -->
            <p style="margin: 8px 0; font-weight: bold;">Types d'ouvrages</p>
            <div class="legend-item">
                <span class="legend-rectangle" style="background-color: #0005; border: 1px solid #000;"></span>
                <span class="legend-label">Ouvrages souterrain</span>
            </div>
            <div class="legend-item">
                <span class="legend-rectangle" style="background-color: #fff5; border: 1px solid #fff;"></span>
                <span class="legend-label">Ouvrages en altitude</span>
            </div>

            <!-- Gares impliquées -->
            <p style="margin: 8px 0; font-weight: bold;">Gares impliquées</p>
            <div class="legend-item">
                <span class="legend-circle"></span>
                <span class="legend-label">Gares impliquées</span>
            </div>
        </div>
    `;
    
    div.innerHTML = legendHTML;
    return div;
};

legend.addTo(map);

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

console.log('Script chargé - En attente du KML...');
