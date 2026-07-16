# Legal AI Contract Analysis Platform — Microservices

Full microservice implementation matching the integration requirements: one service per
module, REST for all CRUD, RabbitMQ queue used *only* for the AI-analysis handoff, a single
API Gateway as the public entry point, and Docker Compose to bring everything up with one
command.

## Architecture

```
                                   ┌────────────┐
                     Frontend ───▶ │  Gateway   │  (JWT check, rate limit, routing)
                                   └─────┬──────┘
                 ┌───────────┬───────────┼───────────┬────────────┬─────────────┬───────────┐
                 ▼           ▼           ▼            ▼            ▼             ▼           ▼
            auth-service contract-  ai-service   risk-compliance chat-service report-  notification-
                         service    (consumer)      -service                  service   service
                            │            ▲               ▲                       ▲          ▲
                            │  queue     │  REST          │ REST                  │ REST      │ REST
                            └───────────▶┘◀───────────────┘───────────────────────┴──────────┘
                                         │
                                    audit-service (REST, called by everyone)

            MongoDB: one logical database per service (users / contracts / ai / risk_compliance /
                      chat / notifications / audit)
            RabbitMQ: ai_analysis_queue (contract upload -> AI job), ai_result_queue (reserved)
```

### Services (one per module)
| Service | Port | Responsibility |
|---|---|---|
| `frontend` | 8080 | React (Vite) single-page app, served by nginx, proxies `/api` to the gateway |
| `gateway` | 4000 | Public entry point: JWT validation, rate limiting, request routing |
| `auth-service` | 4001 | Register / login / refresh / me, issues JWTs |
| `contract-service` | 4002 | Upload, text extraction, owns `contracts` collection, publishes AI jobs to the queue |
| `ai-service` | 4003 | Consumes the queue, country/law selection, prompt builder, Gemini call, post-processing |
| `risk-compliance-service` | 4004 | Generates risk + compliance reports from AI output |
| `chat-service` | 4005 | Per-contract Q&A chat history |
| `report-service` | 4006 | Aggregates data from other services into on-demand reports (stateless) |
| `notification-service` | 4007 | Stores + serves in-app notifications |
| `audit-service` | 4008 | Central audit trail, written to by every other service |

### Why queue vs REST
- **REST** is used for every normal CRUD operation and every service-to-service call
  (linking records, generating reports, notifications, audit logging).
- **RabbitMQ** is used for exactly one thing: handing a freshly uploaded contract off to
  `ai-service` for analysis. This decouples the slow/variable-latency Gemini call from the
  upload request, so the upload endpoint returns immediately instead of blocking on the AI call.

### Data relationships (no orphans)
`contracts` documents store `aiAnalysisId`, `riskReportId`, and `complianceReportId`, and are
only ever updated by their owning service after the corresponding record is created — so every
contract stays linked to its analysis, risk report, and compliance report.

## Running everything with one command

```bash
cp .env.example .env
# edit .env: set JWT_SECRET, JWT_REFRESH_SECRET, and GEMINI_API_KEY

docker compose up --build
```

That single command builds and starts: MongoDB, RabbitMQ, the gateway, all 8 microservices, and the React frontend.

- **Frontend (open this in your browser)**: http://localhost:8080
- Gateway (public API): http://localhost:4000
- RabbitMQ management UI: http://localhost:15672 (guest/guest)
- MongoDB: localhost:27017

### Frontend (React)
- Built with Vite + React Router + Tailwind, in `frontend/`.
- Talks only to the gateway at `/api/*` — never to an individual service or the database directly.
- In Docker, nginx serves the production build and proxies `/api` to `gateway:4000`.
- For local development against a running `docker compose` backend:
  ```bash
  cd frontend
  npm install
  npm run dev   # http://localhost:5173, proxies /api to http://localhost:4000
  ```
- Pages: sign in / register, a "docket" dashboard listing filed contracts, a contract detail
  view (summary / risk / compliance tabs + per-contract chat), notifications, and your audit trail.

To stop: `docker compose down` (add `-v` to also wipe MongoDB/upload volumes).

## Example flow (via the gateway on :4000)

```bash
# 1. Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","password":"Passw0rd!","country":"US"}'

# 2. Login -> copy accessToken from the response
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"Passw0rd!"}'

# 3. Upload a contract (kicks off the async AI pipeline via the queue)
curl -X POST http://localhost:4000/api/contracts \
  -H "Authorization: Bearer <accessToken>" \
  -F "file=@/path/to/contract.pdf" \
  -F "userCountry=US" \
  -F "employerCountry=UK"

# 4. Poll for the linked analysis/risk/compliance report
curl http://localhost:4000/api/contracts/<contractId> -H "Authorization: Bearer <accessToken>"
curl http://localhost:4000/api/reports/contract/<contractId> -H "Authorization: Bearer <accessToken>"

# 5. Chat about the contract
curl -X POST http://localhost:4000/api/chat \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"contractId":"<contractId>","message":"What are the termination terms?"}'

# 6. Notifications & audit trail
curl http://localhost:4000/api/notifications -H "Authorization: Bearer <accessToken>"
curl http://localhost:4000/api/audit/me -H "Authorization: Bearer <accessToken>"
```

## Security layers implemented
- Gateway: `helmet`, CORS, global rate limiter, JWT validation before proxying
- Every service: its own JWT + role middleware on protected routes (defense in depth)
- Internal-only endpoints (`/internal/...`) are meant to sit behind a private Docker network —
  in production, put them behind a network policy / mTLS so only other services can reach them
- Standardized JSON error responses everywhere; stack traces are never sent to clients
- Audit log captures user ID, IP, device, timestamp, action, and status for every sensitive operation

## Scaling notes (reduced load time by design)
- Each module is an independently deployable, independently scalable service — e.g. you can run
  3 replicas of `ai-service` under load without touching `auth-service`
- The AI pipeline is fully async (queue-based): contract upload responds instantly instead of
  waiting on the Gemini round-trip
- `report-service` is stateless and has no database of its own — it can be scaled horizontally
  with zero coordination overhead

## Extending
- **RAG pipeline**: add a `vector-store` volume/service and a retrieval step inside
  `ai-service/src/promptBuilder.js` before the Gemini call — no other service needs to change.
- **New module**: copy any existing service folder as a template, add its block to
  `docker-compose.yml`, and add its route prefix to `gateway/src/index.js`.
- **OCR for scanned PDFs**: swap the fallback branch in
  `contract-service/src/controllers/contractController.js` (`extractText`) for a real OCR call
  (e.g. Tesseract or a cloud OCR API).
