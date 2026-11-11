<?php

namespace App\Http\Controllers\reports;

use Illuminate\Http\Request;

trait ResolvesReportPerPage
{
    /**
     * Page sizes a report can be viewed with.
     *
     * @var array<int, int>
     */
    protected array $reportPerPageOptions = [10, 25, 50, 100, 250, 500];

    protected int $defaultReportPerPage = 25;

    /**
     * Resolve the page size for a report request.
     *
     * Passing `all=1` (used by print and export) returns every matching record on a single page.
     */
    protected function resolveReportPerPage(Request $request, int $totalRecords): int
    {
        if ($request->boolean('all')) {
            return max(1, $totalRecords);
        }

        $perPage = $request->integer('per_page', $this->defaultReportPerPage);

        return in_array($perPage, $this->reportPerPageOptions, true) ? $perPage : $this->defaultReportPerPage;
    }
}
