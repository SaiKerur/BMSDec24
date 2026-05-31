package org.example.bmsdec24.dtos;

import org.example.bmsdec24.models.Seat;
import org.example.bmsdec24.models.SeatStatus;
import org.example.bmsdec24.models.SeatType;

public class SeatResponseDto {
    private int id;
    private String seatNumber;
    private SeatType seatType;
    private double price;
    private SeatStatus seatStatus;
    private String bookedByUserName;
    private String theatreName;

    public static SeatResponseDto from(Seat seat) {
        if (seat == null) {
            return null;
        }
        SeatResponseDto dto = new SeatResponseDto();
        dto.setId(seat.getId());
        dto.setSeatNumber(seat.getSeatNumber());
        dto.setSeatType(seat.getSeatType());
        dto.setPrice(seat.getPrice());
        dto.setSeatStatus(seat.getSeatStatus());
        dto.setBookedByUserName(seat.getBookedByUserName());
        dto.setTheatreName(seat.getTheatreName());
        return dto;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

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
}
