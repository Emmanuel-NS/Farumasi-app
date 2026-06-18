# FARUMASI Live QA — production API user-journey tests
$base = "https://farumasi-app.onrender.com/api/v1"
$results = @()

function Record($id, $area, $test, $status, $detail) {
  $script:results += [PSCustomObject]@{ Id=$id; Area=$area; Test=$test; Status=$status; Detail=$detail }
}

function Login($email, $password, $extra = @{}) {
  $body = @{ email = $email; password = $password } + $extra
  $json = $body | ConvertTo-Json
  $r = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body $json -ContentType "application/json"
  return $r
}

function ApiGet($path, $token) {
  $h = @{ Authorization = "Bearer $token" }
  return Invoke-RestMethod -Uri "$base$path" -Method GET -Headers $h
}

function ApiPost($path, $token, $body) {
  $h = @{ Authorization = "Bearer $token" }
  $json = $body | ConvertTo-Json -Depth 10
  return Invoke-RestMethod -Uri "$base$path" -Method POST -Headers $h -Body $json -ContentType "application/json"
}

function ApiPatch($path, $token, $body) {
  $h = @{ Authorization = "Bearer $token" }
  $json = $body | ConvertTo-Json -Depth 10
  return Invoke-RestMethod -Uri "$base$path" -Method PATCH -Headers $h -Body $json -ContentType "application/json"
}

function TryTest($id, $area, $test, [scriptblock]$block) {
  try {
    $detail = & $block
    Record $id $area $test "PASS" ($detail -as [string])
  } catch {
    $msg = $_.Exception.Message
    if ($_.ErrorDetails.Message) { $msg = $_.ErrorDetails.Message }
    Record $id $area $test "FAIL" $msg
  }
}

# --- PUBLIC / GUEST ---
TryTest "G01" "Guest" "API health" { (Invoke-RestMethod "$base/../health").status }
TryTest "G02" "Guest" "Browse products (store)" { $p = Invoke-RestMethod "$base/products/?limit=5&only_with_listings=true"; "count=$($p.total)" }
TryTest "G03" "Guest" "Browse listings" { $l = Invoke-RestMethod "$base/listings/?limit=5"; "count=$($l.total)" }
TryTest "G04" "Guest" "Browse open pharmacies" { $ph = Invoke-RestMethod "$base/pharmacies/?open_only=true&limit=10"; "count=$($ph.total)" }
TryTest "G05" "Guest" "Browse public partners" { $pa = Invoke-RestMethod "$base/partners/public/?limit=10"; "count=$($pa.total)" }
TryTest "G06" "Guest" "Public config (delivery, OAuth)" { $c = Invoke-RestMethod "$base/config/public"; "langs=$($c.supported_languages -join ',')" }
TryTest "G07" "Guest" "Health articles (public)" { $a = Invoke-RestMethod "$base/articles/?limit=5"; "count=$($a.total)" }
TryTest "G08" "Guest" "Product categories" { $cat = Invoke-RestMethod "$base/products/categories/"; "count=$($cat.Count)" }

# --- AUTH: each role login ---
$tokens = @{}
$logins = @(
  @{ Key="admin"; Email="admin@farumasi.com"; Pass="Admin@12345"; Extra=@{} },
  @{ Key="patient"; Email="patient@farumasi.com"; Pass="Patient@12345"; Extra=@{ role="patient" } },
  @{ Key="pharmacist"; Email="pharmacist@farumasi.com"; Pass="Pharmacist@12345"; Extra=@{} },
  @{ Key="pharmacy_admin"; Email="pharmacy_admin@farumasi.com"; Pass="Pharmacy@12345"; Extra=@{ portal="partner" } },
  @{ Key="partner"; Email="partner_admin@farumasi.com"; Pass="Partner@12345"; Extra=@{ portal="partner" } },
  @{ Key="rider"; Email="rider@farumasi.com"; Pass="Rider@12345"; Extra=@{ role="rider" } },
  @{ Key="doctor"; Email="doctor@farumasi.com"; Pass="Doctor@12345"; Extra=@{} },
  @{ Key="finance"; Email="finance@farumasi.com"; Pass="Finance@12345"; Extra=@{} },
  @{ Key="operations"; Email="operations@farumasi.com"; Pass="Operations@12345"; Extra=@{} },
  @{ Key="compliance"; Email="compliance@farumasi.com"; Pass="Compliance@12345"; Extra=@{} }
)

foreach ($l in $logins) {
  TryTest "A-$($l.Key)" "Auth" "Login as $($l.Key)" {
    $r = Login $l.Email $l.Pass $l.Extra
    if (-not $r.access_token) { throw "no access_token" }
    $script:tokens[$l.Key] = $r.access_token
    $me = ApiGet "/users/me" $r.access_token
    "role=$($me.role)"
  }
}

