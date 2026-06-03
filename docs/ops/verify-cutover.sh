#!/usr/bin/env bash
# =============================================================================
# verify-cutover.sh — read-only verification matrix for the
#                     journals.digitopub.com cutover (Stages C & D).
#
# Every check is a single `curl`. Nothing here writes to OJS, the apex, DNS,
# Crossref, or Search Console. Run it as many times as needed; failures are
# diagnostic, never destructive.
#
# Usage
# -----
#   bash docs/ops/verify-cutover.sh
#
# Override the fixture with environment variables when validating a different
# article — the defaults point at OJBR submission #32 / DOI 10.26629/ojbr.2026.02:
#
#   JOURNAL_SLUG=ijmp SUBMISSION_ID=14 GALLEY_ID=27 \
#     DOI=10.26629/ijmp.2025.07 \
#     bash docs/ops/verify-cutover.sh
#
# Exit status
# -----------
#   0  every check PASSed → "CUTOVER VERIFIED"
#   1  one or more FAILed → matrix above shows which
# =============================================================================

set -uo pipefail

# ─── Fixture (override via env) ──────────────────────────────────────────────

SUBDOMAIN="${SUBDOMAIN:-https://journals.digitopub.com}"
LEGACY="${LEGACY:-https://submitmanager.com}"
APEX="${APEX:-https://digitopub.com}"

JOURNAL_SLUG="${JOURNAL_SLUG:-ojbr}"
SUBMISSION_ID="${SUBMISSION_ID:-32}"
GALLEY_ID="${GALLEY_ID:-32}"
DOI="${DOI:-10.26629/ojbr.2026.02}"

# Apex-side identifiers. The apex article route is
# /journals/[id]/articles/[publicationId] where [publicationId] is the apex
# publicationId (NOT the OJS submission_id — see CLAUDE.md / T1 inventory).
# Override to match the apex's view of the same article.
APEX_JOURNAL_ID="${APEX_JOURNAL_ID:-10}"
APEX_PUBLICATION_ID="${APEX_PUBLICATION_ID:-$SUBMISSION_ID}"

# Image fixtures — override to test specific assets. The defaults assume the
# standard OJS public path layout. If the install renames files, point these
# at real ones.
COVER_IMAGE_URL="${COVER_IMAGE_URL:-$SUBDOMAIN/public/journals/10/cover_issue_1_en_US.png}"
EDITORIAL_IMAGE_URL="${EDITORIAL_IMAGE_URL:-$SUBDOMAIN/public/site/profileImages/user.jpg}"
HIGHLIGHTS_IMAGE_URL="${HIGHLIGHTS_IMAGE_URL:-$SUBDOMAIN/public/journals/10/highlight.jpg}"

# The expected target of the iJMP Scholar Highlights card (T3 lock fixture).
# Override if a different card is being verified.
HIGHLIGHTS_PAGE_URL="${HIGHLIGHTS_PAGE_URL:-$APEX/journals/$APEX_JOURNAL_ID}"
EXPECTED_SCHOLAR_URL_FRAGMENT="${EXPECTED_SCHOLAR_URL_FRAGMENT:-hl=en&user=}"

# ─── Plumbing ────────────────────────────────────────────────────────────────

GOOGLEBOT_UA="Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
SCHOLAR_UA="Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) Google-Scholar"
CURL_TIMEOUT="${CURL_TIMEOUT:-20}"

PASS_COUNT=0
FAIL_COUNT=0
FAILED_CHECKS=()

if [[ -t 1 ]]; then
    C_GREEN=$'\033[32m'
    C_RED=$'\033[31m'
    C_DIM=$'\033[2m'
    C_BOLD=$'\033[1m'
    C_RESET=$'\033[0m'
else
    C_GREEN="" ; C_RED="" ; C_DIM="" ; C_BOLD="" ; C_RESET=""
fi

pass() {
    local label="$1" detail="${2:-}"
    PASS_COUNT=$((PASS_COUNT + 1))
    printf '  %sPASS%s  %s' "$C_GREEN" "$C_RESET" "$label"
    [[ -n "$detail" ]] && printf '  %s%s%s' "$C_DIM" "$detail" "$C_RESET"
    printf '\n'
}

