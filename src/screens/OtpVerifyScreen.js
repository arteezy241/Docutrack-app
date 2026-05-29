import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import client from '../api/client';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '../store/authStore';


export default function OtpVerifyScreen({ route, navigation }) {
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

 const handleVerify = async () => {
    if (!otp || otp.length < 6) {
      Alert.alert('Error', 'Please enter the 6-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      console.log('Sending OTP request:', { email, otp, deviceName: 'DocuTrack Mobile' });
      const res = await client.post('/auth/verify-device', {
        email,
        otp,
        deviceName: 'DocuTrack Mobile',
      });
      console.log('OTP response:', JSON.stringify(res.data));
      const { token, user } = res.data;
      await login(token, user);
      navigation.replace('Dashboard');
    } catch (err) {
      console.log('OTP error full:', JSON.stringify(err.response?.data));
      console.log('OTP status:', err.response?.status);
      Alert.alert(
        'Verification Failed',
        JSON.stringify(err.response?.data) || 'Invalid or expired OTP.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.card}>
          <Text style={styles.title}>Two-Factor Auth</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={styles.email}>{email}</Text>
          </Text>

          <TextInput
            style={styles.input}
            placeholder="000000"
            placeholderTextColor="#8f98a0"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
            textAlign="center"
          />

         <TouchableOpacity
            onPress={handleVerify}
            disabled={loading}
            style={{ borderRadius: 10, marginTop: 8, opacity: loading ? 0.6 : 1 }}
          >
            <LinearGradient
              colors={['#47bfff', '#4F46E5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.back}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>← Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1b2838',
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#171a21',
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e8edf2',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#8f98a0',
    marginBottom: 28,
    textAlign: 'center',
    lineHeight: 22,
  },
  email: {
    color: '#47bfff',
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 14,
    color: '#e8edf2',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 14,
    letterSpacing: 8,
  },
  button: {
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  back: {
    marginTop: 16,
    alignItems: 'center',
  },
  backText: {
    color: '#8f98a0',
    fontSize: 13,
  },
});