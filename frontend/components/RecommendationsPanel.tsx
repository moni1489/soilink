import React from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity } from 'react-native';
import i18n from '../i18n';
import { MOCK_RECOMMENDATIONS } from '../data/mockData';
import { AlertCircle, AlertTriangle, Calendar, Star } from 'lucide-react-native';

export default function RecommendationsPanel() {
  const getIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertCircle color="#F44336" size={20} />;
      case 'warning': return <AlertTriangle color="#FF9800" size={20} />;
      case 'plan': return <Calendar color="#2196F3" size={20} />;
      case 'premium': return <Star color="#9C27B0" size={20} />;
      default: return null;
    }
  };

  const getBorderColor = (type: string) => {
    switch(type) {
      case 'critical': return '#F44336';
      case 'warning': return '#FF9800';
      case 'premium': return '#9C27B0';
      case 'plan': return '#2196F3';
      default: return '#4CAF50';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{i18n.t('dashboard.recommendations')}</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {MOCK_RECOMMENDATIONS.map((rec) => (
          <TouchableOpacity key={rec.id} style={[styles.card, { borderLeftColor: getBorderColor(rec.type) }]}>
            <View style={styles.header}>
              {getIcon(rec.type)}
              <Text style={[styles.recType, { color: getBorderColor(rec.type) }]}>
                {rec.type.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.recMessage}>{i18n.t(rec.messageKey)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 16, padding: 20, flex: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  title: { fontSize: 18, fontWeight: '700', color: '#1B5E20', marginBottom: 16 },
  card: { backgroundColor: '#FAFAFA', padding: 16, borderRadius: 12, marginBottom: 16, borderLeftWidth: 4, elevation: 1 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  recType: { fontSize: 13, fontWeight: 'bold' },
  recMessage: { fontSize: 14, color: '#444', lineHeight: 22 }
});
