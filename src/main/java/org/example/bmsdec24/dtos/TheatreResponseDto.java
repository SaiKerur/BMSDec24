package org.example.bmsdec24.dtos;

import org.example.bmsdec24.models.Theatre;

public class TheatreResponseDto {
    private int id;
    private String name;
    private String address;
    private CityResponseDto city;

    public static TheatreResponseDto from(Theatre theatre) {
        if (theatre == null) {
            return null;
        }
        TheatreResponseDto dto = new TheatreResponseDto();
        dto.setId(theatre.getId());
        dto.setName(theatre.getName());
        dto.setAddress(theatre.getAddress());
        dto.setCity(CityResponseDto.from(theatre.getCity()));
        return dto;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public CityResponseDto getCity() {
        return city;
    }

    public void setCity(CityResponseDto city) {
        this.city = city;
    }
}
