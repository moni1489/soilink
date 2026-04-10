import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { SoilDepth, SoilGridsProperty, Field, LayerKey } from '../types';

interface Props {
  fields: Field[];
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  visibleLayers: LayerKey[];
  onToggleLayer: (layer: LayerKey) => void;
  selectedSoilProperty: SoilGridsProperty;
  onSelectSoilProperty: (prop: SoilGridsProperty) => void;
  selectedDepth: SoilDepth;
  onSelectDepth: (depth: SoilDepth) => void;
  activeTab: 'map' | 'ai' | 'recommendations';
  onSelectTab: (tab: 'map' | 'ai' | 'recommendations') => void;
  onOpenAI: () => void;
  onRegisterOpen: () => void;
  onOpenScanner: () => void;
  recommendations?: any[];
  style?: any;
}

const soilProperties = [
  { key: 'clay', label: 'clay', icon: '' },
  { key: 'sand', label: 'sand', icon: '' },
  { key: 'silt', label: 'silt', icon: '' },
  { key: 'nitrogen', label: 'nitrogen', icon: '' },
  { key: 'phh2o', label: 'phh2o', icon: '' },
  { key: 'soc', label: 'soc', icon: '' },
  { key: 'bdod', label: 'bdod', icon: '' },
];

const availableLayers: { key: LayerKey; label: string; icon: string }[] = [
  { key: 'soilMoisture', label: 'soilMoisture', icon: '' },
  { key: 'temperature', label: 'temperature', icon: '' },
  { key: 'pH', label: 'pH', icon: '' },
  { key: 'electricalConductivity', label: 'electricalConductivity', icon: '' },
  { key: 'gasComposition', label: 'gasComposition', icon: '' },
  { key: 'soilGrids', label: 'soilGrids', icon: '' },
];

const depthLevels: SoilDepth[] = ['0-5cm', '5-15cm', '15-30cm', '30-60cm', '60-100cm'];

