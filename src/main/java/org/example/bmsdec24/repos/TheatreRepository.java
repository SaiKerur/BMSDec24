package org.example.bmsdec24.repos;

import org.example.bmsdec24.models.Theatre;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TheatreRepository extends JpaRepository<Theatre, Integer> {

    @EntityGraph(attributePaths = {"city"})
    List<Theatre> findAllByCity_Id(int cityId);

    @EntityGraph(attributePaths = {"theatreMovies", "theatreMovies.movie", "city"})
    Optional<Theatre> findWithMoviesById(int theatreId);
}
