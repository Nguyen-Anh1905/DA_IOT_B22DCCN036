# IoT Dashboard Project - AI Agent Instructions

## Project Overview
Spring Boot 3.5.5 + Java 21 IoT monitoring system that collects **6 sensors** (temperature, humidity, light, cb1, cb2, cb3) from ESP8266 via MQTT and displays **two separate dashboards**:
- **Dashboard** (`/dashboard`) - 3 legacy sensors (temp, humidity, light) + device control (DEV1/DEV2/DEV3)
- **Dashboard New** (`/dashboardnew`) - 3 separate charts for cb1/cb2/cb3 with 50% threshold warnings

Backend handles bi-directional MQTT communication with async device control feedback loop.

## Architecture & Data Flow

### MQTT Communication Pattern (Critical)
**Three-channel architecture** using Spring Integration MQTT:
- `esp8266/datasensor` → Backend subscribes **all 6 sensor readings** (temp, humidity, light, cb1, cb2, cb3)
- `esp8266/status` → Backend subscribes device status confirmations (DEV1/DEV2/DEV3)
- `esp8266/control` → Backend publishes control commands (ON/OFF)

**Device Control Flow** (async request-response):
1. Frontend POST `/api/dashboard/control` → Backend publishes to `esp8266/control`
2. ESP8266 executes command → publishes confirmation to `esp8266/status`
3. `MqttConfig.statusHandler()` receives status → calls `DeviceControlService.completeRequest()`
4. `CompletableFuture` resolves → HTTP response sent to frontend (4s timeout)

See `MqttConfig.java` (line 103-126 for datasensorHandler) and `DeviceControlService.java` for async pattern.

### Frontend Architecture
**Background sync service pattern**: `background-sync.js` runs globally across all pages:
- Polls `/api/dashboard/chart` every 2s for **all 6 sensors**
- Stores chart history in localStorage (20 points max, 1hr expiration)
- Manages device state persistence (`DEV1`/`DEV2`/`DEV3` ON/OFF)
- Dispatches `dataUpdated` CustomEvent for page-specific UI updates

`dashboard.js` and `dashboardnew.js` consume events from background service, never fetch directly.

## Key Conventions

### Entity & DTO Patterns
- **Entities** use Lombok `@Data` with JPA annotations: `DataSensor.java` (6 sensor fields), `ActionHistory.java`
- **DTOs** mirror entities but exclude ID/timestamps: `DataSensorDto.java`, `ControlDto.java`
- All timestamps: `LocalDateTime` with `@Column(columnDefinition = "DATETIME(0)")` (no milliseconds)
- MQTT payloads send Unix epoch milliseconds (`time` field), converted in handlers using `Instant.ofEpochMilli().withNano(0)`

### Service Layer Patterns
- Repositories extend `JpaRepository` with custom query methods: `findTop1ByOrderByTimeDesc()`
- Services are thin wrappers around repositories (`DataSensorService.java`, `ActionHistoryService.java`)
- **Exception**: `DeviceControlService` manages stateful async operations with `ConcurrentHashMap<String, CompletableFuture>`

### Controller Patterns
- REST endpoints: `/api/{module}/{action}` (e.g., `/api/dashboard/control`, `/api/datasensor/filter`)
- Page rendering: `PageController.java` returns Thymeleaf template names:
  - `/dashboard` → `dashboard.html` (legacy 3 sensors + device control)
  - `/dashboardnew` → `dashboardnew.html` (3 separate charts for cb1/cb2/cb3)
- Device control returns `CompletableFuture<Map<String, Object>>` for async MQTT confirmation

### Dashboard New Specifics
**Warning System** (50% threshold for cb1/cb2/cb3):
- `checkWarningThreshold()` in `dashboardnew.js` monitors sensor values
- Red border (`4px solid #FF0000`) on header box when threshold exceeded
- Popup notification with 10s cooldown per sensor to prevent spam
- Three separate Chart.js instances (`cb1ChartInstance`, `cb2ChartInstance`, `cb3ChartInstance`)
- Each chart rendered independently via `renderSingleChart()` function

