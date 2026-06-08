package org.example.bmsdec24.dtos;

import java.util.List;

public class BookSeatsRequestDto {
    private int movieId;
    private List<Integer> seatIds;

    public int getMovieId() {
        return movieId;
    }

    public void setMovieId(int movieId) {
        this.movieId = movieId;
    }

    public List<Integer> getSeatIds() {
        return seatIds;
    }

    public void setSeatIds(List<Integer> seatIds) {
        this.seatIds = seatIds;
    }
}
