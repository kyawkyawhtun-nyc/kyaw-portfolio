---
title: Online Retail Sales KPIs
description: "Case study: Online Retail sales KPIs by Kyaw Kyaw Htun — BigQuery SQL on 541,909 transaction lines from a UK-based retailer, Dec 2010–Dec 2011."
summary: "Built a repeatable sales KPI report from 541,909 transaction lines from a UK-based online retailer — £9.75M net revenue, a Christmas ramp starting in September, and a customer-mix finding: newly observed buyers account for 19.4% of identified active customers in November 2011."
lede: A UK retailer's 541,909 transaction lines looked like a simple revenue table until returns, duplicates, and 1,428 orders with no customer ID showed up. The work was to clean the data with documented SQL rules, prove every number reconciles, and turn it into KPIs a retailer can act on.
year: "2026"
meta: 2026 · BigQuery SQL · Excel
dataset: UCI Online Retail transactions, Dec 2010–Dec 2011 (541,909 lines)
tools:
  - BigQuery SQL
  - Excel
order: 3
featured: false
cardMetrics:
  - value: £9.75M
    label: Net revenue
  - value: Nov 2011 · £1.46M
    label: Peak month
  - value: £488.38
    label: Avg order value (net)
  - value: 19.4%
    label: New share by Nov 2011
metrics:
  - value: 541,909
    label: Source rows
  - value: 536,641
    label: Clean rows after dedupe
  - value: 19,960
    label: Sale orders
  - value: 4,338
    label: Identified customers
  - value: £9,748,131.07
    label: Net revenue
  - value: Nov 2011 · £1,456,145.80
    label: Peak month
  - value: £488.38
    label: Avg order value (net)
  - value: 2,704 of 4,338
    label: Customers who bought in 2+ months
links:
  - label: View the GitHub repository
    href: https://github.com/kyawkyawhtun-nyc/online-retail-analysis
    variant: primary
  - label: View the source dataset (UCI)
    href: https://archive.ics.uci.edu/ml/datasets/Online+Retail
    variant: secondary
---

## The question

How is a UK online retailer actually performing — which months move, which products and customers drive revenue, and is growth coming from new buyers or from keeping the ones it has?

The starting point was the UCI Online Retail dataset: **541,909** transaction lines from Dec 1, 2010 to Dec 9, 2011. Before charting anything, the work was to verify which lines were real sales and whether the numbers added up.

## Cleaning and validation

Five checks shaped the clean table, and every excluded row is kept in an audit table with its reason — nothing is deleted silently:

- Exact duplicates removed with `ROW_NUMBER()` — **5,268** extra copies
- Cancellation invoices (numbers starting with "C") flagged as returns — **9,288** lines
- Negative-quantity lines without a "C" invoice flagged as returns too — **1,336** more
- Zero-price lines and two bad-debt adjustments (£-11,062.06 each) kept out of revenue — **1,176** lines
- `line_revenue = Quantity × UnitPrice`, negative for returns, so net revenue is gross plus returns

Raw **541,909** − duplicates **5,268** = clean **536,641** = **524,878** sale lines + **10,587** return lines + **1,176** bad-price lines. The audit table holds **17,031** rows, and the reconciliation was verified in BigQuery.

<aside class="callout">
  <p>Two things the run caught live: BigQuery refuses FLOAT64 columns in PARTITION BY, fixed with CAST(unit_price AS STRING); and the invoices table holds 25,132 orders, not 25,900 — 768 invoices contain only zero-price note lines and have no revenue. A check query proved the 768, so 25,132 + 768 = 25,900.</p>
</aside>

## What the sales show

Total net revenue was **£9,748,131.07** from **19,960** orders, at an average order value of **£488.38**. Gross sales were **£10,642,110.80** and returns took back **£893,979.73**. Revenue is heavily seasonal: **November 2011** was the best month at **£1,456,145.80** (2,769 orders), and **April 2011** was the weakest full month at **£492,367.84**. The Christmas ramp starts in September (+44.6% on August), then October (+5.1%) and November (+36.2%).

<div class="retail-table-card retail-table-card--sales">
  <div class="retail-table-card__header">
    <p id="table-sales-title" class="retail-table-card__title">Monthly sales performance</p>
    <p class="retail-table-card__meta">13 reporting periods · GBP <span class="retail-table-card__scroll-hint">Scroll horizontally to see all columns →</span></p>
  </div>
  <div class="data-table-wrap" role="region" aria-labelledby="table-sales-title" aria-describedby="table-sales-note" tabindex="0">

