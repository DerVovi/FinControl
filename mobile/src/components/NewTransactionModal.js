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
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Button } from './Button';
import { api, formatCurrency } from '../services/api';
import {
  handleCurrencyInputChange,
  formatCentsToDisplay,
  parseFormattedToCents,
} from '../utils/currencyMask';

const CATEGORY_ICONS = {
  'Alimentação': 'restaurant',
  'Transporte': 'car',
  'Moradia': 'home',
  'Saúde': 'medkit',
  'Educação': 'book',
  'Lazer': 'film',
  'Salário': 'briefcase',
  'Freelance': 'laptop',
  'Investimentos': 'trending-up',
  'Outras Receitas': 'cash',
};

export function NewTransactionModal({
  visible,
  onClose,
  onSuccess,
  user,
  accounts = [],
  cards = [],
  categories = [],
}) {
  const [type, setType] = useState('EXPENSE'); // 'EXPENSE' | 'INCOME'
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [paymentType, setPaymentType] = useState('ACCOUNT'); // 'ACCOUNT' | 'CARD'
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCardId, setSelectedCardId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados de Recorrência & Parcelamento
  const [isRecurring, setIsRecurring] = useState(false);
  const [dayOfMonth, setDayOfMonth] = useState(String(new Date().getDate()));
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState('2');

  // Estados dos menus seletores
  const [activeMenu, setActiveMenu] = useState(null); // 'PAYMENT_SOURCE' | 'CATEGORY' | 'DESTINATION'
  const [newOptionName, setNewOptionName] = useState('');
  const [creatingOption, setCreatingOption] = useState(false);

  const [localCategories, setLocalCategories] = useState(categories);
  const [localCards, setLocalCards] = useState(cards);

  const scrollViewRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Monitora abertura e fechamento do teclado
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

  useEffect(() => {
    if (visible && user) {
      if (categories.length > 0) {
        setLocalCategories(categories);
      } else {
        api.getCategories(user.id).then((cats) => setLocalCategories(cats));
      }

      if (cards.length > 0) {
        setLocalCards(cards);
      } else {
        api.getCards(user.id).then((crds) => setLocalCards(crds));
      }

      if (accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accounts[0].id);
      }
    }
  }, [visible, user, categories, cards, accounts]);

  useEffect(() => {
    const available = localCategories.filter((c) => c.type === type);
    if (available.length > 0) {
      if (!selectedCategoryId || !available.some((c) => c.id === selectedCategoryId)) {
        setSelectedCategoryId(available[0].id);
      }
    } else {
      setSelectedCategoryId('');
    }
  }, [type, localCategories]);

  useEffect(() => {
    if (localCards.length > 0 && !selectedCardId) {
      setSelectedCardId(localCards[0].id);
    }
  }, [localCards]);

  const parseAmountToCents = (str) => {
    return parseFormattedToCents(str);
  };

  // Criação de nova opção de recebimento / categoria
  const handleCreateCategory = async () => {
    if (!newOptionName.trim()) {
      Alert.alert('Atenção', 'Digite o nome da nova opção.');
      return;
    }

    setCreatingOption(true);
    try {
      const res = await api.createCategory({
        userId: user.id,
        name: newOptionName.trim(),
        type,
        icon: type === 'INCOME' ? 'cash' : 'pricetag',
        color: type === 'INCOME' ? colors.income : colors.expense,
      });

      if (res.success && res.category) {
        const updated = [...localCategories, res.category];
        setLocalCategories(updated);
        setSelectedCategoryId(res.category.id);
        setNewOptionName('');
        setActiveMenu(null);
      } else {
        Alert.alert('Erro', res.error || 'Falha ao criar opção.');
      }
    } catch (err) {
      Alert.alert('Erro', err.message || 'Erro inesperado.');
    } finally {
      setCreatingOption(false);
    }
  };

  const handleSave = async () => {
    if (!description.trim()) {
      Alert.alert('Atenção', 'Informe a descrição da transação.');
      return;
    }

    const cents = parseAmountToCents(amountStr);
    if (cents <= 0) {
      Alert.alert('Atenção', 'Informe um valor válido maior que zero.');
      return;
    }

    let finalAccountId = null;
    let finalCardId = null;

    if (type === 'EXPENSE') {
      if (paymentType === 'CARD') {
        if (!selectedCardId && localCards.length > 0) {
          finalCardId = localCards[0].id;
        } else if (selectedCardId) {
          finalCardId = selectedCardId;
        } else {
          Alert.alert('Atenção', 'Selecione um cartão de crédito válido.');
          return;
        }
      } else {
        finalAccountId = selectedAccountId || (accounts[0] ? accounts[0].id : null);
      }
    } else {
      finalAccountId = selectedAccountId || (accounts[0] ? accounts[0].id : null);
    }

    setLoading(true);
    try {
      let res;
      if (isRecurring) {
        res = await api.createRecurring({
          userId: user.id,
          accountId: finalAccountId,
          categoryId: selectedCategoryId || null,
          description: description.trim(),
          type,
          amountCents: cents,
          frequency: 'MONTHLY',
          dayOfMonth: parseInt(dayOfMonth, 10) || new Date().getDate(),
        });
      } else if (isInstallment && type === 'EXPENSE') {
        res = await api.createInstallmentTransactions({
          userId: user.id,
          accountId: finalAccountId,
          cardId: finalCardId,
          categoryId: selectedCategoryId || null,
          description: description.trim(),
          totalAmountCents: cents,
          totalInstallments: parseInt(installmentsCount, 10) || 2,
          notes: notes.trim() || undefined,
        });
      } else {
        res = await api.createTransaction({
          userId: user.id,
          accountId: finalAccountId,
          cardId: finalCardId,
          categoryId: selectedCategoryId || null,
          type,
          amountCents: cents,
          description: description.trim(),
          notes: notes.trim() || undefined,
        });
      }

      if (res.success) {
        setDescription('');
        setAmountStr('');
        setNotes('');
        setIsRecurring(false);
        setIsInstallment(false);
        onSuccess();
        onClose();
      } else {
        Alert.alert('Erro', res.error || 'Falha ao registrar transação.');
      }
    } catch (err) {
      Alert.alert('Erro', err.message || 'Falha ao salvar transação.');
    } finally {
      setLoading(false);
    }
  };

  // Helper dados selecionados
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  const selectedCard = localCards.find((c) => c.id === selectedCardId) || localCards[0];
  const currentCategories = localCategories.filter((c) => c.type === type);
  const selectedCategory = currentCategories.find((c) => c.id === selectedCategoryId) || currentCategories[0];

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
          {/* Header Principal */}
          <View style={styles.header}>
            <Text style={styles.title}>Nova Transação</Text>
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
            {/* Abas Tipo: Despesa vs Recebimento */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeTab,
                  type === 'EXPENSE' && styles.typeTabExpenseActive,
                ]}
                onPress={() => setType('EXPENSE')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="arrow-down-circle"
                  size={18}
                  color={type === 'EXPENSE' ? colors.expense : colors.textMuted}
                />
                <Text
                  style={[
                    styles.typeTabText,
                    type === 'EXPENSE' && { color: colors.expense, fontWeight: '800' },
                  ]}
                >
                  Despesa
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeTab,
                  type === 'INCOME' && styles.typeTabIncomeActive,
                ]}
                onPress={() => setType('INCOME')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="arrow-up-circle"
                  size={18}
                  color={type === 'INCOME' ? colors.income : colors.textMuted}
                />
                <Text
                  style={[
                    styles.typeTabText,
                    type === 'INCOME' && { color: colors.income, fontWeight: '800' },
                  ]}
                >
                  Recebimento
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input Valor Grande */}
            <View style={styles.amountContainer}>
              <Text style={styles.currencyPrefix}>R$</Text>
              <TextInput
                style={[
                  styles.amountInput,
                  { color: type === 'EXPENSE' ? colors.expense : colors.income },
                ]}
                placeholder="0,00"
                placeholderTextColor={colors.textMuted}
                value={amountStr || '0,00'}
                onChangeText={(text) => {
                  const { formatted } = handleCurrencyInputChange(text);
                  setAmountStr(formatted);
                }}
                keyboardType="numeric"
                autoFocus={true}
              />
            </View>

            {/* Descrição */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descrição *</Text>
              <TextInput
                style={styles.input}
                placeholder={
                  type === 'EXPENSE'
                    ? 'Ex: Supermercado, Almoço, Farmácia...'
                    : 'Ex: Salário Mensal, Projeto Freelance...'
                }
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 130, animated: true });
                  }, 150);
                }}
              />
            </View>

            {/* SELETORES CLICÁVEIS (SUBSTITUINDO O CARROSSEL) */}
            {type === 'EXPENSE' ? (
              <>
                {/* 1. SELETOR DE MEIO DE PAGAMENTO */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>De onde sai o dinheiro? (Meio de Pagamento) *</Text>
                  <TouchableOpacity
                    style={styles.selectorField}
                    onPress={() => setActiveMenu('PAYMENT_SOURCE')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.selectorLeft}>
                      <View
                        style={[
                          styles.selectorIconBox,
                          {
                            backgroundColor:
                              (paymentType === 'CARD'
                                ? selectedCard?.color || colors.primary
                                : selectedAccount?.color || colors.primary) + '22',
                          },
                        ]}
                      >
                        <Ionicons
                          name={paymentType === 'CARD' ? 'card' : 'wallet'}
                          size={18}
                          color={
                            paymentType === 'CARD'
                              ? selectedCard?.color || colors.primary
                              : selectedAccount?.color || colors.primary
                          }
                        />
                      </View>
                      <View style={styles.selectorTextBox}>
                        <Text style={styles.selectorTitle}>
                          {paymentType === 'CARD'
                            ? selectedCard?.name || 'Selecione o Cartão'
                            : selectedAccount?.name || 'Selecione a Conta'}
                        </Text>
                        <Text style={styles.selectorSubtitle}>
                          {paymentType === 'CARD'
                            ? `Cartão de Crédito • Limite ${formatCurrency(selectedCard?.limitCents || 0)}`
                            : `Conta Corrente • Saldo ${formatCurrency(selectedAccount?.currentBalanceCents || 0)}`}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* 2. SELETOR DE CATEGORIA DA DESPESA */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Categoria da Despesa *</Text>
                  <TouchableOpacity
                    style={styles.selectorField}
                    onPress={() => setActiveMenu('CATEGORY')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.selectorLeft}>
                      <View
                        style={[
                          styles.selectorIconBox,
                          { backgroundColor: colors.expenseGhost },
                        ]}
                      >
                        <Ionicons
                          name={
                            CATEGORY_ICONS[selectedCategory?.name] || 'pricetag'
                          }
                          size={18}
                          color={colors.expense}
                        />
                      </View>
                      <View style={styles.selectorTextBox}>
                        <Text style={styles.selectorTitle}>
                          {selectedCategory?.name || 'Selecione uma categoria'}
                        </Text>
                        <Text style={styles.selectorSubtitle}>Classificação do gasto</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {/* 1. SELETOR DE ORIGEM DO RECEBIMENTO */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>De onde vem esse recebimento? (Origem) *</Text>
                  <TouchableOpacity
                    style={styles.selectorField}
                    onPress={() => setActiveMenu('CATEGORY')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.selectorLeft}>
                      <View
                        style={[
                          styles.selectorIconBox,
                          { backgroundColor: colors.incomeGhost },
                        ]}
                      >
                        <Ionicons
                          name={
                            CATEGORY_ICONS[selectedCategory?.name] || 'cash'
                          }
                          size={18}
                          color={colors.income}
                        />
                      </View>
                      <View style={styles.selectorTextBox}>
                        <Text style={styles.selectorTitle}>
                          {selectedCategory?.name || 'Selecione a origem'}
                        </Text>
                        <Text style={styles.selectorSubtitle}>Opção de recebimento</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* 2. SELETOR DE CONTA DE DESTINO */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Para qual conta vai o dinheiro? (Destino) *</Text>
                  <TouchableOpacity
                    style={styles.selectorField}
                    onPress={() => setActiveMenu('DESTINATION')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.selectorLeft}>
                      <View
                        style={[
                          styles.selectorIconBox,
                          {
                            backgroundColor:
                              (selectedAccount?.color || colors.income) + '22',
                          },
                        ]}
                      >
                        <Ionicons
                          name="wallet"
                          size={18}
                          color={selectedAccount?.color || colors.income}
                        />
                      </View>
                      <View style={styles.selectorTextBox}>
                        <Text style={styles.selectorTitle}>
                          {selectedAccount?.name || 'Selecione a conta'}
                        </Text>
                        <Text style={styles.selectorSubtitle}>
                          Conta bancária • Saldo {formatCurrency(selectedAccount?.currentBalanceCents || 0)}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* 3. OPÇÕES DE CONTA FIXA E PARCELAMENTO */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Automação & Planejamento</Text>
              <View style={styles.automationRow}>
                <TouchableOpacity
                  style={[
                    styles.automationPill,
                    isRecurring && styles.automationPillActive,
                  ]}
                  onPress={() => {
                    const next = !isRecurring;
                    setIsRecurring(next);
                    if (next) {
                      setIsInstallment(false);
                      setTimeout(() => {
                        scrollViewRef.current?.scrollTo({ y: 520, animated: true });
                      }, 120);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="repeat"
                    size={16}
                    color={isRecurring ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.automationPillText,
                      isRecurring && styles.automationPillTextActive,
                    ]}
                  >
                    Conta Fixa (Todo Mês)
                  </Text>
                </TouchableOpacity>

                {type === 'EXPENSE' && (
                  <TouchableOpacity
                    style={[
                      styles.automationPill,
                      isInstallment && styles.automationPillActive,
                    ]}
                    onPress={() => {
                      const next = !isInstallment;
                      setIsInstallment(next);
                      if (next) {
                        setIsRecurring(false);
                        setTimeout(() => {
                          scrollViewRef.current?.scrollTo({ y: 520, animated: true });
                        }, 120);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="layers-outline"
                      size={16}
                      color={isInstallment ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.automationPillText,
                        isInstallment && styles.automationPillTextActive,
                      ]}
                    >
                      Parcelamento
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Sub-configuração de Conta Fixa */}
              {isRecurring && (
                <View style={styles.subConfigBox}>
                  <View style={styles.subConfigHeader}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                    <Text style={styles.subConfigDesc}>
                      Esta conta será lançada automaticamente todo mês no dia escolhido.
                    </Text>
                  </View>
                  <View style={styles.subConfigInputRow}>
                    <Text style={styles.subConfigLabel}>Dia de vencimento:</Text>
                    <TextInput
                      style={styles.dayInput}
                      keyboardType="numeric"
                      maxLength={2}
                      value={dayOfMonth}
                      onChangeText={setDayOfMonth}
                      placeholder="Dia"
                      placeholderTextColor={colors.textMuted}
                      onFocus={() => {
                        setTimeout(() => {
                          scrollViewRef.current?.scrollTo({ y: 580, animated: true });
                        }, 120);
                      }}
                    />
                  </View>

                  {/* Pílulas rápidas de seleção de dia */}
                  <View style={styles.quickDaysRow}>
                    {['1', '5', '10', '15', '20', '25', '28'].map((d) => {
                      const isSelected = String(dayOfMonth) === d;
                      return (
                        <TouchableOpacity
                          key={d}
                          style={[
                            styles.quickDayChip,
                            isSelected && styles.quickDayChipActive,
                          ]}
                          onPress={() => setDayOfMonth(d)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.quickDayText,
                              isSelected && styles.quickDayTextActive,
                            ]}
                          >
                            Dia {d}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Sub-configuração de Parcelamento */}
              {isInstallment && type === 'EXPENSE' && (
                <View style={styles.subConfigBox}>
                  <Text style={styles.subConfigDesc}>
                    Escolha o número de parcelas mensais:
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.installmentsScroll}
                  >
                    {['2', '3', '4', '5', '6', '10', '12', '18', '24'].map((count) => {
                      const active = installmentsCount === count;
                      return (
                        <TouchableOpacity
                          key={count}
                          style={[
                            styles.installmentChip,
                            active && styles.installmentChipActive,
                          ]}
                          onPress={() => setInstallmentsCount(count)}
                        >
                          <Text
                            style={[
                              styles.installmentChipText,
                              active && styles.installmentChipTextActive,
                            ]}
                          >
                            {count}x
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  {parseAmountToCents(amountStr) > 0 && (
                    <Text style={styles.installmentCalcText}>
                      ⚡ {installmentsCount} parcelas de {formatCurrency(Math.floor(parseAmountToCents(amountStr) / (parseInt(installmentsCount, 10) || 1)))}/mês
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Observações Opcionais */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Observações (Opcional)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Adicione um detalhe..."
                placeholderTextColor={colors.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={2}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 150);
                }}
              />
            </View>

            {/* Botão Salvar */}
            <Button
              title={loading ? 'Salvando...' : 'Confirmar Lançamento'}
              onPress={handleSave}
              loading={loading}
              variant={type === 'EXPENSE' ? 'danger' : 'primary'}
              style={styles.saveBtn}
            />
          </ScrollView>

          {/* ========================================================= */}
          {/* OVERLAY DO MENU SELETOR (SUBSTITUTO NATIVO DO CARROSSEL) */}
          {/* ========================================================= */}
          {activeMenu && (
            <View style={styles.menuBackdrop}>
              <View
                style={[
                  styles.menuContainer,
                  keyboardHeight > 0 && {
                    paddingBottom: keyboardHeight + 20,
                    maxHeight: '96%',
                  },
                ]}
              >
                {/* Header do Menu */}
                <View style={styles.menuHeader}>
                  <Text style={styles.menuTitle}>
                    {activeMenu === 'PAYMENT_SOURCE' && 'Selecione o Meio de Pagamento'}
                    {activeMenu === 'CATEGORY' && (type === 'INCOME' ? 'Origens de Recebimento' : 'Categorias de Despesa')}
                    {activeMenu === 'DESTINATION' && 'Selecione a Conta de Destino'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setActiveMenu(null)}
                    style={styles.menuCloseBtn}
                  >
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
                  {/* CASO 1: SELEÇÃO DE MEIO DE PAGAMENTO (CONTAS + CARTÕES) */}
                  {activeMenu === 'PAYMENT_SOURCE' && (
                    <>
                      <Text style={styles.menuSectionTitle}>CONTAS BANCÁRIAS</Text>
                      {accounts.map((acc) => {
                        const isSelected = paymentType === 'ACCOUNT' && selectedAccountId === acc.id;
                        return (
                          <TouchableOpacity
                            key={acc.id}
                            style={[styles.menuItem, isSelected && styles.menuItemSelected]}
                            onPress={() => {
                              setPaymentType('ACCOUNT');
                              setSelectedAccountId(acc.id);
                              setActiveMenu(null);
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.menuItemLeft}>
                              <View
                                style={[
                                  styles.menuItemIconBox,
                                  { backgroundColor: (acc.color || colors.primary) + '22' },
                                ]}
                              >
                                <Ionicons name="wallet" size={18} color={acc.color || colors.primary} />
                              </View>
                              <View>
                                <Text style={styles.menuItemTitle}>{acc.name}</Text>
                                <Text style={styles.menuItemSubtitle}>
                                  Saldo: {formatCurrency(acc.currentBalanceCents || 0)}
                                </Text>
                              </View>
                            </View>
                            {isSelected && (
                              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                            )}
                          </TouchableOpacity>
                        );
                      })}

                      <Text style={[styles.menuSectionTitle, { marginTop: 14 }]}>CARTÕES DE CRÉDITO</Text>
                      {localCards.length === 0 ? (
                        <View style={styles.menuEmptyCard}>
                          <Ionicons name="card-outline" size={24} color={colors.textMuted} />
                          <Text style={styles.menuEmptyText}>
                            Nenhum cartão cadastrado. Você pode cadastrar um na aba Cartões.
                          </Text>
                        </View>
                      ) : (
                        localCards.map((c) => {
                          const isSelected = paymentType === 'CARD' && selectedCardId === c.id;
                          return (
                            <TouchableOpacity
                              key={c.id}
                              style={[styles.menuItem, isSelected && styles.menuItemSelected]}
                              onPress={() => {
                                setPaymentType('CARD');
                                setSelectedCardId(c.id);
                                setActiveMenu(null);
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={styles.menuItemLeft}>
                                <View
                                  style={[
                                    styles.menuItemIconBox,
                                    { backgroundColor: (c.color || colors.primary) + '22' },
                                  ]}
                                >
                                  <Ionicons name="card" size={18} color={c.color || colors.primary} />
                                </View>
                                <View>
                                  <Text style={styles.menuItemTitle}>{c.name}</Text>
                                  <Text style={styles.menuItemSubtitle}>
                                    Limite: {formatCurrency(c.limitCents || 0)} • Final {c.lastFourDigits || '••••'}
                                  </Text>
                                </View>
                              </View>
                              {isSelected && (
                                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                              )}
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </>
                  )}

                  {/* CASO 2: CONTA DE DESTINO DO RECEBIMENTO */}
                  {activeMenu === 'DESTINATION' && (
                    <>
                      <Text style={styles.menuSectionTitle}>CONTAS PARA CRÉDITO</Text>
                      {accounts.map((acc) => {
                        const isSelected = selectedAccountId === acc.id;
                        return (
                          <TouchableOpacity
                            key={acc.id}
                            style={[styles.menuItem, isSelected && styles.menuItemSelected]}
                            onPress={() => {
                              setSelectedAccountId(acc.id);
                              setActiveMenu(null);
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.menuItemLeft}>
                              <View
                                style={[
                                  styles.menuItemIconBox,
                                  { backgroundColor: (acc.color || colors.income) + '22' },
                                ]}
                              >
                                <Ionicons name="wallet" size={18} color={acc.color || colors.income} />
                              </View>
                              <View>
                                <Text style={styles.menuItemTitle}>{acc.name}</Text>
                                <Text style={styles.menuItemSubtitle}>
                                  Saldo: {formatCurrency(acc.currentBalanceCents || 0)}
                                </Text>
                              </View>
                            </View>
                            {isSelected && (
                              <Ionicons name="checkmark-circle" size={22} color={colors.income} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </>
                  )}

                  {/* CASO 3: CATEGORIAS / OPÇÕES DE RECEBIMENTO OU DESPESA */}
                  {activeMenu === 'CATEGORY' && (
                    <>
                      {/* FORMULÁRIO DE CRIAÇÃO RÁPIDA DE NOVA OPÇÃO */}
                      <View style={styles.createOptionBox}>
                        <Text style={styles.createOptionTitle}>
                          {type === 'INCOME'
                            ? '+ Criar Nova Opção de Recebimento'
                            : '+ Criar Nova Categoria de Despesa'}
                        </Text>
                        <View style={styles.createOptionRow}>
                          <TextInput
                            style={styles.createOptionInput}
                            placeholder={
                              type === 'INCOME'
                                ? 'Ex: Aluguel, Pensão, Bônus...'
                                : 'Ex: Manutenção, Livros, Pets...'
                            }
                            placeholderTextColor={colors.textMuted}
                            value={newOptionName}
                            onChangeText={setNewOptionName}
                          />
                          <TouchableOpacity
                            style={[
                              styles.createOptionBtn,
                              { backgroundColor: type === 'INCOME' ? colors.income : colors.primary },
                            ]}
                            onPress={handleCreateCategory}
                            disabled={creatingOption}
                            activeOpacity={0.8}
                          >
                            {creatingOption ? (
                              <ActivityIndicator size="small" color={colors.textInverse} />
                            ) : (
                              <Text style={styles.createOptionBtnText}>Criar</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>

                      <Text style={styles.menuSectionTitle}>
                        {type === 'INCOME' ? 'OPÇÕES DISPONÍVEIS' : 'CATEGORIAS DISPONÍVEIS'}
                      </Text>

                      {currentCategories.map((cat) => {
                        const isSelected = selectedCategoryId === cat.id;
                        const iconName = CATEGORY_ICONS[cat.name] || (type === 'INCOME' ? 'cash' : 'pricetag');
                        const themeColor = type === 'INCOME' ? colors.income : colors.expense;
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            style={[styles.menuItem, isSelected && styles.menuItemSelected]}
                            onPress={() => {
                              setSelectedCategoryId(cat.id);
                              setActiveMenu(null);
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.menuItemLeft}>
                              <View
                                style={[
                                  styles.menuItemIconBox,
                                  { backgroundColor: (cat.color || themeColor) + '22' },
                                ]}
                              >
                                <Ionicons
                                  name={iconName}
                                  size={18}
                                  color={cat.color || themeColor}
                                />
                              </View>
                              <Text style={styles.menuItemTitle}>{cat.name}</Text>
                            </View>
                            {isSelected && (
                              <Ionicons
                                name="checkmark-circle"
                                size={22}
                                color={themeColor}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </>
                  )}
                </ScrollView>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
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
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    gap: 6,
  },
  typeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  typeTabExpenseActive: {
    backgroundColor: colors.expenseGhost,
    borderWidth: 1,
    borderColor: colors.expense,
  },
  typeTabIncomeActive: {
    backgroundColor: colors.incomeGhost,
    borderWidth: 1,
    borderColor: colors.income,
  },
  typeTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  currencyPrefix: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textSecondary,
    marginRight: 6,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: '900',
    minWidth: 120,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    color: colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  inputMultiline: {
    height: 60,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  // ESTILOS DO SELETOR QUE ABRE MENU
  selectorField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  selectorIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorTextBox: {
    flex: 1,
  },
  selectorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  selectorSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  saveBtn: {
    marginTop: 8,
    marginBottom: 20,
  },
  // ESTILOS DO MENU OVERLAY
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'flex-end',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  menuContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  menuCloseBtn: {
    padding: 6,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
  },
  menuList: {
    marginBottom: 8,
  },
  menuSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    marginBottom: 8,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  menuItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGhost,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuItemIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  menuItemSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  menuEmptyCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  menuEmptyText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  // CRIAÇÃO RÁPIDA DE OPÇÕES
  createOptionBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  createOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  createOptionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  createOptionInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    color: colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.border,
  },
  createOptionBtn: {
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createOptionBtnText: {
    color: colors.textInverse,
    fontWeight: '800',
    fontSize: 13,
  },
  // AUTOMAÇÃO & PARCELAMENTO
  automationRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  automationPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: colors.borderHighlight,
  },
  automationPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGhost,
  },
  automationPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  automationPillTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  subConfigBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  subConfigHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  subConfigDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    flex: 1,
  },
  subConfigInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  subConfigLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  dayInput: {
    width: 64,
    height: 40,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  quickDaysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  quickDayChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickDayChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGhost,
  },
  quickDayText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  quickDayTextActive: {
    color: colors.primary,
    fontWeight: '900',
  },
  installmentsScroll: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 8,
  },
  installmentChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  installmentChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGhost,
  },
  installmentChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  installmentChipTextActive: {
    color: colors.primary,
    fontWeight: '900',
  },
  installmentCalcText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
  },
});
