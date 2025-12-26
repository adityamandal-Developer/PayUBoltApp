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
  NativeModules,
} from 'react-native';
import axios from 'axios';

// 1. Get the Native Module
const { PayUUpiBoltUiRn } = NativeModules;
const payUBoltEventEmitter = new NativeEventEmitter(PayUUpiBoltUiRn);

// Emulator localhost (Use 10.0.2.2 for Android Emulator)
const API_BASE_URL = 'http://10.0.2.2:5004/api/v1';

const App = () => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // --- EVENT LISTENERS ---

    // 1. Hash Generation Listener
    // The SDK calls this when it needs a checksum to proceed securely.
    const hashSubscription = payUBoltEventEmitter.addListener(
      'generateHash',
      async (data: { hashName: string; hashString: string }) => {
        console.log('[BoltUI] Hash Requested:', data);
        try {
          // Call your backend to generate the hash using your Salt
          const response = await axios.post(`${API_BASE_URL}/payment/hash`, {
            hashName: data.hashName,
            hashString: data.hashString,
          });

          console.log('[BoltUI] Hash Generated:', response.data);

          // Send result back to SDK: { [hashName]: "generated_hash" }
          PayUUpiBoltUiRn.hashGenerated({
            [data.hashName]: response.data[data.hashName]
          });

        } catch (error) {
          console.error('[BoltUI] Hash Error:', error);
          // Do not show Alert here as it might interrupt the native UI flow
        }
      }
    );

    // 2. Success Listener
    const successSubscription = payUBoltEventEmitter.addListener(
      'onPayUSuccess',
      (response) => {
        console.log('[BoltUI] Success:', response);
        Alert.alert('Success', `Txn ID: ${response.txnid}\nStatus: ${response.status}`);
        setLoading(false);
      }
    );

    // 3. Failure Listener
    const failureSubscription = payUBoltEventEmitter.addListener(
      'onPayUFailure',
      (response) => {
        console.log('[BoltUI] Failure:', response);
        Alert.alert('Failure', response.message || 'Payment Failed');
        setLoading(false);
      }
    );

    return () => {
      hashSubscription.remove();
      successSubscription.remove();
      failureSubscription.remove();
    };
  }, []);

  const handlePayNow = async () => {
    setLoading(true);
    try {
      // Step A: Initiate Payment on Backend
      console.log('Initiating payment on backend...');

      const initiatePayload = {
        amount: 1.00,
        productInfo: 'Bolt Test',
        firstname: 'Test User',
        email: 'test@example.com',
        phone: '9876543210', // Use a valid mobile number for UPI binding to work
        appReferenceId: `REF_${Date.now()}`,
        gateway: 'PAYU',
        surl: 'https://cbjs.payu.in/sdk/success',
        furl: 'https://cbjs.payu.in/sdk/failure',
      };

      const response = await axios.post(
        `${API_BASE_URL}/payment/initiate`,
        initiatePayload
      );

      const { data } = response.data; // Wraps your PaymentAdapter output
      console.log('Backend Init Success:', data);

      // Step B: Launch Bolt UI
      // Map your backend response to the Bolt SDK params
      const paymentParams = {
        key: data.params.key,
        txnId: data.params.txnid,
        amount: String(data.params.amount),
        productInfo: data.params.productinfo,
        firstName: data.params.firstname,
        email: data.params.email,
        phone: data.params.phone,
        surl: data.params.surl,
        furl: data.params.furl,
        hash: data.params.hash, // Initial payment hash
        isDebug: true, // Shows detailed logs in Android Logcat
      };

      console.log('Opening Bolt UI...');
      PayUUpiBoltUiRn.startPayment(paymentParams);

    } catch (error: any) {
      console.error('Payment Init Error:', error?.response?.data || error.message);
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
            <Text style={styles.btnText}>PAY NOW ₹1.00</Text>
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