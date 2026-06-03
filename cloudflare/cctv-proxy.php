<?php
/**
 * FunJeju CCTV Proxy (PHP)
 * Cafe24 웹호스팅용 - 한국 IP로 CCTV 원본 스트림 중계
 *
 * 사용법:
 *   m3u8 요청: proxy.php?id=gimnyeong
 *   세그먼트:  proxy.php?id=gimnyeong&seg=http://원본세그먼트URL
 */

// CORS 헤더
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Range');
header('Access-Control-Expose-Headers: Content-Length, Content-Range');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── CCTV 원본 URL 목록 (서버에서만 관리) ──────────────────────
$CCTV_ORIGINS = [
    // 제주시 구좌읍
    'gimnyeong'         => 'http://211.114.96.121:1935/jejusi6/11-20.stream/playlist.m3u8',
    'woljeong'          => 'http://211.114.96.121:1935/jejusi7/11-21.stream/playlist.m3u8',
    'pyeongdae'         => 'http://211.114.96.121:1935/jejusi7/11-22.stream/playlist.m3u8',
    // 제주시 조천읍
    'hamdeok'           => 'http://211.114.96.121:1935/jejusi6/11-19.stream/playlist.m3u8',
    // 제주시 애월읍
    'hagwi'             => 'http://211.114.96.121:1935/jejusi6/11-15.stream/playlist.m3u8',
    'gwakji'            => 'http://211.114.96.121:1935/jejusi6/11-16.stream/playlist.m3u8',
    // 제주시 한림읍
    'hyeopjae'          => 'http://211.114.96.121:1935/jejusi6/11-17.stream/playlist.m3u8',
    'ongpo'             => 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100005/0/1/1.m3u8',
    // 제주시 한경면
    'sinchang'          => 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100004/0/1/1.m3u8',
    'panpo'             => 'http://211.114.96.121:1935/jejusi6/11-18.stream/playlist.m3u8',
    // 제주시 우도면
    'udo_cheonjin'      => 'http://211.114.96.121:1935/jejusi7/11-24.stream/playlist.m3u8',
    'udo_haumoktong'    => 'http://211.114.96.121:1935/jejusi7/11-23.stream/playlist.m3u8',
    // 제주시 삼양동
    'samyang'           => 'http://211.114.96.121:1935/jejusi6/11-14.stream/playlist.m3u8',
    // 제주시 용담동
    'jeju_airport'      => 'http://123.140.197.51/stream/33/play.m3u8',
    // 제주시 탑동
    'tapdong'           => 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100001/0/1/1.m3u8',
    // 제주시 도두동
    'dodu'              => 'http://211.114.96.121:1935/jejusi6/11-13.stream/playlist.m3u8',
    // 제주시 추자면
    'chuja_daeseo'      => 'http://211.114.96.121:1935/jejusi7/11-26.stream/playlist.m3u8',
    'chuja_sinyang'     => 'http://211.114.96.121:1935/jejusi7/11-28.stream/playlist.m3u8',
    'chuja_mukri'       => 'http://211.114.96.121:1935/jejusi7/11-27.stream/playlist.m3u8',
    'chuja_yecho'       => 'http://211.114.96.121:1935/jejusi7/11-29.stream/playlist.m3u8',
    // 서귀포시 성산읍
    'seongsan'          => 'http://123.140.197.51/stream/34/play.m3u8',
    'seongsan_hang'     => 'http://211.34.191.215:1935/live/1-140.stream/playlist.m3u8',
    'seongsan_suma'     => 'http://211.34.191.215:1935/live/1-76.stream/playlist.m3u8',
    'seopjikoji'        => 'http://211.34.191.215:1935/live/1-116.stream/playlist.m3u8',
    'sinsan'            => 'http://211.34.191.215:1935/live/1-143.stream/playlist.m3u8',
    // 서귀포시 남원읍
    'namwon_deokdol'    => 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100006/0/1/1.m3u8',
    'namwon_taeheung'   => 'http://211.34.191.215:1935/live/1-146.stream/playlist.m3u8',
    // 서귀포시 안덕면
    'hwasun'            => 'http://211.34.191.215:1935/live/11-25.stream/playlist.m3u8',
    'sanbangsan'        => 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100012/0/1/1.m3u8',
    // 서귀포시 대정읍
    'sindo'             => 'http://211.34.191.215:1935/live/1-71.stream/playlist.m3u8',
    'mosulpo'           => 'http://211.34.191.215:1935/live/1-155.stream/playlist.m3u8',
    'hamo_beach'        => 'http://211.34.191.215:1935/live/11-24.stream/playlist.m3u8',
    'daejeong_hamo'     => 'http://211.34.191.215:1935/live/1-73.stream/playlist.m3u8',
    // 서귀포시 중문동
    'jungmun'           => 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100010/0/1/1.m3u8',
    // 서귀포시 보목동
    'bomok'             => 'http://211.34.191.215:1935/live/1-152.stream/playlist.m3u8',
    // 서귀포시 서홍동
    'cheonjiyeon'       => 'http://211.34.191.215:1935/live/1-72.stream/playlist.m3u8',
    'saeyeongyo'        => 'http://123.140.197.51/stream/35/play.m3u8',
    // 서귀포시 하예동
    'nonjitmul'         => 'http://211.34.191.215:1935/live/1-193.stream/playlist.m3u8',
    // 서귀포시
    'seogwipo_hang1'    => 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100009/0/1/1.m3u8',
    'seogwipo_hang2'    => 'http://211.34.191.215:1935/live/1-34.stream/playlist.m3u8',
];