export default function Sidebar({
  fields,
  selectedFieldId,
  onSelectField,
  visibleLayers,
  onToggleLayer,
  activeTab,
  onSelectTab,
  selectedSoilProperty,
  onSelectSoilProperty,
  selectedDepth,
  onSelectDepth,
  onOpenAI,
  onRegisterOpen,
  onOpenScanner,
  recommendations = [],
  style
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const colors = isDark 
    ? { 
        sidebar: '#000000', 
        text: '#FFFFFF', 
        subText: '#94A3B8', 
        activeBg: '#111111',
        activeText: '#10B981',
        border: '#222222',
        cardBg: 'rgba(5, 150, 105, 0.05)',
        cardBorder: 'rgba(5, 150, 105, 0.1)',
        contextKey: 'rgba(255, 255, 255, 0.3)',
        suggestionTitle: 'rgba(255, 255, 255, 0.2)'
      }
    : { 
        sidebar: '#FFFFFF', 
        text: '#020617', 
        subText: '#475569', 
        activeBg: '#F1F5F9',
        activeText: '#064E3B',
        border: '#CBD5E1',
        cardBg: '#F8FAFC',
        cardBorder: '#E2E8F0',
        contextKey: '#64748B',
        suggestionTitle: '#94A3B8'
      };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 24), backgroundColor: colors.sidebar, borderRightColor: colors.border, borderRightWidth: isDark ? 0 : 1 }, style]}>
      <View style={styles.logoContainer}>
        <Text style={[styles.logoText, { color: colors.text }]}>SoiLink</Text>
        <View style={[styles.logoDot, { backgroundColor: '#10B981' }]} />
      </View>

      <View style={[styles.tabContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F1F5F9', borderColor: colors.border }]}>
        <Pressable
          onPress={() => onSelectTab('map')}
          style={[styles.tab, activeTab === 'map' && { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#FFFFFF', elevation: activeTab === 'map' ? 2 : 0, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 }]}
        >
          <Text style={[styles.tabText, { color: isDark ? colors.subText : 'rgba(2, 6, 23, 0.5)' }, activeTab === 'map' && { color: colors.activeText, fontWeight: '700' }]}>{t('interactiveMap')}</Text>
        </Pressable>
        <Pressable
          onPress={() => onSelectTab('ai')}
          style={[styles.tab, activeTab === 'ai' && { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#FFFFFF', elevation: activeTab === 'ai' ? 2 : 0 }]}
        >
          <Text style={[styles.tabText, { color: isDark ? colors.subText : 'rgba(2, 6, 23, 0.5)' }, activeTab === 'ai' && { color: colors.activeText, fontWeight: '700' }]}>{t('aiAgronomist')}</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'map' ? (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.subText }]}>{t('field')}</Text>
                <Pressable onPress={onRegisterOpen}>
                  <Text style={[styles.addBtn, { color: colors.activeText }]}>+</Text>
                </Pressable>
              </View>
              {fields.map((f) => (
                <Pressable 
                  key={f.id} 
                  onPress={() => onSelectField(f.id)}
                  style={[
                    styles.fieldItem, 
                    { backgroundColor: isDark ? (selectedFieldId === f.id ? 'rgba(5, 150, 105, 0.15)' : 'rgba(255, 255, 255, 0.02)') : (selectedFieldId === f.id ? 'rgba(5, 150, 105, 0.05)' : colors.activeBg) },
                    { borderColor: selectedFieldId === f.id ? '#10B981' : (isDark ? 'transparent' : colors.border) }
                  ]}
                >
                  <Text style={[styles.fieldText, { color: colors.text }, selectedFieldId === f.id && { color: colors.activeText }]}>{f.name}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.subText }]}>{t('layers')}</Text>
              {availableLayers.map((l) => (
                <Pressable
                  key={l.key}
                  onPress={() => onToggleLayer(l.key)}
                  style={[styles.layerItem, visibleLayers.includes(l.key) && styles.layerItemActive]}
                >
                  <View style={styles.layerLeft}>
                    <Text style={styles.layerIcon}>{l.icon}</Text>
                    <Text style={[styles.layerLabel, { color: colors.text, opacity: visibleLayers.includes(l.key) ? 1 : 0.7 }]}>{t(l.key)}</Text>
                  </View>
                  <View style={[styles.checkbox, visibleLayers.includes(l.key) && styles.checkboxActive, { borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#CBD5E1' }]}>
                    {visibleLayers.includes(l.key) && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                </Pressable>
              ))}
            </View>

            {visibleLayers.includes('soilGrids') && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.subText }]}>{t('mapLayers')}</Text>
                {soilProperties.map((p) => (
                  <React.Fragment key={p.key}>
                    <Pressable
                      onPress={() => onSelectSoilProperty(p.key as SoilGridsProperty)}
                      style={[styles.layerItem, selectedSoilProperty === p.key && styles.layerItemActive]}
                    >
                      <View style={styles.layerLeft}>
                        <Text style={styles.layerIcon}>{p.icon}</Text>
                        <Text style={[styles.layerLabel, { color: colors.text, opacity: selectedSoilProperty === p.key ? 1 : 0.7 }, selectedSoilProperty === p.key && styles.layerLabelActive]}>{t(p.key)}</Text>
                      </View>
                      <View style={[styles.checkbox, selectedSoilProperty === p.key && styles.checkboxActive, { borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#CBD5E1' }]}>
                        {selectedSoilProperty === p.key && <Text style={styles.checkMark}>✓</Text>}
                      </View>
                    </Pressable>
                    {selectedSoilProperty === p.key && (
                      <View style={[styles.depthSelector, { borderLeftWidth: 2, borderLeftColor: colors.border, paddingLeft: 16 }]}>
                        <Text style={[styles.depthTitle, { color: colors.subText }]}>{t('depthSelector')}</Text>
                        <View style={styles.depthChips}>
                          {depthLevels.map((d) => (
                            <Pressable
                              key={d}
                              onPress={() => onSelectDepth(d)}
                              style={[styles.depthChip, { borderColor: selectedDepth === d ? '#10B981' : colors.border, backgroundColor: selectedDepth === d ? 'rgba(16, 185, 129, 0.1)' : 'transparent' }]}
                            >
                              <Text style={[styles.depthChipText, { color: selectedDepth === d ? '#10B981' : colors.subText }]}>{d}</Text>
                            </Pressable>
                          ))}
                        </View>
                        <TouchableOpacity style={styles.scannerBtn} onPress={onOpenScanner}>
                          <Text style={styles.scannerBtnText}>{t('verticalScannerBtn')}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </React.Fragment>
                ))}
              </View>
            )}
          </>
        ) : activeTab === 'ai' ? (
          <View style={styles.aiTab}>
            <Text style={[styles.aiTabTitle, { color: colors.text }]}>{t('aiConsultantTitle')}</Text>
            <Text style={[styles.aiTabDesc, { color: colors.subText }]}>{t('aiConsultantDesc')}</Text>

            <View style={[styles.aiContextCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={styles.contextHeader}>
                <Text style={[styles.contextHeaderTitle, { color: colors.subText }]}>{t('currentContext')}</Text>
                <View style={styles.liveBadge} />
              </View>
              <View style={styles.contextRow}>
                <Text style={[styles.contextKey, { color: colors.contextKey }]}>{t('layer')}:</Text>
                <Text style={[styles.contextVal, { color: colors.text }]}>{t(selectedSoilProperty)}</Text>
              </View>
              <View style={styles.contextRow}>
                <Text style={[styles.contextKey, { color: colors.contextKey }]}>{t('depth')}:</Text>
                <Text style={[styles.contextVal, { color: colors.text }]}>{selectedDepth}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.aiActionButton} onPress={onOpenAI}>
              <Text style={styles.aiActionButtonText}>{t('sendToChat')}</Text>
            </TouchableOpacity>

            <View style={styles.suggestionsContainer}>
              <Text style={[styles.suggestionsTitle, { color: colors.suggestionTitle }]}>{t('tryAsking')}</Text>
              {[1, 2, 3].map((i) => (
                <Pressable key={i} style={styles.suggestionItem} onPress={() => {}}>
                  <Text style={[styles.suggestionText, { color: '#059669' }]}>• {t(`suggestQ${i}`, { prop: t(selectedSoilProperty), depth: selectedDepth })}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.aiTab}>
            <Text style={[styles.aiTabTitle, { color: colors.text }]}>{t('recommendations')}</Text>
            {recommendations.map((rec: any) => (
              <View key={rec.id} style={[styles.recMiniCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.recTitle, { color: colors.text }]}>{t(rec.titleKey || rec.title)}</Text>
                  <Text style={[styles.recBody, { color: colors.subText }]} numberOfLines={2}>{t(rec.messageKey || rec.description)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 300, height: '100%', paddingHorizontal: 20 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 40, gap: 10 },
  logoText: { fontSize: 32, fontWeight: '900', letterSpacing: -1.5 },
  logoDot: { width: 8, height: 8, borderRadius: 4, marginTop: 12 },
  tabContainer: { flexDirection: 'row', marginBottom: 32, borderRadius: 12, padding: 4, borderWidth: 1 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  scrollContent: { paddingBottom: 40 },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, color: '#059669' },
  addBtn: { fontSize: 24, fontWeight: '300' },
  fieldItem: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginBottom: 6, borderWidth: 1 },
  fieldText: { fontSize: 13, fontWeight: '700' },
  layerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, marginBottom: 10, borderWidth: 1.5, borderColor: 'transparent' },
  layerItemActive: { backgroundColor: 'rgba(5, 150, 105, 0.1)', borderColor: 'rgba(5, 150, 105, 0.3)' },
  layerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  layerIcon: { fontSize: 16 },
  layerLabel: { fontSize: 13, fontWeight: '700' },
  layerLabelActive: { color: '#059669' },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#059669', borderColor: '#059669' },
  checkMark: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  depthSelector: { marginTop: 16, marginLeft: 40, marginBottom: 20 },
  depthTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  depthChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  depthChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5 },
  depthChipText: { fontSize: 11, fontWeight: '800' },
  scannerBtn: { marginTop: 16, backgroundColor: 'rgba(5, 150, 105, 0.1)', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  scannerBtnText: { color: '#059669', fontSize: 11, fontWeight: '800' },
  aiTab: { flex: 1, paddingTop: 12, gap: 20 },
  aiTabTitle: { fontSize: 18, fontWeight: '900' },
  aiTabDesc: { fontSize: 13, lineHeight: 20 },
  aiContextCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  contextHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  contextHeaderTitle: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  liveBadge: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  contextRow: { flexDirection: 'row', justifyContent: 'space-between' },
  contextKey: { fontSize: 12, fontWeight: '600' },
  contextVal: { fontSize: 12, fontWeight: '800' },
  aiActionButton: { backgroundColor: '#059669', paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  aiActionButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  suggestionsContainer: { gap: 8, marginTop: 10 },
  suggestionsTitle: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  suggestionItem: { paddingVertical: 4 },
  suggestionText: { fontSize: 13, fontWeight: '600', lineHeight: 20 },
  recMiniCard: { flexDirection: 'row', padding: 16, borderRadius: 20, gap: 16, marginBottom: 12 },
  recIcon: { fontSize: 24 },
  recTitle: { fontSize: 14, fontWeight: '900', marginBottom: 4 },
  recBody: { fontSize: 12, lineHeight: 18 }
});
