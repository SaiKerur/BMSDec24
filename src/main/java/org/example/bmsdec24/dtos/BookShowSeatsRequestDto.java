package org.example.bmsdec24.dtos;

import java.util.List;

public class BookShowSeatsRequestDto {

    private List<Integer> showSeatIds;

    public List<Integer> getShowSeatIds() {
        return showSeatIds;
    }

    public void setShowSeatIds(List<Integer> showSeatIds) {
        this.showSeatIds = showSeatIds;
    }
}
