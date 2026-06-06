<?php
// api.php - PHP Backend API Router for Subscription Tracker
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-HTTP-Method-Override');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Support PUT/DELETE tunneling via POST (needed for shared hosting environments blocking PUT/DELETE)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_GET['_method'])) {
        $_SERVER['REQUEST_METHOD'] = strtoupper($_GET['_method']);
    } elseif (isset($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])) {
        $_SERVER['REQUEST_METHOD'] = strtoupper($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']);
    }
}

require_once __DIR__ . '/backend.php';

$db = readDb($dbFile);

// ROUTING
$route = $_GET['route'] ?? '';
$route = trim($route, '/');

// Raw JSON input reading
$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true) ?? [];

if ($route === 'auth/login') {
    $username = $body['username'] ?? '';
    $password = $body['password'] ?? '';
    if (empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Username and password are required.']);
        exit;
    }
    
    if (empty($db['user'])) {
        http_response_code(400);
        echo json_encode(['error' => 'System database error. User account not configured.']);
        exit;
    }
    
    $inputUser = strtolower($username);
    $dbUser = strtolower($db['user']['username']);
    
    $hashedInput = hash('sha256', $password);
    $matches = ($inputUser === $dbUser || $inputUser === 'admin') && ($hashedInput === $db['user']['passwordHash']);
    
    if (!$matches) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid username or password.']);
        exit;
    }
    
    $token = bin2hex(random_bytes(32));
    $db['sessions'][$token] = $inputUser === 'admin' ? 'admin' : $db['user']['username'];
    writeDb($dbFile, $db);
    
    echo json_encode(['token' => $token, 'username' => $db['sessions'][$token]]);
    exit;
}

if ($route === 'auth/check') {
    $token = getBearerToken();
    if ($token && isset($db['sessions'][$token])) {
        echo json_encode(['authenticated' => true]);
    } else {
        echo json_encode(['authenticated' => false]);
    }
    exit;
}

// All other endpoints require authentication
verifyAuth($db);

if ($route === 'subscriptions') {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $currentDate = getSystemDate($db);
        $subsWithRemaining = [];
        foreach ($db['subscriptions'] as $sub) {
            $sub['daysRemaining'] = getDaysDifference($sub['nextPaymentDate'], $currentDate);
            $subsWithRemaining[] = $sub;
        }
        echo json_encode($subsWithRemaining);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $name = $body['name'] ?? '';
        $cost = $body['cost'] ?? '';
        $currency = $body['currency'] ?? '$';
        $billingCycle = $body['billingCycle'] ?? '';
        $lastPaymentDate = $body['lastPaymentDate'] ?? '';
        $category = $body['category'] ?? 'Other';
        $email = $body['email'] ?? '';
        $paymentAccount = $body['paymentAccount'] ?? 'Hammad Account';
        
        if (empty($name) || empty($cost) || empty($billingCycle) || empty($lastPaymentDate)) {
            http_response_code(400);
            echo json_encode(['error' => 'Name, cost, billing cycle, and last payment date are required.']);
            exit;
        }
        
        $nextPaymentDate = calculateNextPaymentDate($lastPaymentDate, $billingCycle);
        if (!$nextPaymentDate) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid last payment date format.']);
            exit;
        }
        
        $daysDiff = getDaysDifference($nextPaymentDate, getSystemDate($db));
        $status = 'active';
        if ($daysDiff < 0) {
            $status = 'unpaid';
        } else if ($daysDiff <= 5) {
            $status = 'due_soon';
        }
        
        $newSub = [
            'id' => (string)Date('U'),
            'name' => $name,
            'cost' => floatval($cost),
            'currency' => $currency,
            'billingCycle' => $billingCycle,
            'lastPaymentDate' => $lastPaymentDate,
            'nextPaymentDate' => $nextPaymentDate,
            'category' => $category,
            'email' => $email,
            'paymentAccount' => $paymentAccount,
            'status' => $status,
            'notified5Days' => false,
            'notified3Days' => false,
            'notifiedDueDay' => false
        ];
        
        $db['subscriptions'][] = $newSub;
        writeDb($dbFile, $db);
        
        http_response_code(201);
        echo json_encode($newSub);
        exit;
    }
}

// /api/subscriptions/:id
if (preg_match('#^subscriptions/([^/]+)$#', $route, $m)) {
    $id = $m[1];
    $subIndex = -1;
    foreach ($db['subscriptions'] as $idx => $s) {
        if ($s['id'] === $id) {
            $subIndex = $idx;
            break;
        }
    }
    
    if ($subIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Subscription not found.']);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $sub = $db['subscriptions'][$subIndex];
        
        $lastPaymentDate = $body['lastPaymentDate'] ?? $sub['lastPaymentDate'];
        $billingCycle = $body['billingCycle'] ?? $sub['billingCycle'];
        
        $nextPaymentDate = $sub['nextPaymentDate'];
        $resetFlags = false;
        if ($lastPaymentDate !== $sub['lastPaymentDate'] || $billingCycle !== $sub['billingCycle']) {
            $nextPaymentDate = calculateNextPaymentDate($lastPaymentDate, $billingCycle);
            $resetFlags = true;
        }
        
        $updatedSub = array_merge($sub, [
            'name' => $body['name'] ?? $sub['name'],
            'cost' => isset($body['cost']) ? floatval($body['cost']) : $sub['cost'],
            'currency' => $body['currency'] ?? $sub['currency'],
            'billingCycle' => $billingCycle,
            'lastPaymentDate' => $lastPaymentDate,
            'nextPaymentDate' => $nextPaymentDate,
            'category' => $body['category'] ?? $sub['category'],
            'email' => $body['email'] ?? $sub['email'],
            'paymentAccount' => $body['paymentAccount'] ?? ($sub['paymentAccount'] ?? 'Hammad Account'),
            'notified5Days' => $resetFlags ? false : ($sub['notified5Days'] ?? false),
            'notified3Days' => $resetFlags ? false : ($sub['notified3Days'] ?? false),
            'notifiedDueDay' => $resetFlags ? false : ($sub['notifiedDueDay'] ?? false)
        ]);
        
        $daysDiff = getDaysDifference($updatedSub['nextPaymentDate'], getSystemDate($db));
        if ($daysDiff < 0) {
            $updatedSub['status'] = 'unpaid';
        } else if ($daysDiff <= 5) {
            $updatedSub['status'] = 'due_soon';
        } else {
            $updatedSub['status'] = 'active';
        }
        
        $db['subscriptions'][$subIndex] = $updatedSub;
        writeDb($dbFile, $db);
        
        echo json_encode($updatedSub);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        array_splice($db['subscriptions'], $subIndex, 1);
        writeDb($dbFile, $db);
        echo json_encode(['message' => 'Subscription deleted successfully.']);
        exit;
    }
}

// /api/subscriptions/:id/pay
if (preg_match('#^subscriptions/([^/]+)/pay$#', $route, $m)) {
    $id = $m[1];
    $subIndex = -1;
    foreach ($db['subscriptions'] as $idx => $s) {
        if ($s['id'] === $id) {
            $subIndex = $idx;
            break;
        }
    }
    
    if ($subIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Subscription not found.']);
        exit;
    }
    
    $sub = $db['subscriptions'][$subIndex];
    $currentNext = $sub['nextPaymentDate'];
    $nextPayment = calculateNextPaymentDate($currentNext, $sub['billingCycle']);
    
    $updatedSub = array_merge($sub, [
        'lastPaymentDate' => $currentNext,
        'nextPaymentDate' => $nextPayment,
        'notified5Days' => false,
        'notified3Days' => false,
        'notifiedDueDay' => false,
        'status' => 'active'
    ]);
    
    $logEntry = [
        'id' => Date('U') . 'pay',
        'timestamp' => date('c'),
        'simulatedDate' => getSystemDate($db)->format('Y-m-d'),
        'subscriptionName' => $sub['name'],
        'recipient' => '',
        'subject' => "[Payment Record] Paid {$sub['name']}",
        'body' => "You marked {$sub['name']} subscription as PAID. The billing cycle has rolled over. Last Payment: $currentNext. Next Due: $nextPayment.",
        'type' => 'payment',
        'status' => 'success',
        'detail' => "Logged payment of {$sub['currency']}{$sub['cost']}"
    ];
    
    array_unshift($db['logs'], $logEntry);
    $db['subscriptions'][$subIndex] = $updatedSub;
    writeDb($dbFile, $db);
    
    echo json_encode($updatedSub);
    exit;
}

if ($route === 'logs') {
    echo json_encode($db['logs']);
    exit;
}

if ($route === 'logs/clear') {
    $db['logs'] = [];
    writeDb($dbFile, $db);
    echo json_encode(['message' => 'Logs cleared.']);
    exit;
}

if ($route === 'leads') {
    if (!isset($db['leads'])) {
        $db['leads'] = [];
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode($db['leads']);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $name = $body['name'] ?? '';
        $contactName = $body['contactName'] ?? '';
        $email = $body['email'] ?? '';
        $phone = $body['phone'] ?? '';
        $source = $body['source'] ?? 'Website';
        $stage = $body['stage'] ?? 'new';
        $assignedAgent = $body['assignedAgent'] ?? '';
        $value = isset($body['value']) ? floatval($body['value']) : 0.0;
        $commissionRate = isset($body['commissionRate']) ? floatval($body['commissionRate']) : 0.0;
        $notes = $body['notes'] ?? '';
        $followUpDate = $body['followUpDate'] ?? '';
        
        if (empty($name)) {
            http_response_code(400);
            echo json_encode(['error' => 'Lead name is required.']);
            exit;
        }
        
        $newLead = [
            'id' => (string)Date('U') . rand(100, 999),
            'name' => $name,
            'contactName' => $contactName,
            'email' => $email,
            'phone' => $phone,
            'source' => $source,
            'stage' => $stage,
            'assignedAgent' => $assignedAgent,
            'value' => $value,
            'commissionRate' => $commissionRate,
            'notes' => $notes,
            'createdDate' => date('Y-m-d'),
            'followUpDate' => $followUpDate
        ];
        
        $db['leads'][] = $newLead;
        writeDb($dbFile, $db);
        
        http_response_code(201);
        echo json_encode($newLead);
        exit;
    }
}

if (preg_match('#^leads/([^/]+)$#', $route, $m)) {
    $id = $m[1];
    if (!isset($db['leads'])) {
        $db['leads'] = [];
    }
    
    $leadIndex = -1;
    foreach ($db['leads'] as $idx => $l) {
        if ($l['id'] === $id) {
            $leadIndex = $idx;
            break;
        }
    }
    
    if ($leadIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Lead not found.']);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $lead = $db['leads'][$leadIndex];
        
        $updatedLead = array_merge($lead, [
            'name' => $body['name'] ?? $lead['name'],
            'contactName' => $body['contactName'] ?? ($lead['contactName'] ?? ''),
            'email' => $body['email'] ?? ($lead['email'] ?? ''),
            'phone' => $body['phone'] ?? ($lead['phone'] ?? ''),
            'source' => $body['source'] ?? ($lead['source'] ?? 'Website'),
            'stage' => $body['stage'] ?? ($lead['stage'] ?? 'new'),
            'assignedAgent' => $body['assignedAgent'] ?? ($lead['assignedAgent'] ?? ''),
            'value' => isset($body['value']) ? floatval($body['value']) : $lead['value'],
            'commissionRate' => isset($body['commissionRate']) ? floatval($body['commissionRate']) : ($lead['commissionRate'] ?? 0.0),
            'notes' => $body['notes'] ?? ($lead['notes'] ?? ''),
            'followUpDate' => $body['followUpDate'] ?? ($lead['followUpDate'] ?? '')
        ]);
        
        $db['leads'][$leadIndex] = $updatedLead;
        writeDb($dbFile, $db);
        
        echo json_encode($updatedLead);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        array_splice($db['leads'], $leadIndex, 1);
        writeDb($dbFile, $db);
        echo json_encode(['message' => 'Lead deleted successfully.']);
        exit;
    }
}

