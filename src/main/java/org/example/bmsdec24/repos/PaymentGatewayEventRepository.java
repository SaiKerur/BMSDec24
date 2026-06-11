package org.example.bmsdec24.repos;

import org.example.bmsdec24.models.PaymentGatewayEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentGatewayEventRepository extends JpaRepository<PaymentGatewayEvent, Integer> {

    Optional<PaymentGatewayEvent> findByGatewayEventId(String gatewayEventId);

    boolean existsByGatewayEventId(String gatewayEventId);
}
