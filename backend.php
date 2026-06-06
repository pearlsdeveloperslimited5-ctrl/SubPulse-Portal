<?php
// backend.php - Shared helpers for Subscription Tracker
$dbFile = __DIR__ . '/database.json';

// Helper: read database
function readDb($dbFile) {
    if (!file_exists($dbFile)) {
        $defaultDb = [
            'user' => null,
            'subscriptions' => [],
            'logs' => [],
            'settings' => [
                'smtpHost' => '',
                'smtpPort' => '',
                'smtpUser' => '',
                'smtpPass' => '',
                'smtpFrom' => 'noreply@subscriptiontracker.local',
                'notificationEmail' => 'user@example.com'
            ],
            'sessions' => [],
            'systemDateOverride' => null
        ];
        file_put_contents($dbFile, json_encode($defaultDb, JSON_PRETTY_PRINT));
        return $defaultDb;
    }
    $data = json_decode(file_get_contents($dbFile), true);
    if (!isset($data['sessions'])) {
        $data['sessions'] = [];
    }
    if (!isset($data['systemDateOverride'])) {
        $data['systemDateOverride'] = null;
    }
    if (!isset($data['user'])) {
        $data['user'] = null;
    }
    if (!isset($data['accounts'])) {
        $data['accounts'] = [];
    }
    $requiredAccounts = [
        [ "code" => "1000", "name" => "Main Bank Account (Developers)", "type" => "Asset", "company" => "Pearls Developers Limited" ],
        [ "code" => "1010", "name" => "Main Bank Account (IT)", "type" => "Asset", "company" => "Pearls IT" ],
        [ "code" => "1200", "name" => "Accounts Receivable (Debtors)", "type" => "Asset", "company" => "All" ],
        [ "code" => "1300", "name" => "Investment & Property Assets", "type" => "Asset", "company" => "All" ],
        [ "code" => "2000", "name" => "Accounts Payable (Creditors)", "type" => "Liability", "company" => "All" ],
        [ "code" => "2200", "name" => "VAT/Tax Payable", "type" => "Liability", "company" => "All" ],
        [ "code" => "3000", "name" => "Retained Earnings", "type" => "Equity", "company" => "All" ],
        [ "code" => "4000", "name" => "Sales Services Revenue", "type" => "Revenue", "company" => "All" ],
        [ "code" => "4100", "name" => "Investment Revenue (Dividends/Returns)", "type" => "Revenue", "company" => "All" ],
        [ "code" => "4200", "name" => "Realized Gain/Loss on Exits", "type" => "Revenue", "company" => "All" ],
        [ "code" => "5000", "name" => "Hosting & Software Expense", "type" => "Expense", "company" => "All" ],
        [ "code" => "5100", "name" => "General & Admin Expense", "type" => "Expense", "company" => "All" ]
    ];
    foreach ($requiredAccounts as $req) {
        $found = false;
        foreach ($data['accounts'] as $acc) {
            if ($acc['code'] === $req['code']) {
                $found = true;
                break;
            }
        }
        if (!$found) {
            $data['accounts'][] = $req;
        }
    }
    if (!isset($data['investments'])) {
        $data['investments'] = [
            [
                "id" => "INV-101",
                "name" => "London Office Suite",
                "company" => "Pearls Developers Limited",
                "type" => "Property",
                "investorDetails" => "Pearls Developers Limited - Hammad",
                "initialValue" => 250000,
                "currentValue" => 275000,
                "purchaseDate" => "2025-01-10",
                "maturityDate" => "",
                "status" => "Active",
                "exitDate" => null,
                "exitValue" => null,
                "returns" => [
                    [
                        "id" => "ret_1",
                        "date" => "2025-06-10",
                        "amount" => 12000,
                        "type" => "Rental",
                        "status" => "Received",
                        "notes" => "H1 2025 Rental Income",
                        "journalEntryId" => "JE-MOCK-RET1",
                        "bankStatementId" => "BS-MOCK-RET1"
                    ]
                ]
            ],
            [
                "id" => "INV-102",
                "name" => "Government Treasury Bond 2028",
                "company" => "Pearls IT",
                "type" => "Bonds",
                "investorDetails" => "Pearls IT",
                "initialValue" => 50000,
                "currentValue" => 51200,
                "purchaseDate" => "2025-03-15",
                "maturityDate" => "2028-03-15",
                "status" => "Active",
                "exitDate" => null,
                "exitValue" => null,
                "returns" => [
                    [
                        "id" => "ret_2",
                        "date" => "2025-09-15",
                        "amount" => 1250,
                        "type" => "Interest",
                        "status" => "Received",
                        "notes" => "Semi-annual Coupon",
                        "journalEntryId" => "JE-MOCK-RET2",
                        "bankStatementId" => "BS-MOCK-RET2"
                    ],
                    [
                        "id" => "ret_3",
                        "date" => "2026-06-15",
                        "amount" => 1250,
                        "type" => "Interest",
                        "status" => "Pending",
                        "notes" => "Upcoming Coupon Payment"
                    ]
                ]
            ]
        ];
    }
    if (!isset($data['invoices'])) {
        $data['invoices'] = [];
    }
    if (!isset($data['expenses'])) {
        $data['expenses'] = [];
    }
    if (!isset($data['journalEntries'])) {
        $data['journalEntries'] = [];
    }
    if (!isset($data['bankStatements'])) {
        $data['bankStatements'] = [];
    }
    if (!isset($data['leads'])) {
        $data['leads'] = [];
    }
    if (!isset($data['tickets'])) {
        $data['tickets'] = [];
    }
    if (!isset($data['employees'])) {
        $data['employees'] = [
            [
                "id" => "EMP-101",
                "name" => "Hammad Arshad",
                "email" => "hammad@pearls-developers.co.uk",
                "phone" => "+44 7700 900077",
                "company" => "Pearls Developers Limited",
                "department" => "Management",
                "jobTitle" => "CEO & Founder",
                "joinDate" => "2024-01-01",
                "contractEndDate" => null,
                "status" => "Active",
                "leaveBalance" => [
                    "annual" => 28,
                    "sick" => 10,
                    "parental" => 5
                ],
                "documents" => [
                    [ "name" => "Employment Contract.pdf", "type" => "Contract", "uploadDate" => "2024-01-01" ],
                    [ "name" => "Passport Scan.pdf", "type" => "ID", "uploadDate" => "2024-01-01" ]
                ],
                "disciplinaryRecords" => []
            ],
            [
                "id" => "EMP-102",
                "name" => "Jane Doe",
                "email" => "jane.doe@pearls-developers.co.uk",
                "phone" => "+44 7700 900088",
                "company" => "Pearls Developers Limited",
                "department" => "Engineering",
                "jobTitle" => "Senior Full Stack Engineer",
                "joinDate" => "2025-03-01",
                "contractEndDate" => "2027-03-01",
                "status" => "Active",
                "leaveBalance" => [
                    "annual" => 24,
                    "sick" => 9,
                    "parental" => 5
                ],
                "documents" => [
                    [ "name" => "Jane_Contract_Final.pdf", "type" => "Contract", "uploadDate" => "2025-03-01" ]
                ],
                "disciplinaryRecords" => []
            ],
            [
                "id" => "EMP-103",
                "name" => "Bob Smith",
                "email" => "bob.smith@pearls-developers.co.uk",
                "phone" => "+44 7700 900099",
                "company" => "Pearls Developers Limited",
                "department" => "Sales",
                "jobTitle" => "Sales Executive",
                "joinDate" => "2025-06-01",
                "contractEndDate" => "2026-06-30",
                "status" => "Active",
                "leaveBalance" => [
                    "annual" => 28,
                    "sick" => 10,
                    "parental" => 5
                ],
                "documents" => [],
                "disciplinaryRecords" => []
            ],
            [
                "id" => "EMP-104",
                "name" => "Ehsan Khan",
                "email" => "ehsan@pearls-it.co.uk",
                "phone" => "+44 7700 900111",
                "company" => "Pearls IT",
                "department" => "Support",
                "jobTitle" => "Lead Support Engineer",
                "joinDate" => "2024-10-15",
                "contractEndDate" => null,
                "status" => "Active",
                "leaveBalance" => [
                    "annual" => 26,
                    "sick" => 8,
                    "parental" => 5
                ],
                "documents" => [
                    [ "name" => "SLA_Cert_ITIL.pdf", "type" => "Certificate", "uploadDate" => "2024-12-10" ]
                ],
                "disciplinaryRecords" => []
            ],
            [
                "id" => "EMP-105",
                "name" => "Alice Johnson",
                "email" => "alice@pearls-it.co.uk",
                "phone" => "+44 7700 900222",
                "company" => "Pearls IT",
                "department" => "Consulting",
                "jobTitle" => "IT Consultant",
                "joinDate" => "2025-01-15",
                "contractEndDate" => "2026-12-31",
                "status" => "Active",
                "leaveBalance" => [
                    "annual" => 28,
                    "sick" => 10,
                    "parental" => 5
                ],
                "documents" => [],
                "disciplinaryRecords" => []
            ]
        ];
    }
    if (!isset($data['leaves'])) {
        $data['leaves'] = [
            [
                "id" => "LV-101",
                "employeeId" => "EMP-102",
                "employeeName" => "Jane Doe",
                "company" => "Pearls Developers Limited",
                "leaveType" => "Annual",
                "startDate" => "2026-06-08",
                "endDate" => "2026-06-12",
                "status" => "Pending",
                "notes" => "Family trip"
            ],
            [
                "id" => "LV-102",
                "employeeId" => "EMP-104",
                "employeeName" => "Ehsan Khan",
                "company" => "Pearls IT",
                "leaveType" => "Sick",
                "startDate" => "2026-06-02",
                "endDate" => "2026-06-03",
                "status" => "Approved",
                "notes" => "Doctor recommended bed rest"
            ]
        ];
    }
    if (!isset($data['attendance'])) {
        $data['attendance'] = [
            [
                "id" => "ATT-101",
                "employeeId" => "EMP-101",
                "employeeName" => "Hammad Arshad",
                "company" => "Pearls Developers Limited",
                "date" => "2026-06-05",
                "status" => "Present",
                "checkIn" => "08:55",
                "checkOut" => "17:30"
            ],
            [
                "id" => "ATT-102",
                "employeeId" => "EMP-102",
                "employeeName" => "Jane Doe",
                "company" => "Pearls Developers Limited",
                "date" => "2026-06-05",
                "status" => "Late",
                "checkIn" => "09:45",
                "checkOut" => "17:00"
            ]
        ];
    }
    if (!isset($data['performanceReviews'])) {
        $data['performanceReviews'] = [
            [
                "id" => "PR-101",
                "employeeId" => "EMP-102",
                "employeeName" => "Jane Doe",
                "company" => "Pearls Developers Limited",
                "reviewDate" => "2025-12-20",
                "reviewer" => "Hammad Arshad",
                "score" => 5,
                "feedback" => "Exceptional code quality and sprint deliveries."
            ],
            [
                "id" => "PR-102",
                "employeeId" => "EMP-104",
                "employeeName" => "Ehsan Khan",
                "company" => "Pearls IT",
                "reviewDate" => "2025-12-18",
                "reviewer" => "Hammad Arshad",
                "score" => 4,
                "feedback" => "Very responsive to support SLA tickets and great customer feedback."
            ]
        ];
    }
    if (!isset($data['itTasks'])) {
        $data['itTasks'] = [
            [
                "id" => "TSK-1001",
                "title" => "Routine Server OS Patches & Security Updates",
                "type" => "SysAdmin",
                "category" => "Server Maintenance",
                "status" => "Closed",
                "priority" => "Medium",
                "assignedTo" => "Ehsan Khan",
                "estimatedHours" => 4,
                "actualHours" => 3.5,
                "dateCreated" => "2026-05-15",
                "dueDate" => "2026-05-20",
                "dateCompleted" => "2026-05-18",
                "notes" => "Applied latest Ubuntu kernel security patches and rebooted the server. Uptime verified.",
                "website" => ""
            ],
            [
                "id" => "TSK-1002",
                "title" => "Weekly Database Backup Verification",
                "type" => "SysAdmin",
                "category" => "Backup Schedule",
                "status" => "Resolved",
                "priority" => "High",
                "assignedTo" => "Ehsan Khan",
                "estimatedHours" => 2,
                "actualHours" => 2,
                "dateCreated" => "2026-06-01",
                "dueDate" => "2026-06-02",
                "dateCompleted" => "2026-06-01",
                "notes" => "Successfully restored weekly database backup to staging environment. Integrity check passed.",
                "website" => ""
            ],
            [
                "id" => "TSK-1003",
                "title" => "Renew SSL Certificate for tracker.pearls-developers-limited.co.uk",
                "type" => "SysAdmin",
                "category" => "SSL Renewal",
                "status" => "Open",
                "priority" => "Critical",
                "assignedTo" => "Ehsan Khan",
                "estimatedHours" => 1,
                "actualHours" => 0,
                "dateCreated" => "2026-06-03",
                "dueDate" => "2026-06-10",
                "dateCompleted" => null,
                "notes" => "SSL certificate expires in 5 days. Needs Let's Encrypt auto-renew script verification.",
                "website" => ""
            ],
            [
                "id" => "TSK-1004",
                "title" => "Firewall Review & Port Audit",
                "type" => "SysAdmin",
                "category" => "Firewall Review",
                "status" => "Blocked",
                "priority" => "Medium",
                "assignedTo" => "Hammad Arshad",
                "estimatedHours" => 6,
                "actualHours" => 2,
                "dateCreated" => "2026-06-04",
                "dueDate" => "2026-06-08",
                "dateCompleted" => null,
                "notes" => "Blocked waiting for access credentials to the external router management panel.",
                "website" => ""
            ],
            [
                "id" => "TSK-1005",
                "title" => "Implement Client Portal Layout Updates",
                "type" => "WebDev",
                "category" => "Development",
                "status" => "In Progress",
                "priority" => "High",
                "assignedTo" => "Jane Doe",
                "website" => "tracker.pearls-developers-limited.co.uk",
                "estimatedHours" => 16,
                "actualHours" => 8,
                "githubCommit" => "",
                "dateCreated" => "2026-06-02",
                "dueDate" => "2026-06-07",
                "dateCompleted" => null,
                "notes" => "Working on layout responsiveness for mobile screens and fixing floating containers."
            ],
            [
                "id" => "TSK-1006",
                "title" => "Integrate Investments Module API Endpoints",
                "type" => "WebDev",
                "category" => "Development",
                "status" => "Closed",
                "priority" => "Critical",
                "assignedTo" => "Jane Doe",
                "website" => "tracker.pearls-developers-limited.co.uk",
                "estimatedHours" => 12,
                "actualHours" => 14,
                "githubCommit" => "feat(investments): add portfolio api #103",
                "dateCreated" => "2026-06-03",
                "dueDate" => "2026-06-05",
                "dateCompleted" => "2026-06-05",
                "notes" => "Completed investments CRUD, journal bookings, and yields scheduler. Pushed to main."
            ],
            [
                "id" => "TSK-1007",
                "title" => "Sprint 3 Planning & Task Assignments",
                "type" => "WebDev",
                "category" => "Sprint Planning",
                "status" => "Open",
                "priority" => "Low",
                "assignedTo" => "Hammad Arshad",
                "website" => "All",
                "estimatedHours" => 3,
                "actualHours" => 0,
                "githubCommit" => "",
                "dateCreated" => "2026-06-05",
                "dueDate" => "2026-06-12",
                "dateCompleted" => null,
                "notes" => "Preparing sprint backlog for the upcoming development cycles."
            ]
        ];
    }
    if (!isset($data['itIncidents'])) {
        $data['itIncidents'] = [
            [
                "id" => "INC-1001",
                "title" => "Main Database Connectivity Outage",
                "severity" => "Critical",
                "date" => "2026-05-28",
                "status" => "Resolved",
                "rootCause" => "Connection pool exhausted due to unindexed query in sales analytics report.",
                "resolution" => "Restarted database service, increased connection limit, and added index on lead creation date."
            ],
            [
                "id" => "INC-1002",
                "title" => "High Memory Utilization Alert on Web Node 1",
                "severity" => "High",
                "date" => "2026-06-04",
                "status" => "Investigating",
                "rootCause" => "Memory leak suspected in server-side session clean-up script.",
                "resolution" => ""
            ]
        ];
    }
    if (!isset($data['itChanges'])) {
        $data['itChanges'] = [
            [
                "id" => "CHG-1001",
                "title" => "Apply Server OS Kernels Security Patches",
                "requestedBy" => "Ehsan Khan",
                "dateScheduled" => "2026-05-18",
                "status" => "Implemented",
                "impact" => "Medium",
                "testingNotes" => "Verified system reboot and service availability. Uptime logged."
            ],
            [
                "id" => "CHG-1002",
                "title" => "Deploy New Investments Module Backend & Database Update",
                "requestedBy" => "Jane Doe",
                "dateScheduled" => "2026-06-05",
                "status" => "Approved",
                "impact" => "High",
                "testingNotes" => "Local JSDOM checks passed. Backup remote database before schema deployment."
            ]
        ];
    }
    if (!isset($data['itDeployments'])) {
        $data['itDeployments'] = [
            [
                "id" => "DEP-1001",
                "website" => "tracker.pearls-developers-limited.co.uk",
                "version" => "v1.7.0",
                "deployDate" => "2026-06-05",
                "deployedBy" => "Jane Doe",
                "commitRef" => "fix(layout): close stray div and fix mobile stacking #109",
                "status" => "Success"
            ],
            [
                "id" => "DEP-1002",
                "website" => "tracker.pearls-developers-limited.co.uk",
                "version" => "v1.8.0",
                "deployDate" => "2026-06-05",
                "deployedBy" => "Jane Doe",
                "commitRef" => "feat(investments): release portfolio manager #110",
                "status" => "Success"
            ]
        ];
    }
    return $data;
}

