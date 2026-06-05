package org.example.bmsdec24.dtos;

import java.util.List;

public class ShowAvailabilityResponseDto {

    private int showId;
    private int totalSeats;
    private long availableSeats;
    private long blockedSeats;
    private long bookedSeats;
    private long serverTimeEpochMs;
    private List<ShowSeatLiveStatusDto> seats;

    public int getShowId() {
        return showId;
    }

    public void setShowId(int showId) {
        this.showId = showId;
    }

    public int getTotalSeats() {
        return totalSeats;
    }

    public void setTotalSeats(int totalSeats) {
        this.totalSeats = totalSeats;
    }

    public long getAvailableSeats() {
        return availableSeats;
    }

    public void setAvailableSeats(long availableSeats) {
        this.availableSeats = availableSeats;
    }

    public long getBlockedSeats() {
        return blockedSeats;
    }

    public void setBlockedSeats(long blockedSeats) {
        this.blockedSeats = blockedSeats;
    }

    public long getBookedSeats() {
        return bookedSeats;
    }

    public void setBookedSeats(long bookedSeats) {
        this.bookedSeats = bookedSeats;
    }

    public long getServerTimeEpochMs() {
        return serverTimeEpochMs;
    }

    public void setServerTimeEpochMs(long serverTimeEpochMs) {
        this.serverTimeEpochMs = serverTimeEpochMs;
    }

    public List<ShowSeatLiveStatusDto> getSeats() {
        return seats;
    }

    public void setSeats(List<ShowSeatLiveStatusDto> seats) {
        this.seats = seats;
    }
}
