import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import type { PaymentInit } from '../../types';
import { Button } from '../ui/Button';

type Props = {
  payment: PaymentInit;
  onSuccess: () => void;
  onError: (msg: string) => void;
};

export function MockStripePayment({ payment, onSuccess, onError }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const pay = async () => {
    setBusy(true);
    try {
      await api('/payments/callback', {
        method: 'POST',
        auth: true,
        body: {
          paymentId: payment.paymentId,
          paymentReference: payment.gatewayOrderId,
          signature: 'whsec_mock_frontend',
          success: true,
        },
      });
      onSuccess();
    } catch (e) {
      onError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel mock-payment">
      <p className="section-sub">{t('payment.mockStripe')}</p>
      <div className="field">
        <input placeholder={t('payment.cardNumber')} defaultValue="4242 4242 4242 4242" readOnly />
      </div>
      <Button variant="primary" block disabled={busy} onClick={pay}>
        {busy ? t('checkout.processing') : t('payment.payNow')}
      </Button>
    </div>
  );
}

export function isMockStripe(payment: PaymentInit) {
  return (
    !payment.publishableKey ||
    payment.publishableKey.startsWith('pk_test_mock') ||
    (payment.clientSecret?.includes('_mock_') ?? false)
  );
}

export function isMockRazorpay(payment: PaymentInit) {
  return !payment.publishableKey || payment.publishableKey.startsWith('rzp_test_mock');
}

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(s);
  });
}

export function RazorpayCheckout({ payment, onSuccess, onError }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  if (isMockRazorpay(payment)) {
    return <MockRazorpayPayment payment={payment} onSuccess={onSuccess} onError={onError} />;
  }

  const open = async () => {
    setBusy(true);
    try {
      await loadRazorpayScript();
      const rzp = new window.Razorpay!({
        key: payment.publishableKey,
        amount: Math.round(payment.amount * 100),
        currency: payment.currency || 'INR',
        order_id: payment.gatewayOrderId,
        name: 'BookMyShow',
        handler: async (response: { razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await api('/payments/callback', {
              method: 'POST',
              auth: true,
              body: {
                paymentId: payment.paymentId,
                paymentReference: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                success: true,
              },
            });
            onSuccess();
          } catch (e) {
            onError(e instanceof Error ? e.message : t('common.error'));
          }
        },
        modal: {
          ondismiss: () => setBusy(false),
        },
      });
      rzp.open();
    } catch (e) {
      onError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="primary" block disabled={busy} onClick={open}>
      {busy ? t('checkout.processing') : t('payment.payNow')}
    </Button>
  );
}

function MockRazorpayPayment({ payment, onSuccess, onError }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const pay = async () => {
    setBusy(true);
    try {
      await api('/payments/callback', {
        method: 'POST',
        auth: true,
        body: {
          paymentId: payment.paymentId,
          paymentReference: `pay_mock_${payment.gatewayOrderId}`,
          signature: 'rzp_sig_mock_frontend',
          success: true,
        },
      });
      onSuccess();
    } catch (e) {
      onError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel mock-payment">
      <p className="section-sub">{t('payment.mockRazorpay')}</p>
      <Button variant="primary" block disabled={busy} onClick={pay}>
        {busy ? t('checkout.processing') : t('payment.payNow')}
      </Button>
    </div>
  );
}
