import { Coordinate, LayerKey, Sensor, SoilZone } from '../types';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const zoneRgbMap: Record<SoilZone['color'], string> = {
  green: '34,197,94',
  yellow: '250,204,21',
  red: '239,68,68'
};

const riskLayerOrder: LayerKey[] = [
  'pH',
  'electricalConductivity',
  'gasComposition'
];

const extractCo2Percent = (gasComposition: string) => {
  const match = gasComposition.match(/CO2\s*([0-9]*\.?[0-9]+)%/i);
  if (!match) return 0.04;
  return Number.parseFloat(match[1]);
};


export const zoneColorHex: Record<SoilZone['color'], string> = {
  green: '#22c55e',
  yellow: '#facc15',
  red: '#ef4444'
};

export const getZoneFillColor = (color: SoilZone['color'], opacity = 0.22) =>
  `rgba(${zoneRgbMap[color]},${opacity})`;

export const getZoneStrokeColor = (color: SoilZone['color'], opacity = 0.9) =>
  `rgba(${zoneRgbMap[color]},${opacity})`;

export const closeRing = (coordinates: Coordinate[]) => {
  if (coordinates.length === 0) return coordinates;

  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  if (first.latitude === last.latitude && first.longitude === last.longitude) return coordinates;

  return [...coordinates, first];
};

export const getSensorHeatIntensity = (sensor: Sensor, activeLayers: LayerKey[] = []) => {
  const moistureRisk = clamp((55 - sensor.soilMoisture) / 55, 0, 1);
  const temperatureRisk = clamp((sensor.soilTemperature - 18) / 12, 0, 1);
  const phRisk = clamp(Math.abs(sensor.pH - 6.7) / 2.2, 0, 1);
  const conductivityRisk = clamp((sensor.electricalConductivity - 1.2) / 1.4, 0, 1);
  const gasRisk = clamp((extractCo2Percent(sensor.gasComposition) - 0.04) / 0.10, 0, 1);

  const riskByLayer: Record<string, number> = {
    soilMoisture: moistureRisk,
    temperature: temperatureRisk,
    pH: phRisk,
    electricalConductivity: conductivityRisk,
    gasComposition: gasRisk
  };

  const pickedLayers = riskLayerOrder.filter((layer) => activeLayers.includes(layer));
  const layersToUse: LayerKey[] = pickedLayers.length > 0 ? (pickedLayers as any[]) : ['soilMoisture'];

  const averageRisk =
    layersToUse.reduce((sum, layer) => sum + (riskByLayer[layer] ?? 0), 0) / layersToUse.length;

  return clamp(averageRisk, 0.03, 1);
};

const distanceKm = (a: Coordinate, b: Coordinate) => {
  const latFactor = 110.57;
  const lngFactor = 111.32 * Math.cos(((a.latitude + b.latitude) / 2) * (Math.PI / 180));

  const dy = (a.latitude - b.latitude) * latFactor;
  const dx = (a.longitude - b.longitude) * lngFactor;

  return Math.sqrt(dx * dx + dy * dy);
};

const toKilometerPoint = (point: Coordinate, referenceLatitude: number) => {
  const x = point.longitude * 111.32 * Math.cos((referenceLatitude * Math.PI) / 180);
  const y = point.latitude * 110.57;

  return { x, y };
};

export const calculatePolygonAreaHectares = (boundary: Coordinate[]) => {
  if (boundary.length < 3) return 0;

  const referenceLatitude =
    boundary.reduce((sum, point) => sum + point.latitude, 0) / boundary.length;
  const kilometerPoints = boundary.map((point) => toKilometerPoint(point, referenceLatitude));

  let twiceArea = 0;

  for (let i = 0; i < kilometerPoints.length; i += 1) {
    const nextIndex = (i + 1) % kilometerPoints.length;
    twiceArea +=
      kilometerPoints[i].x * kilometerPoints[nextIndex].y -
      kilometerPoints[nextIndex].x * kilometerPoints[i].y;
  }

  const areaKm2 = Math.abs(twiceArea) / 2;
  return areaKm2 * 100;
};