# --- PATIENT flows ---
if ($tokens.patient) {
  $pt = $tokens.patient
  TryTest "P01" "Patient" "View my profile" { $m = ApiGet "/users/me" $pt; $m.email }
  TryTest "P02" "Patient" "List my prescriptions" { $rx = ApiGet "/patients/me/prescriptions" $pt; "count=$($rx.Count)" }
  TryTest "P03" "Patient" "List my orders" { $o = ApiGet "/patients/me/orders" $pt; "count=$($o.Count)" }
  TryTest "P04" "Patient" "List my addresses" { $a = ApiGet "/patients/me/addresses" $pt; "count=$($a.Count)" }
  TryTest "P05" "Patient" "List notifications" { $n = ApiGet "/notifications/" $pt; "total=$($n.total)" }
  TryTest "P06" "Patient" "Consultations inbox" { $c = ApiGet "/consultations/" $pt; "total=$($c.total)" }
}

# --- PHARMACIST flows ---
if ($tokens.pharmacist) {
  $ph = $tokens.pharmacist
  TryTest "PH01" "Pharmacist" "My pharmacist profile" { $m = ApiGet "/pharmacists/me" $ph; $m.specialization }
  TryTest "PH02" "Pharmacist" "Prescription review queue" { $q = ApiGet "/pharmacists/prescription-reviews?limit=10" $ph; "total=$($q.total)" }
  TryTest "PH03" "Pharmacist" "All prescriptions list" { $rx = ApiGet "/prescriptions/?limit=10" $ph; "total=$($rx.total)" }
  TryTest "PH04" "Pharmacist" "Pharmacy orders (all)" { $o = ApiGet "/orders/pharmacy/all?limit=10" $ph; "total=$($o.total)" }
  TryTest "PH05" "Pharmacist" "Product catalogue browse" { $p = ApiGet "/products/?limit=5" $ph; "total=$($p.total)" }
  TryTest "PH06" "Pharmacist" "Health articles (manage)" { $a = ApiGet "/articles/?limit=5" $ph; "total=$($a.total)" }
  TryTest "PH07" "Pharmacist" "Product requests queue" { $pr = ApiGet "/product-requests/?limit=10" $ph; "total=$($pr.total)" }
  TryTest "PH08" "Pharmacist" "Consultations" { $c = ApiGet "/consultations/" $ph; "total=$($c.total)" }
  TryTest "PH09" "Pharmacist" "Toggle availability" { $r = ApiPatch "/pharmacists/me/availability" $ph @{ is_available = $true }; "available=$($r.is_available)" }
}

# --- PHARMACY ADMIN (partner portal) ---
if ($tokens.pharmacy_admin) {
  $pa = $tokens.pharmacy_admin
  TryTest "PA01" "Pharmacy Admin" "My pharmacy profile" { $p = ApiGet "/pharmacies/me" $pa; $p.name }
  TryTest "PA02" "Pharmacy Admin" "My listings" { $l = ApiGet "/pharmacies/me/listings?limit=10" $pa; "total=$($l.total)" }
  TryTest "PA03" "Pharmacy Admin" "My orders" { $o = ApiGet "/pharmacies/me/orders?limit=10" $pa; "total=$($o.total)" }
  TryTest "PA04" "Pharmacy Admin" "Revenue summary" { $r = ApiGet "/pharmacies/me/revenue/summary" $pa; "balance=$($r.available_balance)" }
  TryTest "PA05" "Pharmacy Admin" "Withdrawals list" { $w = ApiGet "/pharmacies/me/withdrawals" $pa; "count=$($w.Count)" }
}

# --- PARTNER COMPANY ADMIN ---
if ($tokens.partner) {
  $pr = $tokens.partner
  TryTest "PT01" "Partner" "My company profile" { $p = ApiGet "/partners/me" $pr; "$($p.name) status=$($p.status)" }
  TryTest "PT02" "Partner" "My listings" { $l = ApiGet "/partners/me/listings?limit=10" $pr; "total=$($l.total)" }
  TryTest "PT03" "Partner" "Partner orders" { $o = ApiGet "/partners/me/orders?limit=10" $pr; "total=$($o.total)" }
  TryTest "PT04" "Partner" "Revenue summary" { $r = ApiGet "/partners/me/revenue/summary" $pr; "balance=$($r.available_balance)" }
}

