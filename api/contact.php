<?php
/**
 * Contact form endpoint for contact.html.
 *
 * Accepts POST fields name, email, message and bot_field (honeypot), validates them and
 * sends the enquiry via authenticated SMTP (PHPMailer) to a fixed recipient.
 *
 * The page posts with fetch() and "Accept: application/json"; it gets JSON back:
 *   200 {"success": true}
 *   405 / 403 / 409 / 422 / 429 / 500 {"success": false, "message": "..."}
 * A browser posting the form without JavaScript (Accept: text/html) is redirected (303) back to
 * contact.html with a fragment (#form-sent, #form-invalid, #form-busy, #form-limit, #form-error)
 * that shows the matching notice on the page.
 *
 * Abuse limits (state kept outside the web root, in the private folder, see private/README.md):
 * - at most RATE_LIMIT_MAX accepted messages per IP address per RATE_LIMIT_WINDOW seconds (429);
 * - the same message from the same IP is never sent twice within DUPLICATE_WINDOW seconds, so a
 *   visitor who resubmits after a slow send does not create a duplicate email.
 *
 * SMTP credentials are NOT stored here. They are read from a private config file outside the
 * web root and/or environment variables; see private/README.md for setup.
 *
 * Requires PHP 7.4+ and PHPMailer 6.1.0 or newer (6.1.0 introduced the ENCRYPTION_* constants
 * used below; 7.x works too).
 */

declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;

const RECIPIENT_EMAIL = 'info@askneticgroup.co.tz';
const MAIL_SUBJECT    = 'New Website Enquiry – Asknetic Group';
const MAIL_TIMEZONE   = 'Africa/Dar_es_Salaam';
const MAX_LENGTHS     = ['name' => 100, 'email' => 254, 'message' => 5000];
const CONFIG_KEYS     = [
    'SMTP_HOST', 'SMTP_PORT', 'SMTP_USERNAME', 'SMTP_PASSWORD', 'SMTP_ENCRYPTION',
    'SMTP_FROM_EMAIL', 'SMTP_FROM_NAME', 'ALLOWED_ORIGINS', 'RATE_LIMIT_MAX', 'RATE_LIMIT_WINDOW',
];
const RATE_LIMIT_MAX     = 5;     // accepted messages per IP address ...
const RATE_LIMIT_WINDOW  = 3600;  // ... per hour (both can be changed in mail-config.php)
const DUPLICATE_WINDOW   = 600;   // an identical message from the same IP within 10 minutes is not sent again
const SENDING_TTL        = 300;   // a send still marked "in progress" after this long is treated as failed
const SMTP_STEP_TIMEOUT  = 8;     // seconds PHPMailer waits for any single SMTP connection or reply
const NOTICE_PAGE        = '/contact.html';

// Never print PHP errors to the visitor; they still go to the server's error log.
ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

/** True when a browser posted the form itself (no JavaScript), so it should get a page, not JSON. */
function wantsHtml(): bool
{
    $accept = strtolower((string) ($_SERVER['HTTP_ACCEPT'] ?? ''));
    return strpos($accept, 'text/html') !== false && strpos($accept, 'application/json') === false;
}

function respond(int $status, array $body, string $notice = ''): void
{
    if ($notice !== '' && wantsHtml()) {
        header('Location: ' . NOTICE_PAGE . '#' . $notice, true, 303);
        exit;
    }
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body);
    exit;
}

function fail(int $status, string $message, string $notice = 'form-error'): void
{
    respond($status, ['success' => false, 'message' => $message], $notice);
}

function logError(string $message): void
{
    error_log('[asknetic contact] ' . $message);
}

/** Directory outside the web root that holds mail-config.php and PHPMailer. */
function privateDir(): string
{
    $dir = getenv('ASKNETIC_PRIVATE_DIR');
    // Default: /home/ACCOUNT/asknetic-private when this file is /home/ACCOUNT/public_html/api/contact.php
    return rtrim($dir !== false && $dir !== '' ? $dir : dirname(__DIR__, 2) . '/asknetic-private', '/\\');
}

/** Settings from the private config file, overridden by environment variables of the same name. */
function loadConfig(): array
{
    $file = privateDir() . '/mail-config.php';
    $config = is_file($file) ? require $file : [];
    if (!is_array($config)) {
        $config = [];
    }
    foreach (CONFIG_KEYS as $key) {
        $env = getenv($key);
        if ($env !== false && $env !== '') {
            $config[$key] = $env;
        }
    }
    return $config;
}