fail() {
    local label="$1" detail="${2:-}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_CHECKS+=("$label")
    printf '  %sFAIL%s  %s' "$C_RED" "$C_RESET" "$label"
    [[ -n "$detail" ]] && printf '  %s%s%s' "$C_DIM" "$detail" "$C_RESET"
    printf '\n'
}

section() {
    printf '\n%s%s%s\n' "$C_BOLD" "$1" "$C_RESET"
}

# Headers-only fetch with a 10s timeout, follows redirects, browser-like UA.
http_head() {
    local url="$1" ua="${2:-$GOOGLEBOT_UA}"
    curl -sSL --max-time "$CURL_TIMEOUT" -A "$ua" \
        -o /dev/null -D - -w '' "$url" 2>/dev/null
}

# Headers-only fetch WITHOUT following redirects, so we can inspect the
# Location header on a 301 / 302.
http_head_no_redirect() {
    local url="$1" ua="${2:-$GOOGLEBOT_UA}"
    curl -sS --max-time "$CURL_TIMEOUT" -A "$ua" \
        -o /dev/null -D - -w '' "$url" 2>/dev/null
}

# Body fetch.
http_body() {
    local url="$1" ua="${2:-$GOOGLEBOT_UA}"
    curl -sSL --max-time "$CURL_TIMEOUT" -A "$ua" "$url" 2>/dev/null
}

# Body + final-URL fetch (after redirects).
http_body_final_url() {
    local url="$1" ua="${2:-$GOOGLEBOT_UA}"
    curl -sSL --max-time "$CURL_TIMEOUT" -A "$ua" \
        -w '\n__FINAL_URL__=%{url_effective}\n' "$url" 2>/dev/null
}

# Extract a header value (case-insensitive) from raw HTTP headers on stdin.
header_value() {
    local name="$1"
    awk -v key="^${name}:" 'tolower($0) ~ tolower(key) { sub(/^[^:]+:[[:space:]]*/, ""); sub(/\r$/, ""); print; exit }'
}

# Extract the FINAL status code (after redirects) from a raw header stream.
final_status() {
    grep -E '^HTTP/' | tail -n 1 | awk '{print $2}'
}

# ─── Banner ──────────────────────────────────────────────────────────────────

printf '%s== verify-cutover.sh ==%s\n' "$C_BOLD" "$C_RESET"
printf '  subdomain      : %s\n' "$SUBDOMAIN"
printf '  legacy host    : %s\n' "$LEGACY"
printf '  apex           : %s\n' "$APEX"
printf '  fixture article: %s / submission %s / galley %s\n' "$JOURNAL_SLUG" "$SUBMISSION_ID" "$GALLEY_ID"
printf '  fixture DOI    : %s\n' "$DOI"

# ─── 1. OJS robots allows article + download paths ───────────────────────────

section "1. OJS robots allows /article/view and /article/download"
robots_body=$(http_body "$SUBDOMAIN/robots.txt")
if [[ -z "$robots_body" ]]; then
    fail "robots.txt fetch" "$SUBDOMAIN/robots.txt unreachable"
else
    blanket_disallow=$(printf '%s' "$robots_body" | grep -iE '^\s*Disallow:\s*/\s*$' || true)
    if [[ -n "$blanket_disallow" ]]; then
        fail "robots.txt is crawlable" "blanket Disallow: / present"
    else
        pass "robots.txt is crawlable" "no blanket Disallow"
    fi

    if printf '%s' "$robots_body" | grep -qiE 'Disallow:\s*/.*article/view'; then
        fail "robots.txt allows article landings" "Disallow contains /article/view"
    else
        pass "robots.txt allows article landings"
    fi

    if printf '%s' "$robots_body" | grep -qiE 'Disallow:\s*/.*article/download'; then
        fail "robots.txt allows PDF downloads" "Disallow contains /article/download"
    else
        pass "robots.txt allows PDF downloads"
    fi
fi

# ─── 2. Landing page emits citation_* + OJS generator (Googlebot UA) ─────────

