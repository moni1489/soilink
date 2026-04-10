import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';

import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { SoilDepth, SoilGridsProperty } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  context?: {
    field: any;
    sensors: any[];
    depth: SoilDepth;
    property: SoilGridsProperty;
  };
}

export default function ChatInterface({ visible, onClose, context }: Props) {
  const { t, i18n } = useTranslation();
  if (!visible) return null;

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: t('aiGreeting') }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          field_id: context?.field?.id || 'unknown', 
          message: userMsg,
          context: context,
          language: i18n.language
        }),
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: t('aiError') }]);
    } finally {
      setLoading(false);
    }
  };

  const colors = isDark 
    ? { 
        bg: '#000000', 
        card: '#050505', 
        text: '#FFFFFF', 
        subText: 'rgba(255, 255, 255, 0.4)',
        border: '#064E3B', 
        inputBg: 'rgba(255, 255, 255, 0.02)',
        bubbleBg: 'rgba(255, 255, 255, 0.03)',
        overlay: 'rgba(0, 0, 0, 0.85)'
      }
    : { 
        bg: '#FFFFFF', 
        card: '#FFFFFF', 
        text: '#020617', 
        subText: 'rgba(2, 6, 23, 0.4)',
        border: '#E2E8F0', 
        inputBg: '#F8FAFC',
        bubbleBg: '#F1F5F9',
        overlay: 'rgba(0, 0, 0, 0.6)'
      };

  return (
    <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: colors.bg, borderColor: colors.border }]}
      >
        <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0', backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC' }]}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>AI Agronomist</Text>
            <Text style={styles.subtitle}>Powered by Groq Llama 3.3</Text>
          </View>
          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}>
            <Text style={[styles.closeBtnText, { color: colors.text }]}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.msgList} contentContainerStyle={styles.msgContent}>
          {messages.map((m, i) => (
            <View key={i} style={[
              styles.msgBubble, 
              m.role === 'user' ? styles.userBubble : [styles.aiBubble, { backgroundColor: colors.bubbleBg, borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0' }]
            ]}>
              <Text style={[styles.msgText, { color: m.role === 'user' ? '#FFFFFF' : colors.text }]}>{m.content}</Text>
            </View>
          ))}
          {loading && (
            <View style={[styles.msgBubble, styles.aiBubble, { backgroundColor: colors.bubbleBg, borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0' }]}>
              <ActivityIndicator color="#059669" />
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0' }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: isDark ? 'transparent' : '#E2E8F0', borderWidth: isDark ? 0 : 1 }]}
            placeholder={t('askAboutSoil')}
            placeholderTextColor={colors.subText}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
          />
          <Pressable style={styles.sendBtn} onPress={sendMessage}>
            <Text style={styles.sendBtnText}>⮕</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  container: {
    width: '100%',
    maxWidth: 500,
    height: '80%',
    backgroundColor: '#000000',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#064E3B',
    overflow: 'hidden'
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  title: { fontSize: 18, fontWeight: '900' },
  subtitle: { color: '#059669', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeBtnText: { fontSize: 12 },
  msgList: { flex: 1, padding: 20 },
  msgContent: { paddingBottom: 20 },
  msgBubble: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    maxWidth: '85%'
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#059669',
    borderBottomRightRadius: 4
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  msgText: { fontSize: 14, lineHeight: 20 },
  inputRow: {
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)'
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 14,
    height: 48
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendBtnText: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' }
});
