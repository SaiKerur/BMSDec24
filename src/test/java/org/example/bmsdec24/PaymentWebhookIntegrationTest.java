package org.example.bmsdec24;

import com.fasterxml.jackson.databind.JsonNode;
import org.example.bmsdec24.models.BookingStatus;
import org.example.bmsdec24.models.City;
import org.example.bmsdec24.models.Genre;
import org.example.bmsdec24.models.Movie;
import org.example.bmsdec24.models.PaymentStatus;
import org.example.bmsdec24.models.Role;
import org.example.bmsdec24.models.Seat;
import org.example.bmsdec24.models.SeatStatus;
import org.example.bmsdec24.models.SeatType;
import org.example.bmsdec24.models.Theatre;
import org.example.bmsdec24.models.TheatreMovie;
import org.example.bmsdec24.models.User;
import org.example.bmsdec24.repos.BookingEventRepository;
import org.example.bmsdec24.repos.BookingRepository;
import org.example.bmsdec24.repos.CityRepository;
import org.example.bmsdec24.repos.MovieRepository;
import org.example.bmsdec24.repos.PaymentGatewayEventRepository;
import org.example.bmsdec24.repos.PaymentRepository;
import org.example.bmsdec24.repos.SeatRepository;
import org.example.bmsdec24.repos.TheatreRepository;
import org.example.bmsdec24.repos.TicketRepository;
import org.example.bmsdec24.repos.UserRepository;
import org.example.bmsdec24.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PaymentWebhookIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CityRepository cityRepository;

    @Autowired
    private TheatreRepository theatreRepository;

    @Autowired
    private MovieRepository movieRepository;

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private BookingEventRepository bookingEventRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private PaymentGatewayEventRepository paymentGatewayEventRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String userToken;
    private int movieId;
    private int seatId;

    @BeforeEach
    void setUp() {
        paymentGatewayEventRepository.deleteAll();
        ticketRepository.deleteAll();
        paymentRepository.deleteAll();
        bookingEventRepository.deleteAll();
        bookingRepository.deleteAll();
        seatRepository.deleteAll();
        theatreRepository.deleteAll();
        movieRepository.deleteAll();
        cityRepository.deleteAll();
        userRepository.deleteAll();

        User user = new User();
        user.setName("Webhook Test User");
        user.setEmail("webhook.user@test.com");
        user.setPassword(passwordEncoder.encode("Password@123"));
        user.setRole(Role.USER);
        user = userRepository.save(user);
        userToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), Role.USER);

        City city = new City();
        city.setName("Webhook City");
        city = cityRepository.save(city);

        Theatre theatre = new Theatre();
        theatre.setName("Webhook Theatre");
        theatre.setAddress("Webhook Address");
        theatre.setCity(city);
        theatre = theatreRepository.save(theatre);

        Movie movie = new Movie();
        movie.setTitle("Webhook Movie");
        movie.setGenre(Genre.ACTION);
        movie = movieRepository.save(movie);
        movieId = movie.getId();

        TheatreMovie link = new TheatreMovie();
        link.setTheatre(theatre);
        link.setMovie(movie);
        link.syncDenormalizedNames();
        theatre.setTheatreMovies(List.of(link));
        theatreRepository.save(theatre);

        Seat seat = new Seat();
        seat.setSeatNumber("W1");
        seat.setSeatType(SeatType.GOLD);
        seat.setPrice(200.0);
        seat.setSeatStatus(SeatStatus.AVAILABLE);
        seat.setTheatre(theatre);
        seat.syncDenormalizedNames();
        seat = seatRepository.save(seat);
        seatId = seat.getId();
    }

    @Test
    void stripeWebhook_confirmsBooking_andIsIdempotentOnRetry() throws Exception {
        int bookingId = createPendingBooking();
        WebhookContext context = initiateStripePayment(bookingId);

        String payload = """
                {
                  "id": "evt_integration_stripe_001",
                  "type": "payment_intent.succeeded",
                  "data": {
                    "object": {
                      "id": "%s",
                      "status": "succeeded"
                    }
                  }
                }
                """.formatted(context.gatewayOrderId());

        mockMvc.perform(post("/api/payments/webhooks/stripe")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Stripe-Signature", "whsec_integration_test")
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.outcome").value("PROCESSED"))
                .andExpect(jsonPath("$.paymentStatus").value("SUCCESS"))
                .andExpect(jsonPath("$.bookingStatus").value("CONFIRMED"));

        assertEquals(BookingStatus.CONFIRMED,
                bookingRepository.findById(bookingId).orElseThrow().getStatus());
        assertEquals(PaymentStatus.SUCCESS,
                paymentRepository.findById(context.paymentId()).orElseThrow().getStatus());
        assertTrue(paymentGatewayEventRepository.existsByGatewayEventId("evt_integration_stripe_001"));

        mockMvc.perform(post("/api/payments/webhooks/stripe")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Stripe-Signature", "whsec_integration_test")
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.outcome").value("ALREADY_PROCESSED"));
    }

    @Test
    void razorpayWebhook_failure_cancelsBooking() throws Exception {
        int bookingId = createPendingBooking();
        WebhookContext context = initiateRazorpayPayment(bookingId);

        String payload = """
                {
                  "event": "payment.failed",
                  "payload": {
                    "payment": {
                      "entity": {
                        "id": "pay_integration_rzp_fail",
                        "order_id": "%s",
                        "status": "failed",
                        "error_description": "Insufficient balance"
                      }
                    }
                  }
                }
                """.formatted(context.gatewayOrderId());

        mockMvc.perform(post("/api/payments/webhooks/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Razorpay-Signature", "rzp_sig_integration_test")
                        .header("X-Razorpay-Event-Id", "evt_integration_rzp_fail_001")
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.outcome").value("PROCESSED"))
                .andExpect(jsonPath("$.paymentStatus").value("FAILED"))
                .andExpect(jsonPath("$.bookingStatus").value("CANCELLED"));

        assertEquals(BookingStatus.CANCELLED,
                bookingRepository.findById(bookingId).orElseThrow().getStatus());
    }

    @Test
    void stripeWebhook_rejectsInvalidSignature() throws Exception {
        mockMvc.perform(post("/api/payments/webhooks/stripe")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Stripe-Signature", "invalid_signature")
                        .content("{\"id\":\"evt_bad\",\"type\":\"payment_intent.succeeded\",\"data\":{\"object\":{\"id\":\"pi_x\",\"status\":\"succeeded\"}}}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("INVALID_WEBHOOK_SIGNATURE"));
    }

    private int createPendingBooking() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/bookings/book")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "movieId": %d,
                                  "seatIds": [%d]
                                }
                                """.formatted(movieId, seatId)))
                .andExpect(status().isOk())
                .andReturn();
        return parseJson(result).get("id").asInt();
    }

    private WebhookContext initiateStripePayment(int bookingId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/payments/initiate")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "bookingId": %d,
                                  "provider": "STRIPE"
                                }
                                """.formatted(bookingId)))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode json = parseJson(result);
        return new WebhookContext(json.get("paymentId").asInt(), json.get("gatewayOrderId").asText());
    }

    private WebhookContext initiateRazorpayPayment(int bookingId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/payments/initiate")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "bookingId": %d,
                                  "provider": "RAZORPAY"
                                }
                                """.formatted(bookingId)))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode json = parseJson(result);
        return new WebhookContext(json.get("paymentId").asInt(), json.get("gatewayOrderId").asText());
    }

    private JsonNode parseJson(MvcResult result) throws Exception {
        return new com.fasterxml.jackson.databind.ObjectMapper()
                .readTree(result.getResponse().getContentAsString());
    }

    private record WebhookContext(int paymentId, String gatewayOrderId) {
    }
}
