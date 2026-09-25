<?php

// Sekali-pakai: setup 2FA akun QA sweep (id 25) PERSIS seperti yang
// dilakukan TwoFactorController::confirm() - pakai TwoFactorService
// yang sama, bukan bikin secret/recovery code versi sendiri, supaya
// state DB-nya identik sama akun user yang confirmed lewat UI.
$employee = App\Models\Employee::where('email', 'qa-a11y-sweep@myjap.com')->firstOrFail();
$service = app(App\Services\TwoFactorService::class);

$secret = $service->generateSecret();
$plainRecoveryCodes = $service->generateRecoveryCodes();

$employee->two_factor_secret = $secret;
$employee->two_factor_recovery_codes = $service->hashRecoveryCodes($plainRecoveryCodes);
$employee->two_factor_confirmed_at = now();
$employee->save();

$fresh = $employee->fresh();

echo 'EMPLOYEE_ID='.$fresh->id."\n";
echo 'ROLE='.$fresh->role->role_code."\n";
echo 'SECRET='.$secret."\n";
echo 'CONFIRMED_AT='.$fresh->two_factor_confirmed_at."\n";
echo 'RECOVERY_COUNT='.count($fresh->two_factor_recovery_codes)."\n";
echo 'SECRET_ROUNDTRIP_OK='.($fresh->two_factor_secret === $secret ? 'yes' : 'NO')."\n";
echo 'SELF_VERIFY='.($service->verifyCode($fresh->two_factor_secret, (new PragmaRX\Google2FAQRCode\Google2FA())->getCurrentOtp($secret)) ? 'yes' : 'NO')."\n";
