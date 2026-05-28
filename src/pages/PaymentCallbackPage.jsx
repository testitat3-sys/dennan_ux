import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import Page from '../components/ui/Page';
import Card from '../components/ui/Card';
import Text from '../components/ui/Text';
import Button from '../components/ui/Button';

const PaymentCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // processing, success, failed

  const orderTrackingId = searchParams.get('OrderTrackingId');
  const orderMerchantReference = searchParams.get('OrderMerchantReference'); // this is the orderId

  // We can query the order directly if we want to wait for IPN
  const order = useQuery(
    api.orders.getOrderForClient,
    orderMerchantReference ? { orderId: orderMerchantReference } : "skip"
  );

  useEffect(() => {
    if (!orderTrackingId || !orderMerchantReference) {
      setStatus('failed');
      return;
    }

    if (order) {
      if (order.status === 'preparing' || order.status === 'dispatched' || order.status === 'delivered') {
        setStatus('success');
      } else if (order.status === 'failed' || order.status === 'cancelled') {
        setStatus('failed');
      } else {
        // Still pending_payment, might take a few seconds for IPN to hit
        setStatus('processing');
      }
    }
  }, [order, orderTrackingId, orderMerchantReference]);

  return (
    <Page>
      <Page.Section style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Card style={{ maxWidth: '500px', width: '100%', textAlign: 'center', padding: '2rem' }}>
          <Card.Body>
            {status === 'processing' && (
              <>
                <div style={{ marginBottom: '1rem' }}>
                   <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" strokeWidth="2" className="spin">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                   </svg>
                </div>
                <Text role="title-lg" as="h2">Processing Payment...</Text>
                <Text role="body-md" as="p" color="secondary" style={{ marginTop: '0.5rem' }}>
                  Please wait while we confirm your payment with Pesapal. This may take a few moments.
                </Text>
              </>
            )}

            {status === 'success' && (
              <>
                <div style={{ marginBottom: '1rem', color: 'var(--color-support-green)' }}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <Text role="display-sm" as="h2" color="primary">Payment Successful!</Text>
                <Text role="body-lg" as="p" color="secondary" style={{ marginTop: '0.5rem' }}>
                  Your order #{order?._id} has been confirmed and is being prepared.
                </Text>
                <Button 
                  variant="primary" 
                  style={{ marginTop: '2rem' }}
                  fullWidth
                  onClick={() => navigate('/')}
                >
                  Continue Shopping
                </Button>
              </>
            )}

            {status === 'failed' && (
              <>
                <div style={{ marginBottom: '1rem', color: 'var(--color-support-red)' }}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                </div>
                <Text role="display-sm" as="h2" color="primary">Payment Failed</Text>
                <Text role="body-lg" as="p" color="secondary" style={{ marginTop: '0.5rem' }}>
                  We couldn't confirm your payment. Please try again.
                </Text>
                <Button 
                  variant="primary" 
                  style={{ marginTop: '2rem' }}
                  fullWidth
                  onClick={() => navigate('/checkout')}
                >
                  Return to Checkout
                </Button>
              </>
            )}
          </Card.Body>
        </Card>
      </Page.Section>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </Page>
  );
};

export default PaymentCallbackPage;
