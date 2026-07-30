<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PermissionMiddleware
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        if (! $request->user() || ! $request->user()->allPermissions()->whereIn('name', $permissions)->isNotEmpty()) {
            abort(403, 'Unauthorized');
        }

        return $next($request);
    }
}
