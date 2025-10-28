<?php
require_once __DIR__ . '/../vendor/autoload.php';

$loader = new \Twig\Loader\FilesystemLoader(__DIR__ . '/../templates');
$twig = new \Twig\Environment($loader, [
    'cache' => false,
]);

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// A simple server-side route guard: if route is protected and cookie not present -> redirect to /auth/login
$protected = ['/dashboard', '/tickets'];

$cookieToken = $_COOKIE['ticketapp_session'] ?? null;

if (in_array($uri, $protected) && !$cookieToken) {
    header('Location: /auth/login');
    exit;
}

switch ($uri) {
    case '/':
        echo $twig->render('landing.twig', []);
        break;
    case '/auth/login':
    case '/auth/signup':
        // render same auth template; JS handles login/signup mode
        echo $twig->render('auth.twig', ['mode' => $uri === '/auth/signup' ? 'signup' : 'login']);
        break;
    case '/dashboard':
        echo $twig->render('dashboard.twig');
        break;
    case '/tickets':
        echo $twig->render('tickets.twig');
        break;
    default:
        // basic 404
        http_response_code(404);
        echo $twig->render('base.twig', ['content' => '<h2>404 - Not Found</h2><p>Page not found.</p>']);
        break;
}