if ($route === 'tickets') {
    if (!isset($db['tickets'])) {
        $db['tickets'] = [];
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode($db['tickets']);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $title = $body['title'] ?? '';
        $description = $body['description'] ?? '';
        $priority = $body['priority'] ?? 'Medium';
        $assignedEngineer = $body['assignedEngineer'] ?? 'Hammad Account';
        $customerName = $body['customerName'] ?? '';
        $customerEmail = $body['customerEmail'] ?? '';
        $notes = $body['notes'] ?? '';
        
        if (empty($title)) {
            http_response_code(400);
            echo json_encode(['error' => 'Ticket title is required.']);
            exit;
        }
        
        $slaHours = 24;
        if ($priority === 'Critical') $slaHours = 4;
        elseif ($priority === 'High') $slaHours = 12;
        elseif ($priority === 'Medium') $slaHours = 24;
        elseif ($priority === 'Low') $slaHours = 72;
        
        $currentDate = getSystemDate($db)->format('c');

        $newTicket = [
            'id' => (string)Date('U') . rand(100, 999),
            'title' => $title,
            'description' => $description,
            'priority' => $priority,
            'status' => 'Open',
            'assignedEngineer' => $assignedEngineer,
            'customerName' => $customerName,
            'customerEmail' => $customerEmail,
            'createdDate' => $currentDate,
            'resolvedDate' => null,
            'closedDate' => null,
            'slaHours' => $slaHours,
            'satisfactionRating' => null,
            'notes' => $notes
        ];
        
        $db['tickets'][] = $newTicket;
        writeDb($dbFile, $db);
        
        http_response_code(201);
        echo json_encode($newTicket);
        exit;
    }
}

if (preg_match('#^tickets/([^/]+)$#', $route, $m)) {
    $id = $m[1];
    if (!isset($db['tickets'])) {
        $db['tickets'] = [];
    }
    
    $ticketIndex = -1;
    foreach ($db['tickets'] as $idx => $t) {
        if ($t['id'] === $id) {
            $ticketIndex = $idx;
            break;
        }
    }
    
    if ($ticketIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Ticket not found.']);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $ticket = $db['tickets'][$ticketIndex];
        
        $status = $body['status'] ?? $ticket['status'];
        $priority = $body['priority'] ?? $ticket['priority'];
        
        $slaHours = $ticket['slaHours'];
        if (isset($body['priority'])) {
            if ($priority === 'Critical') $slaHours = 4;
            elseif ($priority === 'High') $slaHours = 12;
            elseif ($priority === 'Medium') $slaHours = 24;
            elseif ($priority === 'Low') $slaHours = 72;
        }
        
        $resolvedDate = $ticket['resolvedDate'];
        $closedDate = $ticket['closedDate'];
        $currentDate = getSystemDate($db)->format('c');
        
        if ($status === 'Resolved' && empty($ticket['resolvedDate'])) {
            $resolvedDate = $currentDate;
        }
        if ($status === 'Closed' && empty($ticket['closedDate'])) {
            $closedDate = $currentDate;
            if (empty($resolvedDate)) {
                $resolvedDate = $currentDate;
            }
        }
        
        if ($status === 'Open' || $status === 'In Progress') {
            $resolvedDate = null;
            $closedDate = null;
        }
        
        $updatedTicket = array_merge($ticket, [
            'title' => $body['title'] ?? $ticket['title'],
            'description' => $body['description'] ?? ($ticket['description'] ?? ''),
            'priority' => $priority,
            'status' => $status,
            'assignedEngineer' => $body['assignedEngineer'] ?? ($ticket['assignedEngineer'] ?? 'Hammad Account'),
            'customerName' => $body['customerName'] ?? ($ticket['customerName'] ?? ''),
            'customerEmail' => $body['customerEmail'] ?? ($ticket['customerEmail'] ?? ''),
            'resolvedDate' => $resolvedDate,
            'closedDate' => $closedDate,
            'slaHours' => $slaHours,
            'satisfactionRating' => isset($body['satisfactionRating']) ? intval($body['satisfactionRating']) : $ticket['satisfactionRating'],
            'notes' => $body['notes'] ?? ($ticket['notes'] ?? '')
        ]);
        
        $db['tickets'][$ticketIndex] = $updatedTicket;
        writeDb($dbFile, $db);
        
        echo json_encode($updatedTicket);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        array_splice($db['tickets'], $ticketIndex, 1);
        writeDb($dbFile, $db);
        echo json_encode(['message' => 'Ticket deleted successfully.']);
        exit;
    }
}

if ($route === 'accounts') {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode($db['accounts']);
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $code = $body['code'] ?? '';
        $name = $body['name'] ?? '';
        $type = $body['type'] ?? '';
        $company = $body['company'] ?? 'All';
        
        if (empty($code) || empty($name) || empty($type)) {
            http_response_code(400);
            echo json_encode(['error' => 'Code, name, and type are required.']);
            exit;
        }
        
        $newAccount = [
            'code' => $code,
            'name' => $name,
            'type' => $type,
            'company' => $company
        ];
        $db['accounts'][] = $newAccount;
        writeDb($dbFile, $db);
        echo json_encode($newAccount);
        exit;
    }
}

if ($route === 'invoices') {
    if (!isset($db['invoices'])) $db['invoices'] = [];
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode($db['invoices']);
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $company = $body['company'] ?? '';
        $customerName = $body['customerName'] ?? '';
        $customerEmail = $body['customerEmail'] ?? '';
        $date = $body['date'] ?? '';
        $dueDate = $body['dueDate'] ?? '';
        $items = $body['items'] ?? [];
        
        if (empty($company) || empty($customerName) || empty($date) || empty($dueDate) || empty($items)) {
            http_response_code(400);
            echo json_encode(['error' => 'Company, customer name, date, due date, and items are required.']);
            exit;
        }
        
        $subtotal = 0;
        $vatAmount = 0;
        foreach ($items as &$item) {
            $qty = floatval($item['qty'] ?? 1);
            $unitPrice = floatval($item['unitPrice'] ?? 0);
            $vatRate = floatval($item['vatRate'] ?? 20);
            
            $itemSub = $qty * $unitPrice;
            $itemVat = ($itemSub * $vatRate) / 100;
            
            $item['qty'] = $qty;
            $item['unitPrice'] = $unitPrice;
            $item['vatRate'] = $vatRate;
            
            $subtotal += $itemSub;
            $vatAmount += $itemVat;
        }
        $total = $subtotal + $vatAmount;
        
        $invoiceId = 'INV-' . Date('U') . rand(10, 99);
        $invoiceNumber = 'INV-' . date('Y') . '-' . sprintf('%03d', count($db['invoices']) + 1);
        
        $newInvoice = [
            'id' => $invoiceId,
            'invoiceNumber' => $invoiceNumber,
            'company' => $company,
            'customerName' => $customerName,
            'customerEmail' => $customerEmail,
            'date' => $date,
            'dueDate' => $dueDate,
            'items' => $items,
            'subtotal' => $subtotal,
            'vatAmount' => $vatAmount,
            'total' => $total,
            'status' => 'Unpaid',
            'paymentDate' => null
        ];
        
        if (!isset($db['journalEntries'])) $db['journalEntries'] = [];
        
        $lines = [
            ['accountCode' => '1200', 'debit' => $total, 'credit' => 0],
            ['accountCode' => '4000', 'debit' => 0, 'credit' => $subtotal]
        ];
        if ($vatAmount > 0) {
            $lines[] = ['accountCode' => '2200', 'debit' => 0, 'credit' => $vatAmount];
        }
        
        $je = [
            'id' => 'JE-' . Date('U') . 'inv',
            'date' => $date,
            'description' => "Invoice $invoiceNumber created for $customerName",
            'company' => $company,
            'referenceType' => 'Invoice',
            'referenceId' => $invoiceId,
            'lines' => $lines
        ];
        
        $db['invoices'][] = $newInvoice;
        $db['journalEntries'][] = $je;
        writeDb($dbFile, $db);
        
        http_response_code(201);
        echo json_encode($newInvoice);
        exit;
    }
}

if (preg_match('#^invoices/([^/]+)/pay$#', $route, $m)) {
    $id = $m[1];
    if (!isset($db['invoices'])) $db['invoices'] = [];
    
    $invIndex = -1;
    foreach ($db['invoices'] as $idx => $inv) {
        if ($inv['id'] === $id) {
            $invIndex = $idx;
            break;
        }
    }
    
    if ($invIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Invoice not found.']);
        exit;
    }
    
    $invoice = $db['invoices'][$invIndex];
    if ($invoice['status'] === 'Paid') {
        echo json_encode($invoice);
        exit;
    }
    
    $paymentDate = $body['paymentDate'] ?? getSystemDate($db)->format('Y-m-d');
    
    $db['invoices'][$invIndex]['status'] = 'Paid';
    $db['invoices'][$invIndex]['paymentDate'] = $paymentDate;
    
    $bankCode = ($invoice['company'] === 'Pearls IT') ? '1010' : '1000';
    $lines = [
        ['accountCode' => $bankCode, 'debit' => $invoice['total'], 'credit' => 0],
        ['accountCode' => '1200', 'debit' => 0, 'credit' => $invoice['total']]
    ];
    
    $je = [
        'id' => 'JE-' . Date('U') . 'invpay',
        'date' => $paymentDate,
        'description' => "Payment received for invoice " . $invoice['invoiceNumber'],
        'company' => $invoice['company'],
        'referenceType' => 'InvoicePayment',
        'referenceId' => $id,
        'lines' => $lines
    ];
    
    if (!isset($db['bankStatements'])) $db['bankStatements'] = [];
    $db['bankStatements'][] = [
        'id' => 'BS-' . Date('U') . rand(10, 99),
        'company' => $invoice['company'],
        'date' => $paymentDate,
        'description' => "Client Payment - " . $invoice['customerName'] . " (" . $invoice['invoiceNumber'] . ")",
        'amount' => $invoice['total'],
        'type' => 'Deposit',
        'status' => 'Unreconciled',
        'matchedJournalEntryId' => null
    ];
    
    $db['journalEntries'][] = $je;
    writeDb($dbFile, $db);
    
    echo json_encode($db['invoices'][$invIndex]);
    exit;
}

if (preg_match('#^invoices/([^/]+)$#', $route, $m)) {
    $id = $m[1];
    if (!isset($db['invoices'])) $db['invoices'] = [];
    
    $invIndex = -1;
    foreach ($db['invoices'] as $idx => $inv) {
        if ($inv['id'] === $id) {
            $invIndex = $idx;
            break;
        }
    }
    
    if ($invIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Invoice not found.']);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        array_splice($db['invoices'], $invIndex, 1);
        
        if (isset($db['journalEntries'])) {
            $db['journalEntries'] = array_values(array_filter($db['journalEntries'], function($je) use ($id) {
                return !($je['referenceId'] === $id && ($je['referenceType'] === 'Invoice' || $je['referenceType'] === 'InvoicePayment'));
            }));
        }
        
        writeDb($dbFile, $db);
        echo json_encode(['message' => 'Invoice and JEs deleted successfully.']);
        exit;
    }
}

