<?php

namespace App\Support;

use App\Models\User;
use App\Notifications\RecordCreated;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Notifications\Notification;

class NotifyAdmins
{
    public static function notify(Notification $notification): void
    {
        static::users()->each(
            fn (User $user) => $user->notify($notification)
        );
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public static function recordCreated(string $entity, array $data): void
    {
        static::notify(new RecordCreated($entity, $data));
    }

    /**
     * @return Collection<int, User>
     */
    private static function users(): Collection
    {
        return User::query()
            ->whereHas('roles', fn ($query) => $query->whereIn('name', ['admin', 'super_admin']))
            ->get();
    }
}
