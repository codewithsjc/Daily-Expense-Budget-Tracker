import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { EmptyState } from '../../src/components/EmptyState';
import { getCategoryColor, getCurrencySymbol } from '../../src/constants/categories';
import api from '../../src/services/api';

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

const { width: screenWidth } = Dimensions.get('window');

export default function AnalyticsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const currencySymbol = getCurrencySymbol(user?.currency || 'USD');

  const fetchAnalytics = async () => {
    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      const response = await api.get(`/analytics/summary?month=${month}&year=${year}`);
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
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
    setSelectedMonth(newDate);
  };

  const pieData = summary?.category_data?.map((item) => ({
    value: item.amount,
    color: getCategoryColor(item.category),
    text: `${item.percentage}%`,
    label: item.category,
  })) || [];

  const barData = summary?.daily_data?.map((item) => ({
    value: item.amount,
    label: item.day.toString(),
    frontColor: theme.primary,
  })) || [];

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <LoadingSpinner fullScreen message="Loading analytics..." />
      </SafeAreaView>
    );
  }

  const hasData = summary && summary.expense_count > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Analytics</Text>
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
        </View>

        {!hasData ? (
          <EmptyState
            icon="insights"
            title="No data to analyze"
            message="Add some expenses to see your spending analytics"
          />
        ) : (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryCards}>
              <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Total Spent</Text>
                <Text style={[styles.summaryValue, { color: theme.error }]}>
                  {currencySymbol}{summary?.total_spent.toFixed(2)}
                </Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Transactions</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>
                  {summary?.expense_count}
                </Text>
              </View>
            </View>

            {/* Highest Spending Category */}
            {summary?.highest_category && (
              <View style={[styles.highlightCard, { backgroundColor: getCategoryColor(summary.highest_category) + '20' }]}>
                <View style={styles.highlightContent}>
                  <MaterialIcons name="trending-up" size={28} color={getCategoryColor(summary.highest_category)} />
                  <View style={styles.highlightText}>
                    <Text style={[styles.highlightLabel, { color: theme.textSecondary }]}>
                      Highest Spending Category
                    </Text>
                    <Text style={[styles.highlightCategory, { color: theme.text }]}>
                      {summary.highest_category}
                    </Text>
                    <Text style={[styles.highlightAmount, { color: getCategoryColor(summary.highest_category) }]}>
                      {currencySymbol}{summary.highest_category_amount.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Pie Chart Section */}
            <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.chartTitle, { color: theme.text }]}>Spending by Category</Text>
              <View style={styles.pieContainer}>
                <PieChart
                  data={pieData}
                  donut
                  radius={100}
                  innerRadius={60}
                  centerLabelComponent={() => (
                    <View style={styles.pieCenter}>
                      <Text style={[styles.pieCenterValue, { color: theme.text }]}>
                        {currencySymbol}{summary?.total_spent.toFixed(0)}
                      </Text>
                      <Text style={[styles.pieCenterLabel, { color: theme.textSecondary }]}>
                        Total
                      </Text>
                    </View>
                  )}
                />
              </View>
              {/* Legend */}
              <View style={styles.legend}>
                {summary?.category_data?.map((item) => (
                  <View key={item.category} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: getCategoryColor(item.category) }]} />
                    <Text style={[styles.legendText, { color: theme.text }]}>{item.category}</Text>
                    <Text style={[styles.legendAmount, { color: theme.textSecondary }]}>
                      {currencySymbol}{item.amount.toFixed(0)} ({item.percentage}%)
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Bar Chart Section */}
            {barData.length > 0 && (
              <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.chartTitle, { color: theme.text }]}>Daily Spending</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <BarChart
                    data={barData}
                    barWidth={24}
                    spacing={12}
                    roundedTop
                    xAxisThickness={1}
                    yAxisThickness={0}
                    xAxisColor={theme.border}
                    yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                    noOfSections={4}
                    maxValue={Math.max(...barData.map(d => d.value)) * 1.2 || 100}
                    height={180}
                    width={Math.max(barData.length * 40, screenWidth - 80)}
                  />
                </ScrollView>
              </View>
            )}

            {/* Ad Placeholder */}
            <View style={[styles.adPlaceholder, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
              <MaterialIcons name="ad-units" size={24} color={theme.textTertiary} />
              <Text style={[styles.adText, { color: theme.textTertiary }]}>Ad Space (Premium removes ads)</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
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
  },
  monthArrow: {
    padding: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  highlightCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  highlightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  highlightText: {
    flex: 1,
  },
  highlightLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  highlightCategory: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  highlightAmount: {
    fontSize: 20,
    fontWeight: '700',
  },
  chartCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  pieContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  pieCenter: {
    alignItems: 'center',
  },
  pieCenterValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  pieCenterLabel: {
    fontSize: 12,
  },
  legend: {
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  legendText: {
    flex: 1,
    fontSize: 14,
  },
  legendAmount: {
    fontSize: 14,
    fontWeight: '500',
  },
  adPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  adText: {
    fontSize: 12,
  },
});
