package org.example.bmsdec24.dtos;

import org.example.bmsdec24.models.Show;

import java.util.Date;

public class ShowResponseDto {

    private int id;
    private int movieId;
    private String movieTitle;
    private int theatreId;
    private String theatreName;
    private int screenId;
    private String screenName;
    private Date startTime;

    public static ShowResponseDto from(Show show) {
        ShowResponseDto dto = new ShowResponseDto();
        dto.setId(show.getId());
        dto.setStartTime(show.getStartTime());
        if (show.getMovie() != null) {
            dto.setMovieId(show.getMovie().getId());
            dto.setMovieTitle(show.getMovie().getTitle());
        }
        if (show.getScreen() != null) {
            dto.setScreenId(show.getScreen().getId());
            dto.setScreenName(show.getScreen().getName());
            if (show.getScreen().getTheatre() != null) {
                dto.setTheatreId(show.getScreen().getTheatre().getId());
                dto.setTheatreName(show.getScreen().getTheatre().getName());
            }
        }
        return dto;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getMovieId() {
        return movieId;
    }

    public void setMovieId(int movieId) {
        this.movieId = movieId;
    }

    public String getMovieTitle() {
        return movieTitle;
    }

    public void setMovieTitle(String movieTitle) {
        this.movieTitle = movieTitle;
    }

    public int getTheatreId() {
        return theatreId;
    }

    public void setTheatreId(int theatreId) {
        this.theatreId = theatreId;
    }

    public String getTheatreName() {
        return theatreName;
    }

    public void setTheatreName(String theatreName) {
        this.theatreName = theatreName;
    }

    public int getScreenId() {
        return screenId;
    }

    public void setScreenId(int screenId) {
        this.screenId = screenId;
    }

    public String getScreenName() {
        return screenName;
    }

    public void setScreenName(String screenName) {
        this.screenName = screenName;
    }

    public Date getStartTime() {
        return startTime;
    }

    public void setStartTime(Date startTime) {
        this.startTime = startTime;
    }
}
