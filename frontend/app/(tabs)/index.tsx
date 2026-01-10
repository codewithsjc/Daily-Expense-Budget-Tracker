import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { format } from "date-fns";
import { Swipeable } from "react-native-gesture-handler";

import { useTheme } from "../../src/contexts/ThemeContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { EmptyState } from "../../src/components/EmptyState";
import { LoadingSpinner } from "../../src/components/LoadingSpinner";
import {
  getCategoryColor,
  getCategoryIcon,
  getCurrencySymbol,
} from "../../src/constants/categories";
import api from "../../src/services/api";

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

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showActions, setShowActions] = useState(false);

  const currencySymbol = getCurrencySymbol(user?.currency || "USD");

  /* ================= FETCH ================= */

  const fetchExpenses = async () => {
    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();

      const response = await api.get(`/expenses?month=${month}&year=${year}`);

      setExpenses(response.data);

      const total = response.data.reduce(
        (sum: number, e: Expense) => sum + e.amount,
        0
      );
      setMonthlyTotal(total);
    } catch {
      Alert.alert("Error", "Failed to load expenses");
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

  /* ================= DELETE ================= */

  const confirmDelete = (expense: Expense) => {
    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this expense?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await api.delete(`/expenses/${expense.id}`);
            setShowActions(false);
            fetchExpenses();
          },
        },
      ]
    );
  };

  /* ================= SWIPE ================= */

  const renderRightActions = (expense: Expense) => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => confirmDelete(expense)}
      activeOpacity={0.8}
    >
      <MaterialIcons name="delete" size={24} color="#fff" />
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  );

  const renderExpenseItem = ({ item }: { item: Expense }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item)}
      overshootRight={false}
    >
      <TouchableOpacity
        style={[styles.expenseCard, { backgroundColor: theme.card }]}
        activeOpacity={0.7}
        onPress={() => {
          setSelectedExpense(item);
          setShowActions(true);
        }}
      >
        <View
          style={[
            styles.categoryIcon,
            { backgroundColor: getCategoryColor(item.category) + "20" },
          ]}
        >
          <MaterialIcons
            name={getCategoryIcon(item.category) as any}
            size={24}
            color={getCategoryColor(item.category)}
          />
        </View>

        <View style={styles.expenseInfo}>
          <Text style={[styles.expenseCategory, { color: theme.text }]}>
            {item.category}
          </Text>
          <Text style={[styles.expenseDate, { color: theme.textSecondary }]}>
            {format(new Date(item.date), "MMM d, yyyy")}
          </Text>
          {!!item.notes && (
            <Text
              style={[styles.expenseNotes, { color: theme.textTertiary }]}
              numberOfLines={1}
            >
              {item.notes}
            </Text>
          )}
        </View>

        <Text style={[styles.expenseAmount, { color: theme.error }]}>
          -{currencySymbol}
          {item.amount.toFixed(2)}
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );

  /* ================= GROUP ================= */

  const groupedExpenses = expenses.reduce((groups: any, expense) => {
    const date = format(new Date(expense.date), "yyyy-MM-dd");
    if (!groups[date]) groups[date] = [];
    groups[date].push(expense);
    return groups;
  }, {});

  const sections = Object.keys(groupedExpenses)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .map((date) => ({
      date,
      expenses: groupedExpenses[date],
      total: groupedExpenses[date].reduce(
        (sum: number, e: Expense) => sum + e.amount,
        0
      ),
    }));

  /* ================= UI ================= */

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Expenses
        </Text>

        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={() => changeMonth(-1)}>
            <MaterialIcons
              name="chevron-left"
              size={28}
              color={theme.primary}
            />
          </TouchableOpacity>

          <Text style={[styles.monthText, { color: theme.text }]}>
            {format(selectedMonth, "MMMM yyyy")}
          </Text>

          <TouchableOpacity onPress={() => changeMonth(1)}>
            <MaterialIcons
              name="chevron-right"
              size={28}
              color={theme.primary}
            />
          </TouchableOpacity>
        </View>

        <Text style={[styles.totalAmount, { color: theme.error }]}>
          {currencySymbol}
          {monthlyTotal.toFixed(2)}
        </Text>
      </View>

      {/* LIST */}
      {loading ? (
        <LoadingSpinner message="Loading expenses..." />
      ) : expenses.length === 0 ? (
        <EmptyState
          icon="receipt"
          title="No expenses yet"
          message="Tap + to add your first expense"
        />
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item) => item.date}
          renderItem={({ item }) => (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={{ color: theme.textSecondary }}>
                  {format(new Date(item.date), "EEEE, MMM d")}
                </Text>
                <Text style={{ color: theme.textSecondary }}>
                  {currencySymbol}
                  {item.total.toFixed(2)}
                </Text>
              </View>

              {item.expenses.map((expense: Expense) => (
                <View key={expense.id}>
                  {renderExpenseItem({ item: expense })}
                </View>
              ))}
            </View>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* ADD BUTTON */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: theme.primary }]}
        onPress={() => router.push("/expense/add")}
      >
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* ACTION MODAL */}
      <Modal transparent visible={showActions} animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowActions(false)}>
          <View style={styles.sheet}>
            <TouchableOpacity
              onPress={() => {
                setShowActions(false);
                router.push(`/expense/edit?id=${selectedExpense?.id}`);
              }}
            >
              <Text style={styles.sheetItem}>✏️ Edit Expense</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => selectedExpense && confirmDelete(selectedExpense)}
            >
              <Text style={[styles.sheetItem, { color: "red" }]}>
                🗑 Delete Expense
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: { padding: 20 },
  headerTitle: { fontSize: 28, fontWeight: "700" },

  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  monthText: { fontSize: 18, fontWeight: "600", marginHorizontal: 12 },
  totalAmount: { fontSize: 32, fontWeight: "700", textAlign: "center" },

  section: { padding: 16 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  expenseCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  expenseInfo: { flex: 1, marginLeft: 16 },
  expenseCategory: { fontSize: 16, fontWeight: "600" },
  expenseDate: { fontSize: 13 },
  expenseNotes: { fontSize: 12 },
  expenseAmount: { fontSize: 17, fontWeight: "700" },

  addButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  deleteAction: {
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    width: 90,
    borderRadius: 16,
    marginVertical: 4,
  },
  deleteText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetItem: {
    fontSize: 18,
    paddingVertical: 14,
  },
});
