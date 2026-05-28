# BookMyShow - UML Class Diagram (Full)

This document presents the complete class diagram of the `BMSDec24` system, organized into multiple views (Domain, Service, Controller, Repository, DTO, Exception). All diagrams use Mermaid and accurately reflect the current codebase.

---

## 1) Domain / Entity Model (with JPA relationships)

Shows business entities, inheritance, multiplicities, and FK-style associations.

```mermaid
classDiagram
    direction LR

    %% =============== Base ===============
    class BaseModel {
        <<MappedSuperclass>>
        #int id
        #Date createdAt
        #Date updatedAt
        +getId() int
        +getCreatedAt() Date
        +getUpdatedAt() Date
    }

    %% =============== Enums ===============
    class SeatType {
        <<enumeration>>
        GOLD
        SILVER
        PLATINUM
    }

    class SeatStatus {
        <<enumeration>>
        AVAILABLE
        BLOCKED
        BOOKED
    }

    class TicketStatus {
        <<enumeration>>
        PENDING
        CONFIRMED
        CANCELLED
    }

    class Genre {
        <<enumeration>>
        COMEDY
        ACTION
        ROM_COM
    }

    class Feature {
        <<enumeration>>
        TWO_D
        THREE_D
        FOUR_D
        IMAX
        DOLBY_VISION
        DOLBY_ATMOS
    }

    %% =============== Entities ===============
    class User {
        -String name
        -String email
        -String password
        +getName() String
        +getEmail() String
        +getPassword() String
    }

    class City {
        -String name
        -List~Theatre~ theatres
        +getName() String
        +getTheatres() List~Theatre~
    }

    class Theatre {
        -String name
        -String address
        -List~Screen~ screens
        +getName() String
        +getAddress() String
        +getScreens() List~Screen~
    }

    class Screen {
        -String name
        -List~Seat~ seats
        -List~Feature~ features
        +getName() String
        +getSeats() List~Seat~
        +getFeatures() List~Feature~
    }

    class Seat {
        -String name
        -SeatType seatType
        -int rowNum
        -int colNum
        +getName() String
        +getSeatType() SeatType
    }

    class Movie {
        -String name
        -Genre genre
        +getName() String
        +getGenre() Genre
    }

    class Show {
        -Screen screen
        -Movie movie
        -Date startTime
        +getScreen() Screen
        +getMovie() Movie
        +getStartTime() Date
    }

    class SeatTypeShow {
        -SeatType seatType
        -Show show
        -double price
        +getPrice() double
    }

    class ShowSeat {
        -Show show
        -Seat seat
        -SeatStatus seatStatus
        -User bookedBy
        +getShow() Show
        +getSeat() Seat
        +getSeatStatus() SeatStatus
        +getBookedBy() User
    }

    class Ticket {
        -Movie movie
        -Show show
        -List~ShowSeat~ showSeats
        -User user
        -TicketStatus status
        -Date holdExpiresAt
        +getStatus() TicketStatus
        +getShowSeats() List~ShowSeat~
    }

    %% =============== Inheritance ===============
    BaseModel <|-- User
    BaseModel <|-- City
    BaseModel <|-- Theatre
    BaseModel <|-- Screen
    BaseModel <|-- Seat
    BaseModel <|-- Movie
    BaseModel <|-- Show
    BaseModel <|-- ShowSeat
    BaseModel <|-- SeatTypeShow
    BaseModel <|-- Ticket

    %% =============== Associations (with multiplicities) ===============
    City "1" --> "0..*" Theatre : @OneToMany
    Theatre "1" --> "0..*" Screen : @OneToMany
    Screen "1" --> "0..*" Seat : @OneToMany
    Screen "1" --> "0..*" Feature : @ElementCollection

    Seat "*" --> "1" SeatType : has
    Show "*" --> "1" Screen : @ManyToOne
    Show "*" --> "1" Movie : @ManyToOne
    Movie "*" --> "1" Genre : has

    SeatTypeShow "*" --> "1" Show : @ManyToOne
    SeatTypeShow "*" --> "1" SeatType : has

    ShowSeat "*" --> "1" Show : @ManyToOne
    ShowSeat "*" --> "1" Seat : @ManyToOne
    ShowSeat "*" --> "0..1" User : bookedBy (@ManyToOne)
    ShowSeat "*" --> "1" SeatStatus : status

    Ticket "*" --> "1" User : @ManyToOne
    Ticket "*" --> "1" Show : @ManyToOne
    Ticket "*" --> "1" Movie : @ManyToOne
    Ticket "1" --> "1..*" ShowSeat : @OneToMany (showSeats)
    Ticket "*" --> "1" TicketStatus : status
```

