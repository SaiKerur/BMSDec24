package org.example.bmsdec24;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.bmsdec24.models.BookingStatus;
import org.example.bmsdec24.models.CancellationPolicy;
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
import org.example.bmsdec24.repos.CancellationPolicyRepository;
import org.example.bmsdec24.repos.CityRepository;
import org.example.bmsdec24.repos.MovieRepository;
import org.example.bmsdec24.repos.PaymentGatewayEventRepository;
import org.example.bmsdec24.repos.PaymentRepository;
import org.example.bmsdec24.repos.RefundRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class RefundFlowIntegrationTest {

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
    private RefundRepository refundRepository;

    @Autowired
    private CancellationPolicyRepository cancellationPolicyRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String userToken;
    private int movieId;
    private int seatId;

    @BeforeEach
    void setUp() {
        refundRepository.deleteAll();
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
        cancellationPolicyRepository.deleteAll();

        cancellationPolicyRepository.save(policy(48, 100, "Full refund"));
        cancellationPolicyRepository.save(policy(24, 50, "Half refund"));
        cancellationPolicyRepository.save(policy(12, 25, "Quarter refund"));
        cancellationPolicyRepository.save(policy(0, 0, "No refund"));

        User user = new User();
        user.setName("Refund Test User");
        user.setEmail("refund.user@test.com");
        user.setPassword(passwordEncoder.encode("Password@123"));
        user.setRole(Role.USER);
        user = userRepository.save(user);
        userToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), Role.USER);

        City city = new City();
        city.setName("Refund City");
        city = cityRepository.save(city);

        Theatre theatre = new Theatre();
        theatre.setName("Refund Theatre");
        theatre.setAddress("Refund Address");
        theatre.setCity(city);
        theatre = theatreRepository.save(theatre);

        Movie movie = new Movie();
        movie.setTitle("Refund Movie");
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
        seat.setSeatNumber("A1");
        seat.setSeatType(SeatType.GOLD);
        seat.setPrice(250.0);
        seat.setSeatStatus(SeatStatus.AVAILABLE);
        seat.setTheatre(theatre);
        seat.syncDenormalizedNames();
        seat = seatRepository.save(seat);
        seatId = seat.getId();
    }

    @Test
    void refundPaidBookingWithoutShow_returnsFullRefundAndCancelsBooking() throws Exception {
        int bookingId = createPendingBooking();
        int paymentId = initiatePayment(bookingId);
        completePayment(paymentId);

        MvcResult refundResult = mockMvc.perform(post("/api/bookings/" + bookingId + "/refund")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reason":"Change of plans"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.refundPercentage").value(100))
                .andExpect(jsonPath("$.amount").value(250.0))
                .andExpect(jsonPath("$.gatewayRefundId").isNotEmpty())
                .andExpect(jsonPath("$.bookingStatus").value("CANCELLED"))
                .andReturn();

        int refundId = parseJson(refundResult).get("refundId").asInt();

        mockMvc.perform(get("/api/refunds/" + refundId)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.refundId").value(refundId))
                .andExpect(jsonPath("$.status").value("SUCCESS"));

        assertEquals(PaymentStatus.REFUNDED,
                paymentRepository.findDetailedById(paymentId).orElseThrow().getStatus());
        assertEquals(BookingStatus.CANCELLED,
                refundRepository.findDetailedById(refundId).orElseThrow().getBooking().getStatus());
    }

    @Test
    void refundPendingBooking_isRejected() throws Exception {
        int bookingId = createPendingBooking();

        mockMvc.perform(post("/api/bookings/" + bookingId + "/refund")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("REFUND_NOT_ALLOWED"));
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

    private int initiatePayment(int bookingId) throws Exception {
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
        return parseJson(result).get("paymentId").asInt();
    }

    private void completePayment(int paymentId) throws Exception {
        mockMvc.perform(post("/api/payments/callback")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "paymentId": %d,
                                  "paymentReference": "pay_refund_test",
                                  "signature": "whsec_refund_test",
                                  "success": true
                                }
                                """.formatted(paymentId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"));
    }

    private static CancellationPolicy policy(int hoursBeforeShow, int refundPercentage, String description) {
        CancellationPolicy policy = new CancellationPolicy();
        policy.setHoursBeforeShow(hoursBeforeShow);
        policy.setRefundPercentage(refundPercentage);
        policy.setDescription(description);
        return policy;
    }

    private JsonNode parseJson(MvcResult result) throws Exception {
        return new ObjectMapper().readTree(result.getResponse().getContentAsString());
    }
}
