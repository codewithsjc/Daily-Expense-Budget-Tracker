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
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";

import { useTheme } from "../../src/contexts/ThemeContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { Button } from "../../src/components/Button";

export default function SignupScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!name.trim()) newErrors.name = "Name is required";

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Enter a valid email";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validate() || loading) return;

    setLoading(true);
    setApiError(null);

    try {
      await register(email.trim().toLowerCase(), password, name.trim());
      router.replace("/(tabs)");
    } catch (error: any) {
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        "Could not create account";
      setApiError(message);
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
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <View
              style={[styles.iconContainer, { backgroundColor: theme.primary }]}
            >
              <MaterialIcons name="person-add" size={40} color="#fff" />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>
              Create Account
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Start managing your expenses today
            </Text>
          </View>

          {/* FORM */}
          <View style={styles.form}>
            {/* NAME */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                Full Name
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.surface,
                    borderColor: errors.name ? theme.error : theme.border,
                  },
                ]}
              >
                <MaterialIcons
                  name="person"
                  size={20}
                  color={theme.textTertiary}
                />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Enter your name"
                  placeholderTextColor={theme.textTertiary}
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    setApiError(null);
                    if (errors.name) setErrors({ ...errors, name: undefined });
                  }}
                  autoCapitalize="words"
                  autoComplete="name"
                />
              </View>
              {errors.name && (
                <Text style={[styles.errorText, { color: theme.error }]}>
                  {errors.name}
                </Text>
              )}
            </View>

            {/* EMAIL */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Email</Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.surface,
                    borderColor: errors.email ? theme.error : theme.border,
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
                  onChangeText={(text) => {
                    setEmail(text);
                    setApiError(null);
                    if (errors.email)
                      setErrors({ ...errors, email: undefined });
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>
              {errors.email && (
                <Text style={[styles.errorText, { color: theme.error }]}>
                  {errors.email}
                </Text>
              )}
            </View>

            {/* PASSWORD */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                Password
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.surface,
                    borderColor: errors.password ? theme.error : theme.border,
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
                  placeholder="Create a password"
                  placeholderTextColor={theme.textTertiary}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setApiError(null);
                    if (errors.password) {
                      setErrors({ ...errors, password: undefined });
                    }
                  }}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <MaterialIcons
                    name={showPassword ? "visibility" : "visibility-off"}
                    size={20}
                    color={theme.textTertiary}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={[styles.errorText, { color: theme.error }]}>
                  {errors.password}
                </Text>
              )}
            </View>

            {/* CONFIRM PASSWORD */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                Confirm Password
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.surface,
                    borderColor: errors.confirmPassword
                      ? theme.error
                      : theme.border,
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
                  placeholder="Confirm your password"
                  placeholderTextColor={theme.textTertiary}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setApiError(null);
                    if (errors.confirmPassword) {
                      setErrors({ ...errors, confirmPassword: undefined });
                    }
                  }}
                  secureTextEntry={!showPassword}
                />
              </View>
              {errors.confirmPassword && (
                <Text style={[styles.errorText, { color: theme.error }]}>
                  {errors.confirmPassword}
                </Text>
              )}
            </View>

            {/* API ERROR */}
            {apiError && (
              <Text
                style={[
                  styles.errorText,
                  { color: theme.error, textAlign: "center", marginBottom: 12 },
                ]}
              >
                {apiError}
              </Text>
            )}

            {/* BUTTON */}
            <Button
              title="Create Account"
              onPress={handleSignup}
              loading={loading}
              disabled={loading}
            />
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              Already have an account?{" "}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/auth/login")}
              disabled={loading}
            >
              <Text style={[styles.loginText, { color: theme.primary }]}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ===================== STYLES ===================== */

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
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
  },
  loginText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
