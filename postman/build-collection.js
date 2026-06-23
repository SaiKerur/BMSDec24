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
    item('GET /api/catalog/movies/1',
      req('GET', '/api/catalog/movies/1', { auth: 'noauth', description: 'Rich movie detail for Action Blast.' }),
      testStatus(200, 'Status is 200').concat([
        "const movie = pm.response.json();",
        "pm.test('Movie has catalog fields', function () {",
        "    pm.expect(movie).to.have.property('posterUrl');",
        "    pm.expect(movie).to.have.property('trailerUrl');",
        "    pm.expect(movie).to.have.property('language');",
        "    pm.expect(movie).to.have.property('runtime');",
        "    pm.expect(movie).to.have.property('certification');",
        "    pm.expect(movie.cast).to.be.an('array');",
        "    pm.expect(movie).to.have.property('synopsis');",
        "    pm.expect(movie).to.have.property('releaseDate');",
        "    pm.expect(movie.status).to.eql('NOW_SHOWING');",
        "});"
      ])
    ),
    item('GET /api/catalog/movies/search?q=Action',
      req('GET', '/api/catalog/movies/search?q=Action', { auth: 'noauth' }),
      testStatus(200, 'Status is 200').concat([
        "pm.test('Search returns matches', function () {",
        "    const movies = pm.response.json();",
        "    pm.expect(movies).to.be.an('array').that.is.not.empty;",
        "    pm.expect(movies.some(m => m.title.includes('Action'))).to.be.true;",
        "});"
      ])
    ),
    item('GET /api/catalog/movies/search?q=Alex',
      req('GET', '/api/catalog/movies/search?q=Alex', { auth: 'noauth', description: 'Search by cast member name.' }),
      testStatus(200, 'Status is 200').concat([
        "pm.test('Cast search finds Action Blast', function () {",
        "    pm.expect(pm.response.json().some(m => m.title === 'Action Blast')).to.be.true;",
        "});"
      ])
    ),
    item('GET /api/catalog/movies/now-showing',
      req('GET', '/api/catalog/movies/now-showing', { auth: 'noauth' }),
      testStatus(200, 'Status is 200').concat([
        "pm.test('All movies are NOW_SHOWING', function () {",
        "    pm.response.json().forEach(m => pm.expect(m.status).to.eql('NOW_SHOWING'));",
        "});"
      ])
    ),
    item('GET /api/catalog/movies/now-showing?cityId=1',
      req('GET', '/api/catalog/movies/now-showing?cityId=1', { auth: 'noauth', description: 'Now showing in Bengaluru (city 1).' }),
      testStatus(200, 'Status is 200').concat([
        "pm.test('City filter returns now-showing movies', function () {",
        "    const movies = pm.response.json();",
        "    pm.expect(movies).to.be.an('array').that.is.not.empty;",
        "    movies.forEach(m => pm.expect(m.status).to.eql('NOW_SHOWING'));",
        "});"
      ])
    ),
    item('GET /api/catalog/movies/coming-soon',
      req('GET', '/api/catalog/movies/coming-soon', { auth: 'noauth' }),
      testStatus(200, 'Status is 200').concat([
        "pm.test('All movies are COMING_SOON', function () {",
        "    const movies = pm.response.json();",
        "    pm.expect(movies).to.be.an('array').that.is.not.empty;",
        "    movies.forEach(m => pm.expect(m.status).to.eql('COMING_SOON'));",
        "});"
      ])
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
    item('GET /api/catalog/movies/0 (400)',
      req('GET', '/api/catalog/movies/0', { auth: 'noauth' }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('GET /api/catalog/movies/99999 (404)',
      req('GET', '/api/catalog/movies/99999', { auth: 'noauth' }),
      testStatus(404, 'Status is 404 Not Found')
    ),
    item('GET /api/catalog/movies/search?q= (400)',
      req('GET', '/api/catalog/movies/search?q=', { auth: 'noauth' }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('GET /api/catalog/movies/now-showing?cityId=0 (400)',
      req('GET', '/api/catalog/movies/now-showing?cityId=0', { auth: 'noauth' }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('GET /api/catalog/movies/now-showing?cityId=99999 (404)',
      req('GET', '/api/catalog/movies/now-showing?cityId=99999', { auth: 'noauth' }),
      testStatus(404, 'Status is 404 Not Found')
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

const showsFolder = folder('Shows (Real-time)', 'Public show discovery and live seat availability polling (no JWT required). Each theatre has a full 5-row seat map (rows A-E, 8 seats each = 40 seats; types A/D GOLD, B/E SILVER, C PLATINUM). H2 seed: Show 1 Orion Action Blast (showSeats 1-2 AVAILABLE), Show 2 Orion RomCom (showSeat 3 AVAILABLE, 4 BLOCKED), Show 3 Phoenix Action Blast (showSeats 5-6 AVAILABLE).', [
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
      req('GET', '/api/shows/1/availability', { auth: 'noauth', description: 'Full seat map with AVAILABLE/BLOCKED/BOOKED counts. Each seat includes price + seatType so the UI can show per-seat pricing and a live total.' }),
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
        "pm.test('Seats expose price and seatType for the seat map', function () {",
        "    pm.expect(json.seats[0]).to.have.property('price');",
        "    pm.expect(json.seats[0].price).to.be.a('number');",
        "    pm.expect(json.seats[0]).to.have.property('seatType');",
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
    item('GET /api/shows/1/availability/stream - SSE live seat updates (v3)',
      req('GET', '/api/shows/1/availability/stream', {
        auth: 'noauth',
        description: 'Server-Sent Events stream. First event is a full snapshot; subsequent events push when seats are booked/held/released. Content-Type: text/event-stream. In Postman, use the SSE tab or curl: curl -N http://localhost:8087/api/shows/1/availability/stream'
      }),
      testStatus(200, 'Status is 200').concat([
        "pm.test('Content-Type is text/event-stream', function () {",
        "    pm.expect(pm.response.headers.get('Content-Type')).to.include('text/event-stream');",
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
        "pm.test('email present', function () { pm.expect(json.email).to.be.a('string').and.not.empty; });",
        "pm.test('role present', function () { pm.expect(json.role).to.eql('USER'); });"
      ]
    ),
    item('POST /api/auth/login - admin user (stores adminAccessToken)',
      req('POST', '/api/auth/login', {
        auth: 'noauth',
        body: '{\n  "email": "{{adminEmail}}",\n  "password": "{{password}}"\n}'
      }),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "pm.collectionVariables.set('adminAccessToken', pm.response.json().accessToken);"
      ]
    ),
    item('POST /api/auth/login - partner user (stores partnerAccessToken)',
      req('POST', '/api/auth/login', {
        auth: 'noauth',
        body: '{\n  "email": "{{partnerEmail}}",\n  "password": "{{password}}"\n}'
      }),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "pm.collectionVariables.set('partnerAccessToken', pm.response.json().accessToken);"
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

const bookingsFolder = folder('Bookings', 'Seat holds and lifecycle. userId comes from JWT (not request body). Run Auth login first.', [
  folder('Ownership & authorization', 'Booking access is scoped to owner; ADMIN/PARTNER can access all.', [
    item('GET /api/users/me/bookings - list my bookings',
      req('GET', '/api/users/me/bookings'),
      testStatus(200, 'Status is 200').concat([
        "pm.test('Returns booking array', function () { pm.expect(pm.response.json()).to.be.an('array'); });"
      ])
    ),
    item('GET /api/users/me/bookings?status=PENDING - filter by status',
      req('GET', '/api/users/me/bookings?status=PENDING'),
      testStatus(200, 'Status is 200').concat([
        "pm.response.json().forEach(function (b) { pm.expect(b.status).to.eql('PENDING'); });"
      ])
    ),
    item('Setup: login as amy (stores amyAccessToken)',
      req('POST', '/api/auth/login', {
        auth: 'noauth',
        body: '{\n  "email": "amy.seed@example.com",\n  "password": "{{password}}"\n}'
      }),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "pm.collectionVariables.set('amyAccessToken', pm.response.json().accessToken);"
      ]
    ),
    item('GET /api/bookings/{{seedConfirmedBookingId}} - another user booking (403)',
      req('GET', '/api/bookings/{{seedConfirmedBookingId}}', {
        auth: 'noauth',
        authHeader: 'Bearer {{amyAccessToken}}'
      }),
      testStatus(403, 'Status is 403 Forbidden')
    ),
    item('POST /api/bookings/{{seedConfirmedBookingId}}/cancel - another user booking (403)',
      req('POST', '/api/bookings/{{seedConfirmedBookingId}}/cancel', {
        auth: 'noauth',
        authHeader: 'Bearer {{amyAccessToken}}'
      }),
      testStatus(403, 'Status is 403 Forbidden')
    ),
    item('Setup: re-login as john (restore accessToken)',
      req('POST', '/api/auth/login', {
        auth: 'noauth',
        body: '{\n  "email": "john.seed@example.com",\n  "password": "{{password}}"\n}'
      }),
      [
        "pm.collectionVariables.set('accessToken', pm.response.json().accessToken);",
        "pm.collectionVariables.set('refreshToken', pm.response.json().refreshToken);"
      ]
    ),
    item('POST /api/bookings/cleanup-expired - USER role forbidden (403)',
      req('POST', '/api/bookings/cleanup-expired', {
        description: 'Manual override only. Production holds are released automatically every 2 minutes by BookingHoldExpiryScheduler.'
      }),
      testStatus(403, 'Status is 403 Forbidden')
    ),
    item('POST /api/bookings/cleanup-expired - ADMIN allowed (manual override)',
      req('POST', '/api/bookings/cleanup-expired', {
        auth: 'noauth',
        authHeader: 'Bearer {{adminAccessToken}}',
        description: 'Admin/partner can force-release expired PENDING holds immediately. Scheduler also runs every bms.booking.hold-expiry-interval-ms (default 120000).'
      }),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "pm.test('Returns count of released holds', function () { pm.expect(pm.response.json()).to.be.a('number'); });"
      ]
    )
  ]),
  folder('Happy path', '', [
    item('POST /api/bookings/book - success (stores bookingId)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "movieId": {{validMovieId}},\n  "seatIds": {{availableSeatIds}}\n}'
      }),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "const json = pm.response.json();",
        "pm.test('Status is PENDING', function () { pm.expect(json.status).to.eql('PENDING'); });",
        "pm.test('totalAmount is positive', function () { pm.expect(json.totalAmount).to.be.above(0); });",
        "pm.test('holdExpiresAt set', function () { pm.expect(json.holdExpiresAt).to.exist; });",
        "pm.collectionVariables.set('bookingId', json.id);"
      ]
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
    item('GET /api/bookings/{{bookingId}}/events - audit log after hold (HELD)',
      req('GET', '/api/bookings/{{bookingId}}/events'),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "const events = pm.response.json();",
        "pm.test('Returns event array', function () { pm.expect(events).to.be.an('array').that.is.not.empty; });",
        "pm.test('Latest event is HELD', function () { pm.expect(events[events.length - 1].eventType).to.eql('HELD'); });",
        "pm.test('Events belong to booking', function () {",
        "    events.forEach(function (e) { pm.expect(e.bookingId).to.eql(Number(pm.collectionVariables.get('bookingId'))); });",
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
    item('GET /api/bookings/{{bookingId}}/events - audit log after confirm (HELD, CONFIRMED)',
      req('GET', '/api/bookings/{{bookingId}}/events'),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "const types = pm.response.json().map(function (e) { return e.eventType; });",
        "pm.test('Contains HELD and CONFIRMED', function () {",
        "    pm.expect(types).to.include('HELD');",
        "    pm.expect(types).to.include('CONFIRMED');",
        "});"
      ]
    ),
    item('GET /api/bookings/{{bookingId}}/ticket - auto-issued after confirm',
      req('GET', '/api/bookings/{{bookingId}}/ticket'),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "const json = pm.response.json();",
        "pm.test('Ticket ISSUED', function () { pm.expect(json.status).to.eql('ISSUED'); });",
        "pm.test('Has booking reference', function () { pm.expect(json.bookingReference).to.match(/^BMS-/); });",
        "pm.collectionVariables.set('ticketBookingReference', json.bookingReference);",
        "pm.collectionVariables.set('ticketQrPayload', json.qrPayload);"
      ]
    ),
    item('Setup: book seats for cancel flow (stores bookingIdCancel)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "movieId": 1,\n  "seatIds": {{theatre2SeatIds}}\n}'
      }),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "pm.collectionVariables.set('bookingIdCancel', pm.response.json().id);"
      ]
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
    item('POST /api/bookings/book - movieId zero (400)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "movieId": 0,\n  "seatIds": {{availableSeatIds}}\n}'
      }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/bookings/book - empty seatIds (400)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "movieId": {{validMovieId}},\n  "seatIds": []\n}'
      }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/bookings/book - missing seatIds field (400)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "movieId": {{validMovieId}}\n}'
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
    item('POST /api/bookings/book - duplicate seat IDs (409)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "movieId": {{validMovieId}},\n  "seatIds": {{duplicateSeatIds}}\n}'
      }),
      testStatus(409, 'Status is 409 Conflict')
    ),
    item('POST /api/bookings/book - seats from different theatres (409)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "movieId": {{validMovieId}},\n  "seatIds": {{mixedTheatreSeatIds}}\n}'
      }),
      testStatus(409, 'Status is 409 Conflict')
    ),
    item('POST /api/bookings/book - movie not running in theatre (409)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "movieId": {{movieNotInTheatre1}},\n  "seatIds": {{availableSeatIds}}\n}'
      }),
      testStatus(409, 'Status is 409 Conflict')
    ),
    item('POST /api/bookings/book - seat already BOOKED (409)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "movieId": {{validMovieId}},\n  "seatIds": {{bookedSeatIds}}\n}'
      }),
      testStatus(409, 'Status is 409 Conflict')
    ),
    item('POST /api/bookings/book - seat BLOCKED (409)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "movieId": {{validMovieId}},\n  "seatIds": {{blockedSeatIds}}\n}'
      }),
      testStatus(409, 'Status is 409 Conflict')
    ),
    item('POST /api/bookings/book - non-existent seat (409)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "movieId": {{validMovieId}},\n  "seatIds": [999999]\n}'
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
        body: '{\n  "movieId": 1,\n  "seatIds": [8]\n}'
      }),
      [
        "pm.collectionVariables.set('bookingIdCancelled', pm.response.json().id);"
      ]
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
          body: '{\n  "showSeatIds": {{availableShowSeatIds}}\n}',
          description: 'Hold seats for a specific showtime. Syncs ShowSeat + theatre Seat status.'
        }),
        [
          "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
          "const json = pm.response.json();",
          "pm.test('Status is PENDING', function () { pm.expect(json.status).to.eql('PENDING'); });",
          "pm.test('Show attached to booking', function () { pm.expect(json.show).to.exist; pm.expect(json.show.id).to.eql(Number(pm.collectionVariables.get('validShowId'))); });",
          "pm.test('holdExpiresAt set', function () { pm.expect(json.holdExpiresAt).to.exist; });",
          "pm.collectionVariables.set('showBookingId', json.id);"
        ]
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
          body: '{\n  "showSeatIds": {{show2AvailableShowSeatIds}}\n}'
        }),
        [
          "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
          "pm.collectionVariables.set('showBookingIdCancel', pm.response.json().id);"
        ]
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
      item('POST /api/bookings/book-show-seats - empty showSeatIds (400)',
        req('POST', '/api/bookings/book-show-seats', {
          body: '{\n  "showSeatIds": []\n}'
        }),
        testStatus(400, 'Status is 400 Bad Request')
      ),
      item('POST /api/bookings/book-show-seats - missing showSeatIds field (400)',
        req('POST', '/api/bookings/book-show-seats', { body: '{}' }),
        testStatus(400, 'Status is 400 Bad Request')
      )
    ]),
    folder('Edge cases - business rules', 'Show-seat conflicts (requires seed data).', [
      item('POST /api/bookings/book-show-seats - duplicate showSeatIds (409)',
        req('POST', '/api/bookings/book-show-seats', {
          body: '{\n  "showSeatIds": {{duplicateShowSeatIds}}\n}'
        }),
        testStatus(409, 'Status is 409 Conflict')
      ),
      item('POST /api/bookings/book-show-seats - showSeats from different shows (409)',
        req('POST', '/api/bookings/book-show-seats', {
          body: '{\n  "showSeatIds": {{mixedShowShowSeatIds}}\n}'
        }),
        testStatus(409, 'Status is 409 Conflict')
      ),
      item('POST /api/bookings/book-show-seats - showSeat BLOCKED in seed (409)',
        req('POST', '/api/bookings/book-show-seats', {
          body: '{\n  "showSeatIds": {{blockedShowSeatIds}}\n}'
        }),
        testStatus(409, 'Status is 409 Conflict')
      ),
      item('POST /api/bookings/book-show-seats - non-existent showSeat (409)',
        req('POST', '/api/bookings/book-show-seats', {
          body: '{\n  "showSeatIds": [999999]\n}'
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

const ticketsFolder = folder('Tickets', 'Order confirmation tickets with QR payload and gate validation. Run Auth (partner login) and Bookings/Payments happy paths first.', [
  folder('Happy path', 'Issue, fetch, and validate tickets after confirmed bookings.', [
    item('GET /api/bookings/{{bookingIdPay}}/ticket - auto-issued after Stripe payment',
      req('GET', '/api/bookings/{{bookingIdPay}}/ticket'),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "const json = pm.response.json();",
        "pm.test('Ticket ISSUED', function () { pm.expect(json.status).to.eql('ISSUED'); });"
      ]
    ),
    item('POST /api/bookings/{{bookingIdPay}}/issue-ticket - idempotent re-issue',
      req('POST', '/api/bookings/{{bookingIdPay}}/issue-ticket'),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "pm.test('Same booking reference', function () {",
        "    pm.expect(pm.response.json().bookingReference).to.eql(pm.collectionVariables.get('ticketBookingReferencePay'));",
        "});"
      ]
    ),
    item('POST /api/tickets/validate - gate scan with qrPayload (PARTNER)',
      req('POST', '/api/tickets/validate', {
        auth: 'noauth',
        authHeader: 'Bearer {{partnerAccessToken}}',
        body: '{\n  "qrPayload": "{{ticketQrPayloadPay}}"\n}',
        description: 'Theatre gate scans QR code. Marks ticket VALIDATED on first successful scan.'
      }),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "const json = pm.response.json();",
        "pm.test('Ticket accepted', function () { pm.expect(json.valid).to.be.true; pm.expect(json.status).to.eql('VALIDATED'); });"
      ]
    ),
    item('POST /api/tickets/validate - duplicate scan (already used)',
      req('POST', '/api/tickets/validate', {
        auth: 'noauth',
        authHeader: 'Bearer {{partnerAccessToken}}',
        body: '{\n  "qrPayload": "{{ticketQrPayloadPay}}"\n}'
      }),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "const json = pm.response.json();",
        "pm.test('Already used', function () { pm.expect(json.valid).to.be.false; pm.expect(json.message).to.include('already used'); });"
      ]
    ),
    item('POST /api/tickets/validate - gate scan with bookingReference (ADMIN)',
      req('POST', '/api/tickets/validate', {
        auth: 'noauth',
        authHeader: 'Bearer {{adminAccessToken}}',
        body: '{\n  "bookingReference": "{{ticketBookingReference}}"\n}',
        description: 'Alternative lookup by human-readable BMS- reference from confirm flow.'
      }),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "pm.test('Ticket accepted', function () { pm.expect(pm.response.json().valid).to.be.true; });"
      ]
    )
  ]),
  folder('Edge cases - validation', 'Malformed ticket validation requests.', [
    item('POST /api/tickets/validate - null body (400)',
      req('POST', '/api/tickets/validate', {
        auth: 'noauth',
        authHeader: 'Bearer {{partnerAccessToken}}'
      }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/tickets/validate - empty body (400)',
      req('POST', '/api/tickets/validate', {
        auth: 'noauth',
        authHeader: 'Bearer {{partnerAccessToken}}',
        body: '{}'
      }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/tickets/validate - USER role forbidden (403)',
      req('POST', '/api/tickets/validate', {
        body: '{\n  "bookingReference": "BMS-NOTREAL"\n}'
      }),
      testStatus(403, 'Status is 403 Forbidden')
    )
  ]),
  folder('Edge cases - business rules', 'Ticket lifecycle and not-found scenarios.', [
    item('GET /api/bookings/{{bookingIdCancel}}/ticket - no ticket for cancelled booking (404)',
      req('GET', '/api/bookings/{{bookingIdCancel}}/ticket'),
      testStatus(404, 'Status is 404 Not Found')
    ),
    item('Setup: book show seat for pending ticket test',
      req('POST', '/api/bookings/book-show-seats', {
        body: '{\n  "showSeatIds": [1]\n}',
        description: 'Show 1 seat 1 is AVAILABLE in seed; keeps booking PENDING for issue-ticket rejection test.'
      }),
      [
        "pm.collectionVariables.set('ticketPendingBookingId', pm.response.json().id);"
      ]
    ),
    item('POST /api/bookings/{{ticketPendingBookingId}}/issue-ticket - PENDING booking (409)',
      req('POST', '/api/bookings/{{ticketPendingBookingId}}/issue-ticket'),
      testStatus(409, 'Status is 409 Conflict')
    ),
    item('POST /api/tickets/validate - unknown booking reference (404)',
      req('POST', '/api/tickets/validate', {
        auth: 'noauth',
        authHeader: 'Bearer {{partnerAccessToken}}',
        body: '{\n  "bookingReference": "BMS-XXXXXX"\n}'
      }),
      testStatus(404, 'Status is 404 Not Found')
    ),
    item('GET /api/bookings/0/ticket (400)',
      req('GET', '/api/bookings/0/ticket'),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('POST /api/bookings/0/issue-ticket (400)',
      req('POST', '/api/bookings/0/issue-ticket'),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('GET /api/bookings/999999/ticket (404)',
      req('GET', '/api/bookings/999999/ticket'),
      testStatus(404, 'Status is 404 Not Found')
    ),
    item('Setup: confirm show booking for revoke test',
      req('POST', '/api/bookings/{{ticketPendingBookingId}}/confirm'),
      testStatus(200, 'Status is 200 OK')
    ),
    item('GET /api/bookings/{{ticketPendingBookingId}}/ticket - stores revoke test ref',
      req('GET', '/api/bookings/{{ticketPendingBookingId}}/ticket'),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "pm.collectionVariables.set('ticketRevokeReference', pm.response.json().bookingReference);"
      ]
    ),
    item('POST /api/bookings/{{ticketPendingBookingId}}/cancel - revokes ticket',
      req('POST', '/api/bookings/{{ticketPendingBookingId}}/cancel'),
      testStatus(200, 'Status is 200 OK')
    ),
    item('POST /api/tickets/validate - revoked ticket (409)',
      req('POST', '/api/tickets/validate', {
        auth: 'noauth',
        authHeader: 'Bearer {{partnerAccessToken}}',
        body: '{\n  "bookingReference": "{{ticketRevokeReference}}"\n}'
      }),
      testStatus(409, 'Status is 409 Conflict')
    )
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
        body: '{\n  "movieId": 1,\n  "seatIds": [6]\n}'
      }),
      [
        "pm.collectionVariables.set('bookingIdDupPay', pm.response.json().id);"
      ]
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
        body: '{\n  "movieId": 1,\n  "seatIds": [7]\n}'
      }),
      [
        "pm.collectionVariables.set('bookingIdFail', pm.response.json().id);"
      ]
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
        body: '{\n  "movieId": 1,\n  "seatIds": [7]\n}'
      }),
      [
        "pm.collectionVariables.set('bookingIdStripeFail', pm.response.json().id);"
      ]
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
        body: '{\n  "movieId": 1,\n  "seatIds": [8]\n}'
      }),
      [
        "pm.collectionVariables.set('bookingIdBadSig', pm.response.json().id);"
      ]
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
        body: '{\n  "movieId": 1,\n  "seatIds": [9]\n}'
      }),
      [
        "pm.collectionVariables.set('bookingIdRzpBadSig', pm.response.json().id);"
      ]
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
  folder('Webhooks (server-to-server)', 'Gateway webhooks — no JWT. Uses Stripe-Signature / X-Razorpay-Signature headers. Run after Edge cases business rules.', [
    folder('Edge cases', 'Invalid webhook signatures (public endpoints).', [
      item('POST /api/payments/webhooks/stripe - invalid signature (401)',
        req('POST', '/api/payments/webhooks/stripe', {
          auth: 'noauth',
          headers: [{ key: 'Stripe-Signature', value: 'invalid_not_whsec_prefix' }],
          body: '{\n  "id": "evt_mock_stripe_bad_sig",\n  "type": "payment_intent.succeeded",\n  "data": {\n    "object": {\n      "id": "pi_mock_invalid",\n      "status": "succeeded"\n    }\n  }\n}'
        }),
        testStatus(401, 'Status is 401 Unauthorized')
      ),
      item('POST /api/payments/webhooks/razorpay - invalid signature (401)',
        req('POST', '/api/payments/webhooks/razorpay', {
          auth: 'noauth',
          headers: [
            { key: 'X-Razorpay-Signature', value: 'invalid_not_rzp_sig_prefix' },
            { key: 'X-Razorpay-Event-Id', value: 'evt_mock_rzp_bad_sig' }
          ],
          body: '{\n  "event": "payment.captured",\n  "payload": {\n    "payment": {\n      "entity": {\n        "id": "pay_mock_bad",\n        "order_id": "order_mock_bad",\n        "status": "captured"\n      }\n    }\n  }\n}'
        }),
        testStatus(401, 'Status is 401 Unauthorized')
      ),
      item('POST /api/payments/webhooks/stripe - empty body (400)',
        req('POST', '/api/payments/webhooks/stripe', {
          auth: 'noauth',
          headers: [{ key: 'Stripe-Signature', value: '{{stripeMockSignature}}' }],
          body: ''
        }),
        testStatus(400, 'Status is 400 Bad Request')
      )
    ]),
    folder('Happy path', 'Confirm/cancel bookings via provider webhooks (idempotent retries).', [
      item('Setup: book seat 6 for Stripe webhook (stores bookingIdWebhookStripe)',
        req('POST', '/api/bookings/book', {
          body: '{\n  "movieId": 1,\n  "seatIds": [6]\n}'
        }),
        [
          "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
          "pm.collectionVariables.set('bookingIdWebhookStripe', pm.response.json().id);"
        ]
      ),
      item('POST /api/payments/initiate - Stripe for webhook (stores paymentIdWebhookStripe)',
        req('POST', '/api/payments/initiate', {
          body: '{\n  "bookingId": {{bookingIdWebhookStripe}},\n  "provider": "STRIPE"\n}'
        }),
        [
          "pm.test('Status is 201 Created', function () { pm.response.to.have.status(201); });",
          "const json = pm.response.json();",
          "pm.collectionVariables.set('paymentIdWebhookStripe', json.paymentId);",
          "pm.collectionVariables.set('gatewayOrderIdWebhookStripe', json.gatewayOrderId);",
          "pm.collectionVariables.set('stripeWebhookEventId', 'evt_mock_stripe_webhook_001');"
        ]
      ),
      item('POST /api/payments/webhooks/stripe - payment_intent.succeeded',
        req('POST', '/api/payments/webhooks/stripe', {
          auth: 'noauth',
          headers: [{ key: 'Stripe-Signature', value: '{{stripeMockSignature}}' }],
          body: '{\n  "id": "{{stripeWebhookEventId}}",\n  "type": "payment_intent.succeeded",\n  "data": {\n    "object": {\n      "id": "{{gatewayOrderIdWebhookStripe}}",\n      "status": "succeeded"\n    }\n  }\n}'
        }),
        [
          "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
          "const json = pm.response.json();",
          "pm.test('Outcome PROCESSED', function () { pm.expect(json.outcome).to.eql('PROCESSED'); });",
          "pm.test('Payment SUCCESS', function () { pm.expect(json.paymentStatus).to.eql('SUCCESS'); });",
          "pm.test('Booking CONFIRMED', function () { pm.expect(json.bookingStatus).to.eql('CONFIRMED'); });"
        ]
      ),
      item('POST /api/payments/webhooks/stripe - idempotent retry (ALREADY_PROCESSED)',
        req('POST', '/api/payments/webhooks/stripe', {
          auth: 'noauth',
          headers: [{ key: 'Stripe-Signature', value: '{{stripeMockSignature}}' }],
          body: '{\n  "id": "{{stripeWebhookEventId}}",\n  "type": "payment_intent.succeeded",\n  "data": {\n    "object": {\n      "id": "{{gatewayOrderIdWebhookStripe}}",\n      "status": "succeeded"\n    }\n  }\n}'
        }),
        [
          "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
          "pm.test('Outcome ALREADY_PROCESSED', function () { pm.expect(pm.response.json().outcome).to.eql('ALREADY_PROCESSED'); });"
        ]
      ),
      item('Setup: book seat 7 for Razorpay webhook failure',
        req('POST', '/api/bookings/book', {
          body: '{\n  "movieId": 1,\n  "seatIds": [7]\n}'
        }),
        [
          "pm.collectionVariables.set('bookingIdWebhookRzpFail', pm.response.json().id);"
        ]
      ),
      item('POST /api/payments/initiate - Razorpay for webhook failure',
        req('POST', '/api/payments/initiate', {
          body: '{\n  "bookingId": {{bookingIdWebhookRzpFail}},\n  "provider": "RAZORPAY"\n}'
        }),
        [
          "pm.test('Status is 201 Created', function () { pm.response.to.have.status(201); });",
          "const json = pm.response.json();",
          "pm.collectionVariables.set('paymentIdWebhookRzpFail', json.paymentId);",
          "pm.collectionVariables.set('gatewayOrderIdWebhookRzpFail', json.gatewayOrderId);",
          "pm.collectionVariables.set('razorpayWebhookEventIdFail', 'evt_mock_rzp_webhook_fail_001');"
        ]
      ),
      item('POST /api/payments/webhooks/razorpay - payment.failed',
        req('POST', '/api/payments/webhooks/razorpay', {
          auth: 'noauth',
          headers: [
            { key: 'X-Razorpay-Signature', value: '{{razorpayMockSignature}}' },
            { key: 'X-Razorpay-Event-Id', value: '{{razorpayWebhookEventIdFail}}' }
          ],
          body: '{\n  "event": "payment.failed",\n  "payload": {\n    "payment": {\n      "entity": {\n        "id": "pay_rzp_webhook_fail",\n        "order_id": "{{gatewayOrderIdWebhookRzpFail}}",\n        "status": "failed",\n        "error_description": "Payment failed at gateway"\n      }\n    }\n  }\n}'
        }),
        [
          "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
          "const json = pm.response.json();",
          "pm.test('Outcome PROCESSED', function () { pm.expect(json.outcome).to.eql('PROCESSED'); });",
          "pm.test('Payment FAILED', function () { pm.expect(json.paymentStatus).to.eql('FAILED'); });",
          "pm.test('Booking CANCELLED', function () { pm.expect(json.bookingStatus).to.eql('CANCELLED'); });"
        ]
      )
    ])
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
        body: '{\n  "movieId": 1,\n  "seatIds": [8, 9]\n}'
      }),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "const json = pm.response.json();",
        "pm.test('PENDING', function () { pm.expect(json.status).to.eql('PENDING'); });",
        "pm.collectionVariables.set('bookingIdPay', json.id);"
      ]
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
        "pm.test('Booking CONFIRMED', function () { pm.expect(json.bookingStatus).to.eql('CONFIRMED'); });",
        "pm.test('Ticket summary included', function () {",
        "    pm.expect(json.ticket).to.exist;",
        "    pm.expect(json.ticket.bookingReference).to.match(/^BMS-/);",
        "    pm.expect(json.ticket.qrPayload).to.be.a('string').and.not.empty;",
        "    pm.expect(json.ticket.status).to.eql('ISSUED');",
        "    pm.collectionVariables.set('ticketQrPayloadPay', json.ticket.qrPayload);",
        "    pm.collectionVariables.set('ticketBookingReferencePay', json.ticket.bookingReference);",
        "});"
      ]
    ),
    item('GET /api/payments/{{paymentId}} - fetch payment',
      req('GET', '/api/payments/{{paymentId}}'),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "pm.test('Payment SUCCESS', function () { pm.expect(pm.response.json().status).to.eql('SUCCESS'); });",
        "pm.test('Ticket summary on GET payment', function () {",
        "    const t = pm.response.json().ticket;",
        "    pm.expect(t).to.exist;",
        "    pm.expect(t.bookingReference).to.eql(pm.collectionVariables.get('ticketBookingReferencePay'));",
        "});"
      ]
    ),
    item('Setup: book seats for Razorpay (stores bookingIdRzp)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "movieId": 1,\n  "seatIds": [6, 7]\n}'
      }),
      [
        "pm.collectionVariables.set('bookingIdRzp', pm.response.json().id);"
      ]
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