// Helper: write database
function writeDb($dbFile, $data) {
    return file_put_contents($dbFile, json_encode($data, JSON_PRETTY_PRINT)) !== false;
}

// Date Helpers
function getSystemDate($db) {
    if (!empty($db['systemDateOverride'])) {
        return new DateTime($db['systemDateOverride']);
    }
    return new DateTime();
}

function calculateNextPaymentDate($lastPayDateStr, $billingCycle) {
    $parts = explode('-', $lastPayDateStr);
    if (count($parts) !== 3) return null;
    
    $year = (int)$parts[0];
    $month = (int)$parts[1];
    $day = (int)$parts[2];
    
    $date = new DateTime("$year-$month-$day");
    
    if ($billingCycle === 'weekly') {
        $date->modify('+7 days');
    } else if ($billingCycle === 'monthly') {
        $expectedMonth = ($month) % 12 + 1;
        $date->modify('+1 month');
        if ((int)$date->format('m') !== $expectedMonth) {
            $date->modify('last day of previous month');
        }
    } else if ($billingCycle === 'quarterly') {
        $expectedMonth = ($month + 2) % 12 + 1;
        $date->modify('+3 months');
        if ((int)$date->format('m') !== $expectedMonth) {
            $date->modify('last day of previous month');
        }
    } else if ($billingCycle === 'yearly') {
        $expectedMonth = $month;
        $date->modify('+1 year');
        if ((int)$date->format('m') !== $expectedMonth) {
            $date->modify('last day of previous month');
        }
    }
    return $date->format('Y-m-d');
}

