<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DebtPayment;

class DebtPaymentController extends Controller
{
    public function getDebtData()
    {
        $data = DebtPayment::orderBy('id', 'asc')->get();
        $result = [];
        foreach ($data as $row) {
            $result[] = [
                'id' => $row->id,
                'desc' => $row->desc,
                'amount' => (int)$row->amount
            ];
        }
        return response()->json($result);
    }

    public function saveDebtData(Request $request)
    {
        DebtPayment::truncate();
        
        $payments = $request->json()->all();
        foreach ($payments as $payment) {
            DebtPayment::create([
                'id' => $payment['id'],
                'desc' => $payment['desc'] ?? '',
                'amount' => $payment['amount'] ?? 0
            ]);
        }

        return response()->json(['success' => true]);
    }
}
