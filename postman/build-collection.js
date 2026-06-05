const fs = require('fs');

const testStatus = (code, label) => [
  "pm.test('" + label + "', function () {",
  "    pm.response.to.have.status(" + code + ");",
  "});"
];

const testStatusOneOf = (codes, label) => [
  "pm.test('" + label + "', function () {",
  "    pm.expect([" + codes.join(', ') + "]).to.include(pm.response.code);",
  "});"
];

function req(method, path, opts = {}) {
  const r = {
    method,
    header: opts.headers || [],
    url: {
      raw: '{{baseUrl}}' + path,
      host: ['{{baseUrl}}'],
      path: path.replace(/^\//, '').split('/').filter(Boolean)
    },
    description: opts.description || ''
  };
  if (opts.auth === 'noauth') r.auth = { type: 'noauth' };
  if (opts.body !== undefined) {
    r.header.push({ key: 'Content-Type', value: 'application/json' });
    r.body = { mode: 'raw', raw: opts.body };
  }
  if (opts.bearerRefresh) {
    r.auth = {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{refreshToken}}', type: 'string' }]
    };
  }
  if (opts.authHeader) {
    r.auth = { type: 'noauth' };
    r.header.push({ key: 'Authorization', value: opts.authHeader });
  }
  if (opts.bearerAccess) {
    r.auth = {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{accessToken}}', type: 'string' }]
    };
  }
  return r;
}

function item(name, request, tests, prerequest) {
  const events = [];
  if (prerequest) {
    events.push({ listen: 'prerequest', script: { type: 'text/javascript', exec: prerequest } });
  }
  if (tests) {
    events.push({ listen: 'test', script: { type: 'text/javascript', exec: tests } });
  }
  return { name, event: events, request, response: [] };
}

function folder(name, description, children) {
  const f = { name, item: children };
  if (description) f.description = description;
  return f;
}

const prerequestBookingUser = [
  "const u = pm.collectionVariables.get('signedUpUserId') || pm.collectionVariables.get('validUserId');",
  "pm.variables.set('bookingUserId', u);"
];

const prerequestUniqueSignup = [
  "const s = Date.now() + '_' + Math.floor(Math.random() * 10000);",
  "const email = 'bms_' + s + '@example.com';",
  "pm.collectionVariables.set('existingEmail', email);",
  "pm.collectionVariables.set('loginEmail', email);",
  "pm.collectionVariables.set('loginPassword', pm.collectionVariables.get('password'));",
  "pm.variables.set('signupEmail', email);"
];

const healthFolder = folder('Health', 'Liveness check (public).', [
  item('GET /api/health - should return OK',
    req('GET', '/api/health', { auth: 'noauth' }),
    testStatus(200, 'Status is 200').concat([
      "pm.test('Body is OK', function () { pm.expect(pm.response.text()).to.eql('OK'); });"
    ])
  )
]);

