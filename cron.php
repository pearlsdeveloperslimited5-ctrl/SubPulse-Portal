<?php
// cron.php - Scheduled alert runner for Subscription Tracker
header('Content-Type: text/plain');

require_once __DIR__ . '/backend.php';

$db = readDb($dbFile);

echo "Running daily reminder checks...\n";
list($triggered, $dbModified) = runReminderChecks($db);

if ($dbModified) {
    writeDb($dbFile, $db);
    echo "Database updated.\n";
}

echo "Scheduler check complete. Triggered notifications: " . count($triggered) . "\n";
foreach ($triggered as $notif) {
    echo "- Subscription: {$notif['subName']}, Type: {$notif['type']}, Recipient: {$notif['recipient']}, Status: {$notif['result']}\n";
}
?>
