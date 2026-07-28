<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Party extends Model
{
    use HasFactory;

    protected $fillable = [
        'party_name',
        'party_type',
        'contact_person',
        'contact_person_designation',
        'phone',
        'email',
        'address',
        'agreement_type',
        'start_date',
        'end_date',
        'notes',
    ];
}
