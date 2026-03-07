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
let geojsonLayer = null;
const colorCache = new Map();  // Cache pour les couleurs KML converties

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

// Charger le KML en utilisant fetch et togeojson
function loadKML() {
    // Configurer un timeout de 5 secondes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    fetch('Croquis.kml', { signal: controller.signal })
        .then(response => {
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error('Erreur ' + response.status + ': ' + response.statusText);
            }
            return response.text();
        })
        .then(kmlText => {
            console.log('KML chargé, conversion en cours...');
            
            // Convertir KML en GeoJSON
            const parser = new DOMParser();
            const kmlDom = parser.parseFromString(kmlText, 'text/xml');
            
            // Vérifier s'il y a une erreur de parsing (parsererror pour Firefox/Chrome)
            if (kmlDom.documentElement.nodeName === 'parsererror') {
                throw new Error('Erreur de parsing XML');
            }
            
            console.log('XML parsé correctement');
            
            const geojson = toGeoJSON.kml(kmlDom);
            console.log('GeoJSON créé avec', geojson.features.length, 'features');
            
            // FILTRER : garder seulement les LineStrings et Polygons (pas les Points)
            const filteredFeatures = geojson.features.filter(feature => 
                feature.geometry.type === 'LineString' || feature.geometry.type === 'Polygon'
            );
            console.log('Features filtrées (sans Points):', filteredFeatures.length);
            
            const filteredGeoJSON = {
                type: 'FeatureCollection',
                features: filteredFeatures
            };
            
            if (!filteredGeoJSON.features || filteredGeoJSON.features.length === 0) {
                throw new Error('Aucun tracé trouvé dans le KML');
            }

            // Extraire les styles des Placemarks du KML original (LineStyle ET PolyStyle)
            const placemarks = kmlDom.querySelectorAll('Placemark');
            const styleMap = new Map();
            
            placemarks.forEach((placemark, index) => {
                const styleObj = {};
                
                // Extraire LineStyle
                const lineStyle = placemark.querySelector('LineStyle');
                if (lineStyle) {
                    const colorEl = lineStyle.querySelector('color');
                    const widthEl = lineStyle.querySelector('width');
                    
                    const colorData = colorEl ? convertKMLColor(colorEl.textContent) : { color: '#502a00', opacity: 1 };
                    styleObj.lineStyle = {
                        color: colorData.color,
                        weight: widthEl ? parseInt(widthEl.textContent) : 3,
                        opacity: 1
                    };
                }
                
                // Extraire PolyStyle (remplissage des polygones)
                const polyStyle = placemark.querySelector('PolyStyle');
                if (polyStyle) {
                    const colorEl = polyStyle.querySelector('color');
                    
                    const colorData = colorEl ? convertKMLColor(colorEl.textContent) : { color: '#502a00', opacity: 0.5 };
                    styleObj.polyStyle = {
                        color: colorData.color,
                        fillColor: colorData.color,
                        weight: 1,
                        opacity: 1,
                        fillOpacity: colorData.opacity
                    };
                }
                
                if (Object.keys(styleObj).length > 0) {
                    styleMap.set(index, styleObj);
                }
            });

            // ✅ OPTIMISATION : Créer un cache d'index AVANT le geoJSON
            // Ceci remplace la boucle O(n*m) par un O(1) lookup
            const featureStyleMap = new Map();
            let featureIndex = 0;
            
            placemarks.forEach((placemark, pmIndex) => {
                const geometry = placemark.querySelector('LineString, Polygon');
                
                if (geometry) {
                    if (styleMap.has(pmIndex)) {
                        featureStyleMap.set(featureIndex, styleMap.get(pmIndex));
                    }
                    featureIndex++;
                }
            });

            // Ajouter les features du KML FILTRÉES avec Leaflet GeoJSON
            let currentFeatureIndex = 0;
            
            geojsonLayer = L.geoJSON(filteredGeoJSON, {
                style: function(feature) {
                    // ✅ OPTIMISATION : Lookup O(1) au lieu de boucle O(n)
                    const styleData = featureStyleMap.get(currentFeatureIndex);
                    currentFeatureIndex++;
                    
                    if (styleData) {
                        // Utiliser le bon style selon le type de géométrie
                        if (feature.geometry.type === 'Polygon' && styleData.polyStyle) {
                            console.log('Feature', currentFeatureIndex - 1, '-> PolyStyle:', styleData.polyStyle);
                            return styleData.polyStyle;
                        } else if (feature.geometry.type === 'LineString' && styleData.lineStyle) {
                            console.log('Feature', currentFeatureIndex - 1, '-> LineStyle:', styleData.lineStyle);
                            return styleData.lineStyle;
                        }
                    }
                    
                    // Style par défaut
                    if (feature.geometry.type === 'Polygon') {
                        return {
                            color: '#502a00',
                            fillColor: '#502a00',
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.5
                        };
                    } else {
                        return {
                            color: '#502a00',
                            weight: 3,
                            opacity: 1
                        };
                    }
                },
                onEachFeature: function(feature, layer) {
                    // Pas de popup ni d'interaction
                }
            }).addTo(map);

            // Centrer la carte sur le KML
            const bounds = geojsonLayer.getBounds();
            map.fitBounds(bounds.pad(0.1));
            
            console.log('✅ KML chargé avec succès !');
        })
        .catch(error => {
            clearTimeout(timeoutId);
            console.error('❌ Erreur lors du chargement du KML:', error);
            
            // Afficher un message d'erreur sur la carte
            const mapInfo = document.querySelector('.map-info');
            if (mapInfo) {
                mapInfo.innerHTML = `<strong style="color: #d32f2f;">⚠️ Erreur KML</strong><br>` + error.message + `<br><br>Assurez-vous que:<br>• Croquis.kml est dans le dossier<br>• Vous utilisez un serveur local`;
            }
        });
}

// Charger le KML au démarrage
loadKML();

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