---

## 2) Service Layer (Business Logic)

Shows service interfaces, implementations, and which repositories/models they coordinate.

```mermaid
classDiagram
    direction LR

    class TicketService {
        <<interface>>
        +bookTicket(int userId, List~Integer~ showSeatIds) Ticket
        +confirmTicket(int ticketId) Ticket
        +cancelTicket(int ticketId) Ticket
        +getShowAvailability(int showId, Date changedAfter) ShowAvailabilityResponseDto
        +releaseExpiredPendingTickets() int
    }

    class TicketServiceImpl {
        -UserRepository userRepository
        -ShowSeatRepository showSeatRepository
        -TicketRepository ticketRepository
        -Duration TICKET_HOLD_DURATION
        +bookTicket(...) Ticket
        +confirmTicket(...) Ticket
        +cancelTicket(...) Ticket
        +getShowAvailability(...) ShowAvailabilityResponseDto
        +releaseExpiredPendingTickets() int
        -lockAndValidateSeatsForBooking(List~Integer~) List~ShowSeat~
        -loadTicketForUpdate(int) Ticket
        -expirePendingTicket(Ticket)
        -releaseSeats(List~ShowSeat~)
        -convertToLiveStatus(ShowSeat) ShowSeatLiveStatusDto
    }

    class UserService {
        <<interface>>
        +signupUser(String name, String email, String password) User
    }

    class UserServiceImpl {
        -UserRepository userRepository
        -BCryptPasswordEncoder PASSWORD_ENCODER
        +signupUser(...) User
    }

    TicketService <|.. TicketServiceImpl : implements
    UserService <|.. UserServiceImpl : implements

    %% Service -> Repository dependencies
    TicketServiceImpl --> UserRepository : uses
    TicketServiceImpl --> ShowSeatRepository : uses
    TicketServiceImpl --> TicketRepository : uses
    UserServiceImpl --> UserRepository : uses

    class UserRepository {
        <<interface>>
    }
    class ShowSeatRepository {
        <<interface>>
    }
    class TicketRepository {
        <<interface>>
    }
```

---

## 3) Repository Layer (Spring Data JPA)

Shows repositories with their domain entities and key custom finders.

```mermaid
classDiagram
    direction LR

    class JpaRepository~T,ID~ {
        <<interface>>
        +save(T) T
        +findById(ID) Optional~T~
        +findAll() List~T~
        +saveAll(Iterable~T~)
    }

    class UserRepository {
        <<interface>>
        +save(User) User
        +findByEmail(String) User
    }

    class ShowSeatRepository {
        <<interface>>
        +findAllByIdIn(List~Integer~) List~ShowSeat~  «@Lock(PESSIMISTIC_WRITE)»
        +findAllByShow_IdOrderByIdAsc(int) List~ShowSeat~
        +findAllByShow_IdAndUpdatedAtAfterOrderByUpdatedAtAsc(int, Date) List~ShowSeat~
        +countByShow_IdAndSeatStatus(int, SeatStatus) long
    }

    class TicketRepository {
        <<interface>>
        +findDetailedById(int) Optional~Ticket~  «@EntityGraph»
        +findAllByStatusAndHoldExpiresAtBefore(TicketStatus, Date) List~Ticket~
    }

    JpaRepository <|-- UserRepository
    JpaRepository <|-- ShowSeatRepository
    JpaRepository <|-- TicketRepository

    UserRepository ..> User : persists
    ShowSeatRepository ..> ShowSeat : persists
    TicketRepository ..> Ticket : persists
```

---

## 4) Controller Layer (REST API)

Shows REST controllers, the services they depend on, and the DTOs/exceptions used.

