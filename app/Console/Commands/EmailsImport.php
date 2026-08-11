<?php

namespace App\Console\Commands;

use App\Models\EmailedPurchaseOrder;
use App\Notifications\NewEmailImport;
use App\Support\NotifyAdmins;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Webklex\IMAP\Facades\Client as IMAP;

#[Signature('emails:import')]
#[Description('Fetch unseen emails and store them for review')]
class EmailsImport extends Command
{
    protected $description = 'Fetch unseen emails and store them for review';

    public function handle(): int
    {
        $client = IMAP::account('default');
        $client->connect();

        $folder = $client->getFolder('INBOX');
        $messages = $folder->query()->unseen()->limit(10)->get();

        if ($messages->isEmpty()) {
            $this->info('No unseen emails found.');

            return self::SUCCESS;
        }

        $this->info("Found {$messages->count()} unseen email(s).");

        foreach ($messages as $message) {
            $this->processMessage($message);
        }

        $client->disconnect();

        $this->info('Email import completed.');

        return self::SUCCESS;
    }

    protected function processMessage($message): void
    {
        $messageId = (string) $message->getMessageId();

        if (EmailedPurchaseOrder::where('message_id', $messageId)->exists()) {
            $this->warn("Email {$messageId} already imported. Skipping.");

            return;
        }

        $from = $message->getFrom()[0] ?? null;
        $fromEmail = $from?->mail ?? 'unknown@unknown.com';
        $fromName = $from?->personal ?? null;
        $subject = (string) $message->getSubject() ?? '(No Subject)';
        $body = $message->getTextBody() ?? '';
        $htmlBody = $message->getHTMLBody() ?? '';
        $date = $message->getDate()?->toDate() ?? now();

        $this->line("Processing: {$subject}");

        $record = EmailedPurchaseOrder::create([
            'message_id' => $messageId,
            'from_email' => $fromEmail,
            'from_name' => $fromName,
            'subject' => $subject,
            'body' => $body,
            'html_body' => $htmlBody,
            'email_date' => $date,
            'type' => 'general',
            'status' => 'new',
            'imported_at' => now(),
        ]);

        $this->info("Stored: {$subject}");

        NotifyAdmins::notify(new NewEmailImport($record));

        $message->setFlag('SEEN');
    }
}