section "2. Landing page (Googlebot UA): 200 text/html + citation_* + OJS generator"
landing_url="$SUBDOMAIN/index.php/$JOURNAL_SLUG/article/view/$SUBMISSION_ID"
landing_headers=$(http_head "$landing_url" "$GOOGLEBOT_UA")
landing_status=$(printf '%s' "$landing_headers" | final_status)
landing_ctype=$(printf '%s' "$landing_headers" | header_value "Content-Type" | awk -F';' '{print tolower($1)}' | tr -d '[:space:]')
landing_body=$(http_body "$landing_url" "$GOOGLEBOT_UA")

if [[ "$landing_status" == "200" ]]; then
    pass "landing returns 200" "$landing_url"
else
    fail "landing returns 200" "got $landing_status from $landing_url"
fi

if [[ "$landing_ctype" == "text/html" ]]; then
    pass "landing content-type is text/html" "$landing_ctype"
else
    fail "landing content-type is text/html" "got $landing_ctype"
fi

if printf '%s' "$landing_body" | grep -qE '<meta[^>]+name=["'"'"']citation_(title|author|pdf_url|journal_title)["'"'"']'; then
    pass "landing carries Highwire citation_* tags"
else
    fail "landing carries Highwire citation_* tags" "no citation_title/author/pdf_url/journal_title meta"
fi

if printf '%s' "$landing_body" | grep -qiE '<meta[^>]+name=["'"'"']generator["'"'"'][^>]+content=["'"'"'][^"'"'"']*Open[ -]?Journal[ -]?Systems'; then
    pass "landing carries OJS generator tag"
else
    fail "landing carries OJS generator tag" "no generator=Open Journal Systems"
fi

# ─── 3. citation_pdf_url = same-host open PDF (THE PRIZE) ────────────────────

section "3. ★ citation_pdf_url is same-host, returns 200 application/pdf, no login ★"
printf '  %s(this is THE single most important cutover check)%s\n' "$C_DIM" "$C_RESET"

pdf_url=$(printf '%s' "$landing_body" \
    | grep -iEo '<meta[^>]+name=["'"'"']citation_pdf_url["'"'"'][^>]+content=["'"'"'][^"'"'"']+["'"'"']' \
    | head -n 1 \
    | grep -iEo 'content=["'"'"'][^"'"'"']+["'"'"']' \
    | sed -e 's/^content=["'"'"']//' -e 's/["'"'"']$//')

if [[ -z "$pdf_url" ]]; then
    fail "citation_pdf_url present" "no citation_pdf_url meta tag in landing"
else
    pdf_host=$(printf '%s' "$pdf_url" | awk -F/ '{print $3}')
    sub_host=$(printf '%s' "$SUBDOMAIN" | awk -F/ '{print $3}')
    if [[ "$pdf_host" == "$sub_host" ]]; then
        pass "citation_pdf_url is on the subdomain" "$pdf_url"
    else
        fail "citation_pdf_url is on the subdomain" "host=$pdf_host (expected $sub_host)"
    fi

    pdf_headers=$(http_head_no_redirect "$pdf_url" "$SCHOLAR_UA")
    pdf_status=$(printf '%s' "$pdf_headers" | final_status)
    pdf_location=$(printf '%s' "$pdf_headers" | header_value "Location")
    pdf_ctype=$(printf '%s' "$pdf_headers" | header_value "Content-Type" | awk -F';' '{print tolower($1)}' | tr -d '[:space:]')

    if [[ "$pdf_status" =~ ^30[0-9]$ ]]; then
        if printf '%s' "$pdf_location" | grep -qiE 'login|sign[-_]?in|user/register'; then
            fail "PDF does not redirect to login" "Location: $pdf_location"
        else
            fail "PDF returns 200 (not redirected)" "status=$pdf_status Location=$pdf_location"
        fi
    elif [[ "$pdf_status" == "200" ]]; then
        pass "PDF returns 200"
    else
        fail "PDF returns 200" "got $pdf_status"
    fi

    if [[ "$pdf_ctype" == "application/pdf" ]]; then
        pass "PDF content-type is application/pdf" "$pdf_ctype"
    else
        fail "PDF content-type is application/pdf" "got $pdf_ctype"
    fi
fi

# ─── 4. DOI resolves to journals.digitopub.com ───────────────────────────────

