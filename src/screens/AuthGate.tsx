import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
  Linking,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Text,
  TextInput,
  Button,
  Card,
  SegmentedButtons,
} from 'react-native-paper';
import {
  ShieldCheck,
  KeyRound,
  Globe,
  ExternalLink,
  Mail,
  Lock,
  User,
  Building,
  Phone,
  Server,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react-native';
import BrandLoader from '../components/BrandLoader';
import { colors } from '../theme/theme';
import {
  loginClient,
  registerClient,
  verifyClientActiveStatus,
  getClientSession,
  saveClientSession,
  clearClientSession,
  getHrmsBaseUrl,
  setHrmsBaseUrl,
  ClientUser,
} from '../services/hrmsAuthService';

const ENTERPRISE_BACKUP_CODE = 'SDMCH723326';

interface AuthGateProps {
  onAuthenticated: () => void;
  onClientLoaded?: (client: ClientUser) => void;
}

export default function AuthGate({
  onAuthenticated,
  onClientLoaded,
}: AuthGateProps) {
  // Screen mode: 'login' | 'register' | 'license'
  const [tab, setTab] = useState<string>('login');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    'Verifying Client Status with The Serviceverse...',
  );

  // Error and success banners
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register Form
  const [regName, setRegName] = useState('');
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Enterprise License Backup
  const [licenseCode, setLicenseCode] = useState('');

  // Server URL Configuration Modal
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [serverUrl, setServerUrlState] = useState('');
  const [currentSavedUrl, setCurrentSavedUrl] = useState('');

  /**
   * On Initial Mount:
   * "once login donto ask for login when ever application will be open just check
   * weather client is active or not if active everything should run as it is."
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedUrl = await getHrmsBaseUrl();
        setCurrentSavedUrl(savedUrl);
        setServerUrlState(savedUrl);

        const client = await getClientSession();

        if (client) {
          setStatusMessage(
            `Verifying status for ${client.name || client.email}...`,
          );
          const result = await verifyClientActiveStatus(client, savedUrl);

          if (result.isActive) {
            // Client is active! Seamlessly proceed without asking for login again
            if (onClientLoaded && result.client) {
              onClientLoaded(result.client);
            }
            onAuthenticated();
            return;
          } else {
            // Client account deactivated or disabled in HRMS
            await clearClientSession();
            setErrorMessage(
              result.message ||
                'Your client account has been deactivated in The Serviceverse. Please contact your administrator.',
            );
            setLoading(false);
            return;
          }
        }

        // Fallback: check legacy enterprise token
        const legacyAuth = await AsyncStorage.getItem('authenticated');
        if (legacyAuth === 'true') {
          // If no client object stored, allow access or prompt login
          onAuthenticated();
          return;
        }

        setLoading(false);
      } catch (err: any) {
        console.warn('Auth initialization error:', err);
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Handle Client Login with HRMS
   */
  const handleLogin = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!loginEmail.trim()) {
      setErrorMessage('Please enter your registered email or phone.');
      return;
    }
    if (!loginPassword) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await loginClient(
        loginEmail.trim(),
        loginPassword,
        currentSavedUrl,
      );

      if (res.status === 'success' && res.client) {
        await saveClientSession(res.client);
        if (onClientLoaded) {
          onClientLoaded(res.client);
        }
        setSuccessMessage('Login successful! Loading BizSMS...');
        setTimeout(() => {
          onAuthenticated();
        }, 500);
      } else {
        setErrorMessage(
          res.message || 'Invalid credentials or account inactive.',
        );
      }
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          'Unable to connect to The Serviceverse. Please check the server address.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handle Client Registration with HRMS
   */
  const handleRegister = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!regName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!regEmail.trim()) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await registerClient(
        {
          name: regName.trim(),
          email: regEmail.trim(),
          password: regPassword,
          company_name: regCompanyName.trim() || undefined,
          mobile: regMobile.trim() || undefined,
        },
        currentSavedUrl,
      );

      if (res.status === 'success' && res.client) {
        await saveClientSession(res.client);
        if (onClientLoaded) {
          onClientLoaded(res.client);
        }
        setSuccessMessage('Account created successfully! Entering BizSMS...');
        setTimeout(() => {
          onAuthenticated();
        }, 600);
      } else {
        setErrorMessage(
          res.message || 'Registration failed. Please check your inputs.',
        );
      }
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          'Registration failed. Ensure The Serviceverse server is reachable.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Fallback: Enterprise License Key Verification
   */
  const handleEnterpriseKey = async () => {
    setErrorMessage('');
    if (licenseCode.trim() === ENTERPRISE_BACKUP_CODE) {
      await AsyncStorage.setItem('authenticated', 'true');
      onAuthenticated();
    } else {
      setErrorMessage(
        '❌ Invalid enterprise access key. Please check and retry.',
      );
    }
  };

  /**
   * Save Custom HRMS Server URL
   */
  const handleSaveServerUrl = async () => {
    if (!serverUrl.trim()) {
      Alert.alert('Invalid URL', 'Server URL cannot be empty.');
      return;
    }
    const cleanUrl = serverUrl.trim().replace(/\/+$/, '');
    await setHrmsBaseUrl(cleanUrl);
    setCurrentSavedUrl(cleanUrl);
    setServerModalVisible(false);
    Alert.alert(
      'Server Configured',
      `The Serviceverse API URL set to:\n${cleanUrl}`,
    );
  };

  const openCompanyWebsite = () => {
    Linking.openURL('https://theserviceverse.com').catch(err =>
      console.warn('Could not open website:', err),
    );
  };

  if (loading) {
    return <BrandLoader message={statusMessage} />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.outer}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.brandingHeader}>
          <View style={styles.logoBadge}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.appName}>BizSMS</Text>
          <Text style={styles.appTagline}>
            Commercial Call Auto-Pilot & SMS CRM
          </Text>
          <TouchableOpacity
            style={styles.parentCompanyBadge}
            onPress={openCompanyWebsite}
            activeOpacity={0.8}
          >
            <Text style={styles.parentCompanyText}>
              A Product of{' '}
              <Text style={styles.parentCompanyBold}>The Serviceverse</Text>
            </Text>
            <ExternalLink color="#2563EB" size={12} />
          </TouchableOpacity>
        </View>

        {/* Server Endpoint Bar */}
        <TouchableOpacity
          style={styles.serverBar}
          onPress={() => setServerModalVisible(true)}
          activeOpacity={0.7}
        >
          <Server color="#2563EB" size={14} />
          <Text style={styles.serverBarText} numberOfLines={1}>
            The Serviceverse Host:{' '}
            <Text style={styles.serverBarHost}>{currentSavedUrl}</Text>
          </Text>
          <Text style={styles.serverBarEdit}>Change</Text>
        </TouchableOpacity>

        {/* Auth Mode Switcher */}
        <SegmentedButtons
          value={tab}
          onValueChange={val => {
            setTab(val);
            setErrorMessage('');
            setSuccessMessage('');
          }}
          buttons={[
            {
              value: 'login',
              label: 'Sign In',
              icon: 'login',
            },
            {
              value: 'register',
              label: 'Register Client',
              icon: 'account-plus',
            },
            {
              value: 'license',
              label: 'Key',
              icon: 'key',
            },
          ]}
          style={styles.segment}
        />

        {/* Main Card */}
        <Card style={styles.card}>
          <Card.Content>
            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <AlertCircle color="#DC2626" size={18} />
                <Text style={styles.errorBoxText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Success Banner */}
            {successMessage ? (
              <View style={styles.successBox}>
                <CheckCircle2 color="#16A34A" size={18} />
                <Text style={styles.successBoxText}>{successMessage}</Text>
              </View>
            ) : null}

            {/* TAB 1: CLIENT LOGIN */}
            {tab === 'login' && (
              <View>
                <View style={styles.cardTitleRow}>
                  <Building color="#2563EB" size={20} />
                  <Text style={styles.title}>Client Sign In</Text>
                </View>
                <Text style={styles.instructions}>
                  Log in with your The Serviceverse client credentials. Once
                  logged in, your active status will be verified automatically
                  on launch.
                </Text>

                <TextInput
                  mode="outlined"
                  label="Email or Mobile"
                  value={loginEmail}
                  onChangeText={t => {
                    setLoginEmail(t);
                    setErrorMessage('');
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  left={
                    <TextInput.Icon
                      icon={() => <Mail color="#64748B" size={18} />}
                    />
                  }
                  textColor={colors.textPrimary}
                  placeholderTextColor={colors.textPlaceholder}
                  outlineColor={colors.borderInput}
                  activeOutlineColor={colors.primary}
                  style={styles.input}
                />

                <TextInput
                  mode="outlined"
                  label="Password"
                  value={loginPassword}
                  onChangeText={t => {
                    setLoginPassword(t);
                    setErrorMessage('');
                  }}
                  secureTextEntry={!showLoginPassword}
                  left={
                    <TextInput.Icon
                      icon={() => <Lock color="#64748B" size={18} />}
                    />
                  }
                  right={
                    <TextInput.Icon
                      icon={() =>
                        showLoginPassword ? (
                          <EyeOff color="#64748B" size={18} />
                        ) : (
                          <Eye color="#64748B" size={18} />
                        )
                      }
                      onPress={() => setShowLoginPassword(!showLoginPassword)}
                    />
                  }
                  textColor={colors.textPrimary}
                  placeholderTextColor={colors.textPlaceholder}
                  outlineColor={colors.borderInput}
                  activeOutlineColor={colors.primary}
                  style={styles.input}
                />

                <Button
                  mode="contained"
                  onPress={handleLogin}
                  loading={submitting}
                  disabled={submitting}
                  buttonColor={colors.primary}
                  textColor="#FFFFFF"
                  style={styles.button}
                  contentStyle={{ paddingVertical: 6 }}
                >
                  {submitting ? 'Authenticating...' : 'Sign In as Client'}
                </Button>

                <TouchableOpacity
                  style={styles.switchTabLink}
                  onPress={() => {
                    setTab('register');
                    setErrorMessage('');
                  }}
                >
                  <Text style={styles.switchTabText}>
                    New client?{' '}
                    <Text style={styles.switchTabBold}>Create an account</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 2: CLIENT REGISTRATION */}
            {tab === 'register' && (
              <View>
                <View style={styles.cardTitleRow}>
                  <Building color="#2563EB" size={20} />
                  <Text style={styles.title}>Client Registration</Text>
                </View>
                <Text style={styles.instructions}>
                  Create your client profile linked with The Serviceverse.
                </Text>

                <TextInput
                  mode="outlined"
                  label="Contact / Owner Name *"
                  value={regName}
                  onChangeText={t => {
                    setRegName(t);
                    setErrorMessage('');
                  }}
                  left={
                    <TextInput.Icon
                      icon={() => <User color="#64748B" size={18} />}
                    />
                  }
                  textColor={colors.textPrimary}
                  outlineColor={colors.borderInput}
                  activeOutlineColor={colors.primary}
                  style={styles.input}
                />

                <TextInput
                  mode="outlined"
                  label="Company / Business Name"
                  value={regCompanyName}
                  onChangeText={t => {
                    setRegCompanyName(t);
                    setErrorMessage('');
                  }}
                  left={
                    <TextInput.Icon
                      icon={() => <Building color="#64748B" size={18} />}
                    />
                  }
                  textColor={colors.textPrimary}
                  outlineColor={colors.borderInput}
                  activeOutlineColor={colors.primary}
                  style={styles.input}
                />

                <TextInput
                  mode="outlined"
                  label="Email Address *"
                  value={regEmail}
                  onChangeText={t => {
                    setRegEmail(t);
                    setErrorMessage('');
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  left={
                    <TextInput.Icon
                      icon={() => <Mail color="#64748B" size={18} />}
                    />
                  }
                  textColor={colors.textPrimary}
                  outlineColor={colors.borderInput}
                  activeOutlineColor={colors.primary}
                  style={styles.input}
                />

                <TextInput
                  mode="outlined"
                  label="Mobile Number"
                  value={regMobile}
                  onChangeText={t => {
                    setRegMobile(t);
                    setErrorMessage('');
                  }}
                  keyboardType="phone-pad"
                  left={
                    <TextInput.Icon
                      icon={() => <Phone color="#64748B" size={18} />}
                    />
                  }
                  textColor={colors.textPrimary}
                  outlineColor={colors.borderInput}
                  activeOutlineColor={colors.primary}
                  style={styles.input}
                />

                <TextInput
                  mode="outlined"
                  label="Password (min 6 chars) *"
                  value={regPassword}
                  onChangeText={t => {
                    setRegPassword(t);
                    setErrorMessage('');
                  }}
                  secureTextEntry={!showRegPassword}
                  left={
                    <TextInput.Icon
                      icon={() => <Lock color="#64748B" size={18} />}
                    />
                  }
                  right={
                    <TextInput.Icon
                      icon={() =>
                        showRegPassword ? (
                          <EyeOff color="#64748B" size={18} />
                        ) : (
                          <Eye color="#64748B" size={18} />
                        )
                      }
                      onPress={() => setShowRegPassword(!showRegPassword)}
                    />
                  }
                  textColor={colors.textPrimary}
                  outlineColor={colors.borderInput}
                  activeOutlineColor={colors.primary}
                  style={styles.input}
                />

                <TextInput
                  mode="outlined"
                  label="Confirm Password *"
                  value={regConfirmPassword}
                  onChangeText={t => {
                    setRegConfirmPassword(t);
                    setErrorMessage('');
                  }}
                  secureTextEntry={!showRegPassword}
                  left={
                    <TextInput.Icon
                      icon={() => <Lock color="#64748B" size={18} />}
                    />
                  }
                  textColor={colors.textPrimary}
                  outlineColor={colors.borderInput}
                  activeOutlineColor={colors.primary}
                  style={styles.input}
                />

                <Button
                  mode="contained"
                  onPress={handleRegister}
                  loading={submitting}
                  disabled={submitting}
                  buttonColor={colors.primary}
                  textColor="#FFFFFF"
                  style={styles.button}
                  contentStyle={{ paddingVertical: 6 }}
                >
                  {submitting ? 'Creating Client...' : 'Register & Enter'}
                </Button>

                <TouchableOpacity
                  style={styles.switchTabLink}
                  onPress={() => {
                    setTab('login');
                    setErrorMessage('');
                  }}
                >
                  <Text style={styles.switchTabText}>
                    Already have an account?{' '}
                    <Text style={styles.switchTabBold}>Sign In</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 3: ENTERPRISE LICENSE KEY BACKUP */}
            {tab === 'license' && (
              <View>
                <View style={styles.cardTitleRow}>
                  <KeyRound color="#2563EB" size={20} />
                  <Text style={styles.title}>Enterprise Access Key</Text>
                </View>
                <Text style={styles.instructions}>
                  Enter your master enterprise setup license code.
                </Text>

                <TextInput
                  mode="outlined"
                  label="License / Access Code"
                  value={licenseCode}
                  onChangeText={t => {
                    setLicenseCode(t);
                    setErrorMessage('');
                  }}
                  secureTextEntry
                  textColor={colors.textPrimary}
                  placeholderTextColor={colors.textPlaceholder}
                  outlineColor={colors.borderInput}
                  activeOutlineColor={colors.primary}
                  style={styles.input}
                  autoCapitalize="characters"
                />

                <Button
                  mode="contained"
                  onPress={handleEnterpriseKey}
                  buttonColor={colors.primary}
                  textColor="#FFFFFF"
                  style={styles.button}
                  contentStyle={{ paddingVertical: 6 }}
                >
                  Activate & Enter
                </Button>
              </View>
            )}

            <View style={styles.footerNote}>
              <ShieldCheck color="#10B981" size={16} />
              <Text style={styles.footerNoteText}>
                Active client synchronization with The Serviceverse
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Official Parent Company Copyright Footer */}
        <View style={styles.copyrightContainer}>
          <TouchableOpacity
            onPress={openCompanyWebsite}
            style={styles.websiteRow}
            activeOpacity={0.7}
          >
            <Globe color="#64748B" size={13} />
            <Text style={styles.websiteUrl}>theserviceverse.com</Text>
          </TouchableOpacity>
          <Text style={styles.copyrightText}>
            © {new Date().getFullYear()} The Serviceverse. All rights reserved.
          </Text>
        </View>
      </ScrollView>

      {/* HRMS Server Configuration Modal */}
      <Modal
        visible={serverModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setServerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Server color="#2563EB" size={22} />
              <Text style={styles.modalTitle}>
                The Serviceverse Server Address
              </Text>
            </View>
            <Text style={styles.modalSubtitle}>
              Specify your The Serviceverse backend URL (e.g. for emulator use
              10.0.2.2:8000, for LAN Wi-Fi use your computer's IP:8000, or a
              hosted URL).
            </Text>

            <TextInput
              mode="outlined"
              label="Backend API Base URL"
              value={serverUrl}
              onChangeText={setServerUrlState}
              autoCapitalize="none"
              keyboardType="url"
              style={styles.modalInput}
              outlineColor={colors.borderInput}
              activeOutlineColor={colors.primary}
            />

            <View style={styles.quickPresetRow}>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() =>
                  setServerUrlState('https://hrms.theserviceverse.com')
                }
              >
                <Text style={styles.presetChipText}>Live HRMS (Cloud)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => setServerUrlState('http://192.168.0.90:8000')}
              >
                <Text style={styles.presetChipText}>Wi-Fi</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => setServerUrlState('http://127.0.0.1:8000')}
              >
                <Text style={styles.presetChipText}>USB/Local</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActionRow}>
              <Button
                mode="text"
                onPress={() => setServerModalVisible(false)}
                textColor="#64748B"
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveServerUrl}
                buttonColor={colors.primary}
                textColor="#FFFFFF"
              >
                Save Server
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 36,
    paddingBottom: 24,
  },
  brandingHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#00051B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    elevation: 6,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: '#3B82F6',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  appTagline: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  parentCompanyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  parentCompanyText: {
    fontSize: 12,
    color: '#1E40AF',
  },
  parentCompanyBold: {
    fontWeight: '800',
    color: '#2563EB',
  },
  serverBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 14,
    gap: 6,
  },
  serverBarText: {
    flex: 1,
    fontSize: 11,
    color: '#3730A3',
  },
  serverBarHost: {
    fontWeight: '700',
    color: '#1E1B4B',
  },
  serverBarEdit: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  segment: {
    marginBottom: 14,
  },
  card: {
    padding: 8,
    borderRadius: 18,
    elevation: 4,
    backgroundColor: '#FFFFFF',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  instructions: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 17,
  },
  input: {
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  button: {
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: '#2563EB',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  errorBoxText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  successBoxText: {
    flex: 1,
    color: '#15803D',
    fontSize: 12,
    fontWeight: '600',
  },
  switchTabLink: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchTabText: {
    fontSize: 13,
    color: '#64748B',
  },
  switchTabBold: {
    color: '#2563EB',
    fontWeight: '700',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  footerNoteText: {
    fontSize: 11,
    color: '#64748B',
  },
  copyrightContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  websiteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  websiteUrl: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  copyrightText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 17,
  },
  modalInput: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  quickPresetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  presetChip: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
