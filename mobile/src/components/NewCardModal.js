import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Button } from './Button';
import { api, formatCurrency } from '../services/api';

const CARD_COLORS = [
  '#820AD1', // Roxo Nubank
  '#FF7A00', // Laranja Inter/Itaú
  '#10B981', // Verde Esmeralda FinControl
  '#2563EB', // Azul Royal
  '#334155', // Grafite / Slate
  '#F59E0B', // Dourado
  '#DC2626', // Vermelho Ruby
];

export function NewCardModal({ visible, onClose, onSuccess, user }) {
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [limitStr, setLimitStr] = useState('');
  const [closingDay, setClosingDay] = useState('5');
  const [dueDay, setDueDay] = useState('12');
  const [lastFourDigits, setLastFourDigits] = useState('');
  const [selectedColor, setSelectedColor] = useState(CARD_COLORS[0]);
  const [loading, setLoading] = useState(false);

  const scrollViewRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const onShow = (e) => {
      const h = e?.endCoordinates?.height || 280;
      setKeyboardHeight(h);
    };
    const onHide = () => {
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onShow
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onHide
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const parseAmountToCents = (str) => {
    if (!str) return 0;
    const clean = str.replace(/[^\d.,]/g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : Math.round(num * 100);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Informe o nome do cartão.');
      return;
    }

    const cents = parseAmountToCents(limitStr);
    if (cents <= 0) {
      Alert.alert('Atenção', 'Informe um limite total válido maior que zero.');
      return;
    }

    const cDay = parseInt(closingDay, 10);
    const dDay = parseInt(dueDay, 10);
    if (isNaN(cDay) || cDay < 1 || cDay > 31) {
      Alert.alert('Atenção', 'Dia de fechamento deve ser entre 1 e 31.');
      return;
    }
    if (isNaN(dDay) || dDay < 1 || dDay > 31) {
      Alert.alert('Atenção', 'Dia de vencimento deve ser entre 1 e 31.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.createCard({
        userId: user.id,
        name: name.trim(),
        institution: (institution || name).trim(),
        limitCents: cents,
        closingDay: cDay,
        dueDay: dDay,
        lastFourDigits: lastFourDigits.trim() || undefined,
        color: selectedColor,
      });

      if (res.success) {
        setName('');
        setInstitution('');
        setLimitStr('');
        setClosingDay('5');
        setDueDay('12');
        setLastFourDigits('');
        setSelectedColor(CARD_COLORS[0]);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        Alert.alert('Erro', res.error || 'Falha ao cadastrar cartão.');
      }
    } catch (err) {
      Alert.alert('Erro', err.message || 'Erro inesperado ao salvar cartão.');
    } finally {
      setLoading(false);
    }
  };

  const previewLimitCents = parseAmountToCents(limitStr);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconBox, { backgroundColor: selectedColor + '25' }]}>
                <Ionicons name="card" size={20} color={selectedColor} />
              </View>
              <Text style={styles.headerTitle}>Novo Cartão de Crédito</Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 30,
            }}
          >
            {/* Live Preview do Cartão */}
            <View style={[styles.cardPreview, { borderColor: selectedColor }]}>
              <View style={styles.cardPreviewTop}>
                <View>
                  <Text style={styles.previewName} numberOfLines={1}>
                    {name.trim() || 'Nome do Cartão'}
                  </Text>
                  <Text style={styles.previewInstitution}>
                    {institution.trim() || 'Instituição Financeira'}
                  </Text>
                </View>
                <Ionicons name="card" size={28} color={selectedColor} />
              </View>

              <View style={styles.previewChipRow}>
                <View style={styles.previewChip} />
                <Text style={styles.previewNumber}>
                  •••• {lastFourDigits.trim() ? lastFourDigits.slice(-4) : '••••'}
                </Text>
              </View>

              <View style={styles.previewBottom}>
                <View>
                  <Text style={styles.previewLabel}>Limite</Text>
                  <Text style={styles.previewValue}>
                    {formatCurrency(previewLimitCents)}
                  </Text>
                </View>
                <View style={styles.previewDates}>
                  <Text style={styles.previewDateText}>Fecha dia {closingDay || '--'}</Text>
                  <Text style={styles.previewDateText}>Vence dia {dueDay || '--'}</Text>
                </View>
              </View>
            </View>

            {/* Nome do Cartão */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome do Cartão *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Nubank Ultravioleta, Itaú Click, Inter..."
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Banco / Instituição */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Instituição / Banco *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Nubank, Banco Inter, Itaú..."
                placeholderTextColor={colors.textMuted}
                value={institution}
                onChangeText={setInstitution}
              />
            </View>

            {/* Limite Total */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Limite Total (R$) *</Text>
              <View style={styles.amountInputRow}>
                <Text style={styles.currencyPrefix}>R$</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0,00"
                  placeholderTextColor={colors.textMuted}
                  value={limitStr}
                  onChangeText={setLimitStr}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Datas de Fechamento e Vencimento */}
            <View style={styles.datesRow}>
              <View style={styles.dateCol}>
                <Text style={styles.label}>Dia Fechamento *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1 a 31"
                  placeholderTextColor={colors.textMuted}
                  value={closingDay}
                  onChangeText={setClosingDay}
                  keyboardType="number-pad"
                  maxLength={2}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 150);
                  }}
                />
              </View>

              <View style={styles.dateCol}>
                <Text style={styles.label}>Dia Vencimento *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1 a 31"
                  placeholderTextColor={colors.textMuted}
                  value={dueDay}
                  onChangeText={setDueDay}
                  keyboardType="number-pad"
                  maxLength={2}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 150);
                  }}
                />
              </View>
            </View>

            {/* Últimos 4 Dígitos */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Últimos 4 Dígitos (Opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 8842"
                placeholderTextColor={colors.textMuted}
                value={lastFourDigits}
                onChangeText={setLastFourDigits}
                keyboardType="number-pad"
                maxLength={4}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 150);
                }}
              />
            </View>

            {/* Cor de Identificação */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cor de Identificação</Text>
              <View style={styles.colorPalette}>
                {CARD_COLORS.map((c) => {
                  const isSelected = selectedColor === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: c },
                        isSelected && styles.colorCircleSelected,
                      ]}
                      onPress={() => setSelectedColor(c)}
                      activeOpacity={0.8}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#FFF" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Botão Cadastrar */}
            <Button
              title={loading ? 'Cadastrando...' : 'Cadastrar Cartão'}
              onPress={handleSave}
              loading={loading}
              variant="primary"
              style={styles.saveBtn}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
  },
  scroll: {
    marginBottom: 8,
  },
  cardPreview: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1.5,
  },
  cardPreviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  previewName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  previewInstitution: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  previewChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  previewChip: {
    width: 36,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  previewNumber: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 2,
  },
  previewBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  previewLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  previewValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  previewDates: {
    alignItems: 'flex-end',
  },
  previewDateText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  currencyPrefix: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  datesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  dateCol: {
    flex: 1,
  },
  colorPalette: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
  },
  saveBtn: {
    marginTop: 10,
    marginBottom: 20,
  },
});
