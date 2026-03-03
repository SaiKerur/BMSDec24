package org.example.bmsdec24;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class BmsDec24Application {

    public static void main(String[] args) {
        SpringApplication.run(BmsDec24Application.class, args);
    }
}
