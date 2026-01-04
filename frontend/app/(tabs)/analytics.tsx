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

// Custom Pie Chart Component
function SimplePieChart({ data, total, currencySymbol, theme }: { 
  data: CategoryData[]; 
  total: number;
  currencySymbol: string;
  theme: any;
}) {
  const size = 200;
  const strokeWidth = 30;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  
  let currentOffset = 0;

  return (
    <View style={styles.pieContainer}>
      <View style={{ width: size, height: size, position: 'relative' }}>
        <View style={[styles.pieCenter, { top: center - 30, left: center - 50 }]}>
          <Text style={[styles.pieCenterValue, { color: theme.text }]}>
            {currencySymbol}{total.toFixed(0)}
          </Text>
          <Text style={[styles.pieCenterLabel, { color: theme.textSecondary }]}>
            Total
          </Text>
        </View>
        {data.map((item, index) => {
          const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
          const rotation = (currentOffset / 100) * 360 - 90;
          currentOffset += item.percentage;
          
          return (
            <View
              key={item.category}
              style={{
                position: 'absolute',
                width: size,
                height: size,
                transform: [{ rotate: `${rotation}deg` }],
              }}
            >
              <View
                style={{
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  borderWidth: strokeWidth,
                  borderColor: 'transparent',
                  borderTopColor: getCategoryColor(item.category),
                  borderRightColor: item.percentage > 25 ? getCategoryColor(item.category) : 'transparent',
                  borderBottomColor: item.percentage > 50 ? getCategoryColor(item.category) : 'transparent',
                  borderLeftColor: item.percentage > 75 ? getCategoryColor(item.category) : 'transparent',
                }}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

// Simple Bar Chart Component
function SimpleBarChart({ data, theme, currencySymbol }: { 
  data: DailyData[]; 
  theme: any;
  currencySymbol: string;
}) {
  if (data.length === 0) return null;
  
  const maxValue = Math.max(...data.map(d => d.amount)) * 1.2 || 100;
  const barWidth = Math.min(24, (screenWidth - 80) / data.length - 4);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.barChartContainer}>
        <View style={styles.barsContainer}>
          {data.map((item, index) => (
            <View key={item.day} style={styles.barWrapper}>
              <View style={[styles.barBackground, { backgroundColor: theme.surfaceVariant }]}>
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
              <Text style={[styles.barLabel, { color: theme.textSecondary }]}>{item.day}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

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

            {/* Category Breakdown */}
            <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.chartTitle, { color: theme.text }]}>Spending by Category</Text>
              
              {/* Category List with Progress Bars */}
              <View style={styles.categoryList}>
                {summary?.category_data?.map((item) => (
                  <View key={item.category} style={styles.categoryItem}>
                    <View style={styles.categoryHeader}>
                      <View style={styles.categoryInfo}>
                        <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(item.category) }]} />
                        <Text style={[styles.categoryName, { color: theme.text }]}>{item.category}</Text>
                      </View>
                      <Text style={[styles.categoryAmount, { color: theme.text }]}>
                        {currencySymbol}{item.amount.toFixed(0)} ({item.percentage}%)
                      </Text>
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: theme.surfaceVariant }]}>
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
            </View>

            {/* Daily Spending */}
            {summary?.daily_data && summary.daily_data.length > 0 && (
              <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.chartTitle, { color: theme.text }]}>Daily Spending</Text>
                <SimpleBarChart data={summary.daily_data} theme={theme} currencySymbol={currencySymbol} />
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
    position: 'absolute',
    width: 100,
    alignItems: 'center',
  },
  pieCenterValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  pieCenterLabel: {
    fontSize: 12,
  },
  categoryList: {
    gap: 16,
  },
  categoryItem: {
    gap: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  barChartContainer: {
    paddingVertical: 16,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 150,
    gap: 8,
  },
  barWrapper: {
    alignItems: 'center',
  },
  barBackground: {
    height: 120,
    width: 24,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 4,
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
