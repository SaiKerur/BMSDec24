package org.example.bmsdec24;

import com.fasterxml.jackson.databind.JsonNode;
import org.example.bmsdec24.models.BookingStatus;
import org.example.bmsdec24.models.City;
import org.example.bmsdec24.models.Genre;
import org.example.bmsdec24.models.Movie;
import org.example.bmsdec24.models.Role;
import org.example.bmsdec24.models.Seat;
import org.example.bmsdec24.models.SeatStatus;
import org.example.bmsdec24.models.SeatType;
import org.example.bmsdec24.models.Theatre;
import org.example.bmsdec24.models.TheatreMovie;
import org.example.bmsdec24.models.TicketStatus;
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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TicketFlowIntegrationTest {

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
    private String partnerToken;
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
        user.setName("Ticket Test User");
        user.setEmail("ticket.user@test.com");
        user.setPassword(passwordEncoder.encode("Password@123"));
        user.setRole(Role.USER);
        user = userRepository.save(user);

        User partner = new User();
        partner.setName("Ticket Partner");
        partner.setEmail("ticket.partner@test.com");
        partner.setPassword(passwordEncoder.encode("Password@123"));
        partner.setRole(Role.PARTNER);
        userRepository.save(partner);

        userToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), Role.USER);
        partnerToken = jwtService.generateAccessToken(partner.getId(), partner.getEmail(), Role.PARTNER);

        City city = new City();
        city.setName("Test City");
        city = cityRepository.save(city);

        Theatre theatre = new Theatre();
        theatre.setName("Test Theatre");
        theatre.setAddress("Test Address");
        theatre.setCity(city);
        theatre = theatreRepository.save(theatre);

        Movie movie = new Movie();
        movie.setTitle("Test Movie");
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
        seat.setPrice(200.0);
        seat.setSeatStatus(SeatStatus.AVAILABLE);
        seat.setTheatre(theatre);
        seat.syncDenormalizedNames();
        seat = seatRepository.save(seat);
        seatId = seat.getId();
    }

    @Test
    void paymentSuccess_includesTicketSummary_andCancelRevokesTicket() throws Exception {
        int bookingId = createPendingBooking();
        int paymentId = initiatePayment(bookingId);

        MvcResult paymentResult = mockMvc.perform(post("/api/payments/callback")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "paymentId": %d,
                                  "paymentReference": "pay_integration_success",
                                  "signature": "whsec_integration_test",
                                  "success": true
                                }
                                """.formatted(paymentId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.bookingStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.ticket.bookingReference").isNotEmpty())
                .andExpect(jsonPath("$.ticket.qrPayload").isNotEmpty())
                .andExpect(jsonPath("$.ticket.status").value("ISSUED"))
                .andReturn();

        JsonNode paymentJson = parseJson(paymentResult);
        String bookingReference = paymentJson.get("ticket").get("bookingReference").asText();
        String qrPayload = paymentJson.get("ticket").get("qrPayload").asText();

        mockMvc.perform(get("/api/payments/" + paymentId)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ticket.bookingReference").value(bookingReference));

        mockMvc.perform(post("/api/tickets/validate")
                        .header("Authorization", "Bearer " + partnerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"qrPayload\":\"" + qrPayload + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true));

        mockMvc.perform(post("/api/bookings/" + bookingId + "/cancel")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        assertEquals(TicketStatus.REVOKED,
                ticketRepository.findDetailedByBooking_Id(bookingId).orElseThrow().getStatus());

        mockMvc.perform(post("/api/tickets/validate")
                        .header("Authorization", "Bearer " + partnerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookingReference\":\"" + bookingReference + "\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("INVALID_TICKET"));
    }

    @Test
    void confirmBooking_autoIssuesTicket() throws Exception {
        int bookingId = createPendingBooking();

        mockMvc.perform(post("/api/bookings/" + bookingId + "/confirm")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));

        MvcResult ticketResult = mockMvc.perform(get("/api/bookings/" + bookingId + "/ticket")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ISSUED"))
                .andReturn();

        JsonNode ticketJson = parseJson(ticketResult);
        assertTrue(ticketJson.get("bookingReference").asText().startsWith("BMS-"));
        assertNotNull(ticketJson.get("qrPayload").asText());
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
                .andExpect(jsonPath("$.status").value("PENDING"))
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

    private JsonNode parseJson(MvcResult result) throws Exception {
        return new com.fasterxml.jackson.databind.ObjectMapper()
                .readTree(result.getResponse().getContentAsString());
    }
}