```mermaid
classDiagram
    direction LR

    class HealthRestController {
        +health() String
    }

    class UserRestController {
        -UserService userService
        +signUp(SignupRequestDto) ResponseEntity~SignupResponseDto~
    }

    class TicketRestController {
        -TicketService ticketService
        +bookTicket(BookTicketRequestDto) ResponseEntity~Ticket~
        +confirmTicket(int ticketId) ResponseEntity~Ticket~
        +cancelTicket(int ticketId) ResponseEntity~Ticket~
        +getShowAvailability(int showId, Long changedAfterEpochMs) ResponseEntity~ShowAvailabilityResponseDto~
        +releaseExpiredTicketHolds() ResponseEntity~Integer~
    }

    class TicketController {
        -TicketService ticketService
        +bookTicket(BookTicketRequestDto) Ticket
        -validateBookTicketRequestDto(BookTicketRequestDto)
    }

    class UserController {
        -UserService userService
    }

    UserRestController --> UserService : depends
    TicketRestController --> TicketService : depends
    TicketController --> TicketService : depends
    UserController --> UserService : depends
```

---

## 5) DTOs and Exceptions

Shows request/response payloads and the exception hierarchy thrown across layers.

```mermaid
classDiagram
    direction LR

    %% ============== DTOs ==============
    class SignupRequestDto {
        -String name
        -String email
        -String password
    }

    class SignupResponseDto {
        -int userId
        -ResponseStatus responseStatus
    }

    class BookTicketRequestDto {
        -int userId
        -List~Integer~ showSeatIds
    }

    class ShowSeatLiveStatusDto {
        -int showSeatId
        -int seatId
        -String seatName
        -int rowNum
        -int colNum
        -SeatStatus seatStatus
        -long updatedAtEpochMs
    }

    class ShowAvailabilityResponseDto {
        -int showId
        -int totalSeats
        -long availableSeats
        -long blockedSeats
        -long bookedSeats
        -long serverTimeEpochMs
        -List~ShowSeatLiveStatusDto~ seats
    }

    class ResponseStatus {
        <<enumeration>>
        SUCCESS
        FAILURE
    }

    %% ============== Exceptions ==============
    class Exception {
        <<Java>>
    }

    class InvalidUserException
    class InvalidBookTicketRequestException
    class SomeOrAllSeatsAreUnavailable
    class UserAlreadyPresentException
    class InvalidTicketException
    class TicketAlreadyProcessedException

    Exception <|-- InvalidUserException
    Exception <|-- InvalidBookTicketRequestException
    Exception <|-- SomeOrAllSeatsAreUnavailable
    Exception <|-- UserAlreadyPresentException
    Exception <|-- InvalidTicketException
    Exception <|-- TicketAlreadyProcessedException

    SignupResponseDto --> ResponseStatus
    ShowAvailabilityResponseDto --> ShowSeatLiveStatusDto
```

---

## 6) End-to-End Architecture (Layered View)

A single picture showing the layered interaction across all classes.

```mermaid
classDiagram
    direction TB

    class TicketRestController
    class UserRestController
    class HealthRestController

    class TicketService {
        <<interface>>
    }
    class UserService {
        <<interface>>
    }
    class TicketServiceImpl
    class UserServiceImpl

    class UserRepository {
        <<interface>>
    }
    class ShowSeatRepository {
        <<interface>>
    }
    class TicketRepository {
        <<interface>>
    }

    class User
    class ShowSeat
    class Ticket
    class Show
    class Movie
    class Seat
    class Screen
    class Theatre
    class City

    class BookTicketRequestDto
    class SignupRequestDto
    class SignupResponseDto
    class ShowAvailabilityResponseDto
    class ShowSeatLiveStatusDto

    %% Controller -> Service
    TicketRestController --> TicketService
    UserRestController --> UserService

    %% Service interface -> impl
    TicketService <|.. TicketServiceImpl
    UserService <|.. UserServiceImpl

    %% Service impl -> Repository
    TicketServiceImpl --> UserRepository
    TicketServiceImpl --> ShowSeatRepository
    TicketServiceImpl --> TicketRepository
    UserServiceImpl --> UserRepository

    %% Repository -> Model
    UserRepository ..> User
    ShowSeatRepository ..> ShowSeat
    TicketRepository ..> Ticket

    %% Model relationships
    Ticket --> User
    Ticket --> Show
    Ticket --> Movie
    Ticket "1" --> "*" ShowSeat
    ShowSeat --> Show
    ShowSeat --> Seat
    ShowSeat --> User : bookedBy
    Show --> Movie
    Show --> Screen
    Screen --> Seat
    Theatre --> Screen
    City --> Theatre

    %% DTOs used at API boundaries
    TicketRestController ..> BookTicketRequestDto
    TicketRestController ..> ShowAvailabilityResponseDto
    UserRestController ..> SignupRequestDto
    UserRestController ..> SignupResponseDto
    ShowAvailabilityResponseDto --> ShowSeatLiveStatusDto
```

