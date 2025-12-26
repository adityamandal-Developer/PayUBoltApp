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
} from 'react-native';
import axios from 'axios';

import PayUUPIBoltUiSdk from 'payu-upi-bolt-ui-rn';

const payUBoltEventEmitter = new NativeEventEmitter(PayUUPIBoltUiSdk);

const API_BASE_URL =
  'https://calligraphical-unlanguidly-joanna.ngrok-free.dev/api/v1';

const App = () => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hashSubscription = payUBoltEventEmitter.addListener(
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
          PayUUPIBoltUiSdk.hashGenerated(result);
        } catch (error) {
          console.error('[BoltUI] Hash Error:', error);
        }
      },
    );

    const successSubscription = payUBoltEventEmitter.addListener(
      'onPayUSuccess',
      response => {
        console.log('[BoltUI] Success:', response);
        Alert.alert(
          'Success',
          `Txn ID: ${response.txnid}\nStatus: ${response.status}`,
        );
        setLoading(false);
      },
    );

    const failureSubscription = payUBoltEventEmitter.addListener(
      'onPayUFailure',
      response => {
        console.log('[BoltUI] Failure:', response);
        Alert.alert('Failure', response.message || 'Transaction Failed');
        setLoading(false);
      },
    );

    return () => {
      hashSubscription.remove();
      successSubscription.remove();
      failureSubscription.remove();
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
          PermissionsAndroid.PERMISSIONS.SEND_SMS,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        if (
          granted['android.permission.READ_PHONE_STATE'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.SEND_SMS'] ===
            PermissionsAndroid.RESULTS.GRANTED
        ) {
          console.log('You can use the SDK');
          return true;
        } else {
          console.log('Permissions denied');
          Alert.alert(
            'Permission Error',
            'SMS and Phone permissions are required for UPI Binding.',
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

  const handlePayNow = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setLoading(true);
    try {
      console.log('Initiating payment on backend...');
      const initiatePayload = {
        amount: 1.0,
        productInfo: 'Bolt Test',
        firstname: 'Test User',
        email: 'test@example.com',
        phone: '9876543210',
        appReferenceId: `REF_${Date.now()}`,
        gateway: 'PAYU',
        surl: 'https://cbjs.payu.in/sdk/success',
        furl: 'https://cbjs.payu.in/sdk/failure',
      };

      const response = await axios.post(
        `${API_BASE_URL}/payment/initiate`,
        initiatePayload,
      );
      const { data } = response.data;
      const backendParams = data.params;

      console.log('Backend Init Success:', backendParams);

      const config = {
        merchantName: 'PayU',
        merchantKey: 'smsplus',
        phone: backendParams.phone,
        email: backendParams.email,
        requestId: `REQ_${Date.now()}`,
        pluginTypes: ['AXIS'],
        isProduction: false,
      };

      console.log('Initializing Bolt SDK...');
      PayUUPIBoltUiSdk.initSDK(config);

      const paymentParams = {
        txnId: backendParams.txnid,
        amount: String(backendParams.amount),
        firstName: backendParams.firstname,
        productInfo: backendParams.productinfo,
        surl: backendParams.surl,
        furl: backendParams.furl,
        udf1: '',
      };

      console.log('Starting Register And Pay...');
      PayUUPIBoltUiSdk.payURegisterAndPay(paymentParams);
    } catch (error: any) {
      console.error('Payment Error:', error?.response?.data || error.message);
      Alert.alert('Error', 'Failed to initiate payment');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>PayU Bolt UI</Text>
        <Text style={styles.subHeader}>Test Mode</Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={handlePayNow}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>PAY NOW !</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center' },
  content: { alignItems: 'center', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  subHeader: { fontSize: 16, color: 'gray', marginBottom: 30 },
  btn: {
    backgroundColor: '#00B9A5',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default App;
