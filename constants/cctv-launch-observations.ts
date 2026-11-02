import type { LaunchObservation } from "../lib/cctv-launch-policy";
// Public page playback observations, NOT direct upstream-source verification.
// Original observations: 2026-11-01T22:19–22:21 UTC; restored from retained exact measurements.
// Inventory fingerprints rechecked 2026-11-01T23:15:46.083626+00:00; source values are not published.
// Cheonjiyeon is held after non-advancing video, not declared source-offline.
// This release selection is not automatic continuous health monitoring.
export const CCTV_LAUNCH_OBSERVATIONS: readonly LaunchObservation[] = [
  {
    "id": "daepo",
    "observedAt": "2026-11-01T22:19:51.307Z",
    "sourceRevision": "e1ae2c8d18779826f8e21bec520586baad526f8a6370fe33b770c7dd0cfea264",
    "pageUrl": "https://funjeju.com/cctv/daepo",
    "width": 427,
    "height": 240,
    "timeAdvancedSeconds": 11.834013
  },
  {
    "id": "saeyeongyo",
    "observedAt": "2026-11-01T22:19:51.320Z",
    "sourceRevision": "6b05988883d732b30c84789acf0ca62ee372d0731b39359c30b51729411b4f71",
    "pageUrl": "https://funjeju.com/cctv/saeyeongyo",
    "width": 1280,
    "height": 720,
    "timeAdvancedSeconds": 11.827051
  },
  {
    "id": "seongsan_suma",
    "observedAt": "2026-11-01T22:19:51.330Z",
    "sourceRevision": "f62c357aa80d498e77d8a137c7d608587cfb28eda1c242e159534f922043e9d3",
    "pageUrl": "https://funjeju.com/cctv/seongsan_suma",
    "width": 1920,
    "height": 1080,
    "timeAdvancedSeconds": 11.819503
  },
  {
    "id": "seongsan",
    "observedAt": "2026-11-01T22:20:11.670Z",
    "sourceRevision": "6039e914abb874895097c0843a93104e01b0bd324de410b03d2b63d8dba30508",
    "pageUrl": "https://funjeju.com/cctv/seongsan",
    "width": 1280,
    "height": 720,
    "timeAdvancedSeconds": 20.147193
  },
  {
    "id": "sechon",
    "observedAt": "2026-11-01T22:20:11.685Z",
    "sourceRevision": "6553f49a35926f4d3e306fb947597eb30df10c17edc94d73c214051401ee9edd",
    "pageUrl": "https://funjeju.com/cctv/sechon",
    "width": 427,
    "height": 240,
    "timeAdvancedSeconds": 20.320052
  },
  {
    "id": "jeju_airport",
    "observedAt": "2026-11-01T22:20:11.693Z",
    "sourceRevision": "fc5df2d7f8a518bf6b02afd63c7cbfa413132a70d8a41a4230045d09ffd586ef",
    "pageUrl": "https://funjeju.com/cctv/jeju_airport",
    "width": 1280,
    "height": 720,
    "timeAdvancedSeconds": 20.067859
  },
  {
    "id": "halla_1100",
    "observedAt": "2026-11-01T22:20:31.371Z",
    "sourceRevision": "f2b12f88c852ee8b7a246537d32935d66ba9af99ef9115beb416287dd6771860",
    "pageUrl": "https://funjeju.com/cctv/halla_1100",
    "width": 640,
    "height": 360,
    "timeAdvancedSeconds": 19.638039
  },
  {
    "id": "halla_baengnokdam",
    "observedAt": "2026-11-01T22:20:31.379Z",
    "sourceRevision": "f1223efd78f24dc5571f14ed3c380440adafcc9d45ea68bc3a8556eaa9f4ad1b",
    "pageUrl": "https://funjeju.com/cctv/halla_baengnokdam",
    "width": 640,
    "height": 360,
    "timeAdvancedSeconds": 19.633352
  },
  {
    "id": "halla_eoseungsaeng",
    "observedAt": "2026-11-01T22:20:47.088Z",
    "sourceRevision": "c45f292d0cf1b5dc8dfa6de32ac77894e6f666831be3f0caf726974b78a89c85",
    "pageUrl": "https://funjeju.com/cctv/halla_eoseungsaeng",
    "width": 640,
    "height": 360,
    "timeAdvancedSeconds": 15.693253
  },
  {
    "id": "halla_wanggwanneung",
    "observedAt": "2026-11-01T22:20:47.099Z",
    "sourceRevision": "7b49b54799ff68918e865b4c764cc1a0472b4d1b429fb9c6614e2ea5e8c7b898",
    "pageUrl": "https://funjeju.com/cctv/halla_wanggwanneung",
    "width": 640,
    "height": 360,
    "timeAdvancedSeconds": 15.689154
  },
  {
    "id": "halla_witse",
    "observedAt": "2026-11-01T22:20:47.110Z",
    "sourceRevision": "30a06912645ecbe2bc9fbe4ac65c6d0be92a1e71204f827f7a3db11f2bea4d9c",
    "pageUrl": "https://funjeju.com/cctv/halla_witse",
    "width": 640,
    "height": 360,
    "timeAdvancedSeconds": 15.680003
  }
];
