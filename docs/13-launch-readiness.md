# Launch Readiness

## Public endpoints

- Web console: `https://sunrgw.cn/`
- API health: `https://sunrgw.cn/api/health`
- Android download page: `https://sunrgw.cn/download/`
- Privacy policy: `https://sunrgw.cn/privacy/`
- Support page: `https://sunrgw.cn/support/`

## Web release

- Uploaded files: `index.html`, `index-Bk_VaXdc.js` and `index-Czplastl.css`.
- Local and remote SHA-256 values match for all three uploaded files.
- Previous static directory backup: `/home/ubuntu/pco/static_web.bak-20261022-120622`.
- `pco.service` and Caddy are active.
- Production login page passed 390px and 1440px browser smoke checks with no horizontal overflow or console errors.

## WeChat release

- Uploaded version: `3.2.1`, version code `321`.
- Upload package size: 755,563 bytes.
- Production AppID: `wx9469d5e631279f7b`.
- The archive page now normalizes backend relative PDF URLs before `uni.downloadFile`.
- Remaining manual step: submit version `3.2.1` for review and publish it from the WeChat platform console.

## Backend data links

- Photo and signature uploads return relative `/uploads/photos/...` URLs; the uni-app client normalizes them to the production API origin.
- Service reports return `/api/service-reports/{id}/pdf`; the client normalizes this URL before download.
- Risk survey PDFs continue to use `/api/risk-surveys/{id}/pdf` and require the bearer token.
- Work-order and service-report check-ins persist precise coordinates, accuracy, address, timestamp and optional photo URL.

## Report seal

- Approved survey, sealing and work-order PDFs draw the 22mm seal inside a dedicated right column of the thanks/contact card.
- Phone, address, email and footer print time stay outside the seal column.
- Production survey and sealing PDFs were regenerated after restart; both final pages reported zero text intersections with the seal.
- Backend rollback backup: `/home/ubuntu/pco/app/services/.bak-20261022-122120`.

## Release boundary

- Authenticated production write tests were not run without user-supplied review credentials.
- Android remains on the previously distributed `3.1.2` package until a new signed APK is produced with the protected signing credentials.
- iOS distribution still requires an Apple distribution certificate and provisioning profile.
