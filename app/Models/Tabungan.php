<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tabungan extends Model
{
    protected $fillable = ['year', 'month', 'luthfi', 'jeanny', 'pengeluaran', 'total_override'];
}
