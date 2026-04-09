import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SoilDepth, SoilGridsProperty } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  property: SoilGridsProperty;
  data: Record<SoilDepth, Record<string, number>> | null;
}

const normalizeVal = (prop: string, val: number) => {
  if (prop === 'phh2o') return val / 10;
  if (prop === 'nitrogen' || prop === 'soc' || prop.includes('content') || prop === 'clay' || prop === 'sand' || prop === 'silt') return val / 10;
  if (prop === 'bdod') return val / 100;
  return val;
};

export default function DepthProfileModal({ visible, onClose, property, data }: Props) {
  const { t } = useTranslation();

  const DEPTH_LABELS: Record<SoilDepth, string> = {
    '0-5cm': t('surface'),
    '5-15cm': t('topLayer'),
    '15-30cm': t('rootZone'),
    '30-60cm': t('subsoil'),
    '60-100cm': t('deepLayer')
  };

  const getPropertyLabel = (prop: SoilGridsProperty) => {
    return t(prop === 'phh2o' ? 'phh2o' : prop);
  };

  if (!data) return null;

  const depths: SoilDepth[] = ['0-5cm', '5-15cm', '15-30cm', '30-60cm', '60-100cm'];
  const propKey = property === 'phh2o' ? 'phh2o' : 
                property === 'nitrogen' ? 'nitrogen' :
                property === 'soc' ? 'soc' :
                property === 'clay' ? 'clay_content' :
                property === 'sand' ? 'sand_content' :
                property === 'silt' ? 'silt_content' : 'bdod';

  const chartData = depths.map(d => ({
    depth: d,
    label: DEPTH_LABELS[d],
    value: normalizeVal(property, data[d][propKey] || 0)
  }));

  const maxValue = Math.max(...chartData.map(d => d.value), 1);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{t('verticalProfile')}</Text>
              <Text style={styles.subtitle}>{t('analysis')}: {getPropertyLabel(property)} (0-100см)</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.chartContainer}>
            {chartData.map((item, index) => (
              <View key={item.depth} style={styles.layerRow}>
                <View style={styles.layerInfo}>
                  <Text style={styles.layerDepth}>{item.depth}</Text>
                  <Text style={styles.layerLabel}>{item.label}</Text>
                </View>
                
                <View style={styles.barWrapper}>
                  <View style={[styles.bar, { width: `${(item.value / maxValue) * 100}%` }]}>
                    <Text style={styles.barValue}>{item.value.toFixed(1)}</Text>
                  </View>
                </View>

                {index < chartData.length - 1 && <View style={styles.connector} />}
              </View>
            ))}
          </View>

          <View style={styles.footerInsight}>
            <Text style={styles.insightTitle}>{t('scannerAnalysis')}</Text>
            <Text style={styles.insightText}>
              {t('depthScannerAnalysisText', {
                trend: chartData[0].value > chartData[4].value ? t('scannerDecreasing') : t('scannerIncreasing'),
                property: getPropertyLabel(property),
                extra: property === 'nitrogen' && chartData[2].value < chartData[0].value ? t('leachingDetected') : ''
              })}
            </Text>
          </View>

          <Pressable style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>{t('closeScanner')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  content: {
    backgroundColor: '#000000',
    width: '100%',
    maxWidth: 500,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#064E3B',
    padding: 32,
    gap: 32
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5
  },
  subtitle: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 4
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeText: { color: '#94A3B8', fontSize: 12 },
  chartContainer: {
    gap: 24,
    paddingVertical: 10
  },
  layerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    position: 'relative'
  },
  layerInfo: {
    width: 80,
    gap: 2
  },
  layerDepth: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 10,
    fontWeight: '900'
  },
  layerLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700'
  },
  barWrapper: {
    flex: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center'
  },
  bar: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    justifyContent: 'flex-end'
  },
  barValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900'
  },
  connector: {
    position: 'absolute',
    left: 40,
    bottom: -24,
    width: 1,
    height: 24,
    backgroundColor: 'rgba(5, 150, 105, 0.2)'
  },
  footerInsight: {
    backgroundColor: 'rgba(5, 150, 105, 0.05)',
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
    gap: 8
  },
  insightTitle: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1
  },
  insightText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    lineHeight: 20
  },
  doneBtn: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center'
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900'
  }
});