if ($route === 'expenses') {
    if (!isset($db['expenses'])) $db['expenses'] = [];
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode($db['expenses']);
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $company = $body['company'] ?? '';
        $vendorName = $body['vendorName'] ?? '';
        $date = $body['date'] ?? '';
        $dueDate = $body['dueDate'] ?? '';
        $items = $body['items'] ?? [];
        $category = $body['category'] ?? 'General & Admin';
        
        if (empty($company) || empty($vendorName) || empty($date) || empty($dueDate) || empty($items)) {
            http_response_code(400);
            echo json_encode(['error' => 'Company, vendor name, date, due date, and items are required.']);
            exit;
        }
        
        $subtotal = 0;
        $vatAmount = 0;
        foreach ($items as &$item) {
            $qty = floatval($item['qty'] ?? 1);
            $unitPrice = floatval($item['unitPrice'] ?? 0);
            $vatRate = floatval($item['vatRate'] ?? 20);
            
            $itemSub = $qty * $unitPrice;
            $itemVat = ($itemSub * $vatRate) / 100;
            
            $item['qty'] = $qty;
            $item['unitPrice'] = $unitPrice;
            $item['vatRate'] = $vatRate;
            
            $subtotal += $itemSub;
            $vatAmount += $itemVat;
        }
        $total = $subtotal + $vatAmount;
        
        $expenseId = 'EXP-' . Date('U') . rand(10, 99);
        $expenseNumber = 'BILL-' . date('Y') . '-' . sprintf('%03d', count($db['expenses']) + 1);
        
        $newExpense = [
            'id' => $expenseId,
            'expenseNumber' => $expenseNumber,
            'company' => $company,
            'vendorName' => $vendorName,
            'date' => $date,
            'dueDate' => $dueDate,
            'items' => $items,
            'subtotal' => $subtotal,
            'vatAmount' => $vatAmount,
            'total' => $total,
            'category' => $category,
            'status' => 'Unpaid',
            'paymentDate' => null
        ];
        
        $expenseAccountCode = ($category === 'Hosting & Software') ? '5000' : '5100';
        $lines = [
            ['accountCode' => $expenseAccountCode, 'debit' => $subtotal, 'credit' => 0],
            ['accountCode' => '2000', 'debit' => 0, 'credit' => $total]
        ];
        if ($vatAmount > 0) {
            $lines[] = ['accountCode' => '2200', 'debit' => $vatAmount, 'credit' => 0];
        }
        
        $je = [
            'id' => 'JE-' . Date('U') . 'exp',
            'date' => $date,
            'description' => "Vendor Bill $expenseNumber from $vendorName logged",
            'company' => $company,
            'referenceType' => 'Expense',
            'referenceId' => $expenseId,
            'lines' => $lines
        ];
        
        $db['expenses'][] = $newExpense;
        $db['journalEntries'][] = $je;
        writeDb($dbFile, $db);
        
        http_response_code(201);
        echo json_encode($newExpense);
        exit;
    }
}

if (preg_match('#^expenses/([^/]+)/pay$#', $route, $m)) {
    $id = $m[1];
    if (!isset($db['expenses'])) $db['expenses'] = [];
    
    $expIndex = -1;
    foreach ($db['expenses'] as $idx => $exp) {
        if ($exp['id'] === $id) {
            $expIndex = $idx;
            break;
        }
    }
    
    if ($expIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Expense not found.']);
        exit;
    }
    
    $expense = $db['expenses'][$expIndex];
    if ($expense['status'] === 'Paid') {
        echo json_encode($expense);
        exit;
    }
    
    $paymentDate = $body['paymentDate'] ?? getSystemDate($db)->format('Y-m-d');
    
    $db['expenses'][$expIndex]['status'] = 'Paid';
    $db['expenses'][$expIndex]['paymentDate'] = $paymentDate;
    
    $bankCode = ($expense['company'] === 'Pearls IT') ? '1010' : '1000';
    $lines = [
        ['accountCode' => '2000', 'debit' => $expense['total'], 'credit' => 0],
        ['accountCode' => $bankCode, 'debit' => 0, 'credit' => $expense['total']]
    ];
    
    $je = [
        'id' => 'JE-' . Date('U') . 'exppay',
        'date' => $paymentDate,
        'description' => "Payment made to vendor for bill " . $expense['expenseNumber'],
        'company' => $expense['company'],
        'referenceType' => 'ExpensePayment',
        'referenceId' => $id,
        'lines' => $lines
    ];
    
    if (!isset($db['bankStatements'])) $db['bankStatements'] = [];
    $db['bankStatements'][] = [
        'id' => 'BS-' . Date('U') . rand(10, 99),
        'company' => $expense['company'],
        'date' => $paymentDate,
        'description' => "Vendor Payment - " . $expense['vendorName'] . " (" . $expense['expenseNumber'] . ")",
        'amount' => -$expense['total'],
        'type' => 'Payment',
        'status' => 'Unreconciled',
        'matchedJournalEntryId' => null
    ];
    
    $db['journalEntries'][] = $je;
    writeDb($dbFile, $db);
    
    echo json_encode($db['expenses'][$expIndex]);
    exit;
}

if (preg_match('#^expenses/([^/]+)$#', $route, $m)) {
    $id = $m[1];
    if (!isset($db['expenses'])) $db['expenses'] = [];
    
    $expIndex = -1;
    foreach ($db['expenses'] as $idx => $exp) {
        if ($exp['id'] === $id) {
            $expIndex = $idx;
            break;
        }
    }
    
    if ($expIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Expense not found.']);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        array_splice($db['expenses'], $expIndex, 1);
        
        if (isset($db['journalEntries'])) {
            $db['journalEntries'] = array_values(array_filter($db['journalEntries'], function($je) use ($id) {
                return !($je['referenceId'] === $id && ($je['referenceType'] === 'Expense' || $je['referenceType'] === 'ExpensePayment'));
            }));
        }
        
        writeDb($dbFile, $db);
        echo json_encode(['message' => 'Expense and JEs deleted successfully.']);
        exit;
    }
}

if ($route === 'journals') {
    if (!isset($db['journalEntries'])) $db['journalEntries'] = [];
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode($db['journalEntries']);
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $date = $body['date'] ?? '';
        $description = $body['description'] ?? '';
        $company = $body['company'] ?? '';
        $lines = $body['lines'] ?? [];
        
        if (empty($date) || empty($description) || empty($company) || empty($lines)) {
            http_response_code(400);
            echo json_encode(['error' => 'Date, description, company, and lines are required.']);
            exit;
        }
        
        $debitTotal = 0;
        $creditTotal = 0;
        foreach ($lines as &$line) {
            $line['debit'] = floatval($line['debit'] ?? 0);
            $line['credit'] = floatval($line['credit'] ?? 0);
            $debitTotal += $line['debit'];
            $creditTotal += $line['credit'];
        }
        
        if (abs($debitTotal - $creditTotal) > 0.01) {
            http_response_code(400);
            echo json_encode(['error' => 'Journal entry is out of balance. Debits must equal Credits.']);
            exit;
        }
        
        $je = [
            'id' => 'JE-' . Date('U') . rand(10, 99),
            'date' => $date,
            'description' => $description,
            'company' => $company,
            'referenceType' => 'Manual',
            'referenceId' => null,
            'lines' => $lines
        ];
        
        $db['journalEntries'][] = $je;
        writeDb($dbFile, $db);
        
        http_response_code(201);
        echo json_encode($je);
        exit;
    }
}

if ($route === 'reconciliation') {
    if (!isset($db['bankStatements'])) $db['bankStatements'] = [];
    
    if (empty($db['bankStatements'])) {
        $simDate = getSystemDate($db)->format('Y-m-d');
        $db['bankStatements'] = [
            [
                'id' => 'BS-MOCK-1',
                'company' => 'Pearls Developers Limited',
                'date' => $simDate,
                'description' => "General Deposit Ref: #99011",
                'amount' => 1500.00,
                'type' => 'Deposit',
                'status' => 'Unreconciled',
                'matchedJournalEntryId' => null
            ],
            [
                'id' => 'BS-MOCK-2',
                'company' => 'Pearls IT',
                'date' => $simDate,
                'description' => "Monthly Bank Account Fee",
                'amount' => -15.00,
                'type' => 'Payment',
                'status' => 'Unreconciled',
                'matchedJournalEntryId' => null
            ]
        ];
        writeDb($dbFile, $db);
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode($db['bankStatements']);
        exit;
    }
}

if ($route === 'reconciliation/match') {
    if (!isset($db['bankStatements'])) $db['bankStatements'] = [];
    $statementId = $body['statementId'] ?? '';
    $journalId = $body['journalId'] ?? '';
    
    if (empty($statementId)) {
        http_response_code(400);
        echo json_encode(['error' => 'Statement ID is required.']);
        exit;
    }
    
    $matchedIndex = -1;
    foreach ($db['bankStatements'] as $idx => $line) {
        if ($line['id'] === $statementId) {
            $matchedIndex = $idx;
            break;
        }
    }
    
    if ($matchedIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Bank statement line not found.']);
        exit;
    }
    
    $db['bankStatements'][$matchedIndex]['status'] = 'Reconciled';
    $db['bankStatements'][$matchedIndex]['matchedJournalEntryId'] = $journalId;
    writeDb($dbFile, $db);
    
    echo json_encode($db['bankStatements'][$matchedIndex]);
    exit;
}

if ($route === 'settings') {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $safeSettings = $db['settings'];
        if (!empty($safeSettings['smtpPass'])) {
            $safeSettings['smtpPass'] = '********';
        }
        echo json_encode($safeSettings);
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $newSettings = [];
        foreach ($body as $key => $val) {
            if (is_string($val) && $key !== 'smtpPass') {
                $newSettings[$key] = trim($val);
            } else {
                $newSettings[$key] = $val;
            }
        }
        if (isset($newSettings['smtpPass']) && $newSettings['smtpPass'] === '********') {
            $newSettings['smtpPass'] = $db['settings']['smtpPass'] ?? '';
        }
        $db['settings'] = array_merge($db['settings'], $newSettings);
        writeDb($dbFile, $db);
        echo json_encode(['message' => 'Settings saved successfully.']);
        exit;
    }
}

if ($route === 'status') {
    $realDate = date('Y-m-d');
    $simDate = getSystemDate($db)->format('Y-m-d');
    
    $total = count($db['subscriptions']);
    $active = 0;
    $dueSoon = 0;
    $unpaid = 0;
    foreach ($db['subscriptions'] as $s) {
        $st = $s['status'] ?? 'active';
        if ($st === 'active') $active++;
        else if ($st === 'due_soon') $dueSoon++;
        else if ($st === 'unpaid') $unpaid++;
    }
    
    echo json_encode([
        'realDate' => $realDate,
        'simulatedDate' => $simDate,
        'timeTravelActive' => !empty($db['systemDateOverride']),
        'totalSubscriptions' => $total,
        'activeSubscriptions' => $active,
        'dueSoonSubscriptions' => $dueSoon,
        'unpaidSubscriptions' => $unpaid
    ]);
    exit;
}

if ($route === 'status/time-travel') {
    $date = $body['date'] ?? null;
    if (empty($date)) {
        $db['systemDateOverride'] = null;
    } else {
        $test = strtotime($date);
        if (!$test) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid date format. Use YYYY-MM-DD.']);
            exit;
        }
        $db['systemDateOverride'] = $date;
    }
    
    // Recalculate statuses immediately
    $currentSim = getSystemDate($db);
    foreach ($db['subscriptions'] as &$sub) {
        if (empty($sub['nextPaymentDate'])) continue;
        $daysDiff = getDaysDifference($sub['nextPaymentDate'], $currentSim);
        if ($daysDiff < 0) {
            $sub['status'] = 'unpaid';
        } else if ($daysDiff <= 5) {
            $sub['status'] = 'due_soon';
        } else {
            $sub['status'] = 'active';
        }
    }
    
    writeDb($dbFile, $db);
    
    echo json_encode([
        'message' => !empty($db['systemDateOverride']) ? "Time travel set to {$db['systemDateOverride']}" : "Time travel disabled.",
        'simulatedDate' => getSystemDate($db)->format('Y-m-d'),
        'timeTravelActive' => !empty($db['systemDateOverride'])
    ]);
    exit;
}

