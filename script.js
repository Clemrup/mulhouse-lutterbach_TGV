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
            const opacity = this.value / 100;
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

// Ajouter le fond sombre par défaut
darkLayer.addTo(map);
darkLayer.setOpacity(0.5);

// Créer un Pane pour les marqueurs (au-dessus du KML)
map.createPane('markerPane').style.zIndex = 650;

// Variables globales
const kmlLayers = new Map();
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
                kmlLayers.set(source.key, layer);
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
        lat: 47.91364668529852,
        lng: 7.20931428843324,
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

console.log('Script chargé - En attente du KML...');
