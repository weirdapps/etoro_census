# Privacy and data-source notice

This repository publishes a longitudinal census of eToro Popular Investors. That
census contains information about identifiable people, so this notice sets out
what is collected, where it comes from, why it is kept, and how to have it
removed. It is a transparency notice, not legal advice.

## What is published

Each snapshot holds up to 1,500 investor records. Per record:

| Field                                        | Description                                                 |
| -------------------------------------------- | ----------------------------------------------------------- |
| `userName`                                   | The investor's public eToro handle                          |
| `fullName`                                   | The display name shown on their public eToro profile        |
| `gain`, `dailyGain`, `winRatio`, `riskScore` | Published performance and risk metrics                      |
| `copiers`, `trades`, `tradeInfo`             | Published copier counts and aggregate trading activity      |
| `portfolio`                                  | The instrument allocation eToro publishes for that investor |
| `hasAvatar`                                  | Whether a profile image is set                              |

No email address, postal address, phone number, date of birth, government
identifier, or any special-category data as defined in Article 9 GDPR is
collected. No attempt is made to identify anyone beyond the identity they
already publish, and no data is bought, scraped from third parties, or joined
against any other source.

## Where it comes from

Every field is read from eToro's public API at `www.etoro.com/api/public/v1`,
which serves the same information eToro displays on each investor's public
profile page. Popular Investor is an opt-in programme: participants publish
these metrics deliberately, because attracting copiers is the point of it.

This project is independent and is **not** endorsed by, affiliated with, or
operated on behalf of eToro.

## Why it is kept, and for how long

The purpose is research into aggregate Popular Investor behaviour: how
allocations, risk appetite and crowding shift over time. That question cannot be
answered from a single snapshot, which is why historical snapshots are retained
rather than overwritten. Retention is therefore indefinite by design.

The processing basis relied on is legitimate interests (Article 6(1)(f) GDPR) in
non-commercial research over information the data subjects have themselves made
public. No automated decision is taken about any individual, no one is contacted,
ranked for any commercial purpose, or profiled for advertising.

## How to have your data removed

If you are an eToro Popular Investor and you want your records excluded, open an
issue at
[github.com/weirdapps/etoro_census/issues](https://github.com/weirdapps/etoro_census/issues)
or contact the maintainer through the address on the GitHub profile. Give the
`userName` concerned. On request the handle will be added to a permanent
exclusion list so future snapshots skip it, and existing records will be removed
from the published data.

Please note two honest limitations. Git history is append-only, so removing a
record from the current data does not erase it from earlier commits unless the
history is rewritten, which will be done on request but takes longer. And
anything already cloned or forked by a third party is outside this repository's
control.

## Accuracy

The data is a verbatim copy of what eToro's API returned at the snapshot
timestamp. Errors in the upstream data are reproduced here. Nothing in this
repository is investment advice.