if ($route === 'scheduler/run') {
    list($triggered, $dbModified) = runReminderChecks($db);
    if ($dbModified) {
        writeDb($dbFile, $db);
    }
    echo json_encode([
        'message' => 'Scheduler run complete.',
        'triggeredCount' => count($triggered),
        'triggeredList' => $triggered
    ]);
    exit;
}

if ($route === 'employees') {
    if (!isset($db['employees'])) $db['employees'] = [];
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode($db['employees']);
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $name = $body['name'] ?? '';
        $email = $body['email'] ?? '';
        $phone = $body['phone'] ?? '';
        $company = $body['company'] ?? '';
        $department = $body['department'] ?? '';
        $jobTitle = $body['jobTitle'] ?? '';
        $joinDate = $body['joinDate'] ?? '';
        $contractEndDate = $body['contractEndDate'] ?? null;
        
        if (empty($name) || empty($company) || empty($department) || empty($jobTitle) || empty($joinDate)) {
            http_response_code(400);
            echo json_encode(['error' => 'Name, company, department, job title, and join date are required.']);
            exit;
        }
        
        $newEmployee = [
            'id' => 'EMP-' . Date('U') . rand(10, 99),
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'company' => $company,
            'department' => $department,
            'jobTitle' => $jobTitle,
            'joinDate' => $joinDate,
            'contractEndDate' => $contractEndDate,
            'status' => 'Active',
            'leaveBalance' => [
                'annual' => 28,
                'sick' => 10,
                'parental' => 5
            ],
            'documents' => [],
            'disciplinaryRecords' => []
        ];
        
        $db['employees'][] = $newEmployee;
        writeDb($dbFile, $db);
        http_response_code(201);
        echo json_encode($newEmployee);
        exit;
    }
}

if (preg_match('#^employees/([^/]+)$#', $route, $m)) {
    $id = $m[1];
    if (!isset($db['employees'])) $db['employees'] = [];
    
    $empIndex = -1;
    foreach ($db['employees'] as $idx => $emp) {
        if ($emp['id'] === $id) {
            $empIndex = $idx;
            break;
        }
    }
    
    if ($empIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Employee not found.']);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $emp = $db['employees'][$empIndex];
        $action = $body['action'] ?? '';
        
        if ($action === 'add_document') {
            $docName = $body['docName'] ?? '';
            $docType = $body['docType'] ?? 'Other';
            if (empty($docName)) {
                http_response_code(400);
                echo json_encode(['error' => 'Document name is required.']);
                exit;
            }
            $emp['documents'][] = [
                'name' => $docName,
                'type' => $docType,
                'uploadDate' => date('Y-m-d')
            ];
        } else if ($action === 'add_warning') {
            $severity = $body['severity'] ?? 'Warning';
            $notes = $body['notes'] ?? '';
            if (empty($notes)) {
                http_response_code(400);
                echo json_encode(['error' => 'Warning notes are required.']);
                exit;
            }
            $emp['disciplinaryRecords'][] = [
                'date' => date('Y-m-d'),
                'severity' => $severity,
                'notes' => $notes
            ];
        } else {
            // General update
            $emp['name'] = $body['name'] ?? $emp['name'];
            $emp['email'] = $body['email'] ?? $emp['email'];
            $emp['phone'] = $body['phone'] ?? $emp['phone'];
            $emp['company'] = $body['company'] ?? $emp['company'];
            $emp['department'] = $body['department'] ?? $emp['department'];
            $emp['jobTitle'] = $body['jobTitle'] ?? $emp['jobTitle'];
            $emp['joinDate'] = $body['joinDate'] ?? $emp['joinDate'];
            $emp['contractEndDate'] = isset($body['contractEndDate']) ? $body['contractEndDate'] : $emp['contractEndDate'];
            $emp['status'] = $body['status'] ?? $emp['status'];
            if (isset($body['leaveBalance'])) {
                $emp['leaveBalance'] = array_merge($emp['leaveBalance'], $body['leaveBalance']);
            }
        }
        
        $db['employees'][$empIndex] = $emp;
        writeDb($dbFile, $db);
        echo json_encode($emp);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        array_splice($db['employees'], $empIndex, 1);
        writeDb($dbFile, $db);
        echo json_encode(['message' => 'Employee record deleted.']);
        exit;
    }
}

if ($route === 'leaves') {
    if (!isset($db['leaves'])) $db['leaves'] = [];
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode($db['leaves']);
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $employeeId = $body['employeeId'] ?? '';
        $leaveType = $body['leaveType'] ?? 'Annual';
        $startDate = $body['startDate'] ?? '';
        $endDate = $body['endDate'] ?? '';
        $notes = $body['notes'] ?? '';
        
        if (empty($employeeId) || empty($startDate) || empty($endDate)) {
            http_response_code(400);
            echo json_encode(['error' => 'Employee ID, start date, and end date are required.']);
            exit;
        }
        
        if (!isset($db['employees'])) $db['employees'] = [];
        $employee = null;
        foreach ($db['employees'] as $emp) {
            if ($emp['id'] === $employeeId) {
                $employee = $emp;
                break;
            }
        }
        
        if (!$employee) {
            http_response_code(404);
            echo json_encode(['error' => 'Employee not found.']);
            exit;
        }
        
        $newLeave = [
            'id' => 'LV-' . Date('U') . rand(10, 99),
            'employeeId' => $employeeId,
            'employeeName' => $employee['name'],
            'company' => $employee['company'],
            'leaveType' => $leaveType,
            'startDate' => $startDate,
            'endDate' => $endDate,
            'status' => 'Pending',
            'notes' => $notes
        ];
        
        $db['leaves'][] = $newLeave;
        writeDb($dbFile, $db);
        http_response_code(201);
        echo json_encode($newLeave);
        exit;
    }
}

if (preg_match('#^leaves/([^/]+)/status$#', $route, $m)) {
    $id = $m[1];
    if (!isset($db['leaves'])) $db['leaves'] = [];
    
    $leaveIndex = -1;
    foreach ($db['leaves'] as $idx => $lv) {
        if ($lv['id'] === $id) {
            $leaveIndex = $idx;
            break;
        }
    }
    
    if ($leaveIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Leave request not found.']);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $status = $body['status'] ?? '';
        if ($status !== 'Approved' && $status !== 'Rejected') {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid status. Must be Approved or Rejected.']);
            exit;
        }
        
        $leave = $db['leaves'][$leaveIndex];
        $oldStatus = $leave['status'];
        
        // If status changes to Approved, deduct from employee leave balance
        if ($status === 'Approved' && $oldStatus !== 'Approved') {
            if (!isset($db['employees'])) $db['employees'] = [];
            $empIndex = -1;
            foreach ($db['employees'] as $idx => $e) {
                if ($e['id'] === $leave['employeeId']) {
                    $empIndex = $idx;
                    break;
                }
            }
            
            if ($empIndex !== -1) {
                $employee = $db['employees'][$empIndex];
                
                // Calculate days
                $sDate = new DateTime($leave['startDate']);
                $eDate = new DateTime($leave['endDate']);
                $sDate->setTime(0, 0, 0);
                $eDate->setTime(0, 0, 0);
                $diff = $sDate->diff($eDate);
                $days = $diff->days + 1; // inclusive
                
                $typeKey = 'annual';
                if ($leave['leaveType'] === 'Sick') $typeKey = 'sick';
                else if ($leave['leaveType'] === 'Maternity/Paternity') $typeKey = 'parental';
                
                if (!isset($employee['leaveBalance'])) {
                    $employee['leaveBalance'] = ['annual' => 28, 'sick' => 10, 'parental' => 5];
                }
                
                $employee['leaveBalance'][$typeKey] = max(0, $employee['leaveBalance'][$typeKey] - $days);
                
                $db['employees'][$empIndex] = $employee;
            }
        }
        
        $db['leaves'][$leaveIndex]['status'] = $status;
        writeDb($dbFile, $db);
        echo json_encode($db['leaves'][$leaveIndex]);
        exit;
    }
}

if ($route === 'attendance') {
    if (!isset($db['attendance'])) $db['attendance'] = [];
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode($db['attendance']);
        exit;
    }
}

if ($route === 'attendance/bulk') {
    if (!isset($db['attendance'])) $db['attendance'] = [];
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $date = $body['date'] ?? '';
        $logs = $body['logs'] ?? [];
        
        if (empty($date) || empty($logs)) {
            http_response_code(400);
            echo json_encode(['error' => 'Date and attendance logs are required.']);
            exit;
        }
        
        // Remove existing logs for this date
        $db['attendance'] = array_values(array_filter($db['attendance'], function($att) use ($date) {
            return $att['date'] !== $date;
        }));
        
        foreach ($logs as $log) {
            $db['attendance'][] = [
                'id' => 'ATT-' . Date('U') . rand(100, 999),
                'employeeId' => $log['employeeId'],
                'employeeName' => $log['employeeName'],
                'company' => $log['company'],
                'date' => $date,
                'status' => $log['status'],
                'checkIn' => $log['checkIn'] ?? '',
                'checkOut' => $log['checkOut'] ?? ''
            ];
        }
        
        writeDb($dbFile, $db);
        echo json_encode(['message' => 'Attendance saved successfully.', 'count' => count($logs)]);
        exit;
    }
}

if ($route === 'performance') {
    if (!isset($db['performanceReviews'])) $db['performanceReviews'] = [];
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode($db['performanceReviews']);
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $employeeId = $body['employeeId'] ?? '';
        $score = isset($body['score']) ? intval($body['score']) : 5;
        $feedback = $body['feedback'] ?? '';
        $reviewDate = $body['reviewDate'] ?? date('Y-m-d');
        $reviewer = $body['reviewer'] ?? 'Admin';
        
        if (empty($employeeId) || empty($feedback)) {
            http_response_code(400);
            echo json_encode(['error' => 'Employee ID and feedback are required.']);
            exit;
        }
        
        if (!isset($db['employees'])) $db['employees'] = [];
        $employee = null;
        foreach ($db['employees'] as $emp) {
            if ($emp['id'] === $employeeId) {
                $employee = $emp;
                break;
            }
        }
        
        if (!$employee) {
            http_response_code(404);
            echo json_encode(['error' => 'Employee not found.']);
            exit;
        }
        
        $newReview = [
            'id' => 'PR-' . Date('U') . rand(10, 99),
            'employeeId' => $employeeId,
            'employeeName' => $employee['name'],
            'company' => $employee['company'],
            'reviewDate' => $reviewDate,
            'reviewer' => $reviewer,
            'score' => $score,
            'feedback' => $feedback
        ];
        
        $db['performanceReviews'][] = $newReview;
        writeDb($dbFile, $db);
        http_response_code(201);
        echo json_encode($newReview);
        exit;
    }
}

// --- INVESTMENTS ENDPOINTS ---

