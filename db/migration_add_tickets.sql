-- Manual migration: ticket / order confirmation tables (JPA ddl-auto=update also creates these)
CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL UNIQUE,
    booking_reference VARCHAR(32) NOT NULL UNIQUE,
    qr_payload VARCHAR(512) NOT NULL,
    status VARCHAR(32) NOT NULL,
    issued_at TIMESTAMP NULL,
    validated_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_tickets_booking FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

CREATE INDEX idx_tickets_qr_payload ON tickets (qr_payload);
CREATE INDEX idx_tickets_booking_reference ON tickets (booking_reference);
