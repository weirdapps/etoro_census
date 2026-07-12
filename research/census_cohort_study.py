#!/usr/bin/env python3
"""
Census COHORT-EDGE study
========================

Question
--------
The prior AGGREGATE eToro-census signal (net positioning across ALL popular
investors) was NOISE (every |t| < 1). Do investor COHORTS carry cross-sectional
edge that the aggregate washes out?

Data
----
~/SourceCode/etoro_census/archive/data/etoro-data-YYYY-MM-DD-HH-MM.json
Daily snapshots. Real schema (verified across time):

  investors[]            (1500/day) each:
      userName, fullName, gain (CurrYear YTD %), dailyGain (%), riskScore,
      copiers, trades, winRatio,
      portfolio { positionsCount, positions[] },   <-- PER-INVESTOR HOLDINGS
      tradeInfo { weeksSinceRegistration, copiers, baseLineCopiers, aumTier,
                  aumTierDesc, thisWeekGain, profitableMonthsPct, ... }
  portfolio.positions[]  each:
      instrumentId, isBuy, leverage, investmentPct (% of that investor's
      equity), netProfit, openRate, openTimestamp, positionId
  instruments.details[]  (~4.5k) instrumentId, symbolFull, instrumentDisplayName,
                          instrumentTypeID (5=stock,6=crypto,...), exchangeID
  instruments.priceData[] instrumentId, currentPrice, closingPrices{d/w/m},
                          returns{yesterday,weekTD,monthTD}     <-- PRICE PANEL

Schema notes discovered:
  * 2025-05-31..2025-06-02 store `instruments` as a bare array with NO prices
    (imageUrl/instrumentId/instrumentName/symbol only). Dropped -> usable price
    panel begins 2025-06-03.
  * period is always "CurrYear" -> `gain` is YTD and RESETS on Jan 1. There is
    NO multi-year / all-time return field in the schema. "Top all-time
    performer" is therefore a PROXY (see cohort defs).
  * ~30 dates have >1 snapshot; we keep the latest-collected file per date.
  * Census runs 7d/week; we restrict the date index to business days so that
    5/21/63-step horizons approximate 5/21/63 TRADING days.

CRITICAL capability: because per-investor holdings are captured EVERY day, the
cohort signal here is a REAL cohort-level net-positioning / accumulation signal
(not merely a cohort-weighted popularity proxy).

Cohorts (each re-selected daily, using ONLY as-of-t information -> no look-ahead)
--------------------------------------------------------------------------------
  a) top_perf  : top X% by CurrYear `gain` (eToro headline leaderboard metric),
                 with a tenure floor (weeksSinceRegistration >= TENURE_MIN_WK).
                 PROXY for "top all-time performers" -- true multi-year return is
                 NOT in the data; documented limitation.
  b) hot_hands : top X% by trailing HOT_WIN-business-day compounded dailyGain
                 (recent momentum), computed from the panel itself.
  c) popular   : top X% by `copiers` (tie-break aumTier). Most-copied / most-AUM.
  d) AGGREGATE : ALL investors with a portfolio (baseline = the prior NOISE result).

Signal (per cohort C, per date t, per instrument i)
---------------------------------------------------
  signed exposure of investor m to i = sum over m's positions in i of
      (+investmentPct if isBuy else -investmentPct)          # longs +, shorts -
  LEVEL[i,t]  = mean over m in C of signed exposure           # avg net allocation
  ACCUM[i,t]  = LEVEL[i,t] - LEVEL[i, t-ACCUM_WIN]            # accumulation (dW)

Forward returns / IC
--------------------
  fwd_h[i,t] = P[i,t+h]/P[i,t]-1  (census currentPrice panel, business-day index)
  For each date t & horizon h: cross-sectional Spearman rank IC between the
  cohort signal and fwd_h across instruments (>= MIN_XSEC names).
  Aggregated over dates: mean IC, hit-rate, and TWO honest t-stats:
    * non-overlap : IC sampled every h dates (independent) -> t = mean/(sd/vn)
    * Newey-West  : Bartlett kernel, lag=h, on the full overlapping IC series
  All cohorts/horizons evaluated on the SAME date window (intersection) so the
  comparison vs AGGREGATE is apples-to-apples.

A NOISE verdict is a valid, valuable result. No signal is manufactured.

Usage
-----
  python3 census_cohort_study.py [--frac 0.05] [--hot-win 63] [--accum-win 5]
      [--tenure-min-wk 104] [--min-xsec 25] [--horizons 5,21,63]
      [--types all|stocks] [--max-files N] [--out PATH.json]
"""
from __future__ import annotations

