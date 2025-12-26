declare module 'payu-upi-bolt-ui-rn' {
  export interface PayUBoltConfig {
    merchantName: string;
    merchantKey: string;
    phone: string;
    email: string;
    requestId: string;
    pluginTypes: string[];
    isProduction: boolean;
    excludedBanksIINs?: string[];
  }

  export interface PaymentParams {
    txnId: string;
    amount: string;
    firstName: string;
    productInfo: string;
    surl: string;
    furl: string;
    udf1?: string;
    // Add other optional fields if needed
  }

  const PayUUPIBoltUiSdk: {
    initSDK(config: PayUBoltConfig): void;
    payURegisterAndPay(params: PaymentParams): void;
    hashGenerated(hashData: { [key: string]: string }): void;
    // Add other methods if you use them
  };

  export default PayUUPIBoltUiSdk;
}