// GET /api/investments & POST /api/investments
if ($route === 'investments') {
    if (!isset($db['investments'])) {
        $db['investments'] = [];
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode($db['investments']);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $name = $body['name'] ?? '';
        $company = $body['company'] ?? '';
        $type = $body['type'] ?? 'Stocks';
        $investorDetails = $body['investorDetails'] ?? '';
        $initialValue = isset($body['initialValue']) ? floatval($body['initialValue']) : 0.0;
        $currentValue = isset($body['currentValue']) ? floatval($body['currentValue']) : $initialValue;
        $purchaseDate = $body['purchaseDate'] ?? date('Y-m-d');
        $maturityDate = $body['maturityDate'] ?? null;
        
        if (empty($name) || empty($company) || $initialValue <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Name, company, and initial value (greater than 0) are required.']);
            exit;
        }
        
        $investmentId = 'INV-' . Date('U') . rand(10, 99);
        
        $newInvestment = [
            'id' => $investmentId,
            'name' => $name,
            'company' => $company,
            'type' => $type,
            'investorDetails' => $investorDetails,
            'initialValue' => $initialValue,
            'currentValue' => $currentValue,
            'purchaseDate' => $purchaseDate,
            'maturityDate' => $maturityDate,
            'status' => 'Active',
            'exitDate' => null,
            'exitValue' => null,
            'returns' => []
        ];
        
        $bankCode = ($company === 'Pearls IT') ? '1010' : '1000';
        $lines = [
            ['accountCode' => '1300', 'debit' => $initialValue, 'credit' => 0],
            ['accountCode' => $bankCode, 'debit' => 0, 'credit' => $initialValue]
        ];
        
        $je = [
            'id' => 'JE-' . Date('U') . 'invbuy',
            'date' => $purchaseDate,
            'description' => "Investment purchase: $name ($type)",
            'company' => $company,
            'referenceType' => 'InvestmentPurchase',
            'referenceId' => $investmentId,
            'lines' => $lines
        ];
        
        if (!isset($db['bankStatements'])) {
            $db['bankStatements'] = [];
        }
        $db['bankStatements'][] = [
            'id' => 'BS-' . Date('U') . rand(10, 99),
            'company' => $company,
            'date' => $purchaseDate,
            'description' => "Investment Purchase - $name",
            'amount' => -$initialValue,
            'type' => 'Payment',
            'status' => 'Unreconciled',
            'matchedJournalEntryId' => null
        ];
        
        if (!isset($db['journalEntries'])) {
            $db['journalEntries'] = [];
        }
        $db['journalEntries'][] = $je;
        $db['investments'][] = $newInvestment;
        
        writeDb($dbFile, $db);
        
        http_response_code(201);
        echo json_encode($newInvestment);
        exit;
    }
}

// /api/investments/:id
if (preg_match('#^investments/([^/]+)$#', $route, $m)) {
    $id = $m[1];
    if (!isset($db['investments'])) {
        $db['investments'] = [];
    }
    
    $invIndex = -1;
    foreach ($db['investments'] as $idx => $inv) {
        if ($inv['id'] === $id) {
            $invIndex = $idx;
            break;
        }
    }
    
    if ($invIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Investment not found.']);
        exit;
    }
    
    $investment = $db['investments'][$invIndex];
    
    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $action = $body['action'] ?? '';
        
        if ($action === 'exit') {
            $exitDate = $body['exitDate'] ?? date('Y-m-d');
            $exitValue = isset($body['exitValue']) ? floatval($body['exitValue']) : 0.0;
            
            if ($exitValue < 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Exit value cannot be negative.']);
                exit;
            }
            
            if ($investment['status'] === 'Exited') {
                http_response_code(400);
                echo json_encode(['error' => 'Investment has already been exited.']);
                exit;
            }
            
            $investment['status'] = 'Exited';
            $investment['exitDate'] = $exitDate;
            $investment['exitValue'] = $exitValue;
            
            $bankCode = ($investment['company'] === 'Pearls IT') ? '1010' : '1000';
            $initialValue = floatval($investment['initialValue']);
            $gainLoss = $exitValue - $initialValue;
            
            $lines = [
                ['accountCode' => $bankCode, 'debit' => $exitValue, 'credit' => 0],
                ['accountCode' => '1300', 'debit' => 0, 'credit' => $initialValue]
            ];
            
            if ($gainLoss > 0) {
                $lines[] = ['accountCode' => '4200', 'debit' => 0, 'credit' => $gainLoss];
            } else if ($gainLoss < 0) {
                $lines[] = ['accountCode' => '4200', 'debit' => abs($gainLoss), 'credit' => 0];
            }
            
            $je = [
                'id' => 'JE-' . Date('U') . 'invexit',
                'date' => $exitDate,
                'description' => "Investment exit: " . $investment['name'] . " (Gain/Loss: $gainLoss)",
                'company' => $investment['company'],
                'referenceType' => 'InvestmentExit',
                'referenceId' => $id,
                'lines' => $lines
            ];
            
            if (!isset($db['bankStatements'])) {
                $db['bankStatements'] = [];
            }
            $db['bankStatements'][] = [
                'id' => 'BS-' . Date('U') . rand(10, 99),
                'company' => $investment['company'],
                'date' => $exitDate,
                'description' => "Investment Exit Payout - " . $investment['name'],
                'amount' => $exitValue,
                'type' => 'Deposit',
                'status' => 'Unreconciled',
                'matchedJournalEntryId' => null
            ];
            
            if (!isset($db['journalEntries'])) {
                $db['journalEntries'] = [];
            }
            $db['journalEntries'][] = $je;
            $db['investments'][$invIndex] = $investment;
            
            writeDb($dbFile, $db);
            echo json_encode($investment);
            exit;
        } else {
            $investment['name'] = $body['name'] ?? $investment['name'];
            $investment['type'] = $body['type'] ?? $investment['type'];
            $investment['investorDetails'] = $body['investorDetails'] ?? $investment['investorDetails'];
            $investment['currentValue'] = isset($body['currentValue']) ? floatval($body['currentValue']) : $investment['currentValue'];
            $investment['maturityDate'] = isset($body['maturityDate']) ? $body['maturityDate'] : $investment['maturityDate'];
            
            $db['investments'][$invIndex] = $investment;
            writeDb($dbFile, $db);
            echo json_encode($investment);
            exit;
        }
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        array_splice($db['investments'], $invIndex, 1);
        
        if (isset($db['journalEntries'])) {
            $db['journalEntries'] = array_values(array_filter($db['journalEntries'], function($je) use ($id) {
                return !($je['referenceId'] === $id && in_array($je['referenceType'], ['InvestmentPurchase', 'InvestmentExit', 'InvestmentYield']));
            }));
        }
        
        writeDb($dbFile, $db);
        echo json_encode(['message' => 'Investment deleted successfully.']);
        exit;
    }
}

// POST /api/investments/:id/returns
if (preg_match('#^investments/([^/]+)/returns$#', $route, $m)) {
    $id = $m[1];
    if (!isset($db['investments'])) {
        $db['investments'] = [];
    }
    
    $invIndex = -1;
    foreach ($db['investments'] as $idx => $inv) {
        if ($inv['id'] === $id) {
            $invIndex = $idx;
            break;
        }
    }
    
    if ($invIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Investment not found.']);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $date = $body['date'] ?? date('Y-m-d');
        $amount = isset($body['amount']) ? floatval($body['amount']) : 0.0;
        $type = $body['type'] ?? 'Dividend';
        $status = $body['status'] ?? 'Pending';
        $notes = $body['notes'] ?? '';
        
        if ($amount <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Return amount must be greater than 0.']);
            exit;
        }
        
        $investment = $db['investments'][$invIndex];
        $returnId = 'ret_' . Date('U') . rand(10, 99);
        
        $newReturn = [
            'id' => $returnId,
            'date' => $date,
            'amount' => $amount,
            'type' => $type,
            'status' => $status,
            'notes' => $notes,
            'journalEntryId' => null,
            'bankStatementId' => null
        ];
        
        if ($status === 'Received') {
            $bankCode = ($investment['company'] === 'Pearls IT') ? '1010' : '1000';
            $lines = [
                ['accountCode' => $bankCode, 'debit' => $amount, 'credit' => 0],
                ['accountCode' => '4100', 'debit' => 0, 'credit' => $amount]
            ];
            
            $jeId = 'JE-' . Date('U') . 'yield';
            $je = [
                'id' => $jeId,
                'date' => $date,
                'description' => "Yield received: " . $investment['name'] . " ($type)",
                'company' => $investment['company'],
                'referenceType' => 'InvestmentYield',
                'referenceId' => $id,
                'lines' => $lines
            ];
            
            $bsId = 'BS-' . Date('U') . rand(10, 99);
            if (!isset($db['bankStatements'])) {
                $db['bankStatements'] = [];
            }
            $db['bankStatements'][] = [
                'id' => $bsId,
                'company' => $investment['company'],
                'date' => $date,
                'description' => "Investment Yield - " . $investment['name'] . " ($type)",
                'amount' => $amount,
                'type' => 'Deposit',
                'status' => 'Unreconciled',
                'matchedJournalEntryId' => null
            ];
            
            if (!isset($db['journalEntries'])) {
                $db['journalEntries'] = [];
            }
            $db['journalEntries'][] = $je;
            
            $newReturn['journalEntryId'] = $jeId;
            $newReturn['bankStatementId'] = $bsId;
        }
        
        $investment['returns'][] = $newReturn;
        $db['investments'][$invIndex] = $investment;
        
        writeDb($dbFile, $db);
        
        http_response_code(201);
        echo json_encode($newReturn);
        exit;
    }
}

// PUT /api/investments/:id/returns/:returnId/status
if (preg_match('#^investments/([^/]+)/returns/([^/]+)/status$#', $route, $m)) {
    $id = $m[1];
    $returnId = $m[2];
    
    if (!isset($db['investments'])) {
        $db['investments'] = [];
    }
    
    $invIndex = -1;
    foreach ($db['investments'] as $idx => $inv) {
        if ($inv['id'] === $id) {
            $invIndex = $idx;
            break;
        }
    }
    
    if ($invIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Investment not found.']);
        exit;
    }
    
    $investment = $db['investments'][$invIndex];
    
    $retIndex = -1;
    foreach ($investment['returns'] as $idx => $ret) {
        if ($ret['id'] === $returnId) {
            $retIndex = $idx;
            break;
        }
    }
    
    if ($retIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Return record not found.']);
        exit;
    }
    
    $returnRecord = $investment['returns'][$retIndex];
    
    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $status = $body['status'] ?? '';
        if ($status !== 'Received') {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid status. Yield status can only be updated to Received.']);
            exit;
        }
        
        if ($returnRecord['status'] === 'Received') {
            echo json_encode($returnRecord);
            exit;
        }
        
        $returnRecord['status'] = 'Received';
        $amount = floatval($returnRecord['amount']);
        $type = $returnRecord['type'];
        $date = $body['date'] ?? getSystemDate($db)->format('Y-m-d');
        $returnRecord['date'] = $date;
        
        $bankCode = ($investment['company'] === 'Pearls IT') ? '1010' : '1000';
        $lines = [
            ['accountCode' => $bankCode, 'debit' => $amount, 'credit' => 0],
            ['accountCode' => '4100', 'debit' => 0, 'credit' => $amount]
        ];
        
        $jeId = 'JE-' . Date('U') . 'yield';
        $je = [
            'id' => $jeId,
            'date' => $date,
            'description' => "Yield received: " . $investment['name'] . " ($type)",
            'company' => $investment['company'],
            'referenceType' => 'InvestmentYield',
            'referenceId' => $id,
            'lines' => $lines
        ];
        
        $bsId = 'BS-' . Date('U') . rand(10, 99);
        if (!isset($db['bankStatements'])) {
            $db['bankStatements'] = [];
        }
        $db['bankStatements'][] = [
            'id' => $bsId,
            'company' => $investment['company'],
            'date' => $date,
            'description' => "Investment Yield - " . $investment['name'] . " ($type)",
            'amount' => $amount,
            'type' => 'Deposit',
            'status' => 'Unreconciled',
            'matchedJournalEntryId' => null
        ];
        
        if (!isset($db['journalEntries'])) {
            $db['journalEntries'] = [];
        }
        $db['journalEntries'][] = $je;
        
        $returnRecord['journalEntryId'] = $jeId;
        $returnRecord['bankStatementId'] = $bsId;
        
        $investment['returns'][$retIndex] = $returnRecord;
        $db['investments'][$invIndex] = $investment;
        
        writeDb($dbFile, $db);
        echo json_encode($returnRecord);
        exit;
    }
}

