# Large-Scale Laravel Application Architecture & Production Standards Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Coding Standards & Clean Code](#coding-standards--clean-code)
4. [Object-Oriented Programming (OOP)](#object-oriented-programming-oop)
5. [Design Patterns](#design-patterns)
6. [Security Best Practices](#security-best-practices)
7. [Database & Eloquent](#database--eloquent)
8. [API Design](#api-design)
9. [Testing](#testing)
10. [Performance & Optimization](#performance--optimization)
11. [Error Handling & Logging](#error-handling--logging)
12. [Frontend & Assets](#frontend--assets)
13. [Deployment & CI/CD](#deployment--cicd)
14. [Monitoring & Maintenance](#monitoring--maintenance)
15. [Checklist](#checklist)

---

## Introduction

This document defines the architectural standards and best practices for building **enterprise-grade, production-ready Laravel applications**. These guidelines ensure consistency, scalability, maintainability, and security across large teams and codebases.

### Core Principles

- **SOLID Principles**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.
- **DRY (Don't Repeat Yourself)**: Eliminate redundancy through abstraction.
- **KISS (Keep It Simple, Stupid)**: Prefer simple, readable solutions.
- **YAGNI (You Aren't Gonna Need It)**: Avoid over-engineering.
- **Separation of Concerns**: Clear boundaries between layers.
- **Explicit Over Implicit**: Favor clarity over magic.
- **Immutable Where Possible**: Prefer immutability in domain objects.

---

## Project Structure

### Recommended Directory Layout

```
app/
├── Actions/                    # Single-action classes (CQRS-style)
├── Concerns/                  # Reusable traits
├── Contracts/                 # Interface definitions
├── DTOs/                      # Data Transfer Objects
├── Enums/                     # PHP Enums
├── Events/                    # Event classes
├── Exceptions/                # Custom exceptions
├── Filament/                  # Filament admin resources & pages
├── Helpers/                   # Global helper functions
├── Http/
│   ├── Controllers/
│   │   ├── Api/               # API controllers
│   │   ├── Admin/             # Admin panel controllers
│   │   └── Web/               # Web controllers
│   ├── Middleware/
│   ├── Requests/              # Form Request validation
│   └── Resources/             # API Resources (Transformers)
├── Jobs/                      # Queueable jobs
├── Listeners/                 # Event listeners
├── Mail/                      # Mailable classes
├── Models/                    # Eloquent models
├── Notifications/             # Notification classes
├── Observers/                 # Model observers
├── Policies/                  # Authorization policies
├── Providers/                 # Service providers
├── Rules/                     # Custom validation rules
├── Services/                  # Business logic services
├── Support/                   # Helper classes, macros
└── ValueObjects/              # Value objects

bootstrap/
config/
database/
├── factories/
├── migrations/
├── seeders/
├── stubs/
└── factories/

docs/
lang/
public/
resources/
routes/
├── api.php
├── channels.php
├── console.php
└── web.php

storage/
tests/
├── Feature/
├── Unit/
└── Browser/

docker/
scripts/
```

### Architectural Layers

```
Presentation Layer (Routes, Controllers, Blade, Inertia, Livewire)
       ↓
Application Layer (Requests, Resources, Formatters)
       ↓
Domain Layer (Services, Actions, DTOs, ValueObjects)
       ↓
Infrastructure Layer (Eloquent Repositories, External APIs, Cache)
       ↓
Database Layer (Migrations, Seeders)
```

---

## Coding Standards & Clean Code

### 1. PSR-12 Compliance

Always follow PSR-12. Use Laravel Pint for automated formatting.

```bash
vendor/bin/pint
```

### 2. Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Class | StudlyCase | `UserService` |
| Method | camelCase | `getUserById()` |
| Variable | camelCase | `$userName` |
| Constant | UPPER_CASE | `MAX_RETRIES` |
| Database Table | snake_case, plural | `hotel_bookings` |
| Route Names | dot.notation | `admin.bookings.index` |

### 3. Single Responsibility Principle

Each class should have exactly one reason to change.

```php
// ❌ BAD: God controller
class BookingController extends Controller {
    public function store() { /* validate, create booking, send email, log, update stats */ }
}

// ✅ GOOD: Delegated responsibility
class BookingController extends Controller {
    public function store(StoreBookingRequest $request, CreateBookingAction $action) {
        $booking = $action->execute($request->validated());
        return BookingResource::make($booking);
    }
}
```

### 4. Avoid Deep Nesting

Limit nesting to 3 levels maximum. Use early returns, guard clauses, and extract methods.

```php
// ❌ BAD
public function process($order) {
    if ($order) {
        if ($order->isPaid()) {
            if ($order->canShip()) {
                // logic
            }
        }
    }
}

// ✅ GOOD
public function process($order) {
    if (!$order) return;
    if (!$order->isPaid()) return;
    if (!$order->canShip()) return;
    // logic
}
```

### 5. Type Declarations

Always use explicit types for parameters, return values, and properties.

```php
class UserService {
    public function __construct(private UserRepository $users) {}

    public function findById(int $id): ?User {
        return $this->users->find($id);
    }
}
```

### 6. Immutability

Prefer readonly properties and avoid mutating state.

```php
final class BookingData {
    public function __construct(
        public readonly int $userId,
        public readonly int $roomId,
        public readonly Carbon $checkIn,
        public readonly Carbon $checkOut,
    ) {}
}
```

---

## Object-Oriented Programming (OOP)

### 1. Encapsulation

Keep properties private. Use getters/setters or public methods to expose behavior.

```php
class Reservation {
    private array $guests = [];

    public function addGuest(Guest $guest): void {
        if (count($this->guests) >= $this->getMaxGuests()) {
            throw new MaxGuestsExceededException();
        }
        $this->guests[] = $guest;
    }

    public function getGuests(): array {
        return $this->guests;
    }
}
```

### 2. Inheritance vs Composition

Prefer composition and interfaces over deep inheritance hierarchies.

```php
// ✅ Use interfaces
interface PaymentGateway {
    public function charge(float $amount): PaymentResult;
}

// Implementations
class StripeGateway implements PaymentGateway { ... }
class PaypalGateway implements PaymentGateway { ... }
```

### 3. Final Classes & Methods

Declare classes and methods as `final` by default. Extend only when there is a proven need.

```php
final class InvoiceService { ... }
```

### 4. DTOs (Data Transfer Objects)

Use DTOs to transfer data between layers with strict typing.

```php
readonly class CreateBookingDTO {
    public function __construct(
        public int $userId,
        public int $roomId,
        public string $checkIn,
        public string $checkOut,
        public array $guests,
    ) {}
}

// Usage
$dto = new CreateBookingDTO(
    userId: $user->id,
    roomId: $request->room_id,
    checkIn: $request->check_in,
    checkOut: $request->check_out,
    guests: $request->guests,
);
```

### 5. Value Objects

Encapsulate validation and behavior for domain concepts.

```php
enum BookingStatus: string {
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Cancelled = 'cancelled';
    case Completed = 'completed';
}

final class Money {
    public function __construct(
        private readonly int $amountInCents,
        private readonly string $currency = 'USD',
    ) {}

    public static function fromDollars(float $dollars): self {
        return new self((int)($dollars * 100));
    }

    public function add(self $other): self {
        return new self($this->amountInCents + $other->amountInCents, $this->currency);
    }
}
```

---

## Design Patterns

### 1. Repository Pattern

Abstract data access for testability and flexibility.

```php
interface BookingRepositoryInterface {
    public function find(int $id): ?Booking;
    public function create(array $data): Booking;
    public function update(int $id, array $data): bool;
}

class EloquentBookingRepository implements BookingRepositoryInterface {
    public function __construct(private Booking $model) {}

    public function find(int $id): ?Booking {
        return $this->model->find($id);
    }
}

// Usage
class BookingService {
    public function __construct(private BookingRepositoryInterface $bookings) {}
}
```

### 2. Service Layer

Contain complex business logic in dedicated service classes.

```php
final class BookingService {
    public function __construct(
        private BookingRepositoryInterface $bookings,
        private PaymentGateway $payments,
        private NotificationService $notifications,
    ) {}

    public function bookRoom(CreateBookingDTO $dto): Booking {
        DB::transaction(function () use ($dto) {
            $booking = $this->bookings->create([...]);
            $this->payments->charge($dto->totalAmount);
            $this->notifications->sendConfirmation($booking);
        });
        return $booking;
    }
}
```

### 3. Action / Command Pattern

Single-responsibility action classes for CQRS-style operations.

```php
final class CreateBookingAction {
    public function __construct(
        private BookingRepositoryInterface $bookings,
        private PaymentGateway $payments,
    ) {}

    public function execute(CreateBookingDTO $dto): Booking {
        // Implementation
    }
}
```

### 4. Factory Pattern

Centralize object creation for complex instantiation.

```php
final class BookingFactory {
    public function createFromArray(array $data): Booking {
        return new Booking(
            userId: $data['user_id'],
            roomId: $data['room_id'],
            status: BookingStatus::Pending,
            total: Money::fromDollars($data['total']),
        );
    }
}
```

### 5. Strategy Pattern

Interchangeable algorithms based on context.

```php
interface PricingStrategy {
    public function calculate(Booking $booking): Money;
}

class StandardPricing implements PricingStrategy { ... }
class SeasonalPricing implements PricingStrategy { ... }
class CorporatePricing implements PricingStrategy { ... }

class PricingService {
    public function __construct(private array $strategies) {}

    public function calculate(Booking $booking, string $type): Money {
        return $this->strategies[$type]->calculate($booking);
    }
}
```

### 6. Observer Pattern

React to model events declaratively.

```php
class BookingObserver {
    public function created(Booking $booking): void {
        $this->notifyReception($booking);
        $this->reserveRoom($booking->room);
    }

    public function cancelled(Booking $booking): void {
        $this->releaseRoom($booking->room);
        $this->notifyCancellation($booking);
    }
}

Booking::observe(BookingObserver::class);
```

### 7. Event-Driven Architecture

Decouple components via events and listeners.

```php
class BookingWasCreated implements ShouldBroadcast {
    public function __construct(public Booking $booking) {}

    public function broadcastOn(): array {
        return [new PrivateChannel('bookings.' . $this->booking->id)];
    }
}

class SendBookingConfirmation implements ShouldQueue {
    public function handle(BookingWasCreated $event) {
        Mail::to($event->booking->user)->send(new BookingConfirmationMail($event->booking));
    }
}
```

---

## Security Best Practices

### 1. Authentication & Authorization

- Use Laravel Fortify or Breeze for authentication scaffolding.
- Implement **multi-auth** with guards and providers for admin/hotel/guest portals.
- Always use **Policies** for authorization.

```php
Gate::define('update-booking', function (User $user, Booking $booking) {
    return $user->id === $booking->user_id || $user->hasRole('admin');
});
```

### 2. Input Validation

Validate ALL input using Form Requests.

```php
class StoreBookingRequest extends FormRequest {
    public function rules(): array {
        return [
            'room_id' => 'required|exists:rooms,id',
            'check_in' => 'required|date|after:today',
            'check_out' => 'required|date|after:check_in',
            'guests' => 'required|array|min:1|max:10',
            'guests.*.name' => 'required|string|max:255',
            'guests.*.age' => 'required|integer|min:1',
        ];
    }

    public function authorize(): bool {
        return true;
    }
}
```

### 3. Mass Assignment Protection

Always define `$fillable` or `$guarded` explicitly on models.

```php
class Booking extends Model {
    protected $fillable = [
        'user_id',
        'room_id',
        'check_in',
        'check_out',
        'total_amount',
        'status',
    ];
}
```

### 4. SQL Injection Prevention

Always use Eloquent, Query Builder, or parameter binding. Never concatenate raw SQL.

```php
// ❌ BAD
$results = DB::select("SELECT * FROM bookings WHERE id = " . $id);

// ✅ GOOD
$results = Booking::where('id', $id)->get();
// OR
$results = DB::select('SELECT * FROM bookings WHERE id = ?', [$id]);
```

### 5. XSS Prevention

- Escape output in Blade: `{{ $value }}` (escaped) vs `{!! $value !!}` (unescaped).
- Use Purifier for rich text.
- Set CSP headers.

### 6. CSRF Protection

Keep CSRF middleware enabled. Use `@csrf` in forms.

### 7. Rate Limiting

Protect endpoints from abuse.

```php
// In RouteServiceProvider
RateLimiter::for('api', function (Request $request) {
    return Limit::perMinute(60)->by($request->ip());
});

RateLimiter::for('bookings', function (Request $request) {
    return Limit::perMinute(10)->by($request->user()?->id ?: $request->ip());
});
```

### 8. Password Security

- Use bcrypt (default) or Argon2.
- Enforce strong password rules.
- Implement password confirmation for sensitive actions.

### 9. Sensitive Data Exposure

- Encrypt sensitive attributes using Laravel's encryption.

```php
class Payment extends Model {
    protected $casts = [
        'card_number' => 'encrypted',
        'cvv' => 'encrypted',
    ];
}
```

- Store secrets in `.env` and use `config()` to access them.
- Never commit secrets to version control.

### 10. Security Headers

Configure in middleware:

```php
class SecurityHeaders {
    public function handle(Request $request, Closure $next): Response {
        $response = $next($request);
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'geolocation=(), microphone=()');
        return $response;
    }
}
```

### 11. File Upload Security

Validate file types, sizes, and scan for malware. Store outside web root or use signed URLs.

```php
$request->validate([
    'document' => 'required|file|mimes:pdf,doc,docx|max:10240',
]);
```

---

## Database & Eloquent

### 1. Migrations

- Every schema change must have a migration.
- Use descriptive method names.

```php
Schema::table('bookings', function (Blueprint $table) {
    $table->foreignId('room_id')->constrained()->cascadeOnDelete();
    $table->timestamp('check_in');
    $table->timestamp('check_out');
    $table->decimal('total_amount', 10, 2);
    $table->enum('status', BookingStatus::cases())->default(BookingStatus::Pending);
    $table->timestamps();
    $table->softDeletes();
    $table->index(['user_id', 'status']);
});
```

### 2. Model Conventions

- Models go in `app/Models/`.
- Use Eloquent relationships explicitly.
- Avoid `$hidden` for sensitive data; prefer API Resources.

```php
class Booking extends Model {
    use HasFactory, SoftDeletes;

    protected $fillable = ['user_id', 'room_id', 'check_in', 'check_out', 'total_amount'];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function room(): BelongsTo { return $this->belongsTo(Room::class); }
    public function payments(): HasMany { return $this->hasMany(Payment::class); }
}
```

### 3. N+1 Query Prevention

Always eager load relationships.

```php
// ❌ BAD: N+1
$bookings = Booking::all();
foreach ($bookings as $booking) {
    echo $booking->user->name;
}

// ✅ GOOD
$bookings = Booking::with('user')->get();
```

Use `withCount()` for aggregate data.

```php
$hotels = Hotel::withCount('rooms', 'bookings')->get();
```

### 4. Indexing Strategy

Index foreign keys and frequently queried columns.

```php
$table->index(['user_id', 'status']);
$table->index('created_at');
```

### 5. Database Transactions

Wrap multi-step database operations in transactions.

```php
DB::transaction(function () use ($bookingData) {
    $booking = Booking::create($bookingData);
    Payment::create(['booking_id' => $booking->id, ...]);
    Room::where('id', $bookingData['room_id'])->update(['status' => 'occupied']);
});
```

### 6. Query Optimization

- Use `chunk()` for large datasets.
- Use `cursor()` for memory-efficient iteration.
- Avoid `*` in selects; specify needed columns.

```php
Booking::select('id', 'user_id', 'check_in', 'check_out')->chunk(1000, function ($bookings) {
    foreach ($bookings as $booking) {
        // Process
    }
});
```

### 7. Seeders & Factories

Use factories and seeders for test data.

```php
class BookingFactory extends Factory {
    public function definition(): array {
        return [
            'user_id' => User::factory(),
            'room_id' => Room::factory(),
            'check_in' => now()->addDays(7),
            'check_out' => now()->addDays(10),
            'total_amount' => Money::fromDollars(450),
            'status' => BookingStatus::Pending,
        ];
    }
}
```

---

## API Design

### 1. RESTful Conventions

Follow REST semantics:

| Action | Method | Route |
|--------|--------|-------|
| List | GET | `/api/bookings` |
| Show | GET | `/api/bookings/{id}` |
| Create | POST | `/api/bookings` |
| Update | PUT/PATCH | `/api/bookings/{id}` |
| Delete | DELETE | `/api/bookings/{id}` |

### 2. API Versioning

Version APIs from day one.

```php
// routes/api.php
Route::prefix('v1')->group(function () {
    Route::apiResource('bookings', BookingController::class);
});
```

### 3. Consistent Response Structure

```json
{
    "success": true,
    "data": { ... },
    "message": "Booking created successfully",
    "meta": {
        "current_page": 1,
        "total": 100
    }
}
```

### 4. API Resources

Transform models for API output.

```php
class BookingResource extends JsonResource {
    public function toArray(Request $request): array {
        return [
            'id' => $this->id,
            'check_in' => $this->check_in->toIso8601String(),
            'check_out' => $this->check_out->toIso8601String(),
            'status' => $this->status->value,
            'user' => new UserResource($this->whenLoaded('user')),
            'room' => new RoomResource($this->whenLoaded('room')),
            'links' => [
                'self' => route('api.bookings.show', $this->id),
            ],
        ];
    }
}
```

### 5. Error Responses

Use consistent HTTP status codes and error shapes.

```json
{
    "success": false,
    "message": "Validation failed",
    "errors": {
        "check_in": ["The check-in date must be after today."]
    }
}
```

### 6. Authentication

Use Laravel Sanctum for token-based API auth.

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return new UserResource($request->user());
    });
});
```

---

## Testing

### 1. Testing Strategy

- **Unit Tests**: Test individual classes, services, value objects in isolation.
- **Feature Tests**: Test HTTP endpoints and user flows.
- **Browser Tests**: Test critical UI paths with Playwright or Dusk.
- **Architecture Tests**: Enforce rules with Pest `arch()`.

### 2. Test Structure

```php
it('allows authenticated users to create a booking', function () {
    $user = User::factory()->create();
    $room = Room::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/v1/bookings', [
            'room_id' => $room->id,
            'check_in' => now()->addDays(7)->toDateString(),
            'check_out' => now()->addDays(10)->toDateString(),
            'guests' => [
                ['name' => 'John Doe', 'age' => 30],
            ],
        ])
        ->assertCreated()
        ->assertJsonStructure(['data' => ['id', 'status', 'check_in']]);
});
```

### 3. Factories & Seeders

Use factories for all test data.

```php
$booking = Booking::factory()
    ->for(User::factory(), 'user')
    ->for(Room::factory(), 'room')
    ->create();
```

### 4. Mocking

Mock external dependencies.

```php
$paymentGateway = Mockery::mock(PaymentGateway::class);
$paymentGateway->shouldReceive('charge')->once()->andReturn(new PaymentResult(true));
$this->app->instance(PaymentGateway::class, $paymentGateway);
```

### 5. Architecture Tests

```php
arch('domain')
    ->expect('App\Services')
    ->toHaveMethod('execute')
    ->not->toHaveSuffix('Controller');

arch('models')
    ->expect('App\Models\Booking')
    ->toHaveMethod('user')
    ->toHaveMethod('room');
```

---

## Performance & Optimization

### 1. Caching

Use caching for expensive operations.

```php
$hotels = Cache::remember('hotels.all', 3600, function () {
    return Hotel::with('rooms', 'amenities')->get();
});
```

### 2. Queue Jobs

Offload time-consuming tasks to queues.

```php
class SendBookingConfirmation implements ShouldQueue {
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle() {
        // Send email
    }
}

SendBookingConfirmation::dispatch($booking);
```

### 3. Route & Config Caching

```bash
php artisan route:cache
php artisan config:cache
php artisan view:cache
```

### 4. Database Optimization

- Use indexing strategically.
- Avoid `select *`; select only needed columns.
- Use database connection pooling.
- Consider read replicas for heavy read workloads.

### 5. Asset Optimization

- Use Laravel Mix or Vite for bundling.
- Enable Brotli/Gzip compression.
- Use CDN for static assets.

```bash
npm run build
php artisan optimize
```

### 6. OPcache & PHP Optimization

Ensure OPcache is enabled in production.

```ini
opcache.enable=1
opcache.memory_consumption=256
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=20000
```

---

## Error Handling & Logging

### 1. Custom Exceptions

Create domain-specific exceptions.

```php
class BookingNotFoundException extends NotFoundException {}
class RoomNotAvailableException extends DomainException {}
class PaymentFailedException extends RuntimeException {}
```

### 2. Exception Handling

Register custom exception handlers.

```php
public function register(): void {
    $this->renderable(function (BookingNotFoundException $e, Request $request) {
        return response()->json([
            'success' => false,
            'message' => 'Booking not found.',
        ], 404);
    });
}
```

### 3. Logging

Use structured logging with context.

```php
Log::channel('bookings')->info('Booking created', [
    'booking_id' => $booking->id,
    'user_id' => $user->id,
    'room_id' => $room->id,
    'amount' => $booking->total_amount,
]);
```

### 4. Monitoring

Integrate with Sentry, Bugsnag, or similar for error tracking.

---

## Frontend & Assets

### 1. Stack Choices

- **Inertia.js + React/Vue**: For SPAs without API complexity.
- **Livewire**: For dynamic server-rendered components.
- **Tailwind CSS**: Utility-first CSS framework.
- **Alpine.js**: For minimal JavaScript interactivity.

### 2. Component Organization

```
resources/js/
├── Components/
│   ├── Layouts/
│   ├── Booking/
│   └── Shared/
├── Pages/
│   ├── Dashboard.tsx
│   ├── Bookings/
│   └── Admin/
├── Hooks/
├── Layouts/
└── Types/
```

### 3. Form Handling

Use Inertia Form or Livewire for form state management.

```tsx
import { useForm } from '@inertiajs/react';

const CreateBooking = () => {
    const { data, setData, post, processing, errors } = useForm({
        room_id: '',
        check_in: '',
        check_out: '',
        guests: [],
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/bookings');
    };
};
```

---

## Deployment & CI/CD

### 1. Environment Configuration

- Use `.env` for environment-specific values.
- Never commit `.env` to version control.
- Use `.env.example` as a template.

### 2. Deployment Checklist

```bash
# Production deployment steps
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize
```

### 3. CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-php@v5
        with:
          php-version: '8.3'
      - run: composer install
      - run: php artisan test
      - run: vendor/bin/pint --test
      - run: vendor/bin/phpstan analyse
```

### 4. Zero-Downtime Deployments

Use Laravel Envoy, Deployer, or Envoyer for atomic deployments.

### 5. Database Backups

Schedule automated backups.

```php
Schedule::command('backup:run')
    ->daily()
    ->at('02:00');
```

---

## Monitoring & Maintenance

### 1. Health Checks

```php
Route::get('/health', function () {
    return response()->json([
        'status' => 'healthy',
        'database' => DB::connection()->getPdo() ? 'connected' : 'disconnected',
        'cache' => Cache::has('health-check') ? 'working' : 'not working',
    ]);
});
```

### 2. Performance Monitoring

- Use Laravel Telescope for development.
- Use Blackfire or Xdebug for profiling.
- Monitor query performance with Laravel Debugbar.

### 3. Log Aggregation

Ship logs to ELK, Datadog, or CloudWatch.

### 4. Uptime Monitoring

Use Pingdom, UptimeRobot, or similar services.

---

## Checklist

### Architecture
- [ ] Layered architecture implemented (Presentation → Application → Domain → Infrastructure)
- [ ] Services/Actions contain business logic, controllers are thin
- [ ] DTOs and ValueObjects used for data transfer
- [ ] Repository pattern used for data access abstraction

### Code Quality
- [ ] PSR-12 compliant (use Laravel Pint)
- [ ] Strict types enabled (`declare(strict_types=1)`)
- [ ] Type hints on all methods and properties
- [ ] No dead code or commented-out blocks
- [ ] Meaningful variable and method names

### Security
- [ ] Form Request validation on all inputs
- [ ] Authorization via Policies
- [ ] CSRF protection enabled
- [ ] Rate limiting on sensitive endpoints
- [ ] SQL injection prevented (no raw concatenation)
- [ ] XSS protection (output escaping)
- [ ] Sensitive data encrypted at rest
- [ ] Security headers configured
- [ ] Secrets in `.env`, not in code

### Database
- [ ] Migrations for all schema changes
- [ ] Foreign keys and indexes defined
- [ ] N+1 queries prevented (eager loading)
- [ ] Transactions for multi-step operations
- [ ] Soft deletes where appropriate

### Testing
- [ ] Feature tests for all endpoints
- [ ] Unit tests for complex logic
- [ ] Factories and seeders for test data
- [ ] Architecture tests for rules enforcement

### Performance
- [ ] Caching configured for expensive operations
- [ ] Queue workers configured for async jobs
- [ ] Route and config caching in production
- [ ] Assets optimized and minified

### Deployment
- [ ] CI/CD pipeline configured
- [ ] Automated tests run on every PR
- [ ] Zero-downtime deployment process
- [ ] Database backups automated
- [ ] Monitoring and alerting in place

---

## Further Reading

- [Laravel Documentation](https://laravel.com/docs)
- [Laravel Best Practices](https://github.com/LetteraIO/laravel-best-practices)
- [Clean Code by Robert C. Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
- [Domain-Driven Design by Eric Evans](https://www.amazon.com/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215)
- [SOLID Principles of Object-Oriented Design](https://en.wikipedia.org/wiki/SOLID)

---

*This guide is a living document. Update it as the project evolves and new standards emerge.*
