<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Tabungan;

class TabunganController extends Controller
{
    public function index()
    {
        return view('tabungan.index');
    }

    public function getData($year)
    {
        $rows = Tabungan::where('year', $year)->orderBy('month', 'asc')->get()->keyBy('month');
        $result = [];
        
        // Loop 12 months
        for ($i = 0; $i < 12; $i++) {
            if (isset($rows[$i])) {
                $result[] = [
                    'luthfi' => (int)$rows[$i]->luthfi,
                    'jeanny' => (int)$rows[$i]->jeanny,
                    'pengeluaran' => (int)$rows[$i]->pengeluaran,
                    'totalOverride' => $rows[$i]->total_override !== null ? (int)$rows[$i]->total_override : null
                ];
            } else {
                $result[] = ['luthfi' => 0, 'jeanny' => 0, 'pengeluaran' => 0];
            }
        }

        // Calculate previous years saldo
        // Disabled: Tiap tahun mulai dari 0, tidak carry over
        $previousSaldo = 0;

        return response()->json([
            'data' => $result,
            'previousSaldo' => $previousSaldo
        ]);
    }

    public function saveData(Request $request, $year)
    {
        $monthsData = $request->json()->all();
        
        foreach ($monthsData as $index => $row) {
            Tabungan::updateOrCreate(
                ['year' => $year, 'month' => $index],
                [
                    'luthfi' => $row['luthfi'] ?? 0,
                    'jeanny' => $row['jeanny'] ?? 0,
                    'pengeluaran' => $row['pengeluaran'] ?? 0,
                    'total_override' => isset($row['totalOverride']) ? $row['totalOverride'] : null
                ]
            );
        }

        return response()->json(['success' => true]);
    }
}
