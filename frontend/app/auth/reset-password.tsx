import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

import { useTheme } from "../../src/contexts/ThemeContext";
import { Button } from "../../src/components/Button";
import { api } from "../../src/services/api";

export default function ResetPasswordScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid or expired reset link.");
    }
  }, [token]);

  const validate = () => {
    if (!password) {
      setError("Password is required");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleReset = async () => {
    if (!token) return;
    if (!validate()) return;

    setLoading(true);
    setError(null);

    try {
      await api.post("/auth/reset-password", {
        token,
        new_password: password,
      });

      setSuccess(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Reset failed. Please request a new link."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View
              style={[styles.iconContainer, { backgroundColor: theme.primary }]}
            >
              <MaterialIcons name="lock" size={40} color="#fff" />
            </View>

            <Text style={[styles.title, { color: theme.text }]}>
              Reset Password
            </Text>

            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Enter your new password below.
            </Text>
          </View>

          {!success ? (
            <View style={styles.form}>
              {/* New Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>
                  New Password
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: theme.surface,
                      borderColor: error ? theme.error : theme.border,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="lock-outline"
                    size={20}
                    color={theme.textTertiary}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Enter new password"
                    placeholderTextColor={theme.textTertiary}
                    secureTextEntry
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (error) setError(null);
                    }}
                  />
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>
                  Confirm Password
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: theme.surface,
                      borderColor: error ? theme.error : theme.border,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="lock"
                    size={20}
                    color={theme.textTertiary}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Confirm new password"
                    placeholderTextColor={theme.textTertiary}
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (error) setError(null);
                    }}
                  />
                </View>
              </View>

              {error && (
                <Text style={[styles.errorText, { color: theme.error }]}>
                  {error}
                </Text>
              )}

              <Button
                title="Reset Password"
                onPress={handleReset}
                loading={loading}
                disabled={loading || !token}
              />
            </View>
          ) : (
            <View style={styles.successBox}>
              <MaterialIcons
                name="check-circle"
                size={64}
                color={theme.primary}
              />
              <Text style={[styles.successTitle, { color: theme.text }]}>
                Password Updated 🎉
              </Text>
              <Text
                style={[styles.successText, { color: theme.textSecondary }]}
              >
                Your password has been successfully changed.
              </Text>

              <Button
                title="Go to Login"
                onPress={() => router.replace("/auth/login")}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 8,
  },
  successBox: {
    alignItems: "center",
    gap: 12,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  successText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
});
