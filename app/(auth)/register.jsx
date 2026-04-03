import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Mail, Lock, Eye, EyeOff, UserRound } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { signUp } from '@/services/authService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (!name.trim()) return 'Name is required';
    if (!email.trim()) return 'Email is required';
    if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address';
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (password !== confirm) return 'Passwords do not match';
    return null;
  };

  const handleRegister = async () => {
    setError('');
    const validationError = validate();
    if (validationError) return setError(validationError);

    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
    } catch (err) {
      const code = err.code;
      if (code === 'auth/email-already-in-use') {
        setError('This email is already registered');
      } else if (code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.header}>
            <Text style={s.title}>Create account</Text>
            <Text style={s.subtitle}>Start your health journey today</Text>
          </View>

          {error ? <Text style={s.error}>{error}</Text> : null}

          <View style={s.inputWrap}>
            <UserRound size={18} color={Colors.textTertiary} />
            <TextInput
              style={s.input}
              placeholder="Full name"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={s.inputWrap}>
            <Mail size={18} color={Colors.textTertiary} />
            <TextInput
              style={s.input}
              placeholder="Email"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={s.inputWrap}>
            <Lock size={18} color={Colors.textTertiary} />
            <TextInput
              style={s.input}
              placeholder="Password"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword
                ? <EyeOff size={18} color={Colors.textTertiary} />
                : <Eye size={18} color={Colors.textTertiary} />}
            </TouchableOpacity>
          </View>

          <View style={s.inputWrap}>
            <Lock size={18} color={Colors.textTertiary} />
            <TextInput
              style={s.input}
              placeholder="Confirm password"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry={!showPassword}
              value={confirm}
              onChangeText={setConfirm}
            />
          </View>

          <TouchableOpacity
            style={[s.primaryBtn, loading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color={Colors.onPrimary} />
              : <Text style={s.primaryBtnText}>Create Account</Text>}
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={s.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { marginBottom: 32 },
  title: { fontSize: 32, fontFamily: 'PlusJakartaSans-Bold', color: C.textPrimary },
  subtitle: { fontSize: 16, color: C.textSecondary, marginTop: 6 },
  error: {
    color: C.error, fontSize: 14, fontFamily: 'PlusJakartaSans-Medium',
    backgroundColor: C.proteinLight, padding: 12, borderRadius: 10, marginBottom: 16, overflow: 'hidden',
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.cardBackground, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 16 : 12,
    marginBottom: 12, borderWidth: 1, borderColor: C.border,
  },
  input: { flex: 1, fontSize: 16, fontFamily: 'PlusJakartaSans-Regular', color: C.textPrimary },
  primaryBtn: {
    backgroundColor: C.textPrimary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 24,
  },
  primaryBtnText: { fontSize: 17, fontFamily: 'PlusJakartaSans-Bold', color: C.onPrimary },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { fontSize: 15, color: C.textSecondary },
  footerLink: { fontSize: 15, fontFamily: 'PlusJakartaSans-Bold', color: C.textPrimary },
});