/** Loads PHPMailer from Composer (private/vendor) or a manual upload (private/PHPMailer/src). */
function loadPhpMailer(): bool
{
    $dir = privateDir();
    if (is_file($dir . '/vendor/autoload.php')) {
        require_once $dir . '/vendor/autoload.php';
    } elseif (is_file($dir . '/PHPMailer/src/PHPMailer.php')) {
        require_once $dir . '/PHPMailer/src/Exception.php';
        require_once $dir . '/PHPMailer/src/PHPMailer.php';
        require_once $dir . '/PHPMailer/src/SMTP.php';
    }
    return class_exists(PHPMailer::class);
}

function hostOf(string $url): string
{
    $host = parse_url(strpos($url, '//') === false ? '//' . $url : $url, PHP_URL_HOST);
    return is_string($host) ? strtolower($host) : '';
}

/**
 * Same-origin check. Browsers send Origin on POST (and Referer by default), so a request made from
 * another website's page is rejected, as is one the browser itself labels cross-site
 * (Sec-Fetch-Site) and an opaque "Origin: null" request (sandboxed frames, data: URLs) that has no
 * Referer to check instead. Requests with neither header come from non-browser clients, which could
 * forge them anyway; they are allowed through and still face validation, the honeypot and the limits.
 */
function isAllowedOrigin(array $config): bool
{
    if (strtolower((string) ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '')) === 'cross-site') {
        return false;
    }
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    $source = ($origin === '' || $origin === 'null') ? $referer : $origin;
    if ($source === '') {
        return $origin !== 'null';
    }
    $allowed = [hostOf($_SERVER['HTTP_HOST'] ?? '')];
    foreach (explode(',', (string) ($config['ALLOWED_ORIGINS'] ?? '')) as $extra) {
        $allowed[] = hostOf(trim($extra));
    }
    $host = hostOf($source);
    return $host !== '' && in_array($host, array_filter($allowed), true);
}

/** Trimmed string value of a POST field ('' if missing or not a string). */
function postField(string $key): string
{
    $value = $_POST[$key] ?? '';
    return is_string($value) ? trim($value) : '';
}

/** Length in characters, or -1 if the value is not valid UTF-8. */
function charLength(string $value): int
{
    $count = preg_match_all('/./su', $value);
    return $count === false ? -1 : $count;
}

function escapeHtml(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_HTML5 | ENT_SUBSTITUTE, 'UTF-8');
}

/**
 * Directory for the rate-limit and duplicate-check files: <private dir>/contact-state, outside the
 * web root. Returns null (and the limits are skipped, with a log line) if it cannot be used.
 */
function stateDir(): ?string
{
    $dir = privateDir() . '/contact-state';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return null;
    }
    return is_writable($dir) ? $dir : null;
}

/** Keyed hash, so the state files never contain IP addresses or message text in readable form. */
function stateKey(string $dir, string $value): string
{
    $keyFile = $dir . '/.key';
    $key = is_file($keyFile) ? (string) file_get_contents($keyFile) : '';
    if (strlen($key) < 32) {
        $key = bin2hex(random_bytes(32));
        if (@file_put_contents($keyFile, $key, LOCK_EX) === false) {
            $key = hash('sha256', $dir); // still keyed per installation if the key cannot be stored
        }
        @chmod($keyFile, 0600);
    }
    return hash_hmac('sha256', $value, $key);
}

/** Opens and exclusively locks a small JSON state file. Returns [handle, data] or null. */
function lockState(string $file): ?array
{
    $handle = @fopen($file, 'c+');
    if ($handle === false) {
        return null;
    }
    if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        return null;
    }
    $raw = stream_get_contents($handle);
    $data = json_decode($raw === false ? '' : $raw, true);
    return [$handle, is_array($data) ? $data : []];
}

/** Writes the data (or deletes the file when $data is null) and releases the lock. */
function unlockState($handle, ?array $data, string $file): void
{
    if ($data === null) {
        ftruncate($handle, 0);
        flock($handle, LOCK_UN);
        fclose($handle);
        @unlink($file);
        return;
    }
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, (string) json_encode($data));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
}

/** Occasionally deletes state files nobody has touched for longer than any window. */
function cleanupState(string $dir, int $maxAge): void
{
    if (random_int(1, 20) !== 1) {
        return;
    }
    foreach (glob($dir . '/*.json') ?: [] as $file) {
        $mtime = @filemtime($file);
        if ($mtime !== false && $mtime < time() - $maxAge) {
            @unlink($file);
        }
    }
}

