import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Prediction } from '../types';
import { useTranslation } from 'react-i18next';

interface Props {
  prediction: Prediction;
}

export default function PredictionCard({ prediction }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.aiBadgeContainer}>
          <View style={[styles.aiBadge, prediction.isHistorical && styles.historicalBadge]}>
            <Text style={styles.aiBadgeText}>
              {prediction.isHistorical ? 'HISTORICAL DATA' : t('aiPrediction')}
            </Text>
          </View>
          {prediction.isHistorical && (
            <View style={styles.archiveTag}>
              <Text style={styles.archiveTagText}>-{prediction.historicalDate}d</Text>
            </View>
          )}
        </View>
        <Text style={styles.updateTime}>
          {prediction.isHistorical 
            ? `${prediction.historicalDate} ${t('daysAgo')}`
            : `${t('lastUpdated')}: ${new Date(prediction.lastUpdated).toLocaleDateString()}`}
        </Text>
      </View>

      <View style={styles.mainInfo}>
        <View style={styles.infoCol}>
          <Text style={styles.label}>{t('cropRecommendation')}</Text>
          <Text style={styles.value}>{t(prediction.cropRecommendation)}</Text>
          <View style={styles.confidenceBar}>
            <View 
              style={[
                styles.confidenceProgress, 
                { width: `${prediction.cropConfidence * 100}%` }
              ]} 
            />
            <Text style={styles.confidenceText}>
              {(prediction.cropConfidence * 100).toFixed(0)}% {t('confidence')}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoCol}>
          <Text style={styles.label}>{t('fertilizerRecommendation')}</Text>
          <Text style={styles.value}>{t(prediction.fertilizerRecommendation)}</Text>
          <View style={styles.sourceTag}>
            <Text style={styles.sourceText}>
              {prediction.fertilizerSource === 'ml' ? t('mlEngine') : t('ruleBased')}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.soilStateLabel}>{t('soilState')}:</Text>
        <Text style={styles.soilStateValue}>{t(prediction.soilState)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(5, 150, 105, 0.05)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.2)',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  aiBadge: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  aiBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historicalBadge: {
    backgroundColor: '#6B7280',
  },
  archiveTag: {
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.3)',
  },
  archiveTagText: {
    color: '#9CA3AF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  updateTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.3)',
    fontWeight: '600',
  },
  mainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 20,
  },
  infoCol: {
    flex: 1,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  label: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  value: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '800',
    marginBottom: 8,
  },
  confidenceBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    position: 'relative',
    marginTop: 10,
  },
  confidenceProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#059669',
    borderRadius: 2,
  },
  confidenceText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '800',
    marginTop: 8,
  },
  sourceTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sourceText: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '900',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  soilStateLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.3)',
    fontWeight: '700',
    marginRight: 8,
  },
  soilStateValue: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '700',
  },
});
