package org.example.bmsdec24.repos;

import org.example.bmsdec24.models.CancellationPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CancellationPolicyRepository extends JpaRepository<CancellationPolicy, Integer> {

    List<CancellationPolicy> findAllByOrderByHoursBeforeShowDesc();
}
