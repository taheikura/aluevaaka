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
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// Fix default marker icon paths broken by bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-expect-error -- patching Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

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
    const fitMapToBounds = (bounds: L.LatLngBounds, maxZoom?: number) => {
      const container = containerRef.current;
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) return;
      map.invalidateSize({ animate: false });
      map.fitBounds(bounds, { padding: [40, 40], maxZoom });
    };

    const initialBounds = L.latLngBounds(METROPOLITAN_BOUNDS as L.LatLngExpression[]);
    const resizeObserver = new ResizeObserver(() => {
      if (!mapRef.current) return;
      fitMapToBounds(initialBounds, 11);
    });
    resizeObserver.observe(containerRef.current);
    fitMapToBounds(initialBounds, 11);

    // Clear old markers and score overlays
    map.eachLayer((layer) => {
      if (
        layer instanceof L.Marker ||
        layer instanceof L.CircleMarker ||
        layer instanceof L.Polygon
      )
        map.removeLayer(layer);
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

    validResults.forEach((r, i) => {
      const { lat, lng } = r.coordinates;
      const score = Math.max(0, Math.min(1, r.score));
      const hue = Math.round(score * 120);
      const marker = L.circleMarker([lat, lng], {
        radius: 16,
        color: `hsl(${hue} 75% 35%)`,
        fillColor: `hsl(${hue} 85% 50%)`,
        fillOpacity: 0.45,
        weight: 2,
      }).addTo(map);
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
        cellPolygon.bindPopup(marker.getPopup() ?? '');
      }
      marker.bindPopup(
        `<strong>${i + 1}. ${r.name}</strong><br/>` +
          `${r.region}<br/>` +
          `Sopivuus: ${Math.round(score * 100)}/100<br/>` +
          `Terveydenhuolto: ${r.categoryScores.healthcareAccess === undefined ? 'ei dataa' : `${Math.round(r.categoryScores.healthcareAccess * 100)}/100`}<br/>` +
          `Liikenne: ${r.categoryScores.transportConnectivity === undefined ? 'ei dataa' : `${Math.round(r.categoryScores.transportConnectivity * 100)}/100`}`,
      );
      bounds.extend([lat, lng]);
    });

    const resultBounds = bounds.extend(METROPOLITAN_BOUNDS);
    fitMapToBounds(resultBounds, 11);

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
