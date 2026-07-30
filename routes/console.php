<?php

use App\Console\Commands\EmailsImport;
use Illuminate\Support\Facades\Schedule;

Schedule::command(EmailsImport::class)->everyFiveMinutes()->withoutOverlapping();
