import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { api, formatCurrency } from '../services/api';
import { NewCardModal } from '../components/NewCardModal';

export function CardsScreen({ user }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cards, setCards] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const crds = await api.getCards(user.id);
      setCards(crds);
    } catch (err) {
      console.warn('Erro ao carregar cartões:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTitleBox}>
            <Text style={styles.title}>Cartões de Crédito</Text>
            <Text style={styles.subtitle}>Gerencie limites, fechamento e faturas</Text>
          </View>

          <TouchableOpacity
            style={styles.addCardBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color={colors.textInverse} />
            <Text style={styles.addCardBtnText}>Novo Cartão</Text>
          </TouchableOpacity>
        </View>

        {cards.length === 0 && !loading ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="card-outline" size={44} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nenhum cartão cadastrado</Text>
            <Text style={styles.emptySubtitle}>
              Cadastre seus cartões de crédito para controlar limites, faturas e lançamentos diretamente pelo app.
            </Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.emptyAddBtnText}>Cadastrar Primeiro Cartão</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          cards.map((card) => {
            const limit = Number(card.limitCents || 0);
            return (
              <Card key={card.id} style={[styles.cardContainer, { borderColor: card.color || colors.primary }]} elevated>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardName}>{card.name}</Text>
                    <Text style={styles.cardInstitution}>{card.institution}</Text>
                  </View>
                  <Ionicons name="card" size={28} color={card.color || colors.primary} />
                </View>

                <View style={styles.cardChipRow}>
                  <View style={styles.cardChip} />
                  <Text style={styles.cardNumber}>•••• {card.lastFourDigits || '••••'}</Text>
                </View>

                <View style={styles.cardDetailsRow}>
                  <View>
                    <Text style={styles.cardDetailLabel}>Limite Total</Text>
                    <Text style={styles.cardDetailValue}>{formatCurrency(limit)}</Text>
                  </View>
                  <View style={styles.datesBox}>
                    <Text style={styles.cardDetailLabel}>Fecha dia {card.closingDay}</Text>
                    <Text style={styles.cardDetailLabel}>Vence dia {card.dueDay}</Text>
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* FAB Adicionar Cartão */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      {/* Modal Cadastro de Novo Cartão */}
      <NewCardModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={() => loadData()}
        user={user}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitleBox: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addCardBtnText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '800',
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryGhost,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  emptyAddBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  cardContainer: {
    marginBottom: 16,
    padding: 20,
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  cardInstitution: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  cardChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  cardChip: {
    width: 34,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  cardDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.borderHighlight,
    paddingTop: 14,
  },
  cardDetailLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  cardDetailValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  datesBox: {
    alignItems: 'flex-end',
    gap: 2,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 10,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