section "4. DOI resolves to the subdomain"
doi_url="https://doi.org/$DOI"
doi_final=$(http_body_final_url "$doi_url" "$GOOGLEBOT_UA" | awk -F= '/^__FINAL_URL__=/{print $2}' | tail -n 1)

if [[ -z "$doi_final" ]]; then
    fail "DOI fetch" "$doi_url did not resolve"
else
    doi_host=$(printf '%s' "$doi_final" | awk -F/ '{print $3}')
    sub_host=$(printf '%s' "$SUBDOMAIN" | awk -F/ '{print $3}')
    if [[ "$doi_host" == "$sub_host" ]]; then
        pass "DOI lands on $sub_host" "$doi_final"
    else
        fail "DOI lands on $sub_host" "landed on $doi_host ($doi_final)"
    fi
fi

# ─── 5. Apex defers: 0 citation_*, 0 ScholarlyArticle, canonical → subdomain ──

section "5. Apex article emits no scholarly metadata; canonical defers to subdomain"
apex_url="$APEX/journals/$APEX_JOURNAL_ID/articles/$APEX_PUBLICATION_ID"
apex_body=$(http_body "$apex_url" "$GOOGLEBOT_UA")

if [[ -z "$apex_body" ]]; then
    fail "apex page fetch" "$apex_url unreachable"
else
    apex_citation_count=$(printf '%s' "$apex_body" | grep -ciE '<meta[^>]+name=["'"'"']citation_' || true)
    if [[ "$apex_citation_count" -eq 0 ]]; then
        pass "apex emits 0 citation_* meta tags"
    else
        fail "apex emits 0 citation_* meta tags" "found $apex_citation_count"
    fi

    if printf '%s' "$apex_body" | grep -qE '"@type"\s*:\s*"ScholarlyArticle"'; then
        fail "apex emits 0 ScholarlyArticle JSON-LD" "ScholarlyArticle present"
    else
        pass "apex emits 0 ScholarlyArticle JSON-LD"
    fi

    canonical_href=$(printf '%s' "$apex_body" \
        | grep -iEo '<link[^>]+rel=["'"'"']canonical["'"'"'][^>]+href=["'"'"'][^"'"'"']+["'"'"']' \
        | head -n 1 \
        | grep -iEo 'href=["'"'"'][^"'"'"']+["'"'"']' \
        | sed -e 's/^href=["'"'"']//' -e 's/["'"'"']$//')

    if [[ -z "$canonical_href" ]]; then
        fail "apex emits <link rel=canonical>" "no canonical link tag"
    else
        canonical_host=$(printf '%s' "$canonical_href" | awk -F/ '{print $3}')
        sub_host=$(printf '%s' "$SUBDOMAIN" | awk -F/ '{print $3}')
        if [[ "$canonical_host" == "$sub_host" ]]; then
            pass "apex canonical → $sub_host" "$canonical_href"
        else
            fail "apex canonical → $sub_host" "points to $canonical_host"
        fi
    fi
fi

# ─── 6. submitmanager.com → 301 → subdomain ─────────────────────────────────

section "6. submitmanager.com returns 301 → journals.digitopub.com"
legacy_url="$LEGACY/index.php/$JOURNAL_SLUG/article/view/$SUBMISSION_ID"
legacy_headers=$(http_head_no_redirect "$legacy_url" "$GOOGLEBOT_UA")
legacy_status=$(printf '%s' "$legacy_headers" | grep -E '^HTTP/' | head -n 1 | awk '{print $2}')
legacy_location=$(printf '%s' "$legacy_headers" | header_value "Location")

if [[ "$legacy_status" == "301" ]]; then
    pass "legacy host returns 301" "status=$legacy_status"
else
    fail "legacy host returns 301" "got $legacy_status"
fi

if [[ -n "$legacy_location" ]]; then
    loc_host=$(printf '%s' "$legacy_location" | awk -F/ '{print $3}')
    sub_host=$(printf '%s' "$SUBDOMAIN" | awk -F/ '{print $3}')
    if [[ "$loc_host" == "$sub_host" ]]; then
        pass "legacy 301 Location targets subdomain" "$legacy_location"
    else
        fail "legacy 301 Location targets subdomain" "Location: $legacy_location"
    fi
