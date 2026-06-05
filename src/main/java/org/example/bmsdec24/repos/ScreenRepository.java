package org.example.bmsdec24.repos;

import org.example.bmsdec24.models.Screen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScreenRepository extends JpaRepository<Screen, Integer> {

    List<Screen> findAllByTheatre_Id(int theatreId);
}
