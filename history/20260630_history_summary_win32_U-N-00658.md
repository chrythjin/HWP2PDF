
## 20260630 - Task 3 DropzoneUploader authenticated downloads
- User Request: T3 - Make DropzoneUploader completed downloads use authenticated fetch
- Changes: DropzoneUploader.tsx (anchor->button+downloadProtectedFile), new DropzoneUploader.download.test.tsx (6 tests)
- Before: <a href download> headerless navigation
- After: <button onClick={handleDownload}> calling downloadProtectedFile with auth headers

