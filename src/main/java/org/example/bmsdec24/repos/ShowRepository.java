package org.example.bmsdec24.repos;

import org.example.bmsdec24.models.Show;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShowRepository extends JpaRepository<Show, Integer> {

    @EntityGraph(attributePaths = {"movie", "screen", "screen.theatre"})
    List<Show> findAllByScreen_Theatre_Id(int theatreId);

    @EntityGraph(attributePaths = {"movie", "screen", "screen.theatre"})
    List<Show> findAllByMovie_Id(int movieId);

    @EntityGraph(attributePaths = {"movie", "screen", "screen.theatre"})
    Optional<Show> findDetailedById(int showId);
}
