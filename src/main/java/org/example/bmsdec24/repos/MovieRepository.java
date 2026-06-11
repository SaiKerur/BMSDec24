package org.example.bmsdec24.repos;

import org.example.bmsdec24.models.Genre;
import org.example.bmsdec24.models.Movie;
import org.example.bmsdec24.models.MovieStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MovieRepository extends JpaRepository<Movie, Integer> {

    List<Movie> findAllByGenre(Genre genre);

    List<Movie> findAllByStatus(MovieStatus status);

    List<Movie> findDistinctByStatusAndTheatreMovies_Theatre_City_Id(MovieStatus status, int cityId);

    @Query("SELECT DISTINCT m FROM movies m LEFT JOIN m.castMembers c WHERE "
            + "LOWER(m.title) LIKE LOWER(CONCAT('%', :q, '%')) OR "
            + "LOWER(m.synopsis) LIKE LOWER(CONCAT('%', :q, '%')) OR "
            + "LOWER(c) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<Movie> search(@Param("q") String q);
}