else
    fail "legacy 301 Location header present" "no Location header"
fi

# ─── 7. cover + editorial + Highlights images via /api/image-proxy ──────────
#       (T2 lock — pipeline must survive the cutover)

section "7. T2 lock — cover, editorial photo, Highlights image all 200 image/* via /api/image-proxy"

check_proxied_image() {
    local label="$1" src_url="$2"
    if ! command -v jq >/dev/null 2>&1; then
        : # jq optional; we URL-encode with awk below
    fi
    local encoded
    encoded=$(printf '%s' "$src_url" \
        | awk 'BEGIN{for(i=0;i<256;i++)hex[sprintf("%c",i)]=sprintf("%%%02X",i)}
               { s=""; for(i=1;i<=length($0);i++){ c=substr($0,i,1);
                 if(c~/[A-Za-z0-9._~-]/) s=s c; else s=s hex[c] } print s }')
    local proxy_url="$APEX/api/image-proxy?url=$encoded"
    local headers
    headers=$(http_head "$proxy_url" "$GOOGLEBOT_UA")
    local status ctype
    status=$(printf '%s' "$headers" | final_status)
    ctype=$(printf '%s' "$headers" | header_value "Content-Type" | awk -F';' '{print tolower($1)}' | tr -d '[:space:]')

    if [[ "$status" == "200" && "$ctype" == image/* ]]; then
        pass "$label" "200 $ctype"
    else
        fail "$label" "status=$status content-type=$ctype"
    fi
}

check_proxied_image "cover image via /api/image-proxy" "$COVER_IMAGE_URL"
check_proxied_image "editorial photo via /api/image-proxy" "$EDITORIAL_IMAGE_URL"
check_proxied_image "Highlights image via /api/image-proxy" "$HIGHLIGHTS_IMAGE_URL"

# ─── 8. Highlights link renders ?hl=en&user=... with no &amp; (T3 lock) ─────

section "8. T3 lock — Highlights Scholar link has decoded &, no &amp;"
hl_body=$(http_body "$HIGHLIGHTS_PAGE_URL" "$GOOGLEBOT_UA")

if [[ -z "$hl_body" ]]; then
    fail "Highlights page fetch" "$HIGHLIGHTS_PAGE_URL unreachable"
else
    scholar_href=$(printf '%s' "$hl_body" \
        | grep -iEo 'https?://scholar\.google\.[a-z.]+/citations\?[^"'"'"' <>]+' \
        | head -n 1)

    if [[ -z "$scholar_href" ]]; then
        fail "Highlights page contains a Scholar link" "no scholar.google href"
    else
        if [[ "$scholar_href" == *"&amp;"* ]]; then
            fail "Scholar link is entity-decoded" "still contains &amp;: $scholar_href"
        else
            pass "Scholar link is entity-decoded" "$scholar_href"
        fi

        if [[ "$scholar_href" == *"$EXPECTED_SCHOLAR_URL_FRAGMENT"* ]]; then
            pass "Scholar link matches expected fragment" "contains $EXPECTED_SCHOLAR_URL_FRAGMENT"
        else
            fail "Scholar link matches expected fragment" "expected to contain '$EXPECTED_SCHOLAR_URL_FRAGMENT'"
        fi
    fi
fi

# ─── Summary ────────────────────────────────────────────────────────────────

printf '\n%s== summary ==%s\n' "$C_BOLD" "$C_RESET"
printf '  PASS  : %d\n' "$PASS_COUNT"
printf '  FAIL  : %d\n' "$FAIL_COUNT"

if [[ "$FAIL_COUNT" -eq 0 ]]; then
    printf '\n%sCUTOVER VERIFIED%s — all %d checks green.\n' "$C_GREEN$C_BOLD" "$C_RESET" "$PASS_COUNT"
    exit 0
else
    printf '\n%sCUTOVER NOT YET COMPLETE%s — %d failing:\n' "$C_RED$C_BOLD" "$C_RESET" "$FAIL_COUNT"
    for f in "${FAILED_CHECKS[@]}"; do
        printf '    - %s\n' "$f"
    done
    exit 1
fi