// --- IT TASKS & OPS ENDPOINTS ---

// GET /api/it-tasks & POST /api/it-tasks
if ($route === 'it-tasks') {
    if (!isset($db['itTasks'])) {
        $db['itTasks'] = [];
    }
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode($db['itTasks']);
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Create new task
        $maxId = 1000;
        foreach ($db['itTasks'] as $t) {
            $num = (int)str_replace('TSK-', '', $t['id']);
            if ($num > $maxId) $maxId = $num;
        }
        $newId = 'TSK-' . ($maxId + 1);
        
        $newTask = [
            'id' => $newId,
            'title' => $body['title'] ?? 'New Task',
            'type' => $body['type'] ?? 'WebDev',
            'category' => $body['category'] ?? 'Development',
            'status' => $body['status'] ?? 'Open',
            'priority' => $body['priority'] ?? 'Medium',
            'assignedTo' => $body['assignedTo'] ?? '',
            'estimatedHours' => floatval($body['estimatedHours'] ?? 0),
            'actualHours' => floatval($body['actualHours'] ?? 0),
            'dateCreated' => $body['dateCreated'] ?? getSystemDate($db)->format('Y-m-d'),
            'dueDate' => $body['dueDate'] ?? '',
            'dateCompleted' => null,
            'notes' => $body['notes'] ?? '',
            'website' => $body['website'] ?? '',
            'githubCommit' => $body['githubCommit'] ?? ''
        ];
        
        $db['itTasks'][] = $newTask;
        writeDb($dbFile, $db);
        echo json_encode($newTask);
        exit;
    }
}

// PUT/DELETE /api/it-tasks/:id
if (preg_match('#^it-tasks/([^/]+)$#', $route, $m)) {
    $taskId = $m[1];
    if (!isset($db['itTasks'])) {
        $db['itTasks'] = [];
    }
    $taskIndex = -1;
    foreach ($db['itTasks'] as $idx => $t) {
        if ($t['id'] === $taskId) {
            $taskIndex = $idx;
            break;
        }
    }
    if ($taskIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Task not found.']);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $task = $db['itTasks'][$taskIndex];
        
        if (isset($body['title'])) $task['title'] = $body['title'];
        if (isset($body['type'])) $task['type'] = $body['type'];
        if (isset($body['category'])) $task['category'] = $body['category'];
        if (isset($body['status'])) {
            $task['status'] = $body['status'];
            if (($body['status'] === 'Closed' || $body['status'] === 'Resolved') && empty($task['dateCompleted'])) {
                $task['dateCompleted'] = getSystemDate($db)->format('Y-m-d');
            } else if ($body['status'] !== 'Closed' && $body['status'] !== 'Resolved') {
                $task['dateCompleted'] = null;
            }
        }
        if (isset($body['priority'])) $task['priority'] = $body['priority'];
        if (isset($body['assignedTo'])) $task['assignedTo'] = $body['assignedTo'];
        if (isset($body['estimatedHours'])) $task['estimatedHours'] = floatval($body['estimatedHours']);
        if (isset($body['actualHours'])) $task['actualHours'] = floatval($body['actualHours']);
        if (isset($body['dueDate'])) $task['dueDate'] = $body['dueDate'];
        if (isset($body['notes'])) $task['notes'] = $body['notes'];
        if (isset($body['website'])) $task['website'] = $body['website'];
        if (isset($body['githubCommit'])) $task['githubCommit'] = $body['githubCommit'];
        
        $db['itTasks'][$taskIndex] = $task;
        writeDb($dbFile, $db);
        echo json_encode($task);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        array_splice($db['itTasks'], $taskIndex, 1);
        writeDb($dbFile, $db);
        echo json_encode(['success' => true]);
        exit;
    }
}

// GET/POST /api/it-incidents
if ($route === 'it-incidents') {
    if (!isset($db['itIncidents'])) {
        $db['itIncidents'] = [];
    }
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode($db['itIncidents']);
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $maxId = 1000;
        foreach ($db['itIncidents'] as $inc) {
            $num = (int)str_replace('INC-', '', $inc['id']);
            if ($num > $maxId) $maxId = $num;
        }
        $newId = 'INC-' . ($maxId + 1);
        
        $newIncident = [
            'id' => $newId,
            'title' => $body['title'] ?? 'New Incident',
            'severity' => $body['severity'] ?? 'Medium',
            'date' => $body['date'] ?? getSystemDate($db)->format('Y-m-d'),
            'status' => $body['status'] ?? 'Investigating',
            'rootCause' => $body['rootCause'] ?? '',
            'resolution' => $body['resolution'] ?? ''
        ];
        
        $db['itIncidents'][] = $newIncident;
        writeDb($dbFile, $db);
        echo json_encode($newIncident);
        exit;
    }
}

// PUT /api/it-incidents/:id
if (preg_match('#^it-incidents/([^/]+)$#', $route, $m)) {
    $incId = $m[1];
    if (!isset($db['itIncidents'])) {
        $db['itIncidents'] = [];
    }
    $incIndex = -1;
    foreach ($db['itIncidents'] as $idx => $inc) {
        if ($inc['id'] === $incId) {
            $incIndex = $idx;
            break;
        }
    }
    if ($incIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Incident not found.']);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $incident = $db['itIncidents'][$incIndex];
        if (isset($body['title'])) $incident['title'] = $body['title'];
        if (isset($body['severity'])) $incident['severity'] = $body['severity'];
        if (isset($body['status'])) $incident['status'] = $body['status'];
        if (isset($body['rootCause'])) $incident['rootCause'] = $body['rootCause'];
        if (isset($body['resolution'])) $incident['resolution'] = $body['resolution'];
        
        $db['itIncidents'][$incIndex] = $incident;
        writeDb($dbFile, $db);
        echo json_encode($incident);
        exit;
    }
}

// GET/POST /api/it-changes
if ($route === 'it-changes') {
    if (!isset($db['itChanges'])) {
        $db['itChanges'] = [];
    }
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode($db['itChanges']);
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $maxId = 1000;
        foreach ($db['itChanges'] as $chg) {
            $num = (int)str_replace('CHG-', '', $chg['id']);
            if ($num > $maxId) $maxId = $num;
        }
        $newId = 'CHG-' . ($maxId + 1);
        
        $newChange = [
            'id' => $newId,
            'title' => $body['title'] ?? 'New Change',
            'requestedBy' => $body['requestedBy'] ?? '',
            'dateScheduled' => $body['dateScheduled'] ?? getSystemDate($db)->format('Y-m-d'),
            'status' => $body['status'] ?? 'Draft',
            'impact' => $body['impact'] ?? 'Medium',
            'testingNotes' => $body['testingNotes'] ?? ''
        ];
        
        $db['itChanges'][] = $newChange;
        writeDb($dbFile, $db);
        echo json_encode($newChange);
        exit;
    }
}

// PUT /api/it-changes/:id
if (preg_match('#^it-changes/([^/]+)$#', $route, $m)) {
    $chgId = $m[1];
    if (!isset($db['itChanges'])) {
        $db['itChanges'] = [];
    }
    $chgIndex = -1;
    foreach ($db['itChanges'] as $idx => $chg) {
        if ($chg['id'] === $chgId) {
            $chgIndex = $idx;
            break;
        }
    }
    if ($chgIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Change not found.']);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $change = $db['itChanges'][$chgIndex];
        if (isset($body['title'])) $change['title'] = $body['title'];
        if (isset($body['requestedBy'])) $change['requestedBy'] = $body['requestedBy'];
        if (isset($body['dateScheduled'])) $change['dateScheduled'] = $body['dateScheduled'];
        if (isset($body['status'])) $change['status'] = $body['status'];
        if (isset($body['impact'])) $change['impact'] = $body['impact'];
        if (isset($body['testingNotes'])) $change['testingNotes'] = $body['testingNotes'];
        
        $db['itChanges'][$chgIndex] = $change;
        writeDb($dbFile, $db);
        echo json_encode($change);
        exit;
    }
}

// GET/POST /api/it-deployments
if ($route === 'it-deployments') {
    if (!isset($db['itDeployments'])) {
        $db['itDeployments'] = [];
    }
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode($db['itDeployments']);
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $maxId = 1000;
        foreach ($db['itDeployments'] as $dep) {
            $num = (int)str_replace('DEP-', '', $dep['id']);
            if ($num > $maxId) $maxId = $num;
        }
        $newId = 'DEP-' . ($maxId + 1);
        
        $newDeployment = [
            'id' => $newId,
            'website' => $body['website'] ?? '',
            'version' => $body['version'] ?? 'v1.0.0',
            'deployDate' => $body['deployDate'] ?? getSystemDate($db)->format('Y-m-d'),
            'deployedBy' => $body['deployedBy'] ?? '',
            'commitRef' => $body['commitRef'] ?? '',
            'status' => $body['status'] ?? 'Success'
        ];
        
        $db['itDeployments'][] = $newDeployment;
        writeDb($dbFile, $db);
        echo json_encode($newDeployment);
        exit;
    }
}

// --- CONTRACTS ENDPOINTS ---
if ($route === 'contracts') {
    if (!isset($db['contracts'])) {
        $db['contracts'] = [];
    }
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode($db['contracts']);
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $title = $body['title'] ?? 'New Contract';
        $type = $body['type'] ?? 'Other';
        $company = $body['company'] ?? '';
        $signDate = $body['signDate'] ?? getSystemDate($db)->format('Y-m-d');
        $expiryDate = empty($body['expiryDate']) ? null : $body['expiryDate'];
        $status = $body['status'] ?? 'Active';
        $assignedCounsel = $body['assignedCounsel'] ?? '';
        $documentName = $body['documentName'] ?? '';
        $notes = $body['notes'] ?? '';

        if (empty($company)) {
            http_response_code(400);
            echo json_encode(['error' => 'Company is required.']);
            exit;
        }

        $newContract = [
            'id' => 'CON-' . Date('U') . rand(10, 99),
            'title' => $title,
            'type' => $type,
            'company' => $company,
            'signDate' => $signDate,
            'expiryDate' => $expiryDate,
            'status' => $status,
            'assignedCounsel' => $assignedCounsel,
            'documentName' => $documentName,
            'notes' => $notes
        ];

        $db['contracts'][] = $newContract;
        writeDb($dbFile, $db);
        echo json_encode($newContract);
        exit;
    }
}