const refundsFolder = folder('Refunds', 'Cancellation policy engine — POST /api/bookings/{id}/refund applies time-based refund rules and cancels the booking. Run Auth login first.', [
  folder('Happy path', 'Full refund (theatre booking, no show) and policy-based partial refund (show booking).', [
    item('Setup: book theatre seats for full refund (stores refundBookingId)',
      req('POST', '/api/bookings/book', {
        body: '{\n  "movieId": 1,\n  "seatIds": [1]\n}'
      }),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "pm.collectionVariables.set('refundBookingId', pm.response.json().id);"
      ]
    ),
    item('POST /api/payments/initiate - refund flow (stores refundPaymentId)',
      req('POST', '/api/payments/initiate', {
        body: '{\n  "bookingId": {{refundBookingId}},\n  "provider": "STRIPE"\n}'
      }),
      [
        "pm.test('Status is 201 Created', function () { pm.response.to.have.status(201); });",
        "pm.collectionVariables.set('refundPaymentId', pm.response.json().paymentId);"
      ]
    ),
    item('POST /api/payments/callback - confirm payment for refund test',
      req('POST', '/api/payments/callback', {
        body: '{\n  "paymentId": {{refundPaymentId}},\n  "paymentReference": "pay_refund_full",\n  "signature": "{{stripeMockSignature}}",\n  "success": true\n}'
      }),
      [
        "pm.test('Payment SUCCESS', function () { pm.expect(pm.response.json().status).to.eql('SUCCESS'); });",
        "pm.test('Booking CONFIRMED', function () { pm.expect(pm.response.json().bookingStatus).to.eql('CONFIRMED'); });"
      ]
    ),
    item('POST /api/bookings/{{refundBookingId}}/refund - full refund (100%, no show)',
      req('POST', '/api/bookings/{{refundBookingId}}/refund', {
        body: '{\n  "reason": "Change of plans"\n}'
      }),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "const json = pm.response.json();",
        "pm.test('Refund SUCCESS', function () { pm.expect(json.status).to.eql('SUCCESS'); });",
        "pm.test('100% refund for non-show booking', function () { pm.expect(json.refundPercentage).to.eql(100); });",
        "pm.test('Booking CANCELLED', function () { pm.expect(json.bookingStatus).to.eql('CANCELLED'); });",
        "pm.test('Gateway refund id present', function () { pm.expect(json.gatewayRefundId).to.be.a('string').that.is.not.empty; });",
        "pm.collectionVariables.set('refundId', json.refundId);"
      ]
    ),
    item('GET /api/refunds/{{refundId}} - fetch refund details',
      req('GET', '/api/refunds/{{refundId}}'),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "pm.test('Matches stored refundId', function () {",
        "    pm.expect(pm.response.json().refundId).to.eql(Number(pm.collectionVariables.get('refundId')));",
        "});",
        "pm.test('Refund SUCCESS', function () { pm.expect(pm.response.json().status).to.eql('SUCCESS'); });"
      ]
    ),
    item('Setup: book show seats for partial refund (show 3, 30h → 50%)',
      req('POST', '/api/bookings/book-show-seats', {
        body: '{\n  "showSeatIds": [5, 6]\n}'
      }),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "pm.collectionVariables.set('refundShowBookingId', pm.response.json().id);"
      ]
    ),
    item('POST /api/payments/initiate - partial refund flow',
      req('POST', '/api/payments/initiate', {
        body: '{\n  "bookingId": {{refundShowBookingId}},\n  "provider": "STRIPE"\n}'
      }),
      [
        "pm.collectionVariables.set('refundShowPaymentId', pm.response.json().paymentId);"
      ]
    ),
    item('POST /api/payments/callback - confirm show booking payment',
      req('POST', '/api/payments/callback', {
        body: '{\n  "paymentId": {{refundShowPaymentId}},\n  "paymentReference": "pay_refund_partial",\n  "signature": "{{stripeMockSignature}}",\n  "success": true\n}'
      }),
      testStatus(200, 'Status is 200 OK')
    ),
    item('GET /api/bookings/{{refundShowBookingId}}/refund-preview - 50% preview (no mutation)',
      req('GET', '/api/bookings/{{refundShowBookingId}}/refund-preview', {
        description: 'Read-only preview of the refund policy outcome before cancelling. Powers the web UI "Cancel & refund" confirmation.'
      }),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "const json = pm.response.json();",
        "pm.test('Eligible for refund', function () { pm.expect(json.eligible).to.be.true; });",
        "pm.test('50% policy previewed', function () { pm.expect(json.refundPercentage).to.eql(50); });",
        "pm.test('Refund amount and paid amount present', function () {",
        "    pm.expect(json.refundAmount).to.be.above(0);",
        "    pm.expect(json.paidAmount).to.be.above(0);",
        "});"
      ]
    ),
    item('POST /api/bookings/{{refundShowBookingId}}/refund - 50% partial refund',
      req('POST', '/api/bookings/{{refundShowBookingId}}/refund', {
        body: '{\n  "reason": "Schedule conflict"\n}'
      }),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "const json = pm.response.json();",
        "pm.test('Refund SUCCESS', function () { pm.expect(json.status).to.eql('SUCCESS'); });",
        "pm.test('50% policy applied', function () { pm.expect(json.refundPercentage).to.eql(50); });",
        "pm.test('Partial amount refunded', function () { pm.expect(json.amount).to.be.above(0); });"
      ]
    )
  ]),
  folder('Edge cases', 'Validation, policy limits, and authorization.', [
    item('POST /api/bookings/0/refund (400)',
      req('POST', '/api/bookings/0/refund', { body: '{}' }),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('GET /api/refunds/0 (400)',
      req('GET', '/api/refunds/0'),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('GET /api/refunds/999999 (404)',
      req('GET', '/api/refunds/999999'),
      testStatus(404, 'Status is 404 Not Found')
    ),
    item('Setup: book PENDING booking for refund rejection',
      req('POST', '/api/bookings/book', {
        body: '{\n  "movieId": 1,\n  "seatIds": [2]\n}'
      }),
      [
        "pm.collectionVariables.set('refundPendingBookingId', pm.response.json().id);"
      ]
    ),
    item('POST /api/bookings/{{refundPendingBookingId}}/refund - PENDING booking (409)',
      req('POST', '/api/bookings/{{refundPendingBookingId}}/refund', { body: '{}' }),
      testStatus(409, 'Status is 409 Conflict')
    ),
    item('GET /api/bookings/{{refundPendingBookingId}}/refund-preview - PENDING not eligible (200)',
      req('GET', '/api/bookings/{{refundPendingBookingId}}/refund-preview'),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "const json = pm.response.json();",
        "pm.test('Not eligible with reason', function () {",
        "    pm.expect(json.eligible).to.be.false;",
        "    pm.expect(json.reason).to.be.a('string').and.not.empty;",
        "});"
      ]
    ),
    item('GET /api/bookings/0/refund-preview (400)',
      req('GET', '/api/bookings/0/refund-preview'),
      testStatus(400, 'Status is 400 Bad Request')
    ),
    item('GET /api/bookings/999999/refund-preview (404)',
      req('GET', '/api/bookings/999999/refund-preview'),
      testStatus(404, 'Status is 404 Not Found')
    ),
    item('Setup: book show 1 (2h, 0% policy) for no-refund cancel',
      req('POST', '/api/bookings/book-show-seats', {
        body: '{\n  "showSeatIds": [1, 2]\n}'
      }),
      [
        "pm.collectionVariables.set('refundNoMoneyBookingId', pm.response.json().id);"
      ]
    ),
    item('POST /api/payments/initiate - no-refund show booking',
      req('POST', '/api/payments/initiate', {
        body: '{\n  "bookingId": {{refundNoMoneyBookingId}},\n  "provider": "STRIPE"\n}'
      }),
      [
        "pm.collectionVariables.set('refundNoMoneyPaymentId', pm.response.json().paymentId);"
      ]
    ),
    item('POST /api/payments/callback - confirm no-refund show booking',
      req('POST', '/api/payments/callback', {
        body: '{\n  "paymentId": {{refundNoMoneyPaymentId}},\n  "paymentReference": "pay_refund_none",\n  "signature": "{{stripeMockSignature}}",\n  "success": true\n}'
      }),
      testStatus(200, 'Status is 200 OK')
    ),
    item('POST /api/bookings/{{refundNoMoneyBookingId}}/refund - 0% policy (SKIPPED)',
      req('POST', '/api/bookings/{{refundNoMoneyBookingId}}/refund', {
        body: '{\n  "reason": "Late cancellation"\n}'
      }),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "const json = pm.response.json();",
        "pm.test('Refund SKIPPED (0%)', function () { pm.expect(json.status).to.eql('SKIPPED'); });",
        "pm.test('Zero refund amount', function () { pm.expect(json.amount).to.eql(0); });",
        "pm.test('Booking still cancelled', function () { pm.expect(json.bookingStatus).to.eql('CANCELLED'); });"
      ]
    ),
    item('POST /api/bookings/{{refundBookingId}}/refund - idempotent (already refunded)',
      req('POST', '/api/bookings/{{refundBookingId}}/refund', { body: '{}' }),
      [
        "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
        "pm.test('Returns same refund', function () {",
        "    pm.expect(pm.response.json().refundId).to.eql(Number(pm.collectionVariables.get('refundId')));",
        "});"
      ]
    ),
    item('POST /api/bookings/{{refundBookingId}}/refund - another user (403)',
      req('POST', '/api/bookings/{{refundBookingId}}/refund', {
        auth: 'noauth',
        authHeader: 'Bearer {{amyAccessToken}}',
        body: '{}'
      }),
      testStatus(403, 'Status is 403 Forbidden')
    ),
    item('GET /api/refunds/{{refundId}} - missing token (401)',
      req('GET', '/api/refunds/{{refundId}}', { auth: 'noauth' }),
      testStatus(401, 'Status is 401 Unauthorized')
    )
  ])
]);