const gaussianWeight = (distance: number, sigma: number) => {
  const exponent = -(distance * distance) / (2 * sigma * sigma);
  return Math.exp(exponent);
};

export const pointInPolygon = (point: Coordinate, polygon: Coordinate[]) => {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    const intersects =
      yi > point.latitude !== yj > point.latitude &&
      point.longitude < ((xj - xi) * (point.latitude - yi)) / (yj - yi + Number.EPSILON) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
};

export const getPolygonCentroid = (polygon: Coordinate[]) => {
  if (polygon.length === 0) return { latitude: 0, longitude: 0 };

  const totals = polygon.reduce(
    (accumulator, point) => ({
      latitude: accumulator.latitude + point.latitude,
      longitude: accumulator.longitude + point.longitude
    }),
    { latitude: 0, longitude: 0 }
  );

  return {
    latitude: totals.latitude / polygon.length,
    longitude: totals.longitude / polygon.length
  };
};

export const getZoneHeatIntensity = (
  zone: SoilZone,
  sensors: Sensor[],
  activeLayers: LayerKey[] = []
) => {
  const sensorsInZone = sensors.filter((sensor) => pointInPolygon(sensor.coordinates, zone.polygon));

  const baseSensors =
    sensorsInZone.length > 0
      ? sensorsInZone
      : sensors
          .map((sensor) => ({
            sensor,
            distance: distanceKm(sensor.coordinates, getPolygonCentroid(zone.polygon))
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, Math.min(2, sensors.length))
          .map((item) => item.sensor);

  if (baseSensors.length === 0) return 0.04;

  const average =
    baseSensors.reduce((sum, sensor) => sum + getSensorHeatIntensity(sensor, activeLayers), 0) /
    baseSensors.length;

  return clamp(average, 0.04, 1);
};

export const buildZoneHeatIndex = (
  zones: SoilZone[],
  sensors: Sensor[],
  activeLayers: LayerKey[] = []
) => {
  return zones.reduce<Record<string, number>>((accumulator, zone) => {
    accumulator[zone.id] = getZoneHeatIntensity(zone, sensors, activeLayers);
    return accumulator;
  }, {});
};

export const generateHeatGridPoints = (
  boundary: Coordinate[],
  sensors: Sensor[],
  activeLayers: LayerKey[] = [],
  gridSize = 18
) => {
  if (boundary.length < 3 || sensors.length === 0) return [];

  const areaHectares = calculatePolygonAreaHectares(boundary);
  const dynamicGrid = clamp(Math.round(Math.sqrt(Math.max(areaHectares, 8)) * 2.5), 12, 28);
  const dynamicSigma = clamp(0.24 * Math.sqrt(areaHectares / 87), 0.09, 0.32);
  const effectiveGrid = Math.max(gridSize, dynamicGrid);

  const latitudes = boundary.map((point) => point.latitude);
  const longitudes = boundary.map((point) => point.longitude);

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  const points: Array<{ latitude: number; longitude: number; intensity: number }> = [];

  for (let row = 0; row < effectiveGrid; row += 1) {
    for (let column = 0; column < effectiveGrid; column += 1) {
      const latitude = minLat + ((row + 0.5) / effectiveGrid) * (maxLat - minLat);
      const longitude = minLng + ((column + 0.5) / effectiveGrid) * (maxLng - minLng);
      const point = { latitude, longitude };

      if (!pointInPolygon(point, boundary)) continue;

      let weightedSum = 0;
      let totalWeight = 0;
      let localPeak = 0;

      sensors.forEach((sensor) => {
        const distance = distanceKm(point, sensor.coordinates);
        const risk = getSensorHeatIntensity(sensor, activeLayers);
        const kernel = gaussianWeight(distance, dynamicSigma);

        weightedSum += risk * kernel;
        totalWeight += kernel;
        localPeak = Math.max(localPeak, risk * Math.exp(-distance / (dynamicSigma * 1.8)));
      });

      const blended = totalWeight > 0 ? weightedSum / totalWeight : localPeak;
      const intensity = clamp(blended * 0.74 + localPeak * 0.26, 0.04, 1);

      points.push({ latitude, longitude, intensity });
    }
  }

  return points;
};
