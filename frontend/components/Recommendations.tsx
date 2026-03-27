import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Recommendation, RecommendationTimelineStatus } from '../types';
import { useTranslation } from 'react-i18next';

interface Props {
  recommendations: Recommendation[];
}

const levelColorMap: Record<Recommendation['level'], string> = {
  critical: '#FF4D4D',
  warning: '#FFB02E',
  plan: '#38BDF8',
  premium: '#00F59B'
};

const levelLabelKeyMap = {
  critical: 'critical',
  warning: 'warning',
  plan: 'plan',
  premium: 'premiumInsight'
} as const;

const statusColorMap: Record<RecommendationTimelineStatus, string> = {
  pending: '#b45309',
  inProgress: '#166534',
  done: '#0f766e'
};

export default function Recommendations({ recommendations }: Props) {
  const { t } = useTranslation();

  const [checkedByStepId, setCheckedByStepId] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    recommendations.forEach((recommendation) => {
      recommendation.timeline.forEach((step) => {
        initial[step.id] = step.completed;
      });
    });
    return initial;
  });

  const toggleStep = (stepId: string) => {
    setCheckedByStepId((previous) => ({
      ...previous,
      [stepId]: !previous[stepId]
    }));
  };

  const getTimelineStatus = (recommendation: Recommendation): RecommendationTimelineStatus => {
    const completedCount = recommendation.timeline.filter((step) => checkedByStepId[step.id]).length;

    if (completedCount === 0) return 'pending';
    if (completedCount === recommendation.timeline.length) return 'done';
    return 'inProgress';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{t('recommendations')}</Text>
      {recommendations.map((item) => {
        const status = getTimelineStatus(item);

        return (
          <View key={item.id} style={styles.item}>
            <View style={[styles.statusStrip, { backgroundColor: levelColorMap[item.level] }]} />
            <View style={styles.itemHeaderRow}>
              <Text style={styles.level}>{t(levelLabelKeyMap[item.level])}</Text>
              <View style={[styles.statePill, { borderColor: statusColorMap[status] }]}>
                <Text style={[styles.stateText, { color: statusColorMap[status] }]}>{t(status)}</Text>
              </View>
            </View>

            <Text style={styles.title}>{t(item.titleKey)}</Text>
            <Text style={styles.message}>{t(item.messageKey)}</Text>

            <Text style={styles.timelineLabel}>{t('timeline')}</Text>
            <View>
              {item.timeline.map((step) => {
                const isChecked = !!checkedByStepId[step.id];

                return (
                  <TouchableOpacity key={step.id} style={styles.timelineItem} onPress={() => toggleStep(step.id)}>
                    <View style={[styles.checkbox, isChecked ? styles.checkboxActive : undefined]}>
                      <Text style={styles.checkboxText}>{isChecked ? '✓' : ''}</Text>
                    </View>
                    <View style={styles.timelineTextWrap}>
                      <Text
                        style={[
                          styles.timelineText,
                          isChecked ? styles.timelineTextDone : undefined,
                          isChecked ? styles.timelineDimmed : undefined
                        ]}
                      >
                        {t(step.labelKey)}
                      </Text>
                      <Text style={[styles.timelineDue, isChecked ? styles.timelineDimmed : undefined]}>
                        {t('due')}: {step.dueAt}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 310,
    maxWidth: '100%',
    backgroundColor: '#16191E',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 24
  },
  header: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 12,
    color: '#97A3B2',
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  item: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A303A',
    backgroundColor: '#11151B',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    elevation: 1
  },
  statusStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  level: {
    fontWeight: '800',
    textTransform: 'uppercase',
    fontSize: 11,
    marginBottom: 4,
    color: '#B7C5D4',
    letterSpacing: 0.6
  },
  title: {
    fontWeight: '700',
    marginBottom: 2,
    color: '#EAF1F7'
  },
  message: {
    color: '#9BA7B5',
    fontSize: 12,
    marginBottom: 8
  },
  statePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(15,17,21,0.7)'
  },
  stateText: {
    fontSize: 11,
    fontWeight: '700'
  },
  timelineLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    color: '#CBD6E2'
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#607282',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent'
  },
  checkboxActive: {
    backgroundColor: 'rgba(0,245,155,0.2)',
    borderColor: '#00F59B'
  },
  checkboxText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
    lineHeight: 11
  },
  timelineTextWrap: {
    flex: 1
  },
  timelineText: {
    fontSize: 12,
    color: '#DBE5EF'
  },
  timelineTextDone: {
    textDecorationLine: 'line-through',
    color: '#93A1B2'
  },
  timelineDue: {
    fontSize: 11,
    color: '#7E8C9D'
  },
  timelineDimmed: {
    opacity: 0.4
  }
});