// ── 파라미터 파싱 ─────────────────────────────────────────────
$id  = $_GET['id']  ?? '';
$seg = $_GET['seg'] ?? '';

// 세그먼트 프록시 모드
if ($seg) {
    // proxyBase: 현재 id 파라미터 유지 (서브 m3u8 재작성용)
    $segProxyBase = (isset($_SERVER['HTTPS']) ? 'https' : 'http')
                  . '://' . $_SERVER['HTTP_HOST']
                  . $_SERVER['SCRIPT_NAME']
                  . '?id=' . urlencode($id ?: '');
    proxySegment($seg, $segProxyBase);
    exit;
}

// m3u8 프록시 모드
if (!$id || !isset($CCTV_ORIGINS[$id])) {
    http_response_code(404);
    echo json_encode(['error' => "CCTV '$id' not found"]);
    exit;
}

$originUrl  = $CCTV_ORIGINS[$id];
$proxyBase  = (isset($_SERVER['HTTPS']) ? 'https' : 'http')
            . '://' . $_SERVER['HTTP_HOST']
            . $_SERVER['SCRIPT_NAME']
            . '?id=' . urlencode($id);

proxyM3u8($originUrl, $proxyBase);

// ── 함수 ──────────────────────────────────────────────────────

function fetchUrl(string $url): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; FunJeju/1.0)',
        CURLOPT_HTTPHEADER     => ['Accept: */*'],
    ]);
    $body   = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error  = curl_error($ch);
    curl_close($ch);
    return ['body' => $body, 'status' => $status, 'error' => $error];
}

function resolveUrl(string $path, string $base): string {
    if (preg_match('#^https?://#', $path)) return $path;
    // 절대 경로
    if ($path[0] === '/') {
        preg_match('#^(https?://[^/]+)#', $base, $m);
        return ($m[1] ?? '') . $path;
    }
    // 상대 경로
    $dir = preg_replace('#[^/]*$#', '', $base);
    return $dir . $path;
}

function proxyM3u8(string $originUrl, string $proxyBase): void {
    $res = fetchUrl($originUrl);

    if ($res['error'] || $res['status'] !== 200) {
        http_response_code($res['status'] ?: 502);
        echo json_encode(['error' => 'Origin returned ' . $res['status']]);
        return;
    }

    // m3u8 내 URL 재작성
    $lines    = explode("\n", $res['body']);
    $rewritten = [];

    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || $trimmed[0] === '#') {
            $rewritten[] = $line;
            continue;
        }
        $absolute    = resolveUrl($trimmed, $originUrl);
        $rewritten[] = $proxyBase . '&seg=' . urlencode($absolute);
    }

    header('Content-Type: application/vnd.apple.mpegurl');
    header('Cache-Control: no-cache, no-store');
    echo implode("\n", $rewritten);
}

function proxySegment(string $segUrl, string $proxyBase): void {
    // 서브 m3u8(chunklist)이면 URL 재작성 처리 (PHP 7 호환)
    $path = parse_url($segUrl, PHP_URL_PATH) ?? '';
    if (substr($path, -5) === '.m3u8' || strpos($segUrl, '.m3u8') !== false) {
        proxyM3u8($segUrl, $proxyBase);
        return;
    }

    // .ts 세그먼트 스트리밍
    $headers = ['Accept: */*'];
    if (!empty($_SERVER['HTTP_RANGE'])) {
        $headers[] = 'Range: ' . $_SERVER['HTTP_RANGE'];
    }

    $ch = curl_init($segUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; FunJeju/1.0)',
        CURLOPT_HTTPHEADER     => $headers,
    ]);
    $body   = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $ctype  = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);

    http_response_code($status);
    header('Content-Type: ' . ($ctype ?: 'video/MP2T'));
    header('Cache-Control: public, max-age=10');
    echo $body;
}