function getDaysDifference($targetDateStr, $baseDate) {
    $d1 = new DateTime($targetDateStr);
    $d2 = clone $baseDate;
    $d1->setTime(0, 0, 0);
    $d2->setTime(0, 0, 0);
    
    $diff = $d2->diff($d1);
    return (int)$diff->format("%r%a");
}

// SMTP Email Sender
function sendSmtpEmail($host, $port, $user, $pass, $from, $to, $subject, $text, $html) {
    $boundary = uniqid('np');
    
    $fromDomain = 'localhost';
    $atPos = strrpos($from, '@');
    if ($atPos !== false) {
        $fromDomain = rtrim(substr($from, $atPos + 1), '>');
    }
    
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "From: $from\r\n";
    $headers .= "To: $to\r\n";
    $headers .= "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
    $headers .= "Content-Type: multipart/alternative; boundary=\"$boundary\"\r\n";
    $headers .= "Date: " . date('r') . "\r\n";
    $headers .= "Message-ID: <" . uniqid() . "@" . $fromDomain . ">\r\n";
    
    $body = "--$boundary\r\n";
    $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
    $body .= $text . "\r\n\r\n";
    
    $body .= "--$boundary\r\n";
    $body .= "Content-Type: text/html; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $body .= chunk_split(base64_encode($html)) . "\r\n";
    $body .= "--$boundary--\r\n";
    
    $message = $headers . "\r\n" . $body;

    $socket = @stream_socket_client(($port == 465 ? "ssl://" : "") . "$host:$port", $errno, $errstr, 15);
    if (!$socket) {
        throw new Exception("Connection failed: $errstr ($errno)");
    }
    
    $readResponse = function($socket) {
        $response = "";
        while ($line = fgets($socket, 515)) {
            $response .= $line;
            if (substr($line, 3, 1) == " ") break;
        }
        return $response;
    };
    
    $readResponse($socket);
    
    fwrite($socket, "EHLO " . gethostname() . "\r\n");
    $readResponse($socket);
    
    if ($port == 587) {
        fwrite($socket, "STARTTLS\r\n");
        $res = $readResponse($socket);
        if (strpos($res, '220') === false) {
            throw new Exception("STARTTLS failed: $res");
        }
        if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            throw new Exception("Crypto enable failed");
        }
        fwrite($socket, "EHLO " . gethostname() . "\r\n");
        $readResponse($socket);
    }
    
    fwrite($socket, "AUTH LOGIN\r\n");
    $readResponse($socket);
    
    fwrite($socket, base64_encode($user) . "\r\n");
    $readResponse($socket);
    
    fwrite($socket, base64_encode($pass) . "\r\n");
    $res = $readResponse($socket);
    if (strpos($res, '235') === false) {
        throw new Exception("Auth failed: $res");
    }
    
    $mailFrom = $from;
    if (preg_match('/<([^>]+)>/', $from, $matches)) {
        $mailFrom = $matches[1];
    }
    
    fwrite($socket, "MAIL FROM:<$mailFrom>\r\n");
    $readResponse($socket);
    
    fwrite($socket, "RCPT TO:<$to>\r\n");
    $readResponse($socket);
    
    fwrite($socket, "DATA\r\n");
    $readResponse($socket);
    
    $message = str_replace("\r\n.", "\r\n..", $message);
    
    fwrite($socket, $message . "\r\n.\r\n");
    $res = $readResponse($socket);
    if (strpos($res, '250') === false) {
        throw new Exception("Data transfer failed: $res");
    }
    
    fwrite($socket, "QUIT\r\n");
    fclose($socket);
    return true;
}

