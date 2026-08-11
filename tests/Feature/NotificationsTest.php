<?php

use App\Models\User;
use App\Notifications\NewEmailImport;
use App\Notifications\PurchaseOrderReminder;
use App\Notifications\RecordCreated;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

function createDatabaseNotification(User $user, array $data = []): \Illuminate\Notifications\DatabaseNotification
{
    return $user->notifications()->create([
        'id' => Str::uuid()->toString(),
        'type' => NewEmailImport::class,
        'data' => array_merge([
            'subject' => 'Test PO',
            'from_email' => 'supplier@example.com',
            'supplier_name' => 'Acme Supplies',
            'po_number' => 'PO-123',
            'total_amount' => '5000',
            'currency' => 'BDT',
        ], $data),
    ]);
}

test('guests are redirected from the notifications page', function () {
    $this->get('/notifications')->assertRedirect(route('login'));
});

test('guests cannot mutate notifications', function () {
    $this->post('/notifications/read-all')->assertRedirect(route('login'));
    $this->post('/notifications/abc/read')->assertRedirect(route('login'));
    $this->delete('/notifications/abc')->assertRedirect(route('login'));
});

test('authenticated users can view their notifications', function () {
    $user = User::factory()->create();
    createDatabaseNotification($user);

    $this->actingAs($user)->get('/notifications')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('noor-hotel/notifications')
            ->has('notifications.data', 1)
            ->where('notifications.data.0.title', 'New Email Import')
            ->where('notifications.data.0.body', 'Acme Supplies · PO-123 · Test PO · Amount: 5000 BDT')
            ->where('unread_count', 1)
        );
});

test('users do not see other users notifications', function () {
    $other = User::factory()->create();
    createDatabaseNotification($other);

    $user = User::factory()->create();

    $this->actingAs($user)->get('/notifications')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('noor-hotel/notifications')
            ->where('notifications.pagination.total', 0)
            ->where('unread_count', 0)
        );
});

test('users can mark a single notification as read', function () {
    $user = User::factory()->create();
    $notification = createDatabaseNotification($user);

    $this->actingAs($user)
        ->post("/notifications/{$notification->id}/read")
        ->assertRedirect();

    expect($notification->fresh()->read_at)->not->toBeNull();
});

test('users can mark all notifications as read', function () {
    $user = User::factory()->create();
    createDatabaseNotification($user);
    createDatabaseNotification($user, ['subject' => 'Second PO', 'po_number' => 'PO-124']);

    $this->actingAs($user)
        ->post('/notifications/read-all')
        ->assertRedirect();

    expect($user->unreadNotifications()->count())->toBe(0);
});

test('users can delete a notification', function () {
    $user = User::factory()->create();
    $notification = createDatabaseNotification($user);

    $this->actingAs($user)
        ->delete("/notifications/{$notification->id}")
        ->assertRedirect();

    $this->assertDatabaseMissing('notifications', ['id' => $notification->id]);
});

test('purchase order reminders render with title and body', function () {
    $user = User::factory()->create();
    $user->notifications()->create([
        'id' => Str::uuid()->toString(),
        'type' => PurchaseOrderReminder::class,
        'data' => [
            'code' => 'PO-0001',
            'name' => 'Rice',
            'party' => 'Acme Traders',
        ],
    ]);

    $this->actingAs($user)->get('/notifications')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('notifications.data.0.title', 'PO Reminder')
            ->where('notifications.data.0.body', 'PO-0001 · Rice · Acme Traders')
        );
});

test('record created notifications render per entity', function () {
    $user = User::factory()->create();

    $cases = [
        'party' => ['party_name' => 'Acme Traders', 'title' => 'New Party', 'body' => 'Acme Traders'],
        'purchase_order' => ['code' => 'PO-0001', 'party' => 'Acme Traders', 'amount' => 1000, 'title' => 'New Purchase Order', 'body' => 'PO-0001 · Acme Traders · Amount: 1000'],
        'challan' => ['challan_number' => 'CHL-1', 'po_number' => 'PO-0001', 'amount' => 500, 'title' => 'New Challan', 'body' => 'CHL-1 · PO: PO-0001 · Amount: 500'],
        'invoice' => ['invoice_number' => 'INV-1', 'party' => 'Acme Traders', 'amount' => 1100, 'title' => 'New Invoice', 'body' => 'INV-1 · Acme Traders · Amount: 1100'],
        'payment' => ['invoice_number' => 'INV-1', 'party' => 'Acme Traders', 'amount' => 1100, 'title' => 'New Payment', 'body' => 'INV-1 · Acme Traders · Amount: 1100'],
    ];

    $index = 0;

    foreach ($cases as $entity => $case) {
        $user->notifications()->create([
            'id' => Str::uuid()->toString(),
            'type' => RecordCreated::class,
            'data' => array_merge(['entity' => $entity], collect($case)->except(['title', 'body'])->all()),
        ]);

        $this->actingAs($user)->get('/notifications')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where("notifications.data.{$index}.title", $case['title'])
                ->where("notifications.data.{$index}.body", $case['body'])
            );

        $index++;
    }
});
