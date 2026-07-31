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

export function ResultMap({ results }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialise the map once
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current).setView([64.0, 26.0], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear old markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    if (results.length === 0) return;

    const bounds = L.latLngBounds([]);

    results.forEach((r, i) => {
      const { lat, lng } = r.coordinates;
      const score = Math.round(r.score * 100);

      const marker = L.marker([lat, lng]).addTo(map);
      marker.bindPopup(
        `<strong>${i + 1}. ${r.name}</strong><br/>` +
          `${r.region}<br/>` +
          `Pistemäärä: ${score}/100`,
      );
      bounds.extend([lat, lng]);
    });

    map.fitBounds(bounds, { padding: [40, 40] });

    return () => {
      // Do NOT destroy map on re-render — only on unmount
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
      style={{ height: '400px', width: '100%' }}
      role="region"
      aria-label="Suosituskartta"
    />
  );
}
