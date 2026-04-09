import React from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity, ScrollView } from 'react-native';
import { Field, LayerKey, SoilGridsProperty, SoilDepth } from '../types';
import { useTranslation } from 'react-i18next';

const availableLayers: { key: LayerKey; label: string }[] = [
  { key: 'soilMoisture', label: 'soilMoisture' },
  { key: 'temperature', label: 'temperature' },
  { key: 'pH', label: 'pH' },
  { key: 'electricalConductivity', label: 'electricalConductivity' },
  { key: 'gasComposition', label: 'gasComposition' },
  { key: 'soilGrids', label: 'soilGrids' }
];

const soilGridsProperties: { key: SoilGridsProperty; label: string }[] = [
  { key: 'clay', label: 'clay' },
  { key: 'sand', label: 'sand' },
  { key: 'silt', label: 'silt' },
  { key: 'phh2o', label: 'phh2o' },
  { key: 'nitrogen', label: 'nitrogen' },
  { key: 'soc', label: 'soc' },
  { key: 'bdod', label: 'bdod' },
];

const depthLevels: SoilDepth[] = ['0-5cm', '5-15cm', '15-30cm', '30-60cm', '60-100cm'];

const layerGlyphMap: Record<LayerKey, string> = {
  soilMoisture: '',
  temperature: '',
  pH: '',
  electricalConductivity: '',
  gasComposition: '',
  soilGrids: ''
};

interface Props {
  fields: Field[];
  selectedFieldId: string;
  onSelectField: (id: string) => void;
  visibleLayers: LayerKey[];
  onToggleLayer: (layer: LayerKey) => void;
  selectedSoilProperty: SoilGridsProperty;
  onSelectSoilProperty: (prop: SoilGridsProperty) => void;
  selectedDepth: SoilDepth;
  onSelectDepth: (depth: SoilDepth) => void;
  activeTab: 'map' | 'ai';
  onSelectTab: (tab: 'map' | 'ai') => void;
  onOpenAI: () => void;
  onRegisterOpen: () => void;
  onOpenScanner: () => void;
}