if (preg_match('#^contracts/([^/]+)$#', $route, $m)) {
    $contractId = $m[1];
    if (!isset($db['contracts'])) {
        $db['contracts'] = [];
    }
    $contractIndex = -1;
    foreach ($db['contracts'] as $idx => $c) {
        if ($c['id'] === $contractId) {
            $contractIndex = $idx;
            break;
        }
    }
    if ($contractIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Contract not found.']);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $contract = $db['contracts'][$contractIndex];

        if (isset($body['title'])) $contract['title'] = $body['title'];
        if (isset($body['type'])) $contract['type'] = $body['type'];
        if (isset($body['company'])) $contract['company'] = $body['company'];
        if (isset($body['signDate'])) $contract['signDate'] = $body['signDate'];
        $contract['expiryDate'] = array_key_exists('expiryDate', $body) ? (empty($body['expiryDate']) ? null : $body['expiryDate']) : ($contract['expiryDate'] ?? null);
        if (isset($body['status'])) $contract['status'] = $body['status'];
        if (isset($body['assignedCounsel'])) $contract['assignedCounsel'] = $body['assignedCounsel'];
        if (isset($body['documentName'])) $contract['documentName'] = $body['documentName'];
        if (isset($body['notes'])) $contract['notes'] = $body['notes'];

        $db['contracts'][$contractIndex] = $contract;
        writeDb($dbFile, $db);
        echo json_encode($contract);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        array_splice($db['contracts'], $contractIndex, 1);
        writeDb($dbFile, $db);
        echo json_encode(['success' => true]);
        exit;
    }
}

// --- CASES ENDPOINTS ---
if ($route === 'cases') {
    if (!isset($db['cases'])) {
        $db['cases'] = [];
    }
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode($db['cases']);
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $title = $body['title'] ?? 'New Case';
        $company = $body['company'] ?? '';
        $status = $body['status'] ?? 'Active';
        $assignedCounsel = $body['assignedCounsel'] ?? '';
        $courtDate = empty($body['courtDate']) ? null : $body['courtDate'];
        $jurisdiction = $body['jurisdiction'] ?? '';
        $notes = $body['notes'] ?? '';

        if (empty($company)) {
            http_response_code(400);
            echo json_encode(['error' => 'Company is required.']);
            exit;
        }

        $newCase = [
            'id' => 'CAS-' . Date('U') . rand(10, 99),
            'title' => $title,
            'company' => $company,
            'status' => $status,
            'assignedCounsel' => $assignedCounsel,
            'courtDate' => $courtDate,
            'jurisdiction' => $jurisdiction,
            'notes' => $notes
        ];

        $db['cases'][] = $newCase;
        writeDb($dbFile, $db);
        echo json_encode($newCase);
        exit;
    }
}

if (preg_match('#^cases/([^/]+)$#', $route, $m)) {
    $caseId = $m[1];
    if (!isset($db['cases'])) {
        $db['cases'] = [];
    }
    $caseIndex = -1;
    foreach ($db['cases'] as $idx => $c) {
        if ($c['id'] === $caseId) {
            $caseIndex = $idx;
            break;
        }
    }
    if ($caseIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Case not found.']);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $case = $db['cases'][$caseIndex];

        if (isset($body['title'])) $case['title'] = $body['title'];
        if (isset($body['company'])) $case['company'] = $body['company'];
        if (isset($body['status'])) $case['status'] = $body['status'];
        if (isset($body['assignedCounsel'])) $case['assignedCounsel'] = $body['assignedCounsel'];
        $case['courtDate'] = array_key_exists('courtDate', $body) ? (empty($body['courtDate']) ? null : $body['courtDate']) : ($case['courtDate'] ?? null);
        if (isset($body['jurisdiction'])) $case['jurisdiction'] = $body['jurisdiction'];
        if (isset($body['notes'])) $case['notes'] = $body['notes'];

        $db['cases'][$caseIndex] = $case;
        writeDb($dbFile, $db);
        echo json_encode($case);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        array_splice($db['cases'], $caseIndex, 1);
        writeDb($dbFile, $db);
        echo json_encode(['success' => true]);
        exit;
    }
}

// --- COMPLIANCE ENDPOINTS ---
if ($route === 'compliance') {
    if (!isset($db['compliance'])) {
        $db['compliance'] = [];
    }
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode($db['compliance']);
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $title = $body['title'] ?? 'New Compliance Task';
        $company = $body['company'] ?? '';
        $dueDate = $body['dueDate'] ?? getSystemDate($db)->format('Y-m-d');
        $status = $body['status'] ?? 'Pending';
        $assignedTo = $body['assignedTo'] ?? '';
        $notes = $body['notes'] ?? '';

        if (empty($company)) {
            http_response_code(400);
            echo json_encode(['error' => 'Company is required.']);
            exit;
        }

        $newComp = [
            'id' => 'CMP-' . Date('U') . rand(10, 99),
            'title' => $title,
            'company' => $company,
            'dueDate' => $dueDate,
            'status' => $status,
            'assignedTo' => $assignedTo,
            'notes' => $notes
        ];

        $db['compliance'][] = $newComp;
        writeDb($dbFile, $db);
        echo json_encode($newComp);
        exit;
    }
}

if (preg_match('#^compliance/([^/]+)$#', $route, $m)) {
    $compId = $m[1];
    if (!isset($db['compliance'])) {
        $db['compliance'] = [];
    }
    $compIndex = -1;
    foreach ($db['compliance'] as $idx => $c) {
        if ($c['id'] === $compId) {
            $compIndex = $idx;
            break;
        }
    }
    if ($compIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Compliance task not found.']);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $comp = $db['compliance'][$compIndex];

        if (isset($body['title'])) $comp['title'] = $body['title'];
        if (isset($body['company'])) $comp['company'] = $body['company'];
        if (isset($body['dueDate'])) $comp['dueDate'] = $body['dueDate'];
        if (isset($body['status'])) $comp['status'] = $body['status'];
        if (isset($body['assignedTo'])) $comp['assignedTo'] = $body['assignedTo'];
        if (isset($body['notes'])) $comp['notes'] = $body['notes'];

        $db['compliance'][$compIndex] = $comp;
        writeDb($dbFile, $db);
        echo json_encode($comp);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        array_splice($db['compliance'], $compIndex, 1);
        writeDb($dbFile, $db);
        echo json_encode(['success' => true]);
        exit;
    }
}

// --- FLEET VEHICLES ENDPOINTS ---
if ($route === 'fleet') {
    if (!isset($db['fleet_vehicles'])) {
        $db['fleet_vehicles'] = [];
    }
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode($db['fleet_vehicles']);
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $make = $body['make'] ?? '';
        $model = $body['model'] ?? '';
        $type = $body['type'] ?? 'Car';
        $plateNumber = $body['plateNumber'] ?? '';
        $year = isset($body['year']) ? (int)$body['year'] : (int)date('Y');
        $company = $body['company'] ?? '';
        $status = $body['status'] ?? 'Available';
        $insuranceExpiry = $body['insuranceExpiry'] ?? null;
        $roadTaxExpiry = $body['roadTaxExpiry'] ?? null;

        if (empty($make) || empty($model) || empty($plateNumber) || empty($company)) {
            http_response_code(400);
            echo json_encode(['error' => 'Make, model, plate number, and company are required.']);
            exit;
        }

        $newVeh = [
            'id' => 'VEH-' . Date('U') . rand(10, 99),
            'make' => $make,
            'model' => $model,
            'type' => $type,
            'plateNumber' => $plateNumber,
            'year' => $year,
            'company' => $company,
            'status' => $status,
            'insuranceExpiry' => $insuranceExpiry,
            'roadTaxExpiry' => $roadTaxExpiry,
            'conditionRecords' => []
        ];

        $db['fleet_vehicles'][] = $newVeh;
        writeDb($dbFile, $db);
        echo json_encode($newVeh);
        exit;
    }
}

if (preg_match('#^fleet/([^/]+)$#', $route, $m)) {
    $vehId = $m[1];
    if (!isset($db['fleet_vehicles'])) {
        $db['fleet_vehicles'] = [];
    }
    $vehIndex = -1;
    foreach ($db['fleet_vehicles'] as $idx => $v) {
        if ($v['id'] === $vehId) {
            $vehIndex = $idx;
            break;
        }
    }
    if ($vehIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Vehicle not found.']);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $veh = $db['fleet_vehicles'][$vehIndex];

        if (isset($body['make'])) $veh['make'] = $body['make'];
        if (isset($body['model'])) $veh['model'] = $body['model'];
        if (isset($body['type'])) $veh['type'] = $body['type'];
        if (isset($body['plateNumber'])) $veh['plateNumber'] = $body['plateNumber'];
        if (isset($body['year'])) $veh['year'] = (int)$body['year'];
        if (isset($body['company'])) $veh['company'] = $body['company'];
        if (isset($body['status'])) $veh['status'] = $body['status'];
        $veh['insuranceExpiry'] = array_key_exists('insuranceExpiry', $body) ? (empty($body['insuranceExpiry']) ? null : $body['insuranceExpiry']) : ($veh['insuranceExpiry'] ?? null);
        $veh['roadTaxExpiry'] = array_key_exists('roadTaxExpiry', $body) ? (empty($body['roadTaxExpiry']) ? null : $body['roadTaxExpiry']) : ($veh['roadTaxExpiry'] ?? null);

        $db['fleet_vehicles'][$vehIndex] = $veh;
        writeDb($dbFile, $db);
        echo json_encode($veh);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        array_splice($db['fleet_vehicles'], $vehIndex, 1);
        writeDb($dbFile, $db);
        echo json_encode(['success' => true]);
        exit;
    }
}

if (preg_match('#^fleet/([^/]+)/condition$#', $route, $m)) {
    $vehId = $m[1];
    if (!isset($db['fleet_vehicles'])) {
        $db['fleet_vehicles'] = [];
    }
    $vehIndex = -1;
    foreach ($db['fleet_vehicles'] as $idx => $v) {
        if ($v['id'] === $vehId) {
            $vehIndex = $idx;
            break;
        }
    }
    if ($vehIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Vehicle not found.']);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $notes = $body['notes'] ?? '';
        $severity = $body['severity'] ?? 'Good';
        $loggedBy = $body['loggedBy'] ?? 'System';
        $date = $body['date'] ?? getSystemDate($db)->format('Y-m-d');

        if (empty($notes)) {
            http_response_code(400);
            echo json_encode(['error' => 'Condition notes are required.']);
            exit;
        }

        if (!isset($db['fleet_vehicles'][$vehIndex]['conditionRecords'])) {
            $db['fleet_vehicles'][$vehIndex]['conditionRecords'] = [];
        }

        $record = [
            'date' => $date,
            'notes' => $notes,
            'loggedBy' => $loggedBy,
            'severity' => $severity
        ];

        array_unshift($db['fleet_vehicles'][$vehIndex]['conditionRecords'], $record);
        writeDb($dbFile, $db);
        echo json_encode($db['fleet_vehicles'][$vehIndex]);
        exit;
    }
}