---

## 7) Booking Flow - Class Interaction Sequence

How the classes collaborate during the `bookTicket` flow.

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant TRC as TicketRestController
    participant TS as TicketServiceImpl
    participant UR as UserRepository
    participant SSR as ShowSeatRepository
    participant TR as TicketRepository
    participant User
    participant ShowSeat
    participant Ticket

    Client->>TRC: POST /api/tickets/book (BookTicketRequestDto)
    TRC->>TS: bookTicket(userId, showSeatIds)
    TS->>UR: findById(userId)
    UR-->>TS: User
    TS->>SSR: findAllByIdIn(showSeatIds) [PESSIMISTIC_WRITE]
    SSR-->>TS: List<ShowSeat>
    TS->>TS: lockAndValidateSeatsForBooking()
    TS->>ShowSeat: setSeatStatus(BLOCKED), setBookedBy(user)
    TS->>SSR: saveAll(showSeats)
    TS->>Ticket: new Ticket(PENDING, holdExpiresAt)
    TS->>TR: save(ticket)
    TR-->>TS: persisted Ticket
    TS-->>TRC: Ticket
    TRC-->>Client: 200 OK Ticket
```

---

## 8) Confirm / Cancel Flow

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant TRC as TicketRestController
    participant TS as TicketServiceImpl
    participant TR as TicketRepository
    participant SSR as ShowSeatRepository

    Client->>TRC: POST /api/tickets/{id}/confirm
    TRC->>TS: confirmTicket(ticketId)
    TS->>TR: findDetailedById(ticketId)
    TR-->>TS: Ticket (PENDING + showSeats)
    TS->>TS: validate not expired, all seats still BLOCKED for same user
    TS->>SSR: saveAll(showSeats with BOOKED)
    TS->>TR: save(ticket as CONFIRMED)
    TS-->>TRC: Ticket
    TRC-->>Client: 200 OK

    Client->>TRC: POST /api/tickets/{id}/cancel
    TRC->>TS: cancelTicket(ticketId)
    TS->>TR: findDetailedById(ticketId)
    TS->>SSR: releaseSeats (AVAILABLE, bookedBy=null)
    TS->>TR: save(ticket as CANCELLED)
    TS-->>TRC: Ticket
    TRC-->>Client: 200 OK
```

---

## 9) Cardinality / Mapping Reference

A quick textual mapping reference of all multiplicities used in the entity model.

| Source         | Target         | Multiplicity | JPA Annotation     | Field         |
|----------------|----------------|--------------|--------------------|---------------|
| `City`         | `Theatre`      | 1 → 0..*     | `@OneToMany`       | `theatres`    |
| `Theatre`      | `Screen`       | 1 → 0..*     | `@OneToMany`       | `screens`     |
| `Screen`       | `Seat`         | 1 → 0..*     | `@OneToMany`       | `seats`       |
| `Screen`       | `Feature`      | 1 → 0..*     | `@ElementCollection` | `features`  |
| `Show`         | `Screen`       | * → 1        | `@ManyToOne`       | `screen`      |
| `Show`         | `Movie`        | * → 1        | `@ManyToOne`       | `movie`       |
| `ShowSeat`     | `Show`         | * → 1        | `@ManyToOne`       | `show`        |
| `ShowSeat`     | `Seat`         | * → 1        | `@ManyToOne`       | `seat`        |
| `ShowSeat`     | `User`         | * → 0..1     | `@ManyToOne`       | `bookedBy`    |
| `SeatTypeShow` | `Show`         | * → 1        | `@ManyToOne`       | `show`        |
| `Ticket`       | `User`         | * → 1        | `@ManyToOne`       | `user`        |
| `Ticket`       | `Show`         | * → 1        | `@ManyToOne`       | `show`        |
| `Ticket`       | `Movie`        | * → 1        | `@ManyToOne`       | `movie`       |
| `Ticket`       | `ShowSeat`     | 1 → 1..*     | `@OneToMany`       | `showSeats`   |

---

## 10) Suggested Rendering

- All Mermaid blocks render natively in GitHub, VS Code (Markdown preview), and most modern Markdown viewers.
- For slide decks, export each diagram via [Mermaid Live Editor](https://mermaid.live) as SVG/PNG.