| Month | Net revenue | Gross revenue | Returns | Orders | Change vs last month |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Dec 2010 | £746,723.61 | £821,452.73 | £-74,729.12 | 1,559 | — |
| Jan 2011 | £558,448.56 | £689,811.61 | £-131,363.05 | 1,086 | -25.2% |
| Feb 2011 | £497,026.41 | £522,545.56 | £-25,519.15 | 1,100 | -11.0% |
| Mar 2011 | £682,013.98 | £716,215.26 | £-34,201.28 | 1,454 | +37.2% |
| Apr 2011 | £492,367.84 | £536,968.49 | £-44,600.65 | 1,246 | -27.8% |
| May 2011 | £722,094.10 | £769,296.61 | £-47,202.51 | 1,681 | +46.7% |
| Jun 2011 | £689,977.23 | £760,547.01 | £-70,569.78 | 1,533 | -4.4% |
| Jul 2011 | £680,156.99 | £718,076.12 | £-37,919.13 | 1,475 | -1.4% |
| Aug 2011 | £703,510.58 | £757,841.38 | £-54,330.80 | 1,361 | +3.4% |
| Sep 2011 | £1,017,596.68 | £1,056,435.19 | £-38,838.51 | 1,837 | +44.6% |
| Oct 2011 | £1,069,368.23 | £1,151,263.73 | £-81,895.50 | 2,040 | +5.1% |
| Nov 2011 | £1,456,145.80 | £1,503,866.78 | £-47,720.98 | 2,769 | +36.2% |
| Dec 2011* | £432,701.06 | £637,790.33 | £-205,089.27 | 819 | -70.3% |

  </div>
  <p id="table-sales-note" class="retail-table-card__note">Revenue, returns, and order volume. December 2011 covers nine days only.</p>
</div>

\* December 2011 covers 9 days only (data stops Dec 9) — never compare it with full months.

### Top 10 products

DOTCOM POSTAGE ranks first at **£206,245.48**, but it is a delivery fee, not a product. The real top product is the **Regency Cakestand 3 Tier** at **£164,459.49**, sold across 2,007 lines — a steady seller, not one big order.

<div class="retail-table-card retail-table-card--products">
  <div class="retail-table-card__header">
    <p id="table-products-title" class="retail-table-card__title">Top 10 products & charges</p>
    <p class="retail-table-card__meta">Ranked by net revenue <span class="retail-table-card__scroll-hint">Scroll horizontally to see all columns →</span></p>
  </div>
  <div class="data-table-wrap" role="region" aria-labelledby="table-products-title" aria-describedby="table-products-note" tabindex="0">

| Rank | Stock code | Product | Net revenue | Sale lines |
| ---: | :--- | :--- | ---: | ---: |
| 1 | DOT | DOTCOM POSTAGE | £206,245.48 | 706 (postage, not a product) |
| 2 | 22423 | REGENCY CAKESTAND 3 TIER | £164,459.49 | 2,007 |
| 3 | 47566 | PARTY BUNTING | £98,243.88 | 1,699 |
| 4 | 85123A | CREAM HANGING HEART T-LIGHT HOLDER | £97,838.45 | 2,253 |
| 5 | 85099B | JUMBO BAG RED RETROSPOT | £92,175.79 | 2,109 |
| 6 | 23084 | RABBIT NIGHT LIGHT | £66,661.63 | 1,017 |
| 7 | POST | POSTAGE | £66,230.64 | 1,126 (postage, not a product) |
| 8 | 22086 | PAPER CHAIN KIT 50'S CHRISTMAS | £63,715.24 | 1,184 |
| 9 | 84879 | ASSORTED COLOUR BIRD ORNAMENT | £58,792.42 | 1,476 |
| 10 | 79321 | CHILLI LIGHTS | £53,746.66 | 667 |

  </div>
  <p id="table-products-note" class="retail-table-card__note">Includes postage charges; these are not merchandise products.</p>
</div>

### Top 10 customers

Customer **14646** is worth **£279,489.02** across 76 orders. Customer **14911** is the most frequent buyer — 248 orders, but only £132,458.73 — lots of small orders.

<div class="retail-table-card retail-table-card--customers">
  <div class="retail-table-card__header">
    <p id="table-customers-title" class="retail-table-card__title">Top 10 customers</p>
    <p class="retail-table-card__meta">Ranked by net revenue <span class="retail-table-card__scroll-hint">Scroll horizontally to see all columns →</span></p>
  </div>
  <div class="data-table-wrap" role="region" aria-labelledby="table-customers-title" aria-describedby="table-customers-note" tabindex="0">

