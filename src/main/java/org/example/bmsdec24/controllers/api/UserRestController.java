package org.example.bmsdec24.controllers.api;

import org.example.bmsdec24.dtos.ResponseStatus;
import org.example.bmsdec24.dtos.SignupRequestDto;
import org.example.bmsdec24.dtos.SignupResponseDto;
import org.example.bmsdec24.exceptions.UserAlreadyPresentException;
import org.example.bmsdec24.models.User;
import org.example.bmsdec24.services.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserRestController {

    private final UserService userService;

    public UserRestController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/signup")
    public ResponseEntity<SignupResponseDto> signUp(@RequestBody SignupRequestDto requestDto) {
        SignupResponseDto responseDto = new SignupResponseDto();
        try {
            User user = userService.signupUser(requestDto.getName(), requestDto.getEmail(), requestDto.getPassword());
            responseDto.setUserId(user.getId());
            responseDto.setResponseStatus(ResponseStatus.SUCCESS);
            return ResponseEntity.status(HttpStatus.CREATED).body(responseDto);
        } catch (UserAlreadyPresentException e) {
            responseDto.setResponseStatus(ResponseStatus.FAILURE);
            return ResponseEntity.status(HttpStatus.CONFLICT).body(responseDto);
        } catch (Exception e) {
            responseDto.setResponseStatus(ResponseStatus.FAILURE);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(responseDto);
        }
    }
}

