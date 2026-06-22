package org.example.bmsdec24.dtos;

import org.example.bmsdec24.models.SeatStatus;
import org.example.bmsdec24.models.SeatType;

public class ShowSeatLiveStatusDto {

    private int showSeatId;
    private int seatId;
    private String seatNumber;
    private SeatStatus seatStatus;
    private double price;
    private SeatType seatType;
    private long updatedAtEpochMs;

    public int getShowSeatId() {
        return showSeatId;
    }

    public void setShowSeatId(int showSeatId) {
        this.showSeatId = showSeatId;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public SeatType getSeatType() {
        return seatType;
    }

    public void setSeatType(SeatType seatType) {
        this.seatType = seatType;
    }

    public int getSeatId() {
        return seatId;
    }

    public void setSeatId(int seatId) {
        this.seatId = seatId;
    }

    public String getSeatNumber() {
        return seatNumber;
    }

    public void setSeatNumber(String seatNumber) {
        this.seatNumber = seatNumber;
    }

    public SeatStatus getSeatStatus() {
        return seatStatus;
    }

    public void setSeatStatus(SeatStatus seatStatus) {
        this.seatStatus = seatStatus;
    }

    public long getUpdatedAtEpochMs() {
        return updatedAtEpochMs;
    }

    public void setUpdatedAtEpochMs(long updatedAtEpochMs) {
        this.updatedAtEpochMs = updatedAtEpochMs;
    }
}
