import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useTheme } from "../../src/contexts/ThemeContext";
import { Button } from "../../src/components/Button";
import { api } from "../../src/services/api";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setError(null);

    try {
      await api.post("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });

      setSuccess(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Unable to send reset link. Please try again."
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View
              style={[styles.iconContainer, { backgroundColor: theme.primary }]}
            >
              <MaterialIcons name="lock-reset" size={40} color="#fff" />
            </View>

            <Text style={[styles.title, { color: theme.text }]}>
              Forgot Password
            </Text>

            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Enter your registered email and we’ll send you a reset link.
            </Text>
          </View>

          {!success ? (
            <View style={styles.form}>
              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>
                  Email Address
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
                    name="email"
                    size={20}
                    color={theme.textTertiary}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Enter your email"
                    placeholderTextColor={theme.textTertiary}
                    value={email}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onChangeText={(text) => {
                      setEmail(text);
                      if (error) setError(null);
                    }}
                  />
                </View>

                {error && (
                  <Text style={[styles.errorText, { color: theme.error }]}>
                    {error}
                  </Text>
                )}
              </View>

              <Button
                title="Send Reset Link"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
              />

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Text style={[styles.backText, { color: theme.primary }]}>
                  Back to Login
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.successBox}>
              <MaterialIcons
                name="check-circle"
                size={64}
                color={theme.primary}
              />
              <Text style={[styles.successTitle, { color: theme.text }]}>
                Email Sent
              </Text>
              <Text
                style={[styles.successText, { color: theme.textSecondary }]}
              >
                If the email exists, a password reset link has been sent.
              </Text>

              <Button
                title="Back to Login"
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
    marginBottom: 20,
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
    marginTop: 4,
  },
  backButton: {
    marginTop: 20,
    alignItems: "center",
  },
  backText: {
    fontSize: 14,
    fontWeight: "600",
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