function sendNotificationEmail($settings, $toEmail, $subject, $textContent, $htmlContent) {
    $smtpHost = isset($settings['smtpHost']) ? trim($settings['smtpHost']) : '';
    $smtpUser = isset($settings['smtpUser']) ? trim($settings['smtpUser']) : '';
    $smtpPass = $settings['smtpPass'] ?? '';
    
    $isSmtpConfigured = !empty($smtpHost) && !empty($smtpUser) && !empty($smtpPass);
    if ($isSmtpConfigured) {
        $smtpPort = isset($settings['smtpPort']) ? (int)trim($settings['smtpPort']) : 587;
        $smtpFrom = isset($settings['smtpFrom']) ? trim($settings['smtpFrom']) : $smtpUser;
        try {
            $fromHeader = $smtpFrom;
            if (strpos($fromHeader, '<') === false) {
                $fromHeader = "SubPulse Tracker <$fromHeader>";
            }
            sendSmtpEmail($smtpHost, $smtpPort, $smtpUser, $smtpPass, $fromHeader, $toEmail, $subject, $textContent, $htmlContent);
            return ['status' => 'success', 'type' => 'real', 'detail' => "Sent via SMTP to $toEmail."];
        } catch (Exception $e) {
            return ['status' => 'failed', 'type' => 'real', 'detail' => "SMTP Error: " . $e->getMessage() . ". Mock email logged."];
        }
    } else {
        return ['status' => 'success', 'type' => 'mock', 'detail' => "SMTP not configured. Logged mock notification to $toEmail."];
    }
}

