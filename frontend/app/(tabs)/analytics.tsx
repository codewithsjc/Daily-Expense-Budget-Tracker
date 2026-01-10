import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { format } from "date-fns";

import { useTheme } from "../../src/contexts/ThemeContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { LoadingSpinner } from "../../src/components/LoadingSpinner";
import { EmptyState } from "../../src/components/EmptyState";
import {
  getCategoryColor,
  getCurrencySymbol,
} from "../../src/constants/categories";
import { api } from "../../src/services/api";

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
}

interface DailyData {
  day: number;
  amount: number;
}

interface SummaryData {
  total_spent: number;
  budget_amount: number;
  remaining: number;
  budget_status: string;
  expense_count: number;
  highest_category: string | null;
  highest_category_amount: number;
  category_data: CategoryData[];
  daily_data: DailyData[];
}

const { width: screenWidth } = Dimensions.get("window");

/* ================= BAR CHART ================= */

function SimpleBarChart({ data, theme }: { data: DailyData[]; theme: any }) {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.amount), 1);
  const barWidth = Math.min(24, (screenWidth - 80) / data.length);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.barsContainer}>
        {data.map((item) => (
          <View key={item.day} style={styles.barWrapper}>
            <View
              style={[
                styles.barBackground,
                { backgroundColor: theme.surfaceVariant },
              ]}
            >
              <View
                style={[
                  styles.bar,
                  {
                    backgroundColor: theme.primary,
                    height: `${(item.amount / maxValue) * 100}%`,
                    width: barWidth,
                  },
                ]}
              />
            </View>
            <Text style={[styles.barLabel, { color: theme.textSecondary }]}>
              {item.day}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

/* ================= SCREEN ================= */

export default function AnalyticsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const currency = getCurrencySymbol(user?.currency || "USD");

  const fetchAnalytics = async () => {
    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();

      const response = await api.get(
        `/analytics/summary?month=${month}&year=${year}`
      );
      setSummary(response.data);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchAnalytics();
    }, [selectedMonth])
  );

  const changeMonth = (delta: number) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + delta);

    // Prevent future months
    if (newDate > new Date()) return;

    setSelectedMonth(newDate);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <LoadingSpinner fullScreen message="Loading analytics..." />
      </SafeAreaView>
    );
  }

  if (!summary || summary.expense_count === 0) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <EmptyState
          icon="insights"
          title="No data yet"
          message="Add expenses to see analytics"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Analytics</Text>

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
        </View>

        {/* SUMMARY */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Total Spent
          </Text>
          <Text style={[styles.amount, { color: theme.error }]}>
            {currency}
            {summary.total_spent.toFixed(2)}
          </Text>
          <Text style={{ color: theme.textSecondary }}>
            {summary.expense_count} transactions
          </Text>
        </View>

        {/* CATEGORY BREAKDOWN */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Spending by Category
          </Text>

          {summary.category_data.map((item) => (
            <View key={item.category} style={{ marginBottom: 14 }}>
              <View style={styles.categoryRow}>
                <Text style={{ color: theme.text }}>{item.category}</Text>
                <Text style={{ color: theme.textSecondary }}>
                  {currency}
                  {item.amount.toFixed(0)} ({item.percentage}%)
                </Text>
              </View>

              <View
                style={[
                  styles.progressBar,
                  { backgroundColor: theme.surfaceVariant },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${item.percentage}%`,
                      backgroundColor: getCategoryColor(item.category),
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        {/* DAILY */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Daily Spending
          </Text>
          <SimpleBarChart data={summary.daily_data} theme={theme} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  header: { marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 12 },

  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  monthText: { fontSize: 18, fontWeight: "600" },

  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },

  label: { fontSize: 14 },
  amount: { fontSize: 28, fontWeight: "700", marginVertical: 8 },

  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 16 },

  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },

  barsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 150,
    gap: 8,
  },
  barWrapper: { alignItems: "center" },
  barBackground: {
    height: 120,
    width: 24,
    borderRadius: 4,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  bar: { borderRadius: 4 },
  barLabel: { fontSize: 10, marginTop: 4 },
});
