---
title: NYC Yellow Taxi Trips Analysis
description: "Case study: NYC Yellow Taxi Trips Analysis by Kyaw Kyaw Htun — BigQuery SQL and Looker Studio on a 36.3-million-row dataset."
summary: Cleaned a 36.3-million-row trip dataset to 33.67 million valid trips, diagnosed a missing month in the source table, and verified monthly, hourly, payment, and pickup-zone cuts in BigQuery SQL.
lede: A 36.3-million-row trip table looked complete until a missing month and unrecorded cash tips showed up. The work was to clean the data with five documented SQL rules, scope the analysis honestly, and publish verified extracts for dashboard reporting.
year: "2026"
meta: 2026 · BigQuery SQL · Looker Studio
dataset: NYC yellow taxi trip records analyzed in BigQuery
tools:
  - BigQuery SQL
  - Looker Studio
order: 1
featured: true
badge: Featured
cardMetrics:
  - value: 33.67M
    label: Valid trips
  - value: Oct · 3.40M
    label: Peak month
  - value: 6 PM · 2.40M
    label: Peak hour
  - value: $4.06
    label: Fare per mile
metrics:
  - value: 36.3M
    label: Source rows
  - value: 33.67M
    label: Valid trips after cleaning
  - value: 5 rules
    label: Documented validation checks
  - value: Jan–Nov 2022
    label: Analysis window after scoping
  - value: Oct · 3.40M
    label: Peak month
  - value: 6 PM · 2.40M
    label: Peak hour
  - value: $4.06
    label: Fare per mile
  - value: 1.65M
    label: "JFK Airport pickups (zone #1)"
links:
  - label: View the GitHub repository
    href: https://github.com/kyawkyawhtun-nyc/nyc-taxi-analysis
    variant: primary
  # TODO(owner): add live Looker Studio link here once published
---

## The question

What do New York City yellow taxi trips show about demand, fares, and payment behavior — and can the source data be trusted enough to say so?

The starting point was a 36.3-million-row trip dataset in BigQuery SQL. Before charting anything, the work was to verify which rows were valid and whether the calendar in the source table was complete.

## Cleaning and validation

Five documented validation rules removed **2,584,209** bad rows (roughly **7%** of the raw table):

- `pickup_year = 2022`
- `passenger_count > 0`
- `trip_distance > 0`
- `fare_amount > 0`
- `total_amount > 0`

A completeness check then found that December 2022 was effectively missing from the source table: only **57** raw rows. Publishing a “full year 2022” view would have understated December to nearly zero and distorted monthly comparisons. After excluding December’s 57 raw rows, the analysis covers **33,671,717** clean trips across **January–November 2022**, with the source gap called out rather than filled in.

<aside class="callout">
  <p>December 2022 was missing from the source table — 57 raw rows. The analysis covers January–November 2022 (33,671,717 clean trips) so monthly trends are not pulled down by an incomplete month.</p>
</aside>

## What the trips show

Across the 33,671,717 validated Jan–Nov 2022 trips, the average trip covered **3.56 miles**, the average fare was **$14.45**, and overall fare per mile was **$4.06** (`total fare ÷ total distance`). Time-series cuts by month and hour showed a clear seasonal and daily shape: **October** was the peak month at **3.40 million** trips (`3,399,181`), and **6 PM** was the peak hour at **2.40 million** trips (`2,399,697`) — roughly a 14× swing from the **4 AM** trough (`168,173` trips).

### Payment and tipping behavior

Credit cards accounted for **79%** of clean trips and averaged **$3.40** in recorded tips (about **24%** of the `$14.46` average fare). Cash trips made up **20%** of volume and showed `$0.00` in the tip column. Investigating that field confirmed cash tips are **unrecorded** in the TLC data rather than actually zero — so tip averages cannot include cash rows as 0% without biasing the result downward.

<div class="data-table-wrap">

| Payment type | Clean trips | Share | Avg fare | Avg tip |
| :--- | ---: | ---: | ---: | ---: |
| Credit card | 26,735,549 | 79% | $14.46 | $3.40 (~24% of fare) |
| Cash | 6,785,569 | 20% | $14.32 | $0.00 (unrecorded, not zero) |
| No charge | 85,886 | — | $18.60 | $0.00 |
| Dispute | 64,712 | — | $20.99 | $0.01 |
| Unknown | 1 | — | $8.50 | $0.00 |

</div>

### Top 10 pickup zones

Trip records were joined to the TLC taxi-zone lookup table using `CAST(pickup_location_id AS STRING) = zone_id` so mismatched integer and string keys would match cleanly. The top 10 pickup zones accounted for **12,566,724** pickups (**37.3%** of all clean trips). **JFK Airport** in Queens ranked first at **1,650,221** pickups; every remaining spot from #2 through #10 was in Manhattan.

<div class="data-table-wrap">

| Rank | Pickup zone | Borough | Pickups |
| ---: | :--- | :--- | ---: |
| 1 | JFK Airport | Queens | 1,650,221 |
| 2 | Upper East Side South | Manhattan | 1,613,206 |
| 3 | Upper East Side North | Manhattan | 1,421,996 |
| 4 | Midtown Center | Manhattan | 1,377,404 |
| 5 | Penn Station / Madison Sq West | Manhattan | 1,128,708 |
| 6 | Midtown East | Manhattan | 1,123,378 |
| 7 | Lincoln Square East | Manhattan | 1,108,325 |
| 8 | Times Sq / Theatre District | Manhattan | 1,055,780 |
| 9 | Murray Hill | Manhattan | 1,052,197 |
| 10 | Clinton East | Manhattan | 1,035,509 |

</div>

## The dashboard

<div class="status-banner">
  <div class="status-banner__head">
    <span class="status-banner__title">Looker Studio dashboard</span>
    <span class="status-pill">In progress</span>
  </div>
  <p>
    KPI row (33,671,717 trips, $14.45 avg fare, 3.56 mi avg trip, $4.06/mi) and monthly trend are verified against BigQuery SQL; hourly, payment, and zone views are being built from the verified CSV extracts published in the GitHub repository.
  </p>
</div>

## Tools

- BigQuery SQL: five-rule cleaning and validation, time-series with `EXTRACT`/datetime analysis, `JOIN` with `CAST(pickup_location_id AS STRING) = zone_id` for the zone lookup, and pickup-zone ranking
- Looker Studio: KPI scorecards, time-series and trend charts, calculated fields built from verified BigQuery extracts