const catalogFolder = folder('Catalog', 'Public discovery APIs (no JWT required).', [
  folder('Happy path', 'Browse cities → theatres → movies → seat layout.', [
    item('GET /api/catalog/cities',
      req('GET', '/api/catalog/cities', { auth: 'noauth', description: 'List all cities.' }),
      testStatus(200, 'Status is 200').concat([
        "pm.test('Returns city array', function () {",
        "    const cities = pm.response.json();",
        "    pm.expect(cities).to.be.an('array').that.is.not.empty;",
        "    pm.expect(cities[0]).to.have.property('id');",
        "    pm.expect(cities[0]).to.have.property('name');",
        "});"
      ])
    ),
    item('GET /api/catalog/cities/1/theatres',
      req('GET', '/api/catalog/cities/1/theatres', { auth: 'noauth' }),
      testStatus(200, 'Status is 200').concat([
        "pm.test('Returns theatre array', function () { pm.expect(pm.response.json()).to.be.an('array'); });"
      ])
    ),
    item('GET /api/catalog/cities/2/theatres',
      req('GET', '/api/catalog/cities/2/theatres', { auth: 'noauth' }),
      testStatus(200, 'Status is 200')
    ),
    item('GET /api/catalog/theatres/1',
      req('GET', '/api/catalog/theatres/1', { auth: 'noauth' }),
      testStatus(200, 'Status is 200').concat([
        "const json = pm.response.json();",
        "pm.test('Theatre has movies', function () { pm.expect(json.movies).to.be.an('array').that.is.not.empty; });",
        "pm.test('Theatre has city', function () { pm.expect(json.city).to.have.property('name'); });"
      ])
    ),
    item('GET /api/catalog/movies',
      req('GET', '/api/catalog/movies', { auth: 'noauth' }),
      testStatus(200, 'Status is 200').concat([
        "pm.test('Returns movie array', function () { pm.expect(pm.response.json().length).to.be.above(0); });"
      ])
    ),
    item('GET /api/catalog/movies?genre=ACTION',
      req('GET', '/api/catalog/movies?genre=ACTION', { auth: 'noauth' }),
      testStatus(200, 'Status is 200').concat([
        "pm.test('All movies are ACTION', function () {",
        "    pm.response.json().forEach(m => pm.expect(m.genre).to.eql('ACTION'));",
        "});"
      ])
    ),
    item('GET /api/catalog/movies?genre=ROM_COM',
      req('GET', '/api/catalog/movies?genre=ROM_COM', { auth: 'noauth' }),
      testStatus(200, 'Status is 200')
    ),
    item('GET /api/catalog/theatres/1/seats',
      req('GET', '/api/catalog/theatres/1/seats', { auth: 'noauth' }),
      testStatus(200, 'Status is 200').concat([
        "pm.test('Returns seats with status', function () {",
        "    const seats = pm.response.json();",
        "    pm.expect(seats.length).to.be.above(0);",
        "    pm.expect(seats[0]).to.have.property('seatStatus');",
        "});"
      ])
    ),
    item('GET /api/catalog/theatres/2/seats',
      req('GET', '/api/catalog/theatres/2/seats', { auth: 'noauth' }),
      testStatus(200, 'Status is 200')
    )
  ]),
  folder('Edge cases', 'Invalid IDs, missing resources, bad query params.', [
    item('GET /api/catalog/cities/0/theatres (400)',
      req('GET', '/api/catalog/cities/0/theatres', { auth: 'noauth' }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('GET /api/catalog/cities/-1/theatres (400)',
      req('GET', '/api/catalog/cities/-1/theatres', { auth: 'noauth' }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('GET /api/catalog/cities/99999/theatres (404)',
      req('GET', '/api/catalog/cities/99999/theatres', { auth: 'noauth' }),
      testStatus(404, 'Status is 404 Not Found')
    ),
    item('GET /api/catalog/theatres/0 (400)',
      req('GET', '/api/catalog/theatres/0', { auth: 'noauth' }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('GET /api/catalog/theatres/99999 (404)',
      req('GET', '/api/catalog/theatres/99999', { auth: 'noauth' }),
      testStatus(404, 'Status is 404 Not Found')
    ),
    item('GET /api/catalog/theatres/0/seats (400)',
      req('GET', '/api/catalog/theatres/0/seats', { auth: 'noauth' }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('GET /api/catalog/theatres/99999/seats (404)',
      req('GET', '/api/catalog/theatres/99999/seats', { auth: 'noauth' }),
      testStatus(404, 'Status is 404 Not Found')
    ),
    item('GET /api/catalog/movies?genre=INVALID (400)',
      req('GET', '/api/catalog/movies?genre=INVALID', { auth: 'noauth' }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('GET /api/catalog/cities - works without JWT (public)',
      req('GET', '/api/catalog/cities', { auth: 'noauth' }),
      testStatus(200, 'Status is 200')
    ),
    item('GET /api/catalog/cities - works with invalid JWT (still public)',
      req('GET', '/api/catalog/cities', { auth: 'noauth', authHeader: 'Bearer not.a.jwt' }),
      testStatus(200, 'Status is 200')
    )
  ])
]);

const showsFolder = folder('Shows (Real-time)', 'Public show discovery and live seat availability polling (no JWT required). H2 seed: Show 1 Orion Action Blast (showSeats 1-2 AVAILABLE), Show 2 Orion RomCom (showSeat 3 AVAILABLE, 4 BLOCKED), Show 3 Phoenix Action Blast (showSeats 5-6 AVAILABLE).', [
  folder('Happy path', 'Browse showtimes and poll seat map.', [
    item('GET /api/shows/theatres/1 - list shows at Orion PVR',
      req('GET', '/api/shows/theatres/1', { auth: 'noauth', description: 'List all showtimes at theatre 1.' }),
      testStatus(200, 'Status is 200').concat([
        "pm.test('Returns show array', function () {",
        "    const shows = pm.response.json();",
        "    pm.expect(shows).to.be.an('array').that.is.not.empty;",
        "    pm.expect(shows[0]).to.have.property('movieTitle');",
        "    pm.expect(shows[0]).to.have.property('startTime');",
        "});"
      ])
    ),
    item('GET /api/shows/theatres/2 - list shows at PVR Phoenix',
      req('GET', '/api/shows/theatres/2', { auth: 'noauth' }),
      testStatus(200, 'Status is 200').concat([
        "pm.test('Returns show array', function () { pm.expect(pm.response.json()).to.be.an('array').that.is.not.empty; });"
      ])
    ),
    item('GET /api/shows/movies/1 - list shows for Action Blast',
      req('GET', '/api/shows/movies/1', { auth: 'noauth' }),
      testStatus(200, 'Status is 200').concat([
        "pm.test('Returns show array', function () { pm.expect(pm.response.json().length).to.be.above(0); });"
      ])
    ),
    item('GET /api/shows/movies/2 - list shows for RomCom Nights',
      req('GET', '/api/shows/movies/2', { auth: 'noauth' }),
      testStatus(200, 'Status is 200')
    ),
    item('GET /api/shows/1/availability - full seat snapshot (stores serverTimeEpochMs)',
      req('GET', '/api/shows/1/availability', { auth: 'noauth', description: 'Full seat map with AVAILABLE/BLOCKED/BOOKED counts.' }),
      testStatus(200, 'Status is 200').concat([
        "const json = pm.response.json();",
        "pm.test('Has seat counts', function () {",
        "    pm.expect(json).to.have.property('availableSeats');",
        "    pm.expect(json).to.have.property('blockedSeats');",
        "    pm.expect(json).to.have.property('bookedSeats');",
        "    pm.expect(json.totalSeats).to.eql(json.availableSeats + json.blockedSeats + json.bookedSeats);",
        "});",
        "pm.test('Seats array with live status', function () {",
        "    pm.expect(json.seats).to.be.an('array').that.is.not.empty;",
        "    pm.expect(json.seats[0]).to.have.property('showSeatId');",
        "    pm.expect(json.seats[0]).to.have.property('seatStatus');",
        "    pm.expect(json.seats[0]).to.have.property('updatedAtEpochMs');",
        "});",
        "pm.collectionVariables.set('lastServerTimeEpochMs', json.serverTimeEpochMs);"
      ])
    ),
    item('GET /api/shows/1/availability?changedAfterEpochMs={{lastServerTimeEpochMs}} - delta poll',
      req('GET', '/api/shows/1/availability?changedAfterEpochMs={{lastServerTimeEpochMs}}', {
        auth: 'noauth',
        description: 'Returns only seats changed since last poll. Empty seats array if nothing changed.'
      }),
      testStatus(200, 'Status is 200').concat([
        "pm.test('Delta response shape', function () {",
        "    const json = pm.response.json();",
        "    pm.expect(json.showId).to.eql(1);",
        "    pm.expect(json.seats).to.be.an('array');",
        "    pm.expect(json.serverTimeEpochMs).to.be.a('number');",
        "});"
      ])
    ),
    item('GET /api/shows/2/availability - show with BLOCKED seat in seed',
      req('GET', '/api/shows/2/availability', { auth: 'noauth' }),
      testStatus(200, 'Status is 200').concat([
        "pm.test('Has at least one BLOCKED seat', function () {",
        "    pm.expect(pm.response.json().blockedSeats).to.be.at.least(1);",
        "});"
      ])
    )
  ]),
  folder('Edge cases', 'Invalid IDs and public access.', [
    item('GET /api/shows/theatres/0 (400)',
      req('GET', '/api/shows/theatres/0', { auth: 'noauth' }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('GET /api/shows/theatres/99999 (404)',
      req('GET', '/api/shows/theatres/99999', { auth: 'noauth' }),
      testStatus(404, 'Status is 404 Not Found')
    ),
    item('GET /api/shows/movies/0 (400)',
      req('GET', '/api/shows/movies/0', { auth: 'noauth' }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('GET /api/shows/movies/99999 (404)',
      req('GET', '/api/shows/movies/99999', { auth: 'noauth' }),
      testStatus(404, 'Status is 404 Not Found')
    ),
    item('GET /api/shows/0/availability (400)',
      req('GET', '/api/shows/0/availability', { auth: 'noauth' }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('GET /api/shows/99999/availability (404)',
      req('GET', '/api/shows/99999/availability', { auth: 'noauth' }),
      testStatus(404, 'Status is 404 Not Found')
    ),
    item('GET /api/shows/1/availability - works without JWT (public)',
      req('GET', '/api/shows/1/availability', { auth: 'noauth' }),
      testStatus(200, 'Status is 200')
    ),
    item('GET /api/shows/1/availability - works with invalid JWT (still public)',
      req('GET', '/api/shows/1/availability', { auth: 'noauth', authHeader: 'Bearer not.a.jwt' }),
      testStatus(200, 'Status is 200')
    )
  ])
]);

const usersFolder = folder('Users', 'Registration (public).', [
  folder('Happy path', '', [
    item('POST /api/users/signup - success (unique email)',
      req('POST', '/api/users/signup', {
        auth: 'noauth',
        body: '{\n  "name": "Postman User",\n  "email": "{{signupEmail}}",\n  "password": "{{password}}"\n}'
      }),
      [
        "pm.test('Status is 201 Created', function () { pm.response.to.have.status(201); });",
        "const json = pm.response.json();",
        "pm.test('Response status is SUCCESS', function () { pm.expect(json.responseStatus).to.eql('SUCCESS'); });",
        "pm.test('User id is present', function () { pm.expect(json.userId).to.be.above(0); });",
        "pm.collectionVariables.set('signedUpUserId', json.userId);"
      ],
      prerequestUniqueSignup
    )
  ]),
  folder('Edge cases', 'Validation and duplicate registration.', [
    item('POST /api/users/signup - duplicate email (409)',
      req('POST', '/api/users/signup', {
        auth: 'noauth',
        body: '{\n  "name": "Duplicate User",\n  "email": "{{existingEmail}}",\n  "password": "{{password}}"\n}'
      }),
      [
        "pm.test('Status is 409 Conflict', function () { pm.response.to.have.status(409); });",
        "pm.test('Response status is FAILURE', function () { pm.expect(pm.response.json().responseStatus).to.eql('FAILURE'); });"
      ]
    ),
    item('POST /api/users/signup - duplicate seed email (409)',
      req('POST', '/api/users/signup', {
        auth: 'noauth',
        body: '{\n  "name": "John Copy",\n  "email": "john.seed@example.com",\n  "password": "{{password}}"\n}'
      }),
      testStatus(409, 'Status is 409 Conflict')
    ),
    item('POST /api/users/signup - null body (400)',
      req('POST', '/api/users/signup', { auth: 'noauth' }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/users/signup - empty body (400)',
      req('POST', '/api/users/signup', { auth: 'noauth', body: '{}' }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/users/signup - missing name (400)',
      req('POST', '/api/users/signup', {
        auth: 'noauth',
        body: '{\n  "email": "noname@example.com",\n  "password": "{{password}}"\n}'
      }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/users/signup - missing email (400)',
      req('POST', '/api/users/signup', {
        auth: 'noauth',
        body: '{\n  "name": "No Email",\n  "password": "{{password}}"\n}'
      }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/users/signup - missing password (400)',
      req('POST', '/api/users/signup', {
        auth: 'noauth',
        body: '{\n  "name": "No Pass",\n  "email": "nopass@example.com"\n}'
      }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/users/signup - blank name (400)',
      req('POST', '/api/users/signup', {
        auth: 'noauth',
        body: '{\n  "name": "   ",\n  "email": "blankname@example.com",\n  "password": "{{password}}"\n}'
      }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/users/signup - blank email (400)',
      req('POST', '/api/users/signup', {
        auth: 'noauth',
        body: '{\n  "name": "Blank Email",\n  "email": "  ",\n  "password": "{{password}}"\n}'
      }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/users/signup - blank password (400)',
      req('POST', '/api/users/signup', {
        auth: 'noauth',
        body: '{\n  "name": "Blank Pass",\n  "email": "blankpass@example.com",\n  "password": "  "\n}'
      }),
      testStatus(400, 'Status is 400 Bad Request')
    )
  ])
]);

const authFolder = folder('Auth', 'JWT login, refresh, and /me. Run seed login or signup + login before protected folders.', [
  folder('Happy path', '', [
    item('POST /api/auth/login - seed user (skip signup)',
      req('POST', '/api/auth/login', {
        auth: 'noauth',
        body: '{\n  "email": "john.seed@example.com",\n  "password": "{{password}}"\n}'
      }),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "const json = pm.response.json();",
        "pm.collectionVariables.set('accessToken', json.accessToken);",
        "pm.collectionVariables.set('refreshToken', json.refreshToken);",
        "pm.collectionVariables.set('signedUpUserId', '1');",
        "pm.collectionVariables.set('loginEmail', 'john.seed@example.com');"
      ]
    ),
    item('POST /api/auth/login - success (after signup)',
      req('POST', '/api/auth/login', {
        auth: 'noauth',
        body: '{\n  "email": "{{loginEmail}}",\n  "password": "{{loginPassword}}"\n}'
      }),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "const json = pm.response.json();",
        "pm.test('accessToken present', function () { pm.expect(json.accessToken).to.be.a('string').and.not.empty; });",
        "pm.test('refreshToken present', function () { pm.expect(json.refreshToken).to.be.a('string').and.not.empty; });",
        "pm.collectionVariables.set('accessToken', json.accessToken);",
        "pm.collectionVariables.set('refreshToken', json.refreshToken);",
        "if (json.userId) { pm.collectionVariables.set('signedUpUserId', json.userId); }"
      ]
    ),
    item('POST /api/auth/refresh - success',
      req('POST', '/api/auth/refresh', { auth: 'noauth', body: '{\n  "refreshToken": "{{refreshToken}}"\n}' }),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "const json = pm.response.json();",
        "pm.collectionVariables.set('accessToken', json.accessToken);",
        "pm.collectionVariables.set('refreshToken', json.refreshToken);"
      ]
    ),
    item('GET /api/auth/me - success',
      req('GET', '/api/auth/me'),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "const json = pm.response.json();",
        "pm.test('userId present', function () { pm.expect(json.userId).to.exist; });",
        "pm.test('email present', function () { pm.expect(json.email).to.be.a('string').and.not.empty; });"
      ]
    )
  ]),
  folder('Edge cases', 'Invalid credentials, tokens, and missing fields.', [
    item('POST /api/auth/login - wrong password (401)',
      req('POST', '/api/auth/login', { auth: 'noauth', body: '{\n  "email": "{{loginEmail}}",\n  "password": "wrong-password"\n}' }),
      testStatus(401, 'Status is 401 Unauthorized')
    ),
    item('POST /api/auth/login - unknown email (401)',
      req('POST', '/api/auth/login', { auth: 'noauth', body: '{\n  "email": "nobody@example.com",\n  "password": "{{loginPassword}}"\n}' }),
      testStatus(401, 'Status is 401 Unauthorized')
    ),
    item('POST /api/auth/login - missing password (400)',
      req('POST', '/api/auth/login', { auth: 'noauth', body: '{\n  "email": "{{loginEmail}}"\n}' }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/auth/login - missing email (400)',
      req('POST', '/api/auth/login', { auth: 'noauth', body: '{\n  "password": "{{loginPassword}}"\n}' }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/auth/login - empty body (400)',
      req('POST', '/api/auth/login', { auth: 'noauth', body: '{}' }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/auth/login - null body (400)',
      req('POST', '/api/auth/login', { auth: 'noauth' }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/auth/login - blank email (400)',
      req('POST', '/api/auth/login', { auth: 'noauth', body: '{\n  "email": "  ",\n  "password": "{{loginPassword}}"\n}' }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/auth/refresh - access token as refresh (401)',
      req('POST', '/api/auth/refresh', { auth: 'noauth', body: '{\n  "refreshToken": "{{accessToken}}"\n}' }),
      testStatus(401, 'Status is 401 Unauthorized')
    ),
    item('POST /api/auth/refresh - invalid token (401)',
      req('POST', '/api/auth/refresh', { auth: 'noauth', body: '{\n  "refreshToken": "not.a.jwt"\n}' }),
      testStatus(401, 'Status is 401 Unauthorized')
    ),
    item('POST /api/auth/refresh - missing token (400)',
      req('POST', '/api/auth/refresh', { auth: 'noauth', body: '{}' }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/auth/refresh - null body (400)',
      req('POST', '/api/auth/refresh', { auth: 'noauth' }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('GET /api/auth/me - missing auth (401)',
      req('GET', '/api/auth/me', { auth: 'noauth' }),
      testStatus(401, 'Status is 401 Unauthorized')
    ),
    item('GET /api/auth/me - malformed token (401)',
      req('GET', '/api/auth/me', { auth: 'noauth', authHeader: 'Bearer not.a.jwt' }),
      testStatus(401, 'Status is 401 Unauthorized')
    ),
    item('GET /api/auth/me - wrong scheme (401)',
      req('GET', '/api/auth/me', { auth: 'noauth', authHeader: 'Basic dXNlcjpwYXNz' }),
      testStatus(401, 'Status is 401 Unauthorized')
    ),
    item('GET /api/auth/me - refresh token as access (401)',
      req('GET', '/api/auth/me', { bearerRefresh: true }),
      testStatus(401, 'Status is 401 Unauthorized')
    )
  ])
]);

const bookingsFolder = folder('Bookings', 'Seat holds and lifecycle. Run Auth login first. Negative cases use seed data before Book success consumes seats 1,2.', [
  folder('Happy path', '', [
    item('POST /api/bookings/book - success (stores bookingId)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "userId": {{bookingUserId}},\n  "movieId": {{validMovieId}},\n  "seatIds": {{availableSeatIds}}\n}'
      }),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "const json = pm.response.json();",
        "pm.test('Status is PENDING', function () { pm.expect(json.status).to.eql('PENDING'); });",
        "pm.test('totalAmount is positive', function () { pm.expect(json.totalAmount).to.be.above(0); });",
        "pm.test('holdExpiresAt set', function () { pm.expect(json.holdExpiresAt).to.exist; });",
        "pm.collectionVariables.set('bookingId', json.id);"
      ],
      prerequestBookingUser
    ),
    item('GET /api/bookings/{{bookingId}} - fetch booking',
      req('GET', '/api/bookings/{{bookingId}}'),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "pm.test('Matches stored bookingId', function () {",
        "    pm.expect(pm.response.json().id).to.eql(Number(pm.collectionVariables.get('bookingId')));",
        "});"
      ]
    ),
    item('POST /api/bookings/{{bookingId}}/confirm - success',
      req('POST', '/api/bookings/{{bookingId}}/confirm'),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "pm.test('Status is CONFIRMED', function () { pm.expect(pm.response.json().status).to.eql('CONFIRMED'); });"
      ]
    ),
    item('Setup: book seats for cancel flow (stores bookingIdCancel)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "userId": {{bookingUserId}},\n  "movieId": 1,\n  "seatIds": {{theatre2SeatIds}}\n}'
      }),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "pm.collectionVariables.set('bookingIdCancel', pm.response.json().id);"
      ],
      prerequestBookingUser
    ),
    item('POST /api/bookings/{{bookingIdCancel}}/cancel - success',
      req('POST', '/api/bookings/{{bookingIdCancel}}/cancel'),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "pm.test('Status is CANCELLED', function () { pm.expect(pm.response.json().status).to.eql('CANCELLED'); });"
      ]
    ),
    item('POST /api/bookings/{{bookingIdCancel}}/cancel - idempotent (already cancelled)',
      req('POST', '/api/bookings/{{bookingIdCancel}}/cancel'),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "pm.test('Status is CANCELLED', function () { pm.expect(pm.response.json().status).to.eql('CANCELLED'); });"
      ]
    ),
    item('POST /api/bookings/cleanup-expired - run cleanup',
      req('POST', '/api/bookings/cleanup-expired'),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "pm.test('Body is numeric count', function () {",
        "    const n = Number(pm.response.text());",
        "    pm.expect(Number.isNaN(n)).to.eql(false);",
        "    pm.expect(n).to.be.at.least(0);",
        "});"
      ]
    )
  ]),
  folder('Edge cases - validation', 'Bad request bodies and IDs.', [
    item('POST /api/bookings/book - null body (400)',
      req('POST', '/api/bookings/book'),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/bookings/book - empty body (400)',
      req('POST', '/api/bookings/book', { body: '{}' }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/bookings/book - userId zero (400)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "userId": 0,\n  "movieId": {{validMovieId}},\n  "seatIds": {{availableSeatIds}}\n}'
      }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/bookings/book - movieId zero (400)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "userId": {{validUserId}},\n  "movieId": 0,\n  "seatIds": {{availableSeatIds}}\n}'
      }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/bookings/book - empty seatIds (400)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "userId": {{validUserId}},\n  "movieId": {{validMovieId}},\n  "seatIds": []\n}'
      }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/bookings/book - missing seatIds field (400)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "userId": {{validUserId}},\n  "movieId": {{validMovieId}}\n}'
      }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('GET /api/bookings/0 (400)',
      req('GET', '/api/bookings/0'),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/bookings/0/confirm (400)',
      req('POST', '/api/bookings/0/confirm'),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/bookings/0/cancel (400)',
      req('POST', '/api/bookings/0/cancel'),
      testStatus(400, 'Status is 400 Bad Request')
    )
  ]),
  folder('Edge cases - business rules', 'Seat conflicts and booking state (requires seed data).', [
    item('POST /api/bookings/book - invalid userId (404)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "userId": {{invalidUserId}},\n  "movieId": {{validMovieId}},\n  "seatIds": {{availableSeatIds}}\n}'
      }),
      testStatus(404, 'Status is 404 Not Found')
    ),
    item('POST /api/bookings/book - duplicate seat IDs (409)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "userId": {{validUserId}},\n  "movieId": {{validMovieId}},\n  "seatIds": {{duplicateSeatIds}}\n}'
      }),
      testStatus(409, 'Status is 409 Conflict')
    ),
    item('POST /api/bookings/book - seats from different theatres (409)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "userId": {{validUserId}},\n  "movieId": {{validMovieId}},\n  "seatIds": {{mixedTheatreSeatIds}}\n}'
      }),
      testStatus(409, 'Status is 409 Conflict')
    ),
    item('POST /api/bookings/book - movie not running in theatre (409)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "userId": {{validUserId}},\n  "movieId": {{movieNotInTheatre1}},\n  "seatIds": {{availableSeatIds}}\n}'
      }),
      testStatus(409, 'Status is 409 Conflict')
    ),
    item('POST /api/bookings/book - seat already BOOKED (409)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "userId": {{validUserId}},\n  "movieId": {{validMovieId}},\n  "seatIds": {{bookedSeatIds}}\n}'
      }),
      testStatus(409, 'Status is 409 Conflict')
    ),
    item('POST /api/bookings/book - seat BLOCKED (409)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "userId": {{validUserId}},\n  "movieId": {{validMovieId}},\n  "seatIds": {{blockedSeatIds}}\n}'
      }),
      testStatus(409, 'Status is 409 Conflict')
    ),
    item('POST /api/bookings/book - non-existent seat (409)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "userId": {{validUserId}},\n  "movieId": {{validMovieId}},\n  "seatIds": [999999]\n}'
      }),
      testStatus(409, 'Status is 409 Conflict')
    ),
    item('GET /api/bookings/999999 (404)',
      req('GET', '/api/bookings/999999'),
      testStatus(404, 'Status is 404 Not Found')
    ),
    item('POST /api/bookings/999999/confirm (404)',
      req('POST', '/api/bookings/999999/confirm'),
      testStatus(404, 'Status is 404 Not Found')
    ),
    item('POST /api/bookings/999999/cancel (404)',
      req('POST', '/api/bookings/999999/cancel'),
      testStatus(404, 'Status is 404 Not Found')
    ),
    item('POST /api/bookings/{{bookingId}}/confirm - already confirmed (409)',
      req('POST', '/api/bookings/{{bookingId}}/confirm'),
      testStatus(409, 'Status is 409 Conflict')
    ),
    item('Setup: book for confirm-on-cancelled test',
      req('POST', '/api/bookings/book', {
        body: '{\n  "userId": {{bookingUserId}},\n  "movieId": 1,\n  "seatIds": [8]\n}'
      }),
      [
        "pm.collectionVariables.set('bookingIdCancelled', pm.response.json().id);"
      ],
      prerequestBookingUser
    ),
    item('POST /api/bookings/{{bookingIdCancelled}}/cancel',
      req('POST', '/api/bookings/{{bookingIdCancelled}}/cancel'),
      testStatus(200, 'Status is 200 OK')
    ),
    item('POST /api/bookings/{{bookingIdCancelled}}/confirm - cancelled booking (409)',
      req('POST', '/api/bookings/{{bookingIdCancelled}}/confirm'),
      testStatus(409, 'Status is 409 Conflict')
    ),
    item('POST /api/bookings/{{seedConfirmedBookingId}}/confirm - seed CONFIRMED (409)',
      req('POST', '/api/bookings/{{seedConfirmedBookingId}}/confirm'),
      testStatus(409, 'Status is 409 Conflict')
    )
  ]),
  folder('Real-time show seats', 'Book via showSeatIds (per-showtime inventory). Uses Phoenix show 3 / showSeats 5-6 to avoid theatre-1 seat conflicts.', [
    folder('Happy path', '', [
      item('POST /api/bookings/book-show-seats - success (stores showBookingId)',
        req('POST', '/api/bookings/book-show-seats', {
          body: '{\n  "userId": {{bookingUserId}},\n  "showSeatIds": {{availableShowSeatIds}}\n}',
          description: 'Hold seats for a specific showtime. Syncs ShowSeat + theatre Seat status.'
        }),
        [
          "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
          "const json = pm.response.json();",
          "pm.test('Status is PENDING', function () { pm.expect(json.status).to.eql('PENDING'); });",
          "pm.test('Show attached to booking', function () { pm.expect(json.show).to.exist; pm.expect(json.show.id).to.eql(Number(pm.collectionVariables.get('validShowId'))); });",
          "pm.test('holdExpiresAt set', function () { pm.expect(json.holdExpiresAt).to.exist; });",
          "pm.collectionVariables.set('showBookingId', json.id);"
        ],
        prerequestBookingUser
      ),
      item('GET /api/bookings/{{showBookingId}} - fetch show booking',
        req('GET', '/api/bookings/{{showBookingId}}'),
        [
          "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
          "pm.test('Has show details', function () { pm.expect(pm.response.json().show).to.exist; });"
        ]
      ),
      item('POST /api/bookings/{{showBookingId}}/confirm - success',
        req('POST', '/api/bookings/{{showBookingId}}/confirm'),
        [
          "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
          "pm.test('Status is CONFIRMED', function () { pm.expect(pm.response.json().status).to.eql('CONFIRMED'); });"
        ]
      ),
      item('Setup: book show seats for cancel flow (stores showBookingIdCancel)',
        req('POST', '/api/bookings/book-show-seats', {
          body: '{\n  "userId": {{bookingUserId}},\n  "showSeatIds": {{show2AvailableShowSeatIds}}\n}'
        }),
        [
          "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
          "pm.collectionVariables.set('showBookingIdCancel', pm.response.json().id);"
        ],
        prerequestBookingUser
      ),
      item('POST /api/bookings/{{showBookingIdCancel}}/cancel - success',
        req('POST', '/api/bookings/{{showBookingIdCancel}}/cancel'),
        [
          "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
          "pm.test('Status is CANCELLED', function () { pm.expect(pm.response.json().status).to.eql('CANCELLED'); });"
        ]
      ),
      item('GET /api/shows/2/availability - verify cancelled seat released',
        req('GET', '/api/shows/2/availability', { auth: 'noauth' }),
        testStatus(200, 'Status is 200').concat([
          "pm.test('Show seat 3 is AVAILABLE again', function () {",
          "    const seat = pm.response.json().seats.find(s => s.showSeatId === 3);",
          "    pm.expect(seat).to.exist;",
          "    pm.expect(seat.seatStatus).to.eql('AVAILABLE');",
          "});"
        ])
      )
    ]),
    folder('Edge cases - validation', 'Bad request bodies for show-seat booking.', [
      item('POST /api/bookings/book-show-seats - null body (400)',
        req('POST', '/api/bookings/book-show-seats'),
        testStatus(400, 'Status is 400 Bad Request')
      ),
      item('POST /api/bookings/book-show-seats - empty body (400)',
        req('POST', '/api/bookings/book-show-seats', { body: '{}' }),
        testStatus(400, 'Status is 400 Bad Request')
      ),
      item('POST /api/bookings/book-show-seats - userId zero (400)',
        req('POST', '/api/bookings/book-show-seats', {
          body: '{\n  "userId": 0,\n  "showSeatIds": {{availableShowSeatIds}}\n}'
        }),
        testStatus(400, 'Status is 400 Bad Request')
      ),
      item('POST /api/bookings/book-show-seats - empty showSeatIds (400)',
        req('POST', '/api/bookings/book-show-seats', {
          body: '{\n  "userId": {{validUserId}},\n  "showSeatIds": []\n}'
        }),
        testStatus(400, 'Status is 400 Bad Request')
      ),
      item('POST /api/bookings/book-show-seats - missing showSeatIds field (400)',
        req('POST', '/api/bookings/book-show-seats', {
          body: '{\n  "userId": {{validUserId}}\n}'
        }),
        testStatus(400, 'Status is 400 Bad Request')
      )
    ]),
    folder('Edge cases - business rules', 'Show-seat conflicts (requires seed data).', [
      item('POST /api/bookings/book-show-seats - invalid userId (404)',
        req('POST', '/api/bookings/book-show-seats', {
          body: '{\n  "userId": {{invalidUserId}},\n  "showSeatIds": {{availableShowSeatIds}}\n}'
        }),
        testStatus(404, 'Status is 404 Not Found')
      ),
      item('POST /api/bookings/book-show-seats - duplicate showSeatIds (409)',
        req('POST', '/api/bookings/book-show-seats', {
          body: '{\n  "userId": {{validUserId}},\n  "showSeatIds": {{duplicateShowSeatIds}}\n}'
        }),
        testStatus(409, 'Status is 409 Conflict')
      ),
      item('POST /api/bookings/book-show-seats - showSeats from different shows (409)',
        req('POST', '/api/bookings/book-show-seats', {
          body: '{\n  "userId": {{validUserId}},\n  "showSeatIds": {{mixedShowShowSeatIds}}\n}'
        }),
        testStatus(409, 'Status is 409 Conflict')
      ),
      item('POST /api/bookings/book-show-seats - showSeat BLOCKED in seed (409)',
        req('POST', '/api/bookings/book-show-seats', {
          body: '{\n  "userId": {{validUserId}},\n  "showSeatIds": {{blockedShowSeatIds}}\n}'
        }),
        testStatus(409, 'Status is 409 Conflict')
      ),
      item('POST /api/bookings/book-show-seats - non-existent showSeat (409)',
        req('POST', '/api/bookings/book-show-seats', {
          body: '{\n  "userId": {{validUserId}},\n  "showSeatIds": [999999]\n}'
        }),
        testStatus(409, 'Status is 409 Conflict')
      ),
      item('POST /api/bookings/{{showBookingId}}/confirm - already confirmed (409)',
        req('POST', '/api/bookings/{{showBookingId}}/confirm'),
        testStatus(409, 'Status is 409 Conflict')
      )
    ])
  ])
]);

