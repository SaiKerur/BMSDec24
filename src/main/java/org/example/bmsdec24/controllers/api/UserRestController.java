package org.example.bmsdec24.controllers.api;

import org.example.bmsdec24.dtos.ResponseStatus;
import org.example.bmsdec24.dtos.SignupRequestDto;
import org.example.bmsdec24.dtos.SignupResponseDto;
import org.example.bmsdec24.exceptions.InvalidRequestException;
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
    public ResponseEntity<SignupResponseDto> signUp(@RequestBody SignupRequestDto requestDto)
            throws UserAlreadyPresentException, InvalidRequestException {
        validateSignupRequest(requestDto);
        User user = userService.signupUser(requestDto.getName(), requestDto.getEmail(), requestDto.getPassword());
        SignupResponseDto responseDto = new SignupResponseDto();
        responseDto.setUserId(user.getId());
        responseDto.setResponseStatus(ResponseStatus.SUCCESS);
        responseDto.setMessage("User registered successfully");
        return ResponseEntity.status(HttpStatus.CREATED).body(responseDto);
    }

    private void validateSignupRequest(SignupRequestDto requestDto) throws InvalidRequestException {
        if (requestDto == null) {
            throw new InvalidRequestException("Request body is required with name, email, and password");
        }
        if (isBlank(requestDto.getName())) {
            throw new InvalidRequestException("name is required");
        }
        if (isBlank(requestDto.getEmail())) {
            throw new InvalidRequestException("email is required");
        }
        if (isBlank(requestDto.getPassword())) {
            throw new InvalidRequestException("password is required");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