import argparse
import glob
import json
import math
import os
import sys
from bisect import bisect_left
from collections import defaultdict
from datetime import date as _date

import numpy as np
from scipy.stats import rankdata

DATA_DIR = os.path.expanduser("~/SourceCode/etoro_census/archive/data")


# --------------------------------------------------------------------------- #
# File enumeration                                                            #
# --------------------------------------------------------------------------- #
def dated_files(data_dir: str) -> list[tuple[str, str]]:
    """Return [(iso_date, path)] one per calendar date (latest snapshot), sorted."""
    best: dict[str, tuple[str, str]] = {}
    for p in glob.glob(os.path.join(data_dir, "etoro-data-*.json")):
        b = os.path.basename(p)
        d = b[11:21]                    # YYYY-MM-DD
        tm = b[22:27]                   # HH-MM
        if d not in best or tm > best[d][0]:
            best[d] = (tm, p)
    return sorted((d, tm_p[1]) for d, tm_p in best.items())


# --------------------------------------------------------------------------- #
# Per-file extraction                                                         #
# --------------------------------------------------------------------------- #
def load_day(path: str):
    """Extract (investors_scalars, per_investor_signed_exposure, prices, types).

    investors_scalars: dict userName -> {gain, copiers, dailyGain, tenure, aum}
    exposure:          dict userName -> dict instrumentId -> signed pct
    prices:            dict instrumentId -> currentPrice (float)
    types:             dict instrumentId -> instrumentTypeID   (symbols/type map)
    """
    with open(path, "r") as fh:
        j = json.load(fh)

    scal: dict[str, dict] = {}
    expo: dict[str, dict[int, float]] = {}
    for inv in j.get("investors", []):
        un = inv.get("userName")
        if un is None:
            continue
        ti = inv.get("tradeInfo") or {}
        scal[un] = {
            "gain": _f(inv.get("gain")),
            "copiers": _f(inv.get("copiers")),
            "dailyGain": _f(inv.get("dailyGain")),
            "tenure": _f(ti.get("weeksSinceRegistration")),
            "aum": _f(ti.get("aumTier")),
        }
        pf = inv.get("portfolio") or {}
        pos = pf.get("positions") or []
        e: dict[int, float] = defaultdict(float)
        for p in pos:
            iid = p.get("instrumentId")
            ip = p.get("investmentPct")
            if iid is None or ip is None:
                continue
            e[iid] += ip if p.get("isBuy", True) else -ip
        if e:
            expo[un] = dict(e)

    prices: dict[int, float] = {}
    types: dict[int, int] = {}
    instr = j.get("instruments")
    if isinstance(instr, dict):
        for pd in instr.get("priceData", []):
            iid = pd.get("instrumentId")
            cp = pd.get("currentPrice")
            if iid is not None and cp is not None and cp > 0:
                prices[iid] = float(cp)
        for de in instr.get("details", []):
            iid = de.get("instrumentId")
            if iid is not None:
                types[iid] = de.get("instrumentTypeID")
    return scal, expo, prices, types


