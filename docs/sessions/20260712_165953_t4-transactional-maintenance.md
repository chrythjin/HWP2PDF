# T4 transactional maintenance

- Added bounded stale-processing recovery primitives for Memory and Firestore job stores.
- Firestore candidates are transactionally re-read before conditional recovery; only successful transitions are returned for dispatch.
- Upload-session expiration now produces terminal cleanup candidates, with exact path/owner/expiry one-time claims before object deletion.
- Added focused race, repeat, pagination, exclusion, and foreign-object safety tests.
- Production Firestore/Cloud Tasks verification remains outside T4; no scheduler or endpoint was introduced.
