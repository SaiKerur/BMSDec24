import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiWithAuthRetry } from '../lib/api';
import { formatMoney } from '../lib/i18n';
import type { Refund } from '../types';

export function RefundPage() {
  const { refundId } = useParams();
  const [refund, setRefund] = useState<Refund | null>(null);

  useEffect(() => {
    if (!refundId) return;
    void apiWithAuthRetry<Refund>(`/refunds/${refundId}`).then(setRefund);
  }, [refundId]);

  if (!refund) return <div className="spinner" aria-label="Loading" />;

  return (
    <div className="panel">
      <h1 className="section-title">Refund #{refund.id}</h1>
      <div className="kv"><span className="k">Status</span><span className={`pill ${refund.status}`}>{refund.status}</span></div>
      <div className="kv"><span className="k">Amount</span><span>{formatMoney(refund.refundAmount)}</span></div>
    </div>
  );
}
