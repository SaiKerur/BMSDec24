package org.example.bmsdec24.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

@Entity(name = "seats")
public class Seat extends BaseModel {

    private String seatNumber;

    @Enumerated(EnumType.STRING)
    private SeatType seatType;

    private double price;

    @Enumerated(EnumType.STRING)
    private SeatStatus seatStatus;

    @ManyToOne
    @JoinColumn(name = "theatre_id")
    private Theatre theatre;

    @ManyToOne
    @JoinColumn(name = "booked_by_user_id")
    private User bookedBy;

    @Column(name = "booked_by_user_name")
    private String bookedByUserName;

    @Column(name = "theatre_name")
    private String theatreName;

    public String getSeatNumber() {
        return seatNumber;
    }

    public void setSeatNumber(String seatNumber) {
        this.seatNumber = seatNumber;
    }

    public SeatType getSeatType() {
        return seatType;
    }

    public void setSeatType(SeatType seatType) {
        this.seatType = seatType;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public SeatStatus getSeatStatus() {
        return seatStatus;
    }

    public void setSeatStatus(SeatStatus seatStatus) {
        this.seatStatus = seatStatus;
    }

    public Theatre getTheatre() {
        return theatre;
    }

    public void setTheatre(Theatre theatre) {
        this.theatre = theatre;
        syncDenormalizedNames();
    }

    public User getBookedBy() {
        return bookedBy;
    }

    public void setBookedBy(User bookedBy) {
        this.bookedBy = bookedBy;
        this.bookedByUserName = bookedBy != null ? bookedBy.getName() : null;
    }

    public String getBookedByUserName() {
        return bookedByUserName;
    }

    public void setBookedByUserName(String bookedByUserName) {
        this.bookedByUserName = bookedByUserName;
    }

    public String getTheatreName() {
        return theatreName;
    }

    public void setTheatreName(String theatreName) {
        this.theatreName = theatreName;
    }

    public void syncDenormalizedNames() {
        if (theatre != null) {
            this.theatreName = theatre.getName();
        }
        if (bookedBy != null) {
            this.bookedByUserName = bookedBy.getName();
        }
    }
}