const paymentsFolder = folder('Payments', 'Strategy (STRIPE | RAZORPAY) + mock adapters. Run Auth login first. Run edge-case subfolders before Happy path (seats are consumed in order).', [
  folder('Edge cases - validation', 'Malformed payment requests.', [
    item('POST /api/payments/initiate - null body (400)',
      req('POST', '/api/payments/initiate'),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/payments/initiate - empty body (400)',
      req('POST', '/api/payments/initiate', { body: '{}' }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/payments/initiate - missing provider (400)',
      req('POST', '/api/payments/initiate', {
        body: '{\n  "bookingId": {{validUserId}}\n}'
      }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/payments/initiate - bookingId zero (400)',
      req('POST', '/api/payments/initiate', {
        body: '{\n  "bookingId": 0,\n  "provider": "STRIPE"\n}'
      }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/payments/initiate - invalid provider enum (400)',
      req('POST', '/api/payments/initiate', {
        body: '{\n  "bookingId": 1,\n  "provider": "PAYPAL"\n}'
      }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/payments/callback - null body (400)',
      req('POST', '/api/payments/callback'),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/payments/callback - empty body (400)',
      req('POST', '/api/payments/callback', { body: '{}' }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/payments/callback - paymentId zero (400)',
      req('POST', '/api/payments/callback', {
        body: '{\n  "paymentId": 0,\n  "success": true\n}'
      }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('GET /api/payments/0 (400)',
      req('GET', '/api/payments/0'),
      testStatus(400, 'Status is 400 Bad Request')
    )
  ]),
  folder('Edge cases - business rules', 'Run before Happy path. Uses theatre-2 seats 6-9.', [
    item('GET /api/payments/providers - list STRIPE and RAZORPAY',
      req('GET', '/api/payments/providers'),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "const providers = pm.response.json();",
        "pm.test('Returns STRIPE and RAZORPAY', function () {",
        "    pm.expect(providers).to.be.an('array').with.lengthOf(2);",
        "});"
      ]
    ),
    item('POST /api/payments/initiate - booking not found (409)',
      req('POST', '/api/payments/initiate', {
        body: '{\n  "bookingId": 999999,\n  "provider": "STRIPE"\n}'
      }),
      testStatus(409, 'Status is 409 Conflict')
    ),
    item('POST /api/payments/initiate - on seed CONFIRMED booking (409)',
      req('POST', '/api/payments/initiate', {
        body: '{\n  "bookingId": {{seedConfirmedBookingId}},\n  "provider": "STRIPE"\n}'
      }),
      testStatus(409, 'Status is 409 Conflict')
    ),
    item('POST /api/payments/callback - payment not found (404)',
      req('POST', '/api/payments/callback', {
        body: '{\n  "paymentId": 999999,\n  "paymentReference": "x",\n  "success": true\n}'
      }),
      testStatus(404, 'Status is 404 Not Found')
    ),
    item('GET /api/payments/999999 (404)',
      req('GET', '/api/payments/999999'),
      testStatus(404, 'Status is 404 Not Found')
    ),
    item('Setup: book seat 6 for duplicate initiate test',
      req('POST', '/api/bookings/book', {
        body: '{\n  "userId": {{bookingUserId}},\n  "movieId": 1,\n  "seatIds": [6]\n}'
      }),
      [
        "pm.collectionVariables.set('bookingIdDupPay', pm.response.json().id);"
      ],
      prerequestBookingUser
    ),
    item('POST /api/payments/initiate - first attempt (stores paymentIdDup)',
      req('POST', '/api/payments/initiate', {
        body: '{\n  "bookingId": {{bookingIdDupPay}},\n  "provider": "STRIPE"\n}'
      }),
      [
        "pm.test('Status is 201', function () { pm.response.to.have.status(201); });",
        "pm.collectionVariables.set('paymentIdDup', pm.response.json().paymentId);"
      ]
    ),
    item('POST /api/payments/initiate - duplicate PENDING payment (409)',
      req('POST', '/api/payments/initiate', {
        body: '{\n  "bookingId": {{bookingIdDupPay}},\n  "provider": "STRIPE"\n}'
      }),
      testStatus(409, 'Status is 409 Conflict')
    ),
    item('POST /api/bookings/{{bookingIdDupPay}}/cancel - cleanup dup test booking',
      req('POST', '/api/bookings/{{bookingIdDupPay}}/cancel'),
      testStatus(200, 'Status is 200 OK')
    ),
    item('Setup: book seat 7 for Razorpay failure flow',
      req('POST', '/api/bookings/book', {
        body: '{\n  "userId": {{bookingUserId}},\n  "movieId": 1,\n  "seatIds": [7]\n}'
      }),
      [
        "pm.collectionVariables.set('bookingIdFail', pm.response.json().id);"
      ],
      prerequestBookingUser
    ),
    item('POST /api/payments/initiate - Razorpay (stores paymentIdFail)',
      req('POST', '/api/payments/initiate', {
        body: '{\n  "bookingId": {{bookingIdFail}},\n  "provider": "RAZORPAY"\n}'
      }),
      [
        "pm.collectionVariables.set('paymentIdFail', pm.response.json().paymentId);"
      ]
    ),
    item('POST /api/payments/callback - Razorpay reported failure',
      req('POST', '/api/payments/callback', {
        body: '{\n  "paymentId": {{paymentIdFail}},\n  "paymentReference": "pay_rzp_fail",\n  "signature": "{{razorpayMockSignature}}",\n  "success": false\n}'
      }),
      [
        "pm.test('Payment FAILED', function () { pm.expect(pm.response.json().status).to.eql('FAILED'); });",
        "pm.test('Booking CANCELLED', function () { pm.expect(pm.response.json().bookingStatus).to.eql('CANCELLED'); });"
      ]
    ),
    item('Setup: rebook seat 7 for Stripe success=false callback',
      req('POST', '/api/bookings/book', {
        body: '{\n  "userId": {{bookingUserId}},\n  "movieId": 1,\n  "seatIds": [7]\n}'
      }),
      [
        "pm.collectionVariables.set('bookingIdStripeFail', pm.response.json().id);"
      ],
      prerequestBookingUser
    ),
    item('POST /api/payments/initiate - Stripe success=false setup',
      req('POST', '/api/payments/initiate', {
        body: '{\n  "bookingId": {{bookingIdStripeFail}},\n  "provider": "STRIPE"\n}'
      }),
      [
        "pm.collectionVariables.set('paymentIdStripeFail', pm.response.json().paymentId);"
      ]
    ),
    item('POST /api/payments/callback - Stripe success=false with valid sig',
      req('POST', '/api/payments/callback', {
        body: '{\n  "paymentId": {{paymentIdStripeFail}},\n  "paymentReference": "pay_stripe_fail",\n  "signature": "{{stripeMockSignature}}",\n  "success": false\n}'
      }),
      [
        "pm.test('Payment FAILED', function () { pm.expect(pm.response.json().status).to.eql('FAILED'); });",
        "pm.test('Booking CANCELLED', function () { pm.expect(pm.response.json().bookingStatus).to.eql('CANCELLED'); });"
      ]
    ),
    item('Setup: book seat 8 for Stripe bad-signature test',
      req('POST', '/api/bookings/book', {
        body: '{\n  "userId": {{bookingUserId}},\n  "movieId": 1,\n  "seatIds": [8]\n}'
      }),
      [
        "pm.collectionVariables.set('bookingIdBadSig', pm.response.json().id);"
      ],
      prerequestBookingUser
    ),
    item('POST /api/payments/initiate - Stripe bad-sig setup',
      req('POST', '/api/payments/initiate', {
        body: '{\n  "bookingId": {{bookingIdBadSig}},\n  "provider": "STRIPE"\n}'
      }),
      [
        "pm.collectionVariables.set('paymentIdBadSig', pm.response.json().paymentId);"
      ]
    ),
    item('POST /api/payments/callback - invalid Stripe signature',
      req('POST', '/api/payments/callback', {
        body: '{\n  "paymentId": {{paymentIdBadSig}},\n  "paymentReference": "pay_bad_sig",\n  "signature": "invalid_not_whsec_prefix",\n  "success": true\n}'
      }),
      [
        "pm.test('Payment FAILED', function () { pm.expect(pm.response.json().status).to.eql('FAILED'); });",
        "pm.test('Booking CANCELLED', function () { pm.expect(pm.response.json().bookingStatus).to.eql('CANCELLED'); });"
      ]
    ),
    item('Setup: book seat 9 for Razorpay bad-signature test',
      req('POST', '/api/bookings/book', {
        body: '{\n  "userId": {{bookingUserId}},\n  "movieId": 1,\n  "seatIds": [9]\n}'
      }),
      [
        "pm.collectionVariables.set('bookingIdRzpBadSig', pm.response.json().id);"
      ],
      prerequestBookingUser
    ),
    item('POST /api/payments/initiate - Razorpay bad-sig setup',
      req('POST', '/api/payments/initiate', {
        body: '{\n  "bookingId": {{bookingIdRzpBadSig}},\n  "provider": "RAZORPAY"\n}'
      }),
      [
        "pm.collectionVariables.set('paymentIdRzpBadSig', pm.response.json().paymentId);"
      ]
    ),
    item('POST /api/payments/callback - invalid Razorpay signature',
      req('POST', '/api/payments/callback', {
        body: '{\n  "paymentId": {{paymentIdRzpBadSig}},\n  "paymentReference": "pay_rzp_bad",\n  "signature": "invalid_not_rzp_sig_prefix",\n  "success": true\n}'
      }),
      [
        "pm.test('Payment FAILED', function () { pm.expect(pm.response.json().status).to.eql('FAILED'); });",
        "pm.test('Booking CANCELLED', function () { pm.expect(pm.response.json().bookingStatus).to.eql('CANCELLED'); });"
      ]
    )
  ]),
  folder('Happy path', 'Stripe and Razorpay mock success flows. Run after edge cases (uses seats 1-2 and re-books 6-9 if available).', [
    item('GET /api/payments/providers - list STRIPE and RAZORPAY',
      req('GET', '/api/payments/providers'),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "const providers = pm.response.json();",
        "pm.test('Returns STRIPE and RAZORPAY', function () {",
        "    pm.expect(providers).to.be.an('array').with.lengthOf(2);",
        "    const codes = providers.map(p => p.provider);",
        "    pm.expect(codes).to.include('STRIPE');",
        "    pm.expect(codes).to.include('RAZORPAY');",
        "});",
        "pm.test('Mock mode: both configured', function () {",
        "    providers.forEach(p => pm.expect(p.configured, p.provider).to.be.true);",
        "});"
      ]
    ),
    item('Setup: book seats for Stripe payment (stores bookingIdPay)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "userId": {{bookingUserId}},\n  "movieId": 1,\n  "seatIds": [8, 9]\n}'
      }),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "const json = pm.response.json();",
        "pm.test('PENDING', function () { pm.expect(json.status).to.eql('PENDING'); });",
        "pm.collectionVariables.set('bookingIdPay', json.id);"
      ],
      prerequestBookingUser
    ),
    item('POST /api/payments/initiate - Stripe mock (stores paymentId)',
      req('POST', '/api/payments/initiate', {
        body: '{\n  "bookingId": {{bookingIdPay}},\n  "provider": "STRIPE"\n}'
      }),
      [
        "pm.test('Status is 201 Created', function () { pm.response.to.have.status(201); });",
        "const json = pm.response.json();",
        "pm.test('Provider is STRIPE', function () { pm.expect(json.provider).to.eql('STRIPE'); });",
        "pm.test('Status is PENDING', function () { pm.expect(json.status).to.eql('PENDING'); });",
        "pm.collectionVariables.set('paymentId', json.paymentId);",
        "pm.collectionVariables.set('gatewayOrderIdStripe', json.gatewayOrderId);"
      ]
    ),
    item('POST /api/payments/callback - Stripe mock success (whsec_)',
      req('POST', '/api/payments/callback', {
        body: '{\n  "paymentId": {{paymentId}},\n  "paymentReference": "{{gatewayOrderIdStripe}}",\n  "signature": "{{stripeMockSignature}}",\n  "success": true\n}'
      }),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "const json = pm.response.json();",
        "pm.test('Payment SUCCESS', function () { pm.expect(json.status).to.eql('SUCCESS'); });",
        "pm.test('Booking CONFIRMED', function () { pm.expect(json.bookingStatus).to.eql('CONFIRMED'); });"
      ]
    ),
    item('GET /api/payments/{{paymentId}} - fetch payment',
      req('GET', '/api/payments/{{paymentId}}'),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "pm.test('Payment SUCCESS', function () { pm.expect(pm.response.json().status).to.eql('SUCCESS'); });"
      ]
    ),
    item('Setup: book seats for Razorpay (stores bookingIdRzp)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "userId": {{bookingUserId}},\n  "movieId": 1,\n  "seatIds": [6, 7]\n}'
      }),
      [
        "pm.collectionVariables.set('bookingIdRzp', pm.response.json().id);"
      ],
      prerequestBookingUser
    ),
    item('POST /api/payments/initiate - Razorpay mock',
      req('POST', '/api/payments/initiate', {
        body: '{\n  "bookingId": {{bookingIdRzp}},\n  "provider": "RAZORPAY"\n}'
      }),
      [
        "pm.test('Status is 201 Created', function () { pm.response.to.have.status(201); });",
        "pm.collectionVariables.set('paymentIdRzp', pm.response.json().paymentId);",
        "pm.collectionVariables.set('gatewayOrderIdRazorpay', pm.response.json().gatewayOrderId);"
      ]
    ),
    item('POST /api/payments/callback - Razorpay mock success (rzp_sig_)',
      req('POST', '/api/payments/callback', {
        body: '{\n  "paymentId": {{paymentIdRzp}},\n  "paymentReference": "pay_rzp_mock_success",\n  "signature": "{{razorpayMockSignature}}",\n  "success": true\n}'
      }),
      [
        "pm.test('Payment SUCCESS', function () { pm.expect(pm.response.json().status).to.eql('SUCCESS'); });",
        "pm.test('Booking CONFIRMED', function () { pm.expect(pm.response.json().bookingStatus).to.eql('CONFIRMED'); });"
      ]
    ),
    item('POST /api/payments/callback - already processed (409)',
      req('POST', '/api/payments/callback', {
        body: '{\n  "paymentId": {{paymentId}},\n  "paymentReference": "{{gatewayOrderIdStripe}}",\n  "signature": "{{stripeMockSignature}}",\n  "success": true\n}'
      }),
      testStatus(409, 'Status is 409 Conflict')
    ),
    item('POST /api/payments/initiate - on CONFIRMED bookingIdPay (409)',
      req('POST', '/api/payments/initiate', {
        body: '{\n  "bookingId": {{bookingIdPay}},\n  "provider": "STRIPE"\n}'
      }),
      testStatus(409, 'Status is 409 Conflict')
    )
  ])
]);