export default function Sidebar({
  fields,
  selectedFieldId,
  onSelectField,
  visibleLayers,
  onToggleLayer,
  selectedSoilProperty,
  onSelectSoilProperty,
  selectedDepth,
  onSelectDepth,
  activeTab,
  onSelectTab,
  onOpenAI,
  onRegisterOpen,
  onOpenScanner
}: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>SoiLink</Text>
        <View style={styles.logoDot} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

      <View style={styles.tabContainer}>
        <Pressable 
          onPress={() => onSelectTab('map')}
          style={[styles.tab, activeTab === 'map' && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === 'map' && styles.tabTextActive]}>{t('interactiveMap')}</Text>
        </Pressable>
        <Pressable 
          onPress={() => onSelectTab('ai')}
          style={[styles.tab, activeTab === 'ai' && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === 'ai' && styles.tabTextActive]}>{t('aiAgronomist')}</Text>
        </Pressable>
      </View>

      {activeTab === 'map' ? (
        <>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('field')}</Text>
              <Pressable onPress={onRegisterOpen}>
                <Text style={styles.addBtn}>+</Text>
              </Pressable>
            </View>
            {fields.map((field) => {
              const isActive = field.id === selectedFieldId;
              return (
                <Pressable
                  key={field.id}
                  onPress={() => onSelectField(field.id)}
                  style={[styles.fieldItem, isActive && styles.layerItemActive]}
                >
                  <Text style={[styles.layerLabel, isActive && styles.layerLabelActive]}>
                    {field.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('mapLayers')}</Text>
            {availableLayers.map((layer) => {
              const isActive = visibleLayers.includes(layer.key);
              return (
                <React.Fragment key={layer.key}>
                    <Pressable
                      onPress={() => onToggleLayer(layer.key)}
                      style={[styles.layerItem, isActive && styles.layerItemActive]}
                    >
                      <View style={styles.layerLeft}>
                        <Text style={[styles.layerLabel, isActive && styles.layerLabelActive]}>
                          {t(layer.label)}
                        </Text>
                      </View>
                    </Pressable>
                  
                      {layer.key === 'soilGrids' && isActive && (
                        <>
                          <View style={styles.subPropertyContainer}>
                            {soilGridsProperties.map((p) => (
                              <Pressable
                                key={p.key}
                                onPress={() => onSelectSoilProperty(p.key)}
                                style={[
                                  styles.subPropertyItem,
                                  selectedSoilProperty === p.key && styles.subPropertyItemActive
                                ]}
                              >
                                <Text style={[
                                  styles.subPropertyLabel,
                                  selectedSoilProperty === p.key && styles.subPropertyLabelActive
                                ]}>
                                  {t(p.label)}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                          <View style={styles.depthSelector}>
                            <Text style={styles.depthTitle}>{t('depthSelector')}</Text>
                            <View style={styles.depthChips}>
                              {depthLevels.map((d) => (
                                <Pressable 
                                  key={d} 
                                  onPress={() => onSelectDepth(d)}
                                  style={[styles.depthChip, selectedDepth === d && styles.depthChipActive]}
                                >
                                  <Text style={[styles.depthChipText, selectedDepth === d && styles.depthChipTextActive]}>
                                    {d}
                                  </Text>
                                </Pressable>
                              ))}
                            </View>
                            <TouchableOpacity style={styles.scannerBtn} onPress={onOpenScanner}>
                              <Text style={styles.scannerBtnText}>{t('verticalScannerBtn')}</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      )}
                </React.Fragment>
              );
            })}
          </View>
        </>
      ) : (
          <View style={styles.aiTab}>
          <Text style={styles.aiTabTitle}>{t('aiConsultantTitle')}</Text>
          <Text style={styles.aiTabDesc}>
            {t('aiConsultantDesc')}
          </Text>
          
          <View style={styles.aiContextCard}>
            <View style={styles.contextHeader}>
              <Text style={styles.contextHeaderTitle}>{t('currentContext')}</Text>
              <View style={styles.liveBadge} />
            </View>
            <View style={styles.contextRow}>
              <Text style={styles.contextKey}>{t('layer')}:</Text>
              <Text style={styles.contextVal}>{t(selectedSoilProperty)}</Text>
            </View>
            <View style={styles.contextRow}>
              <Text style={styles.contextKey}>{t('depth')}:</Text>
              <Text style={styles.contextVal}>{selectedDepth}</Text>
            </View>
          </View>

          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>{t('tryAsking')}</Text>
            <Text style={styles.suggestionText}>• {t('suggestQ1')}</Text>
            <Text style={styles.suggestionText}>• {t('suggestQ2')}</Text>
            <Text style={styles.suggestionText}>• {t('suggestQ3')}</Text>
          </View>

          <TouchableOpacity style={styles.aiActionButton} onPress={onOpenAI}>
            <Text style={styles.aiActionButtonText}>{t('sendToChat')}</Text>
          </TouchableOpacity>
        </View>
      )}

      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>SoiLink v1.1 Premium</Text>
      </View>
    </View>
  );
}

const styles: any = StyleSheet.create({
  container: {
    width: 280,
    backgroundColor: '#000000',
    borderRightWidth: 1,
    borderRightColor: '#064E3B',
    paddingVertical: 24,
    paddingHorizontal: 20,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  scrollContent: {
    paddingBottom: 40
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 48,
    gap: 8
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5
  },
  logoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
    marginTop: 10
  },
  section: {
    marginBottom: 40
  },
  sectionTitle: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
    paddingLeft: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  addBtn: {
    color: '#059669',
    fontSize: 20,
    fontWeight: '900',
    paddingHorizontal: 8
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.02)'
  },
  navIcon: {
    fontSize: 16
  },
  navLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '700'
  },
  fieldItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'transparent'
  },
  layerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'transparent'
  },
  layerItemActive: {
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    borderColor: 'rgba(5, 150, 105, 0.3)'
  },
  layerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  layerIcon: {
    fontSize: 16
  },
  layerLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '600'
  },
  layerLabelActive: {
    color: '#059669',
    fontWeight: '700'
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxActive: {
    backgroundColor: '#059669',
    borderColor: '#059669'
  },
  checkMark: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900'
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)'
  },
  aiButton: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  aiButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  },
  subPropertyContainer: {
    marginLeft: 48,
    marginBottom: 20,
    gap: 6
  },
  subPropertyItem: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)'
  },
  subPropertyItemActive: {
    backgroundColor: 'rgba(5, 150, 105, 0.2)'
  },
  subPropertyLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '600'
  },
  subPropertyLabelActive: {
    color: '#059669',
    fontWeight: '800'
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8
  },
  tabActive: {
    backgroundColor: 'rgba(5, 150, 105, 0.2)'
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  tabTextActive: {
    color: '#059669'
  },
  depthSelector: {
    marginTop: 8,
    marginLeft: 48,
    marginBottom: 20
  },
  depthTitle: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8
  },
  depthChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  depthChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)'
  },
  depthChipActive: {
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    borderColor: '#059669'
  },
  depthChipText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    fontWeight: '700'
  },
  depthChipTextActive: {
    color: '#059669'
  },
  aiTab: {
    flex: 1,
    paddingTop: 12,
    gap: 20
  },
  aiTabTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900'
  },
  aiTabDesc: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    lineHeight: 20
  },
  aiContextCard: {
    backgroundColor: 'rgba(5, 150, 105, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.1)',
    padding: 16,
    gap: 12
  },
  contextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  contextHeaderTitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  liveBadge: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669'
  },
  contextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  contextKey: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
    fontWeight: '600'
  },
  contextVal: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '800'
  },
  aiActionButton: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  aiActionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  suggestionsContainer: {
    gap: 8,
    marginTop: 10
  },
  suggestionsTitle: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4
  },
  suggestionText: {
    color: 'rgba(5, 150, 105, 0.8)',
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic'
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.1)',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center'
  },
  scannerBtn: {
    marginTop: 16,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.3)'
  },
  scannerBtnText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase'
  }
});
