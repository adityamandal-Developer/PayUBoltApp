import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  NativeEventEmitter,
  PermissionsAndroid,
  Platform,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import PayUUPIBoltUiSdk from 'payu-upi-bolt-ui-rn';

const payUBoltEventEmitter = new NativeEventEmitter(PayUUPIBoltUiSdk);

const API_BASE_URL = 'https://your-backend-api.com/api';

const App = () => {
  const [loading, setLoading] = useState(false);
  const [boltAvailable, setBoltAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    //Success
    const onPayUSuccessListener = payUBoltEventEmitter.addListener(
      'onPayUSuccess',
      response => {
        console.log('[BoltUI] Success:', response);
        setLoading(false);
        Alert.alert('Payment Success', JSON.stringify(response));
      },
    );

    //Failure
    const onPayUFailureListener = payUBoltEventEmitter.addListener(
      'onPayUFailure',
      response => {
        console.log('[BoltUI] Failure:', response);
        setLoading(false);
        Alert.alert('Payment Failure', JSON.stringify(response));
      },
    );

    //Cancel
    const onPayUCancelListener = payUBoltEventEmitter.addListener(
      'onPayUCancel',
      response => {
        console.log('[BoltUI] Cancelled:', response);
        setLoading(false);
        Alert.alert('Payment Cancelled', 'User cancelled the transaction');
      },
    );

    // Hash Generation
    const payUGenerateHashListener = payUBoltEventEmitter.addListener(
      'generateHash',
      async (data: { hashName: string; hashString: string }) => {
        console.log('[BoltUI] Hash Requested:', data);
        try {
          const response = await axios.post(`${API_BASE_URL}/payment/hash`, {
            hashName: data.hashName,
            hashString: data.hashString,
          });

          const result = {
            hashName: data.hashName,
            [data.hashName]: response.data[data.hashName],
          };

          console.log('[BoltUI] Sending Hash to SDK:', result);
          PayUUPIBoltUiSdk.hashGenerated(result);
        } catch (error) {
          console.error('[BoltUI] Hash Generation Error:', error);
        }
      },
    );

    return () => {
      onPayUSuccessListener.remove();
      onPayUFailureListener.remove();
      onPayUCancelListener.remove();
      payUGenerateHashListener.remove();
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
          PermissionsAndroid.PERMISSIONS.SEND_SMS,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS,
        ]);

        const phoneState =
          granted['android.permission.READ_PHONE_STATE'] ===
          PermissionsAndroid.RESULTS.GRANTED;
        const sms =
          granted['android.permission.SEND_SMS'] ===
          PermissionsAndroid.RESULTS.GRANTED;

        if (phoneState && sms) {
          return true;
        } else {
          Alert.alert(
            'Permissions Required',
            'SMS and Phone permissions are mandatory for UPI Bolt.',
          );
          return false;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const handleInit = async () => {
    const config = {
      merchantName: 'PayU',
      merchantKey: 'smsplus',
      phone: `91${backendParams.phone}`,
      email: backendParams.email,
      requestId: `OneTicket_${Date.now()}`,
      pluginTypes: ['BHIM'],
      isProduction: false,
      excludedBanksIINs: [],
      refId: 'oneticket',
      clientId: ['OneTicket'],
    };

    console.log('Initializing SDK with:', config);
    try {
      PayUUPIBoltUiSdk.initSDK(config);
      console.log('SDK Initialized');
      checkAvailability();
    } catch (e) {
      console.error('Init Error:', e);
    }
  };

  const checkAvailability = () => {
    PayUUPIBoltUiSdk.isUPIBoltSDKAvailable((response: any) => {
      console.log('Bolt Availability:', response);
      if (
        response.isSDKAvailable === 'true' ||
        response.isSDKAvailable === true
      ) {
        setBoltAvailable(true);
      } else {
        setBoltAvailable(false);
        Alert.alert(
          'Not Available',
          'UPI Bolt SDK is not available on this device',
        );
      }
    });
  };

  const handleRegisterAndPay = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    if (!boltAvailable) {
      await handleInit();
    }

    setLoading(true);

    const paymentParams = {
      amount: '1.00',
      productInfo: 'Bolt Product',
      firstName: 'TestUser',
      surl: 'https://cbjs.payu.in/sdk/success',
      furl: 'https://cbjs.payu.in/sdk/failure',
      ios_surl: 'https://cbjs.payu.in/sdk/success',
      ios_furl: 'https://cbjs.payu.in/sdk/failure',
      initiationMode: '00',
      purpose: '00',
      txnId: `txn_${Date.now()}`,
      isCCTxnEnabled: false,
    };

    console.log('Starting Register and Pay:', paymentParams);

    PayUUPIBoltUiSdk.payURegisterAndPay(paymentParams);
  };

  const handleManageUPI = () => {
    const screenType = 'MANAGEUPIACCOUNTS';
    PayUUPIBoltUiSdk.openUPIManagement(screenType);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>PayU Bolt UAT</Text>

        <View style={styles.card}>
          <Text style={styles.info}>
            Status: {boltAvailable ? 'SDK Available' : 'Not Initialized'}
          </Text>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleInit}>
          <Text style={styles.btnText}>1. Initialize SDK</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btn}
          onPress={handleRegisterAndPay}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>2. Register & Pay</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.secondaryBtn]}
          onPress={handleManageUPI}
        >
          <Text style={styles.secondaryBtnText}>Manage UPI</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { alignItems: 'center', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  card: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    marginBottom: 20,
  },
  info: { fontSize: 14, color: '#555' },
  btn: {
    backgroundColor: '#4a148c',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4a148c',
  },
  secondaryBtnText: { color: '#4a148c' },
});

export default App;
