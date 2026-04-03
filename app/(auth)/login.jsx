import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { signIn, resetPassword } from '@/services/authService';

export default function LoginScreen() {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!email.trim()) return setError('Email is required');
    if (!password) return setError('Password is required');

    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      const code = err.code;
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else if (code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Try again later.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) return setError('Enter your email first');
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setError('');
      alert('Password reset email sent. Check your inbox.');
    } catch {
      setError('Could not send reset email. Check the address.');
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
            <Text style={s.title}>Welcome back</Text>
            <Text style={s.subtitle}>Sign in to continue</Text>
          </View>

          {error ? <Text style={s.error}>{error}</Text> : null}

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

          <TouchableOpacity onPress={handleForgotPassword} style={s.forgotBtn}>
            <Text style={s.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.primaryBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color={Colors.onPrimary} />
              : <Text style={s.primaryBtnText}>Sign In</Text>}
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={s.footerLink}>Sign Up</Text>
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
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotText: { fontSize: 14, color: C.textSecondary, fontFamily: 'PlusJakartaSans-Medium' },
  primaryBtn: {
    backgroundColor: C.textPrimary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  primaryBtnText: { fontSize: 17, fontFamily: 'PlusJakartaSans-Bold', color: C.onPrimary },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { fontSize: 15, color: C.textSecondary },
  footerLink: { fontSize: 15, fontFamily: 'PlusJakartaSans-Bold', color: C.textPrimary },
});