// Reminder check logic
function runReminderChecks(&$db) {
    $currentDate = getSystemDate($db);
    $currentDateStr = $currentDate->format('Y-m-d');
    $dbModified = false;
    $notificationsTriggered = [];
    
    foreach ($db['subscriptions'] as &$sub) {
        if (empty($sub['nextPaymentDate'])) continue;
        
        $daysDiff = getDaysDifference($sub['nextPaymentDate'], $currentDate);
        $recipientEmail = !empty($sub['email']) ? $sub['email'] : (!empty($db['settings']['notificationEmail']) ? $db['settings']['notificationEmail'] : 'user@example.com');
        
        $shouldNotify = false;
        $reminderType = '';
        $notificationFlag = '';
        
        if ($daysDiff <= 5 && $daysDiff > 3 && empty($sub['notified5Days'])) {
            $shouldNotify = true;
            $reminderType = '5-Day Warning';
            $notificationFlag = 'notified5Days';
        } else if ($daysDiff <= 3 && $daysDiff > 0 && empty($sub['notified3Days'])) {
            $shouldNotify = true;
            $reminderType = '3-Day Warning';
            $notificationFlag = 'notified3Days';
        } else if ($daysDiff <= 0 && empty($sub['notifiedDueDay'])) {
            $shouldNotify = true;
            $reminderType = 'FINAL Due Day Reminder';
            $notificationFlag = 'notifiedDueDay';
        }
        
        if ($shouldNotify) {
            $subject = "[Reminder] $reminderType: {$sub['name']} subscription payment is due";
            $daysText = '';
            if (strpos($reminderType, '5-Day') !== false) $daysText = 'is due in 5 days';
            else if (strpos($reminderType, '3-Day') !== false) $daysText = 'is due in 3 days';
            else $daysText = 'is due TODAY';
            
            $textContent = "Hi,\n\nThis is a reminder that your subscription for {$sub['name']} costing " . ($sub['currency'] ?? '$') . "{$sub['cost']} is due on {$sub['nextPaymentDate']} ($daysText).\n\nPlease pay on time!\n\nBest regards,\nSubscription Tracker System";
            
            $htmlContent = '
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff; color: #333333;">
              <h2 style="color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px; margin-top: 0;">Subscription Due Reminder</h2>
              <p>Hi there,</p>
              <p>This is to remind you that your subscription for <strong>' . htmlspecialchars($sub['name']) . '</strong> is due soon.</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Subscription:</strong> ' . htmlspecialchars($sub['name']) . '</p>
                <p style="margin: 5px 0;"><strong>Cost:</strong> ' . ($sub['currency'] ?? '$') . $sub['cost'] . ' (' . $sub['billingCycle'] . ')</p>
                <p style="margin: 5px 0;"><strong>Due Date:</strong> ' . $sub['nextPaymentDate'] . ' (' . $daysText . ')</p>
              </div>
              <p>Please make sure to pay before the due date to avoid service disruption.</p>
              <p style="margin-top: 30px; font-size: 12px; color: #888888; border-top: 1px solid #eeeeee; padding-top: 10px;">
                Sent by Subscription Tracker | System Simulated Date: ' . $currentDateStr . '
              </p>
            </div>';
            
            $result = sendNotificationEmail($db['settings'], $recipientEmail, $subject, $textContent, $htmlContent);
            
            $logEntry = [
                'id' => Date('U') . bin2hex(random_bytes(2)),
                'timestamp' => date('c'),
                'simulatedDate' => $currentDateStr,
                'subscriptionName' => $sub['name'],
                'recipient' => $recipientEmail,
                'subject' => $subject,
                'body' => $textContent,
                'type' => $result['type'],
                'status' => $result['status'],
                'detail' => $result['detail']
            ];
            
            array_unshift($db['logs'], $logEntry);
            $sub[$notificationFlag] = true;
            $dbModified = true;
            
            $notificationsTriggered[] = [
                'subName' => $sub['name'],
                'type' => $reminderType,
                'recipient' => $recipientEmail,
                'result' => $result['status']
            ];
        }
    }
    
    foreach ($db['subscriptions'] as &$sub) {
        if (empty($sub['nextPaymentDate'])) continue;
        $daysDiff = getDaysDifference($sub['nextPaymentDate'], $currentDate);
        $originalStatus = $sub['status'] ?? '';
        if ($daysDiff < 0) {
            $sub['status'] = 'unpaid';
        } else if ($daysDiff <= 5) {
            $sub['status'] = 'due_soon';
        } else {
            $sub['status'] = 'active';
        }
        if ($originalStatus !== $sub['status']) {
            $dbModified = true;
        }
    }
    
    return [$notificationsTriggered, $dbModified];
}

// Authentication Helpers
function getBearerToken() {
    $headers = null;
    if (isset($_SERVER['Authorization'])) {
        $headers = trim($_SERVER["Authorization"]);
    } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
    } elseif (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
        if (isset($requestHeaders['Authorization'])) {
            $headers = trim($requestHeaders['Authorization']);
        }
    }
    if (!empty($headers)) {
        if (preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
            return $matches[1];
        }
    }
    return null;
}

function verifyAuth($db) {
    $token = getBearerToken();
    if (!$token) {
        http_response_code(401);
        echo json_encode(["error" => "Unauthorized. No token provided."]);
        exit;
    }
    if (!isset($db['sessions']) || !isset($db['sessions'][$token])) {
        http_response_code(401);
        echo json_encode(["error" => "Unauthorized. Invalid token."]);
        exit;
    }
    return $db['sessions'][$token];
}
?>
