<?php

use App\Console\Commands\EmailsImport;
use App\Console\Commands\ProcessPurchaseOrderReminders;
use Illuminate\Support\Facades\Schedule;

Schedule::command(EmailsImport::class)->everyFiveMinutes()->withoutOverlapping();
Schedule::command(ProcessPurchaseOrderReminders::class)->everyMinute()->withoutOverlapping();
