package org.example.bmsdec24.services;

import org.example.bmsdec24.exceptions.UserAlreadyPresentException;
import org.example.bmsdec24.models.User;
import org.example.bmsdec24.repos.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public User signupUser(String name, String email, String password) throws UserAlreadyPresentException {
        if (userRepository.findByEmail(email) != null) {
            throw new UserAlreadyPresentException("An account already exists for email: " + email);
        }

        String encodedPassword = passwordEncoder.encode(password);
        User user = new User();
        user.setPassword(encodedPassword);
        user.setName(name);
        user.setEmail(email);

        return userRepository.save(user);
    }
}