const securityFolder = folder('Security Edge Cases', 'Protected endpoints must reject missing, malformed, or wrong-type JWT.', [
  item('POST /api/bookings/book-show-seats - missing token (401)',
    req('POST', '/api/bookings/book-show-seats', {
      auth: 'noauth',
      body: '{\n  "showSeatIds": [1]\n}'
    }),
    testStatus(401, 'Status is 401 Unauthorized')
  ),
  item('POST /api/bookings/book - missing token (401)',
    req('POST', '/api/bookings/book', {
      auth: 'noauth',
      body: '{\n  "movieId": 1,\n  "seatIds": [1]\n}'
    }),
    testStatus(401, 'Status is 401 Unauthorized')
  ),
  item('POST /api/bookings/book - invalid token (401)',
    req('POST', '/api/bookings/book', {
      auth: 'noauth',
      body: '{\n  "movieId": 1,\n  "seatIds": [1]\n}',
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
    req('POST', '/api/bookings/cleanup-expired', {
      auth: 'noauth',
      description: 'Manual hold cleanup requires ADMIN/PARTNER JWT. Automated scheduler does not use this endpoint.'
    }),
    testStatus(401, 'Status is 401 Unauthorized')
  ),
  item('GET /api/bookings/1/events - missing token (401)',
    req('GET', '/api/bookings/1/events', { auth: 'noauth' }),
    testStatus(401, 'Status is 401 Unauthorized')
  ),
  item('GET /api/users/me/bookings - missing token (401)',
    req('GET', '/api/users/me/bookings', { auth: 'noauth' }),
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
  ),
  item('GET /api/bookings/1/refund-preview - missing token (401)',
    req('GET', '/api/bookings/1/refund-preview', { auth: 'noauth' }),
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
7. Payments → Edge cases validation → Edge cases business rules → Webhooks (server-to-server) → Happy path (run in this order; seats 6–9 used in business rules and webhooks first)
8. Refunds → Happy path → Edge cases (policy-based refunds; run after Auth login; uses seats 1-2 and show seats 1-2, 5-6)
9. Tickets → Edge cases validation → Edge cases business rules → Happy path (requires Payments happy path for auto-issued ticket)
10. Security Edge Cases

**Prerequisites:** MySQL — run \`db/seed_bmsdec24.sql\` after first start. H2 profile — demo data loads automatically.

**Real-time shows (H2 seed):**
- Each theatre has a full 5-row seat map (rows A-E, 8 seats each = 40 seats; types A/D GOLD, B/E SILVER, C PLATINUM). Pinned show seats below are unchanged.
- Show 1 @ Orion — Action Blast — showSeats 1-2 AVAILABLE
- Show 2 @ Orion — RomCom — showSeat 3 AVAILABLE, 4 BLOCKED
- Show 3 @ Phoenix — Action Blast — showSeats 5-6 AVAILABLE
- Poll: \`GET /api/shows/{showId}/availability?changedAfterEpochMs={serverTime}\`
- **SSE (v3):** \`GET /api/shows/{showId}/availability/stream\` — live push via Server-Sent Events

**Payments (mock — \`bms.payment.mock-enabled=true\`):**
- Client callback success: \`signature\` starts with \`whsec_\` (Stripe) or \`rzp_sig_\` (Razorpay)
- Server webhooks (no JWT): \`POST /api/payments/webhooks/stripe\` with \`Stripe-Signature\` header; \`POST /api/payments/webhooks/razorpay\` with \`X-Razorpay-Signature\` + \`X-Razorpay-Event-Id\`. Same mock signature prefixes. Retries are idempotent via \`gatewayEventId\`.

**Auth & ownership:** userId is taken from JWT on book endpoints (do not send userId in body). Booking 1 belongs to john (USER). admin.seed@example.com (ADMIN) and partner.seed@example.com (PARTNER) can access any booking. cleanup-expired requires ADMIN or PARTNER (manual override; production uses automated scheduler).

**Hold expiry (automated):** BookingHoldExpiryScheduler runs every \`bms.booking.hold-expiry-interval-ms\` (default 120000 = 2 min). It releases PENDING bookings past \`holdExpiresAt\`, syncs Seat + ShowSeat to AVAILABLE, and records BookingEvent EXPIRED. Audit trail: \`GET /api/bookings/{bookingId}/events\` (HELD, EXPIRED, CONFIRMED, CANCELLED).

**Refunds & cancellation policy:**
- Policies (hours before show → refund %): 48h→100%, 24h→50%, 12h→25%, <12h→0%
- \`POST /api/bookings/{id}/refund\` — evaluates policy, processes gateway refund, cancels booking
- \`GET /api/refunds/{id}\` — refund details (owner, ADMIN, or PARTNER)
- Bookings without a show default to 100% refund

**Seed reference:** Movies 1-3 NOW_SHOWING with rich catalog fields; movies 4-5 COMING_SOON (Galactic Dawn, Monsoon Letters). Theatre 1 movies 1,2 — seats 1-2 AVAILABLE, 3-4 BOOKED, 5 BLOCKED. Theatre 2 movies 1,3 — seats 6-9 AVAILABLE. Show 3 @ Phoenix starts in ~30h (50% refund). Show 1 @ Orion starts in ~2h (0% refund). Seed users: john.seed@example.com / Password@123 (USER), admin.seed@example.com (ADMIN)`,
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
    refundsFolder,
    ticketsFolder,
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
    { key: 'adminEmail', value: 'admin.seed@example.com', type: 'string' },
    { key: 'adminAccessToken', value: '', type: 'string' },
    { key: 'partnerEmail', value: 'partner.seed@example.com', type: 'string' },
    { key: 'partnerAccessToken', value: '', type: 'string' },
    { key: 'amyAccessToken', value: '', type: 'string' },
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
    { key: 'gatewayOrderIdRazorpay', value: '', type: 'string' },
    { key: 'bookingIdWebhookStripe', value: '', type: 'string' },
    { key: 'paymentIdWebhookStripe', value: '', type: 'string' },
    { key: 'gatewayOrderIdWebhookStripe', value: '', type: 'string' },
    { key: 'stripeWebhookEventId', value: 'evt_mock_stripe_webhook_001', type: 'string' },
    { key: 'bookingIdWebhookRzpFail', value: '', type: 'string' },
    { key: 'paymentIdWebhookRzpFail', value: '', type: 'string' },
    { key: 'gatewayOrderIdWebhookRzpFail', value: '', type: 'string' },
    { key: 'razorpayWebhookEventIdFail', value: 'evt_mock_rzp_webhook_fail_001', type: 'string' },
    { key: 'ticketBookingReference', value: '', type: 'string' },
    { key: 'ticketQrPayload', value: '', type: 'string' },
    { key: 'ticketQrPayloadPay', value: '', type: 'string' },
    { key: 'ticketBookingReferencePay', value: '', type: 'string' },
    { key: 'ticketPendingBookingId', value: '', type: 'string' },
    { key: 'ticketRevokeReference', value: '', type: 'string' },
    { key: 'refundBookingId', value: '', type: 'string' },
    { key: 'refundPaymentId', value: '', type: 'string' },
    { key: 'refundId', value: '', type: 'string' },
    { key: 'refundShowBookingId', value: '', type: 'string' },
    { key: 'refundShowPaymentId', value: '', type: 'string' },
    { key: 'refundPendingBookingId', value: '', type: 'string' },
    { key: 'refundNoMoneyBookingId', value: '', type: 'string' },
    { key: 'refundNoMoneyPaymentId', value: '', type: 'string' }
  ]
};

function countItems(items) {
  return items.reduce((n, f) => n + (f.item ? countItems(f.item) : 1), 0);
}

function countFolders(items) {
  return items.reduce((n, f) => n + 1 + (f.item ? countFolders(f.item) : 0), 0);
}

const path = require('path');
const outDir = path.join(__dirname);
const rootDir = path.join(__dirname, '..');
const json = JSON.stringify(collection, null, 2) + '\n';
fs.writeFileSync(path.join(outDir, 'BMSDec24-API.postman_collection.json'), json);
fs.writeFileSync(path.join(rootDir, 'BMSDec24-API.postman_collection.json'), json);
console.log('Generated', countItems(collection.item), 'requests across', countFolders(collection.item), 'folders');
