# Production Site Review

- Reviewed the public production site at `https://hwp2pdf-six.vercel.app` using a browser.
- Confirmed that the home page, login page, and unauthenticated board gate render successfully; invalid non-HWP file selection is blocked before upload.
- Replaced React Dropzone's English implementation error for rejected files with Korean, user-safe messages for invalid type, size, and multiple-file cases.
- The browser recorded only an external AdSense script certificate failure (`ERR_CERT_AUTHORITY_INVALID`); no first-party page or API failure was observed during the reviewed public flows.
