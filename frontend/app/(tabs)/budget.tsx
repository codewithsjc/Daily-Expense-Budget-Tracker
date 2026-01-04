import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { Button } from '../../src/components/Button';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { getCurrencySymbol } from '../../src/constants/categories';
import api from '../../src/services/api';

interface BudgetData {
  id: string;
  amount: number;
  month: number;
  year: number;
}

interface SummaryData {
  total_spent: number;
  budget_amount: number;
  remaining: number;
  budget_status: string;
  expense_count: number;
}

export default function BudgetScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const currencySymbol = getCurrencySymbol(user?.currency || 'USD');
  const month = selectedMonth.getMonth() + 1;
  const year = selectedMonth.getFullYear();

  const fetchBudgetAndSummary = async () => {
    try {
      const [budgetRes, summaryRes] = await Promise.all([
        api.get(`/budgets?month=${month}&year=${year}`),
        api.get(`/analytics/summary?month=${month}&year=${year}`),
      ]);
      
      setBudget(budgetRes.data);
      setSummary(summaryRes.data);
      if (budgetRes.data) {
        setBudgetInput(budgetRes.data.amount.toString());
      } else {
        setBudgetInput('');
      }
    } catch (error) {
      console.error('Error fetching budget:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchBudgetAndSummary();
    }, [month, year])
  );

  const changeMonth = (delta: number) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + delta);
    setSelectedMonth(newDate);
    setIsEditing(false);
  };

  const handleSaveBudget = async () => {
    const amount = parseFloat(budgetInput);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid budget amount');
      return;
    }

    setSaving(true);
    try {
      await api.post('/budgets', { amount, month, year });
      await fetchBudgetAndSummary();
      setIsEditing(false);
      Alert.alert('Success', 'Budget saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save budget');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'exceeded': return theme.error;
      case 'warning': return theme.warning;
      case 'good': return theme.success;
      default: return theme.textTertiary;
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'exceeded': return 'Budget Exceeded!';
      case 'warning': return 'Almost at limit!';
      case 'good': return 'On track';
      default: return 'No budget set';
    }
  };

  const getProgressPercentage = () => {
    if (!summary || !summary.budget_amount) return 0;
    return Math.min((summary.total_spent / summary.budget_amount) * 100, 100);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <LoadingSpinner fullScreen message="Loading budget..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Budget</Text>
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

          {/* Budget Card */}
          <View style={[styles.budgetCard, { backgroundColor: theme.card }]}>
            {!budget || isEditing ? (
              // Budget Input
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  {budget ? 'Update Monthly Budget' : 'Set Monthly Budget'}
                </Text>
                <View style={[styles.inputContainer, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                  <Text style={[styles.currencySymbol, { color: theme.text }]}>{currencySymbol}</Text>
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="0.00"
                    placeholderTextColor={theme.textTertiary}
                    value={budgetInput}
                    onChangeText={setBudgetInput}
                    keyboardType="decimal-pad"
                    autoFocus={isEditing}
                  />
                </View>
                <View style={styles.buttonRow}>
                  {isEditing && (
                    <Button
                      title="Cancel"
                      variant="outline"
                      onPress={() => {
                        setIsEditing(false);
                        setBudgetInput(budget?.amount.toString() || '');
                      }}
                      style={{ flex: 1, marginRight: 8 }}
                    />
                  )}
                  <Button
                    title={budget ? 'Update Budget' : 'Set Budget'}
                    onPress={handleSaveBudget}
                    loading={saving}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            ) : (
              // Budget Display
              <View style={styles.budgetDisplay}>
                <View style={styles.budgetHeader}>
                  <View>
                    <Text style={[styles.budgetLabel, { color: theme.textSecondary }]}>Monthly Budget</Text>
                    <Text style={[styles.budgetAmount, { color: theme.text }]}>
                      {currencySymbol}{budget.amount.toLocaleString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: theme.surfaceVariant }]}
                    onPress={() => setIsEditing(true)}
                  >
                    <MaterialIcons name="edit" size={20} color={theme.primary} />
                  </TouchableOpacity>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressSection}>
                  <View style={[styles.progressBar, { backgroundColor: theme.surfaceVariant }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${getProgressPercentage()}%`,
                          backgroundColor: getStatusColor(summary?.budget_status || 'no_budget'),
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.progressInfo}>
                    <Text style={[styles.spentText, { color: theme.text }]}>
                      {currencySymbol}{summary?.total_spent.toLocaleString() || 0} spent
                    </Text>
                    <Text style={[styles.remainingText, { color: getStatusColor(summary?.budget_status || 'no_budget') }]}>
                      {(summary?.remaining || 0) >= 0
                        ? `${currencySymbol}${summary?.remaining.toLocaleString() || 0} remaining`
                        : `${currencySymbol}${Math.abs(summary?.remaining || 0).toLocaleString()} over budget`}
                    </Text>
                  </View>
                </View>

                {/* Status Badge */}
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(summary?.budget_status || 'no_budget') + '20' }
                ]}>
                  <MaterialIcons
                    name={summary?.budget_status === 'exceeded' ? 'error' : summary?.budget_status === 'warning' ? 'warning' : 'check-circle'}
                    size={20}
                    color={getStatusColor(summary?.budget_status || 'no_budget')}
                  />
                  <Text style={[styles.statusText, { color: getStatusColor(summary?.budget_status || 'no_budget') }]}>
                    {getStatusMessage(summary?.budget_status || 'no_budget')}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Summary Cards */}
          <View style={styles.summarySection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Summary</Text>
            <View style={styles.summaryCards}>
              <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
                <MaterialIcons name="receipt" size={24} color={theme.primary} />
                <Text style={[styles.summaryValue, { color: theme.text }]}>
                  {summary?.expense_count || 0}
                </Text>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Transactions</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
                <MaterialIcons name="trending-up" size={24} color={theme.error} />
                <Text style={[styles.summaryValue, { color: theme.text }]}>
                  {currencySymbol}{summary?.total_spent?.toFixed(0) || 0}
                </Text>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Total Spent</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
                <MaterialIcons name="savings" size={24} color={theme.success} />
                <Text style={[styles.summaryValue, { color: theme.text }]}>
                  {(summary?.remaining || 0) >= 0
                    ? `${currencySymbol}${summary?.remaining?.toFixed(0) || 0}`
                    : `-${currencySymbol}${Math.abs(summary?.remaining || 0).toFixed(0)}`}
                </Text>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Remaining</Text>
              </View>
            </View>
          </View>

          {/* Tips */}
          <View style={[styles.tipsCard, { backgroundColor: theme.primary + '15' }]}>
            <MaterialIcons name="lightbulb" size={24} color={theme.primary} />
            <Text style={[styles.tipsText, { color: theme.text }]}>
              {summary?.budget_status === 'exceeded'
                ? 'Consider reviewing your spending categories to identify areas for savings.'
                : summary?.budget_status === 'warning'
                ? "You're close to your budget limit. Monitor your spending carefully."
                : budget
                ? "Great job staying within your budget! Keep up the good work."
                : "Set a monthly budget to track your spending and reach your financial goals."}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
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
  budgetCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  inputSection: {
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 64,
    width: '100%',
    marginBottom: 20,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '600',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 28,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
  },
  budgetDisplay: {},
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  budgetLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  budgetAmount: {
    fontSize: 32,
    fontWeight: '700',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    marginBottom: 20,
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  spentText: {
    fontSize: 14,
    fontWeight: '500',
  },
  remainingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  summarySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  tipsCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  tipsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
