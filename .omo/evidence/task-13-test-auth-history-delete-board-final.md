Scope: 3 of 4 workspace projects
packages/shared test$ vitest run
packages/shared test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.8 [39m[90mC:/NEW PRG/HWP2PDF/packages/shared[39m
packages/shared test:  [32m??[39m src/index.test.ts [2m([22m[2m31 tests[22m[2m)[22m[32m 11[2mms[22m[39m
packages/shared test:  [32m??[39m src/validation.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 7[2mms[22m[39m
packages/shared test: [2m Test Files [22m [1m[32m2 passed[39m[22m[90m (2)[39m
packages/shared test: [2m      Tests [22m [1m[32m41 passed[39m[22m[90m (41)[39m
packages/shared test: [2m   Start at [22m 09:40:21
packages/shared test: [2m   Duration [22m 1.56s[2m (transform 92ms, setup 0ms, import 171ms, tests 18ms, environment 0ms)[22m
packages/shared test: Done
apps/api test$ vitest run
apps/web test$ vitest run
apps/api test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.8 [39m[90mC:/NEW PRG/HWP2PDF/apps/api[39m
apps/web test: [33mThe plugin "vite-tsconfig-paths" is detected. Vite now supports tsconfig paths resolution natively via the [1mresolve.tsconfigPaths[22m option. You can remove the plugin and set [1mresolve.tsconfigPaths: true[22m in your Vite config instead.[39m
apps/web test: [1m[30m[46m RUN [49m[39m[22m [36mv4.1.8 [39m[90mC:/NEW PRG/HWP2PDF/apps/web[39m
apps/api test:  [32m??[39m src/services/firebase-admin.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 14[2mms[22m[39m
apps/api test:  [32m??[39m src/utils/token.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 15[2mms[22m[39m
apps/api test:  [32m??[39m src/middleware/auth.test.ts [2m([22m[2m25 tests[22m[2m)[22m[32m 15[2mms[22m[39m
apps/api test:  [32m??[39m src/utils/access-token.test.ts [2m([22m[2m21 tests[22m[2m)[22m[32m 18[2mms[22m[39m
apps/api test:  [32m??[39m src/services/storage-service.delete.test.ts [2m([22m[2m23 tests[22m[2m)[22m[32m 66[2mms[22m[39m
apps/api test:  [32m??[39m src/services/job-store.auth.test.ts [2m([22m[2m40 tests[22m[2m)[22m[32m 25[2mms[22m[39m
apps/api test:  [32m??[39m src/services/cloud-tasks-dispatcher.test.ts [2m([22m[2m19 tests[22m[2m)[22m[32m 29[2mms[22m[39m
apps/api test:  [32m??[39m src/app.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 12[2mms[22m[39m
apps/api test:  [32m??[39m src/routes/v1.download-auth.test.ts [2m([22m[2m17 tests[22m[2m)[22m[33m 370[2mms[22m[39m
apps/api test:  [32m??[39m src/routes/v1.worker.test.ts [2m([22m[2m16 tests[22m[2m)[22m[33m 367[2mms[22m[39m
apps/api test:  [32m??[39m src/routes/v1.member-jobs.test.ts [2m([22m[2m19 tests[22m[2m)[22m[33m 465[2mms[22m[39m
apps/api test:  [32m??[39m src/routes/v1.upload-ownership.test.ts [2m([22m[2m24 tests[22m[2m)[22m[33m 556[2mms[22m[39m
apps/api test:  [32m??[39m src/routes/v1.board.test.ts [2m([22m[2m46 tests[22m[2m)[22m[33m 732[2mms[22m[39m
apps/api test: [2m Test Files [22m [1m[32m13 passed[39m[22m[90m (13)[39m
apps/api test: [2m      Tests [22m [1m[32m278 passed[39m[22m[90m (278)[39m
apps/api test: [2m   Start at [22m 09:40:23
apps/api test: [2m   Duration [22m 3.78s[2m (transform 2.23s, setup 0ms, import 18.74s, tests 2.68s, environment 2ms)[22m
apps/api test: Done
apps/web test:  [32m??[39m src/lib/api-client.auth.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 7[2mms[22m[39m
apps/web test:  [32m??[39m src/auth/AuthProvider.test.tsx [2m([22m[2m8 tests[22m[2m)[22m[32m 37[2mms[22m[39m
apps/web test:  [32m??[39m src/components/DropzoneUploader.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 48[2mms[22m[39m
apps/web test:  [32m??[39m src/components/DropzoneUploader.auth.test.tsx [2m([22m[2m11 tests[22m[2m)[22m[32m 84[2mms[22m[39m
apps/web test:  [32m??[39m src/app/history/history-page.test.tsx [2m([22m[2m7 tests[22m[2m)[22m[33m 305[2mms[22m[39m
apps/web test:  [32m??[39m src/app/board/board-page.test.tsx [2m([22m[2m27 tests[22m[2m)[22m[33m 411[2mms[22m[39m
apps/web test: [2m Test Files [22m [1m[32m6 passed[39m[22m[90m (6)[39m
apps/web test: [2m      Tests [22m [1m[32m58 passed[39m[22m[90m (58)[39m
apps/web test: [2m   Start at [22m 09:40:23
apps/web test: [2m   Duration [22m 24.78s[2m (transform 1.04s, setup 7.24s, import 16.64s, tests 893ms, environment 100.94s)[22m
apps/web test: Done
