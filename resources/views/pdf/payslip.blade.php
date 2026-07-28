<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Slip Gaji - {{ $payslip->employee->full_name }}</title>
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 12px;
            color: #1f2937;
        }

        .header {
            text-align: center;
            border-bottom: 2px solid #1f2937;
            padding-bottom: 10px;
            margin-bottom: 16px;
        }

        .header h1 {
            font-size: 18px;
            margin: 0 0 2px 0;
        }

        .header p {
            margin: 0;
            font-size: 11px;
            color: #6b7280;
        }

        .info-table {
            width: 100%;
            margin-bottom: 16px;
        }

        .info-table td {
            padding: 2px 0;
            font-size: 12px;
        }

        .info-label {
            width: 130px;
            color: #6b7280;
        }

        table.items {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }

        table.items th {
            background-color: #f3f4f6;
            text-align: left;
            padding: 6px 8px;
            font-size: 11px;
            border-bottom: 1px solid #d1d5db;
        }

        table.items td {
            padding: 6px 8px;
            font-size: 11px;
            border-bottom: 1px solid #e5e7eb;
        }

        .amount {
            text-align: right;
        }

        .section-title {
            font-weight: bold;
            background-color: #e5e7eb !important;
        }

        .total-row td {
            font-weight: bold;
            border-top: 2px solid #1f2937;
            font-size: 13px;
        }

        .status-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
            color: #ffffff;
            background-color: {{ $payslip->status === 'Published' ? '#16a34a' : '#f59e0b' }};
        }

        .footer {
            margin-top: 30px;
            font-size: 10px;
            color: #9ca3af;
            text-align: center;
        }
    </style>
</head>
<body>

    <div class="header">
        <h1>SLIP GAJI KARYAWAN</h1>
        <p>{{ $company->company_name }}</p>
        @if ($company->address)
            <p>{{ $company->address }}</p>
        @endif
        @if ($company->phone || $company->email)
            <p>
                {{ $company->phone ? 'Telp: ' . $company->phone : '' }}
                {{ $company->phone && $company->email ? ' | ' : '' }}
                {{ $company->email ? 'Email: ' . $company->email : '' }}
            </p>
        @endif
    </div>

    <table class="info-table">
        <tr>
            <td class="info-label">Nama Karyawan</td>
            <td>: {{ $payslip->employee->full_name }}</td>
            <td class="info-label">Periode</td>
            <td>: {{ \Carbon\Carbon::create()->month($payslip->month)->translatedFormat('F') }} {{ $payslip->year }}</td>
        </tr>
        <tr>
            <td class="info-label">Kode Karyawan</td>
            <td>: {{ $payslip->employee->employee_code }}</td>
            <td class="info-label">Status</td>
            <td>: <span class="status-badge">{{ $payslip->status }}</span></td>
        </tr>
    </table>

    <table class="items">
        <thead>
            <tr>
                <th style="width: 60%">Komponen</th>
                <th style="width: 40%" class="amount">Nominal (Rp)</th>
            </tr>
        </thead>
        <tbody>
            <tr class="section-title">
                <td colspan="2">PENDAPATAN</td>
            </tr>

            @php $totalEarning = 0; @endphp

            @foreach ($payslip->items->where('salaryComponent.type', 'earning') as $item)
                <tr>
                    <td>{{ $item->salaryComponent->name }}{{ $item->notes ? ' - ' . $item->notes : '' }}</td>
                    <td class="amount">{{ number_format($item->amount, 0, ',', '.') }}</td>
                </tr>
                @php $totalEarning += $item->amount; @endphp
            @endforeach

            <tr class="section-title">
                <td colspan="2">POTONGAN</td>
            </tr>

            @php $totalDeduction = 0; @endphp

            @foreach ($payslip->items->where('salaryComponent.type', 'deduction') as $item)
                <tr>
                    <td>{{ $item->salaryComponent->name }}{{ $item->notes ? ' - ' . $item->notes : '' }}</td>
                    <td class="amount">{{ number_format($item->amount, 0, ',', '.') }}</td>
                </tr>
                @php $totalDeduction += $item->amount; @endphp
            @endforeach

            <tr>
                <td>Total Pendapatan</td>
                <td class="amount">{{ number_format($totalEarning, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td>Total Potongan</td>
                <td class="amount">({{ number_format($totalDeduction, 0, ',', '.') }})</td>
            </tr>
            <tr class="total-row">
                <td>GAJI BERSIH (NET SALARY)</td>
                <td class="amount">Rp {{ number_format($payslip->net_salary, 0, ',', '.') }}</td>
            </tr>
        </tbody>
    </table>

    <div class="footer">
        Dokumen ini digenerate otomatis oleh sistem MyJAP Employee Portal pada {{ now()->translatedFormat('d F Y H:i') }}.
    </div>

</body>
</html>
