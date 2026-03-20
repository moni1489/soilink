import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, Polygon, UrlTile } from 'react-native-maps';
import { MOCK_SENSORS, MOCK_ZONES, MOOK_FIELD_COORDS } from '../../data/mockData';
import { CONFIG } from '../../constants/Config';
import { RadioReceiver } from 'lucide-react-native';
import { Sensor } from '../../types';

interface MapProps {
  onSelectSensor: (sensor: Sensor) => void;
}

export default function FieldMapNative({ onSelectSensor }: MapProps) {
  // We use raster tiles via Mapbox static API for Expo Go compatibility
  const mapboxStyleUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/256/{z}/{x}/{y}?access_token=${CONFIG.MAPBOX_TOKEN}`;

  return (
    <View style={styles.container}>
      <MapView 
        style={styles.map}
        initialRegion={MOOK_FIELD_COORDS}
        mapType="none" // Disable Google/Apple base map so Mapbox UrlTile shows clearly
      >
        <UrlTile
          urlTemplate={mapboxStyleUrl}
          maximumZ={19}
          flipY={false}
        />
        
        {/* Heat Zones */}
        {MOCK_ZONES.map(zone => {
          const fillColor = 
            zone.status === 'healthy' ? 'rgba(76, 175, 80, 0.35)' :
            zone.status === 'warning' ? 'rgba(255, 193, 7, 0.35)' :
            'rgba(244, 67, 54, 0.35)';
          const strokeColor =
            zone.status === 'healthy' ? '#4CAF50' :
            zone.status === 'warning' ? '#FFC107' : '#F44336';

          return (
            <Polygon
              key={zone.id}
              coordinates={zone.coordinates}
              fillColor={fillColor}
              strokeColor={strokeColor}
              strokeWidth={2}
            />
          );
        })}
        
        {/* Sensors Base Stations */}
        {MOCK_SENSORS.map(sensor => {
          const iconColor = 
            sensor.status === 'active' ? '#4CAF50' :
            sensor.status === 'warning' ? '#FF9800' : '#F44336';
            
          return (
            <Marker
              key={sensor.id}
              coordinate={sensor.coordinates}
              onPress={() => onSelectSensor(sensor)}
            >
              <View style={styles.markerObj}>
                <RadioReceiver size={20} color={iconColor} />
              </View>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: '#e5e5e5', minHeight: 400, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 },
  map: { width: '100%', height: '100%' },
  markerObj: { backgroundColor: '#fff', borderRadius: 20, padding: 6, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4.65 }
});
