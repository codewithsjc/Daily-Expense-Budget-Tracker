import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { CURRENCIES, getCurrencySymbol } from '../../src/constants/categories';
import api from '../../src/services/api';

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, logout, updateUser } = useAuth();
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [isPremium] = useState(false); // Premium feature flag

  const handleCurrencyChange = async (currencyCode: string) => {
    try {
      await api.put('/auth/settings', { currency: currencyCode });
      updateUser({ currency: currencyCode });
      setShowCurrencyPicker(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update currency');
    }
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Data',
      'This will permanently delete all your expenses and budgets. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/data/reset');
              Alert.alert('Success', 'All data has been reset');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset data');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightContent,
    danger = false,
  }: {
    icon: keyof typeof MaterialIcons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightContent?: React.ReactNode;
    danger?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, { backgroundColor: theme.card }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIcon, { backgroundColor: danger ? theme.error + '20' : theme.primary + '20' }]}>
        <MaterialIcons name={icon} size={22} color={danger ? theme.error : theme.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: danger ? theme.error : theme.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>}
      </View>
      {rightContent || (onPress && <MaterialIcons name="chevron-right" size={24} color={theme.textTertiary} />)}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>

        {/* Profile Section */}
        <View style={[styles.profileCard, { backgroundColor: theme.card }]}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'U'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.text }]}>{user?.name}</Text>
            <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>{user?.email}</Text>
          </View>
          {!isPremium && (
            <View style={[styles.freeBadge, { backgroundColor: theme.warning + '20' }]}>
              <Text style={[styles.freeBadgeText, { color: theme.warning }]}>Free</Text>
            </View>
          )}
        </View>

        {/* Preferences */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>PREFERENCES</Text>
        <View style={styles.section}>
          <SettingItem
            icon="palette"
            title="Dark Mode"
            subtitle={isDark ? 'Dark theme enabled' : 'Light theme enabled'}
            rightContent={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#fff"
              />
            }
          />
          <SettingItem
            icon="attach-money"
            title="Currency"
            subtitle={`${user?.currency || 'USD'} (${getCurrencySymbol(user?.currency || 'USD')})`}
            onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
          />
        </View>

        {/* Currency Picker */}
        {showCurrencyPicker && (
          <View style={[styles.currencyPicker, { backgroundColor: theme.card }]}>
            {CURRENCIES.map((currency) => (
              <TouchableOpacity
                key={currency.code}
                style={[
                  styles.currencyItem,
                  user?.currency === currency.code && { backgroundColor: theme.primary + '20' },
                ]}
                onPress={() => handleCurrencyChange(currency.code)}
              >
                <Text style={[styles.currencySymbol, { color: theme.primary }]}>{currency.symbol}</Text>
                <View style={styles.currencyInfo}>
                  <Text style={[styles.currencyCode, { color: theme.text }]}>{currency.code}</Text>
                  <Text style={[styles.currencyName, { color: theme.textSecondary }]}>{currency.name}</Text>
                </View>
                {user?.currency === currency.code && (
                  <MaterialIcons name="check" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Premium */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>PREMIUM</Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.premiumCard, { backgroundColor: theme.primary }]}
            activeOpacity={0.9}
          >
            <View style={styles.premiumContent}>
              <MaterialIcons name="workspace-premium" size={32} color="#fff" />
              <View style={styles.premiumText}>
                <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
                <Text style={styles.premiumSubtitle}>Remove ads, unlock advanced analytics</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Data */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DATA</Text>
        <View style={styles.section}>
          <SettingItem
            icon="delete-forever"
            title="Reset All Data"
            subtitle="Delete all expenses and budgets"
            onPress={handleResetData}
            danger
          />
        </View>

        {/* Account */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ACCOUNT</Text>
        <View style={styles.section}>
          <SettingItem
            icon="logout"
            title="Logout"
            onPress={handleLogout}
            danger
          />
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appName, { color: theme.textSecondary }]}>Expense Tracker</Text>
          <Text style={[styles.appVersion, { color: theme.textTertiary }]}>Version 1.0.0</Text>
        </View>
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
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
  },
  freeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  freeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
  },
  section: {
    marginBottom: 24,
    gap: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  currencyPicker: {
    borderRadius: 12,
    marginTop: -16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    width: 40,
    textAlign: 'center',
  },
  currencyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  currencyCode: {
    fontSize: 15,
    fontWeight: '500',
  },
  currencyName: {
    fontSize: 13,
  },
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
  },
  premiumContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  premiumText: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  premiumSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  appName: {
    fontSize: 14,
    fontWeight: '500',
  },
  appVersion: {
    fontSize: 12,
    marginTop: 4,
  },
});
