<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Party extends Model
{
    use HasFactory, SoftDeletes;

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
