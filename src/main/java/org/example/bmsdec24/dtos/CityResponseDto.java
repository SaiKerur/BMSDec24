package org.example.bmsdec24.dtos;

import org.example.bmsdec24.models.City;

public class CityResponseDto {
    private int id;
    private String name;

    public static CityResponseDto from(City city) {
        if (city == null) {
            return null;
        }
        CityResponseDto dto = new CityResponseDto();
        dto.setId(city.getId());
        dto.setName(city.getName());
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
}
