import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { getCategoryColor, getCategoryIcon, getCurrencySymbol } from '../../src/constants/categories';
import api from '../../src/services/api';

interface Expense {
  id: string;
  amount: number;
  category: string;
  date: string;
  notes: string;
}

export default function ExpensesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [monthlyTotal, setMonthlyTotal] = useState(0);

  const currencySymbol = getCurrencySymbol(user?.currency || 'USD');

  const fetchExpenses = async () => {
    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      const response = await api.get(`/expenses?month=${month}&year=${year}`);
      setExpenses(response.data);
      
      const total = response.data.reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
      setMonthlyTotal(total);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load expenses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchExpenses();
    }, [selectedMonth])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpenses();
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + delta);
    setSelectedMonth(newDate);
    setLoading(true);
  };

  const handleDeleteExpense = (expense: Expense) => {
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete this ${expense.category} expense?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/expenses/${expense.id}`);
              fetchExpenses();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  const renderExpenseItem = ({ item }: { item: Expense }) => (
    <TouchableOpacity
      style={[styles.expenseCard, { backgroundColor: theme.card }]}
      onPress={() => router.push(`/expense/edit?id=${item.id}`)}
      onLongPress={() => handleDeleteExpense(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
        <MaterialIcons
          name={getCategoryIcon(item.category) as any}
          size={24}
          color={getCategoryColor(item.category)}
        />
      </View>
      <View style={styles.expenseInfo}>
        <Text style={[styles.expenseCategory, { color: theme.text }]}>{item.category}</Text>
        <Text style={[styles.expenseDate, { color: theme.textSecondary }]}>
          {format(new Date(item.date), 'MMM d, yyyy')}
        </Text>
        {item.notes ? (
          <Text style={[styles.expenseNotes, { color: theme.textTertiary }]} numberOfLines={1}>
            {item.notes}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.expenseAmount, { color: theme.error }]}>
        -{currencySymbol}{item.amount.toFixed(2)}
      </Text>
    </TouchableOpacity>
  );

  const groupedExpenses = expenses.reduce((groups: { [key: string]: Expense[] }, expense) => {
    const date = format(new Date(expense.date), 'yyyy-MM-dd');
    if (!groups[date]) groups[date] = [];
    groups[date].push(expense);
    return groups;
  }, {});

  const sections = Object.keys(groupedExpenses)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .map(date => ({
      date,
      expenses: groupedExpenses[date],
      total: groupedExpenses[date].reduce((sum, exp) => sum + exp.amount, 0),
    }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Expenses</Text>
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthArrow}>
            <MaterialIcons name="chevron-left" size={28} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.monthText, { color: theme.text }]}>
            {format(selectedMonth, 'MMMM yyyy')}
          </Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthArrow}>
            <MaterialIcons name="chevron-right" size={28} color={theme.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.totalContainer}>
          <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Total Spent</Text>
          <Text style={[styles.totalAmount, { color: theme.error }]}>
            {currencySymbol}{monthlyTotal.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Expenses List */}
      {loading ? (
        <LoadingSpinner message="Loading expenses..." />
      ) : expenses.length === 0 ? (
        <EmptyState
          icon="receipt"
          title="No expenses yet"
          message="Tap the + button to add your first expense"
        />
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item) => item.date}
          renderItem={({ item: section }) => (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionDate, { color: theme.textSecondary }]}>
                  {format(new Date(section.date), 'EEEE, MMM d')}
                </Text>
                <Text style={[styles.sectionTotal, { color: theme.textSecondary }]}>
                  {currencySymbol}{section.total.toFixed(2)}
                </Text>
              </View>
              {section.expenses.map((expense) => (
                <View key={expense.id}>{renderExpenseItem({ item: expense })}</View>
              ))}
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Button */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: theme.primary }]}
        onPress={() => router.push('/expense/add')}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  monthArrow: {
    padding: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  totalContainer: {
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTotal: {
    fontSize: 14,
    fontWeight: '600',
  },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseInfo: {
    flex: 1,
    marginLeft: 16,
  },
  expenseCategory: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  expenseDate: {
    fontSize: 13,
  },
  expenseNotes: {
    fontSize: 12,
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 17,
    fontWeight: '700',
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
});
