#!/usr/bin/env python3
"""Affiche les départs TGV au départ de Mulhouse pour une date donnée.

Par défaut, le script utilise la date du jour locale. Il lit l'archive GTFS
du dépôt, filtre les services actifs, repère les circulations TGV au départ
de Mulhouse et affiche un tableau avec l'heure de départ et la destination
finale avec son heure d'arrivée.
"""

from __future__ import annotations

import argparse
import csv
import io
import re
import zipfile
from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from pathlib import Path


ARCHIVE_PATH = Path(__file__).with_name("Export_OpenData_SNCF_GTFS_NewTripId.zip")
MULHOUSE_CODE = "87182063"
ALLOWED_SERVICE_PREFIXES = ("TGV INOUI", "Lyria", "OUIGO", "ICE")


@dataclass(frozen=True)
class DepartureRow:
    departure_time: str
    train_number: str
    destination: str
    arrival_time: str
    trip_id: str


def read_csv_from_zip(zf: zipfile.ZipFile, filename: str) -> list[dict[str, str]]:
    with zf.open(filename) as handle:
        return list(csv.DictReader(io.TextIOWrapper(handle, encoding="utf-8")))


def parse_date(value: str) -> date:
    return date.fromisoformat(value)


def today_token(run_date: date) -> str:
    return run_date.strftime("%Y%m%d")


def load_gtfs(archive_path: Path):
    with zipfile.ZipFile(archive_path, "r") as zf:
        stops = read_csv_from_zip(zf, "stops.txt")
        trips = read_csv_from_zip(zf, "trips.txt")
        stop_times = read_csv_from_zip(zf, "stop_times.txt")
        calendar_dates = read_csv_from_zip(zf, "calendar_dates.txt")
        try:
            routes = read_csv_from_zip(zf, "routes.txt")
        except KeyError:
            routes = []

    return stops, trips, stop_times, calendar_dates, routes


def active_service_ids(calendar_dates: list[dict[str, str]], run_date: date) -> set[str]:
    token = today_token(run_date)
    return {row["service_id"] for row in calendar_dates if row.get("date") == token and row.get("exception_type") == "1"}


def build_route_labels(routes: list[dict[str, str]]) -> dict[str, str]:
    labels: dict[str, str] = {}
    for row in routes:
        label = row.get("route_short_name", "").strip() or row.get("route_long_name", "").strip() or row.get("route_id", "").strip()
        labels[row["route_id"]] = label
    return labels


def build_stop_names(stops: list[dict[str, str]]) -> dict[str, str]:
    return {row["stop_id"]: row.get("stop_name", "").strip() for row in stops}


def extract_train_number(trip: dict[str, str], route_label: str) -> str:
    candidates = [
        trip.get("trip_headsign", ""),
        trip.get("trip_short_name", ""),
        trip.get("trip_id", ""),
        route_label,
    ]

    patterns = [
        r"\b(?:n°|nº|no|num(?:éro)?)\s*([0-9]{2,5})\b",
        r"\b([0-9]{2,5})\b",
    ]

    for value in candidates:
        text = (value or "").strip()
        if not text:
            continue
        for pattern in patterns:
            match = re.search(pattern, text, flags=re.IGNORECASE)
            if match:
                return match.group(1)

    if route_label:
        return route_label

    return "non fourni"


def is_tgv_service(stop_id: str) -> bool:
    return stop_id.startswith(("StopPoint:OCETGV INOUI-", "StopPoint:OCELyria-", "StopPoint:OCEOUIGO-", "StopPoint:OCEICE-")) and MULHOUSE_CODE in stop_id


def collect_departures(
    trips: list[dict[str, str]],
    stop_times: list[dict[str, str]],
    active_services: set[str],
    route_labels: dict[str, str],
    stop_names: dict[str, str],
) -> list[DepartureRow]:
    sequences_by_trip: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in sorted(stop_times, key=lambda item: (item["trip_id"], int(item["stop_sequence"]))):
        sequences_by_trip[row["trip_id"]].append(row)

    departures: list[DepartureRow] = []

    for trip in trips:
        if trip.get("service_id") not in active_services:
            continue

        seq = sequences_by_trip.get(trip["trip_id"], [])
        if not seq:
            continue

        departure_index = next((index for index, row in enumerate(seq) if is_tgv_service(row["stop_id"])), None)
        if departure_index is None:
            continue

        departure_row = seq[departure_index]
        destination_row = seq[-1]
        route_label = route_labels.get(trip.get("route_id", ""), "")
        train_number = extract_train_number(trip, route_label)

        departures.append(
            DepartureRow(
                departure_time=departure_row.get("departure_time", "") or departure_row.get("arrival_time", "") or "?",
                train_number=train_number,
                destination=stop_names.get(destination_row["stop_id"], destination_row["stop_id"]),
                arrival_time=destination_row.get("arrival_time", "") or destination_row.get("departure_time", "") or "?",
                trip_id=trip["trip_id"],
            )
        )

    departures.sort(key=lambda row: (row.departure_time, row.train_number, row.destination, row.trip_id))
    return departures


def print_table(rows: list[DepartureRow], run_date: date) -> None:
    print(f"\nDéparts TGV au départ de Mulhouse - {run_date.isoformat()}")
    print("=" * 68)

    if not rows:
        print("Aucun départ TGV trouvé pour cette date.")
        return

    headers = ("Départ", "N° train", "Destination", "Arrivée")
    widths = [8, 14, 34, 8]
    print(f"{headers[0]:<{widths[0]}}  {headers[1]:<{widths[1]}}  {headers[2]:<{widths[2]}}  {headers[3]:<{widths[3]}}")
    print(f"{'-' * widths[0]}  {'-' * widths[1]}  {'-' * widths[2]}  {'-' * widths[3]}")

    for row in rows:
        print(f"{row.departure_time:<8}  {row.train_number:<14}  {row.destination:<34}  {row.arrival_time:<8}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Liste les départs TGV depuis Mulhouse pour une date donnée.")
    parser.add_argument("--date", default=date.today().isoformat(), help="Date au format YYYY-MM-DD (défaut: aujourd'hui)")
    parser.add_argument("--archive", default=str(ARCHIVE_PATH), help="Chemin vers l'archive GTFS")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    run_date = parse_date(args.date)
    archive_path = Path(args.archive)

    if not archive_path.exists():
        raise SystemExit(f"Archive GTFS introuvable: {archive_path}")

    stops, trips, stop_times, calendar_dates, routes = load_gtfs(archive_path)
    services = active_service_ids(calendar_dates, run_date)

    if not services:
        raise SystemExit(f"Aucun service actif trouvé pour {run_date.isoformat()}")

    route_labels = build_route_labels(routes)
    stop_names = build_stop_names(stops)
    departures = collect_departures(trips, stop_times, services, route_labels, stop_names)

    print(f"Archive: {archive_path}")
    print(f"Services actifs: {len(services)}")
    print_table(departures, run_date)


if __name__ == "__main__":
    main()