package org.example.bmsdec24.payments;

import org.example.bmsdec24.models.PaymentProvider;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Component
public class PaymentGatewayFactory {

    private final Map<PaymentProvider, PaymentGateway> gatewaysByProvider = new EnumMap<>(PaymentProvider.class);

    public PaymentGatewayFactory(List<PaymentGateway> gateways) {
        for (PaymentGateway gateway : gateways) {
            gatewaysByProvider.put(gateway.getProvider(), gateway);
        }
    }

    public PaymentGateway getGateway(PaymentProvider provider) {
        PaymentGateway gateway = gatewaysByProvider.get(provider);
        if (gateway == null) {
            throw new IllegalArgumentException("Unsupported payment provider: " + provider);
        }
        return gateway;
    }
}
