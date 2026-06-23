Scope: 3 of 4 workspace projects
apps/web lint$ eslint
apps/web lint: C:\NEW PRG\HWP2PDF\apps\web\src\app\board\board-page.test.tsx
apps/web lint:    54:5   error    'authStateCallback' is never reassigned. Use 'const' instead  prefer-const
apps/web lint:    54:5   warning  'authStateCallback' is assigned a value but never used        @typescript-eslint/no-unused-vars
apps/web lint:    55:5   error    'mockCurrentUser' is never reassigned. Use 'const' instead    prefer-const
apps/web lint:    55:5   warning  'mockCurrentUser' is assigned a value but never used          @typescript-eslint/no-unused-vars
apps/web lint:   107:77  warning  'init' is defined but never used                              @typescript-eslint/no-unused-vars
apps/web lint: C:\NEW PRG\HWP2PDF\apps\web\src\app\board\page.tsx
apps/web lint:   75:12  error  Error: Calling setState synchronously within an effect can trigger cascading renders
apps/web lint: Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
apps/web lint: * Update external systems with the latest state from React.
apps/web lint: * Subscribe for updates from some external system, calling setState in a callback function when external state changes.
apps/web lint: Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).
apps/web lint: C:\NEW PRG\HWP2PDF\apps\web\src\app\board\page.tsx:75:12
apps/web lint:   73 |   useEffect(() => {
apps/web lint:   74 |     if (user) {
apps/web lint: > 75 |       void fetchList();
apps/web lint:      |            ^^^^^^^^^ Avoid calling setState() directly within an effect
apps/web lint:   76 |     }
apps/web lint:   77 |   }, [user, fetchList]);
apps/web lint:   78 |  react-hooks/set-state-in-effect
apps/web lint: C:\NEW PRG\HWP2PDF\apps\web\src\app\history\page.tsx
apps/web lint:   53:10  error  Error: Calling setState synchronously within an effect can trigger cascading renders
apps/web lint: Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
apps/web lint: * Update external systems with the latest state from React.
apps/web lint: * Subscribe for updates from some external system, calling setState in a callback function when external state changes.
apps/web lint: Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).
apps/web lint: C:\NEW PRG\HWP2PDF\apps\web\src\app\history\page.tsx:53:10
apps/web lint:   51 |
apps/web lint:   52 |   useEffect(() => {
apps/web lint: > 53 |     void loadJobs();
apps/web lint:      |          ^^^^^^^^ Avoid calling setState() directly within an effect
apps/web lint:   54 |   }, [loadJobs]);
apps/web lint:   55 |
apps/web lint:   56 |   const handleDelete = useCallback(  react-hooks/set-state-in-effect
apps/web lint: C:\NEW PRG\HWP2PDF\apps\web\src\app\page.tsx
apps/web lint:   128:95   error  `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`  react/no-unescaped-entities
apps/web lint:   128:104  error  `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`  react/no-unescaped-entities
apps/web lint: C:\NEW PRG\HWP2PDF\apps\web\src\app\privacy\page.tsx
apps/web lint:   17:24  error  `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`  react/no-unescaped-entities
apps/web lint:   17:30  error  `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`  react/no-unescaped-entities
apps/web lint:   62:22  error  `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`  react/no-unescaped-entities
apps/web lint:   62:25  error  `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`  react/no-unescaped-entities
apps/web lint:   62:30  error  `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`  react/no-unescaped-entities
apps/web lint:   62:36  error  `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`  react/no-unescaped-entities
apps/web lint: C:\NEW PRG\HWP2PDF\apps\web\src\app\terms\page.tsx
apps/web lint:   17:32  error  `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`  react/no-unescaped-entities
apps/web lint:   17:38  error  `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`  react/no-unescaped-entities
apps/web lint:   35:20  error  `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`  react/no-unescaped-entities
apps/web lint:   35:34  error  `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`  react/no-unescaped-entities
apps/web lint: C:\NEW PRG\HWP2PDF\apps\web\src\components\AdSenseAd.tsx
apps/web lint:   26:27  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
apps/web lint: C:\NEW PRG\HWP2PDF\apps\web\src\components\DropzoneUploader.tsx
apps/web lint:   24:3   warning  'loadJobAccessToken' is defined but never used    @typescript-eslint/no-unused-vars
apps/web lint:   61:10  warning  'downloadUrl' is assigned a value but never used  @typescript-eslint/no-unused-vars
apps/web lint:   63:10  warning  'accessToken' is assigned a value but never used  @typescript-eslint/no-unused-vars
apps/web lint: C:\NEW PRG\HWP2PDF\apps\web\src\hooks\useBoardClaims.ts
apps/web lint:   34:7  error  Error: Calling setState synchronously within an effect can trigger cascading renders
apps/web lint: Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
apps/web lint: * Update external systems with the latest state from React.
apps/web lint: * Subscribe for updates from some external system, calling setState in a callback function when external state changes.
apps/web lint: Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).
apps/web lint: C:\NEW PRG\HWP2PDF\apps\web\src\hooks\useBoardClaims.ts:34:7
apps/web lint:   32 |
apps/web lint:   33 |     if (!user) {
apps/web lint: > 34 |       setClaims({ admin: false, boardModerator: false, loading: false });
apps/web lint:      |       ^^^^^^^^^ Avoid calling setState() directly within an effect
apps/web lint:   35 |       return;
apps/web lint:   36 |     }
apps/web lint:   37 |  react-hooks/set-state-in-effect
apps/web lint: ??24 problems (18 errors, 6 warnings)
apps/web lint:   2 errors and 0 warnings potentially fixable with the `--fix` option.
apps/web lint: Failed
C:\NEW PRG\HWP2PDF\apps\web:
?덭RR_PNPM_RECURSIVE_RUN_FIRST_FAIL??web@0.1.0 lint: `eslint`
Exit status 1