| Rank | Customer | Orders | Net revenue |
| ---: | ---: | ---: | ---: |
| 1 | 14646 | 76 | £279,489.02 |
| 2 | 18102 | 62 | £256,438.49 |
| 3 | 17450 | 55 | £187,322.17 |
| 4 | 14911 | 248 | £132,458.73 |
| 5 | 12415 | 26 | £123,725.45 |
| 6 | 14156 | 66 | £113,214.59 |
| 7 | 17511 | 46 | £88,125.38 |
| 8 | 16684 | 31 | £65,892.08 |
| 9 | 13694 | 60 | £62,690.54 |
| 10 | 15311 | 118 | £59,284.19 |

  </div>
  <p id="table-customers-note" class="retail-table-card__note">Customer identifiers, order counts, and net revenue.</p>
</div>

### Average order value

AOV sits between **£395.16** (April 2011) and **£553.94** (September 2011), rising into Christmas as orders get bigger. Overall AOV (net) is **£488.38**.

## Customers: new vs repeat

New customers were **100%** of active buyers in Dec 2010 — the first month in the data, so everyone looks new — then **56.3%** in Jan 2011 and **19.4%** by Nov 2011. **2,704** of 4,338 customers bought in two or more months; 1,634 bought in one month only. Returning customers make up most identified active buyers by November. This is a monthly customer-mix measure, not a cohort retention rate or proof that retention caused revenue growth. “New” means first observed in this dataset; purchases before December 2010 are unknown.

<div class="retail-table-card retail-table-card--mix">
  <div class="retail-table-card__header">
    <p id="table-mix-title" class="retail-table-card__title">New vs returning customers</p>
    <p class="retail-table-card__meta">Identified customers only <span class="retail-table-card__scroll-hint">Scroll horizontally to see all columns →</span></p>
  </div>
  <div class="data-table-wrap" role="region" aria-labelledby="table-mix-title" aria-describedby="table-mix-note" tabindex="0">

| Month | New customers | Repeat customers | Total | New share |
| :--- | ---: | ---: | ---: | ---: |
| Dec 2010 | 885 | 0 | 885 | 100.0% |
| Jan 2011 | 417 | 324 | 741 | 56.3% |
| Feb 2011 | 380 | 378 | 758 | 50.1% |
| Mar 2011 | 452 | 522 | 974 | 46.4% |
| Apr 2011 | 300 | 556 | 856 | 35.0% |
| May 2011 | 284 | 772 | 1,056 | 26.9% |
| Jun 2011 | 242 | 749 | 991 | 24.4% |
| Jul 2011 | 188 | 761 | 949 | 19.8% |
| Aug 2011 | 169 | 766 | 935 | 18.1% |
| Sep 2011 | 299 | 967 | 1,266 | 23.6% |
| Oct 2011 | 358 | 1,006 | 1,364 | 26.2% |
| Nov 2011 | 323 | 1,341 | 1,664 | 19.4% |
| Dec 2011* | 41 | 574 | 615 | 6.7% |

  </div>
  <p id="table-mix-note" class="retail-table-card__note">New means first observed in this dataset, not necessarily first-ever purchase.</p>
</div>

\* December 2011 covers 9 days only.

One honest caveat: **1,428** sale orders (**7.2%**) have no CustomerID. They count in revenue but can never be new or repeat, because there is no customer to attach them to. The split above covers the other 92.8%.

## Recommendations

1. **Stock up before September, not November.** Revenue nearly triples from April to November, and the ramp starts in September.
2. **Investigate repeat purchasing.** Evaluate a win-back campaign for one-month-only customers and monitor top accounts. Customers first observed late in the dataset have less time to return, so measure cohort retention before claiming a retention effect.
3. **Attack the January returns spike.** January 2011 alone took back £131,363 — the largest returns amount among full months. Partial December 2011 has a larger total (£205,089.27), but covers only nine days. Investigate return timing and reasons before attributing the pattern to Christmas.
4. **Lift the low months with bundles.** April AOV is £395.16 against £553.94 in September.
5. **Close the customer blind spot.** Capture a customer identifier at checkout, even for guest orders.

## Tools

- BigQuery SQL: cleaning with `TRIM`, `STARTS_WITH`, `ROW_NUMBER()` dedupe, `CASE` labels, `LAG()` month-on-month change, `SAFE_DIVIDE` for AOV, and a four-table model (`invoices`, `invoice_lines`, `products`, `customers`) with JOIN-proof checks (orphans 0, gross £10,642,110.80 reconciled)
- Excel: KPI workbook with monthly revenue, top products and customers, AOV, and new vs repeat tables and charts
