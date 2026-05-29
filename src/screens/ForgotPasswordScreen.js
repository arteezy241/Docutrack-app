import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../api/client';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  bgPage: '#1b2838',
  bgCard: '#171a21',
  bgDeep: '#0e1621',
  bgInput: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.07)',
  borderInput: 'rgba(255,255,255,0.1)',
  textPrimary: '#e8edf2',
  textSecondary: '#c6d4df',
  textMuted: '#8f98a0',
  textAccent: '#47bfff',
  accent: '#4F46E5',
};

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1=email, 2=otp, 3=newPassword, 4=success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const otpRefs = useRef([]);

  // Password requirement checks
  const pwChecks = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
  };
  const pwValid = Object.values(pwChecks).every(Boolean);

  // --- Step 1: Send OTP ---
  const handleSendOtp = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await client.post('/auth/forgot-password', { email: email.trim() });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Check your email and try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- OTP input handling ---
  const handleOtpChange = (val, index) => {
    if (!/^\d*$/.test(val)) return; // digits only
    const updated = [...otp];
    updated[index] = val;
    setOtp(updated);
    if (val && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // --- Step 2: Verify OTP (just advance to step 3 — actual verify on final submit) ---
  const handleVerifyOtp = () => {
    const code = otp.join('');
    if (code.length < 6) {
      setError('Please enter all 6 digits.');
      return;
    }
    setError('');
    setStep(3);
  };

  // --- Step 3: Reset password ---
  const handleResetPassword = async () => {
    if (!pwValid) {
      setError('Password does not meet all requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await client.post('/auth/reset-password', {
        email: email.trim(),
        otp: otp.join(''),
        newPassword,
      });
      setStep(4);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Reset failed. OTP may have expired.';
      setError(msg);
      // If OTP expired, go back to step 2
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
        setOtp(['', '', '', '', '', '']);
        setStep(2);
      }
    } finally {
      setLoading(false);
    }
  };

  const RequirementRow = ({ met, label }) => (
    <View style={styles.reqRow}>
      <View style={[styles.reqDot, { backgroundColor: met ? '#4ade80' : COLORS.textMuted }]} />
      <Text style={[styles.reqText, { color: met ? '#4ade80' : COLORS.textMuted }]}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back to Login</Text>
          </TouchableOpacity>

          <View style={styles.card}>
            {/* Step indicator */}
            <View style={styles.stepRow}>
              {[1, 2, 3].map(s => (
                <React.Fragment key={s}>
                  <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
                    <Text style={[styles.stepNum, step >= s && styles.stepNumActive]}>{s}</Text>
                  </View>
                  {s < 3 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
                </React.Fragment>
              ))}
            </View>

            {/* ── STEP 1: Email ── */}
            {step === 1 && (
              <>
                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.subtitle}>Enter your email and we'll send a 6-digit code.</Text>

                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="done"
                  onSubmitEditing={handleSendOtp}
                />

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity
                  onPress={handleSendOtp}
                  disabled={loading}
                  style={{ borderRadius: 12, marginTop: 4, opacity: loading ? 0.5 : 1 }}
                >
                  <LinearGradient
                    colors={['#47bfff', '#4F46E5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.btn}
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.btnText}>Send Code</Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {/* ── STEP 2: OTP ── */}
            {step === 2 && (
              <>
                <Text style={styles.title}>Check Your Email</Text>
                <Text style={styles.subtitle}>
                  We sent a 6-digit code to{'\n'}
                  <Text style={{ color: COLORS.textAccent }}>{email}</Text>
                </Text>

                <View style={styles.otpRow}>
                  {otp.map((digit, i) => (
                    <TextInput
                      key={i}
                      ref={ref => (otpRefs.current[i] = ref)}
                      style={[styles.otpBox, digit && styles.otpBoxFilled]}
                      value={digit}
                      onChangeText={val => handleOtpChange(val, i)}
                      onKeyPress={e => handleOtpKeyPress(e, i)}
                      keyboardType="number-pad"
                      maxLength={1}
                      textAlign="center"
                      selectionColor={COLORS.textAccent}
                    />
                  ))}
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

               <TouchableOpacity
                  onPress={handleVerifyOtp}
                  style={{ borderRadius: 12, marginTop: 4 }}
                >
                  <LinearGradient
                    colors={['#47bfff', '#4F46E5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.btn}
                  >
                    <Text style={styles.btnText}>Verify Code</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleSendOtp} style={styles.resendBtn}>
                  <Text style={styles.resendText}>Didn't get it? Resend code</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── STEP 3: New Password ── */}
            {step === 3 && (
              <>
                <Text style={styles.title}>New Password</Text>
                <Text style={styles.subtitle}>Choose a strong password for your account.</Text>

                <Text style={styles.label}>New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="New password"
                  placeholderTextColor={COLORS.textMuted}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  returnKeyType="next"
                />

                {/* Requirements box */}
                <View style={styles.reqBox}>
                  <RequirementRow met={pwChecks.length} label="At least 8 characters" />
                  <RequirementRow met={pwChecks.upper} label="One uppercase letter" />
                  <RequirementRow met={pwChecks.lower} label="One lowercase letter" />
                  <RequirementRow met={pwChecks.number} label="One number" />
                </View>

                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  placeholderTextColor={COLORS.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleResetPassword}
                />

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity
                  onPress={handleResetPassword}
                  disabled={!pwValid || loading}
                  style={{ borderRadius: 12, marginTop: 4, opacity: (!pwValid || loading) ? 0.5 : 1 }}
                >
                  <LinearGradient
                    colors={['#47bfff', '#4F46E5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.btn}
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.btnText}>Reset Password</Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {/* ── STEP 4: Success ── */}
            {step === 4 && (
              <>
                <View style={styles.successIcon}>
                  <Text style={{ fontSize: 36 }}>✓</Text>
                </View>
                <Text style={styles.title}>Password Reset!</Text>
                <Text style={styles.subtitle}>
                  Your password has been updated successfully. You can now log in with your new password.
                </Text>

                <TouchableOpacity
                  onPress={() => navigation.navigate('Login')}
                  style={{ borderRadius: 12, marginTop: 4 }}
                >
                  <LinearGradient
                    colors={['#47bfff', '#4F46E5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.btn}
                  >
                    <Text style={styles.btnText}>Back to Login</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgPage },
  scroll: { flexGrow: 1, padding: 20, justifyContent: 'center' },
  backBtn: { marginBottom: 20 },
  backText: { color: COLORS.textAccent, fontSize: 14 },

  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Step indicator
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  stepDot: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.bgDeep,
    borderWidth: 1, borderColor: COLORS.borderInput,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  stepNum: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  stepNumActive: { color: '#fff' },
  stepLine: { flex: 1, height: 1, backgroundColor: COLORS.border, marginHorizontal: 6 },
  stepLineActive: { backgroundColor: COLORS.accent },

  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 24, textAlign: 'center', lineHeight: 20 },
  label: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8, fontWeight: '500' },

  input: {
    backgroundColor: COLORS.bgInput,
    borderWidth: 1, borderColor: COLORS.borderInput,
    borderRadius: 10, padding: 14,
    color: COLORS.textPrimary, fontSize: 15,
    marginBottom: 16,
  },

  // OTP boxes
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 24 },
  otpBox: {
    width: 46, height: 54, borderRadius: 10,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1, borderColor: COLORS.borderInput,
    color: COLORS.textPrimary, fontSize: 22, fontWeight: '700',
  },
  otpBoxFilled: { borderColor: COLORS.textAccent },

  // Password requirements
  reqBox: {
    backgroundColor: COLORS.bgDeep,
    borderRadius: 10, padding: 12,
    marginBottom: 16, gap: 6,
  },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqDot: { width: 7, height: 7, borderRadius: 4 },
  reqText: { fontSize: 12 },

  error: { color: '#f87171', fontSize: 13, marginBottom: 12, textAlign: 'center' },

  btn: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  resendBtn: { marginTop: 16, alignItems: 'center' },
  resendText: { color: COLORS.textAccent, fontSize: 13 },

  successIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(74,222,128,0.12)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 20,
  },
});