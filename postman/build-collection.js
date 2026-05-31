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
      path: path.replace(/^\//, '').split('/')
    },
    description: opts.description || ''
  };
  if (opts.auth === 'noauth') r.auth = { type: 'noauth' };
  if (opts.body) {
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

const prerequestBookingUser = [
  "const u = pm.collectionVariables.get('signedUpUserId') || pm.collectionVariables.get('validUserId');",
  "pm.variables.set('bookingUserId', u);"
];

const collection = {
  info: {
    name: 'BMSDec24 API - Full Scenarios',
    _postman_id: 'c5b7f498-52ab-4b85-a5bc-b2f42ce6f5f2',
    description: `End-to-end scenarios for the simplified BMS API (City → Theatre → Seat, movies in theatres).

**Runner order (recommended):**
1. Health
2. Users → Signup success → Signup duplicate
3. Auth → Login success (stores accessToken) → Auth edge cases
4. Bookings → negative cases (use seed data) → Book success → Confirm/Cancel edges
5. Payments → List providers → Stripe mock happy path → Razorpay mock happy path → Razorpay failure → Signature edge cases → Payment edges
6. Security Edge Cases

**Prerequisites:** Run db/seed_bmsdec24.sql after starting the app once (Hibernate creates tables).

**Payments (mock mode — default \`bms.payment.mock-enabled=true\`):** No Stripe/Razorpay API keys required. Mock adapters return fake order/intent ids. Use these callback signatures:
- **Stripe success:** \`signature\` must start with \`whsec_\` (e.g. \`whsec_postman_mock\`)
- **Razorpay success:** \`signature\` must start with \`rzp_sig_\` (e.g. \`rzp_sig_postman_mock\`)
- **Invalid signature:** any other non-empty value (see bad-signature requests)

Initiate responses store \`gatewayOrderId\`, \`clientSecret\`, and \`publishableKey\` (Stripe) for checkout simulation. Set \`bms.payment.mock-enabled=false\` and real keys in application.properties for live SDK calls.

**Seed reference:** Theatre 1 (Orion PVR) movies 1,2 — seats 1-2 AVAILABLE, 3-4 BOOKED, 5 BLOCKED. Theatre 2 (PVR Phoenix) movies 1,3 — seats 6-9 AVAILABLE.`,
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  auth: {
    type: 'bearer',
    bearer: [{ key: 'token', value: '{{accessToken}}', type: 'string' }]
  },
  item: [
    {
      name: 'Health',
      item: [
        item('GET /api/health - should return OK',
          req('GET', '/api/health', { auth: 'noauth' }),
          testStatus(200, 'Status is 200').concat(["pm.test('Body is OK', function () { pm.expect(pm.response.text()).to.eql('OK'); });"])
        )
      ]
    },
    {
      name: 'Users',
      item: [
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
          [
            "const s = Date.now() + '_' + Math.floor(Math.random() * 10000);",
            "const email = 'bms_' + s + '@example.com';",
            "pm.collectionVariables.set('existingEmail', email);",
            "pm.collectionVariables.set('loginEmail', email);",
            "pm.collectionVariables.set('loginPassword', pm.collectionVariables.get('password'));",
            "pm.variables.set('signupEmail', email);"
          ]
        ),
        item('POST /api/users/signup - duplicate email (409)',
          req('POST', '/api/users/signup', {
            auth: 'noauth',
            body: '{\n  "name": "Duplicate User",\n  "email": "{{existingEmail}}",\n  "password": "{{password}}"\n}'
          }),
          [
            "pm.test('Status is 409 Conflict', function () { pm.response.to.have.status(409); });",
            "pm.test('Response status is FAILURE', function () { pm.expect(pm.response.json().responseStatus).to.eql('FAILURE'); });"
          ]
        )
      ]
    },
    {
      name: 'Auth',
      description: 'JWT login, refresh, and /me. Run Login success before protected folders.',
      item: [
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
        item('POST /api/auth/login - wrong password (401)',
          req('POST', '/api/auth/login', { auth: 'noauth', body: '{\n  "email": "{{loginEmail}}",\n  "password": "wrong-password"\n}' }),
          testStatus(401, 'Status is 401 Unauthorized')
        ),
        item('POST /api/auth/login - unknown email (401)',
          req('POST', '/api/auth/login', { auth: 'noauth', body: '{\n  "email": "nobody@example.com",\n  "password": "{{loginPassword}}"\n}' }),
          testStatus(401, 'Status is 401 Unauthorized')
        ),
        item('POST /api/auth/login - missing password (4xx)',
          req('POST', '/api/auth/login', { auth: 'noauth', body: '{\n  "email": "{{loginEmail}}"\n}' }),
          testStatusOneOf([400, 401], 'Status is client error')
        ),
        item('POST /api/auth/login - missing email (4xx)',
          req('POST', '/api/auth/login', { auth: 'noauth', body: '{\n  "password": "{{loginPassword}}"\n}' }),
          testStatusOneOf([400, 401], 'Status is client error')
        ),
        item('POST /api/auth/login - empty body (4xx)',
          req('POST', '/api/auth/login', { auth: 'noauth', body: '{}' }),
          testStatusOneOf([400, 401], 'Status is client error')
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
        item('POST /api/auth/refresh - access token as refresh (401)',
          req('POST', '/api/auth/refresh', { auth: 'noauth', body: '{\n  "refreshToken": "{{accessToken}}"\n}' }),
          testStatus(401, 'Status is 401 Unauthorized')
        ),
        item('POST /api/auth/refresh - invalid token (401)',
          req('POST', '/api/auth/refresh', { auth: 'noauth', body: '{\n  "refreshToken": "not.a.jwt"\n}' }),
          testStatus(401, 'Status is 401 Unauthorized')
        ),
        item('POST /api/auth/refresh - missing token (4xx)',
          req('POST', '/api/auth/refresh', { auth: 'noauth', body: '{}' }),
          testStatusOneOf([400, 401], 'Status is client error')
        ),
        item('GET /api/auth/me - success',
          req('GET', '/api/auth/me'),
          [
            "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
            "const json = pm.response.json();",
            "pm.test('userId present', function () { pm.expect(json.userId).to.exist; });",
            "pm.test('email present', function () { pm.expect(json.email).to.be.a('string').and.not.empty; });"
          ]
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
      ]
    },
    {
      name: 'Bookings',
      description: 'Book seats for a movie at a theatre. Run Auth login first. Negative cases use seed data before Book success consumes seats 1,2.',
      item: [
        item('POST /api/bookings/book - invalid userId (404)',
          req('POST', '/api/bookings/book', {
            body: '{\n  "userId": {{invalidUserId}},\n  "movieId": {{validMovieId}},\n  "seatIds": {{availableSeatIds}}\n}'
          }),
          testStatus(404, 'Status is 404 Not Found')
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
          testStatus(409, 'Status is 409 Conflict'),
          null
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
        item('POST /api/bookings/book - success (stores bookingId)',
          req('POST', '/api/bookings/book', {
            body: '{\n  "userId": {{bookingUserId}},\n  "movieId": {{validMovieId}},\n  "seatIds": {{availableSeatIds}}\n}'
          }),
          [
            "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
            "const json = pm.response.json();",
            "pm.test('Status is PENDING', function () { pm.expect(json.status).to.eql('PENDING'); });",
            "pm.test('totalAmount is positive', function () { pm.expect(json.totalAmount).to.be.above(0); });",
            "pm.collectionVariables.set('bookingId', json.id);"
          ],
          prerequestBookingUser
        ),
        item('POST /api/bookings/{{bookingId}}/confirm - success',
          req('POST', '/api/bookings/{{bookingId}}/confirm'),
          [
            "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
            "pm.test('Status is CONFIRMED', function () { pm.expect(pm.response.json().status).to.eql('CONFIRMED'); });"
          ]
        ),
        item('POST /api/bookings/{{bookingId}}/confirm - already confirmed (409)',
          req('POST', '/api/bookings/{{bookingId}}/confirm'),
          testStatus(409, 'Status is 409 Conflict')
        ),
        item('POST /api/bookings/999999/confirm - not found (404)',
          req('POST', '/api/bookings/999999/confirm'),
          testStatus(404, 'Status is 404 Not Found')
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
        item('POST /api/bookings/999999/cancel - not found (404)',
          req('POST', '/api/bookings/999999/cancel'),
          testStatus(404, 'Status is 404 Not Found')
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
      ]
    },
    {
      name: 'Payments',
      description: 'Strategy (STRIPE | RAZORPAY) + mock adapters by default. Run Login first. List providers, book PENDING seats, initiate, then callback with mock signatures.',
      item: [
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
            "pm.test('Mock mode: both providers configured', function () {",
            "    providers.forEach(p => pm.expect(p.configured, p.provider + ' configured').to.be.true);",
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
        item('POST /api/payments/initiate - Stripe mock (stores paymentId, gatewayOrderId)',
          req('POST', '/api/payments/initiate', {
            body: '{\n  "bookingId": {{bookingIdPay}},\n  "provider": "STRIPE"\n}'
          }),
          [
            "pm.test('Status is 201 Created', function () { pm.response.to.have.status(201); });",
            "const json = pm.response.json();",
            "pm.test('Provider is STRIPE', function () { pm.expect(json.provider).to.eql('STRIPE'); });",
            "pm.test('Status is PENDING', function () { pm.expect(json.status).to.eql('PENDING'); });",
            "pm.test('checkoutUrl present', function () { pm.expect(json.checkoutUrl).to.include('stripe.com'); });",
            "pm.test('clientSecret present (mock PaymentIntent)', function () { pm.expect(json.clientSecret).to.be.a('string').and.not.empty; });",
            "pm.test('publishableKey present', function () { pm.expect(json.publishableKey).to.be.a('string').and.not.empty; });",
            "pm.test('gatewayOrderId is mock pi_*', function () { pm.expect(json.gatewayOrderId).to.match(/^pi_/); });",
            "pm.collectionVariables.set('paymentId', json.paymentId);",
            "pm.collectionVariables.set('gatewayOrderIdStripe', json.gatewayOrderId);",
            "pm.collectionVariables.set('stripeClientSecret', json.clientSecret || '');",
            "pm.collectionVariables.set('stripePublishableKey', json.publishableKey || '');"
          ]
        ),
        item('POST /api/payments/callback - Stripe mock success (whsec_) -> CONFIRMED',
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
        item('POST /api/payments/callback - already processed (409)',
          req('POST', '/api/payments/callback', {
            body: '{\n  "paymentId": {{paymentId}},\n  "paymentReference": "{{gatewayOrderIdStripe}}",\n  "signature": "{{stripeMockSignature}}",\n  "success": true\n}'
          }),
          testStatus(409, 'Status is 409 Conflict')
        ),
        item('GET /api/payments/{{paymentId}} - fetch payment',
          req('GET', '/api/payments/{{paymentId}}'),
          [
            "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
            "pm.test('Payment SUCCESS', function () { pm.expect(pm.response.json().status).to.eql('SUCCESS'); });"
          ]
        ),
        item('POST /api/payments/initiate - on CONFIRMED booking (409)',
          req('POST', '/api/payments/initiate', {
            body: '{\n  "bookingId": {{bookingIdPay}},\n  "provider": "STRIPE"\n}'
          }),
          testStatus(409, 'Status is 409 Conflict')
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
        item('Setup: book seats for Razorpay mock success (stores bookingIdRzp)',
          req('POST', '/api/bookings/book', {
            body: '{\n  "userId": {{bookingUserId}},\n  "movieId": 1,\n  "seatIds": [6, 7]\n}'
          }),
          [
            "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
            "pm.collectionVariables.set('bookingIdRzp', pm.response.json().id);"
          ],
          prerequestBookingUser
        ),
        item('POST /api/payments/initiate - Razorpay mock (stores paymentIdRzp, gatewayOrderId)',
          req('POST', '/api/payments/initiate', {
            body: '{\n  "bookingId": {{bookingIdRzp}},\n  "provider": "RAZORPAY"\n}'
          }),
          [
            "pm.test('Status is 201 Created', function () { pm.response.to.have.status(201); });",
            "const json = pm.response.json();",
            "pm.test('Provider is RAZORPAY', function () { pm.expect(json.provider).to.eql('RAZORPAY'); });",
            "pm.test('checkoutUrl present', function () { pm.expect(json.checkoutUrl).to.include('razorpay.com'); });",
            "pm.test('clientSecret is Razorpay key id', function () { pm.expect(json.clientSecret).to.match(/^rzp_/); });",
            "pm.test('gatewayOrderId is mock order_*', function () { pm.expect(json.gatewayOrderId).to.match(/^order_/); });",
            "pm.collectionVariables.set('paymentIdRzp', json.paymentId);",
            "pm.collectionVariables.set('gatewayOrderIdRazorpay', json.gatewayOrderId);"
          ]
        ),
        item('POST /api/payments/callback - Razorpay mock success (rzp_sig_) -> CONFIRMED',
          req('POST', '/api/payments/callback', {
            body: '{\n  "paymentId": {{paymentIdRzp}},\n  "paymentReference": "pay_rzp_mock_success",\n  "signature": "{{razorpayMockSignature}}",\n  "success": true\n}'
          }),
          [
            "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
            "const json = pm.response.json();",
            "pm.test('Payment SUCCESS', function () { pm.expect(json.status).to.eql('SUCCESS'); });",
            "pm.test('Booking CONFIRMED', function () { pm.expect(json.bookingStatus).to.eql('CONFIRMED'); });"
          ]
        ),
        item('Setup: book for Razorpay fail (stores bookingIdFail)',
          req('POST', '/api/bookings/book', {
            body: '{\n  "userId": {{bookingUserId}},\n  "movieId": 1,\n  "seatIds": [1, 2]\n}'
          }),
          [
            "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
            "pm.collectionVariables.set('bookingIdFail', pm.response.json().id);"
          ],
          prerequestBookingUser
        ),
        item('POST /api/payments/initiate - Razorpay (stores paymentIdFail)',
          req('POST', '/api/payments/initiate', {
            body: '{\n  "bookingId": {{bookingIdFail}},\n  "provider": "RAZORPAY"\n}'
          }),
          [
            "pm.test('Status is 201 Created', function () { pm.response.to.have.status(201); });",
            "pm.test('Provider is RAZORPAY', function () { pm.expect(pm.response.json().provider).to.eql('RAZORPAY'); });",
            "pm.collectionVariables.set('paymentIdFail', pm.response.json().paymentId);"
          ]
        ),
        item('POST /api/payments/callback - Razorpay reported failure -> CANCELLED',
          req('POST', '/api/payments/callback', {
            body: '{\n  "paymentId": {{paymentIdFail}},\n  "paymentReference": "pay_rzp_fail",\n  "signature": "{{razorpayMockSignature}}",\n  "success": false\n}'
          }),
          [
            "pm.test('Payment FAILED', function () { pm.expect(pm.response.json().status).to.eql('FAILED'); });",
            "pm.test('Booking CANCELLED', function () { pm.expect(pm.response.json().bookingStatus).to.eql('CANCELLED'); });"
          ]
        ),
        item('Setup: book seat for Stripe bad-signature test (stores bookingIdBadSig)',
          req('POST', '/api/bookings/book', {
            body: '{\n  "userId": {{bookingUserId}},\n  "movieId": 1,\n  "seatIds": [1]\n}'
          }),
          [
            "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
            "pm.collectionVariables.set('bookingIdBadSig', pm.response.json().id);"
          ],
          prerequestBookingUser
        ),
        item('POST /api/payments/initiate - Stripe for bad-signature test (stores paymentIdBadSig)',
          req('POST', '/api/payments/initiate', {
            body: '{\n  "bookingId": {{bookingIdBadSig}},\n  "provider": "STRIPE"\n}'
          }),
          [
            "pm.test('Status is 201 Created', function () { pm.response.to.have.status(201); });",
            "pm.collectionVariables.set('paymentIdBadSig', pm.response.json().paymentId);"
          ]
        ),
        item('POST /api/payments/callback - invalid Stripe mock signature -> FAILED + CANCELLED',
          req('POST', '/api/payments/callback', {
            body: '{\n  "paymentId": {{paymentIdBadSig}},\n  "paymentReference": "pay_bad_sig",\n  "signature": "invalid_not_whsec_prefix",\n  "success": true\n}'
          }),
          [
            "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
            "const json = pm.response.json();",
            "pm.test('Payment FAILED', function () { pm.expect(json.status).to.eql('FAILED'); });",
            "pm.test('Booking CANCELLED', function () { pm.expect(json.bookingStatus).to.eql('CANCELLED'); });"
          ]
        ),
        item('POST /api/payments/callback - paymentId zero (400)',
          req('POST', '/api/payments/callback', {
            body: '{\n  "paymentId": 0,\n  "success": true\n}'
          }),
          testStatus(400, 'Status is 400 Bad Request')
        ),
        item('POST /api/payments/callback - payment not found (404)',
          req('POST', '/api/payments/callback', {
            body: '{\n  "paymentId": 999999,\n  "paymentReference": "x",\n  "success": true\n}'
          }),
          testStatus(404, 'Status is 404 Not Found')
        ),
        item('GET /api/payments/999999 - not found (404)',
          req('GET', '/api/payments/999999'),
          testStatus(404, 'Status is 404 Not Found')
        ),
        item('Setup: book for invalid Razorpay signature (stores bookingIdRzpBadSig)',
          req('POST', '/api/bookings/book', {
            body: '{\n  "userId": {{bookingUserId}},\n  "movieId": 1,\n  "seatIds": [2]\n}'
          }),
          [
            "pm.collectionVariables.set('bookingIdRzpBadSig', pm.response.json().id);"
          ],
          prerequestBookingUser
        ),
        item('POST /api/payments/initiate - Razorpay for bad-signature test',
          req('POST', '/api/payments/initiate', {
            body: '{\n  "bookingId": {{bookingIdRzpBadSig}},\n  "provider": "RAZORPAY"\n}'
          }),
          [
            "pm.collectionVariables.set('paymentIdRzpBadSig', pm.response.json().paymentId);"
          ]
        ),
        item('POST /api/payments/callback - invalid Razorpay mock signature -> FAILED',
          req('POST', '/api/payments/callback', {
            body: '{\n  "paymentId": {{paymentIdRzpBadSig}},\n  "paymentReference": "pay_rzp_bad",\n  "signature": "invalid_not_rzp_sig_prefix",\n  "success": true\n}'
          }),
          [
            "pm.test('Status is 200 OK', function () { pm.response.to.have.status(200); });",
            "const json = pm.response.json();",
            "pm.test('Payment FAILED', function () { pm.expect(json.status).to.eql('FAILED'); });",
            "pm.test('Booking CANCELLED', function () { pm.expect(json.bookingStatus).to.eql('CANCELLED'); });"
          ]
        ),
        item('GET /api/payments/providers - missing token (401)',
          req('GET', '/api/payments/providers', { auth: 'noauth' }),
          testStatus(401, 'Status is 401 Unauthorized')
        )
      ]
    },
    {
      name: 'Security Edge Cases',
      description: 'Protected endpoints must reject missing or invalid JWT.',
      item: [
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
      ]
    }
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
    { key: 'seedConfirmedBookingId', value: '1', type: 'string' },
    { key: 'bookingId', value: '', type: 'string' },
    { key: 'bookingIdPay', value: '', type: 'string' },
    { key: 'bookingIdCancel', value: '', type: 'string' },
    { key: 'bookingIdFail', value: '', type: 'string' },
    { key: 'paymentId', value: '', type: 'string' },
    { key: 'paymentIdFail', value: '', type: 'string' },
    { key: 'bookingIdBadSig', value: '', type: 'string' },
    { key: 'paymentIdBadSig', value: '', type: 'string' },
    { key: 'stripeMockSignature', value: 'whsec_postman_mock', type: 'string' },
    { key: 'razorpayMockSignature', value: 'rzp_sig_postman_mock', type: 'string' },
    { key: 'gatewayOrderIdStripe', value: '', type: 'string' },
    { key: 'gatewayOrderIdRazorpay', value: '', type: 'string' },
    { key: 'stripeClientSecret', value: '', type: 'string' },
    { key: 'stripePublishableKey', value: '', type: 'string' },
    { key: 'bookingIdRzp', value: '', type: 'string' },
    { key: 'paymentIdRzp', value: '', type: 'string' },
    { key: 'bookingIdRzpBadSig', value: '', type: 'string' },
    { key: 'paymentIdRzpBadSig', value: '', type: 'string' }
  ]
};

fs.writeFileSync('BMSDec24-API.postman_collection.json', JSON.stringify(collection, null, 2) + '\n');
const count = (items) => items.reduce((n, f) => n + (f.item ? count(f.item) : 1), 0);
console.log('Generated', count(collection.item), 'requests across', collection.item.length, 'folders');