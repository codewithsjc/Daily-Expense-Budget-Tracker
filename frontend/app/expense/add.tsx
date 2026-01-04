import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { Button } from '../../src/components/Button';
import { EXPENSE_CATEGORIES, getCurrencySymbol } from '../../src/constants/categories';
import api from '../../src/services/api';

export default function AddExpenseScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const currencySymbol = getCurrencySymbol(user?.currency || 'USD');

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    if (!category) {
      Alert.alert('Select Category', 'Please select a category');
      return;
    }

    setLoading(true);
    try {
      await api.post('/expenses', {
        amount: parseFloat(amount),
        category,
        date: date.toISOString(),
        notes: notes.trim(),
      });
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const adjustDate = (days: number) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    if (newDate <= new Date()) {
      setDate(newDate);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Add Expense</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Amount Input */}
          <View style={styles.amountSection}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Amount</Text>
            <View style={[styles.amountContainer, { backgroundColor: theme.card }]}>
              <Text style={[styles.currencySymbol, { color: theme.primary }]}>{currencySymbol}</Text>
              <TextInput
                style={[styles.amountInput, { color: theme.text }]}
                placeholder="0.00"
                placeholderTextColor={theme.textTertiary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
          </View>

          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Category</Text>
            <View style={styles.categoryGrid}>
              {EXPENSE_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.name}
                  style={[
                    styles.categoryItem,
                    { backgroundColor: theme.card },
                    category === cat.name && { borderWidth: 2, borderColor: cat.color },
                  ]}
                  onPress={() => setCategory(cat.name)}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                    <MaterialIcons name={cat.icon as any} size={24} color={cat.color} />
                  </View>
                  <Text style={[styles.categoryName, { color: theme.text }]}>{cat.name}</Text>
                  {category === cat.name && (
                    <View style={[styles.checkMark, { backgroundColor: cat.color }]}>
                      <MaterialIcons name="check" size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date Selection */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Date</Text>
            <View style={styles.dateContainer}>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: theme.card }]}
                onPress={() => adjustDate(-1)}
              >
                <MaterialIcons name="chevron-left" size={24} color={theme.primary} />
              </TouchableOpacity>
              <View style={[styles.dateDisplay, { backgroundColor: theme.card }]}>
                <MaterialIcons name="event" size={20} color={theme.primary} />
                <Text style={[styles.dateText, { color: theme.text }]}>
                  {format(date, 'EEEE, MMM d, yyyy')}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  { backgroundColor: theme.card },
                  date.toDateString() === new Date().toDateString() && { opacity: 0.5 },
                ]}
                onPress={() => adjustDate(1)}
                disabled={date.toDateString() === new Date().toDateString()}
              >
                <MaterialIcons name="chevron-right" size={24} color={theme.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.quickDates}>
              <TouchableOpacity
                style={[
                  styles.quickDateButton,
                  { backgroundColor: date.toDateString() === new Date().toDateString() ? theme.primary : theme.card },
                ]}
                onPress={() => setDate(new Date())}
              >
                <Text style={[styles.quickDateText, { color: date.toDateString() === new Date().toDateString() ? '#fff' : theme.text }]}>
                  Today
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.quickDateButton,
                  {
                    backgroundColor:
                      date.toDateString() === new Date(Date.now() - 86400000).toDateString()
                        ? theme.primary
                        : theme.card,
                  },
                ]}
                onPress={() => setDate(new Date(Date.now() - 86400000))}
              >
                <Text style={[
                  styles.quickDateText,
                  {
                    color:
                      date.toDateString() === new Date(Date.now() - 86400000).toDateString()
                        ? '#fff'
                        : theme.text,
                  },
                ]}>
                  Yesterday
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Notes (optional)</Text>
            <TextInput
              style={[
                styles.notesInput,
                { backgroundColor: theme.card, color: theme.text, borderColor: theme.border },
              ]}
              placeholder="Add a note..."
              placeholderTextColor={theme.textTertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Save Button */}
          <Button title="Add Expense" onPress={handleSave} loading={loading} style={{ marginTop: 24 }} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 44,
  },
  scrollContent: {
    padding: 20,
  },
  amountSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '600',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 40,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryItem: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500',
  },
  checkMark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    gap: 8,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '500',
  },
  quickDates: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  quickDateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  quickDateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  notesInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    borderWidth: 1,
  },
});
