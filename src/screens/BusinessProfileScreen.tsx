import React, { useContext, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Share,
  Image,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  TextInput,
  Button,
  Appbar,
  Chip,
  Divider,
} from 'react-native-paper';
import {
  Store,
  User,
  Phone,
  MessageCircle,
  MapPin,
  Globe,
  Sparkles,
  Save,
  CreditCard,
  FileText,
  Share2,
  ExternalLink,
  LogOut,
  RefreshCw,
  CheckCircle,
} from 'lucide-react-native';
import { AppContext, BusinessProfile } from '../context/AppContext';
import { colors } from '../theme/theme';

export default function BusinessProfileScreen({
  navigation,
}: {
  navigation: any;
}) {
  const {
    profile,
    updateProfile,
    getSelectedSim,
    getSimDisplayLabel,
    getSimPhoneNumber,
    clientUser,
    logoutClient,
    refreshClientStatus,
  } = useContext(AppContext);
  const selectedSim = getSelectedSim();
  const selectedSimPhone = getSimPhoneNumber(selectedSim);

  const [checkingStatus, setCheckingStatus] = useState(false);

  const [businessName, setBusinessName] = useState(profile.businessName || '');
  const [ownerName, setOwnerName] = useState(profile.ownerName || '');
  const [category, setCategory] = useState(
    profile.category || 'Clinic / Healthcare',
  );
  const [phone, setPhone] = useState(profile.phone || '');
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp || '');
  const [mapsLink, setMapsLink] = useState(profile.mapsLink || '');
  const [catalogLink, setCatalogLink] = useState(profile.catalogLink || '');
  const [tagline, setTagline] = useState(profile.tagline || '');

  const [savedSuccess, setSavedSuccess] = useState(false);

  const CATEGORIES = [
    'Clinic / Healthcare',
    'Sweets & Bakery',
    'Retail & Grocery',
    'Salon & Spa',
    'Consulting & Services',
    'Startup / Tech',
    'Real Estate',
  ];

  const handleSave = async () => {
    const updated: BusinessProfile = {
      businessName: businessName.trim(),
      ownerName: ownerName.trim(),
      category,
      phone: phone.trim(),
      whatsapp: whatsapp.trim(),
      mapsLink: mapsLink.trim(),
      catalogLink: catalogLink.trim(),
      tagline: tagline.trim(),
    };
    await updateProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleVerifyStatus = async () => {
    setCheckingStatus(true);
    const active = await refreshClientStatus();
    setCheckingStatus(false);
    if (active) {
      Alert.alert(
        'Status: Active',
        'Your The Serviceverse client account is currently active and in good standing.',
      );
    } else {
      Alert.alert(
        'Status: Inactive',
        'Your client account is no longer active. You have been redirected to the login screen.',
      );
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out Client',
      'Are you sure you want to log out of your The Serviceverse client account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logoutClient();
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <Appbar.Header style={styles.header}>
          <Appbar.Content
            title="Business Profile & Card"
            subtitle="Your digital brand identity"
            titleStyle={styles.headerTitle}
          />
          <Button
            mode="contained"
            icon={() => <Save color="white" size={16} />}
            onPress={handleSave}
            buttonColor={colors.primary}
            textColor="#FFFFFF"
            style={styles.saveHeaderBtn}
          >
            Save
          </Button>
        </Appbar.Header>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {savedSuccess && (
            <Card style={styles.successBanner}>
              <Text style={styles.successText}>
                ✅ Profile & Digital Visiting Card saved!
              </Text>
            </Card>
          )}

          {/* Interactive Digital Visiting Card Mockup */}
          <Text style={styles.sectionHeader}>📇 Live Digital Card Preview</Text>
          <Card style={styles.visitingCard}>
            <View style={styles.cardHeaderStrip}>
              <Text style={styles.cardCategoryBadge}>
                {category.toUpperCase()}
              </Text>
              <Sparkles color="#FCD34D" size={18} />
            </View>

            <Card.Content style={styles.cardBody}>
              <Text style={styles.cardBusinessName}>
                {businessName || 'Your Business Name'}
              </Text>
              <Text style={styles.cardTagline}>
                {tagline || 'Quality products & exceptional service'}
              </Text>

              {ownerName ? (
                <Text style={styles.cardOwnerName}>
                  Proprietor / Doctor: {ownerName}
                </Text>
              ) : null}

              <Divider
                style={{
                  marginVertical: 12,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                }}
              />

              <View style={styles.cardActionsRow}>
                {phone ? (
                  <View style={styles.cardActionItem}>
                    <Phone color="white" size={14} />
                    <Text style={styles.cardActionText}>{phone}</Text>
                  </View>
                ) : null}

                {whatsapp ? (
                  <View style={styles.cardActionItem}>
                    <MessageCircle color="#86EFAC" size={14} />
                    <Text style={[styles.cardActionText, { color: '#86EFAC' }]}>
                      WhatsApp Available
                    </Text>
                  </View>
                ) : null}

                {mapsLink ? (
                  <View style={styles.cardActionItem}>
                    <MapPin color="#FCA5A5" size={14} />
                    <Text style={[styles.cardActionText, { color: '#FCA5A5' }]}>
                      Google Maps Linked
                    </Text>
                  </View>
                ) : null}
              </View>
            </Card.Content>
          </Card>

          {/* Business Details Form */}
          <Text style={styles.sectionHeader}>🏢 Business Information</Text>
          <Card style={styles.formCard}>
            <Card.Content>
              {/* Category Chips */}
              <Text style={styles.inputLabel}>Business Category:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
              >
                {CATEGORIES.map(cat => (
                  <Chip
                    key={cat}
                    selected={category === cat}
                    onPress={() => setCategory(cat)}
                    style={[
                      styles.categoryChip,
                      category === cat && { backgroundColor: '#DBEAFE' },
                    ]}
                  >
                    {cat}
                  </Chip>
                ))}
              </ScrollView>

              <TextInput
                mode="outlined"
                label="Business / Clinic / Shop Name"
                value={businessName}
                onChangeText={setBusinessName}
                textColor={colors.textPrimary}
                placeholderTextColor={colors.textPlaceholder}
                outlineColor={colors.borderInput}
                activeOutlineColor={colors.primary}
                style={styles.input}
              />

              <TextInput
                mode="outlined"
                label="Owner / Doctor / Contact Person Name"
                value={ownerName}
                onChangeText={setOwnerName}
                textColor={colors.textPrimary}
                placeholderTextColor={colors.textPlaceholder}
                outlineColor={colors.borderInput}
                activeOutlineColor={colors.primary}
                style={styles.input}
              />

              <TextInput
                mode="outlined"
                label="Business Tagline or Short Slogan"
                value={tagline}
                onChangeText={setTagline}
                textColor={colors.textPrimary}
                placeholderTextColor={colors.textPlaceholder}
                outlineColor={colors.borderInput}
                activeOutlineColor={colors.primary}
                style={styles.input}
              />

              <TextInput
                mode="outlined"
                label="Business Phone Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                textColor={colors.textPrimary}
                placeholderTextColor={colors.textPlaceholder}
                outlineColor={colors.borderInput}
                activeOutlineColor={colors.primary}
                style={styles.input}
              />
              {!phone && selectedSimPhone ? (
                <TouchableOpacity
                  onPress={() => setPhone(selectedSimPhone)}
                  style={{ marginBottom: 12, marginTop: -6 }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#2563EB',
                      fontWeight: '600',
                    }}
                  >
                    + Use active SIM number ({selectedSimPhone})
                  </Text>
                </TouchableOpacity>
              ) : null}

              <TextInput
                mode="outlined"
                label="WhatsApp Number or Link"
                value={whatsapp}
                onChangeText={setWhatsapp}
                textColor={colors.textPrimary}
                placeholderTextColor={colors.textPlaceholder}
                outlineColor={colors.borderInput}
                activeOutlineColor={colors.primary}
                style={styles.input}
              />

              <TextInput
                mode="outlined"
                label="Google Maps Location URL (short link)"
                value={mapsLink}
                onChangeText={setMapsLink}
                textColor={colors.textPrimary}
                placeholderTextColor={colors.textPlaceholder}
                outlineColor={colors.borderInput}
                activeOutlineColor={colors.primary}
                style={styles.input}
              />

              <TextInput
                mode="outlined"
                label="Website or Digital Catalogue URL"
                value={catalogLink}
                onChangeText={setCatalogLink}
                textColor={colors.textPrimary}
                placeholderTextColor={colors.textPlaceholder}
                outlineColor={colors.borderInput}
                activeOutlineColor={colors.primary}
                style={styles.input}
              />
            </Card.Content>
          </Card>

          {/* Settings & Logs */}
          <Text style={styles.sectionHeader}>⚙️ System Management</Text>
          <Card style={styles.formCard}>
            <Card.Content>
              <View style={styles.systemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.systemTitle}>
                    Active Sending SIM & Route
                  </Text>
                  <Text
                    style={[
                      styles.systemDesc,
                      { color: '#2563EB', fontWeight: '700' },
                    ]}
                  >
                    {selectedSim
                      ? getSimDisplayLabel(selectedSim)
                      : 'Default SIM'}
                  </Text>
                </View>
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('Dashboard')}
                  textColor={colors.primary}
                  style={{ borderColor: colors.primaryBorder, borderRadius: 8 }}
                  compact
                >
                  Change SIM
                </Button>
              </View>

              <Divider style={{ marginVertical: 12 }} />

              <View style={styles.systemRow}>
                <View>
                  <Text style={styles.systemTitle}>Message Delivery Logs</Text>
                  <Text style={styles.systemDesc}>
                    Inspect sent & failed message history
                  </Text>
                </View>
                <Button
                  mode="contained"
                  icon={() => <FileText color="white" size={14} />}
                  onPress={() => navigation.navigate('Logs')}
                  buttonColor={colors.textPrimary}
                  textColor="#FFFFFF"
                  style={{ borderRadius: 8 }}
                  compact
                >
                  View Logs
                </Button>
              </View>
            </Card.Content>
          </Card>

          <Button
            mode="contained"
            icon={() => <Save color="white" size={18} />}
            onPress={handleSave}
            buttonColor={colors.primary}
            textColor="#FFFFFF"
            style={styles.saveBottomBtn}
            contentStyle={{ paddingVertical: 6 }}
          >
            Save Profile & Card
          </Button>

          {/* Connected HRMS Client Account */}
          <Card style={styles.clientAccountCard}>
            <Card.Content>
              <View style={styles.clientCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.clientCardTitle}>
                    Connected The Serviceverse{' '}
                  </Text>
                  <Text style={styles.clientCardSubtitle}>
                    {clientUser?.company_name ||
                      profile.businessName ||
                      'Registered Client'}
                  </Text>
                </View>
                <View style={styles.statusPill}>
                  <CheckCircle color="#16A34A" size={14} />
                  <Text style={styles.statusPillText}>Active</Text>
                </View>
              </View>

              <Divider style={{ marginVertical: 10 }} />

              <View style={styles.companyDetailRow}>
                <Text style={styles.companyDetailLabel}>Client Name:</Text>
                <Text style={styles.companyDetailValue}>
                  {clientUser?.name || profile.ownerName || 'Client'}
                </Text>
              </View>

              {clientUser?.email ? (
                <View style={styles.companyDetailRow}>
                  <Text style={styles.companyDetailLabel}>Email:</Text>
                  <Text style={styles.companyDetailValue}>
                    {clientUser.email}
                  </Text>
                </View>
              ) : null}

              {clientUser?.mobile ? (
                <View style={styles.companyDetailRow}>
                  <Text style={styles.companyDetailLabel}>Mobile:</Text>
                  <Text style={styles.companyDetailValue}>
                    {clientUser.mobile}
                  </Text>
                </View>
              ) : null}

              <View style={styles.clientActionsRow}>
                <Button
                  mode="outlined"
                  icon={() => <RefreshCw color="#2563EB" size={14} />}
                  onPress={handleVerifyStatus}
                  loading={checkingStatus}
                  disabled={checkingStatus}
                  textColor="#2563EB"
                  style={styles.clientVerifyBtn}
                >
                  Verify Status
                </Button>
                <Button
                  mode="outlined"
                  icon={() => <LogOut color="#DC2626" size={14} />}
                  onPress={handleLogout}
                  textColor="#DC2626"
                  style={styles.clientLogoutBtn}
                >
                  Sign Out
                </Button>
              </View>
            </Card.Content>
          </Card>

          {/* Parent Company & Copyright Information */}
          <Card style={styles.companyCard}>
            <Card.Content>
              <View style={styles.companyHeaderRow}>
                <View style={styles.companyLogoBadge}>
                  <Image
                    source={require('../assets/logo.png')}
                    style={styles.companyLogoImg}
                    resizeMode="contain"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.companyProductName}>BizSMS</Text>
                  <Text style={styles.companyProductTag}>
                    Commercial Call Auto-Pilot & Direct Cellular CRM
                  </Text>
                </View>
              </View>

              <Divider style={{ marginVertical: 12 }} />

              <View style={styles.companyDetailRow}>
                <Text style={styles.companyDetailLabel}>Parent Company:</Text>
                <Text style={styles.companyDetailValue}>The Serviceverse</Text>
              </View>

              <View style={styles.companyDetailRow}>
                <Text style={styles.companyDetailLabel}>Product Edition:</Text>
                <Text style={styles.companyDetailValue}>
                  Enterprise Commercial v1.0.0
                </Text>
              </View>

              <TouchableOpacity
                style={styles.websiteBtn}
                onPress={() => Linking.openURL('https://theserviceverse.com')}
                activeOpacity={0.8}
              >
                <Globe color="#2563EB" size={14} />
                <Text style={styles.websiteBtnText}>theserviceverse.com</Text>
                <ExternalLink color="#2563EB" size={12} />
              </TouchableOpacity>

              <Text style={styles.copyrightText}>
                © {new Date().getFullYear()} The Serviceverse. All rights
                reserved.
              </Text>
              <Text style={styles.licenseNotice}>
                All logos, brand marks, and software designs are proprietary
                intellectual property of The Serviceverse.
              </Text>
            </Card.Content>
          </Card>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  saveHeaderBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  successBanner: {
    backgroundColor: '#DCFCE7',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  successText: {
    color: '#166534',
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  visitingCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    elevation: 4,
    marginBottom: 18,
    overflow: 'hidden',
  },
  cardHeaderStrip: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cardCategoryBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#60A5FA',
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: 16,
  },
  cardBusinessName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardTagline: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 3,
  },
  cardOwnerName: {
    fontSize: 13,
    color: '#CBD5E1',
    marginTop: 8,
    fontWeight: '600',
  },
  cardActionsRow: {
    gap: 6,
  },
  cardActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardActionText: {
    fontSize: 12,
    color: '#E2E8F0',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    elevation: 2,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  categoryChip: {
    marginRight: 8,
    backgroundColor: '#F1F5F9',
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  systemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  systemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  systemDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  saveBottomBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    marginTop: 8,
  },
  companyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  companyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyLogoBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00051B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    overflow: 'hidden',
  },
  companyLogoImg: {
    width: '100%',
    height: '100%',
  },
  companyProductName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  companyProductTag: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  companyDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  companyDetailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  companyDetailValue: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '700',
  },
  websiteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 6,
    marginBottom: 12,
  },
  websiteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  copyrightText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
  },
  licenseNotice: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 14,
  },
  clientAccountCard: {
    borderRadius: 16,
    marginTop: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#F8FAFC',
  },
  clientCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clientCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  clientCardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  clientActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  clientVerifyBtn: {
    flex: 1,
    borderRadius: 8,
    borderColor: '#93C5FD',
  },
  clientLogoutBtn: {
    flex: 1,
    borderRadius: 8,
    borderColor: '#FCA5A5',
  },
});
