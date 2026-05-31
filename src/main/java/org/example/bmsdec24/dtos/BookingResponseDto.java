package org.example.bmsdec24.dtos;

import org.example.bmsdec24.models.Booking;
import org.example.bmsdec24.models.BookingStatus;

import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

public class BookingResponseDto {
    private int id;
    private Date createdAt;
    private Date updatedAt;
    private UserResponseDto user;
    private MovieResponseDto movie;
    private TheatreResponseDto theatre;
    private List<SeatResponseDto> seats;
    private BookingStatus status;
    private double totalAmount;
    private Date holdExpiresAt;
    private String userName;
    private String movieName;
    private String theatreName;

    public static BookingResponseDto from(Booking booking) {
        BookingResponseDto dto = new BookingResponseDto();
        dto.setId(booking.getId());
        dto.setCreatedAt(booking.getCreatedAt());
        dto.setUpdatedAt(booking.getUpdatedAt());
        dto.setUser(UserResponseDto.from(booking.getUser()));
        dto.setMovie(MovieResponseDto.from(booking.getMovie()));
        dto.setTheatre(TheatreResponseDto.from(booking.getTheatre()));
        if (booking.getSeats() != null) {
            dto.setSeats(booking.getSeats().stream()
                    .map(SeatResponseDto::from)
                    .collect(Collectors.toList()));
        }
        dto.setStatus(booking.getStatus());
        dto.setTotalAmount(booking.getTotalAmount());
        dto.setHoldExpiresAt(booking.getHoldExpiresAt());
        dto.setUserName(booking.getUserName());
        dto.setMovieName(booking.getMovieName());
        dto.setTheatreName(booking.getTheatreName());
        return dto;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }

    public Date getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Date updatedAt) {
        this.updatedAt = updatedAt;
    }

    public UserResponseDto getUser() {
        return user;
    }

    public void setUser(UserResponseDto user) {
        this.user = user;
    }

    public MovieResponseDto getMovie() {
        return movie;
    }

    public void setMovie(MovieResponseDto movie) {
        this.movie = movie;
    }

    public TheatreResponseDto getTheatre() {
        return theatre;
    }

    public void setTheatre(TheatreResponseDto theatre) {
        this.theatre = theatre;
    }

    public List<SeatResponseDto> getSeats() {
        return seats;
    }

    public void setSeats(List<SeatResponseDto> seats) {
        this.seats = seats;
    }

    public BookingStatus getStatus() {
        return status;
    }

    public void setStatus(BookingStatus status) {
        this.status = status;
    }

    public double getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(double totalAmount) {
        this.totalAmount = totalAmount;
    }

    public Date getHoldExpiresAt() {
        return holdExpiresAt;
    }

    public void setHoldExpiresAt(Date holdExpiresAt) {
        this.holdExpiresAt = holdExpiresAt;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getMovieName() {
        return movieName;
    }

    public void setMovieName(String movieName) {
        this.movieName = movieName;
    }

    public String getTheatreName() {
        return theatreName;
    }

    public void setTheatreName(String theatreName) {
        this.theatreName = theatreName;
    }
}
