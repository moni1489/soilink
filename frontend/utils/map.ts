
import { SoilZone } from '../types';

export const zoneColorMap: Record<string, string> = {
  green: '#22c55e',
  yellow: '#facc15',
  red: '#ef4444'
};

export const getZoneCircleProps = (zone: SoilZone) => ({
  fillColor: zone.color === 'green' ? 'rgba(34,197,94,0.3)' : zone.color === 'yellow' ? 'rgba(250,202,21,0.3)' : 'rgba(239,68,68,0.35)',
  strokeColor: zone.color === 'green' ? '#16a34a' : zone.color === 'yellow' ? '#ca8a04' : '#b91c1c'
});
