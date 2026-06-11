package org.example.bmsdec24.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;

@Entity(name = "cancellation_policies")
public class CancellationPolicy extends BaseModel {

    @Column(name = "hours_before_show", nullable = false)
    private int hoursBeforeShow;

    @Column(name = "refund_percentage", nullable = false)
    private int refundPercentage;

    private String description;

    public int getHoursBeforeShow() {
        return hoursBeforeShow;
    }

    public void setHoursBeforeShow(int hoursBeforeShow) {
        this.hoursBeforeShow = hoursBeforeShow;
    }

    public int getRefundPercentage() {
        return refundPercentage;
    }

    public void setRefundPercentage(int refundPercentage) {
        this.refundPercentage = refundPercentage;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
