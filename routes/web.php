<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TabunganController;
use App\Http\Controllers\DebtPaymentController;

Route::get('/', [TabunganController::class, 'index']);
Route::get('/api/tabungan/{year}', [TabunganController::class, 'getData']);
Route::post('/api/tabungan/{year}', [TabunganController::class, 'saveData']);

Route::get('/api/debt', [DebtPaymentController::class, 'getDebtData']);
Route::post('/api/debt', [DebtPaymentController::class, 'saveDebtData']);