// --- LEASE CONTRACTS ENDPOINTS ---
if ($route === 'leases') {
    if (!isset($db['lease_contracts'])) {
        $db['lease_contracts'] = [];
    }
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode($db['lease_contracts']);
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $vehicleId = $body['vehicleId'] ?? '';
        $lesseeName = $body['lesseeName'] ?? '';
        $lesseeEmail = $body['lesseeEmail'] ?? '';
        $lesseePhone = $body['lesseePhone'] ?? '';
        $startDate = $body['startDate'] ?? '';
        $endDate = $body['endDate'] ?? '';
        $monthlyRate = isset($body['monthlyRate']) ? (float)$body['monthlyRate'] : 0.0;
        $securityDeposit = isset($body['securityDeposit']) ? (float)$body['securityDeposit'] : 0.0;
        $status = $body['status'] ?? 'Active';

        if (empty($vehicleId) || empty($lesseeName) || empty($startDate) || empty($endDate) || $monthlyRate <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Vehicle, lessee name, start/end dates, and monthly rate are required.']);
            exit;
        }

        // Generate payment schedule
        $paymentSchedule = [];
        $start = new DateTime($startDate);
        $end = new DateTime($endDate);
        $interval = new DateInterval('P1M');
        $period = new DatePeriod($start, $interval, $end);

        $i = 1;
        foreach ($period as $dt) {
            $paymentSchedule[] = [
                'id' => 'PAY-' . Date('U') . '-' . $i++,
                'dueDate' => $dt->format('Y-m-d'),
                'amount' => $monthlyRate,
                'status' => 'Pending',
                'paymentDate' => null
            ];
        }
        if (count($paymentSchedule) === 0 || end($paymentSchedule)['dueDate'] !== $end->format('Y-m-d')) {
            $diff = $start->diff($end);
            $months = ($diff->y * 12) + $diff->m;
            if ($months == 0 && count($paymentSchedule) === 0) {
                $paymentSchedule[] = [
                    'id' => 'PAY-' . Date('U') . '-' . $i++,
                    'dueDate' => $start->format('Y-m-d'),
                    'amount' => $monthlyRate,
                    'status' => 'Pending',
                    'paymentDate' => null
                ];
            }
        }

        $newLease = [
            'id' => 'LSE-' . Date('U') . rand(10, 99),
            'vehicleId' => $vehicleId,
            'lesseeName' => $lesseeName,
            'lesseeEmail' => $lesseeEmail,
            'lesseePhone' => $lesseePhone,
            'startDate' => $startDate,
            'endDate' => $endDate,
            'monthlyRate' => $monthlyRate,
            'securityDeposit' => $securityDeposit,
            'status' => $status,
            'paymentSchedule' => $paymentSchedule
        ];

        $db['lease_contracts'][] = $newLease;

        // Auto-update vehicle status to Leased
        if (isset($db['fleet_vehicles'])) {
            foreach ($db['fleet_vehicles'] as &$v) {
                if ($v['id'] === $vehicleId) {
                    $v['status'] = 'Leased';
                    break;
                }
            }
        }

        writeDb($dbFile, $db);
        echo json_encode($newLease);
        exit;
    }
}

if (preg_match('#^leases/([^/]+)$#', $route, $m)) {
    $leaseId = $m[1];
    if (!isset($db['lease_contracts'])) {
        $db['lease_contracts'] = [];
    }
    $leaseIndex = -1;
    foreach ($db['lease_contracts'] as $idx => $l) {
        if ($l['id'] === $leaseId) {
            $leaseIndex = $idx;
            break;
        }
    }
    if ($leaseIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Lease contract not found.']);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $lease = $db['lease_contracts'][$leaseIndex];
        $oldVehicleId = $lease['vehicleId'];

        if (isset($body['vehicleId'])) $lease['vehicleId'] = $body['vehicleId'];
        if (isset($body['lesseeName'])) $lease['lesseeName'] = $body['lesseeName'];
        if (isset($body['lesseeEmail'])) $lease['lesseeEmail'] = $body['lesseeEmail'];
        if (isset($body['lesseePhone'])) $lease['lesseePhone'] = $body['lesseePhone'];
        if (isset($body['startDate'])) $lease['startDate'] = $body['startDate'];
        if (isset($body['endDate'])) $lease['endDate'] = $body['endDate'];
        if (isset($body['monthlyRate'])) $lease['monthlyRate'] = (float)$body['monthlyRate'];
        if (isset($body['securityDeposit'])) $lease['securityDeposit'] = (float)$body['securityDeposit'];
        
        $oldStatus = $lease['status'];
        if (isset($body['status'])) $lease['status'] = $body['status'];

        // If vehicle changes or status changes, sync the vehicle's status
        if (isset($db['fleet_vehicles'])) {
            if ($oldVehicleId !== $lease['vehicleId']) {
                foreach ($db['fleet_vehicles'] as &$v) {
                    if ($v['id'] === $oldVehicleId) $v['status'] = 'Available';
                    if ($v['id'] === $lease['vehicleId']) $v['status'] = 'Leased';
                }
            }
            if ($lease['status'] !== 'Active' && $oldStatus === 'Active') {
                foreach ($db['fleet_vehicles'] as &$v) {
                    if ($v['id'] === $lease['vehicleId']) {
                        $v['status'] = 'Available';
                        break;
                    }
                }
            }
            if ($lease['status'] === 'Active' && $oldStatus !== 'Active') {
                foreach ($db['fleet_vehicles'] as &$v) {
                    if ($v['id'] === $lease['vehicleId']) {
                        $v['status'] = 'Leased';
                        break;
                    }
                }
            }
        }

        $db['lease_contracts'][$leaseIndex] = $lease;
        writeDb($dbFile, $db);
        echo json_encode($lease);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $lease = $db['lease_contracts'][$leaseIndex];
        $vehicleId = $lease['vehicleId'];
        array_splice($db['lease_contracts'], $leaseIndex, 1);

        if (isset($db['fleet_vehicles'])) {
            foreach ($db['fleet_vehicles'] as &$v) {
                if ($v['id'] === $vehicleId) {
                    $v['status'] = 'Available';
                    break;
                }
            }
        }

        writeDb($dbFile, $db);
        echo json_encode(['success' => true]);
        exit;
    }
}

if (preg_match('#^leases/([^/]+)/payments/([^/]+)$#', $route, $m)) {
    $leaseId = $m[1];
    $payId = $m[2];
    if (!isset($db['lease_contracts'])) {
        $db['lease_contracts'] = [];
    }
    $leaseIndex = -1;
    foreach ($db['lease_contracts'] as $idx => $l) {
        if ($l['id'] === $leaseId) {
            $leaseIndex = $idx;
            break;
        }
    }
    if ($leaseIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Lease contract not found.']);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $payIndex = -1;
        foreach ($db['lease_contracts'][$leaseIndex]['paymentSchedule'] as $idx => $p) {
            if ($p['id'] === $payId) {
                $payIndex = $idx;
                break;
            }
        }
        if ($payIndex === -1) {
            http_response_code(404);
            echo json_encode(['error' => 'Payment record not found.']);
            exit;
        }

        $payStatus = $body['status'] ?? 'Pending';
        $db['lease_contracts'][$leaseIndex]['paymentSchedule'][$payIndex]['status'] = $payStatus;
        if ($payStatus === 'Paid') {
            $db['lease_contracts'][$leaseIndex]['paymentSchedule'][$payIndex]['paymentDate'] = getSystemDate($db)->format('Y-m-d');
        } else {
            $db['lease_contracts'][$leaseIndex]['paymentSchedule'][$payIndex]['paymentDate'] = null;
        }

        writeDb($dbFile, $db);
        echo json_encode($db['lease_contracts'][$leaseIndex]['paymentSchedule'][$payIndex]);
        exit;
    }
}

// --- PAYROLL ENDPOINTS ---
if ($route === 'payroll/runs') {
    if (!isset($db['payroll_runs'])) {
        $db['payroll_runs'] = [];
    }
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode($db['payroll_runs']);
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $runId = 'PR-' . time();
        $newRun = [
            'id' => $runId,
            'month' => $body['month'] ?? '',
            'company' => $body['company'] ?? '',
            'status' => 'Draft',
            'processedDate' => getSystemDate($db)->format('Y-m-d'),
            'processedBy' => $_SESSION['username'] ?? 'hammad',
            'totalGross' => floatval($body['totalGross'] ?? 0),
            'totalDeductions' => floatval($body['totalDeductions'] ?? 0),
            'totalNet' => floatval($body['totalNet'] ?? 0),
            'records' => $body['records'] ?? []
        ];
        $db['payroll_runs'][] = $newRun;
        writeDb($dbFile, $db);
        http_response_code(201);
        echo json_encode($newRun);
        exit;
    }
}

if (preg_match('#^payroll/runs/([^/]+)$#', $route, $m)) {
    $runId = $m[1];
    if (!isset($db['payroll_runs'])) {
        $db['payroll_runs'] = [];
    }
    $runIndex = -1;
    foreach ($db['payroll_runs'] as $idx => $r) {
        if ($r['id'] === $runId) {
            $runIndex = $idx;
            break;
        }
    }
    if ($runIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Payroll run not found.']);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        if ($db['payroll_runs'][$runIndex]['status'] === 'Approved') {
            http_response_code(400);
            echo json_encode(['error' => 'Cannot delete an approved payroll run.']);
            exit;
        }
        array_splice($db['payroll_runs'], $runIndex, 1);
        writeDb($dbFile, $db);
        echo json_encode(['success' => true]);
        exit;
    }
}

if (preg_match('#^payroll/runs/([^/]+)/approve$#', $route, $m)) {
    $runId = $m[1];
    if (!isset($db['payroll_runs'])) {
        $db['payroll_runs'] = [];
    }
    $runIndex = -1;
    foreach ($db['payroll_runs'] as $idx => $r) {
        if ($r['id'] === $runId) {
            $runIndex = $idx;
            break;
        }
    }
    if ($runIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Payroll run not found.']);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $run = &$db['payroll_runs'][$runIndex];
        if ($run['status'] === 'Approved') {
            http_response_code(400);
            echo json_encode(['error' => 'Payroll run is already approved.']);
            exit;
        }
        
        $run['status'] = 'Approved';
        
        // Generate General Ledger Journal Entry
        if (!isset($db['journalEntries'])) {
            $db['journalEntries'] = [];
        }
        
        $lines = [
            ['accountCode' => '7000', 'debit' => $run['totalGross'], 'credit' => 0], // Wages Expense
            ['accountCode' => '2100', 'debit' => 0, 'credit' => $run['totalNet']], // Wages Payable
        ];
        if ($run['totalDeductions'] > 0) {
            // Deductions Payable
            $lines[] = ['accountCode' => '2200', 'debit' => 0, 'credit' => $run['totalDeductions']];
        }
        
        $je = [
            'id' => 'JE-' . time() . 'payroll',
            'date' => getSystemDate($db)->format('Y-m-d'),
            'description' => "Payroll approved for " . $run['company'] . " (" . $run['month'] . ")",
            'company' => $run['company'],
            'referenceType' => 'Payroll',
            'referenceId' => $run['id'],
            'lines' => $lines
        ];
        $db['journalEntries'][] = $je;
        
        writeDb($dbFile, $db);
        echo json_encode($run);
        exit;
    }
}

if (preg_match('#^employees/([^/]+)/salary-structure$#', $route, $m)) {
    $empId = $m[1];
    if (!isset($db['employees'])) {
        $db['employees'] = [];
    }
    $empIndex = -1;
    foreach ($db['employees'] as $idx => $e) {
        if ($e['id'] === $empId) {
            $empIndex = $idx;
            break;
        }
    }
    if ($empIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Employee not found.']);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $db['employees'][$empIndex]['salaryStructure'] = [
            'baseSalary' => floatval($body['baseSalary'] ?? 0),
            'allowances' => [
                'travel' => floatval($body['allowances']['travel'] ?? 0),
                'housing' => floatval($body['allowances']['housing'] ?? 0),
                'mobile' => floatval($body['allowances']['mobile'] ?? 0)
            ],
            'deductions' => [
                'taxPercent' => floatval($body['deductions']['taxPercent'] ?? 0),
                'pensionPercent' => floatval($body['deductions']['pensionPercent'] ?? 0),
                'loanRepayment' => floatval($body['deductions']['loanRepayment'] ?? 0)
            ],
            'bankDetails' => [
                'bankName' => $body['bankDetails']['bankName'] ?? '',
                'iban' => $body['bankDetails']['iban'] ?? '',
                'sortCode' => $body['bankDetails']['sortCode'] ?? ''
            ]
        ];
        writeDb($dbFile, $db);
        echo json_encode($db['employees'][$empIndex]);
        exit;
    }
}

http_response_code(404);
echo json_encode(['error' => 'Route not found.']);
exit;
?>