try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        header('Allow: POST');
        fail(405, 'Method not allowed.', '');
    }

    $config = loadConfig();

    if (!isAllowedOrigin($config)) {
        fail(403, 'Request not allowed.');
    }

    // Honeypot: real visitors never see this field. Bots get a normal-looking success and no email is sent.
    if (postField('bot_field') !== '') {
        respond(200, ['success' => true], 'form-sent');
    }

    $name    = postField('name');
    $email   = postField('email');
    $message = str_replace(["\r\n", "\r"], "\n", postField('message'));
    // Drop control characters other than newline and tab from the message.
    $message = (string) preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $message);

    $valid = true;
    foreach (['name' => $name, 'email' => $email, 'message' => $message] as $key => $value) {
        $length = charLength($value);
        if ($length < 1 || $length > MAX_LENGTHS[$key]) {
            $valid = false;
        }
    }
    // Name and email end up in mail headers (Reply-To): no line breaks or other control characters.
    if (preg_match('/[\x00-\x1F\x7F]/', $name . $email)) {
        $valid = false;
    }
    if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
        $valid = false;
    }
    if (!$valid) {
        fail(422, 'Please check your details and try again.', 'form-invalid');
    }

    $smtpHost   = (string) ($config['SMTP_HOST'] ?? '');
    $smtpPort   = (int) ($config['SMTP_PORT'] ?? 0);
    $smtpUser   = (string) ($config['SMTP_USERNAME'] ?? '');
    $smtpPass   = (string) ($config['SMTP_PASSWORD'] ?? '');
    $encryption = strtolower((string) ($config['SMTP_ENCRYPTION'] ?? ''));
    $fromEmail  = (string) ($config['SMTP_FROM_EMAIL'] ?? $smtpUser);
    $fromName   = (string) ($config['SMTP_FROM_NAME'] ?? 'Asknetic Group Website');

    if ($smtpHost === '' || $smtpPort < 1 || $smtpUser === '' || $smtpPass === ''
        || !in_array($encryption, ['ssl', 'tls'], true)
        || filter_var($fromEmail, FILTER_VALIDATE_EMAIL) === false) {
        logError('SMTP configuration missing or incomplete (check mail-config.php in the private folder or the environment variables).');
        fail(500, 'Unable to send your message.');
    }
    if (!loadPhpMailer()) {
        logError('PHPMailer not found in the private folder (vendor/autoload.php or PHPMailer/src).');
        fail(500, 'Unable to send your message.');
    }

    // Duplicate check and per-IP rate limit. REMOTE_ADDR only: forwarding headers can be forged.
    $limitMax    = max(1, (int) ($config['RATE_LIMIT_MAX'] ?? RATE_LIMIT_MAX));
    $limitWindow = max(60, (int) ($config['RATE_LIMIT_WINDOW'] ?? RATE_LIMIT_WINDOW));
    $ip       = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
    $stateDir = stateDir();
    $msgFile  = null;
    if ($stateDir === null) {
        logError('Rate-limit storage is not writable (contact-state folder in the private folder); limits are off.');
    } else {
        cleanupState($stateDir, max($limitWindow, DUPLICATE_WINDOW) + 60);
        $now = time();

        $msgFile = $stateDir . '/msg-' . stateKey($stateDir, $ip . "\n" . strtolower($email) . "\n" . $name . "\n" . $message) . '.json';
        $msgLock = lockState($msgFile);
        if ($msgLock !== null) {
            [$msgHandle, $previous] = $msgLock;
            $state = $previous['state'] ?? '';
            $age = $now - (int) ($previous['at'] ?? 0);
            if ($state === 'sent' && $age < DUPLICATE_WINDOW) {
                unlockState($msgHandle, $previous, $msgFile);
                respond(200, ['success' => true], 'form-sent'); // already delivered: do not send it twice
            }
            if ($state === 'sending' && $age < SENDING_TTL) {
                unlockState($msgHandle, $previous, $msgFile);
                fail(409, 'Your message is still being sent. Please wait a few minutes.', 'form-busy');
            }

            $ipFile = $stateDir . '/ip-' . stateKey($stateDir, $ip) . '.json';
            $ipLock = lockState($ipFile);
            if ($ipLock !== null) {
                [$ipHandle, $ipData] = $ipLock;
                $hits = array_values(array_filter((array) ($ipData['hits'] ?? []), static function ($t) use ($now, $limitWindow) {
                    return is_int($t) && $t > $now - $limitWindow;
                }));
                if (count($hits) >= $limitMax) {
                    unlockState($ipHandle, ['hits' => $hits], $ipFile);
                    unlockState($msgHandle, $previous ?: null, $msgFile);
                    header('Retry-After: ' . max(60, min($hits) + $limitWindow - $now));
                    logError('Rate limit reached for one IP address (' . $limitMax . ' messages per ' . $limitWindow . ' s).');
                    fail(429, 'Too many messages. Please try again later.', 'form-limit');
                }
                $hits[] = $now;
                unlockState($ipHandle, ['hits' => $hits], $ipFile);
            }
            unlockState($msgHandle, ['state' => 'sending', 'at' => $now], $msgFile);
        }
    }

    $sentAt = (new DateTimeImmutable('now', new DateTimeZone(MAIL_TIMEZONE)))->format('j F Y, H:i T');

    $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1f2937">'
        . '<h2 style="font-size:18px;margin:0 0 16px">New website enquiry</h2>'
        . '<table cellpadding="6" cellspacing="0" style="border-collapse:collapse">'
        . '<tr><td style="font-weight:bold;vertical-align:top">Name</td><td>' . escapeHtml($name) . '</td></tr>'
        . '<tr><td style="font-weight:bold;vertical-align:top">Email</td><td><a href="mailto:' . escapeHtml($email) . '">' . escapeHtml($email) . '</a></td></tr>'
        . '<tr><td style="font-weight:bold;vertical-align:top">Submitted</td><td>' . escapeHtml($sentAt) . '</td></tr>'
        . '</table>'
        . '<h3 style="font-size:15px;margin:20px 0 8px">Message</h3>'
        . '<div style="border-left:3px solid #f97316;padding-left:12px">' . nl2br(escapeHtml($message), false) . '</div>'
        . '<p style="font-size:12px;color:#6b7280;margin-top:24px">Sent from the contact form on askneticgroup.co.tz. Reply to this email to respond to the sender.</p>'
        . '</div>';

    $text = "New website enquiry\n\n"
        . "Name: {$name}\n"
        . "Email: {$email}\n"
        . "Submitted: {$sentAt}\n\n"
        . "Message:\n{$message}\n\n"
        . "-- \nSent from the contact form on askneticgroup.co.tz. Reply to this email to respond to the sender.\n";

    // Finish the send even if the visitor's browser stops waiting, so the outcome is recorded.
    ignore_user_abort(true);

    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host       = $smtpHost;
    $mail->Port       = $smtpPort;
    $mail->SMTPAuth   = true;
    $mail->Username   = $smtpUser;
    $mail->Password   = $smtpPass;
    $mail->SMTPSecure = $encryption === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
    $mail->SMTPDebug  = 0;
    // A server that stops answering is given up on after SMTP_STEP_TIMEOUT seconds: Timeout covers the
    // connection and socket reads, Timelimit (PHPMailer's default is 300 s) the wait for each reply.
    // A server that keeps trickling bytes without finishing a reply is not cut short by PHPMailer;
    // the duplicate check above still stops a resubmitted copy from being sent twice.
    $mail->Timeout    = SMTP_STEP_TIMEOUT;
    $mail->getSMTPInstance()->Timelimit = SMTP_STEP_TIMEOUT;
    $mail->CharSet    = PHPMailer::CHARSET_UTF8;

    // From is always the authenticated ASKNETIC mailbox (SPF/DKIM/DMARC); the visitor is only Reply-To.
    $mail->setFrom($fromEmail, $fromName);
    $mail->addAddress(RECIPIENT_EMAIL);
    $mail->addReplyTo($email, $name);

    $mail->isHTML(true);
    $mail->Subject = MAIL_SUBJECT;
    $mail->Body    = $html;
    $mail->AltBody = $text;

    try {
        $mail->send();
    } catch (Throwable $sendError) {
        if ($msgFile !== null && ($lock = lockState($msgFile)) !== null) {
            unlockState($lock[0], null, $msgFile); // failed: let the visitor try again
        }
        throw $sendError;
    }
    if ($msgFile !== null && ($lock = lockState($msgFile)) !== null) {
        unlockState($lock[0], ['state' => 'sent', 'at' => time()], $msgFile);
    }
    respond(200, ['success' => true], 'form-sent');
} catch (Throwable $e) {
    $detail = isset($mail) && $mail instanceof PHPMailer && $mail->ErrorInfo !== '' ? $mail->ErrorInfo : $e->getMessage();
    logError(get_class($e) . ': ' . $detail);
    fail(500, 'Unable to send your message.');
}
