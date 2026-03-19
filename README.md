# 🚆 Gare Mulhouse-Lutterbach TGV - Site Web Interactif

Un site web présentant le projet ferroviaire avec une carte interactive.

## 📁 Fichiers inclus

- **index.html** - Page principale avec description du projet et carte
- **style.css** - Feuille de style de l'interface
- **script.js** - Code JavaScript pour la carte interactive
- **LGV.kml** - Tracé de la ligne à grande vitesse
- **tram-train.kml** - Tracé de la ligne tram-train projetée
- **rail_actuel.kml** - Réseau ferroviaire actuel
- **docs/** - Documents de travail non exécutés par le site
- **README.md** - Ce fichier

## 🚀 Comment l'utiliser

### Option 1 : Ouvrir directement (Simple)
1. Double-cliquez sur `index.html` pour l'ouvrir dans votre navigateur
2. Selon le navigateur, les fichiers KML peuvent être bloqués (CORS)
3. Vous pouvez zoomer, vous déplacer, et basculer entre les vues

### Option 2 : Utiliser un serveur local (Recommandé)
Pour éviter les problèmes CORS avec le KML, utilisez un serveur local :

**Avec Python :**
```bash
python -m http.server 8000
```

**Avec Node.js (http-server) :**
```bash
npx http-server
```

Puis ouvrez `http://localhost:8000` dans votre navigateur.

## 🗺️ Fonctionnalités

✅ **Carte interactive** - Zoom et déplacement comme Google Maps  
✅ **Fond satellite** - Vue satellite par défaut (bascule vers plan disponible)  
✅ **Couches KML filtrables** - LGV, Tram-train et Rail actuel activables/désactivables  
✅ **Marqueurs** - Gares principales identifiées (Mulhouse, Lutterbach, Guebwiller)  
✅ **Popups** - Cliquez sur les éléments pour plus d'infos  
✅ **Description complète** - Texte détaillé du projet sur la gauche  
✅ **Responsive** - Adapté aux mobiles/tablettes  

## 🎨 Personnaliser

### Changer les couleurs du tracé
Dans `script.js`, modifiez `defaultStyle` dans `kmlSources` :
```javascript
const kmlSources = [
    {
        key: 'lgv',
        label: 'LGV',
        file: 'LGV.kml',
        defaultStyle: { color: '#f57c00', weight: 4, opacity: 0.95 }
    }
];
```

### Ajouter d'autres marqueurs
Dans `script.js`, ajoutez à l'array `stations` :
```javascript
{
    name: 'Ma station',
    lat: 47.7000,
    lng: 7.2500,
    desc: 'Description'
}
```

### Changer le fond de carte
Remplacez la source du tile layer Esri par :
- **OpenStreetMap** : `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- **Autre provider** : Cherchez "leaflet tile providers"

## 🔧 Technologies utilisées

- **Leaflet.js** - Bibliothèque de cartographie interactive open-source
- **toGeoJSON** - Conversion KML vers GeoJSON côté navigateur
- **OpenStreetMap / Esri** - Fond de carte gratuit
- **CSS responsive** - Design adaptatif
- **JavaScript vanilla** - Sans framework

## 💡 Conseils d'amélioration futur

1. Ajouter des clusters de marqueurs si vous en avez beaucoup
2. Intégrer des photos des gares
3. Ajouter une timeline du projet (phases de construction)
4. Ajouter une légende plus détaillée
5. Héberger sur GitHub Pages (gratuit et simple)
6. Ajouter des calques supplémentaires (zones d'impact, chronologie, etc.)

## 📞 Besoin d'aide ?

- Les fichiers HTML/CSS/JS sont simples à modifier
- Cherchez "Leaflet.js documentation" pour plus d'options de personnalisation
- Le KML charge automatiquement le tracé depuis QGIS

---

**Bonne présentation de votre projet ! 🚂**