def _f(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return math.nan


# --------------------------------------------------------------------------- #
# Cohort selection (as-of t, no look-ahead)                                   #
# --------------------------------------------------------------------------- #
def top_frac(names, keyfn, frac, tiefn=None):
    """Top `frac` of names by keyfn desc (finite keys only)."""
    scored = [(n, keyfn(n)) for n in names]
    scored = [(n, v) for n, v in scored if v is not None and not math.isnan(v)]
    if not scored:
        return set()
    if tiefn is not None:
        scored.sort(key=lambda t: (t[1], tiefn(t[0])), reverse=True)
    else:
        scored.sort(key=lambda t: t[1], reverse=True)
    k = max(1, int(round(len(scored) * frac)))
    return {n for n, _ in scored[:k]}


# --------------------------------------------------------------------------- #
# IC statistics                                                               #
# --------------------------------------------------------------------------- #
def spearman(x: np.ndarray, y: np.ndarray) -> float:
    if len(x) < 3:
        return math.nan
    rx, ry = rankdata(x), rankdata(y)
    rx = rx - rx.mean()
    ry = ry - ry.mean()
    d = math.sqrt((rx * rx).sum() * (ry * ry).sum())
    return float((rx * ry).sum() / d) if d > 0 else math.nan


def newey_west_t(ic: np.ndarray, lag: int) -> float:
    ic = ic[~np.isnan(ic)]
    n = len(ic)
    if n < 3:
        return math.nan
    m = ic.mean()
    e = ic - m
    g0 = float((e * e).sum() / n)
    lrv = g0
    for l in range(1, min(lag, n - 1) + 1):
        cov = float((e[l:] * e[:-l]).sum() / n)
        lrv += 2.0 * (1.0 - l / (lag + 1)) * cov
    if lrv <= 0:
        return math.nan
    se = math.sqrt(lrv / n)
    return m / se if se > 0 else math.nan


def nonoverlap_t(ic_by_k: dict[int, float], h: int):
    """t-stat from IC sampled every h dates (independent draws)."""
    ks = sorted(ic_by_k)
    if not ks:
        return math.nan, 0
    vals = []
    nextk = ks[0]
    kset = ic_by_k
    for k in ks:
        if k >= nextk and not math.isnan(kset[k]):
            vals.append(kset[k])
            nextk = k + h
    v = np.array(vals, dtype=float)
    if len(v) < 3:
        return math.nan, len(v)
    sd = v.std(ddof=1)
    if sd == 0:
        return math.nan, len(v)
    return float(v.mean() / (sd / math.sqrt(len(v)))), len(v)


# --------------------------------------------------------------------------- #
# Main                                                                        #
# --------------------------------------------------------------------------- #
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--frac", type=float, default=0.05)
    ap.add_argument("--hot-win", type=int, default=63)
    ap.add_argument("--accum-win", type=int, default=5)
    ap.add_argument("--tenure-min-wk", type=float, default=104)
    ap.add_argument("--min-xsec", type=int, default=25)
    ap.add_argument("--horizons", type=str, default="5,21,63")
    ap.add_argument("--types", choices=["all", "stocks"], default="all")
    ap.add_argument("--max-files", type=int, default=0)
    ap.add_argument("--out", type=str,
                    default=os.path.join(os.path.dirname(__file__), "cohort_study_results.json"))
    args = ap.parse_args()

    horizons = [int(x) for x in args.horizons.split(",")]
    files = dated_files(DATA_DIR)
    if args.max_files:
        files = files[: args.max_files]

    print(f"[load] {len(files)} dated files ({files[0][0]} -> {files[-1][0]})",
          file=sys.stderr)

    dates: list[str] = []
    # signal panels: cohort -> "level"/"accum" -> list-per-date of {iid: val}
    cohorts = ["top_perf", "hot_hands", "popular", "AGGREGATE"]
    level_hist: dict[str, list[dict[int, float]]] = {c: [] for c in cohorts}
    accum_hist: dict[str, list[dict[int, float]]] = {c: [] for c in cohorts}
    price_rows: list[dict[int, float]] = []
    dg_hist: dict[str, list[float]] = defaultdict(list)   # userName -> dailyGain per processed date
    type_map: dict[int, int] = {}
    cohort_sizes: dict[str, list[int]] = {c: [] for c in cohorts}

    for di, (d, path) in enumerate(files):
        wd = _date.fromisoformat(d).weekday()
        if wd >= 5:                     # skip Sat/Sun -> trading-day-ish index
            continue
        scal, expo, prices, types = load_day(path)
        if not prices or not scal:
            continue
        type_map.update({k: v for k, v in types.items() if v is not None})

        # update dailyGain history for ALL currently-known investors, aligned to
        # this processed (business) date index
        idx = len(dates)
        for un, s in scal.items():
            h = dg_hist[un]
            while len(h) < idx:         # pad absences with 0% (no move contribution)
                h.append(0.0)
            dg = s["dailyGain"]
            h.append(0.0 if math.isnan(dg) else dg)

        names = list(scal.keys())

        def hot_key(n):
            h = dg_hist[n][-args.hot_win:]
            if len(h) < args.hot_win:
                return None
            r = 1.0
            for g in h:
                r *= (1.0 + g / 100.0)
            return r - 1.0

        def perf_key(n):
            s = scal[n]
            if s["tenure"] is None or math.isnan(s["tenure"]) or s["tenure"] < args.tenure_min_wk:
                return None
            return s["gain"]

        sel = {
            "top_perf": top_frac(names, perf_key, args.frac),
            "hot_hands": top_frac(names, hot_key, args.frac),
            "popular": top_frac(names, lambda n: scal[n]["copiers"], args.frac,
                                tiefn=lambda n: scal[n]["aum"] if not math.isnan(scal[n]["aum"]) else -1),
            "AGGREGATE": set(expo.keys()),
        }

        keep = None
        if args.types == "stocks":
            keep = {iid for iid, t in type_map.items() if t == 5}

        for c in cohorts:
            members = sel[c] & set(expo.keys()) if c != "AGGREGATE" else sel[c]
            cohort_sizes[c].append(len(members))
            agg: dict[int, float] = defaultdict(float)
            for m in members:
                for iid, w in expo[m].items():
                    if keep is not None and iid not in keep:
                        continue
                    agg[iid] += w
            nm = max(1, len(members))
            lvl = {iid: v / nm for iid, v in agg.items()}
            level_hist[c].append(lvl)
            # accumulation vs ACCUM_WIN business days ago
            if idx >= args.accum_win:
                prev = level_hist[c][idx - args.accum_win]
                acc = {}
                keys = set(lvl) | set(prev)
                for iid in keys:
                    acc[iid] = lvl.get(iid, 0.0) - prev.get(iid, 0.0)
                accum_hist[c].append(acc)
            else:
                accum_hist[c].append({})

        price_rows.append(prices)
        dates.append(d)
        if (idx + 1) % 40 == 0:
            print(f"[proc] {idx+1} business dates ... last={d}", file=sys.stderr)

    M = len(dates)
    print(f"[done] {M} business dates in panel", file=sys.stderr)

    # dense price panel: iid -> np.array over business dates
    all_iids = set()
    for pr in price_rows:
        all_iids.update(pr.keys())
    all_iids = sorted(all_iids)
    iid_pos = {iid: k for k, iid in enumerate(all_iids)}
    P = np.full((M, len(all_iids)), np.nan)
    for t, pr in enumerate(price_rows):
        for iid, px in pr.items():
            P[t, iid_pos[iid]] = px

    def fwd(t, h):
        if t + h >= M:
            return None
        # calendar-gap sanity: skip if the h-step window spans an abnormal gap
        gap = (_date.fromisoformat(dates[t + h]) - _date.fromisoformat(dates[t])).days
        if gap > h * 2 + 5:
            return None
        p0 = P[t]
        p1 = P[t + h]
        with np.errstate(invalid="ignore", divide="ignore"):
            return p1 / p0 - 1.0

    start = args.hot_win            # ensure hot_hands defined for all cohorts on same window
    results = {}
    for sig_name, sig_hist in (("level", level_hist), ("accum", accum_hist)):
        for c in cohorts:
            for h in horizons:
                ic_by_k = {}
                xsz = []
                for t in range(start, M - h):
                    fr = fwd(t, h)
                    if fr is None:
                        continue
                    sig = sig_hist[c][t]
                    if not sig:
                        continue
                    xs, ys = [], []
                    for iid, sv in sig.items():
                        pos = iid_pos.get(iid)
                        if pos is None:
                            continue
                        r = fr[pos]
                        if sv == 0.0 or math.isnan(r):
                            continue
                        xs.append(sv)
                        ys.append(r)
                    if len(xs) < args.min_xsec:
                        continue
                    ic = spearman(np.array(xs), np.array(ys))
                    if not math.isnan(ic):
                        ic_by_k[t] = ic
                        xsz.append(len(xs))
                if len(ic_by_k) < 5:
                    continue
                icv = np.array(list(ic_by_k.values()))
                t_no, n_no = nonoverlap_t(ic_by_k, h)
                results[f"{sig_name}|{c}|{h}"] = {
                    "signal": sig_name, "cohort": c, "horizon": h,
                    "mean_IC": float(icv.mean()),
                    "median_IC": float(np.median(icv)),
                    "t_newey_west": newey_west_t(icv, h),
                    "t_nonoverlap": t_no,
                    "n_nonoverlap": n_no,
                    "hit_rate": float((icv > 0).mean()),
                    "n_dates": int(len(icv)),
                    "avg_xsec": float(np.mean(xsz)) if xsz else 0.0,
                }

    summary = {
        "config": vars(args),
        "panel": {
            "business_dates": M,
            "date_start": dates[0] if dates else None,
            "date_end": dates[-1] if dates else None,
            "eval_start_date": dates[start] if M > start else None,
            "instruments_in_price_panel": len(all_iids),
            "cohort_size_median": {c: int(np.median(v)) if v else 0
                                   for c, v in cohort_sizes.items()},
        },
        "results": results,
    }
    with open(args.out, "w") as fh:
        json.dump(summary, fh, indent=2, default=str)

    # ---- console report ---------------------------------------------------- #
    print("\n" + "=" * 100)
    print("CENSUS COHORT-EDGE STUDY  —  cross-sectional rank IC")
    print("=" * 100)
    pn = summary["panel"]
    print(f"Panel: {pn['business_dates']} business dates {pn['date_start']}..{pn['date_end']} "
          f"(eval from {pn['eval_start_date']}), {pn['instruments_in_price_panel']} instruments")
    print(f"Cohort sizes (median): {pn['cohort_size_median']}")
    print(f"frac={args.frac} hot_win={args.hot_win} accum_win={args.accum_win} "
          f"tenure_min_wk={args.tenure_min_wk} min_xsec={args.min_xsec} types={args.types}")
    for sig_name in ("level", "accum"):
        print(f"\n--- SIGNAL: {sig_name.upper()} "
              f"({'net allocation level' if sig_name=='level' else 'accumulation dW'}) ---")
        hdr = (f"{'cohort':<10} {'h':>3} {'meanIC':>8} {'t_NW':>7} {'t_noov':>7} "
               f"{'hit%':>6} {'nDate':>6} {'nIndep':>7} {'xsec':>6}")
        print(hdr)
        print("-" * len(hdr))
        for c in cohorts:
            for h in horizons:
                r = results.get(f"{sig_name}|{c}|{h}")
                if not r:
                    print(f"{c:<10} {h:>3}   (insufficient data)")
                    continue
                print(f"{c:<10} {h:>3} {r['mean_IC']:>8.4f} {r['t_newey_west']:>7.2f} "
                      f"{r['t_nonoverlap']:>7.2f} {r['hit_rate']*100:>5.1f} "
                      f"{r['n_dates']:>6} {r['n_nonoverlap']:>7} {r['avg_xsec']:>6.0f}")
    print("\nInterpretation: |t| < ~2 = NOISE. +IC = cohort's favored/accumulated")
    print("names outperform (smart money). -IC = they underperform (contrarian tell).")
    print(f"\n[out] {args.out}")


if __name__ == "__main__":
    main()
