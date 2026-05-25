import pandas as pd
import zipfile
import io

GTFS_FILE = "Export_OpenData_SNCF_GTFS_NewTripId.zip"

def tgv_between(stopA, stopB):
    with zipfile.ZipFile(GTFS_FILE, 'r') as z:
        stops = pd.read_csv(io.TextIOWrapper(z.open("stops.txt"), encoding='utf-8'))
        stop_times = pd.read_csv(io.TextIOWrapper(z.open("stop_times.txt"), encoding='utf-8'))
        trips = pd.read_csv(io.TextIOWrapper(z.open("trips.txt"), encoding='utf-8'))
        routes = pd.read_csv(io.TextIOWrapper(z.open("routes.txt"), encoding='utf-8'))

    # IDs des gares
    idsA = set(stops[stops['stop_id'].str.contains(stopA)]['stop_id'])
    idsB = set(stops[stops['stop_id'].str.contains(stopB)]['stop_id'])

    # Filtrer uniquement les TGV
    tgv_routes = set(routes[routes['route_long_name'].str.contains("TGV", case=False)]['route_id'])
    tgv_trips = trips[trips['route_id'].isin(tgv_routes)]

    # Séquences d'arrêts
    seqs = stop_times.sort_values(['trip_id','stop_sequence']).groupby('trip_id')['stop_id'].apply(list)

    results = []

    for trip_id in tgv_trips['trip_id']:
        seq = seqs.get(trip_id, [])
        posA = next((i for i,s in enumerate(seq) if s in idsA), None)
        posB = next((i for i,s in enumerate(seq) if s in idsB), None)

        if posA is not None and posB is not None and posA < posB:
            results.append(trip_id)

    return results

# Exemple : Strasbourg → Mulhouse
res = tgv_between("87212027", "87182063")
print("TGV Strasbourg → Mulhouse trouvés :")
for r in res:
    print("-", r)
