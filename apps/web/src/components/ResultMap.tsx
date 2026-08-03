/**
 * Map component using Leaflet.
 *
 * Leaflet requires its CSS to be imported; we do that here.
 * The map is rendered into a plain div — no React wrappers needed.
 *
 * If you want to switch to MapLibre GL later, swap this component;
 * the interface stays the same.
 */

import L from 'leaflet';
import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { RecommendationResult } from '@aluevaaka/schemas';

interface Props {
  results: RecommendationResult[];
}

const METROPOLITAN_BOUNDS: L.LatLngBoundsExpression = [
  [60.05, 24.45],
  [60.42, 25.35],
];

export function ResultMap({ results }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialise the map once
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        maxBounds: METROPOLITAN_BOUNDS,
        maxBoundsViscosity: 0.8,
        minZoom: 9,
      }).setView([60.2, 24.9], 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;
    const fitMapToBounds = (bounds: L.LatLngBounds) => {
      const container = containerRef.current;
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) return;
      map.invalidateSize({ animate: false });
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
    };

    const initialBounds = L.latLngBounds(METROPOLITAN_BOUNDS as L.LatLngExpression[]);
    const resizeObserver = new ResizeObserver(() => {
      if (!mapRef.current) return;
      const container = containerRef.current;
      if (container && container.clientWidth > 0 && container.clientHeight > 0) {
        map.invalidateSize({ animate: false });
      }
    });
    resizeObserver.observe(containerRef.current);
    requestAnimationFrame(() => {
      if (mapRef.current) {
        map.invalidateSize({ animate: false });
        fitMapToBounds(initialBounds);
      }
    });

    // Clear old markers and score overlays
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker || layer instanceof L.Polygon) map.removeLayer(layer);
    });

    const validResults = results.filter(
      (result) =>
        Number.isFinite(result.coordinates.lat) &&
        Number.isFinite(result.coordinates.lng) &&
        result.coordinates.lat >= -90 &&
        result.coordinates.lat <= 90 &&
        result.coordinates.lng >= -180 &&
        result.coordinates.lng <= 180,
    );

    if (validResults.length === 0) return;

    const bounds = L.latLngBounds([]);

    validResults.forEach((r) => {
      const { lat, lng } = r.coordinates;
      const score = Math.max(0, Math.min(1, r.score));
      const hue = Math.round(score * 120);
      const polygon = r.polygon?.filter(
        ([polygonLat, polygonLng]) =>
          Number.isFinite(polygonLat) &&
          Number.isFinite(polygonLng) &&
          polygonLat >= -90 &&
          polygonLat <= 90 &&
          polygonLng >= -180 &&
          polygonLng <= 180,
      );
      if (polygon && polygon.length >= 3) {
        const cellPolygon = L.polygon(polygon, {
          color: `hsl(${hue} 75% 35%)`,
          fillColor: `hsl(${hue} 85% 50%)`,
          fillOpacity: 0.28,
          weight: 1,
        }).addTo(map);
        cellPolygon.bindPopup(
          `<strong>${escapeHtml(r.name)}</strong><br/>` +
            `${escapeHtml(r.region)}<br/>` +
            `<hr>` +
            `<strong>Värin peruste</strong><br/>` +
            `Sopivuus: ${Math.round(score * 100)}/100<br/>` +
            `Tietojen kattavuus: ${Math.round(r.dataCompleteness * 100)}%<br/>` +
            `Asuminen: ${formatScore(r.categoryScores.housingAffordability)}<br/>` +
            `Terveydenhuolto: ${formatScore(r.categoryScores.healthcareAccess)}<br/>` +
            `Liikenne: ${formatScore(r.categoryScores.transportConnectivity)}<br/>` +
            `Luonto: ${formatScore(r.categoryScores.natureAndRecreation)}<br/>` +
            `Palvelut: ${formatScore(r.categoryScores.services)}`,
        );
      }
      bounds.extend([lat, lng]);
    });

    const resultBounds = bounds.extend(METROPOLITAN_BOUNDS);
    fitMapToBounds(resultBounds);

    return () => {
      // Do NOT destroy map on re-render — only on unmount
      resizeObserver.disconnect();
    };
  }, [results]);

  // Destroy map on component unmount
  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="result-map"
      role="region"
      aria-label="Alueiden sopivuuskartta"
    />
  );
}

function formatScore(score: number | undefined): string {
  return score === undefined ? 'ei dataa' : `${Math.round(score * 100)}/100`;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ??
      character,
  );
}
