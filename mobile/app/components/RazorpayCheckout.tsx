import React from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants/theme';

interface RazorpayCheckoutProps {
    options: {
        key: string;
        amount: number; // in paise
        currency: string;
        name: string;
        description: string;
        image?: string;
        order_id: string; // Razorpay Order ID
        prefill?: {
            email?: string;
            contact?: string;
            name?: string;
        };
        theme?: {
            color?: string;
        };
    };
    onSuccess: (data: any) => void;
    onFailure: (data: any) => void;
}

export const RazorpayCheckout: React.FC<RazorpayCheckoutProps> = ({ options, onSuccess, onFailure }) => {
    
    // HTML Content for the WebView
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment</title>
        <style>
            body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
            .loader { border: 4px solid #f3f3f3; border-top: 4px solid ${options.theme?.color || '#3B82F6'}; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            p { margin-top: 20px; color: #64748b; font-size: 14px; }
            .container { text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="loader"></div>
            <p>Initializing Secure Payment...</p>
        </div>

        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        
        <script>
            // Parse options from the injected string (WebView safeguard)
            const options = ${JSON.stringify(options)};

            // Success Handler
            options.handler = function (response) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PAYMENT_SUCCESS', payload: response }));
            };

            // Modal Dismiss Handler (User cancelled or closed)
            options.modal = {
                ondismiss: function() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PAYMENT_CANCELLED', payload: { description: 'Payment cancelled by user' } }));
                }
            };

            // Initialize Razorpay
            const rzp = new Razorpay(options);

            // Error Handler
            rzp.on('payment.failed', function (response){
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PAYMENT_FAILED', payload: response.error }));
            });

            // Open Checkout immediately
            window.onload = function() {
                rzp.open();
            };
        </script>
    </body>
    </html>
    `;

    return (
        <View style={styles.container}>
            <WebView
                originWhitelist={['*']}
                source={{ html: htmlContent }}
                style={styles.webview}
                javaScriptEnabled={true}
                onMessage={(event) => {
                    try {
                        const data = JSON.parse(event.nativeEvent.data);
                        if (data.type === 'PAYMENT_SUCCESS') {
                            onSuccess(data.payload);
                        } else if (data.type === 'PAYMENT_FAILED') {
                            onFailure(data.payload);
                        } else if (data.type === 'PAYMENT_CANCELLED') {
                            onFailure(data.payload);
                        }
                    } catch (err) {
                        console.error("WebView Message Error", err);
                    }
                }}
                startInLoadingState={true}
                renderLoading={() => <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)', // Semi-transparent for modal effect
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    loader: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        zIndex: 10,
    }
});