## Development Workflows

### Running the Application
```powershell
# Build and run (requires MySQL on localhost:3306 with `iot` database)
./mvnw clean install ; ./mvnw spring-boot:run

# Access dashboards
# http://localhost:8080/dashboard - Legacy dashboard with device control
# http://localhost:8080/dashboardnew - Warning system for cb1/cb2/cb3
```

### Database Setup
MySQL connection defined in `application.properties`:
- DB: `iot` (must exist), user: `root`, password: `123456`
- Hibernate auto-creates tables (`spring.jpa.hibernate.ddl-auto=update`)
- Tables: `data_sensor` (6 sensor columns), `action_history` (snake_case, auto-generated from entities)
- Field order in `data_sensor`: id, time, temperature, humidity, light, cb1, cb2, cb3

### Adding New Sensor Fields
1. Update `DataSensor.java` entity with new field (e.g., `private int cb4;`)
2. Add null-safe parsing in `MqttConfig.datasensorHandler()`: `sensor.setCb4(node.has("cb4") ? node.get("cb4").asInt() : 0);`
3. Update `background-sync.js` to parse field: `cb4: Number(record.cb4 ?? 0)`
4. Add to chart in target page JS (dashboard.js or dashboardnew.js)

### Adding New Devices
1. Update `MqttConfig.deviceStates` in `background-sync.js` with device ID
2. Add icon mappings in `initDeviceControl()` deviceIcons object
3. Add corresponding HTML structure in `dashboard.html` with class `.DEV{N}`

### Debugging MQTT
- Console logs prefixed: `📤 Sent`, `✅ Saved`, `🔄 Chart`, `🎮 Device`
- Backend logs: `✅ Saved datasensor:` and `✅ Completed request for device:`
- Check broker connectivity: `tcp://172.20.10.2:1883` with user: `anh`, password: `123`
- Test endpoints: `GET /api/dashboard/chart`, `POST /api/dashboard/control`

## Critical Integration Points

### CORS Configuration
`WebConfig.java` allows specific origins for API access (localhost:5500, 63342 for IDEs).
Adjust `allowedOrigins` when deploying or changing frontend ports.

### Jackson Configuration
`jackson-datatype-jsr310` dependency required for `LocalDateTime` serialization in JSON responses.
Handlers use `ObjectMapper` to parse incoming MQTT JSON payloads.

### Frontend-Backend Contract
API responses match entity structure (camelCase), but flexible parsing in `dashboard.js`:
```javascript
temperature: Number(record.temperature ?? record.temp ?? 0)
```

## Common Tasks

**Add sensor field**: Update `DataSensor` entity → add to DTO → parse in `MqttConfig.datasensorHandler()` → update chart in `dashboard.js`

**Add device type**: Follow "Adding New Devices" workflow above + add MQTT topic subscription if needed

**Modify chart appearance**: Edit constants in `dashboard.js` (`COLOR_TEMP`, `COLOR_HUM`, `COLOR_LIGHT`) or `dashboardnew.js` (`COLOR_CB1`, `COLOR_CB2`, `COLOR_CB3`)

**Change sync frequency**: Adjust `SYNC_INTERVAL` in `background-sync.js` (default 2000ms)

**Fix variable naming conflicts**: Both `background-sync.js` and page-specific JS files create global variables - use unique names (e.g., `warningStyle` instead of `style` in dashboardnew.js to avoid conflict with background-sync.js)

## Known Patterns to Preserve

- Device control timeout: 4 seconds (balance between ESP8266 response time and user experience)
- Chart data limit: 20 points (localStorage size vs. chart readability)
- Duplicate detection in `background-sync.js` compares timestamps AND values
- Always use `withNano(0)` when creating `LocalDateTime` from epoch to match DB precision
- Dashboard New uses separate Chart.js instances per sensor to enable independent rendering and threshold monitoring