const securityFolder = folder('Security Edge Cases', 'Protected endpoints must reject missing, malformed, or wrong-type JWT.', [
  item('POST /api/bookings/book-show-seats - missing token (401)',
    req('POST', '/api/bookings/book-show-seats', {
      auth: 'noauth',
      body: '{\n  "userId": {{validUserId}},\n  "showSeatIds": [1]\n}'
    }),
    testStatus(401, 'Status is 401 Unauthorized')
  ),
  item('POST /api/bookings/book - missing token (401)',
    req('POST', '/api/bookings/book', {
      auth: 'noauth',
      body: '{\n  "userId": {{validUserId}},\n  "movieId": 1,\n  "seatIds": [1]\n}'
    }),
    testStatus(401, 'Status is 401 Unauthorized')
  ),
  item('POST /api/bookings/book - invalid token (401)',
    req('POST', '/api/bookings/book', {
      auth: 'noauth',
      body: '{\n  "userId": {{validUserId}},\n  "movieId": 1,\n  "seatIds": [1]\n}',
      headers: [{ key: 'Authorization', value: 'Bearer eyJhbGciOiJIUzI1NiJ9.invalid' }]
    }),
    testStatus(401, 'Status is 401 Unauthorized')
  ),
  item('GET /api/bookings/1 - missing token (401)',
    req('GET', '/api/bookings/1', { auth: 'noauth' }),
    testStatus(401, 'Status is 401 Unauthorized')
  ),
  item('GET /api/bookings/1 - invalid token (401)',
    req('GET', '/api/bookings/1', { auth: 'noauth', authHeader: 'Bearer not.a.jwt' }),
    testStatus(401, 'Status is 401 Unauthorized')
  ),
  item('POST /api/bookings/cleanup-expired - missing token (401)',
    req('POST', '/api/bookings/cleanup-expired', { auth: 'noauth' }),
    testStatus(401, 'Status is 401 Unauthorized')
  ),
  item('GET /api/payments/providers - missing token (401)',
    req('GET', '/api/payments/providers', { auth: 'noauth' }),
    testStatus(401, 'Status is 401 Unauthorized')
  ),
  item('POST /api/payments/initiate - missing token (401)',
    req('POST', '/api/payments/initiate', {
      auth: 'noauth',
      body: '{\n  "bookingId": 1,\n  "provider": "STRIPE"\n}'
    }),
    testStatus(401, 'Status is 401 Unauthorized')
  ),
  item('POST /api/payments/callback - missing token (401)',
    req('POST', '/api/payments/callback', {
      auth: 'noauth',
      body: '{\n  "paymentId": 1,\n  "success": true\n}'
    }),
    testStatus(401, 'Status is 401 Unauthorized')
  ),
  item('POST /api/payments/initiate - refresh token as access (401)',
    req('POST', '/api/payments/initiate', {
      bearerRefresh: true,
      body: '{\n  "bookingId": 1,\n  "provider": "STRIPE"\n}'
    }),
    testStatus(401, 'Status is 401 Unauthorized')
  ),
  item('GET /api/payments/1 - missing token (401)',
    req('GET', '/api/payments/1', { auth: 'noauth' }),
    testStatus(401, 'Status is 401 Unauthorized')
  )
]);

