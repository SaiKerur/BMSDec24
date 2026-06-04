package org.example.bmsdec24.dtos;

public class ApiErrorDto {

    private String error;
    private String message;

    public ApiErrorDto() {
    }

    public ApiErrorDto(String error, String message) {
        this.error = error;
        this.message = message;
    }

    public static ApiErrorDto of(String error, String message) {
        return new ApiErrorDto(error, message);
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
