package org.example.bmsdec24.dtos;

import org.example.bmsdec24.models.PaymentProvider;

public class PaymentProviderOptionDto {
    private PaymentProvider provider;
    private String displayName;
    private boolean configured;

    public PaymentProviderOptionDto(PaymentProvider provider, String displayName, boolean configured) {
        this.provider = provider;
        this.displayName = displayName;
        this.configured = configured;
    }

    public PaymentProvider getProvider() {
        return provider;
    }

    public void setProvider(PaymentProvider provider) {
        this.provider = provider;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public boolean isConfigured() {
        return configured;
    }

    public void setConfigured(boolean configured) {
        this.configured = configured;
    }
}