const collection = {
  info: {
    name: 'BMSDec24 API - Full Scenarios',
    _postman_id: 'c5b7f498-52ab-4b85-a5bc-b2f42ce6f5f2',
    description: `End-to-end and edge-case coverage for the BMSDec24 API.

**Runner order (recommended):**
1. Health
2. Catalog (public — happy path then edge cases)
3. Shows (Real-time) — public showtimes + availability polling
4. Users → Signup success → Users edge cases
5. Auth → Login seed user (or signup + login) → Auth edge cases
6. Bookings → Edge cases validation → Edge cases business rules → Happy path → Real-time show seats (edge cases then happy path)
7. Payments → Edge cases validation → Edge cases business rules → Happy path (run in this order; seats 6–9 used in business rules first)
8. Security Edge Cases

**Prerequisites:** MySQL — run \`db/seed_bmsdec24.sql\` after first start. H2 profile — demo data loads automatically.

**Real-time shows (H2 seed):**
- Show 1 @ Orion — Action Blast — showSeats 1-2 AVAILABLE
- Show 2 @ Orion — RomCom — showSeat 3 AVAILABLE, 4 BLOCKED
- Show 3 @ Phoenix — Action Blast — showSeats 5-6 AVAILABLE
- Poll: \`GET /api/shows/{showId}/availability?changedAfterEpochMs={serverTime}\`

**Payments (mock — \`bms.payment.mock-enabled=true\`):**
- Stripe success: \`signature\` starts with \`whsec_\`
- Razorpay success: \`signature\` starts with \`rzp_sig_\`

**Seed reference:** Theatre 1 movies 1,2 — seats 1-2 AVAILABLE, 3-4 BOOKED, 5 BLOCKED. Theatre 2 movies 1,3 — seats 6-9 AVAILABLE. Seed users: john.seed@example.com / Password@123`,
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  auth: {
    type: 'bearer',
    bearer: [{ key: 'token', value: '{{accessToken}}', type: 'string' }]
  },
  item: [
    healthFolder,
    catalogFolder,
    showsFolder,
    usersFolder,
    authFolder,
    bookingsFolder,
    paymentsFolder,
    securityFolder
  ],
  event: [],
  variable: [
    { key: 'baseUrl', value: 'http://localhost:8080', type: 'string' },
    { key: 'password', value: 'Password@123', type: 'string' },
    { key: 'existingEmail', value: 'john.seed@example.com', type: 'string' },
    { key: 'signedUpUserId', value: '', type: 'string' },
    { key: 'validUserId', value: '1', type: 'string' },
    { key: 'invalidUserId', value: '999999', type: 'string' },
    { key: 'loginEmail', value: '', type: 'string' },
    { key: 'loginPassword', value: 'Password@123', type: 'string' },
    { key: 'accessToken', value: '', type: 'string' },
    { key: 'refreshToken', value: '', type: 'string' },
    { key: 'validMovieId', value: '1', type: 'string' },
    { key: 'movieNotInTheatre1', value: '3', type: 'string' },
    { key: 'availableSeatIds', value: '[1, 2]', type: 'string' },
    { key: 'theatre2SeatIds', value: '[6, 7]', type: 'string' },
    { key: 'bookedSeatIds', value: '[3]', type: 'string' },
    { key: 'blockedSeatIds', value: '[5]', type: 'string' },
    { key: 'mixedTheatreSeatIds', value: '[1, 6]', type: 'string' },
    { key: 'duplicateSeatIds', value: '[1, 1]', type: 'string' },
    { key: 'validShowId', value: '3', type: 'string' },
    { key: 'availableShowSeatIds', value: '[5, 6]', type: 'string' },
    { key: 'show2AvailableShowSeatIds', value: '[3]', type: 'string' },
    { key: 'blockedShowSeatIds', value: '[4]', type: 'string' },
    { key: 'mixedShowShowSeatIds', value: '[1, 5]', type: 'string' },
    { key: 'duplicateShowSeatIds', value: '[5, 5]', type: 'string' },
    { key: 'lastServerTimeEpochMs', value: '0', type: 'string' },
    { key: 'showBookingId', value: '', type: 'string' },
    { key: 'showBookingIdCancel', value: '', type: 'string' },
    { key: 'seedConfirmedBookingId', value: '1', type: 'string' },
    { key: 'bookingId', value: '', type: 'string' },
    { key: 'bookingIdPay', value: '', type: 'string' },
    { key: 'bookingIdCancel', value: '', type: 'string' },
    { key: 'bookingIdFail', value: '', type: 'string' },
    { key: 'bookingIdCancelled', value: '', type: 'string' },
    { key: 'bookingIdDupPay', value: '', type: 'string' },
    { key: 'bookingIdBadSig', value: '', type: 'string' },
    { key: 'bookingIdRzp', value: '', type: 'string' },
    { key: 'bookingIdRzpBadSig', value: '', type: 'string' },
    { key: 'bookingIdStripeFail', value: '', type: 'string' },
    { key: 'paymentId', value: '', type: 'string' },
    { key: 'paymentIdFail', value: '', type: 'string' },
    { key: 'paymentIdDup', value: '', type: 'string' },
    { key: 'paymentIdBadSig', value: '', type: 'string' },
    { key: 'paymentIdRzp', value: '', type: 'string' },
    { key: 'paymentIdRzpBadSig', value: '', type: 'string' },
    { key: 'paymentIdStripeFail', value: '', type: 'string' },
    { key: 'stripeMockSignature', value: 'whsec_postman_mock', type: 'string' },
    { key: 'razorpayMockSignature', value: 'rzp_sig_postman_mock', type: 'string' },
    { key: 'gatewayOrderIdStripe', value: '', type: 'string' },
    { key: 'gatewayOrderIdRazorpay', value: '', type: 'string' }
  ]
};

function countItems(items) {
  return items.reduce((n, f) => n + (f.item ? countItems(f.item) : 1), 0);
}

function countFolders(items) {
  return items.reduce((n, f) => n + 1 + (f.item ? countFolders(f.item) : 0), 0);
}

fs.writeFileSync('BMSDec24-API.postman_collection.json', JSON.stringify(collection, null, 2) + '\n');
console.log('Generated', countItems(collection.item), 'requests across', countFolders(collection.item), 'folders');
