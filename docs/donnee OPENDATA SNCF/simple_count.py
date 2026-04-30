#!/usr/bin/env python3
"""
VRAIMENT simple : compte tous les trains entre deux gares
"""
import zipfile, io, pandas as pd

def count_trains(gare_a_code, gare_b_code, date="2026-04-24"):
    """Compte TOUS les trains entre deux gares pour une date"""
    zf = zipfile.ZipFile("Export_OpenData_SNCF_GTFS_NewTripId.zip")
    
    # Charger
    stops = pd.read_csv(io.TextIOWrapper(zf.open("stops.txt"), encoding='utf-8'))
    stop_times = pd.read_csv(io.TextIOWrapper(zf.open("stop_times.txt"), encoding='utf-8'))
    trips = pd.read_csv(io.TextIOWrapper(zf.open("trips.txt"), encoding='utf-8'))
    calendar_dates = pd.read_csv(io.TextIOWrapper(zf.open("calendar_dates.txt"), encoding='utf-8'))
    
    # Services valides pour cette date
    date_int = int(date.replace("-", ""))
    valid_services = set(calendar_dates[calendar_dates['date'] == date_int]['service_id'])
    trips = trips[trips['service_id'].isin(valid_services)]
    
    # Stops pour les deux gares
    stops_a = set(stops[stops['stop_id'].str.contains(gare_a_code, na=False)]['stop_id'])
    stops_b = set(stops[stops['stop_id'].str.contains(gare_b_code, na=False)]['stop_id'])
    
    # Créer séquences (trip → liste des stops)
    sequences = stop_times.sort_values(['trip_id', 'stop_sequence']).groupby('trip_id')['stop_id'].apply(list).to_dict()
    
    # Compter les trips A→B
    count = 0
    for trip_id in trips['trip_id']:
        seq = sequences.get(trip_id, [])
        pos_a = next((i for i, s in enumerate(seq) if s in stops_a), None)
        pos_b = next((i for i, s in enumerate(seq) if s in stops_b), None)
        if pos_a is not None and pos_b is not None and pos_a < pos_b:
            count += 1
    
    return count


if __name__ == "__main__":
    print("\n" + "="*50)
    print("🚂 Compteur de trains")
    print("="*50 + "\n")
    
    trajets = {
        "Mulhouse-Thann": {
            "Mulhouse → Thann": [
                ("Train TER-87182063", "Train TER-87182568",            "Mulhouse → Thann TER"),
                ("TramTrain-87533620", "TramTrain-87182568",            "Mulhouse → Thann TramTrain")
            ],
            "Thann → Mulhouse": [
                ("Train TER-87182568", "Train TER-87182063",            "Thann → Mulhouse TER"),
                ("TramTrain-87182568", "TramTrain-87533620",            "Thann → Mulhouse TramTrain")
            ]
        },
        #=================================
            #ligne Mulhouse-Colmar
        #=================================
        "Mulhouse-Colmar": {
            "Mulhouse → Colmar": [
                ("Train TER-87182063", "Train TER-87182014",            "Mulhouse → Colmar TER"),
                ("TGV INOUI-87182063", "TGV INOUI-87212027",            "Mulhouse → Strasbourg TGV-INOUI"), 
            ],
            "Colmar → Mulhouse": [
                ("Train TER-87182014", "Train TER-87182063",            "Colmar → Mulhouse TER"),
                ("TGV INOUI-87212027", "TGV INOUI-87182063",            "Strasbourg → Mulhouse TGV-INOUI"),
            ]
        },

        #=================================
            #ligne Mulhouse-Basel
        #=================================
        "Mulhouse-Basel": {
            "Mulhouse → Basel": [
                ("Train TER-87182063", "Train TER-87182139",            "Mulhouse → Saint-Louis TER"),
                ("Lyria-87182063", "Lyria-85000109",                    "Mulhouse → Basel Lyria"),
            ],
            "Basel → Mulhouse": [
                ("Train TER-87182139", "Train TER-87182063",            "Saint-Louis → Mulhouse TER"),
                ("Lyria-85000109", "Lyria-87182063",                    "Basel → Mulhouse Lyria"),
            ]
        },
        #=================================
            #ligne Mulhouse-Belfort
        #=================================
        "Mulhouse-Belfort": {
            "Mulhouse → Belfort": [
                ("Train TER-87182063", "Train TER-87184002",            "Mulhouse → Belfort-Ville TER"),
                ("TGV INOUI-87182063", "TGV INOUI-87300863",            "Mulhouse → Besaçon Franche-Comté TGV TGV-INOUI"),
                ("Lyria-87182063", "Lyria-87686006",                    "Mulhouse → Paris Gare de Lyon Lyria"),
            ],
            "Belfort → Mulhouse": [
                ("Train TER-87184002", "Train TER-87182063",            "Belfort-Ville → Mulhouse TER"),
                ("TGV INOUI-87300863", "TGV INOUI-87182063",            "Besaçon Franche-Comté → Mulhouse TGV-INOUI"),
                ("Lyria-87686006", "Lyria-87182063",                    "Paris Gare de Lyon → Mulhouse Lyria"),
            ]
        },
        #=================================
            #ligne Mulhouse-Muellheim (Baden)
        #=================================
        "Muellheim-Belfort": {
            "Muellheim → Belfort": [
                ("Train TER-87182063", "Train TER-80144139",            "Mulhouse → Muellheim TER")
            ],
            "Muellheim → Mulhouse": [
                ("Train TER-80144139", "Train TER-87182063",            "Muellheim → Mulhouse TER")
            ]
        }
    }

    for ligne, sens_dict in trajets.items():
        print(f"\n📍 Ligne {ligne}")
        print("=" * 70)
        ligne_total = 0
        
        for sens, trajets_list in sens_dict.items():
            print(f"  ↳ {sens}")
            sens_total = 0
            
            for a, b, label in trajets_list:
                count = count_trains(a, b)
                print(f"    {label:<50} : {count:>3} trains")
                sens_total += count
            
            print(f"  {'Sous-total ' + sens:<50} : {sens_total:>3} trains")
            ligne_total += sens_total
        
        print("-" * 70)
        print(f"  {'TOTAL LIGNE ' + ligne:<50} : {ligne_total:>3} trains")
        print()
    
    print("=" * 70)
    print("📊 RÉSUMÉ GÉNÉRAL")
    print("=" * 70)
    
    grand_total = 0
    for ligne, sens_dict in trajets.items():
        ligne_total = 0
        for sens, trajets_list in sens_dict.items():
            for a, b, _ in trajets_list:
                ligne_total += count_trains(a, b)
        print(f"  {ligne:<50} : {ligne_total:>3} trains")
        grand_total += ligne_total
    
    print("=" * 70)
    print(f"  {'TOTAL GÉNÉRAL':<50} : {grand_total:>3} trains")
    print("=" * 70 + "\n")
