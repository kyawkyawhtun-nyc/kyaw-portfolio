---
title: NYC Yellow Taxi Trips Analysis
description: "Case study: NYC Yellow Taxi Trips Analysis by Kyaw Kyaw Htun — BigQuery SQL and Looker Studio on a 36.3-million-row dataset."
summary: Cleaned a 36.3-million-row trip dataset to 33.67 million valid trips, diagnosed a missing month in the source table, and built a Looker Studio dashboard of KPI scorecards and trend charts.
lede: A 36.3-million-row trip table looked complete until a missing month and unrecorded cash tips showed up. The work was to clean the data with documented rules, scope the analysis honestly, and put the findings in a Looker Studio dashboard.
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
  - label: "TODO(owner): Looker Studio URL"
    placeholder: true
    variant: secondary
---

## The question

What do New York City yellow taxi trips show about demand, fares, and payment behavior — and can the source data be trusted enough to say so?

The starting point was a 36.3-million-row trip dataset, analyzed in BigQuery SQL and presented in Looker Studio. Before any chart, the work was to decide which rows were valid and whether the calendar in the source table was complete.

## Cleaning and validation

The raw file was cleaned to 33.67 million valid trips using five documented validation rules. Those rules, and the excluded rows, are recorded in the project repository so the result can be checked against the source.

A completeness check found that December 2022 was effectively missing from the source table: only 57 raw rows. Publishing a “full year 2022” view would have understated December to nearly zero and distorted monthly comparisons. The analysis was therefore scoped to January–November 2022, and the gap was called out rather than filled in.

<aside class="callout">
  <p>December 2022 was missing from the source table — 57 raw rows. The analysis covers January–November 2022 so monthly trends are not pulled down by an incomplete month.</p>
</aside>

## What the trips show

Time-series cuts by month and hour showed a clear seasonal and daily shape: October was the peak month at 3.40 million trips, and 6 PM was the peak hour at 2.40 million trips.

Fare per mile was $4.06. On payments, cash tips appeared as zero in the source. Investigating that field showed they are unrecorded in the data, not actually zero — so average tip figures cannot treat cash trips as 0% tips without biasing the result downward.

Trip records were joined to a zone geography (lookup) table, with CAST type handling so the keys would actually match. Pickup zones were then ranked. JFK Airport was first, at 1.65 million pickups.

## The dashboard

Findings were collected in a Looker Studio dashboard with KPI scorecards and trend charts, so a non-technical reader can see volume, seasonality, and the main behavioral points without opening the SQL.

<figure class="placeholder-media" aria-label="Dashboard screenshot placeholder">
  <strong>TODO(owner): Looker Studio dashboard screenshot</strong>
  <span>Add a PNG of the KPI scorecards and trend charts. Alt text must describe the visible metrics, not “dashboard screenshot.”</span>
  <span>TODO(owner): Looker Studio URL, as a link only. No embed and no iframe.</span>
</figure>

## Tools

- BigQuery SQL: cleaning and validation, time-series with EXTRACT/datetime analysis, JOINs and CAST for the zone lookup, ranking of pickup zones
- Looker Studio: KPI scorecards, time-series and trend charts, calculated fields
