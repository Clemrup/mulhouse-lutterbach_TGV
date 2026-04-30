import json

# Charger le fichier JSON
with open('frequentation-gares.json', 'r', encoding='utf-8') as f:
    gares = json.load(f)

# Chercher la gare de Mulhouse
for gare in gares:
    if 'mulhouse' in gare['nom_gare'].lower():
        print(f"Gare trouvée : {gare['nom_gare']}")
        print(f"Code postal : {gare['code_postal']}")
        print(f"Code UIC : {gare['code_uic_complet']}")
        print(f"Segmentation marketing : {gare['segmentation_marketing']}")
        print("\nFréquentation par année :")
        
        # Extraire les données de fréquentation par année
        for key, value in sorted(gare.items()):
            if 'total_voyageurs_' in key and 'non_voyageurs' not in key:
                annee = key.replace('total_voyageurs_', '').replace('totalvoyageurs', '')
                print(f"  {annee} : {value:,} voyageurs")