# --- SUPER ADMIN ---
if ($tokens.admin) {
  $ad = $tokens.admin
  TryTest "SA01" "Super Admin" "List patients" { $u = ApiGet "/users/?role=patient&limit=5" $ad; "total=$($u.total)" }
  TryTest "SA02" "Super Admin" "List pharmacists" { $u = ApiGet "/users/?role=pharmacist&limit=5" $ad; "total=$($u.total)" }
  TryTest "SA03" "Super Admin" "List all pharmacies" { $p = ApiGet "/pharmacies/?limit=10" $ad; "total=$($p.total)" }
  TryTest "SA04" "Super Admin" "List all partners" { $p = ApiGet "/partners/?limit=10" $ad; "total=$($p.total)" }
  TryTest "SA05" "Super Admin" "Partner applications queue" { $p = ApiGet "/partners/?applications_only=true&limit=10" $ad; "pending=$($p.total)" }
  TryTest "SA06" "Super Admin" "All orders" { $o = ApiGet "/orders/?limit=10" $ad; "total=$($o.total)" }
  TryTest "SA07" "Super Admin" "Prescriptions admin" { $rx = ApiGet "/prescriptions/?limit=10" $ad; "total=$($rx.total)" }
  TryTest "SA08" "Super Admin" "Audit logs" { $a = ApiGet "/admin/audit-logs/?limit=5" $ad; "total=$($a.total)" }
  TryTest "SA09" "Super Admin" "Admin analytics" { $an = ApiGet "/analytics/admin" $ad; "orders=$($an.total_orders)" }
  TryTest "SA10" "Super Admin" "Withdrawals (pending)" { $w = ApiGet "/withdrawals/?limit=10" $ad; "total=$($w.total)" }
}

# --- FINANCE / OPS / COMPLIANCE admin API access ---
if ($tokens.finance) {
  TryTest "FA01" "Finance Admin" "View withdrawals" { $w = ApiGet "/withdrawals/?limit=5" $tokens.finance; "total=$($w.total)" }
}
if ($tokens.operations) {
  TryTest "OA01" "Ops Admin" "View all orders" { $o = ApiGet "/orders/?limit=5" $tokens.operations; "total=$($o.total)" }
}
if ($tokens.compliance) {
  TryTest "CA01" "Compliance Admin" "View audit logs" { $a = ApiGet "/admin/audit-logs/?limit=5" $tokens.compliance; "total=$($a.total)" }
}

# --- RIDER ---
if ($tokens.rider) {
  $rd = $tokens.rider
  TryTest "R01" "Rider" "Rider profile" { $m = ApiGet "/riders/me" $rd; $m.vehicle_type }
  TryTest "R02" "Rider" "My deliveries" { $d = ApiGet "/deliveries/?limit=10" $rd; "total=$($d.total)" }
  TryTest "R03" "Rider" "Toggle availability" { $r = ApiPatch "/riders/me/availability" $rd @{ is_available = $true }; "available=$($r.is_available)" }
  TryTest "R04" "Rider" "Earnings summary" { $e = ApiGet "/riders/me/earnings/summary" $rd; "total=$($e.total_earnings)" }
}

# --- DOCTOR ---
if ($tokens.doctor) {
  $dr = $tokens.doctor
  TryTest "D01" "Doctor" "Doctor profile" { $m = ApiGet "/doctors/me" $dr; $m.specialization }
  TryTest "D02" "Doctor" "My prescriptions" { $rx = ApiGet "/doctors/me/prescriptions?limit=10" $dr; "total=$($rx.total)" }
}

# --- PORTAL URL smoke (HTTP status only) ---
$portals = @(
  @{ Name="Patient store"; Url="https://farumasi-app.vercel.app/store" },
  @{ Name="Patient login"; Url="https://farumasi-app.vercel.app/auth/login" },
  @{ Name="Pharmacist login"; Url="https://farumasi-app-8uy8.vercel.app/auth/login" },
  @{ Name="Partner login"; Url="https://farumasi-app-su3i.vercel.app/login" },
  @{ Name="Partner register"; Url="https://farumasi-app-su3i.vercel.app/register" },
  @{ Name="Super admin login"; Url="https://farumasi-app-2d8a.vercel.app/login" },
  @{ Name="Super admin partner apps"; Url="https://farumasi-app-2d8a.vercel.app/partner-applications" }
)
$i = 0
foreach ($p in $portals) {
  $i++
  TryTest "WEB$i" "Portal UI" "$($p.Name) loads" {
    $r = Invoke-WebRequest -Uri $p.Url -UseBasicParsing -MaximumRedirection 5
    "status=$($r.StatusCode)"
  }
}

# Output summary
$pass = ($results | Where-Object Status -eq "PASS").Count
$fail = ($results | Where-Object Status -eq "FAIL").Count
$total = $results.Count
Write-Output "=== QA SUMMARY: $pass PASS / $fail FAIL / $total TOTAL ==="
$results | Format-Table Id, Area, Test, Status, Detail -AutoSize -Wrap
$results | ConvertTo-Csv -NoTypeInformation | Out-File "c:\Users\PC\Farumasi-app\scripts\qa-live-results.csv"
Write-Output "CSV saved to scripts/qa-live-results.csv"
