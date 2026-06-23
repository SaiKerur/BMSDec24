import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { PaymentInit } from '../../types';
import { api } from '../../lib/api';
import { Button } from '../ui/Button';
import { isMockStripe, MockStripePayment } from './PaymentForms';

type Props = {
  payment: PaymentInit;
  onSuccess: () => void;
  onError: (msg: string) => void;
};

function StripeForm({ payment, onSuccess, onError }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: { return_url: `${window.location.origin}/#/checkout/${payment.bookingId}` },
      });
      if (error) {
        onError(error.message || t('common.error'));
        return;
      }
      if (paymentIntent?.status === 'succeeded') {
        await api('/payments/callback', {
          method: 'POST',
          auth: true,
          body: {
            paymentId: payment.paymentId,
            paymentReference: paymentIntent.id,
            signature: 'whsec_stripe_elements',
            success: true,
          },
        });
        onSuccess();
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel">
      <PaymentElement />
      <Button variant="primary" block disabled={busy || !stripe} onClick={submit} style={{ marginTop: 16 }}>
        {busy ? t('checkout.processing') : t('payment.payNow')}
      </Button>
    </div>
  );
}

export function StripeCheckout(props: Props) {
  const { payment } = props;
  if (isMockStripe(payment)) {
    return <MockStripePayment {...props} />;
  }
  if (!payment.clientSecret || !payment.publishableKey) {
    return <MockStripePayment {...props} />;
  }
  const stripePromise = loadStripe(payment.publishableKey);
  return (
    <Elements stripe={stripePromise} options={{ clientSecret: payment.clientSecret }}>
      <StripeForm {...props} />
    </Elements>
  );
}
