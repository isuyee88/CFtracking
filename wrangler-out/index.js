var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
// @__NO_SIDE_EFFECTS__
function notImplementedAsync(name) {
  const fn = /* @__PURE__ */ notImplemented(name);
  fn.__promisify__ = () => /* @__PURE__ */ notImplemented(name + ".__promisify__");
  fn.native = fn;
  return fn;
}
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
var init_utils = __esm({
  "node_modules/unenv/dist/runtime/_internal/utils.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(createNotImplementedError, "createNotImplementedError");
    __name(notImplemented, "notImplemented");
    __name(notImplementedAsync, "notImplementedAsync");
    __name(notImplementedClass, "notImplementedClass");
  }
});

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin, _performanceNow, nodeTiming, PerformanceEntry, PerformanceMark, PerformanceMeasure, PerformanceResourceTiming, PerformanceObserverEntryList, Performance, PerformanceObserver, performance;
var init_performance = __esm({
  "node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_utils();
    _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
    _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
    nodeTiming = {
      name: "node",
      entryType: "node",
      startTime: 0,
      duration: 0,
      nodeStart: 0,
      v8Start: 0,
      bootstrapComplete: 0,
      environment: 0,
      loopStart: 0,
      loopExit: 0,
      idleTime: 0,
      uvMetricsInfo: {
        loopCount: 0,
        events: 0,
        eventsWaiting: 0
      },
      detail: void 0,
      toJSON() {
        return this;
      }
    };
    PerformanceEntry = class {
      static {
        __name(this, "PerformanceEntry");
      }
      __unenv__ = true;
      detail;
      entryType = "event";
      name;
      startTime;
      constructor(name, options) {
        this.name = name;
        this.startTime = options?.startTime || _performanceNow();
        this.detail = options?.detail;
      }
      get duration() {
        return _performanceNow() - this.startTime;
      }
      toJSON() {
        return {
          name: this.name,
          entryType: this.entryType,
          startTime: this.startTime,
          duration: this.duration,
          detail: this.detail
        };
      }
    };
    PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
      static {
        __name(this, "PerformanceMark");
      }
      entryType = "mark";
      constructor() {
        super(...arguments);
      }
      get duration() {
        return 0;
      }
    };
    PerformanceMeasure = class extends PerformanceEntry {
      static {
        __name(this, "PerformanceMeasure");
      }
      entryType = "measure";
    };
    PerformanceResourceTiming = class extends PerformanceEntry {
      static {
        __name(this, "PerformanceResourceTiming");
      }
      entryType = "resource";
      serverTiming = [];
      connectEnd = 0;
      connectStart = 0;
      decodedBodySize = 0;
      domainLookupEnd = 0;
      domainLookupStart = 0;
      encodedBodySize = 0;
      fetchStart = 0;
      initiatorType = "";
      name = "";
      nextHopProtocol = "";
      redirectEnd = 0;
      redirectStart = 0;
      requestStart = 0;
      responseEnd = 0;
      responseStart = 0;
      secureConnectionStart = 0;
      startTime = 0;
      transferSize = 0;
      workerStart = 0;
      responseStatus = 0;
    };
    PerformanceObserverEntryList = class {
      static {
        __name(this, "PerformanceObserverEntryList");
      }
      __unenv__ = true;
      getEntries() {
        return [];
      }
      getEntriesByName(_name, _type) {
        return [];
      }
      getEntriesByType(type) {
        return [];
      }
    };
    Performance = class {
      static {
        __name(this, "Performance");
      }
      __unenv__ = true;
      timeOrigin = _timeOrigin;
      eventCounts = /* @__PURE__ */ new Map();
      _entries = [];
      _resourceTimingBufferSize = 0;
      navigation = void 0;
      timing = void 0;
      timerify(_fn, _options) {
        throw createNotImplementedError("Performance.timerify");
      }
      get nodeTiming() {
        return nodeTiming;
      }
      eventLoopUtilization() {
        return {};
      }
      markResourceTiming() {
        return new PerformanceResourceTiming("");
      }
      onresourcetimingbufferfull = null;
      now() {
        if (this.timeOrigin === _timeOrigin) {
          return _performanceNow();
        }
        return Date.now() - this.timeOrigin;
      }
      clearMarks(markName) {
        this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
      }
      clearMeasures(measureName) {
        this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
      }
      clearResourceTimings() {
        this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
      }
      getEntries() {
        return this._entries;
      }
      getEntriesByName(name, type) {
        return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
      }
      getEntriesByType(type) {
        return this._entries.filter((e) => e.entryType === type);
      }
      mark(name, options) {
        const entry = new PerformanceMark(name, options);
        this._entries.push(entry);
        return entry;
      }
      measure(measureName, startOrMeasureOptions, endMark) {
        let start;
        let end;
        if (typeof startOrMeasureOptions === "string") {
          start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
          end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
        } else {
          start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
          end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
        }
        const entry = new PerformanceMeasure(measureName, {
          startTime: start,
          detail: {
            start,
            end
          }
        });
        this._entries.push(entry);
        return entry;
      }
      setResourceTimingBufferSize(maxSize) {
        this._resourceTimingBufferSize = maxSize;
      }
      addEventListener(type, listener, options) {
        throw createNotImplementedError("Performance.addEventListener");
      }
      removeEventListener(type, listener, options) {
        throw createNotImplementedError("Performance.removeEventListener");
      }
      dispatchEvent(event) {
        throw createNotImplementedError("Performance.dispatchEvent");
      }
      toJSON() {
        return this;
      }
    };
    PerformanceObserver = class {
      static {
        __name(this, "PerformanceObserver");
      }
      __unenv__ = true;
      static supportedEntryTypes = [];
      _callback = null;
      constructor(callback) {
        this._callback = callback;
      }
      takeRecords() {
        return [];
      }
      disconnect() {
        throw createNotImplementedError("PerformanceObserver.disconnect");
      }
      observe(options) {
        throw createNotImplementedError("PerformanceObserver.observe");
      }
      bind(fn) {
        return fn;
      }
      runInAsyncScope(fn, thisArg, ...args) {
        return fn.call(thisArg, ...args);
      }
      asyncId() {
        return 0;
      }
      triggerAsyncId() {
        return 0;
      }
      emitDestroy() {
        return this;
      }
    };
    performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();
  }
});

// node_modules/unenv/dist/runtime/node/perf_hooks.mjs
var init_perf_hooks = __esm({
  "node_modules/unenv/dist/runtime/node/perf_hooks.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_performance();
  }
});

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
var init_performance2 = __esm({
  "node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs"() {
    init_perf_hooks();
    if (!("__unenv__" in performance)) {
      const proto = Performance.prototype;
      for (const key of Object.getOwnPropertyNames(proto)) {
        if (key !== "constructor" && !(key in performance)) {
          const desc = Object.getOwnPropertyDescriptor(proto, key);
          if (desc) {
            Object.defineProperty(performance, key, desc);
          }
        }
      }
    }
    globalThis.performance = performance;
    globalThis.Performance = Performance;
    globalThis.PerformanceEntry = PerformanceEntry;
    globalThis.PerformanceMark = PerformanceMark;
    globalThis.PerformanceMeasure = PerformanceMeasure;
    globalThis.PerformanceObserver = PerformanceObserver;
    globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
    globalThis.PerformanceResourceTiming = PerformanceResourceTiming;
  }
});

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default;
var init_noop = __esm({
  "node_modules/unenv/dist/runtime/mock/noop.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    noop_default = Object.assign(() => {
    }, { __unenv__: true });
  }
});

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";
var _console, _ignoreErrors, _stderr, _stdout, log, info, trace, debug, table, error, warn, createTask, clear, count, countReset, dir, dirxml, group, groupEnd, groupCollapsed, profile, profileEnd, time, timeEnd, timeLog, timeStamp, Console, _times, _stdoutErrorHandler, _stderrErrorHandler;
var init_console = __esm({
  "node_modules/unenv/dist/runtime/node/console.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_noop();
    init_utils();
    _console = globalThis.console;
    _ignoreErrors = true;
    _stderr = new Writable();
    _stdout = new Writable();
    log = _console?.log ?? noop_default;
    info = _console?.info ?? log;
    trace = _console?.trace ?? info;
    debug = _console?.debug ?? log;
    table = _console?.table ?? log;
    error = _console?.error ?? log;
    warn = _console?.warn ?? error;
    createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
    clear = _console?.clear ?? noop_default;
    count = _console?.count ?? noop_default;
    countReset = _console?.countReset ?? noop_default;
    dir = _console?.dir ?? noop_default;
    dirxml = _console?.dirxml ?? noop_default;
    group = _console?.group ?? noop_default;
    groupEnd = _console?.groupEnd ?? noop_default;
    groupCollapsed = _console?.groupCollapsed ?? noop_default;
    profile = _console?.profile ?? noop_default;
    profileEnd = _console?.profileEnd ?? noop_default;
    time = _console?.time ?? noop_default;
    timeEnd = _console?.timeEnd ?? noop_default;
    timeLog = _console?.timeLog ?? noop_default;
    timeStamp = _console?.timeStamp ?? noop_default;
    Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
    _times = /* @__PURE__ */ new Map();
    _stdoutErrorHandler = noop_default;
    _stderrErrorHandler = noop_default;
  }
});

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole, assert, clear2, context, count2, countReset2, createTask2, debug2, dir2, dirxml2, error2, group2, groupCollapsed2, groupEnd2, info2, log2, profile2, profileEnd2, table2, time2, timeEnd2, timeLog2, timeStamp2, trace2, warn2, console_default;
var init_console2 = __esm({
  "node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_console();
    workerdConsole = globalThis["console"];
    ({
      assert,
      clear: clear2,
      context: (
        // @ts-expect-error undocumented public API
        context
      ),
      count: count2,
      countReset: countReset2,
      createTask: (
        // @ts-expect-error undocumented public API
        createTask2
      ),
      debug: debug2,
      dir: dir2,
      dirxml: dirxml2,
      error: error2,
      group: group2,
      groupCollapsed: groupCollapsed2,
      groupEnd: groupEnd2,
      info: info2,
      log: log2,
      profile: profile2,
      profileEnd: profileEnd2,
      table: table2,
      time: time2,
      timeEnd: timeEnd2,
      timeLog: timeLog2,
      timeStamp: timeStamp2,
      trace: trace2,
      warn: warn2
    } = workerdConsole);
    Object.assign(workerdConsole, {
      Console,
      _ignoreErrors,
      _stderr,
      _stderrErrorHandler,
      _stdout,
      _stdoutErrorHandler,
      _times
    });
    console_default = workerdConsole;
  }
});

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
var init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console = __esm({
  "node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console"() {
    init_console2();
    globalThis.console = console_default;
  }
});

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime;
var init_hrtime = __esm({
  "node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
      const now = Date.now();
      const seconds = Math.trunc(now / 1e3);
      const nanos = now % 1e3 * 1e6;
      if (startTime) {
        let diffSeconds = seconds - startTime[0];
        let diffNanos = nanos - startTime[0];
        if (diffNanos < 0) {
          diffSeconds = diffSeconds - 1;
          diffNanos = 1e9 + diffNanos;
        }
        return [diffSeconds, diffNanos];
      }
      return [seconds, nanos];
    }, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
      return BigInt(Date.now() * 1e6);
    }, "bigint") });
  }
});

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream;
var init_read_stream = __esm({
  "node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    ReadStream = class {
      static {
        __name(this, "ReadStream");
      }
      fd;
      isRaw = false;
      isTTY = false;
      constructor(fd) {
        this.fd = fd;
      }
      setRawMode(mode) {
        this.isRaw = mode;
        return this;
      }
    };
  }
});

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream;
var init_write_stream = __esm({
  "node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    WriteStream = class {
      static {
        __name(this, "WriteStream");
      }
      fd;
      columns = 80;
      rows = 24;
      isTTY = false;
      constructor(fd) {
        this.fd = fd;
      }
      clearLine(dir3, callback) {
        callback && callback();
        return false;
      }
      clearScreenDown(callback) {
        callback && callback();
        return false;
      }
      cursorTo(x, y, callback) {
        callback && typeof callback === "function" && callback();
        return false;
      }
      moveCursor(dx, dy, callback) {
        callback && callback();
        return false;
      }
      getColorDepth(env2) {
        return 1;
      }
      hasColors(count3, env2) {
        return false;
      }
      getWindowSize() {
        return [this.columns, this.rows];
      }
      write(str, encoding, cb) {
        if (str instanceof Uint8Array) {
          str = new TextDecoder().decode(str);
        }
        try {
          console.log(str);
        } catch {
        }
        cb && typeof cb === "function" && cb();
        return false;
      }
    };
  }
});

// node_modules/unenv/dist/runtime/node/tty.mjs
var init_tty = __esm({
  "node_modules/unenv/dist/runtime/node/tty.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_read_stream();
    init_write_stream();
  }
});

// node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION;
var init_node_version = __esm({
  "node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    NODE_VERSION = "22.14.0";
  }
});

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";
var Process;
var init_process = __esm({
  "node_modules/unenv/dist/runtime/node/internal/process/process.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_tty();
    init_utils();
    init_node_version();
    Process = class _Process extends EventEmitter {
      static {
        __name(this, "Process");
      }
      env;
      hrtime;
      nextTick;
      constructor(impl) {
        super();
        this.env = impl.env;
        this.hrtime = impl.hrtime;
        this.nextTick = impl.nextTick;
        for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
          const value = this[prop];
          if (typeof value === "function") {
            this[prop] = value.bind(this);
          }
        }
      }
      // --- event emitter ---
      emitWarning(warning, type, code) {
        console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
      }
      emit(...args) {
        return super.emit(...args);
      }
      listeners(eventName) {
        return super.listeners(eventName);
      }
      // --- stdio (lazy initializers) ---
      #stdin;
      #stdout;
      #stderr;
      get stdin() {
        return this.#stdin ??= new ReadStream(0);
      }
      get stdout() {
        return this.#stdout ??= new WriteStream(1);
      }
      get stderr() {
        return this.#stderr ??= new WriteStream(2);
      }
      // --- cwd ---
      #cwd = "/";
      chdir(cwd2) {
        this.#cwd = cwd2;
      }
      cwd() {
        return this.#cwd;
      }
      // --- dummy props and getters ---
      arch = "";
      platform = "";
      argv = [];
      argv0 = "";
      execArgv = [];
      execPath = "";
      title = "";
      pid = 200;
      ppid = 100;
      get version() {
        return `v${NODE_VERSION}`;
      }
      get versions() {
        return { node: NODE_VERSION };
      }
      get allowedNodeEnvironmentFlags() {
        return /* @__PURE__ */ new Set();
      }
      get sourceMapsEnabled() {
        return false;
      }
      get debugPort() {
        return 0;
      }
      get throwDeprecation() {
        return false;
      }
      get traceDeprecation() {
        return false;
      }
      get features() {
        return {};
      }
      get release() {
        return {};
      }
      get connected() {
        return false;
      }
      get config() {
        return {};
      }
      get moduleLoadList() {
        return [];
      }
      constrainedMemory() {
        return 0;
      }
      availableMemory() {
        return 0;
      }
      uptime() {
        return 0;
      }
      resourceUsage() {
        return {};
      }
      // --- noop methods ---
      ref() {
      }
      unref() {
      }
      // --- unimplemented methods ---
      umask() {
        throw createNotImplementedError("process.umask");
      }
      getBuiltinModule() {
        return void 0;
      }
      getActiveResourcesInfo() {
        throw createNotImplementedError("process.getActiveResourcesInfo");
      }
      exit() {
        throw createNotImplementedError("process.exit");
      }
      reallyExit() {
        throw createNotImplementedError("process.reallyExit");
      }
      kill() {
        throw createNotImplementedError("process.kill");
      }
      abort() {
        throw createNotImplementedError("process.abort");
      }
      dlopen() {
        throw createNotImplementedError("process.dlopen");
      }
      setSourceMapsEnabled() {
        throw createNotImplementedError("process.setSourceMapsEnabled");
      }
      loadEnvFile() {
        throw createNotImplementedError("process.loadEnvFile");
      }
      disconnect() {
        throw createNotImplementedError("process.disconnect");
      }
      cpuUsage() {
        throw createNotImplementedError("process.cpuUsage");
      }
      setUncaughtExceptionCaptureCallback() {
        throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
      }
      hasUncaughtExceptionCaptureCallback() {
        throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
      }
      initgroups() {
        throw createNotImplementedError("process.initgroups");
      }
      openStdin() {
        throw createNotImplementedError("process.openStdin");
      }
      assert() {
        throw createNotImplementedError("process.assert");
      }
      binding() {
        throw createNotImplementedError("process.binding");
      }
      // --- attached interfaces ---
      permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
      report = {
        directory: "",
        filename: "",
        signal: "SIGUSR2",
        compact: false,
        reportOnFatalError: false,
        reportOnSignal: false,
        reportOnUncaughtException: false,
        getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
        writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
      };
      finalization = {
        register: /* @__PURE__ */ notImplemented("process.finalization.register"),
        unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
        registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
      };
      memoryUsage = Object.assign(() => ({
        arrayBuffers: 0,
        rss: 0,
        external: 0,
        heapTotal: 0,
        heapUsed: 0
      }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
      // --- undefined props ---
      mainModule = void 0;
      domain = void 0;
      // optional
      send = void 0;
      exitCode = void 0;
      channel = void 0;
      getegid = void 0;
      geteuid = void 0;
      getgid = void 0;
      getgroups = void 0;
      getuid = void 0;
      setegid = void 0;
      seteuid = void 0;
      setgid = void 0;
      setgroups = void 0;
      setuid = void 0;
      // internals
      _events = void 0;
      _eventsCount = void 0;
      _exiting = void 0;
      _maxListeners = void 0;
      _debugEnd = void 0;
      _debugProcess = void 0;
      _fatalException = void 0;
      _getActiveHandles = void 0;
      _getActiveRequests = void 0;
      _kill = void 0;
      _preload_modules = void 0;
      _rawDebug = void 0;
      _startProfilerIdleNotifier = void 0;
      _stopProfilerIdleNotifier = void 0;
      _tickCallback = void 0;
      _disconnect = void 0;
      _handleQueue = void 0;
      _pendingMessage = void 0;
      _channel = void 0;
      _send = void 0;
      _linkedBinding = void 0;
    };
  }
});

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess, getBuiltinModule, workerdProcess, unenvProcess, exit, features, platform, _channel, _debugEnd, _debugProcess, _disconnect, _events, _eventsCount, _exiting, _fatalException, _getActiveHandles, _getActiveRequests, _handleQueue, _kill, _linkedBinding, _maxListeners, _pendingMessage, _preload_modules, _rawDebug, _send, _startProfilerIdleNotifier, _stopProfilerIdleNotifier, _tickCallback, abort, addListener, allowedNodeEnvironmentFlags, arch, argv, argv0, assert2, availableMemory, binding, channel, chdir, config, connected, constrainedMemory, cpuUsage, cwd, debugPort, disconnect, dlopen, domain, emit, emitWarning, env, eventNames, execArgv, execPath, exitCode, finalization, getActiveResourcesInfo, getegid, geteuid, getgid, getgroups, getMaxListeners, getuid, hasUncaughtExceptionCaptureCallback, hrtime3, initgroups, kill, listenerCount, listeners, loadEnvFile, mainModule, memoryUsage, moduleLoadList, nextTick, off, on, once, openStdin, permission, pid, ppid, prependListener, prependOnceListener, rawListeners, reallyExit, ref, release, removeAllListeners, removeListener, report, resourceUsage, send, setegid, seteuid, setgid, setgroups, setMaxListeners, setSourceMapsEnabled, setuid, setUncaughtExceptionCaptureCallback, sourceMapsEnabled, stderr, stdin, stdout, throwDeprecation, title, traceDeprecation, umask, unref, uptime, version, versions, _process, process_default;
var init_process2 = __esm({
  "node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_hrtime();
    init_process();
    globalProcess = globalThis["process"];
    getBuiltinModule = globalProcess.getBuiltinModule;
    workerdProcess = getBuiltinModule("node:process");
    unenvProcess = new Process({
      env: globalProcess.env,
      hrtime,
      // `nextTick` is available from workerd process v1
      nextTick: workerdProcess.nextTick
    });
    ({ exit, features, platform } = workerdProcess);
    ({
      _channel,
      _debugEnd,
      _debugProcess,
      _disconnect,
      _events,
      _eventsCount,
      _exiting,
      _fatalException,
      _getActiveHandles,
      _getActiveRequests,
      _handleQueue,
      _kill,
      _linkedBinding,
      _maxListeners,
      _pendingMessage,
      _preload_modules,
      _rawDebug,
      _send,
      _startProfilerIdleNotifier,
      _stopProfilerIdleNotifier,
      _tickCallback,
      abort,
      addListener,
      allowedNodeEnvironmentFlags,
      arch,
      argv,
      argv0,
      assert: assert2,
      availableMemory,
      binding,
      channel,
      chdir,
      config,
      connected,
      constrainedMemory,
      cpuUsage,
      cwd,
      debugPort,
      disconnect,
      dlopen,
      domain,
      emit,
      emitWarning,
      env,
      eventNames,
      execArgv,
      execPath,
      exitCode,
      finalization,
      getActiveResourcesInfo,
      getegid,
      geteuid,
      getgid,
      getgroups,
      getMaxListeners,
      getuid,
      hasUncaughtExceptionCaptureCallback,
      hrtime: hrtime3,
      initgroups,
      kill,
      listenerCount,
      listeners,
      loadEnvFile,
      mainModule,
      memoryUsage,
      moduleLoadList,
      nextTick,
      off,
      on,
      once,
      openStdin,
      permission,
      pid,
      ppid,
      prependListener,
      prependOnceListener,
      rawListeners,
      reallyExit,
      ref,
      release,
      removeAllListeners,
      removeListener,
      report,
      resourceUsage,
      send,
      setegid,
      seteuid,
      setgid,
      setgroups,
      setMaxListeners,
      setSourceMapsEnabled,
      setuid,
      setUncaughtExceptionCaptureCallback,
      sourceMapsEnabled,
      stderr,
      stdin,
      stdout,
      throwDeprecation,
      title,
      traceDeprecation,
      umask,
      unref,
      uptime,
      version,
      versions
    } = unenvProcess);
    _process = {
      abort,
      addListener,
      allowedNodeEnvironmentFlags,
      hasUncaughtExceptionCaptureCallback,
      setUncaughtExceptionCaptureCallback,
      loadEnvFile,
      sourceMapsEnabled,
      arch,
      argv,
      argv0,
      chdir,
      config,
      connected,
      constrainedMemory,
      availableMemory,
      cpuUsage,
      cwd,
      debugPort,
      dlopen,
      disconnect,
      emit,
      emitWarning,
      env,
      eventNames,
      execArgv,
      execPath,
      exit,
      finalization,
      features,
      getBuiltinModule,
      getActiveResourcesInfo,
      getMaxListeners,
      hrtime: hrtime3,
      kill,
      listeners,
      listenerCount,
      memoryUsage,
      nextTick,
      on,
      off,
      once,
      pid,
      platform,
      ppid,
      prependListener,
      prependOnceListener,
      rawListeners,
      release,
      removeAllListeners,
      removeListener,
      report,
      resourceUsage,
      setMaxListeners,
      setSourceMapsEnabled,
      stderr,
      stdin,
      stdout,
      title,
      throwDeprecation,
      traceDeprecation,
      umask,
      uptime,
      version,
      versions,
      // @ts-expect-error old API
      domain,
      initgroups,
      moduleLoadList,
      reallyExit,
      openStdin,
      assert: assert2,
      binding,
      send,
      exitCode,
      channel,
      getegid,
      geteuid,
      getgid,
      getgroups,
      getuid,
      setegid,
      seteuid,
      setgid,
      setgroups,
      setuid,
      permission,
      mainModule,
      _events,
      _eventsCount,
      _exiting,
      _maxListeners,
      _debugEnd,
      _debugProcess,
      _fatalException,
      _getActiveHandles,
      _getActiveRequests,
      _kill,
      _preload_modules,
      _rawDebug,
      _startProfilerIdleNotifier,
      _stopProfilerIdleNotifier,
      _tickCallback,
      _disconnect,
      _handleQueue,
      _pendingMessage,
      _channel,
      _send,
      _linkedBinding
    };
    process_default = _process;
  }
});

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
var init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process = __esm({
  "node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process"() {
    init_process2();
    globalThis.process = process_default;
  }
});

// src/utils/flow.filters.ts
var flow_filters_exports = {};
__export(flow_filters_exports, {
  connectionFilters: () => connectionFilters,
  executeFilter: () => executeFilter,
  filterFunctions: () => filterFunctions,
  getAvailableOperators: () => getAvailableOperators,
  getAvailableTargets: () => getAvailableTargets,
  getContextValue: () => getContextValue,
  ipFilters: () => ipFilters,
  languageFilters: () => languageFilters,
  proxyFilters: () => proxyFilters,
  timeFilters: () => timeFilters,
  uaFilters: () => uaFilters
});
function getContextValue(target, context2) {
  const [category, field] = target.split(".");
  if (category === "visitor") {
    return context2.visitor[field];
  }
  if (category === "visit") {
    return context2.visit[field];
  }
  return void 0;
}
function executeRegexWithTimeout(pattern, value, timeoutMs) {
  const start = Date.now();
  if (!pattern.global) {
    try {
      const result = pattern.test(value);
      return result;
    } catch {
      return false;
    }
  }
  let lastIndex = 0;
  let matchCount = 0;
  const maxMatches = 1e4;
  while (lastIndex < value.length && matchCount < maxMatches) {
    if (Date.now() - start > timeoutMs) {
      console.warn(`Regex timeout after ${timeoutMs}ms`);
      return false;
    }
    pattern.lastIndex = lastIndex;
    const match2 = pattern.exec(value);
    if (!match2) {
      break;
    }
    matchCount++;
    lastIndex = pattern.lastIndex;
    if (pattern.lastIndex === lastIndex) {
      lastIndex++;
    }
  }
  if (matchCount >= maxMatches) {
    console.warn(`Regex matched ${maxMatches} times, possible ReDoS`);
    return false;
  }
  return matchCount > 0;
}
function executeFilter(operator, contextValue, filterValue, context2) {
  const filterFn = filterFunctions[operator];
  if (!filterFn) {
    console.warn(`Unknown filter operator: ${operator}`);
    return false;
  }
  return filterFn(contextValue, filterValue, context2);
}
function ipToNumber(ip) {
  const parts = ip.split(".");
  if (parts.length !== 4) {
    throw new Error("Invalid IP address");
  }
  return parts.reduce((acc, part) => {
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255) {
      throw new Error("Invalid IP address");
    }
    return (acc << 8) + num;
  }, 0);
}
function getAvailableOperators() {
  return [
    { value: "equals", label: "Equals", description: "Exact match" },
    { value: "notEquals", label: "Not Equals", description: "Not equal to value" },
    { value: "contains", label: "Contains", description: "String contains substring" },
    { value: "notContains", label: "Not Contains", description: "String does not contain substring" },
    { value: "startsWith", label: "Starts With", description: "String starts with value" },
    { value: "endsWith", label: "Ends With", description: "String ends with value" },
    { value: "regex", label: "Regex", description: "Matches regular expression" },
    { value: "in", label: "In List", description: "Value is in the list" },
    { value: "notIn", label: "Not In List", description: "Value is not in the list" },
    { value: "greaterThan", label: "Greater Than", description: "Number greater than value" },
    { value: "lessThan", label: "Less Than", description: "Number less than value" },
    { value: "greaterOrEquals", label: "Greater Or Equals", description: "Number greater or equal" },
    { value: "lessOrEquals", label: "Less Or Equals", description: "Number less or equal" },
    { value: "between", label: "Between", description: "Number in range [min, max]" },
    { value: "exists", label: "Exists", description: "Value exists and is not empty" },
    { value: "notExists", label: "Not Exists", description: "Value does not exist or is empty" }
  ];
}
function getAvailableTargets() {
  return [
    // Visitor fields
    { value: "visitor.ip", label: "IP Address", category: "Visitor", type: "string" },
    { value: "visitor.country", label: "Country", category: "Visitor", type: "string" },
    { value: "visitor.region", label: "Region", category: "Visitor", type: "string" },
    { value: "visitor.city", label: "City", category: "Visitor", type: "string" },
    { value: "visitor.isp", label: "ISP", category: "Visitor", type: "string" },
    { value: "visitor.connectionType", label: "Connection Type", category: "Visitor", type: "string" },
    { value: "visitor.deviceType", label: "Device Type", category: "Visitor", type: "string" },
    { value: "visitor.os", label: "Operating System", category: "Visitor", type: "string" },
    { value: "visitor.browser", label: "Browser", category: "Visitor", type: "string" },
    { value: "visitor.language", label: "Language", category: "Visitor", type: "string" },
    { value: "visitor.userAgent", label: "User Agent", category: "Visitor", type: "string" },
    { value: "visitor.isProxy", label: "Is Proxy", category: "Visitor", type: "boolean" },
    { value: "visitor.isVpn", label: "Is VPN", category: "Visitor", type: "boolean" },
    { value: "visitor.isDatacenter", label: "Is Datacenter", category: "Visitor", type: "boolean" },
    // Visit fields
    { value: "visit.referrer", label: "Referrer", category: "Visit", type: "string" },
    { value: "visit.source", label: "Source", category: "Visit", type: "string" },
    { value: "visit.medium", label: "Medium", category: "Visit", type: "string" },
    { value: "visit.campaign", label: "Campaign", category: "Visit", type: "string" },
    { value: "visit.subId", label: "Sub ID", category: "Visit", type: "string" },
    { value: "visit.clickId", label: "Click ID", category: "Visit", type: "string" },
    { value: "visit.timestamp", label: "Timestamp", category: "Visit", type: "number" },
    { value: "visit.hourOfDay", label: "Hour of Day", category: "Visit", type: "number" },
    { value: "visit.dayOfWeek", label: "Day of Week", category: "Visit", type: "number" },
    { value: "visit.landingPage", label: "Landing Page", category: "Visit", type: "string" },
    { value: "visit.offer", label: "Offer", category: "Visit", type: "string" },
    { value: "visit.conversion", label: "Has Conversion", category: "Visit", type: "boolean" },
    { value: "visit.revenue", label: "Revenue", category: "Visit", type: "number" },
    { value: "visit.visitsCount", label: "Visits Count", category: "Visit", type: "number" },
    { value: "visit.firstVisit", label: "First Visit", category: "Visit", type: "boolean" },
    { value: "visit.returning", label: "Returning Visitor", category: "Visit", type: "boolean" }
  ];
}
var filterFunctions, ipFilters, uaFilters, timeFilters, proxyFilters, connectionFilters, languageFilters;
var init_flow_filters = __esm({
  "src/utils/flow.filters.ts"() {
    "use strict";
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(getContextValue, "getContextValue");
    filterFunctions = {
      /**
       * 等于 - 严格相等比较
       */
      equals: /* @__PURE__ */ __name((contextValue, filterValue) => {
        if (contextValue === void 0 || contextValue === null) {
          return filterValue === void 0 || filterValue === null;
        }
        return contextValue === filterValue;
      }, "equals"),
      /**
       * 不等于
       */
      notEquals: /* @__PURE__ */ __name((contextValue, filterValue) => {
        if (contextValue === void 0 || contextValue === null) {
          return filterValue !== void 0 && filterValue !== null;
        }
        return contextValue !== filterValue;
      }, "notEquals"),
      /**
       * 包含 - 字符串包含或数组包含
       */
      contains: /* @__PURE__ */ __name((contextValue, filterValue) => {
        if (contextValue === void 0 || contextValue === null) {
          return false;
        }
        const strValue = String(contextValue).toLowerCase();
        const strFilter = String(filterValue).toLowerCase();
        return strValue.includes(strFilter);
      }, "contains"),
      /**
       * 不包含
       */
      notContains: /* @__PURE__ */ __name((contextValue, filterValue) => {
        if (contextValue === void 0 || contextValue === null) {
          return true;
        }
        const strValue = String(contextValue).toLowerCase();
        const strFilter = String(filterValue).toLowerCase();
        return !strValue.includes(strFilter);
      }, "notContains"),
      /**
       * 以...开头
       */
      startsWith: /* @__PURE__ */ __name((contextValue, filterValue) => {
        if (contextValue === void 0 || contextValue === null) {
          return false;
        }
        const strValue = String(contextValue).toLowerCase();
        const strFilter = String(filterValue).toLowerCase();
        return strValue.startsWith(strFilter);
      }, "startsWith"),
      /**
       * 以...结尾
       */
      endsWith: /* @__PURE__ */ __name((contextValue, filterValue) => {
        if (contextValue === void 0 || contextValue === null) {
          return false;
        }
        const strValue = String(contextValue).toLowerCase();
        const strFilter = String(filterValue).toLowerCase();
        return strValue.endsWith(strFilter);
      }, "endsWith"),
      /**
       * 正则匹配
       * @description 支持超时保护的正则匹配，防止 ReDoS 攻击
       */
      regex: /* @__PURE__ */ __name((contextValue, filterValue) => {
        if (contextValue === void 0 || contextValue === null) {
          return false;
        }
        try {
          const pattern = new RegExp(String(filterValue), "i");
          const strValue = String(contextValue);
          return executeRegexWithTimeout(pattern, strValue, 100);
        } catch {
          return false;
        }
      }, "regex"),
      /**
       * 在列表中
       */
      in: /* @__PURE__ */ __name((contextValue, filterValue) => {
        if (contextValue === void 0 || contextValue === null) {
          return false;
        }
        const values = Array.isArray(filterValue) ? filterValue : [filterValue];
        const strContextValue = String(contextValue).toLowerCase();
        return values.some((v) => String(v).toLowerCase() === strContextValue);
      }, "in"),
      /**
       * 不在列表中
       */
      notIn: /* @__PURE__ */ __name((contextValue, filterValue) => {
        if (contextValue === void 0 || contextValue === null) {
          return true;
        }
        const values = Array.isArray(filterValue) ? filterValue : [filterValue];
        const strContextValue = String(contextValue).toLowerCase();
        return !values.some((v) => String(v).toLowerCase() === strContextValue);
      }, "notIn"),
      /**
       * 大于
       */
      greaterThan: /* @__PURE__ */ __name((contextValue, filterValue) => {
        if (contextValue === void 0 || contextValue === null) {
          return false;
        }
        const numContext = Number(contextValue);
        const numFilter = Number(filterValue);
        if (isNaN(numContext) || isNaN(numFilter)) {
          return String(contextValue) > String(filterValue);
        }
        return numContext > numFilter;
      }, "greaterThan"),
      /**
       * 小于
       */
      lessThan: /* @__PURE__ */ __name((contextValue, filterValue) => {
        if (contextValue === void 0 || contextValue === null) {
          return false;
        }
        const numContext = Number(contextValue);
        const numFilter = Number(filterValue);
        if (isNaN(numContext) || isNaN(numFilter)) {
          return String(contextValue) < String(filterValue);
        }
        return numContext < numFilter;
      }, "lessThan"),
      /**
       * 大于等于
       */
      greaterOrEquals: /* @__PURE__ */ __name((contextValue, filterValue) => {
        if (contextValue === void 0 || contextValue === null) {
          return false;
        }
        const numContext = Number(contextValue);
        const numFilter = Number(filterValue);
        if (isNaN(numContext) || isNaN(numFilter)) {
          return String(contextValue) >= String(filterValue);
        }
        return numContext >= numFilter;
      }, "greaterOrEquals"),
      /**
       * 小于等于
       */
      lessOrEquals: /* @__PURE__ */ __name((contextValue, filterValue) => {
        if (contextValue === void 0 || contextValue === null) {
          return false;
        }
        const numContext = Number(contextValue);
        const numFilter = Number(filterValue);
        if (isNaN(numContext) || isNaN(numFilter)) {
          return String(contextValue) <= String(filterValue);
        }
        return numContext <= numFilter;
      }, "lessOrEquals"),
      /**
       * 在范围内 [min, max]
       */
      between: /* @__PURE__ */ __name((contextValue, filterValue) => {
        if (contextValue === void 0 || contextValue === null) {
          return false;
        }
        const numContext = Number(contextValue);
        if (isNaN(numContext)) {
          return false;
        }
        let min, max;
        if (Array.isArray(filterValue) && filterValue.length >= 2) {
          min = Number(filterValue[0]);
          max = Number(filterValue[1]);
        } else if (typeof filterValue === "string" && filterValue.includes(",")) {
          const parts = filterValue.split(",");
          min = Number(parts[0]);
          max = Number(parts[1]);
        } else {
          return false;
        }
        if (isNaN(min) || isNaN(max)) {
          return false;
        }
        return numContext >= min && numContext <= max;
      }, "between"),
      /**
       * 存在 - 值不为 undefined 和 null
       */
      exists: /* @__PURE__ */ __name((contextValue) => {
        return contextValue !== void 0 && contextValue !== null && contextValue !== "";
      }, "exists"),
      /**
       * 不存在
       */
      notExists: /* @__PURE__ */ __name((contextValue) => {
        return contextValue === void 0 || contextValue === null || contextValue === "";
      }, "notExists")
    };
    __name(executeRegexWithTimeout, "executeRegexWithTimeout");
    __name(executeFilter, "executeFilter");
    ipFilters = {
      /**
       * 检查 IP 是否在 CIDR 范围内
       */
      inCidr: /* @__PURE__ */ __name((ip, cidr) => {
        try {
          const [subnet, prefixStr] = cidr.split("/");
          if (!subnet || !prefixStr) {
            return false;
          }
          const prefix = parseInt(prefixStr, 10);
          if (isNaN(prefix) || prefix < 0 || prefix > 32) {
            return false;
          }
          const ipNum = ipToNumber(ip);
          const subnetNum = ipToNumber(subnet);
          const mask = -1 << 32 - prefix;
          return (ipNum & mask) === (subnetNum & mask);
        } catch {
          return false;
        }
      }, "inCidr"),
      /**
       * 检查 IP 是否在 IP 列表中
       */
      inList: /* @__PURE__ */ __name((ip, ipList) => {
        return ipList.some((item) => {
          if (item.includes("/")) {
            return ipFilters.inCidr(ip, item);
          }
          return ip === item;
        });
      }, "inList"),
      /**
       * 检查 IP 是否在范围内
       */
      inRange: /* @__PURE__ */ __name((ip, startIp, endIp) => {
        try {
          const ipNum = ipToNumber(ip);
          const startNum = ipToNumber(startIp);
          const endNum = ipToNumber(endIp);
          return ipNum >= startNum && ipNum <= endNum;
        } catch {
          return false;
        }
      }, "inRange")
    };
    __name(ipToNumber, "ipToNumber");
    uaFilters = {
      /**
       * 检查是否为移动设备
       */
      isMobile: /* @__PURE__ */ __name((ua) => {
        const mobilePattern = /Mobile|Android|iPhone|iPad|iPod|Windows Phone|BlackBerry/i;
        return mobilePattern.test(ua);
      }, "isMobile"),
      /**
       * 检查是否为桌面设备
       */
      isDesktop: /* @__PURE__ */ __name((ua) => {
        return !uaFilters.isMobile(ua);
      }, "isDesktop"),
      /**
       * 检查是否为机器人
       */
      isBot: /* @__PURE__ */ __name((ua) => {
        const botPattern = /bot|crawler|spider|crawling|googlebot|bingbot|yandex/i;
        return botPattern.test(ua);
      }, "isBot"),
      /**
       * 获取设备类型
       */
      getDeviceType: /* @__PURE__ */ __name((ua) => {
        if (/iPhone|Android.*Mobile|Windows Phone/i.test(ua)) {
          return "mobile";
        }
        if (/iPad|Android(?!.*Mobile)/i.test(ua)) {
          return "tablet";
        }
        return "desktop";
      }, "getDeviceType"),
      /**
       * 获取操作系统
       */
      getOS: /* @__PURE__ */ __name((ua) => {
        if (/Windows NT 10/.test(ua)) return "Windows 10";
        if (/Windows NT 6.3/.test(ua)) return "Windows 8.1";
        if (/Windows NT 6.2/.test(ua)) return "Windows 8";
        if (/Windows NT 6.1/.test(ua)) return "Windows 7";
        if (/Mac OS X/.test(ua)) return "macOS";
        if (/Linux/.test(ua)) return "Linux";
        if (/Android/.test(ua)) return "Android";
        if (/iOS|iPhone|iPad/.test(ua)) return "iOS";
        return "Unknown";
      }, "getOS"),
      /**
       * 获取浏览器
       */
      getBrowser: /* @__PURE__ */ __name((ua) => {
        if (/Chrome/.test(ua) && !/Edge/.test(ua)) return "Chrome";
        if (/Safari/.test(ua) && !/Chrome/.test(ua)) return "Safari";
        if (/Firefox/.test(ua)) return "Firefox";
        if (/Edge/.test(ua)) return "Edge";
        if (/Opera|OPR/.test(ua)) return "Opera";
        if (/MSIE|Trident/.test(ua)) return "IE";
        return "Unknown";
      }, "getBrowser")
    };
    timeFilters = {
      /**
       * 检查是否在时间范围内
       * @param hour - 当前小时 (0-23)
       * @param range - 时间范围，如 "9-18" 或 [9, 18]
       */
      inHourRange: /* @__PURE__ */ __name((hour, range) => {
        let start, end;
        if (Array.isArray(range) && range.length >= 2) {
          start = range[0];
          end = range[1];
        } else if (typeof range === "string" && range.includes("-")) {
          const parts = range.split("-");
          if (parts[0] && parts[1]) {
            start = parseInt(parts[0], 10);
            end = parseInt(parts[1], 10);
          }
        } else {
          return false;
        }
        if (start === void 0 || end === void 0 || isNaN(start) || isNaN(end)) {
          return false;
        }
        return hour >= start && hour <= end;
      }, "inHourRange"),
      /**
       * 检查是否在星期列表中
       * @param day - 当前星期 (0=周日, 1=周一, ...)
       * @param days - 星期列表，如 [1, 2, 3, 4, 5] 表示工作日
       */
      inDays: /* @__PURE__ */ __name((day, days) => {
        return days.includes(day);
      }, "inDays")
    };
    proxyFilters = {
      /**
       * 检测是否为代理
       * @param headers - HTTP headers
       * @returns 是否为代理
       */
      isProxy: /* @__PURE__ */ __name((headers) => {
        const proxyHeaders = [
          "via",
          "x-forwarded-for",
          "x-forwarded-host",
          "x-forwarded-proto",
          "x-forwarded-port",
          "x-proxy-id",
          "x-proxy-server"
        ];
        const headerKeys = Object.keys(headers).map((k) => k.toLowerCase());
        return proxyHeaders.some((h) => headerKeys.includes(h));
      }, "isProxy"),
      /**
       * 检测是否为VPN (基于已知VPN特征)
       * @param _ip - IP地址
       * @param isp - ISP信息
       * @returns 是否为VPN
       */
      isVpn: /* @__PURE__ */ __name((_ip, isp) => {
        const vpnKeywords = [
          "vpn",
          "virtual private network",
          "nordvpn",
          "expressvpn",
          "surfshark",
          "cyberghost",
          "private internet access",
          "protonvpn",
          "tunnelbear",
          "hidemyass",
          "ipvanish",
          "vyprvpn",
          "purevpn",
          "strongvpn",
          "torguard"
        ];
        if (isp) {
          const ispLower = isp.toLowerCase();
          return vpnKeywords.some((keyword) => ispLower.includes(keyword));
        }
        return false;
      }, "isVpn"),
      /**
       * 检测是否为数据中心IP
       * @param _ip - IP地址
       * @param isp - ISP信息
       * @returns 是否为数据中心
       */
      isDatacenter: /* @__PURE__ */ __name((_ip, isp) => {
        const datacenterKeywords = [
          "amazon",
          "aws",
          "google cloud",
          "gcp",
          "microsoft azure",
          "azure",
          "digitalocean",
          "linode",
          "vultr",
          "ovh",
          "hetzner",
          "alibaba cloud",
          "tencent cloud",
          "huawei cloud",
          "contabo",
          "scaleway",
          "upcloud",
          "rackspace",
          "softlayer",
          "ibm cloud",
          "oracle cloud",
          "hosting",
          "datacenter",
          "data center",
          "cloudflare",
          "fastly",
          "incapsula"
        ];
        if (isp) {
          const ispLower = isp.toLowerCase();
          return datacenterKeywords.some((keyword) => ispLower.includes(keyword));
        }
        return false;
      }, "isDatacenter"),
      /**
       * 检测是否为Tor出口节点
       * @param _ip - IP地址
       * @returns 是否为Tor
       */
      isTor: /* @__PURE__ */ __name((_ip) => {
        return false;
      }, "isTor")
    };
    connectionFilters = {
      /**
       * 获取连接类型
       * @param connection - 连接信息字符串
       * @returns 连接类型: wifi, 4g, 5g, ethernet, cellular, unknown
       */
      getConnectionType: /* @__PURE__ */ __name((connection) => {
        if (!connection) return "unknown";
        const conn = connection.toLowerCase();
        if (conn.includes("wifi") || conn.includes("wi-fi")) return "wifi";
        if (conn.includes("5g")) return "5g";
        if (conn.includes("4g") || conn.includes("lte")) return "4g";
        if (conn.includes("3g")) return "3g";
        if (conn.includes("ethernet") || conn.includes("cable")) return "ethernet";
        if (conn.includes("cellular") || conn.includes("mobile")) return "cellular";
        if (conn.includes("dial") || conn.includes("dsl")) return "dsl";
        return "unknown";
      }, "getConnectionType"),
      /**
       * 检查是否为移动网络
       * @param connection - 连接信息
       * @returns 是否为移动网络
       */
      isMobile: /* @__PURE__ */ __name((connection) => {
        if (!connection) return false;
        const type = connectionFilters.getConnectionType(connection);
        return ["4g", "5g", "3g", "cellular"].includes(type);
      }, "isMobile"),
      /**
       * 检查是否为WiFi
       * @param connection - 连接信息
       * @returns 是否为WiFi
       */
      isWifi: /* @__PURE__ */ __name((connection) => {
        if (!connection) return false;
        return connectionFilters.getConnectionType(connection) === "wifi";
      }, "isWifi")
    };
    languageFilters = {
      /**
       * 获取语言代码
       * @param acceptLanguage - Accept-Language header
       * @returns 语言代码
       */
      getLanguage: /* @__PURE__ */ __name((acceptLanguage) => {
        if (!acceptLanguage) return "unknown";
        const match2 = acceptLanguage.match(/^([a-z]{2}(-[A-Z]{2})?)/i);
        return match2?.[1]?.toLowerCase() ?? "unknown";
      }, "getLanguage"),
      /**
       * 获取语言列表
       * @param acceptLanguage - Accept-Language header
       * @returns 语言代码列表
       */
      getLanguages: /* @__PURE__ */ __name((acceptLanguage) => {
        if (!acceptLanguage) return [];
        return acceptLanguage.split(",").map((lang) => {
          const match2 = lang.trim().match(/^([a-z]{2}(-[A-Z]{2})?)/i);
          return match2?.[1]?.toLowerCase() ?? null;
        }).filter((lang) => lang !== null);
      }, "getLanguages"),
      /**
       * 检查语言是否在列表中
       * @param acceptLanguage - Accept-Language header
       * @param languages - 要检查的语言列表
       * @returns 是否匹配
       */
      matchesLanguage: /* @__PURE__ */ __name((acceptLanguage, languages) => {
        const userLangs = languageFilters.getLanguages(acceptLanguage);
        return userLangs.some(
          (lang) => languages.some(
            (target) => lang === target.toLowerCase() || lang.startsWith(target.toLowerCase())
          )
        );
      }, "matchesLanguage")
    };
    __name(getAvailableOperators, "getAvailableOperators");
    __name(getAvailableTargets, "getAvailableTargets");
  }
});

// src/index.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/index.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/hono.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/hono-base.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/compose.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context2, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context2.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context2, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context2.error = err;
            res = await onError(err, context2);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context2.finalized === false && onNotFound) {
          res = await onNotFound(context2);
        }
      }
      if (res && (context2.finalized === false || isError)) {
        context2.res = res;
      }
      return context2;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/context.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/request.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/http-exception.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/request/constants.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/body.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// node_modules/hono/dist/utils/url.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return this.bodyCache.parsedBody ??= await parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context2, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context: context2 }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context2, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var createResponseInstance = /* @__PURE__ */ __name((body, init) => new Response(body, init), "createResponseInstance");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, { status, headers: responseHeaders });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/hono/dist/router.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/hono/dist/utils/constants.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class _Hono {
  static {
    __name(this, "_Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env2, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env2, "GET")))();
    }
    const path = this.getPath(request, { env: env2 });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env: env2,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context2 = await composed(c);
        if (!context2.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context2.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/hono/dist/router/reg-exp-router/index.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/router/reg-exp-router/router.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/router/reg-exp-router/matcher.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name(((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/hono/dist/router/reg-exp-router/node.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class _Node {
  static {
    __name(this, "_Node");
  }
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context2, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context2.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context2, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/reg-exp-router/prepared-router.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/router/smart-router/index.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/router/smart-router/router.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router2 = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router2.add(...routes[i2]);
        }
        res = router2.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router2.match.bind(router2);
      this.#routers = [router2];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/index.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/router/trie-router/router.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/router/trie-router/node.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = /* @__PURE__ */ __name((children) => {
  for (const _ in children) {
    return true;
  }
  return false;
}, "hasChildren");
var Node2 = class _Node2 {
  static {
    __name(this, "_Node");
  }
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.substring(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var cors = /* @__PURE__ */ __name((options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  }, "cors2");
}, "cors");

// node_modules/hono/dist/middleware/logger/index.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/utils/color.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function getColorEnabled() {
  const { process, Deno } = globalThis;
  const isNoColor = typeof Deno?.noColor === "boolean" ? Deno.noColor : process !== void 0 ? (
    // eslint-disable-next-line no-unsafe-optional-chaining
    "NO_COLOR" in process?.env
  ) : false;
  return !isNoColor;
}
__name(getColorEnabled, "getColorEnabled");
async function getColorEnabledAsync() {
  const { navigator } = globalThis;
  const cfWorkers = "cloudflare:workers";
  const isNoColor = navigator !== void 0 && navigator.userAgent === "Cloudflare-Workers" ? await (async () => {
    try {
      return "NO_COLOR" in ((await import(cfWorkers)).env ?? {});
    } catch {
      return false;
    }
  })() : !getColorEnabled();
  return !isNoColor;
}
__name(getColorEnabledAsync, "getColorEnabledAsync");

// node_modules/hono/dist/middleware/logger/index.js
var humanize = /* @__PURE__ */ __name((times) => {
  const [delimiter, separator] = [",", "."];
  const orderTimes = times.map((v) => v.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + delimiter));
  return orderTimes.join(separator);
}, "humanize");
var time3 = /* @__PURE__ */ __name((start) => {
  const delta = Date.now() - start;
  return humanize([delta < 1e3 ? delta + "ms" : Math.round(delta / 1e3) + "s"]);
}, "time");
var colorStatus = /* @__PURE__ */ __name(async (status) => {
  const colorEnabled = await getColorEnabledAsync();
  if (colorEnabled) {
    switch (status / 100 | 0) {
      case 5:
        return `\x1B[31m${status}\x1B[0m`;
      case 4:
        return `\x1B[33m${status}\x1B[0m`;
      case 3:
        return `\x1B[36m${status}\x1B[0m`;
      case 2:
        return `\x1B[32m${status}\x1B[0m`;
    }
  }
  return `${status}`;
}, "colorStatus");
async function log3(fn, prefix, method, path, status = 0, elapsed) {
  const out = prefix === "<--" ? `${prefix} ${method} ${path}` : `${prefix} ${method} ${path} ${await colorStatus(status)} ${elapsed}`;
  fn(out);
}
__name(log3, "log");
var logger = /* @__PURE__ */ __name((fn = console.log) => {
  return /* @__PURE__ */ __name(async function logger2(c, next) {
    const { method, url } = c.req;
    const path = url.slice(url.indexOf("/", 8));
    await log3(fn, "<--", method, path);
    const start = Date.now();
    await next();
    await log3(fn, "-->", method, path, c.res.status, time3(start));
  }, "logger2");
}, "logger");

// src/utils/response.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/config/constants.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500
};
var ERROR_CODES = {
  UNKNOWN: "UNKNOWN_ERROR",
  VALIDATION: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  DUPLICATE: "DUPLICATE_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  DATABASE: "DATABASE_ERROR",
  EXTERNAL_API: "EXTERNAL_API_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR"
};
var TRACKING = {
  CLICK_ID_PREFIX: "clk_",
  CONVERSION_ID_PREFIX: "cnv_",
  VISITOR_ID_PREFIX: "vst_",
  UNIQUENESS_DEFAULT_TTL: 86400
};

// src/utils/response.ts
function success(data, meta) {
  return {
    success: true,
    data,
    error: null,
    meta
  };
}
__name(success, "success");
function error3(message, code = ERROR_CODES.UNKNOWN, details) {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
      details
    }
  };
}
__name(error3, "error");

// src/handlers/do/index.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/handlers/do/session.do.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var SessionDurableObject = class {
  static {
    __name(this, "SessionDurableObject");
  }
  storage;
  sessions = /* @__PURE__ */ new Map();
  constructor(state) {
    this.storage = state.storage;
  }
  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;
    if (method === "POST" && path === "/create") {
      return this.createSession(request);
    }
    if (method === "GET" && path.startsWith("/get/")) {
      const visitorId = path.replace("/get/", "");
      return this.getSession(visitorId);
    }
    if (method === "PUT" && path === "/update") {
      return this.updateSession(request);
    }
    if (method === "DELETE" && path.startsWith("/delete/")) {
      const visitorId = path.replace("/delete/", "");
      return this.deleteSession(visitorId);
    }
    return new Response("Not Found", { status: 404 });
  }
  async createSession(request) {
    const data = await request.json();
    const now = /* @__PURE__ */ new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1e3);
    const session = {
      ...data,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };
    this.sessions.set(data.visitorId, session);
    await this.storage.put(`session:${data.visitorId}`, session);
    return new Response(JSON.stringify(session), {
      headers: { "Content-Type": "application/json" }
    });
  }
  async getSession(visitorId) {
    let session = this.sessions.get(visitorId);
    if (!session) {
      session = await this.storage.get(`session:${visitorId}`);
      if (session) {
        this.sessions.set(visitorId, session);
      }
    }
    if (!session) {
      return new Response("Session not found", { status: 404 });
    }
    if (new Date(session.expiresAt) < /* @__PURE__ */ new Date()) {
      this.sessions.delete(visitorId);
      await this.storage.delete(`session:${visitorId}`);
      return new Response("Session expired", { status: 410 });
    }
    return new Response(JSON.stringify(session), {
      headers: { "Content-Type": "application/json" }
    });
  }
  async updateSession(request) {
    const data = await request.json();
    const existing = this.sessions.get(data.visitorId);
    if (!existing) {
      const stored = await this.storage.get(`session:${data.visitorId}`);
      if (!stored) {
        return new Response("Session not found", { status: 404 });
      }
      this.sessions.set(data.visitorId, stored);
    }
    const session = this.sessions.get(data.visitorId);
    const updated = { ...session, ...data.updates };
    this.sessions.set(data.visitorId, updated);
    await this.storage.put(`session:${data.visitorId}`, updated);
    return new Response(JSON.stringify(updated), {
      headers: { "Content-Type": "application/json" }
    });
  }
  async deleteSession(visitorId) {
    this.sessions.delete(visitorId);
    await this.storage.delete(`session:${visitorId}`);
    return new Response(JSON.stringify({ deleted: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};

// src/handlers/do/counter.do.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var CounterDurableObject = class {
  static {
    __name(this, "CounterDurableObject");
  }
  storage;
  counters = /* @__PURE__ */ new Map();
  constructor(state) {
    this.storage = state.storage;
  }
  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;
    if (method === "POST" && path === "/increment") {
      return this.increment(request);
    }
    if (method === "GET" && path.startsWith("/get/")) {
      const key = path.replace("/get/", "");
      return this.getCounter(key);
    }
    if (method === "POST" && path === "/reset") {
      return this.resetCounter(request);
    }
    if (method === "GET" && path === "/all") {
      return this.getAllCounters();
    }
    return new Response("Not Found", { status: 404 });
  }
  async increment(request) {
    const data = await request.json();
    let counter = this.counters.get(data.key);
    if (!counter) {
      counter = await this.storage.get(`counter:${data.key}`);
      if (!counter) {
        counter = {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          spend: 0,
          revenue: 0,
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      this.counters.set(data.key, counter);
    }
    counter.impressions += data.impressions || 0;
    counter.clicks += data.clicks || 0;
    counter.conversions += data.conversions || 0;
    counter.spend += data.spend || 0;
    counter.revenue += data.revenue || 0;
    counter.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    await this.storage.put(`counter:${data.key}`, counter);
    return new Response(JSON.stringify(counter), {
      headers: { "Content-Type": "application/json" }
    });
  }
  async getCounter(key) {
    let counter = this.counters.get(key);
    if (!counter) {
      counter = await this.storage.get(`counter:${key}`);
      if (counter) {
        this.counters.set(key, counter);
      }
    }
    if (!counter) {
      return new Response("Counter not found", { status: 404 });
    }
    return new Response(JSON.stringify(counter), {
      headers: { "Content-Type": "application/json" }
    });
  }
  async resetCounter(request) {
    const data = await request.json();
    const counter = {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: 0,
      revenue: 0,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.counters.set(data.key, counter);
    await this.storage.put(`counter:${data.key}`, counter);
    return new Response(JSON.stringify(counter), {
      headers: { "Content-Type": "application/json" }
    });
  }
  async getAllCounters() {
    const allData = await this.storage.list({ prefix: "counter:" });
    const counters = {};
    for (const [key, value] of allData) {
      const counterKey = key.replace("counter:", "");
      counters[counterKey] = value;
    }
    return new Response(JSON.stringify(counters), {
      headers: { "Content-Type": "application/json" }
    });
  }
};

// src/handlers/do/queue.do.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var QueueDurableObject = class {
  static {
    __name(this, "QueueDurableObject");
  }
  storage;
  queue = [];
  constructor(state) {
    this.storage = state.storage;
  }
  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;
    if (method === "POST" && path === "/enqueue") {
      return this.enqueue(request);
    }
    if (method === "POST" && path === "/dequeue") {
      return this.dequeue(request);
    }
    if (method === "GET" && path === "/size") {
      return this.getSize();
    }
    if (method === "GET" && path === "/peek") {
      return this.peek();
    }
    if (method === "POST" && path === "/clear") {
      return this.clear();
    }
    return new Response("Not Found", { status: 404 });
  }
  async enqueue(request) {
    const data = await request.json();
    const task = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.queue.push(task);
    this.queue.sort((a, b) => b.priority - a.priority);
    await this.storage.put("queue", this.queue);
    return new Response(JSON.stringify(task), {
      headers: { "Content-Type": "application/json" }
    });
  }
  async dequeue(request) {
    const data = await request.json();
    const count3 = data.count || 1;
    const tasks = [];
    for (let i = 0; i < count3 && this.queue.length > 0; i++) {
      const task = this.queue.shift();
      if (task) {
        tasks.push(task);
      }
    }
    await this.storage.put("queue", this.queue);
    return new Response(JSON.stringify(tasks), {
      headers: { "Content-Type": "application/json" }
    });
  }
  async getSize() {
    return new Response(JSON.stringify({ size: this.queue.length }), {
      headers: { "Content-Type": "application/json" }
    });
  }
  async peek() {
    return new Response(JSON.stringify(this.queue.slice(0, 10)), {
      headers: { "Content-Type": "application/json" }
    });
  }
  async clear() {
    this.queue = [];
    await this.storage.put("queue", this.queue);
    return new Response(JSON.stringify({ cleared: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};

// src/handlers/do/uniqueness.do.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var UniquenessDurableObject = class {
  static {
    __name(this, "UniquenessDurableObject");
  }
  storage;
  records = /* @__PURE__ */ new Map();
  constructor(state, _env) {
    this.storage = state.storage;
  }
  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;
    if (method === "POST" && path === "/check") {
      return this.check(request);
    }
    if (method === "GET" && path.startsWith("/stats/")) {
      const key = path.replace("/stats/", "");
      return this.getStats(key);
    }
    return new Response("Not Found", { status: 404 });
  }
  /**
   * 执行去重检查
   */
  async check(request) {
    const req = await request.json();
    if (req.method === "none") {
      return this.jsonResponse({
        isUnique: true,
        method: "none",
        firstSeenAt: null,
        existingClickId: null,
        visitorId: req.visitorId,
        shouldSetCookie: false
      });
    }
    const key = this.generateKey(req);
    const clickId = this.generateClickId();
    const existing = await this.storage.get(key);
    if (existing) {
      const result2 = {
        isUnique: false,
        method: req.method,
        firstSeenAt: existing.firstSeenAt,
        existingClickId: existing.clickId,
        visitorId: req.visitorId,
        shouldSetCookie: false
      };
      return this.jsonResponse(result2);
    }
    const record = {
      visitorId: req.visitorId,
      clickId,
      firstSeenAt: (/* @__PURE__ */ new Date()).toISOString(),
      campaignId: req.campaignId,
      method: req.method
    };
    this.records.set(key, record);
    const ttlSeconds = req.ttl || 86400;
    await this.storage.put(key, record, { expirationTtl: ttlSeconds });
    const result = {
      isUnique: true,
      method: req.method,
      firstSeenAt: null,
      existingClickId: null,
      visitorId: req.visitorId,
      shouldSetCookie: req.method === "cookie"
    };
    return this.jsonResponse(result);
  }
  /**
   * 获取统计信息
   */
  async getStats(key) {
    const record = await this.storage.get(key);
    if (!record) {
      return this.jsonResponse({ exists: false });
    }
    return this.jsonResponse({
      exists: true,
      record
    });
  }
  /**
   * 生成去重键
   */
  generateKey(request) {
    const prefix = `uniqueness:${request.campaignId}:`;
    switch (request.method) {
      case "ip":
        return `${prefix}ip:${this.hashString(request.ip)}`;
      case "ip_ua":
        return `${prefix}ipua:${this.hashString(`${request.ip}:${request.userAgent}`)}`;
      case "cookie":
        return `${prefix}cookie:${request.visitorId}`;
      case "fingerprint":
        const fp = request.fingerprint || this.hashString(`${request.ip}:${request.userAgent}`);
        return `${prefix}fp:${fp}`;
      case "parameter":
        if (!request.uniquenessParameter || !request.urlParams) {
          return `${prefix}ip:${this.hashString(request.ip)}`;
        }
        const paramValue = request.urlParams[request.uniquenessParameter];
        if (!paramValue) {
          return `${prefix}ip:${this.hashString(request.ip)}`;
        }
        return `${prefix}param:${request.uniquenessParameter}:${paramValue}`;
      default:
        throw new Error(`Unknown uniqueness method: ${request.method}`);
    }
  }
  /**
   * 简单哈希算法
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  /**
   * 生成点击ID
   */
  generateClickId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${random}`;
  }
  jsonResponse(data) {
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" }
    });
  }
};
var UniquenessDOService = class {
  constructor(env2) {
    this.env = env2;
  }
  static {
    __name(this, "UniquenessDOService");
  }
  /**
   * 执行去重检查
   */
  async check(request) {
    const id = this.env.UNIQUE_DO.idFromName(`campaign-${request.campaignId}`);
    const stub = this.env.UNIQUE_DO.get(id);
    const response = await stub.fetch("http://localhost/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request)
    });
    if (!response.ok) {
      throw new Error(`Uniqueness check failed: ${response.status}`);
    }
    return response.json();
  }
};

// src/handlers/do/user-preference.do.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var UserPreferenceDurableObject = class {
  static {
    __name(this, "UserPreferenceDurableObject");
  }
  storage;
  eventControllers = /* @__PURE__ */ new Map();
  constructor(state) {
    this.storage = state.storage;
  }
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    if (method === "GET" && path === "/preferences") {
      return this.getPreferences();
    }
    if (method === "POST" && path === "/preferences") {
      return this.updatePreferences(request);
    }
    if (method === "GET" && path === "/preferences/version") {
      return this.getVersion();
    }
    if (method === "GET" && path === "/events") {
      return this.handleSSE(request);
    }
    return new Response("Not Found", { status: 404 });
  }
  /**
   * 获取完整用户偏好
   */
  async getPreferences() {
    const data = await this.storage.get("preferences");
    if (!data) {
      return Response.json(this.getDefaultPreferences());
    }
    return Response.json(data);
  }
  /**
   * 获取版本信息（轻量级）
   */
  async getVersion() {
    const data = await this.storage.get("preferences");
    return Response.json({
      version: data?.version || "1.0",
      lastUpdated: data?.lastUpdated || 0,
      lastModifiedBy: data?.lastModifiedBy || "unknown"
    });
  }
  /**
   * 更新用户偏好（推送）
   */
  async updatePreferences(request) {
    try {
      const update = await request.json();
      const deviceId = request.headers.get("X-Device-ID") || "unknown";
      const current = await this.storage.get("preferences");
      const currentData = current || this.getDefaultPreferences();
      if (update.lastKnownVersion && update.lastKnownVersion < currentData.lastUpdated) {
        return Response.json({
          success: false,
          conflict: true,
          serverVersion: currentData,
          message: "Server has newer version"
        }, { status: 409 });
      }
      const newData = {
        ...currentData,
        version: this.incrementVersion(currentData.version),
        lastUpdated: Date.now(),
        lastModifiedBy: deviceId,
        preferences: {
          ...currentData.preferences,
          ...update.preferences || {}
        }
      };
      await this.storage.put("preferences", newData);
      this.broadcastEvent({
        type: "preference_updated",
        version: newData.lastUpdated,
        timestamp: Date.now(),
        modifiedBy: deviceId
      });
      return Response.json({
        success: true,
        data: newData,
        version: newData.lastUpdated
      });
    } catch (error4) {
      console.error("[UserPreferenceDO] Update failed:", error4);
      return Response.json({
        success: false,
        error: error4 instanceof Error ? error4.message : "Update failed"
      }, { status: 500 });
    }
  }
  /**
   * SSE 事件处理
   */
  handleSSE(request) {
    const encoder = new TextEncoder();
    const clientId = request.headers.get("X-Device-ID") || `client_${Date.now()}`;
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "connected", clientId, timestamp: Date.now() })}

`)
        );
        const heartbeatInterval = setInterval(() => {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        }, 3e4);
        request.signal.addEventListener("abort", () => {
          clearInterval(heartbeatInterval);
          controller.close();
        });
      },
      cancel() {
      }
    });
    this.eventControllers.set(clientId, stream);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Connection": "keep-alive",
        "Cache-Control": "no-cache",
        "X-Client-ID": clientId
      }
    });
  }
  /**
   * 广播事件到所有连接的客户端
   */
  broadcastEvent(data) {
    const encoder = new TextEncoder();
    const message = `data: ${JSON.stringify(data)}

`;
    for (const [clientId, controller] of this.eventControllers.entries()) {
      try {
        controller.enqueue(encoder.encode(message));
      } catch (error4) {
        this.eventControllers.delete(clientId);
        console.log(`[SSE] Client ${clientId} disconnected`);
      }
    }
    console.log(`[SSE] Broadcasted event to ${this.eventControllers.size} clients`);
  }
  /**
   * 获取默认偏好设置
   */
  getDefaultPreferences() {
    return {
      version: "1.0",
      lastUpdated: 0,
      lastModifiedBy: "system",
      preferences: {
        ui: {
          theme: "auto",
          density: "standard",
          fontSize: "medium",
          sidebarCollapsed: false
        },
        tables: {},
        views: {},
        system: {
          language: "en",
          timezone: "UTC",
          refreshInterval: 3e4
        }
      }
    };
  }
  /**
   * 版本号递增
   */
  incrementVersion(version2) {
    const parts = version2.split(".");
    const minor = parseInt(parts[1] || "0", 10) + 1;
    return `${parts[0]}.${minor}`;
  }
};

// src/handlers/do/tracking-stats.do.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
import { DurableObject } from "cloudflare:workers";
var TrackingStatsDO = class extends DurableObject {
  static {
    __name(this, "TrackingStatsDO");
  }
  // 内存状态（实时）
  stats = {
    todayClicks: 0,
    todayConversions: 0,
    todayRevenue: 0,
    todayCost: 0,
    recentClicks: [],
    pendingWrites: [],
    hourlyStats: /* @__PURE__ */ new Map()
  };
  initialized = false;
  db = null;
  constructor(ctx, env2) {
    super(ctx, env2);
    this.ctx.blockConcurrencyWhile(async () => {
      await this.initializeDatabase();
      await this.loadTodayStats();
      this.initialized = true;
    });
  }
  /**
   * 初始化 SQLite 数据库
   */
  async initializeDatabase() {
    this.db = this.ctx.storage.sql;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS clicks (
        id TEXT PRIMARY KEY,
        campaign_id TEXT,
        campaign_name TEXT,
        offer_id TEXT,
        landing_id TEXT,
        traffic_source_id TEXT,
        ip TEXT,
        country TEXT,
        region TEXT,
        city TEXT,
        device TEXT,
        browser TEXT,
        os TEXT,
        timestamp INTEGER,
        is_conversion INTEGER DEFAULT 0,
        revenue REAL DEFAULT 0,
        cost REAL DEFAULT 0
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hourly_stats (
        hour TEXT PRIMARY KEY,
        clicks INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        revenue REAL DEFAULT 0,
        cost REAL DEFAULT 0
      )
    `);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_clicks_timestamp ON clicks(timestamp)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_clicks_campaign ON clicks(campaign_id)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_clicks_conversion ON clicks(is_conversion)`);
  }
  async fetch(request) {
    const url = new URL(request.url);
    try {
      switch (url.pathname) {
        case "/track-click":
          return await this.handleTrackClick(request);
        case "/track-conversion":
          return await this.handleTrackConversion(request);
        case "/stats":
          return await this.handleGetStats();
        case "/recent-clicks":
          return await this.handleGetRecentClicks(request);
        case "/hourly-stats":
          return await this.handleGetHourlyStats(request);
        case "/campaign-stats":
          return await this.handleGetCampaignStats();
        case "/archive":
          return await this.handleArchive();
        case "/aggregate-daily":
          return await this.handleAggregateDaily(request);
        case "/aggregate-historical":
          return await this.handleAggregateHistorical(request);
        case "/chart-data":
          return await this.handleGetChartData(request);
        case "/entity-stats":
          return await this.handleGetEntityStats(request);
        default:
          return new Response("Not Found", { status: 404 });
      }
    } catch (error4) {
      console.error("[TrackingStatsDO] Error:", error4);
      return new Response(JSON.stringify({
        error: error4 instanceof Error ? error4.message : "Unknown error"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  /**
   * 处理点击追踪 - 极快（仅写内存）
   */
  async handleTrackClick(request) {
    const data = await request.json();
    this.stats.todayClicks++;
    this.stats.todayCost += data.cost || 0;
    const hour = new Date(data.timestamp).toISOString().slice(0, 13) + ":00:00";
    const hourly = this.stats.hourlyStats.get(hour) || {
      hour,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      cost: 0
    };
    hourly.clicks++;
    hourly.cost += data.cost || 0;
    this.stats.hourlyStats.set(hour, hourly);
    this.stats.recentClicks.unshift(data);
    if (this.stats.recentClicks.length > 200) {
      this.stats.recentClicks.pop();
    }
    this.stats.pendingWrites.push(data);
    await this.scheduleAlarmIfNeeded();
    return Response.json({
      success: true,
      stats: {
        todayClicks: this.stats.todayClicks,
        todayConversions: this.stats.todayConversions,
        todayRevenue: this.stats.todayRevenue,
        todayCost: this.stats.todayCost
      }
    });
  }
  /**
   * 处理转化追踪
   */
  async handleTrackConversion(request) {
    const data = await request.json();
    const { clickId, revenue = 0 } = data;
    this.stats.todayConversions++;
    this.stats.todayRevenue += revenue;
    const click = this.stats.recentClicks.find((c) => c.id === clickId);
    if (click) {
      click.isConversion = true;
      click.revenue = revenue;
    }
    try {
      this.db.exec(
        "UPDATE clicks SET is_conversion = 1, revenue = ? WHERE id = ?",
        revenue,
        clickId
      );
    } catch (e) {
      console.warn("[TrackingStatsDO] Failed to update conversion:", e);
    }
    return Response.json({
      success: true,
      stats: {
        todayClicks: this.stats.todayClicks,
        todayConversions: this.stats.todayConversions,
        todayRevenue: this.stats.todayRevenue
      }
    });
  }
  /**
   * 获取实时统计 - 极快（直接读内存）
   */
  async handleGetStats() {
    const profit = this.stats.todayRevenue - this.stats.todayCost;
    const roi = this.stats.todayCost > 0 ? profit / this.stats.todayCost * 100 : 0;
    const conversionRate = this.stats.todayClicks > 0 ? this.stats.todayConversions / this.stats.todayClicks * 100 : 0;
    return Response.json({
      todayClicks: this.stats.todayClicks,
      todayConversions: this.stats.todayConversions,
      todayRevenue: this.stats.todayRevenue,
      todayCost: this.stats.todayCost,
      todayProfit: profit,
      todayROI: roi,
      conversionRate,
      dataSource: "DO_MEMORY",
      timestamp: Date.now()
    });
  }
  /**
   * 获取最近点击
   */
  async handleGetRecentClicks(request) {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    return Response.json({
      clicks: this.stats.recentClicks.slice(0, limit),
      total: this.stats.recentClicks.length,
      dataSource: "DO_MEMORY"
    });
  }
  /**
   * 获取小时统计
   */
  async handleGetHourlyStats(request) {
    const url = new URL(request.url);
    const hours = parseInt(url.searchParams.get("hours") || "24");
    const now = /* @__PURE__ */ new Date();
    const stats = [];
    for (let i = hours - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1e3);
      const hour = d.toISOString().slice(0, 13) + ":00:00";
      const hourly = this.stats.hourlyStats.get(hour);
      stats.push(hourly || {
        hour,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        cost: 0
      });
    }
    return Response.json({
      stats,
      dataSource: "DO_MEMORY"
    });
  }
  /**
   * 获取活动统计
   */
  async handleGetCampaignStats() {
    const result = this.db.exec(`
      SELECT 
        campaign_id,
        campaign_name,
        COUNT(*) as clicks,
        SUM(is_conversion) as conversions,
        SUM(revenue) as revenue,
        SUM(cost) as cost
      FROM clicks
      WHERE timestamp > ?
      GROUP BY campaign_id
      ORDER BY clicks DESC
    `, Date.now() - 24 * 60 * 60 * 1e3);
    return Response.json({
      campaigns: result,
      dataSource: "DO_SQLITE"
    });
  }
  /**
   * 归档到 D1
   */
  async handleArchive() {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1e3;
    const oldClicks = this.db.exec(`
      SELECT * FROM clicks WHERE timestamp < ?
    `, cutoff);
    console.log(`[Archive] Found ${oldClicks.length} old clicks to archive`);
    this.db.exec(`DELETE FROM clicks WHERE timestamp < ?`, cutoff);
    return Response.json({
      success: true,
      archived: oldClicks.length,
      cutoff: new Date(cutoff).toISOString()
    });
  }
  /**
   * Alarm 触发 - 批量持久化
   */
  async alarm() {
    console.log("[Alarm] Running batch persistence");
    try {
      if (this.stats.pendingWrites.length > 0) {
        for (const click of this.stats.pendingWrites) {
          this.db.exec(
            `
            INSERT OR REPLACE INTO clicks 
            (id, campaign_id, campaign_name, offer_id, landing_id, traffic_source_id,
             ip, country, region, city, device, browser, os, timestamp, is_conversion, revenue, cost)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
            click.id,
            click.campaignId,
            click.campaignName || "",
            click.offerId || "",
            click.landingId || "",
            click.trafficSourceId || "",
            click.ip,
            click.country || "",
            click.region || "",
            click.city || "",
            click.device || "",
            click.browser || "",
            click.os || "",
            click.timestamp,
            click.isConversion ? 1 : 0,
            click.revenue || 0,
            click.cost || 0
          );
        }
        console.log(`[Alarm] Persisted ${this.stats.pendingWrites.length} clicks`);
        this.stats.pendingWrites = [];
      }
      for (const [hour, stats] of this.stats.hourlyStats) {
        this.db.exec(`
          INSERT OR REPLACE INTO hourly_stats (hour, clicks, conversions, revenue, cost)
          VALUES (?, ?, ?, ?, ?)
        `, hour, stats.clicks, stats.conversions, stats.revenue, stats.cost);
      }
      const now = /* @__PURE__ */ new Date();
      if (now.getHours() === 2) {
        await this.handleArchive();
      }
    } catch (error4) {
      console.error("[Alarm] Error:", error4);
    }
  }
  /**
   * 设置 Alarm（如果需要）
   */
  async scheduleAlarmIfNeeded() {
    const currentAlarm = await this.ctx.storage.getAlarm();
    if (!currentAlarm) {
      await this.ctx.storage.setAlarm(Date.now() + 5e3);
    }
  }
  /**
   * 从 SQLite 加载今日统计
   */
  async loadTodayStats() {
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    const clickResult = this.db.exec(`
      SELECT COUNT(*) as count FROM clicks WHERE timestamp >= ?
    `, todayTimestamp);
    this.stats.todayClicks = clickResult[0]?.count || 0;
    const convResult = this.db.exec(`
      SELECT COUNT(*) as count, SUM(revenue) as revenue, SUM(cost) as cost
      FROM clicks WHERE timestamp >= ? AND is_conversion = 1
    `, todayTimestamp);
    this.stats.todayConversions = convResult[0]?.count || 0;
    this.stats.todayRevenue = convResult[0]?.revenue || 0;
    this.stats.todayCost = convResult[0]?.cost || 0;
    console.log("[TrackingStatsDO] Loaded today stats:", {
      clicks: this.stats.todayClicks,
      conversions: this.stats.todayConversions
    });
  }
  /**
   * 处理每日数据聚合
   */
  async handleAggregateDaily(request) {
    const data = await request.json();
    const { date } = data;
    try {
      const targetDate = date ? new Date(date) : /* @__PURE__ */ new Date();
      targetDate.setHours(0, 0, 0, 0);
      const startTimestamp = targetDate.getTime();
      const endTimestamp = startTimestamp + 24 * 60 * 60 * 1e3;
      const dailyData = this.db.exec(`
        SELECT 
          campaign_id, campaign_name, 
          COUNT(*) as clicks, 
          SUM(is_conversion) as conversions, 
          SUM(revenue) as revenue, 
          SUM(cost) as cost
        FROM clicks 
        WHERE timestamp >= ? AND timestamp < ?
        GROUP BY campaign_id
      `, startTimestamp, endTimestamp);
      if (this.env.DB) {
        for (const item of dailyData) {
          try {
            await this.env.DB.exec(
              `
              INSERT OR REPLACE INTO daily_stats (
                date, campaign_id, campaign_name, 
                clicks, conversions, revenue, cost
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
              targetDate.toISOString().split("T")[0],
              item.campaign_id,
              item.campaign_name,
              item.clicks,
              item.conversions,
              item.revenue,
              item.cost
            );
          } catch (e) {
            console.warn("[AggregateDaily] Failed to insert into D1:", e);
          }
        }
      }
      return Response.json({
        success: true,
        message: "Daily aggregation completed",
        recordsProcessed: dailyData.length,
        date: targetDate.toISOString().split("T")[0]
      });
    } catch (error4) {
      console.error("[AggregateDaily] Error:", error4);
      return Response.json({
        success: false,
        message: "Daily aggregation failed",
        errors: [error4 instanceof Error ? error4.message : "Unknown error"]
      });
    }
  }
  /**
   * 获取图表数据
   */
  async handleGetChartData(request) {
    const url = new URL(request.url);
    const range = url.searchParams.get("range") || "last7days";
    const now = /* @__PURE__ */ new Date();
    let startDate;
    switch (range) {
      case "today":
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "yesterday":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "last7days":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "last30days":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "last3months":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 90);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "thismonth":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "lastmonth":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
    }
    const startTimestamp = startDate.getTime();
    const endTimestamp = now.getTime();
    const chartData = this.db.exec(`
      SELECT 
        DATE(timestamp / 1000, 'unixepoch') as date, 
        COUNT(*) as clicks, 
        SUM(is_conversion) as conversions, 
        SUM(revenue) as revenue, 
        SUM(cost) as cost
      FROM clicks 
      WHERE timestamp >= ? AND timestamp <= ?
      GROUP BY date
      ORDER BY date
    `, startTimestamp, endTimestamp);
    return Response.json({
      chartData: chartData.map((item) => ({
        date: item.date,
        clicks: item.clicks || 0,
        conversions: item.conversions || 0,
        spend: item.cost || 0,
        revenue: item.revenue || 0,
        impressions: 0
        // DO 中没有存储 impressions
      })),
      dataSource: "DO_SQLITE"
    });
  }
  /**
   * 获取实体统计数据
   */
  async handleGetEntityStats(request) {
    const url = new URL(request.url);
    const range = url.searchParams.get("range") || "last7days";
    const now = /* @__PURE__ */ new Date();
    let startDate;
    switch (range) {
      case "today":
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "yesterday":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "last7days":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "last30days":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "last3months":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 90);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "thismonth":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "lastmonth":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
    }
    const startTimestamp = startDate.getTime();
    const [campaigns, countries, deviceTypes, browsers] = await Promise.all([
      this.getEntityStatsByType("campaign_id", "campaign_name", startTimestamp),
      this.getEntityStatsByType("country", "country", startTimestamp),
      this.getEntityStatsByType("device", "device", startTimestamp),
      this.getEntityStatsByType("browser", "browser", startTimestamp)
    ]);
    return Response.json({
      stats: {
        campaigns,
        countries,
        device_types: deviceTypes,
        browsers
      },
      dataSource: "DO_SQLITE"
    });
  }
  /**
   * 根据实体类型获取统计数据
   */
  getEntityStatsByType(idField, nameField, startTimestamp) {
    const result = this.db.exec(`
      SELECT 
        ${idField} as id, 
        ${nameField} as name, 
        COUNT(*) as clicks, 
        SUM(is_conversion) as conversions, 
        SUM(revenue) as revenue, 
        SUM(cost) as cost
      FROM clicks 
      WHERE timestamp >= ? AND ${idField} != ''
      GROUP BY ${idField}
      ORDER BY clicks DESC
      LIMIT 10
    `, startTimestamp);
    return result.map((item) => ({
      name: item.name || "Unknown",
      clicks: item.clicks || 0,
      impressions: 0,
      // DO 中没有存储 impressions
      conversions: item.conversions || 0,
      spend: item.cost || 0,
      revenue: item.revenue || 0,
      unique_visitors: 0
      // DO 中没有存储 unique_visitors
    }));
  }
  /**
   * 处理历史数据聚合
   */
  async handleAggregateHistorical(request) {
    const data = await request.json();
    const { startDate, endDate } = data;
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const startTimestamp = start.getTime();
      const endTimestamp = end.getTime();
      const historicalData = this.db.exec(`
        SELECT 
          DATE(timestamp / 1000, 'unixepoch') as date, 
          campaign_id, campaign_name, 
          COUNT(*) as clicks, 
          SUM(is_conversion) as conversions, 
          SUM(revenue) as revenue, 
          SUM(cost) as cost
        FROM clicks 
        WHERE timestamp >= ? AND timestamp <= ?
        GROUP BY date, campaign_id
      `, startTimestamp, endTimestamp);
      if (this.env.DB) {
        let processed = 0;
        for (const item of historicalData) {
          try {
            await this.env.DB.exec(
              `
              INSERT OR REPLACE INTO daily_stats (
                date, campaign_id, campaign_name, 
                clicks, conversions, revenue, cost
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
              item.date,
              item.campaign_id,
              item.campaign_name,
              item.clicks,
              item.conversions,
              item.revenue,
              item.cost
            );
            processed++;
          } catch (e) {
            console.warn("[AggregateHistorical] Failed to insert into D1:", e);
          }
        }
        return Response.json({
          success: true,
          message: "Historical aggregation completed",
          recordsProcessed: processed,
          startDate: start.toISOString().split("T")[0],
          endDate: end.toISOString().split("T")[0]
        });
      }
      return Response.json({
        success: false,
        message: "D1 database not available"
      });
    } catch (error4) {
      console.error("[AggregateHistorical] Error:", error4);
      return Response.json({
        success: false,
        message: "Historical aggregation failed",
        errors: [error4 instanceof Error ? error4.message : "Unknown error"]
      });
    }
  }
};

// src/handlers/do/index.ts
function getSessionStub(env2, visitorId) {
  const id = env2.SESSION_DO.idFromName(`session:${visitorId}`);
  return env2.SESSION_DO.get(id);
}
__name(getSessionStub, "getSessionStub");
function getCounterStub(env2, key) {
  const id = env2.COUNTER_DO.idFromName(`counter:${key}`);
  return env2.COUNTER_DO.get(id);
}
__name(getCounterStub, "getCounterStub");
function getQueueStub(env2, name = "default") {
  const id = env2.QUEUE_DO.idFromName(`queue:${name}`);
  return env2.QUEUE_DO.get(id);
}
__name(getQueueStub, "getQueueStub");
function getTrackingStatsStub(env2, name = "global-stats") {
  const id = env2.TRACKING_STATS_DO.idFromName(name);
  return env2.TRACKING_STATS_DO.get(id);
}
__name(getTrackingStatsStub, "getTrackingStatsStub");
var DOService = class {
  constructor(env2) {
    this.env = env2;
  }
  static {
    __name(this, "DOService");
  }
  async getSession(visitorId) {
    const stub = getSessionStub(this.env, visitorId);
    const response = await stub.fetch(
      new Request(`https://do.internal/get/${visitorId}`, { method: "GET" })
    );
    if (!response.ok) return null;
    return response.json();
  }
  async createSession(data) {
    const stub = getSessionStub(this.env, data.visitorId);
    const response = await stub.fetch(
      new Request("https://do.internal/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
    );
    return response.json();
  }
  async incrementCounter(key, data) {
    const stub = getCounterStub(this.env, key);
    const response = await stub.fetch(
      new Request("https://do.internal/increment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, ...data })
      })
    );
    return response.json();
  }
  async getCounter(key) {
    const stub = getCounterStub(this.env, key);
    const response = await stub.fetch(
      new Request(`https://do.internal/get/${key}`, { method: "GET" })
    );
    if (!response.ok) return null;
    return response.json();
  }
  async enqueueTask(data) {
    const stub = getQueueStub(this.env);
    const response = await stub.fetch(
      new Request("https://do.internal/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
    );
    return response.json();
  }
  async dequeueTasks(count3 = 1) {
    const stub = getQueueStub(this.env);
    const response = await stub.fetch(
      new Request("https://do.internal/dequeue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: count3 })
      })
    );
    return response.json();
  }
  async getTrackingStats() {
    const stub = getTrackingStatsStub(this.env);
    const response = await stub.fetch(
      new Request("http://do/stats", { method: "GET" })
    );
    if (!response.ok) return null;
    return response.json();
  }
  async trackClick(data) {
    const stub = getTrackingStatsStub(this.env);
    const response = await stub.fetch(
      new Request("http://do/track-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
    );
    return response.json();
  }
  async trackConversion(data) {
    const stub = getTrackingStatsStub(this.env);
    const response = await stub.fetch(
      new Request("http://do/track-conversion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
    );
    return response.json();
  }
};

// src/ssr/cache-do.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
import { DurableObject as DurableObject2 } from "cloudflare:workers";
var CacheDurableObject = class extends DurableObject2 {
  static {
    __name(this, "CacheDurableObject");
  }
  async fetch(request) {
    return new Response("CacheDurableObject is deprecated", { status: 410 });
  }
};

// src/handlers/do/deprecated-do.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
import { DurableObject as DurableObject3 } from "cloudflare:workers";
var EventActor = class extends DurableObject3 {
  static {
    __name(this, "EventActor");
  }
  async fetch(request) {
    return new Response("EventActor is deprecated", { status: 410 });
  }
};
var StatsActor = class extends DurableObject3 {
  static {
    __name(this, "StatsActor");
  }
  async fetch(request) {
    return new Response("StatsActor is deprecated", { status: 410 });
  }
};

// src/services/analytics/aggregation.service.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var AggregationService = class {
  static {
    __name(this, "AggregationService");
  }
  env;
  constructor(env2) {
    this.env = env2;
  }
  /**
   * Aggregate daily data
   */
  async aggregateDailyData(date) {
    try {
      const trackingDO = this.env.TRACKING_STATS_DO.get(
        this.env.TRACKING_STATS_DO.idFromName("global-stats")
      );
      const response = await trackingDO.fetch("http://do/aggregate-daily", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ date })
      });
      const result = await response.json();
      return {
        success: result.success || false,
        message: result.message || "Aggregation completed",
        recordsProcessed: result.recordsProcessed,
        errors: result.errors
      };
    } catch (error4) {
      console.error("[AggregationService] Error:", error4);
      return {
        success: false,
        message: "Aggregation failed",
        errors: [error4 instanceof Error ? error4.message : "Unknown error"]
      };
    }
  }
  /**
   * Aggregate historical data
   */
  async aggregateHistoricalData(startDate, endDate) {
    try {
      const trackingDO = this.env.TRACKING_STATS_DO.get(
        this.env.TRACKING_STATS_DO.idFromName("global-stats")
      );
      const response = await trackingDO.fetch("http://do/aggregate-historical", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ startDate, endDate })
      });
      const result = await response.json();
      return {
        success: result.success || false,
        message: result.message || "Historical aggregation completed",
        recordsProcessed: result.recordsProcessed,
        errors: result.errors
      };
    } catch (error4) {
      console.error("[AggregationService] Historical aggregation error:", error4);
      return {
        success: false,
        message: "Historical aggregation failed",
        errors: [error4 instanceof Error ? error4.message : "Unknown error"]
      };
    }
  }
};
function createAggregationService(env2) {
  return new AggregationService(env2);
}
__name(createAggregationService, "createAggregationService");

// src/services/platform/index.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/platform/adapter.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var PlatformAdapter = class {
  static {
    __name(this, "PlatformAdapter");
  }
  config;
  constructor(config2) {
    this.config = config2;
  }
};

// src/services/platform/manager.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/platform/oddbytes.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var OddBytesAdapter = class extends PlatformAdapter {
  static {
    __name(this, "OddBytesAdapter");
  }
  initialized = false;
  constructor(config2) {
    super(config2);
  }
  getInfo() {
    return {
      id: "oddbytes",
      name: "OddBytes",
      type: "soap",
      version: "1.0.0",
      description: "OddBytes SOAP API integration for traffic management",
      actions: [
        "pause_campaign",
        "start_campaign",
        "adjust_bid",
        "get_campaign_data",
        "get_campaign_stats"
      ]
    };
  }
  async initialize() {
    if (!this.config.wsdlUrl || !this.config.apiKey) {
      throw new Error("Missing required configuration: wsdlUrl and apiKey");
    }
    this.initialized = true;
  }
  async execute(action, parameters) {
    if (!this.initialized) {
      return {
        success: false,
        message: "Platform not initialized"
      };
    }
    switch (action) {
      case "pause_campaign":
        return this.pauseCampaign(parameters.campaignId);
      case "start_campaign":
        return this.startCampaign(parameters.campaignId);
      case "adjust_bid":
        return this.adjustBid(
          parameters.campaignId,
          parameters.keywordId,
          parameters.bid
        );
      case "get_campaign_data":
        return this.getCampaignData(parameters.campaignId);
      case "get_campaign_stats":
        return this.getCampaignStats(parameters.campaignId);
      default:
        return {
          success: false,
          message: `Action ${action} not supported`
        };
    }
  }
  validateConfig() {
    return !!(this.config.wsdlUrl && this.config.apiKey);
  }
  async testConnection() {
    try {
      const response = await fetch(this.config.wsdlUrl, {
        method: "GET"
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  async pauseCampaign(campaignId) {
    try {
      const soapEnvelope = this.buildSoapEnvelope("UpdateCampaign", {
        CampaignId: campaignId,
        Status: "paused"
      });
      const response = await this.sendSoapRequest(soapEnvelope);
      const result = this.parseSoapResponse(response);
      return {
        success: result.success,
        message: result.success ? `Campaign ${campaignId} paused successfully` : `Failed to pause campaign: ${result.error}`
      };
    } catch (error4) {
      return {
        success: false,
        message: `Error pausing campaign: ${error4}`
      };
    }
  }
  async startCampaign(campaignId) {
    try {
      const soapEnvelope = this.buildSoapEnvelope("UpdateCampaign", {
        CampaignId: campaignId,
        Status: "active"
      });
      const response = await this.sendSoapRequest(soapEnvelope);
      const result = this.parseSoapResponse(response);
      return {
        success: result.success,
        message: result.success ? `Campaign ${campaignId} started successfully` : `Failed to start campaign: ${result.error}`
      };
    } catch (error4) {
      return {
        success: false,
        message: `Error starting campaign: ${error4}`
      };
    }
  }
  async adjustBid(campaignId, keywordId, bid) {
    try {
      const soapEnvelope = this.buildSoapEnvelope("UpdateKeywordBid", {
        CampaignId: campaignId,
        KeywordId: keywordId,
        Bid: bid
      });
      const response = await this.sendSoapRequest(soapEnvelope);
      const result = this.parseSoapResponse(response);
      return {
        success: result.success,
        message: result.success ? `Bid adjusted to ${bid} for keyword ${keywordId}` : `Failed to adjust bid: ${result.error}`
      };
    } catch (error4) {
      return {
        success: false,
        message: `Error adjusting bid: ${error4}`
      };
    }
  }
  async getCampaignData(campaignId) {
    try {
      const soapEnvelope = this.buildSoapEnvelope("GetCampaign", {
        CampaignId: campaignId
      });
      const response = await this.sendSoapRequest(soapEnvelope);
      const result = this.parseSoapResponse(response);
      return {
        success: result.success,
        message: "Campaign data retrieved",
        data: result.data
      };
    } catch (error4) {
      return {
        success: false,
        message: `Error getting campaign data: ${error4}`
      };
    }
  }
  async getCampaignStats(campaignId) {
    try {
      const soapEnvelope = this.buildSoapEnvelope("GetCampaignStats", {
        CampaignId: campaignId
      });
      const response = await this.sendSoapRequest(soapEnvelope);
      const result = this.parseSoapResponse(response);
      return {
        success: result.success,
        message: "Campaign stats retrieved",
        data: result.data
      };
    } catch (error4) {
      return {
        success: false,
        message: `Error getting campaign stats: ${error4}`
      };
    }
  }
  buildSoapEnvelope(action, params) {
    const paramsXml = Object.entries(params).map(([key, value]) => `<${key}>${value}</${key}>`).join("");
    return `<?xml version="1.0" encoding="utf-8"?>
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
        xmlns:odd="https://api.oddbytes.com/soap">
        <soap:Header>
          <odd:Authentication>
            <odd:ApiKey>${this.config.apiKey}</odd:ApiKey>
          </odd:Authentication>
        </soap:Header>
        <soap:Body>
          <odd:${action}>
            ${paramsXml}
          </odd:${action}>
        </soap:Body>
      </soap:Envelope>`;
  }
  async sendSoapRequest(envelope) {
    const response = await fetch(this.config.wsdlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": ""
      },
      body: envelope
    });
    return response.text();
  }
  parseSoapResponse(response) {
    if (response.includes("<success>true</success>") || response.includes("<Status>Success</Status>")) {
      return { success: true };
    }
    const errorMatch = response.match(/<Error>(.*?)<\/Error>/);
    if (errorMatch) {
      return { success: false, error: errorMatch[1] };
    }
    return { success: false, error: "Unknown response format" };
  }
};

// src/services/platform/propellerads.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var PropellerAdsAdapter = class extends PlatformAdapter {
  static {
    __name(this, "PropellerAdsAdapter");
  }
  initialized = false;
  baseUrl;
  constructor(config2) {
    super(config2);
    this.baseUrl = config2.apiUrl || "https://ssp-api.propellerads.com/v5";
  }
  getInfo() {
    return {
      id: "propellerads",
      name: "PropellerAds",
      type: "rest",
      version: "1.0.0",
      description: "PropellerAds REST API integration for traffic management",
      actions: [
        "pause_campaign",
        "start_campaign",
        "adjust_bid",
        "exclude_zone",
        "include_zone",
        "get_campaign_data",
        "get_campaign_stats",
        "get_balance"
      ]
    };
  }
  async initialize() {
    if (!this.config.apiKey) {
      throw new Error("Missing required configuration: apiKey");
    }
    this.initialized = true;
  }
  async execute(action, parameters) {
    if (!this.initialized) {
      return {
        success: false,
        message: "Platform not initialized"
      };
    }
    switch (action) {
      case "pause_campaign":
        return this.pauseCampaign(parameters.campaignId);
      case "start_campaign":
        return this.startCampaign(parameters.campaignId);
      case "adjust_bid":
        return this.adjustBid(parameters.campaignId, parameters.bid);
      case "get_campaign_data":
        return this.getCampaignData(parameters.campaignId);
      case "get_campaign_stats":
        return this.getCampaignStats(parameters.campaignId);
      case "get_balance":
        return this.getBalance();
      case "exclude_zone":
        return this.excludeZone(
          parameters.campaignId,
          parameters.zoneId
        );
      case "include_zone":
        return this.includeZone(
          parameters.campaignId,
          parameters.zoneId
        );
      default:
        return {
          success: false,
          message: `Action ${action} not supported`
        };
    }
  }
  validateConfig() {
    return !!this.config.apiKey;
  }
  async testConnection() {
    try {
      const response = await this.makeRequest("/info", "GET");
      return response.ok;
    } catch {
      return false;
    }
  }
  async pauseCampaign(campaignId) {
    try {
      const response = await this.makeRequest(`/campaigns/${campaignId}`, "PATCH", {
        status: 3
      });
      if (response.ok) {
        return {
          success: true,
          message: `Campaign ${campaignId} paused successfully`
        };
      }
      const error4 = await response.text();
      return {
        success: false,
        message: `Failed to pause campaign: ${error4}`
      };
    } catch (error4) {
      return {
        success: false,
        message: `Error pausing campaign: ${error4}`
      };
    }
  }
  async startCampaign(campaignId) {
    try {
      const response = await this.makeRequest(`/campaigns/${campaignId}`, "PATCH", {
        status: 1
      });
      if (response.ok) {
        return {
          success: true,
          message: `Campaign ${campaignId} started successfully`
        };
      }
      const error4 = await response.text();
      return {
        success: false,
        message: `Failed to start campaign: ${error4}`
      };
    } catch (error4) {
      return {
        success: false,
        message: `Error starting campaign: ${error4}`
      };
    }
  }
  async adjustBid(campaignId, bid) {
    try {
      const response = await this.makeRequest(`/campaigns/${campaignId}`, "PATCH", {
        cpc: bid
      });
      if (response.ok) {
        return {
          success: true,
          message: `Bid adjusted to ${bid} for campaign ${campaignId}`
        };
      }
      const error4 = await response.text();
      return {
        success: false,
        message: `Failed to adjust bid: ${error4}`
      };
    } catch (error4) {
      return {
        success: false,
        message: `Error adjusting bid: ${error4}`
      };
    }
  }
  async getCampaignData(campaignId) {
    try {
      const response = await this.makeRequest(`/campaigns/${campaignId}`, "GET");
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: "Campaign data retrieved",
          data
        };
      }
      const error4 = await response.text();
      return {
        success: false,
        message: `Failed to get campaign data: ${error4}`
      };
    } catch (error4) {
      return {
        success: false,
        message: `Error getting campaign data: ${error4}`
      };
    }
  }
  async getCampaignStats(campaignId) {
    try {
      const response = await this.makeRequest(`/campaigns/${campaignId}/stats`, "GET");
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: "Campaign stats retrieved",
          data
        };
      }
      const error4 = await response.text();
      return {
        success: false,
        message: `Failed to get campaign stats: ${error4}`
      };
    } catch (error4) {
      return {
        success: false,
        message: `Error getting campaign stats: ${error4}`
      };
    }
  }
  async getBalance() {
    try {
      const response = await this.makeRequest("/balance", "GET");
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: "Balance retrieved",
          data
        };
      }
      const error4 = await response.text();
      return {
        success: false,
        message: `Failed to get balance: ${error4}`
      };
    } catch (error4) {
      return {
        success: false,
        message: `Error getting balance: ${error4}`
      };
    }
  }
  /**
   * 排除特定 Zone（根据统计数据自动暂停某个投放位置）
   * API: PUT /adv/campaigns/{campaignId}/targeting/exclude/zone
   */
  async excludeZone(campaignId, zoneId) {
    try {
      const response = await this.makeRequest(
        `/adv/campaigns/${campaignId}/targeting/exclude/zone`,
        "PUT",
        {
          zones: [Number(zoneId)]
        }
      );
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: `Zone ${zoneId} excluded from campaign ${campaignId} successfully`,
          data
        };
      }
      const error4 = await response.text();
      return {
        success: false,
        message: `Failed to exclude zone ${zoneId}: ${error4}`
      };
    } catch (error4) {
      return {
        success: false,
        message: `Error excluding zone ${zoneId}: ${error4}`
      };
    }
  }
  /**
   * 恢复特定 Zone（将 Zone 从排除列表中移除）
   * API: PUT /adv/campaigns/{campaignId}/targeting/include/zone
   */
  async includeZone(campaignId, zoneId) {
    try {
      const response = await this.makeRequest(
        `/adv/campaigns/${campaignId}/targeting/include/zone`,
        "PUT",
        {
          zones: [Number(zoneId)]
        }
      );
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: `Zone ${zoneId} included in campaign ${campaignId} successfully`,
          data
        };
      }
      const error4 = await response.text();
      return {
        success: false,
        message: `Failed to include zone ${zoneId}: ${error4}`
      };
    } catch (error4) {
      return {
        success: false,
        message: `Error including zone ${zoneId}: ${error4}`
      };
    }
  }
  async makeRequest(path, method, body) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.config.apiKey}`
    };
    const options = {
      method,
      headers
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    return fetch(url, options);
  }
};

// src/services/platform/clickbank.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var ClickBankAdapter = class extends PlatformAdapter {
  static {
    __name(this, "ClickBankAdapter");
  }
  initialized = false;
  baseUrl;
  constructor(config2) {
    super(config2);
    this.baseUrl = config2.apiUrl || "https://api.clickbank.com/rest/v2";
  }
  getInfo() {
    return {
      id: "clickbank",
      name: "ClickBank",
      type: "rest",
      version: "1.0.0",
      description: "ClickBank API integration for affiliate marketing",
      actions: [
        "get_sales",
        "get_commissions",
        "get_product_info",
        "get_affiliate_stats",
        "get_account_balance",
        "create_hoplink"
      ]
    };
  }
  async initialize() {
    if (!this.config.apiKey || !this.config.accountNickname) {
      throw new Error("Missing required configuration: apiKey and accountNickname");
    }
    this.initialized = true;
  }
  async execute(action, parameters) {
    if (!this.initialized) {
      return {
        success: false,
        message: "Platform not initialized"
      };
    }
    switch (action) {
      case "get_sales":
        return this.getSales(parameters.startDate, parameters.endDate);
      case "get_commissions":
        return this.getCommissions(parameters.startDate, parameters.endDate);
      case "get_product_info":
        return this.getProductInfo(parameters.productId);
      case "get_affiliate_stats":
        return this.getAffiliateStats(parameters.startDate, parameters.endDate);
      case "get_account_balance":
        return this.getAccountBalance();
      case "create_hoplink":
        return this.createHoplink(
          parameters.vendorId,
          parameters.productId,
          parameters.hopLinkType
        );
      default:
        return {
          success: false,
          message: `Action ${action} not supported`
        };
    }
  }
  validateConfig() {
    return !!this.config.apiKey && !!this.config.accountNickname;
  }
  async testConnection() {
    try {
      const response = await this.makeRequest("/accounts/" + this.config.accountNickname, "GET");
      return response.ok;
    } catch {
      return false;
    }
  }
  async getSales(startDate, endDate) {
    try {
      const response = await this.makeRequest(`/accounts/${this.config.accountNickname}/sales`, "GET", {
        startDate,
        endDate
      });
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: "Sales retrieved successfully",
          data
        };
      }
      const error4 = await response.text();
      return {
        success: false,
        message: `Failed to get sales: ${error4}`
      };
    } catch (error4) {
      return {
        success: false,
        message: `Error getting sales: ${error4}`
      };
    }
  }
  async getCommissions(startDate, endDate) {
    try {
      const response = await this.makeRequest(`/accounts/${this.config.accountNickname}/commissions`, "GET", {
        startDate,
        endDate
      });
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: "Commissions retrieved successfully",
          data
        };
      }
      const error4 = await response.text();
      return {
        success: false,
        message: `Failed to get commissions: ${error4}`
      };
    } catch (error4) {
      return {
        success: false,
        message: `Error getting commissions: ${error4}`
      };
    }
  }
  async getProductInfo(productId) {
    try {
      const response = await this.makeRequest(`/products/${productId}`, "GET");
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: "Product info retrieved successfully",
          data
        };
      }
      const error4 = await response.text();
      return {
        success: false,
        message: `Failed to get product info: ${error4}`
      };
    } catch (error4) {
      return {
        success: false,
        message: `Error getting product info: ${error4}`
      };
    }
  }
  async getAffiliateStats(startDate, endDate) {
    try {
      const response = await this.makeRequest(`/accounts/${this.config.accountNickname}/stats`, "GET", {
        startDate,
        endDate
      });
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: "Affiliate stats retrieved successfully",
          data
        };
      }
      const error4 = await response.text();
      return {
        success: false,
        message: `Failed to get affiliate stats: ${error4}`
      };
    } catch (error4) {
      return {
        success: false,
        message: `Error getting affiliate stats: ${error4}`
      };
    }
  }
  async getAccountBalance() {
    try {
      const response = await this.makeRequest(`/accounts/${this.config.accountNickname}/balance`, "GET");
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: "Account balance retrieved successfully",
          data
        };
      }
      const error4 = await response.text();
      return {
        success: false,
        message: `Failed to get account balance: ${error4}`
      };
    } catch (error4) {
      return {
        success: false,
        message: `Error getting account balance: ${error4}`
      };
    }
  }
  async createHoplink(vendorId, productId, hopLinkType) {
    try {
      const response = await this.makeRequest("/hoplinks", "POST", {
        vendor: vendorId,
        product: productId,
        type: hopLinkType || "standard",
        affiliate: this.config.accountNickname
      });
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: "Hoplink created successfully",
          data
        };
      }
      const error4 = await response.text();
      return {
        success: false,
        message: `Failed to create hoplink: ${error4}`
      };
    } catch (error4) {
      return {
        success: false,
        message: `Error creating hoplink: ${error4}`
      };
    }
  }
  async makeRequest(path, method, params) {
    let url = `${this.baseUrl}${path}`;
    if (params && method === "GET") {
      const queryString = new URLSearchParams(params).toString();
      url += `?${queryString}`;
    }
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.config.apiKey}`
    };
    const options = {
      method,
      headers
    };
    if (params && method !== "GET") {
      options.body = JSON.stringify(params);
    }
    return fetch(url, options);
  }
};

// src/services/platform/manager.ts
var PlatformManager = class _PlatformManager {
  static {
    __name(this, "PlatformManager");
  }
  adapters = /* @__PURE__ */ new Map();
  configs = /* @__PURE__ */ new Map();
  /**
   * 注册平台适配器
   */
  registerAdapter(adapter) {
    const info3 = adapter.getInfo();
    this.adapters.set(info3.id, adapter);
  }
  /**
   * 初始化平台
   */
  async initializePlatform(platformId, config2) {
    const adapter = this.adapters.get(platformId);
    if (!adapter) {
      throw new Error(`Platform ${platformId} not found`);
    }
    if (!adapter.validateConfig()) {
      throw new Error(`Invalid configuration for platform ${platformId}`);
    }
    await adapter.initialize();
    this.configs.set(platformId, config2);
  }
  /**
   * 执行操作
   */
  async executeAction(platformId, action, parameters) {
    const adapter = this.adapters.get(platformId);
    if (!adapter) {
      return {
        success: false,
        message: `Platform ${platformId} not found`
      };
    }
    return adapter.execute(action, parameters);
  }
  /**
   * 获取所有可用平台
   */
  getAvailablePlatforms() {
    const platforms = [];
    for (const adapter of this.adapters.values()) {
      platforms.push(adapter.getInfo());
    }
    return platforms;
  }
  /**
   * 获取已配置的平台
   */
  getConfiguredPlatforms() {
    const platforms = [];
    for (const [id, adapter] of this.adapters.entries()) {
      platforms.push({
        info: adapter.getInfo(),
        configured: this.configs.has(id)
      });
    }
    return platforms;
  }
  /**
   * 测试平台连接
   */
  async testPlatformConnection(platformId) {
    const adapter = this.adapters.get(platformId);
    if (!adapter) {
      return false;
    }
    return adapter.testConnection();
  }
  /**
   * 创建默认管理器实例
   */
  static createDefault() {
    const manager = new _PlatformManager();
    manager.registerAdapter(new OddBytesAdapter({ wsdlUrl: "", apiKey: "" }));
    manager.registerAdapter(new PropellerAdsAdapter({ apiKey: "" }));
    manager.registerAdapter(new ClickBankAdapter({ apiKey: "", accountNickname: "" }));
    return manager;
  }
};

// src/services/platform/task.processor.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/handlers/d1/task.repo.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/handlers/d1/base.repo.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var BaseRepository = class {
  static {
    __name(this, "BaseRepository");
  }
  db;
  tableName;
  constructor(db, tableName) {
    this.db = db;
    this.tableName = tableName;
  }
  transform(row) {
    return row;
  }
  async findById(id) {
    const result = await this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ? OR displayId = ?`).bind(id, id).first();
    if (!result) return null;
    return this.transform(result);
  }
  async findAll(limit = 100, offset = 0) {
    const result = await this.db.prepare(`SELECT * FROM ${this.tableName} LIMIT ? OFFSET ?`).bind(limit, offset).all();
    return result.results.map(this.transform.bind(this)) || [];
  }
  async findBy(field, value) {
    const result = await this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${field} = ?`).bind(value).all();
    return result.results.map(this.transform.bind(this)) || [];
  }
  async findOneBy(field, value) {
    const result = await this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${field} = ? LIMIT 1`).bind(value).first();
    if (!result) return null;
    return this.transform(result);
  }
  async deleteById(id) {
    const result = await this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).bind(id).run();
    return result.success;
  }
  async softDelete(id) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const result = await this.db.prepare(`UPDATE ${this.tableName} SET status = ?, updatedAt = ? WHERE id = ?`).bind("deleted", now, id).run();
    return result.success;
  }
  async count(conditions, params) {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    if (conditions) {
      sql += ` WHERE ${conditions}`;
    }
    const stmt = this.db.prepare(sql);
    const bound = params ? stmt.bind(...params) : stmt;
    const result = await bound.first();
    return result?.count || 0;
  }
  async exists(id) {
    const result = await this.db.prepare(`SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`).bind(id).first();
    return result !== null;
  }
  async findByIds(ids) {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => "?").join(",");
    const result = await this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id IN (${placeholders}) OR displayId IN (${placeholders})`).bind(...ids, ...ids).all();
    return result.results.map(this.transform.bind(this)) || [];
  }
};

// src/handlers/d1/task.repo.ts
var TaskRepository = class extends BaseRepository {
  static {
    __name(this, "TaskRepository");
  }
  constructor(db) {
    super(db, "taskQueue");
  }
  /**
   * 创建任务
   */
  async create(data) {
    const id = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await this.db.prepare(`
        INSERT INTO taskQueue (id, type, payload, status, priority, scheduledAt, retryCount, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
      id,
      data.type,
      JSON.stringify(data.payload),
      "pending",
      data.priority || 0,
      data.scheduledAt || null,
      0,
      now,
      now
    ).run();
    const task = await this.findById(id);
    return task;
  }
  /**
   * 获取待执行的任务
   */
  async getPendingTasks(limit = 10) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const result = await this.db.prepare(`
        SELECT * FROM taskQueue 
        WHERE status = 'pending' 
        AND (scheduledAt IS NULL OR scheduledAt <= ?)
        ORDER BY priority DESC, createdAt ASC
        LIMIT ?
      `).bind(now, limit).all();
    return result.results || [];
  }
  /**
   * 标记任务为运行中
   */
  async markRunning(id) {
    const result = await this.db.prepare("UPDATE taskQueue SET status = 'running', updatedAt = ? WHERE id = ? AND status = 'pending'").bind((/* @__PURE__ */ new Date()).toISOString(), id).run();
    return result.meta.changes > 0;
  }
  /**
   * 标记任务完成
   */
  async markCompleted(id, result) {
    await this.db.prepare(`
        UPDATE taskQueue 
        SET status = 'completed', result = ?, executedAt = ?, updatedAt = ?
        WHERE id = ?
      `).bind(JSON.stringify(result), (/* @__PURE__ */ new Date()).toISOString(), (/* @__PURE__ */ new Date()).toISOString(), id).run();
  }
  /**
   * 标记任务失败
   */
  async markFailed(id, error4) {
    await this.db.prepare(`
        UPDATE taskQueue 
        SET status = 'failed', error = ?, retryCount = retryCount + 1, updatedAt = ?
        WHERE id = ?
      `).bind(error4, (/* @__PURE__ */ new Date()).toISOString(), id).run();
  }
  /**
   * 重试失败的任务
   */
  async retryTask(id, maxRetries = 3) {
    const task = await this.findById(id);
    if (!task || task.retryCount >= maxRetries) {
      return false;
    }
    await this.db.prepare(`
        UPDATE taskQueue 
        SET status = 'pending', updatedAt = ?
        WHERE id = ?
      `).bind((/* @__PURE__ */ new Date()).toISOString(), id).run();
    return true;
  }
  /**
   * 清理已完成的任务
   */
  async cleanCompleted(olderThanDays = 7) {
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const result = await this.db.prepare("DELETE FROM taskQueue WHERE status = 'completed' AND updatedAt < ?").bind(cutoffDate.toISOString()).run();
    return result.meta.changes;
  }
};

// src/handlers/d1/index.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/handlers/d1/campaign.repo.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/utils/crypto.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function generateClickId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1e3);
  return `${TRACKING.CLICK_ID_PREFIX}${timestamp}${random.toString().padStart(3, "0")}`;
}
__name(generateClickId, "generateClickId");
function generateConversionId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1e3);
  return `${TRACKING.CONVERSION_ID_PREFIX}${timestamp}${random.toString().padStart(3, "0")}`;
}
__name(generateConversionId, "generateConversionId");
function generateVisitorId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1e3);
  return `${TRACKING.VISITOR_ID_PREFIX}${timestamp}${random.toString().padStart(3, "0")}`;
}
__name(generateVisitorId, "generateVisitorId");
function generateApiToken() {
  return crypto.randomUUID();
}
__name(generateApiToken, "generateApiToken");

// src/services/id.service.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var ID_PREFIXES = {
  campaigns: "c",
  flows: "f",
  landingPages: "lp",
  offers: "o",
  trafficSources: "ts",
  affiliateNetworks: "an",
  rules: "r"
};
var IdService = class _IdService {
  static {
    __name(this, "IdService");
  }
  db;
  constructor(db) {
    this.db = db;
  }
  /**
   * 生成下一个带前缀的 ID
   * @param tableName 表名
   * @returns 带前缀的 ID，如 "c1", "o50"
   */
  async generateId(tableName) {
    const prefix = ID_PREFIXES[tableName];
    if (!prefix) {
      throw new Error(`Unknown table name: ${tableName}`);
    }
    const nextNumber = await this.getNextNumber(tableName);
    return `${prefix}${nextNumber}`;
  }
  /**
   * 获取下一个序号
   * 使用数据库事务确保原子性
   */
  async getNextNumber(tableName) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const counter = await this.db.prepare("SELECT currentNumber FROM idCounters WHERE tableName = ?").bind(tableName).first();
    if (counter) {
      const newNumber = counter.currentNumber + 1;
      await this.db.prepare("UPDATE idCounters SET currentNumber = ?, updatedAt = ? WHERE tableName = ?").bind(newNumber, now, tableName).run();
      return newNumber;
    } else {
      await this.db.prepare("INSERT INTO idCounters (tableName, currentNumber, createdAt, updatedAt) VALUES (?, 1, ?, ?)").bind(tableName, now, now).run();
      return 1;
    }
  }
  /**
   * 批量生成 ID（用于数据迁移）
   * @param tableName 表名
   * @param count 数量
   * @returns ID 数组
   */
  async generateBatch(tableName, count3) {
    const prefix = ID_PREFIXES[tableName];
    if (!prefix) {
      throw new Error(`Unknown table name: ${tableName}`);
    }
    const ids = [];
    for (let i = 0; i < count3; i++) {
      const id = await this.generateId(tableName);
      ids.push(id);
    }
    return ids;
  }
  /**
   * 解析 ID 获取表名
   * @param displayId 带前缀的 ID
   * @returns 表名或 null
   */
  static getTableNameFromId(displayId) {
    if (!displayId || displayId.length < 2) return null;
    if (displayId.startsWith("lp")) return "landingPages";
    if (displayId.startsWith("ts")) return "trafficSources";
    if (displayId.startsWith("an")) return "affiliateNetworks";
    if (displayId.startsWith("clk")) return "clicks";
    if (displayId.startsWith("conv")) return "conversions";
    const prefix = displayId[0];
    switch (prefix) {
      case "c":
        return "campaigns";
      case "f":
        return "flows";
      case "o":
        return "offers";
      case "r":
        return "rules";
      default:
        return null;
    }
  }
  /**
   * 验证 ID 格式
   * @param displayId 带前缀的 ID
   * @param expectedTable 期望的表名
   * @returns 是否有效
   */
  static validateId(displayId, expectedTable) {
    const tableName = _IdService.getTableNameFromId(displayId);
    return tableName === expectedTable;
  }
};

// src/handlers/d1/campaign.repo.ts
var CampaignRepository = class extends BaseRepository {
  static {
    __name(this, "CampaignRepository");
  }
  idService;
  constructor(db) {
    super(db, "campaigns");
    this.idService = new IdService(db);
  }
  transform(row) {
    return {
      ...row,
      id: row.displayId || row.id,
      parameters: row.parameters ? JSON.parse(row.parameters) : {}
    };
  }
  async findByDisplayId(displayId) {
    const result = await this.db.prepare(`SELECT * FROM campaigns WHERE displayId = ?`).bind(displayId).first();
    if (!result) return null;
    return this.transform(result);
  }
  async findByApiToken(apiToken) {
    const result = await this.db.prepare(`SELECT * FROM campaigns WHERE apiToken = ? LIMIT 1`).bind(apiToken).first();
    if (!result) return null;
    return this.transform(result);
  }
  /**
   * 重新生成 apiToken
   */
  async regenerateApiToken(id) {
    const apiToken = generateApiToken();
    await this.db.prepare(`UPDATE campaigns SET apiToken = ?, updatedAt = ? WHERE id = ?`).bind(apiToken, (/* @__PURE__ */ new Date()).toISOString(), id).run();
    return apiToken;
  }
  /**
   * 创建 Campaign
   */
  async create(data) {
    const displayId = await this.idService.generateId("campaigns");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const apiToken = generateApiToken();
    const parameters = data.parameters ? JSON.stringify(data.parameters) : "{}";
    await this.db.prepare(`
        INSERT INTO campaigns (
          id, displayId, name, alias, domain, "group", trafficSource, 
          flowRotation, costModel, costValue, currency, trafficLoss, 
          uniquenessMethod, uniquenessParameter, uniquenessTTL, 
          visitorBinding, apiToken, parameters, status, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
      displayId,
      displayId,
      data.name,
      data.alias,
      data.domain,
      data.group || null,
      data.trafficSource || null,
      data.flowRotation || "position",
      data.costModel || "cpc",
      data.costValue || 0,
      data.currency || "USD",
      data.trafficLoss || 0,
      data.uniquenessMethod || "none",
      data.uniquenessParameter || null,
      data.uniquenessTTL || 86400,
      data.visitorBinding || "none",
      apiToken,
      parameters,
      "active",
      now,
      now
    ).run();
    const campaign = await this.findById(displayId);
    return campaign;
  }
  /**
   * 更新 Campaign
   */
  async update(id, data) {
    const fields = [];
    const values = [];
    if (data.name !== void 0) {
      fields.push("name = ?");
      values.push(data.name);
    }
    if (data.alias !== void 0) {
      fields.push("alias = ?");
      values.push(data.alias);
    }
    if (data.domain !== void 0) {
      fields.push("domain = ?");
      values.push(data.domain);
    }
    if (data.group !== void 0) {
      fields.push('"group" = ?');
      values.push(data.group);
    }
    if (data.trafficSource !== void 0) {
      fields.push("trafficSource = ?");
      values.push(data.trafficSource);
    }
    if (data.flowRotation !== void 0) {
      fields.push("flowRotation = ?");
      values.push(data.flowRotation);
    }
    if (data.costModel !== void 0) {
      fields.push("costModel = ?");
      values.push(data.costModel);
    }
    if (data.costValue !== void 0) {
      fields.push("costValue = ?");
      values.push(data.costValue);
    }
    if (data.currency !== void 0) {
      fields.push("currency = ?");
      values.push(data.currency);
    }
    if (data.trafficLoss !== void 0) {
      fields.push("trafficLoss = ?");
      values.push(data.trafficLoss);
    }
    if (data.uniquenessMethod !== void 0) {
      fields.push("uniquenessMethod = ?");
      values.push(data.uniquenessMethod);
    }
    if (data.uniquenessParameter !== void 0) {
      fields.push("uniquenessParameter = ?");
      values.push(data.uniquenessParameter);
    }
    if (data.uniquenessTTL !== void 0) {
      fields.push("uniquenessTTL = ?");
      values.push(data.uniquenessTTL);
    }
    if (data.visitorBinding !== void 0) {
      fields.push("visitorBinding = ?");
      values.push(data.visitorBinding);
    }
    if (data.parameters !== void 0) {
      fields.push("parameters = ?");
      values.push(JSON.stringify(data.parameters));
    }
    if (data.status !== void 0) {
      fields.push("status = ?");
      values.push(data.status);
    }
    if (fields.length === 0) {
      return this.findById(id);
    }
    fields.push("updatedAt = ?");
    values.push((/* @__PURE__ */ new Date()).toISOString());
    values.push(id);
    await this.db.prepare(`UPDATE campaigns SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    return this.findById(id);
  }
  /**
   * 按 alias 查询
   */
  async findByAlias(alias) {
    return this.findOneBy("alias", alias);
  }
  /**
   * 按 status 查询列表
   */
  async findByStatus(status, limit = 100, offset = 0) {
    const result = await this.db.prepare(`SELECT * FROM campaigns WHERE status = ? LIMIT ? OFFSET ?`).bind(status, limit, offset).all();
    return result.results.map(this.transform.bind(this)) || [];
  }
  /**
   * 查询列表（支持搜索和过滤）
   */
  async findList(query) {
    const { page = 1, pageSize = 20, status, search } = query;
    const offset = (page - 1) * pageSize;
    let countSql = "SELECT COUNT(*) as count FROM campaigns WHERE 1=1";
    let listSql = "SELECT * FROM campaigns WHERE 1=1";
    const params = [];
    const countParams = [];
    if (status) {
      countSql += " AND status = ?";
      listSql += " AND status = ?";
      params.push(status);
      countParams.push(status);
    }
    if (search) {
      countSql += " AND (name LIKE ? OR alias LIKE ?)";
      listSql += " AND (name LIKE ? OR alias LIKE ?)";
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
      countParams.push(searchPattern, searchPattern);
    }
    listSql += " ORDER BY createdAt DESC LIMIT ? OFFSET ?";
    params.push(pageSize, offset);
    const [countResult, listResult] = await Promise.all([
      this.db.prepare(countSql).bind(...countParams).first(),
      this.db.prepare(listSql).bind(...params).all()
    ]);
    return {
      list: listResult.results.map(this.transform.bind(this)) || [],
      total: countResult?.count || 0
    };
  }
  /**
   * 检查 alias 是否已存在
   */
  async aliasExists(alias, excludeId) {
    let sql = "SELECT 1 FROM campaigns WHERE alias = ?";
    const params = [alias];
    if (excludeId) {
      sql += " AND id != ?";
      params.push(excludeId);
    }
    const result = await this.db.prepare(sql).bind(...params).first();
    return result !== null;
  }
};

// src/handlers/d1/flow.repo.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var FlowRepository = class extends BaseRepository {
  static {
    __name(this, "FlowRepository");
  }
  idService;
  constructor(db) {
    super(db, "flows");
    this.idService = new IdService(db);
  }
  transform(row) {
    let filters = row.filters;
    if (typeof filters === "string") {
      try {
        filters = JSON.parse(filters);
      } catch {
        filters = [];
      }
    }
    if (!Array.isArray(filters)) {
      filters = [];
    }
    return {
      ...row,
      id: row.id,
      filters,
      actionConfig: typeof row.actionConfig === "string" ? JSON.parse(row.actionConfig) : row.actionConfig || {}
    };
  }
  async findByDisplayId(displayId) {
    const result = await this.db.prepare(`SELECT * FROM flows WHERE displayId = ?`).bind(displayId).first();
    if (!result) return null;
    return this.transform(result);
  }
  /**
   * 创建 Flow
   */
  async create(data) {
    const displayId = await this.idService.generateId("flows");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const actionType = data.actionType || "redirect";
    const actionConfig = data.actionConfig ? JSON.stringify(data.actionConfig) : "{}";
    await this.db.prepare(`
        INSERT INTO flows (id, displayId, campaignId, name, type, weight, status, actionType, actionConfig, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(displayId, displayId, data.campaignId, data.name, data.type || "regular", data.weight || 100, "active", actionType, actionConfig, now, now).run();
    const flow = await this.findById(displayId);
    return flow;
  }
  /**
   * 更新 Flow
   */
  async update(id, data) {
    const fields = [];
    const values = [];
    if (data.name !== void 0) {
      fields.push("name = ?");
      values.push(data.name);
    }
    if (data.type !== void 0) {
      fields.push("type = ?");
      values.push(data.type);
    }
    if (data.weight !== void 0) {
      fields.push("weight = ?");
      values.push(data.weight);
    }
    if (data.status !== void 0) {
      fields.push("status = ?");
      values.push(data.status);
    }
    if (data.filters !== void 0) {
      fields.push("filters = ?");
      values.push(JSON.stringify(data.filters));
    }
    if (data.actionType !== void 0) {
      fields.push("actionType = ?");
      values.push(data.actionType);
    }
    if (data.actionConfig !== void 0) {
      fields.push("actionConfig = ?");
      values.push(JSON.stringify(data.actionConfig));
    }
    if (fields.length === 0) {
      return this.findById(id);
    }
    fields.push("updatedAt = ?");
    values.push((/* @__PURE__ */ new Date()).toISOString());
    values.push(id);
    await this.db.prepare(`UPDATE flows SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    return this.findById(id);
  }
  /**
   * 按 Campaign ID 查询
   */
  async findByCampaignId(campaignId) {
    return this.findBy("campaignId", campaignId);
  }
  /**
   * 按 Campaign ID 和 Status 查询
   * 支持 UUID 和短 ID 格式
   */
  async findByCampaignIdAndStatus(campaignId, status) {
    const result = await this.db.prepare("SELECT * FROM flows WHERE (campaignId = ? OR campaignId IN (SELECT id FROM campaigns WHERE displayId = ?)) AND status = ?").bind(campaignId, campaignId, status).all();
    const rows = result.results || [];
    return rows.map((row) => this.transform(row));
  }
  /**
   * 添加 Landing Page 到 Flow
   */
  async addLandingPage(flowId, landingPageId, weight = 100) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const result = await this.db.prepare(`
        INSERT INTO flowLandingPages (flowId, landingPageId, weight, createdAt)
        VALUES (?, ?, ?, ?)
      `).bind(flowId, landingPageId, weight, now).run();
    return {
      id: String(result.meta.last_row_id),
      flowId,
      landingPageId,
      weight,
      createdAt: now
    };
  }
  /**
   * 添加 Offer 到 Flow
   */
  async addOffer(flowId, offerId, weight = 100) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const result = await this.db.prepare(`
        INSERT INTO flowOffers (flowId, offerId, weight, createdAt)
        VALUES (?, ?, ?, ?)
      `).bind(flowId, offerId, weight, now).run();
    return {
      id: String(result.meta.last_row_id),
      flowId,
      offerId,
      weight,
      createdAt: now
    };
  }
  /**
   * 获取 Flow 的 Landing Pages
   */
  async getLandingPages(flowId) {
    const result = await this.db.prepare("SELECT * FROM flowLandingPages WHERE flowId = ?").bind(flowId).all();
    return result.results || [];
  }
  /**
   * 获取 Flow 的 Offers
   */
  async getOffers(flowId) {
    const result = await this.db.prepare("SELECT * FROM flowOffers WHERE flowId = ?").bind(flowId).all();
    return result.results || [];
  }
  /**
   * 移除 Flow 的 Landing Page
   */
  async removeLandingPage(flowId, landingPageId) {
    const result = await this.db.prepare("DELETE FROM flowLandingPages WHERE flowId = ? AND landingPageId = ?").bind(flowId, landingPageId).run();
    return result.success;
  }
  /**
   * 移除 Flow 的 Offer
   */
  async removeOffer(flowId, offerId) {
    const result = await this.db.prepare("DELETE FROM flowOffers WHERE flowId = ? AND offerId = ?").bind(flowId, offerId).run();
    return result.success;
  }
  // ==================== Flow Rules ====================
  /**
   * 创建 Flow 规则
   */
  async createFlowRule(data) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const priority = data.priority ?? 0;
    const conditionJson = JSON.stringify(data.condition);
    const actionJson = JSON.stringify(data.action);
    await this.db.prepare(`
        INSERT INTO flowRules (id, flowId, name, description, priority, condition, action, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
      data.flowId,
      data.flowId,
      data.name,
      data.description || null,
      priority,
      conditionJson,
      actionJson,
      "active",
      now,
      now
    ).run();
    const rule = await this.getFlowRuleById(data.flowId);
    return rule;
  }
  /**
   * 获取 Flow 规则详情
   */
  async getFlowRuleById(id) {
    const result = await this.db.prepare("SELECT * FROM flowRules WHERE id = ?").bind(id).first();
    if (!result) {
      return null;
    }
    return this.parseFlowRule(result);
  }
  /**
   * 获取 Flow 的所有规则
   */
  async getFlowRules(flowId) {
    const result = await this.db.prepare("SELECT * FROM flowRules WHERE flowId = ? ORDER BY priority ASC, createdAt ASC").bind(flowId).all();
    if (!result.results) {
      return [];
    }
    return result.results.map((r) => this.parseFlowRule(r));
  }
  /**
   * 更新 Flow 规则
   */
  async updateFlowRule(id, data) {
    const fields = [];
    const values = [];
    if (data.name !== void 0) {
      fields.push("name = ?");
      values.push(data.name);
    }
    if (data.description !== void 0) {
      fields.push("description = ?");
      values.push(data.description);
    }
    if (data.priority !== void 0) {
      fields.push("priority = ?");
      values.push(data.priority);
    }
    if (data.condition !== void 0) {
      fields.push("condition = ?");
      values.push(JSON.stringify(data.condition));
    }
    if (data.action !== void 0) {
      fields.push("action = ?");
      values.push(JSON.stringify(data.action));
    }
    if (data.status !== void 0) {
      fields.push("status = ?");
      values.push(data.status);
    }
    if (fields.length === 0) {
      return this.getFlowRuleById(id);
    }
    fields.push("updatedAt = ?");
    values.push((/* @__PURE__ */ new Date()).toISOString());
    values.push(id);
    await this.db.prepare(`UPDATE flowRules SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    return this.getFlowRuleById(id);
  }
  /**
   * 删除 Flow 规则（软删除）
   */
  async deleteFlowRule(id) {
    const result = await this.db.prepare("UPDATE flowRules SET status = 'deleted' WHERE id = ?").bind(id).run();
    return result.success;
  }
  /**
   * 解析 FlowRule 数据库记录
   */
  parseFlowRule(row) {
    return {
      id: row.id,
      flowId: row.flowId,
      name: row.name,
      description: row.description,
      priority: row.priority,
      condition: JSON.parse(row.condition),
      action: JSON.parse(row.action),
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
  // ==================== Flow Statistics ====================
  /**
   * 获取 Flow 统计数据
   */
  async getFlowStats(flowId, query) {
    const flow = await this.findById(flowId);
    if (!flow) return null;
    let whereClause = "WHERE c.flowId = ?";
    const params = [flowId];
    if (query?.startDate) {
      whereClause += " AND c.timestamp >= ?";
      params.push(query.startDate);
    }
    if (query?.endDate) {
      whereClause += " AND c.timestamp <= ?";
      params.push(query.endDate);
    }
    const clickStats = await this.db.prepare(`
        SELECT 
          COUNT(*) as clicks,
          SUM(CASE WHEN c.isUnique = 1 THEN 1 ELSE 0 END) as uniqueClicks
        FROM clicks c
        ${whereClause}
      `).bind(...params).first();
    const conversionStats = await this.db.prepare(`
        SELECT 
          COUNT(cv.id) as conversions,
          COALESCE(SUM(cv.revenue), 0) as revenue
        FROM clicks c
        LEFT JOIN conversions cv ON c.clickId = cv.clickId
        ${whereClause}
      `).bind(...params).first();
    const costStats = await this.db.prepare(`
        SELECT COALESCE(SUM(c.cost), 0) as cost
        FROM clicks c
        ${whereClause}
      `).bind(...params).first();
    const clicks = clickStats?.clicks || 0;
    const uniqueClicks = clickStats?.uniqueClicks || 0;
    const conversions = conversionStats?.conversions || 0;
    const revenue = conversionStats?.revenue || 0;
    const cost = costStats?.cost || 0;
    const profit = revenue - cost;
    const conversionRate = clicks > 0 ? conversions / clicks * 100 : 0;
    const epc = clicks > 0 ? revenue / clicks : 0;
    return {
      flowId: flow.id,
      flowName: flow.name,
      flowType: flow.type,
      clicks,
      uniqueClicks,
      bots: 0,
      conversions,
      revenue,
      cost,
      profit,
      conversionRate: Math.round(conversionRate * 100) / 100,
      epc: Math.round(epc * 100) / 100,
      ctr: 0
    };
  }
  /**
   * 获取 Campaign 下所有 Flow 的统计数据
   */
  async getCampaignFlowStats(campaignId, query) {
    const flows = await this.findByCampaignId(campaignId);
    const stats = [];
    for (const flow of flows) {
      if (flow.status === "deleted") continue;
      const flowStats = await this.getFlowStats(flow.id, query);
      if (flowStats) {
        stats.push(flowStats);
      }
    }
    return stats;
  }
};

// src/handlers/d1/landingPage.repo.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var LandingPageRepository = class extends BaseRepository {
  static {
    __name(this, "LandingPageRepository");
  }
  idService;
  constructor(db) {
    super(db, "landingPages");
    this.idService = new IdService(db);
  }
  transform(row) {
    return {
      ...row,
      id: row.displayId || row.id
    };
  }
  async findByDisplayId(displayId) {
    const result = await this.db.prepare(`SELECT * FROM landingPages WHERE displayId = ?`).bind(displayId).first();
    if (!result) return null;
    return this.transform(result);
  }
  /**
   * 创建 Landing Page
   */
  async create(data) {
    const displayId = await this.idService.generateId("landingPages");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await this.db.prepare(`
        INSERT INTO landingPages (id, displayId, name, url, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(displayId, displayId, data.name, data.url, "active", now, now).run();
    const lp = await this.findById(displayId);
    return lp;
  }
  /**
   * 更新 Landing Page
   */
  async update(id, data) {
    const fields = [];
    const values = [];
    if (data.name !== void 0) {
      fields.push("name = ?");
      values.push(data.name);
    }
    if (data.url !== void 0) {
      fields.push("url = ?");
      values.push(data.url);
    }
    if (data.status !== void 0) {
      fields.push("status = ?");
      values.push(data.status);
    }
    if (data.group !== void 0) {
      fields.push('"group" = ?');
      values.push(data.group);
    }
    if (fields.length === 0) {
      return this.findById(id);
    }
    fields.push("updatedAt = ?");
    values.push((/* @__PURE__ */ new Date()).toISOString());
    values.push(id);
    await this.db.prepare(`UPDATE landingPages SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    return this.findById(id);
  }
  /**
   * 按状态查询
   */
  async findByStatus(status) {
    return this.findBy("status", status);
  }
  /**
   * 检查 URL 是否已存在
   */
  async urlExists(url, excludeId) {
    let sql = "SELECT 1 FROM landingPages WHERE url = ?";
    const params = [url];
    if (excludeId) {
      sql += " AND id != ?";
      params.push(excludeId);
    }
    const result = await this.db.prepare(sql).bind(...params).first();
    return result !== null;
  }
  /**
   * 获取关联的 Campaign 数量
   */
  async getCampaignCount(landingPageId) {
    const result = await this.db.prepare(`
        SELECT COUNT(DISTINCT f.campaignId) as count
        FROM flowLandingPages flp
        JOIN flows f ON flp.flowId = f.id
        WHERE flp.landingPageId = ?
      `).bind(landingPageId).first();
    return result?.count || 0;
  }
  /**
   * 获取 Landing Page 统计数据 (clicks, conversions)
   */
  async getStats(landingPageId) {
    const result = await this.db.prepare(`
        SELECT 
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(conversions), 0) as conversions
        FROM trafficSummary
        WHERE landingPageId = ?
      `).bind(landingPageId).first();
    return {
      clicks: result?.clicks || 0,
      conversions: result?.conversions || 0
    };
  }
};

// src/handlers/d1/offer.repo.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var OfferRepository = class extends BaseRepository {
  static {
    __name(this, "OfferRepository");
  }
  idService;
  constructor(db) {
    super(db, "offers");
    this.idService = new IdService(db);
  }
  transform(row) {
    return {
      ...row,
      id: row.displayId || row.id
    };
  }
  getExcludedStatusesCondition() {
    return "status != 'deleted'";
  }
  async findAll(limit = 100, offset = 0) {
    const excluded = this.getExcludedStatusesCondition();
    const result = await this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${excluded} LIMIT ? OFFSET ?`).bind(limit, offset).all();
    return result.results.map(this.transform.bind(this)) || [];
  }
  async findBy(field, value) {
    const excluded = this.getExcludedStatusesCondition();
    const result = await this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${excluded} AND ${field} = ?`).bind(value).all();
    return result.results.map(this.transform.bind(this)) || [];
  }
  async findOneBy(field, value) {
    const excluded = this.getExcludedStatusesCondition();
    const result = await this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${excluded} AND ${field} = ? LIMIT 1`).bind(value).first();
    if (!result) return null;
    return this.transform(result);
  }
  async count(conditions, params) {
    const excluded = this.getExcludedStatusesCondition();
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${excluded}`;
    if (conditions) {
      sql += ` AND ${conditions}`;
    }
    const stmt = this.db.prepare(sql);
    const bound = params ? stmt.bind(...params) : stmt;
    const result = await bound.first();
    return result?.count || 0;
  }
  async exists(id) {
    const excluded = this.getExcludedStatusesCondition();
    const result = await this.db.prepare(`SELECT 1 FROM ${this.tableName} WHERE ${excluded} AND id = ? LIMIT 1`).bind(id).first();
    return result !== null;
  }
  async findByDisplayId(displayId) {
    const result = await this.db.prepare(`SELECT * FROM offers WHERE displayId = ?`).bind(displayId).first();
    if (!result) return null;
    return this.transform(result);
  }
  /**
   * 创建 Offer
   */
  async create(data) {
    const displayId = await this.idService.generateId("offers");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await this.db.prepare(`
        INSERT INTO offers (id, displayId, name, url, payout, currency, payoutType, redirectType, network, "group", status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
      displayId,
      displayId,
      data.name,
      data.url,
      data.payout || 0,
      data.currency || "USD",
      data.payoutType || "fixed",
      data.redirectType || "http",
      data.network || "",
      data.group || "",
      "active",
      now,
      now
    ).run();
    const offer = await this.findById(displayId);
    return offer;
  }
  /**
   * 更新 Offer
   */
  async update(id, data) {
    const fields = [];
    const values = [];
    if (data.name !== void 0) {
      fields.push("name = ?");
      values.push(data.name);
    }
    if (data.url !== void 0) {
      fields.push("url = ?");
      values.push(data.url);
    }
    if (data.payout !== void 0) {
      fields.push("payout = ?");
      values.push(data.payout);
    }
    if (data.currency !== void 0) {
      fields.push("currency = ?");
      values.push(data.currency);
    }
    if (data.payoutType !== void 0) {
      fields.push("payoutType = ?");
      values.push(data.payoutType);
    }
    if (data.redirectType !== void 0) {
      fields.push("redirectType = ?");
      values.push(data.redirectType);
    }
    if (data.network !== void 0) {
      fields.push("network = ?");
      values.push(data.network);
    }
    if (data.group !== void 0) {
      fields.push('"group" = ?');
      values.push(data.group);
    }
    if (data.status !== void 0) {
      fields.push("status = ?");
      values.push(data.status);
    }
    if (fields.length === 0) {
      return this.findById(id);
    }
    fields.push("updatedAt = ?");
    values.push((/* @__PURE__ */ new Date()).toISOString());
    values.push(id);
    await this.db.prepare(`UPDATE offers SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    return this.findById(id);
  }
  /**
   * 按状态查询
   */
  async findByStatus(status) {
    return this.findBy("status", status);
  }
  /**
   * 检查 URL 是否已存在
   */
  async urlExists(url, excludeId) {
    let sql = "SELECT 1 FROM offers WHERE url = ?";
    const params = [url];
    if (excludeId) {
      sql += " AND id != ?";
      params.push(excludeId);
    }
    const result = await this.db.prepare(sql).bind(...params).first();
    return result !== null;
  }
  /**
   * 获取关联的 Campaign 数量
   */
  async getCampaignCount(offerId) {
    const result = await this.db.prepare(`
        SELECT COUNT(DISTINCT f.campaignId) as count
        FROM flowOffers fo
        JOIN flows f ON fo.flowId = f.id
        WHERE fo.offerId = ?
      `).bind(offerId).first();
    return result?.count || 0;
  }
  /**
   * 获取 Offer 统计数据 (clicks, conversions, revenue)
   */
  async getStats(offerId) {
    const result = await this.db.prepare(`
        SELECT 
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(conversions), 0) as conversions,
          COALESCE(SUM(revenue), 0) as revenue
        FROM trafficSummary
        WHERE offerId = ?
      `).bind(offerId).first();
    return {
      clicks: result?.clicks || 0,
      conversions: result?.conversions || 0,
      revenue: result?.revenue || 0
    };
  }
};

// src/handlers/d1/rule.repo.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var RuleRepository = class extends BaseRepository {
  static {
    __name(this, "RuleRepository");
  }
  idService;
  constructor(db) {
    super(db, "rules");
    this.idService = new IdService(db);
  }
  transform(row) {
    return {
      ...row,
      id: row.displayId || row.id,
      conditions: typeof row.conditions === "string" ? JSON.parse(row.conditions) : row.conditions,
      actions: typeof row.actions === "string" ? JSON.parse(row.actions) : row.actions,
      enabled: Number(row.enabled) === 1 || row.enabled === true
    };
  }
  async findByDisplayId(displayId) {
    const result = await this.db.prepare(`SELECT * FROM rules WHERE displayId = ?`).bind(displayId).first();
    if (!result) return null;
    return this.transform(result);
  }
  /**
   * 创建 Rule
   */
  async create(data) {
    const displayId = await this.idService.generateId("rules");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await this.db.prepare(`
        INSERT INTO rules (id, displayId, name, description, type, conditions, actions, priority, enabled, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
      displayId,
      displayId,
      data.name,
      data.description || null,
      data.type,
      JSON.stringify(data.conditions),
      JSON.stringify(data.actions),
      data.priority || 0,
      data.enabled ? 1 : 0,
      "active",
      now,
      now
    ).run();
    const rule = await this.findById(displayId);
    return rule;
  }
  async update(id, data) {
    const fields = [];
    const values = [];
    if (data.name !== void 0) {
      fields.push("name = ?");
      values.push(data.name);
    }
    if (data.description !== void 0) {
      fields.push("description = ?");
      values.push(data.description);
    }
    if (data.type !== void 0) {
      fields.push("type = ?");
      values.push(data.type);
    }
    if (data.conditions !== void 0) {
      fields.push("conditions = ?");
      values.push(JSON.stringify(data.conditions));
    }
    if (data.actions !== void 0) {
      fields.push("actions = ?");
      values.push(JSON.stringify(data.actions));
    }
    if (data.priority !== void 0) {
      fields.push("priority = ?");
      values.push(data.priority);
    }
    if (data.enabled !== void 0) {
      fields.push("enabled = ?");
      values.push(data.enabled ? 1 : 0);
    }
    if (data.status !== void 0) {
      fields.push("status = ?");
      values.push(data.status);
    }
    if (fields.length === 0) {
      return this.findById(id);
    }
    fields.push("updatedAt = ?");
    values.push((/* @__PURE__ */ new Date()).toISOString());
    values.push(id);
    await this.db.prepare(`UPDATE rules SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    return this.findById(id);
  }
  async findEnabled() {
    const result = await this.db.prepare("SELECT * FROM rules WHERE enabled = 1 AND status = ? ORDER BY priority DESC").bind("active").all();
    return result.results.map(this.transform.bind(this));
  }
  async findByType(type) {
    const result = await this.db.prepare("SELECT * FROM rules WHERE type = ? AND status = ? ORDER BY priority DESC").bind(type, "active").all();
    return result.results.map(this.transform.bind(this));
  }
  /**
   * 记录规则执行日志
   */
  async logExecution(log4) {
    const id = crypto.randomUUID();
    await this.db.prepare(`
        INSERT INTO ruleExecutions (id, ruleId, campaignId, timestamp, conditions, actions, executionResult, triggeredBy)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
      id,
      log4.ruleId,
      log4.campaignId,
      log4.timestamp,
      JSON.stringify(log4.conditions),
      JSON.stringify(log4.actions),
      JSON.stringify(log4.executionResult),
      JSON.stringify(log4.triggeredBy)
    ).run();
    return { id, ...log4 };
  }
  /**
   * 获取规则执行历史
   */
  async getExecutionHistory(ruleId, limit = 50) {
    const result = await this.db.prepare("SELECT * FROM ruleExecutions WHERE ruleId = ? ORDER BY timestamp DESC LIMIT ?").bind(ruleId, limit).all();
    return (result.results || []).map((row) => ({
      id: row.id,
      ruleId: row.ruleId,
      campaignId: row.campaignId,
      timestamp: row.timestamp,
      conditions: JSON.parse(row.conditions),
      actions: JSON.parse(row.actions),
      executionResult: JSON.parse(row.executionResult),
      triggeredBy: JSON.parse(row.triggeredBy)
    }));
  }
  async findList(query) {
    const { page = 1, pageSize = 20, type, status } = query;
    const offset = (page - 1) * pageSize;
    let countSql = "SELECT COUNT(*) as count FROM rules WHERE 1=1";
    let listSql = "SELECT * FROM rules WHERE 1=1";
    const params = [];
    const countParams = [];
    if (status) {
      countSql += " AND status = ?";
      listSql += " AND status = ?";
      params.push(status);
      countParams.push(status);
    }
    if (type) {
      countSql += " AND type = ?";
      listSql += " AND type = ?";
      params.push(type);
      countParams.push(type);
    }
    listSql += " ORDER BY priority DESC, createdAt DESC LIMIT ? OFFSET ?";
    params.push(pageSize, offset);
    const [countResult, listResult] = await Promise.all([
      this.db.prepare(countSql).bind(...countParams).first(),
      this.db.prepare(listSql).bind(...params).all()
    ]);
    return {
      list: listResult.results.map(this.transform.bind(this)),
      total: countResult?.count || 0
    };
  }
};

// src/handlers/d1/traffic.repo.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var TrafficRepository = class extends BaseRepository {
  static {
    __name(this, "TrafficRepository");
  }
  constructor(db) {
    super(db, "trafficSummary");
  }
  /**
   * 插入或更新流量汇总
   */
  async upsertSummary(data) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await this.db.prepare(`
        INSERT INTO trafficSummary (
          campaignId, date, impressions, clicks, conversions, spend, revenue,
          country, device, browser, offerId, flowId, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(campaignId, date, country, device, browser, offerId, flowId) 
        DO UPDATE SET 
          impressions = impressions + ?,
          clicks = clicks + ?,
          conversions = conversions + ?,
          spend = spend + ?,
          revenue = revenue + ?
      `).bind(
      data.campaignId,
      data.date,
      data.impressions || 0,
      data.clicks || 0,
      data.conversions || 0,
      data.spend || 0,
      data.revenue || 0,
      data.country || null,
      data.device || null,
      data.browser || null,
      data.offerId || null,
      data.flowId || null,
      now,
      data.impressions || 0,
      data.clicks || 0,
      data.conversions || 0,
      data.spend || 0,
      data.revenue || 0
    ).run();
  }
  /**
   * 获取 Campaign 的流量指标
   */
  async getCampaignMetrics(campaignId, startDate, endDate) {
    const result = await this.db.prepare(`
        SELECT 
          COALESCE(SUM(impressions), 0) as impressions,
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(conversions), 0) as conversions,
          COALESCE(SUM(spend), 0) as spend,
          COALESCE(SUM(revenue), 0) as revenue
        FROM trafficSummary
        WHERE campaignId = ? AND date >= ? AND date <= ?
      `).bind(campaignId, startDate, endDate).first();
    const data = result || { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 };
    return this.calculateMetrics(data);
  }
  /**
   * 按维度获取统计数据
   */
  async getStatsByDimension(campaignId, dimension, startDate, endDate, limit = 20) {
    const validDimensions = ["country", "device", "browser", "offerId", "flowId"];
    if (!validDimensions.includes(dimension)) {
      throw new Error(`Invalid dimension: ${dimension}`);
    }
    const result = await this.db.prepare(`
        SELECT 
          ${dimension},
          SUM(impressions) as impressions,
          SUM(clicks) as clicks,
          SUM(conversions) as conversions,
          SUM(spend) as spend,
          SUM(revenue) as revenue
        FROM trafficSummary
        WHERE campaignId = ? AND date >= ? AND date <= ?
        GROUP BY ${dimension}
        ORDER BY clicks DESC
        LIMIT ?
      `).bind(campaignId, startDate, endDate, limit).all();
    return result.results || [];
  }
  /**
   * 获取Flow性能统计
   */
  async getFlowStats(campaignId, startDate, endDate) {
    const result = await this.db.prepare(`
        SELECT 
          flowId,
          SUM(impressions) as impressions,
          SUM(clicks) as clicks,
          SUM(conversions) as conversions,
          SUM(spend) as spend,
          SUM(revenue) as revenue
        FROM trafficSummary
        WHERE campaignId = ? AND date >= ? AND date <= ?
        GROUP BY flowId
        ORDER BY clicks DESC
      `).bind(campaignId, startDate, endDate).all();
    return result.results || [];
  }
  /**
   * 获取日期范围内的趋势数据
   */
  async getTrend(campaignId, startDate, endDate) {
    const result = await this.db.prepare(`
        SELECT 
          date,
          SUM(impressions) as impressions,
          SUM(clicks) as clicks,
          SUM(conversions) as conversions,
          SUM(spend) as spend,
          SUM(revenue) as revenue
        FROM trafficSummary
        WHERE campaignId = ? AND date >= ? AND date <= ?
        GROUP BY date
        ORDER BY date ASC
      `).bind(campaignId, startDate, endDate).all();
    return result.results || [];
  }
  /**
   * 获取系统总览
   */
  async getSystemOverview(startDate, endDate) {
    const result = await this.db.prepare(`
        SELECT 
          COUNT(DISTINCT campaignId) as activeCampaigns,
          COALESCE(SUM(impressions), 0) as impressions,
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(conversions), 0) as conversions,
          COALESCE(SUM(spend), 0) as spend,
          COALESCE(SUM(revenue), 0) as revenue
        FROM trafficSummary
        WHERE date >= ? AND date <= ?
      `).bind(startDate, endDate).first();
    const data = result || { activeCampaigns: 0, impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 };
    const metrics = this.calculateMetrics(data);
    return {
      ...metrics,
      activeCampaigns: data.activeCampaigns
    };
  }
  /**
   * 计算指标
   */
  calculateMetrics(data) {
    const impressions = Number(data.impressions) || 0;
    const clicks = Number(data.clicks) || 0;
    const conversions = Number(data.conversions) || 0;
    const spend = Number(data.spend) || 0;
    const revenue = Number(data.revenue) || 0;
    return {
      impressions,
      clicks,
      conversions,
      spend,
      revenue,
      ctr: impressions > 0 ? clicks / impressions * 100 : 0,
      cr: clicks > 0 ? conversions / clicks * 100 : 0,
      cpa: conversions > 0 ? spend / conversions : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      cpm: impressions > 0 ? spend / impressions * 1e3 : 0,
      roi: spend > 0 ? (revenue - spend) / spend : 0,
      epc: clicks > 0 ? revenue / clicks : 0
    };
  }
  /**
   * 获取仪表板统计数据
   */
  async getDashboardStats(range) {
    const dateRange = this.getDateRange(range);
    const result = await this.db.prepare(`
        SELECT 
          COALESCE(SUM(impressions), 0) as impressions,
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(conversions), 0) as conversions,
          COALESCE(SUM(spend), 0) as spend,
          COALESCE(SUM(revenue), 0) as revenue
        FROM trafficSummary
        WHERE date >= ? AND date <= ?
      `).bind(dateRange.start, dateRange.end).first();
    const data = result || { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 };
    const metrics = this.calculateMetrics(data);
    return [
      { key: "clicks", label: "Clicks", value: metrics.clicks.toLocaleString(), isPositive: true, format: "number" },
      { key: "unique_clicks_campaign", label: "Unique clicks (campaign)", value: metrics.clicks.toLocaleString(), isPositive: true, format: "number" },
      { key: "conversions", label: "Conversions", value: metrics.conversions.toLocaleString(), isPositive: true, format: "number" },
      { key: "spend", label: "Cost", value: `$${metrics.spend.toFixed(2)}`, isPositive: false, format: "currency" },
      { key: "revenue_confirmed", label: "Revenue (confirmed)", value: `$${metrics.revenue.toFixed(2)}`, isPositive: true, format: "currency" },
      { key: "profit_confirmed", label: "Profit/Loss (confirmed)", value: `$${(metrics.revenue - metrics.spend).toFixed(2)}`, isPositive: metrics.revenue - metrics.spend > 0, format: "currency" },
      { key: "roi_confirmed", label: "ROI (confirmed)", value: `${(metrics.roi * 100).toFixed(2)}%`, isPositive: metrics.roi > 0, format: "percentage" }
    ];
  }
  /**
   * 获取图表数据
   */
  async getChartData(range) {
    const dateRange = this.getDateRange(range);
    const result = await this.db.prepare(`
        SELECT 
          date,
          SUM(clicks) as clicks,
          SUM(conversions) as conversions,
          SUM(spend) as spend,
          SUM(revenue) as revenue
        FROM trafficSummary
        WHERE date >= ? AND date <= ?
        GROUP BY date
        ORDER BY date ASC
      `).bind(dateRange.start, dateRange.end).all();
    return result.results || [];
  }
  /**
   * 获取最近点击数据 - 从clicks表读取真实数据
   */
  async getRecentClicks(limit) {
    const result = await this.db.prepare(`
        SELECT 
          clickId,
          campaignId,
          flowId,
          landingPageId,
          offerId,
          timestamp,
          ip,
          userAgent,
          referer,
          country,
          city,
          device,
          browser,
          os,
          isp,
          connectionType,
          visitorId,
          subId1,
          subId2,
          subId3,
          cost,
          isUnique
        FROM clicks 
        ORDER BY timestamp DESC
        LIMIT ?
      `).bind(limit).all();
    const clicks = result.results || [];
    return clicks.map((item) => ({
      event_id: item.clickId,
      datetime: item.timestamp,
      campaign: item.campaignId,
      stream: item.flowId || "",
      landing: item.landingPageId || "",
      offer: item.offerId || "",
      source: "",
      ip: item.ip || "127.0.0.1",
      country: item.country || "",
      region: "",
      city: item.city || "",
      isp: item.isp || "",
      operator: "",
      device_type: item.device || "",
      device_model: "",
      os: item.os || "",
      os_version: "",
      browser: item.browser || "",
      browser_version: "",
      os_icon: "",
      browser_icon: "",
      connection_type: item.connectionType || "",
      proxy: "No",
      creative_id: "",
      external_id: "",
      ad_campaign_id: "",
      sub_id: "",
      sub1: item.subId1 || "",
      sub2: item.subId2 || "",
      sub3: item.subId3 || "",
      sub4: "",
      sub5: "",
      referrer: item.referer || "",
      referrer_domain: "",
      search_engine: "",
      keyword: "",
      destination: "",
      cost: item.cost ? `$${item.cost.toFixed(2)}` : "$0.00",
      bot: "No",
      unique_stream: item.isUnique ? "Yes" : "No",
      unique_campaign: item.isUnique ? "Yes" : "No",
      user_agent: item.userAgent || "",
      visitor_code: item.visitorId || ""
    }));
  }
  /**
   * 获取实体统计数据
   */
  async getEntityStats(entityType, range) {
    const dateRange = this.getDateRange(range);
    let fieldName = entityType;
    const fieldMap = {
      campaigns: "campaignId",
      landings: "landingPageId",
      offers: "offerId",
      sources: "campaignId",
      // 暂时使用 campaignId 作为流量源
      countries: "country",
      device_types: "device",
      os: "os",
      browsers: "browser"
    };
    if (fieldMap[entityType]) {
      fieldName = fieldMap[entityType];
    }
    const result = await this.db.prepare(`
        SELECT 
          ${fieldName} as name,
          SUM(impressions) as impressions,
          SUM(clicks) as clicks,
          SUM(conversions) as conversions,
          SUM(spend) as spend,
          SUM(revenue) as revenue
        FROM trafficSummary
        WHERE date >= ? AND date <= ? AND ${fieldName} IS NOT NULL
        GROUP BY ${fieldName}
        ORDER BY clicks DESC
        LIMIT 10
      `).bind(dateRange.start, dateRange.end).all();
    return result.results || [];
  }
  /**
   * 根据时间范围获取日期区间
   */
  getDateRange(range) {
    const now = /* @__PURE__ */ new Date();
    const end = now.toISOString().split("T")[0] || "";
    let start = end;
    switch (range) {
      case "today":
        start = end;
        break;
      case "yesterday":
        start = new Date(now.setDate(now.getDate() - 1)).toISOString().split("T")[0] || "";
        break;
      case "last7days":
        start = new Date(now.setDate(now.getDate() - 7)).toISOString().split("T")[0] || "";
        break;
      case "last30days":
        start = new Date(now.setDate(now.getDate() - 30)).toISOString().split("T")[0] || "";
        break;
      case "thismonth":
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0] || "";
        break;
      case "lastmonth":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0] || "";
        const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0] || "";
        return { start, end: lastDayOfLastMonth };
      default:
        start = end;
    }
    return { start, end };
  }
};

// src/handlers/d1/click.repo.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var ClickRepository = class extends BaseRepository {
  static {
    __name(this, "ClickRepository");
  }
  constructor(db) {
    super(db, "clicks");
  }
  /**
   * 保存点击记录到数据库
   */
  async saveClick(data) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    try {
      await this.db.prepare(`
          INSERT INTO clicks (
            id, clickId, campaignId, flowId, landingPageId, offerId,
            timestamp, ip, userAgent, referer, country, city,
            device, browser, os, isp, connectionType, visitorId,
            subId1, subId2, subId3, cost, isUnique, redirectUrl, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
        data.clickId,
        data.clickId,
        data.campaignId,
        data.flowId,
        data.landingPageId,
        data.offerId,
        data.timestamp,
        data.ip,
        data.userAgent,
        data.referer,
        data.country,
        data.city,
        data.device,
        data.browser,
        data.os,
        data.isp,
        data.connectionType,
        data.visitorId,
        data.subId1,
        data.subId2,
        data.subId3,
        data.cost,
        1,
        data.redirectUrl,
        now
      ).run();
    } catch (error4) {
      console.error("[ClickRepository] saveClick error:", error4);
      throw error4;
    }
  }
  // /**
  //  * 保存点击记录到数据库
  //  */
  // async saveClick(data: ClickData): Promise<void> {
  //   const now = new Date().toISOString();
  //
  //   try {
  //     await this.db
  //       .prepare(`
  //         INSERT INTO clicks (
  //           id, clickId, campaignId, flowId, landingPageId, offerId,
  //           timestamp, ip, userAgent, referer, country, city,
  //           device, browser, os, isp, connectionType, visitorId,
  //           subId1, subId2, subId3, cost, isUnique, redirectUrl, createdAt
  //         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  //       `)
  //       .bind(
  //         data.clickId,
  //         data.clickId,
  //         data.campaignId,
  //         data.flowId,
  //         data.landingPageId,
  //         data.offerId,
  //         data.timestamp,
  //         data.ip,
  //         data.userAgent,
  //         data.referer,
  //         data.country,
  //         data.city,
  //         data.device,
  //         data.browser,
  //         data.os,
  //         data.isp,
  //         data.connectionType,
  //         data.visitorId,
  //         data.subId1,
  //         data.subId2,
  //         data.subId3,
  //         data.cost,
  //         1,
  //         null,
  //         now
  //       )
  //       .run();
  //   } catch (error) {
  //     console.error('Error saving click to D1:', error);
  //   }
  // }
  /**
   * 查询点击日志列表（支持分页和筛选）
   */
  async findClicks(params) {
    const {
      page = 1,
      pageSize = 20,
      campaignId,
      startDate,
      endDate,
      country,
      device,
      browser,
      os,
      ip,
      visitorId,
      offerId,
      flowId,
      isUnique,
      search
    } = params;
    const conditions = [];
    const values = [];
    if (campaignId) {
      conditions.push("campaignId = ?");
      values.push(campaignId);
    }
    if (startDate) {
      conditions.push("timestamp >= ?");
      values.push(startDate);
    }
    if (endDate) {
      conditions.push("timestamp <= ?");
      values.push(endDate);
    }
    if (country) {
      conditions.push("country = ?");
      values.push(country);
    }
    if (device) {
      conditions.push("device = ?");
      values.push(device);
    }
    if (browser) {
      conditions.push("browser = ?");
      values.push(browser);
    }
    if (os) {
      conditions.push("os = ?");
      values.push(os);
    }
    if (ip) {
      conditions.push("ip = ?");
      values.push(ip);
    }
    if (visitorId) {
      conditions.push("visitorId = ?");
      values.push(visitorId);
    }
    if (offerId) {
      conditions.push("offerId = ?");
      values.push(offerId);
    }
    if (flowId) {
      conditions.push("flowId = ?");
      values.push(flowId);
    }
    if (isUnique !== void 0) {
      conditions.push("isUnique = ?");
      values.push(isUnique ? 1 : 0);
    }
    if (search) {
      conditions.push("(clickId LIKE ? OR ip LIKE ? OR visitorId LIKE ? OR userAgent LIKE ?)");
      const searchPattern = `%${search}%`;
      values.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * pageSize;
    const countSql = `SELECT COUNT(*) as total FROM clicks ${whereClause}`;
    const countStmt = this.db.prepare(countSql);
    const countResult = await (values.length > 0 ? countStmt.bind(...values) : countStmt).first();
    const total = countResult?.total || 0;
    const listSql = `
      SELECT 
        clickId, campaignId, flowId, landingPageId, offerId,
        timestamp, ip, userAgent, referer, country, city,
        device, browser, os, isp, connectionType, visitorId,
        subId1, subId2, subId3, cost
      FROM clicks 
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `;
    const listValues = [...values, pageSize, offset];
    const listResult = await this.db.prepare(listSql).bind(...listValues).all();
    const list = listResult.results || [];
    return {
      list,
      total,
      page,
      pageSize
    };
  }
  /**
   * 根据 clickId 获取单条点击详情
   */
  async findByClickId(clickId) {
    const result = await this.db.prepare(`
        SELECT 
          clickId, campaignId, flowId, landingPageId, offerId,
          timestamp, ip, userAgent, referer, country, city,
          device, browser, os, isp, connectionType, visitorId,
          subId1, subId2, subId3, cost
        FROM clicks 
        WHERE clickId = ?
      `).bind(clickId).first();
    return result;
  }
  /**
   * 获取最近的点击记录（用于 SSE 实时流）
   */
  async getRecentClicks(limit = 50, afterTimestamp) {
    let sql = `
      SELECT 
        clickId, campaignId, flowId, landingPageId, offerId,
        timestamp, ip, userAgent, referer, country, city,
        device, browser, os, isp, connectionType, visitorId,
        subId1, subId2, subId3, cost
      FROM clicks 
    `;
    const values = [];
    if (afterTimestamp) {
      sql += " WHERE timestamp > ?";
      values.push(afterTimestamp);
    }
    sql += " ORDER BY timestamp DESC LIMIT ?";
    values.push(limit);
    const result = await this.db.prepare(sql).bind(...values).all();
    return result.results || [];
  }
  /**
   * 获取点击统计概览
   */
  async getClickStats(startDate, endDate, campaignId) {
    let sql = `
      SELECT 
        COUNT(*) as totalClicks,
        SUM(CASE WHEN isUnique = 1 THEN 1 ELSE 0 END) as uniqueClicks,
        COUNT(DISTINCT country) as countries,
        COUNT(DISTINCT device) as deviceTypes
      FROM clicks 
      WHERE timestamp >= ? AND timestamp <= ?
    `;
    const values = [startDate, endDate];
    if (campaignId) {
      sql += " AND campaignId = ?";
      values.push(campaignId);
    }
    const result = await this.db.prepare(sql).bind(...values).first();
    return {
      totalClicks: result?.totalClicks || 0,
      uniqueClicks: result?.uniqueClicks || 0,
      countries: result?.countries || 0,
      deviceTypes: result?.deviceTypes || 0
    };
  }
  /**
   * 根据 visitorId 获取该访客的所有点击记录
   */
  async findByVisitorId(visitorId, limit = 100) {
    const result = await this.db.prepare(`
        SELECT 
          clickId, campaignId, flowId, landingPageId, offerId,
          timestamp, ip, userAgent, referer, country, city,
          device, browser, os, isp, connectionType, visitorId,
          subId1, subId2, subId3, cost
        FROM clicks 
        WHERE visitorId = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `).bind(visitorId, limit).all();
    return result.results || [];
  }
  /**
   * 更新点击记录的 isUnique 状态
   */
  async updateUniqueStatus(clickId, isUnique) {
    const result = await this.db.prepare("UPDATE clicks SET isUnique = ? WHERE clickId = ?").bind(isUnique ? 1 : 0, clickId).run();
    return result.success;
  }
};

// src/handlers/d1/conversion.repo.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var ConversionRepository = class extends BaseRepository {
  static {
    __name(this, "ConversionRepository");
  }
  constructor(db) {
    super(db, "conversions");
  }
  /**
   * 保存转化记录到数据库
   */
  async saveConversion(data) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await this.db.prepare(`
        INSERT INTO conversions (
          id, conversionId, clickId, campaignId, offerId,
          timestamp, revenue, payout, currency, conversionType, offerName,
          status, ip, country, device, browser, source,
          subId1, subId2, subId3, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
      data.conversionId,
      data.conversionId,
      data.clickId,
      data.campaignId,
      data.offerId,
      data.timestamp,
      data.revenue,
      data.payout,
      data.currency,
      data.conversionType,
      data.offerName,
      "approved",
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      now
    ).run();
  }
  /**
   * 查询转化日志列表（支持分页和筛选）
   */
  async findConversions(params) {
    const {
      page = 1,
      pageSize = 20,
      campaignId,
      offerId,
      startDate,
      endDate,
      status,
      country,
      device,
      search
    } = params;
    const conditions = [];
    const values = [];
    if (campaignId) {
      conditions.push("campaignId = ?");
      values.push(campaignId);
    }
    if (offerId) {
      conditions.push("offerId = ?");
      values.push(offerId);
    }
    if (startDate) {
      conditions.push("timestamp >= ?");
      values.push(startDate);
    }
    if (endDate) {
      conditions.push("timestamp <= ?");
      values.push(endDate);
    }
    if (status) {
      conditions.push("status = ?");
      values.push(status);
    }
    if (country) {
      conditions.push("country = ?");
      values.push(country);
    }
    if (device) {
      conditions.push("device = ?");
      values.push(device);
    }
    if (search) {
      conditions.push("(conversionId LIKE ? OR clickId LIKE ? OR offerName LIKE ?)");
      const searchPattern = `%${search}%`;
      values.push(searchPattern, searchPattern, searchPattern);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * pageSize;
    const countSql = `SELECT COUNT(*) as total FROM conversions ${whereClause}`;
    const countStmt = this.db.prepare(countSql);
    const countResult = await (values.length > 0 ? countStmt.bind(...values) : countStmt).first();
    const total = countResult?.total || 0;
    const listSql = `
      SELECT 
        conversionId, clickId, campaignId, offerId,
        timestamp, revenue, payout, currency, conversionType, offerName,
        status, ip, country, device, browser, source,
        subId1, subId2, subId3
      FROM conversions 
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `;
    const listValues = [...values, pageSize, offset];
    const listResult = await this.db.prepare(listSql).bind(...listValues).all();
    const list = listResult.results || [];
    return {
      list,
      total,
      page,
      pageSize
    };
  }
  /**
   * 根据 conversionId 获取单条转化详情
   */
  async findByConversionId(conversionId) {
    const result = await this.db.prepare(`
        SELECT 
          conversionId, clickId, campaignId, offerId,
          timestamp, revenue, payout, currency, conversionType, offerName,
          status, ip, country, device, browser, source,
          subId1, subId2, subId3
        FROM conversions 
        WHERE conversionId = ?
      `).bind(conversionId).first();
    return result;
  }
  /**
   * 根据 clickId 获取转化记录
   */
  async findByClickId(clickId) {
    const result = await this.db.prepare(`
        SELECT 
          conversionId, clickId, campaignId, offerId,
          timestamp, revenue, payout, currency, conversionType, offerName,
          status, ip, country, device, browser, source,
          subId1, subId2, subId3
        FROM conversions 
        WHERE clickId = ?
        ORDER BY timestamp DESC
      `).bind(clickId).all();
    return result.results || [];
  }
  /**
   * 获取转化统计概览
   */
  async getConversionStats(startDate, endDate, campaignId) {
    let sql = `
      SELECT 
        COUNT(*) as totalConversions,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approvedConversions,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingConversions,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejectedConversions,
        SUM(CASE WHEN status = 'approved' THEN revenue ELSE 0 END) as totalRevenue,
        SUM(CASE WHEN status = 'approved' THEN payout ELSE 0 END) as totalPayout
      FROM conversions 
      WHERE timestamp >= ? AND timestamp <= ?
    `;
    const values = [startDate, endDate];
    if (campaignId) {
      sql += " AND campaignId = ?";
      values.push(campaignId);
    }
    const result = await this.db.prepare(sql).bind(...values).first();
    return {
      totalConversions: result?.totalConversions || 0,
      approvedConversions: result?.approvedConversions || 0,
      pendingConversions: result?.pendingConversions || 0,
      rejectedConversions: result?.rejectedConversions || 0,
      totalRevenue: result?.totalRevenue || 0,
      totalPayout: result?.totalPayout || 0
    };
  }
  /**
   * 更新转化状态
   */
  async updateStatus(conversionId, status) {
    const result = await this.db.prepare("UPDATE conversions SET status = ? WHERE conversionId = ?").bind(status, conversionId).run();
    return result.success;
  }
};

// src/handlers/d1/blacklist.repo.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var BlacklistRepository = class extends BaseRepository {
  static {
    __name(this, "BlacklistRepository");
  }
  constructor(db) {
    super(db, "blacklist");
  }
  /**
   * 创建黑名单条目
   */
  async create(data) {
    const id = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await this.db.prepare(`
        INSERT INTO blacklist (
          id, trafficSourceId, type, value, name, reason, status, synced,
          syncedAt, campaignId, ipMatchMode, uaMatchMode, syncToPlatform, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
      id,
      data.trafficSourceId,
      data.type,
      data.value,
      data.name || null,
      data.reason || null,
      data.status || "active",
      data.synced || false,
      data.syncedAt || null,
      data.campaignId || null,
      data.ipMatchMode || null,
      data.uaMatchMode || null,
      data.syncToPlatform !== void 0 ? data.syncToPlatform ? 1 : 0 : 1,
      now,
      now
    ).run();
    const entry = await this.findById(id);
    return entry;
  }
  /**
   * 批量创建黑名单条目
   */
  async batchCreate(trafficSourceId, type, items) {
    const entries = [];
    for (const item of items) {
      const existing = await this.findByValue(trafficSourceId, type, item.value);
      if (existing) {
        if (existing.status === "removed") {
          await this.update(existing.id, {
            status: "active",
            reason: item.reason || existing.reason,
            synced: false
          });
          const updated = await this.findById(existing.id);
          if (updated) entries.push(updated);
        }
        continue;
      }
      const entry = await this.create({
        trafficSourceId,
        type,
        value: item.value,
        name: item.name,
        reason: item.reason,
        status: "active",
        synced: false,
        campaignId: item.campaignId
      });
      entries.push(entry);
    }
    return entries;
  }
  /**
   * 根据条件查询黑名单
   */
  async findByParams(params) {
    const conditions = [];
    const values = [];
    if (params.trafficSourceId) {
      conditions.push("trafficSourceId = ?");
      values.push(params.trafficSourceId);
    }
    if (params.type) {
      conditions.push("type = ?");
      values.push(params.type);
    }
    if (params.status) {
      conditions.push("status = ?");
      values.push(params.status);
    }
    if (params.synced !== void 0) {
      conditions.push("synced = ?");
      values.push(params.synced ? 1 : 0);
    }
    if (params.campaignId) {
      conditions.push("campaignId = ?");
      values.push(params.campaignId);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await this.db.prepare(`SELECT * FROM blacklist ${whereClause} ORDER BY createdAt DESC`).bind(...values).all();
    return result.results || [];
  }
  /**
   * 根据值查找黑名单条目
   */
  async findByValue(trafficSourceId, type, value) {
    const result = await this.db.prepare(`
        SELECT * FROM blacklist
        WHERE trafficSourceId = ? AND type = ? AND value = ?
        LIMIT 1
      `).bind(trafficSourceId, type, value).first();
    return result;
  }
  /**
   * 更新黑名单条目
   */
  async update(id, data) {
    const fields = [];
    const values = [];
    if (data.name !== void 0) {
      fields.push("name = ?");
      values.push(data.name);
    }
    if (data.reason !== void 0) {
      fields.push("reason = ?");
      values.push(data.reason);
    }
    if (data.status !== void 0) {
      fields.push("status = ?");
      values.push(data.status);
    }
    if (data.synced !== void 0) {
      fields.push("synced = ?");
      values.push(data.synced ? 1 : 0);
    }
    if (data.syncedAt !== void 0) {
      fields.push("syncedAt = ?");
      values.push(data.syncedAt);
    }
    if (data.ipMatchMode !== void 0) {
      fields.push("ipMatchMode = ?");
      values.push(data.ipMatchMode);
    }
    if (data.uaMatchMode !== void 0) {
      fields.push("uaMatchMode = ?");
      values.push(data.uaMatchMode);
    }
    if (data.syncToPlatform !== void 0) {
      fields.push("syncToPlatform = ?");
      values.push(data.syncToPlatform ? 1 : 0);
    }
    if (fields.length === 0) {
      return this.findById(id);
    }
    fields.push("updatedAt = ?");
    values.push((/* @__PURE__ */ new Date()).toISOString());
    values.push(id);
    await this.db.prepare(`UPDATE blacklist SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    return this.findById(id);
  }
  /**
   * 标记为已同步
   */
  async markSynced(id) {
    await this.db.prepare(`
        UPDATE blacklist
        SET synced = 1, syncedAt = ?, updatedAt = ?
        WHERE id = ?
      `).bind((/* @__PURE__ */ new Date()).toISOString(), (/* @__PURE__ */ new Date()).toISOString(), id).run();
  }
  /**
   * 获取未同步的黑名单条目
   */
  async findUnsynced(trafficSourceId) {
    let sql = "SELECT * FROM blacklist WHERE synced = 0 AND status = 'active'";
    const values = [];
    if (trafficSourceId) {
      sql += " AND trafficSourceId = ?";
      values.push(trafficSourceId);
    }
    sql += " ORDER BY createdAt ASC";
    const result = await this.db.prepare(sql).bind(...values).all();
    return result.results || [];
  }
  /**
   * 从黑名单中移除（软删除）
   */
  async remove(id) {
    return this.update(id, { status: "removed", synced: false });
  }
  /**
   * 获取黑名单统计
   */
  async getStats(trafficSourceId) {
    const result = await this.db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN synced = 1 THEN 1 ELSE 0 END) as synced,
          SUM(CASE WHEN synced = 0 AND status = 'active' THEN 1 ELSE 0 END) as unsynced
        FROM blacklist
        WHERE trafficSourceId = ?
      `).bind(trafficSourceId).first();
    return {
      total: result?.total || 0,
      active: result?.active || 0,
      synced: result?.synced || 0,
      unsynced: result?.unsynced || 0
    };
  }
};

// src/handlers/d1/whitelist.repo.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var WhitelistRepository = class extends BaseRepository {
  static {
    __name(this, "WhitelistRepository");
  }
  constructor(db) {
    super(db, "whitelist");
  }
  /**
   * 创建白名单条目
   */
  async create(data) {
    const id = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await this.db.prepare(`
        INSERT INTO whitelist (
          id, trafficSourceId, type, value, name, reason, status, synced,
          syncedAt, campaignId, ipMatchMode, uaMatchMode, syncToPlatform, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
      id,
      data.trafficSourceId,
      data.type,
      data.value,
      data.name || null,
      data.reason || null,
      data.status || "active",
      data.synced || false,
      data.syncedAt || null,
      data.campaignId || null,
      data.ipMatchMode || null,
      data.uaMatchMode || null,
      data.syncToPlatform !== void 0 ? data.syncToPlatform ? 1 : 0 : 1,
      now,
      now
    ).run();
    const entry = await this.findById(id);
    return entry;
  }
  /**
   * 批量创建白名单条目
   */
  async batchCreate(trafficSourceId, type, items) {
    const entries = [];
    for (const item of items) {
      const existing = await this.findByValue(trafficSourceId, type, item.value);
      if (existing) {
        if (existing.status === "removed") {
          await this.update(existing.id, {
            status: "active",
            reason: item.reason || existing.reason,
            synced: false
          });
          const updated = await this.findById(existing.id);
          if (updated) entries.push(updated);
        }
        continue;
      }
      const entry = await this.create({
        trafficSourceId,
        type,
        value: item.value,
        name: item.name,
        reason: item.reason,
        status: "active",
        synced: false,
        campaignId: item.campaignId
      });
      entries.push(entry);
    }
    return entries;
  }
  /**
   * 根据条件查询白名单
   */
  async findByParams(params) {
    const conditions = [];
    const values = [];
    if (params.trafficSourceId) {
      conditions.push("trafficSourceId = ?");
      values.push(params.trafficSourceId);
    }
    if (params.type) {
      conditions.push("type = ?");
      values.push(params.type);
    }
    if (params.status) {
      conditions.push("status = ?");
      values.push(params.status);
    }
    if (params.synced !== void 0) {
      conditions.push("synced = ?");
      values.push(params.synced ? 1 : 0);
    }
    if (params.campaignId) {
      conditions.push("campaignId = ?");
      values.push(params.campaignId);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await this.db.prepare(`SELECT * FROM whitelist ${whereClause} ORDER BY createdAt DESC`).bind(...values).all();
    return result.results || [];
  }
  /**
   * 根据值查找白名单条目
   */
  async findByValue(trafficSourceId, type, value) {
    const result = await this.db.prepare(`
        SELECT * FROM whitelist
        WHERE trafficSourceId = ? AND type = ? AND value = ?
        LIMIT 1
      `).bind(trafficSourceId, type, value).first();
    return result;
  }
  /**
   * 更新白名单条目
   */
  async update(id, data) {
    const fields = [];
    const values = [];
    if (data.name !== void 0) {
      fields.push("name = ?");
      values.push(data.name);
    }
    if (data.reason !== void 0) {
      fields.push("reason = ?");
      values.push(data.reason);
    }
    if (data.status !== void 0) {
      fields.push("status = ?");
      values.push(data.status);
    }
    if (data.synced !== void 0) {
      fields.push("synced = ?");
      values.push(data.synced ? 1 : 0);
    }
    if (data.syncedAt !== void 0) {
      fields.push("syncedAt = ?");
      values.push(data.syncedAt);
    }
    if (data.ipMatchMode !== void 0) {
      fields.push("ipMatchMode = ?");
      values.push(data.ipMatchMode);
    }
    if (data.uaMatchMode !== void 0) {
      fields.push("uaMatchMode = ?");
      values.push(data.uaMatchMode);
    }
    if (data.syncToPlatform !== void 0) {
      fields.push("syncToPlatform = ?");
      values.push(data.syncToPlatform ? 1 : 0);
    }
    if (fields.length === 0) {
      return this.findById(id);
    }
    fields.push("updatedAt = ?");
    values.push((/* @__PURE__ */ new Date()).toISOString());
    values.push(id);
    await this.db.prepare(`UPDATE whitelist SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    return this.findById(id);
  }
  /**
   * 标记为已同步
   */
  async markSynced(id) {
    await this.db.prepare(`
        UPDATE whitelist
        SET synced = 1, syncedAt = ?, updatedAt = ?
        WHERE id = ?
      `).bind((/* @__PURE__ */ new Date()).toISOString(), (/* @__PURE__ */ new Date()).toISOString(), id).run();
  }
  /**
   * 获取未同步的白名单条目
   */
  async findUnsynced(trafficSourceId) {
    let sql = "SELECT * FROM whitelist WHERE synced = 0 AND status = 'active'";
    const values = [];
    if (trafficSourceId) {
      sql += " AND trafficSourceId = ?";
      values.push(trafficSourceId);
    }
    sql += " ORDER BY createdAt ASC";
    const result = await this.db.prepare(sql).bind(...values).all();
    return result.results || [];
  }
  /**
   * 从白名单中移除（软删除）
   */
  async remove(id) {
    return this.update(id, { status: "removed", synced: false });
  }
  /**
   * 获取白名单统计
   */
  async getStats(trafficSourceId) {
    const result = await this.db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN synced = 1 THEN 1 ELSE 0 END) as synced,
          SUM(CASE WHEN synced = 0 AND status = 'active' THEN 1 ELSE 0 END) as unsynced
        FROM whitelist
        WHERE trafficSourceId = ?
      `).bind(trafficSourceId).first();
    return {
      total: result?.total || 0,
      active: result?.active || 0,
      synced: result?.synced || 0,
      unsynced: result?.unsynced || 0
    };
  }
};

// src/handlers/d1/index.ts
function getD1Connection(env2) {
  return env2.DB;
}
__name(getD1Connection, "getD1Connection");

// src/services/platform/task.processor.ts
var PlatformTaskProcessor = class {
  static {
    __name(this, "PlatformTaskProcessor");
  }
  taskRepo;
  manager;
  env;
  constructor(env2) {
    this.env = env2;
    const db = getD1Connection(env2);
    this.taskRepo = new TaskRepository(db);
    this.manager = PlatformManager.createDefault();
  }
  /**
   * 处理单个任务
   */
  async processTask(task) {
    if (task.type !== "rule_action") {
      console.log(`Skipping non-rule task: ${task.type}`);
      return;
    }
    const acquired = await this.taskRepo.markRunning(task.id);
    if (!acquired) {
      console.log(`Task ${task.id} already being processed`);
      return;
    }
    try {
      const payload = JSON.parse(task.payload);
      const result = await this.executePlatformAction(payload);
      await this.taskRepo.markCompleted(task.id, {
        success: result.success,
        message: result.message,
        data: result.data
      });
      console.log(`Task ${task.id} completed: ${result.message}`);
    } catch (error4) {
      const errorMessage = error4 instanceof Error ? error4.message : String(error4);
      await this.taskRepo.markFailed(task.id, errorMessage);
      console.error(`Task ${task.id} failed: ${errorMessage}`);
    }
  }
  /**
   * 执行平台操作
   */
  async executePlatformAction(payload) {
    const { platform: platform2, action, parameters } = payload;
    const config2 = await this.getPlatformConfig(platform2);
    if (config2) {
      await this.manager.initializePlatform(platform2, config2);
    }
    return this.manager.executeAction(platform2, action, parameters);
  }
  /**
   * 获取平台配置
   */
  async getPlatformConfig(platformId) {
    const envKey = `${platformId.toUpperCase()}_API_KEY`;
    const apiKey = this.env[envKey];
    if (!apiKey) {
      console.warn(`No API key found for platform: ${platformId}`);
      return null;
    }
    return {
      apiKey
    };
  }
  /**
   * 处理所有待处理的任务
   */
  async processPendingTasks(limit = 10) {
    const tasks = await this.taskRepo.getPendingTasks(limit);
    for (const task of tasks) {
      try {
        await this.processTask(task);
      } catch (error4) {
        console.error(`Failed to process task ${task.id}:`, error4);
      }
    }
    return tasks.length;
  }
};

// src/services/platform/cron.worker.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/rule/engine.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var RuleEngine = class {
  static {
    __name(this, "RuleEngine");
  }
  ruleRepo;
  trafficRepo;
  taskRepo;
  constructor(env2) {
    const db = getD1Connection(env2);
    this.ruleRepo = new RuleRepository(db);
    this.trafficRepo = new TrafficRepository(db);
    this.taskRepo = new TaskRepository(db);
  }
  /**
   * 评估所有启用的规则
   */
  async evaluateAllRules() {
    const rules = await this.ruleRepo.findEnabled();
    for (const rule of rules) {
      try {
        await this.evaluateRule(rule);
      } catch (error4) {
        console.error(`Failed to evaluate rule ${rule.id}:`, error4);
      }
    }
  }
  /**
   * 评估单个规则
   */
  async evaluateRule(rule) {
    const context2 = await this.buildEvaluationContext(rule);
    const conditionsMet = await this.evaluateConditions(rule.conditions, context2);
    if (conditionsMet) {
      await this.executeActions(rule, context2);
      await this.logExecution(rule, context2, true);
      return true;
    }
    return false;
  }
  /**
   * 构建评估上下文
   */
  async buildEvaluationContext(rule) {
    const campaignId = rule.campaignId;
    const now = /* @__PURE__ */ new Date();
    const duration = this.parseDuration(rule.conditions[0]?.duration);
    const startDate = new Date(now.getTime() - duration).toISOString().split("T")[0] || "";
    const endDate = now.toISOString().split("T")[0] || "";
    const metrics = await this.trafficRepo.getCampaignMetrics(
      campaignId,
      startDate,
      endDate
    );
    return {
      campaignId,
      metrics,
      timeRange: rule.conditions[0]?.duration || "24h"
    };
  }
  /**
   * 解析 duration 字符串为毫秒
   */
  parseDuration(duration) {
    if (!duration) {
      return 24 * 60 * 60 * 1e3;
    }
    const match2 = duration.match(/^(\d+)(h|d|m)$/);
    if (!match2) {
      return 24 * 60 * 60 * 1e3;
    }
    const value = parseInt(match2[1] || "24", 10);
    const unit = match2[2];
    switch (unit) {
      case "h":
        return value * 60 * 60 * 1e3;
      case "d":
        return value * 24 * 60 * 60 * 1e3;
      case "m":
        return value * 30 * 24 * 60 * 60 * 1e3;
      default:
        return 24 * 60 * 60 * 1e3;
    }
  }
  /**
   * 评估条件
   */
  async evaluateConditions(conditions, context2) {
    for (const condition of conditions) {
      const value = this.getMetricValue(condition.metric, context2.metrics);
      const met = this.compareValues(value, condition.operator, Number(condition.value));
      if (!met) {
        return false;
      }
    }
    return true;
  }
  /**
   * 获取指标值
   */
  getMetricValue(metric, metrics) {
    return metrics[metric] || 0;
  }
  /**
   * 比较值
   */
  compareValues(actual, operator, expected) {
    switch (operator) {
      case ">":
        return actual > expected;
      case "<":
        return actual < expected;
      case ">=":
        return actual >= expected;
      case "<=":
        return actual <= expected;
      case "==":
        return actual === expected;
      case "!=":
        return actual !== expected;
      default:
        return false;
    }
  }
  /**
   * 执行操作
   */
  async executeActions(rule, context2) {
    for (const action of rule.actions) {
      await this.scheduleAction(rule, action, context2);
    }
  }
  /**
   * 调度操作执行
   */
  async scheduleAction(rule, action, context2) {
    const task = {
      type: "rule_action",
      payload: {
        ruleId: rule.id,
        action: action.type,
        platform: action.platform,
        parameters: action.parameters,
        campaignId: context2.campaignId
      },
      priority: rule.priority,
      scheduledAt: action.delay > 0 ? new Date(Date.now() + action.delay * 1e3).toISOString() : void 0
    };
    await this.taskRepo.create(task);
  }
  /**
   * 记录执行日志
   */
  async logExecution(rule, context2, success2) {
    const log4 = {
      ruleId: rule.id,
      campaignId: context2.campaignId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      conditions: rule.conditions,
      actions: rule.actions,
      executionResult: {
        success: success2,
        message: success2 ? "Rule triggered successfully" : "Conditions not met"
      },
      triggeredBy: context2.metrics
    };
    await this.ruleRepo.logExecution(log4);
  }
};

// src/services/platform/cron.worker.ts
async function handlePlatformCron(env2) {
  console.log("Starting platform cron job...");
  try {
    console.log("Evaluating rules...");
    const ruleEngine = new RuleEngine(env2);
    await ruleEngine.evaluateAllRules();
    console.log("Processing pending tasks...");
    const processor = new PlatformTaskProcessor(env2);
    const processedCount = await processor.processPendingTasks(50);
    console.log(`Platform cron job completed. Processed ${processedCount} tasks.`);
  } catch (error4) {
    console.error("Platform cron job failed:", error4);
    throw error4;
  }
}
__name(handlePlatformCron, "handlePlatformCron");
async function triggerRuleEvaluation(env2) {
  try {
    const ruleEngine = new RuleEngine(env2);
    await ruleEngine.evaluateAllRules();
    return {
      success: true,
      message: "Rule evaluation completed"
    };
  } catch (error4) {
    const message = error4 instanceof Error ? error4.message : String(error4);
    return {
      success: false,
      message: `Rule evaluation failed: ${message}`
    };
  }
}
__name(triggerRuleEvaluation, "triggerRuleEvaluation");
async function triggerTaskProcessing(env2, limit = 10) {
  try {
    const processor = new PlatformTaskProcessor(env2);
    const processedCount = await processor.processPendingTasks(limit);
    return {
      success: true,
      message: `Processed ${processedCount} tasks`,
      processedCount
    };
  } catch (error4) {
    const message = error4 instanceof Error ? error4.message : String(error4);
    return {
      success: false,
      message: `Task processing failed: ${message}`
    };
  }
}
__name(triggerTaskProcessing, "triggerTaskProcessing");

// src/services/platform/platform.routes.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/utils/validator.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
__name(isValidUrl, "isValidUrl");
function validateRequired(value, fieldName) {
  if (value === void 0 || value === null || value === "") {
    return {
      valid: false,
      message: `${fieldName} is required`,
      code: ERROR_CODES.VALIDATION
    };
  }
  return { valid: true, message: "" };
}
__name(validateRequired, "validateRequired");
function validateStringLength(value, min, max, fieldName) {
  if (value.length < min || value.length > max) {
    return {
      valid: false,
      message: `${fieldName} must be between ${min} and ${max} characters`,
      code: ERROR_CODES.VALIDATION
    };
  }
  return { valid: true, message: "" };
}
__name(validateStringLength, "validateStringLength");
function validateNumberRange(value, min, max, fieldName) {
  if (value < min || value > max) {
    return {
      valid: false,
      message: `${fieldName} must be between ${min} and ${max}`,
      code: ERROR_CODES.VALIDATION
    };
  }
  return { valid: true, message: "" };
}
__name(validateNumberRange, "validateNumberRange");
function validatePagination(page, pageSize) {
  return {
    page: Math.max(1, page || 1),
    pageSize: Math.min(100, Math.max(1, pageSize || 20))
  };
}
__name(validatePagination, "validatePagination");

// src/services/platform/platform.routes.ts
function createPlatformRouter() {
  const router2 = new Hono2();
  const manager = PlatformManager.createDefault();
  router2.get("/", async (c) => {
    const platforms = manager.getAvailablePlatforms();
    return c.json(success(platforms));
  });
  router2.get("/configured", async (c) => {
    const platforms = manager.getConfiguredPlatforms();
    return c.json(success(platforms));
  });
  router2.get("/:platformId", async (c) => {
    const platformId = c.req.param("platformId");
    const platforms = manager.getAvailablePlatforms();
    const platform2 = platforms.find((p) => p.id === platformId);
    if (!platform2) {
      return c.json(error3("Platform not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }
    return c.json(success(platform2));
  });
  router2.post("/:platformId/configure", async (c) => {
    const platformId = c.req.param("platformId");
    const body = await c.req.json();
    try {
      await manager.initializePlatform(platformId, body);
      return c.json(success({ configured: true }));
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        return c.json(error3("Platform not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      if (err instanceof Error && err.message.includes("Invalid configuration")) {
        return c.json(error3(err.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
      }
      throw err;
    }
  });
  router2.post("/:platformId/test", async (c) => {
    const platformId = c.req.param("platformId");
    const result = await manager.testPlatformConnection(platformId);
    return c.json(success({
      platformId,
      connected: result
    }));
  });
  router2.post("/:platformId/execute", async (c) => {
    const platformId = c.req.param("platformId");
    const body = await c.req.json();
    const actionValidation = validateRequired(body.action, "action");
    if (!actionValidation.valid) {
      return c.json(error3(actionValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const result = await manager.executeAction(platformId, body.action, body.parameters || {});
    if (!result.success) {
      return c.json(error3(result.message, ERROR_CODES.EXTERNAL_API), HTTP_STATUS.BAD_REQUEST);
    }
    return c.json(success(result));
  });
  router2.post("/cron/evaluate-rules", async (c) => {
    const env2 = c.env;
    const result = await triggerRuleEvaluation(env2);
    if (!result.success) {
      return c.json(error3(result.message, ERROR_CODES.INTERNAL_ERROR), HTTP_STATUS.INTERNAL_ERROR);
    }
    return c.json(success(result));
  });
  router2.post("/cron/process-tasks", async (c) => {
    const env2 = c.env;
    const body = await c.req.json().catch(() => ({}));
    const limit = body.limit || 10;
    const result = await triggerTaskProcessing(env2, limit);
    if (!result.success) {
      return c.json(error3(result.message, ERROR_CODES.INTERNAL_ERROR), HTTP_STATUS.INTERNAL_ERROR);
    }
    return c.json(success(result));
  });
  router2.post("/:platformId/exclude-zone", async (c) => {
    const platformId = c.req.param("platformId");
    const body = await c.req.json();
    if (!body.campaignId || !body.zoneId) {
      return c.json(
        error3("Missing required parameters: campaignId and zoneId", ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
    const result = await manager.executeAction(platformId, "exclude_zone", {
      campaignId: body.campaignId,
      zoneId: body.zoneId
    });
    if (!result.success) {
      return c.json(error3(result.message, ERROR_CODES.EXTERNAL_API), HTTP_STATUS.BAD_REQUEST);
    }
    return c.json(success(result));
  });
  router2.post("/:platformId/include-zone", async (c) => {
    const platformId = c.req.param("platformId");
    const body = await c.req.json();
    if (!body.campaignId || !body.zoneId) {
      return c.json(
        error3("Missing required parameters: campaignId and zoneId", ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST
      );
    }
    const result = await manager.executeAction(platformId, "include_zone", {
      campaignId: body.campaignId,
      zoneId: body.zoneId
    });
    if (!result.success) {
      return c.json(error3(result.message, ERROR_CODES.EXTERNAL_API), HTTP_STATUS.BAD_REQUEST);
    }
    return c.json(success(result));
  });
  return router2;
}
__name(createPlatformRouter, "createPlatformRouter");

// node_modules/unenv/dist/runtime/node/fs.mjs
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/unenv/dist/runtime/node/fs/promises.mjs
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/unenv/dist/runtime/node/internal/fs/promises.mjs
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_utils();
var access = /* @__PURE__ */ notImplemented("fs.access");
var copyFile = /* @__PURE__ */ notImplemented("fs.copyFile");
var cp = /* @__PURE__ */ notImplemented("fs.cp");
var open = /* @__PURE__ */ notImplemented("fs.open");
var opendir = /* @__PURE__ */ notImplemented("fs.opendir");
var rename = /* @__PURE__ */ notImplemented("fs.rename");
var truncate = /* @__PURE__ */ notImplemented("fs.truncate");
var rm = /* @__PURE__ */ notImplemented("fs.rm");
var rmdir = /* @__PURE__ */ notImplemented("fs.rmdir");
var mkdir = /* @__PURE__ */ notImplemented("fs.mkdir");
var readdir = /* @__PURE__ */ notImplemented("fs.readdir");
var readlink = /* @__PURE__ */ notImplemented("fs.readlink");
var symlink = /* @__PURE__ */ notImplemented("fs.symlink");
var lstat = /* @__PURE__ */ notImplemented("fs.lstat");
var stat = /* @__PURE__ */ notImplemented("fs.stat");
var link = /* @__PURE__ */ notImplemented("fs.link");
var unlink = /* @__PURE__ */ notImplemented("fs.unlink");
var chmod = /* @__PURE__ */ notImplemented("fs.chmod");
var lchmod = /* @__PURE__ */ notImplemented("fs.lchmod");
var lchown = /* @__PURE__ */ notImplemented("fs.lchown");
var chown = /* @__PURE__ */ notImplemented("fs.chown");
var utimes = /* @__PURE__ */ notImplemented("fs.utimes");
var lutimes = /* @__PURE__ */ notImplemented("fs.lutimes");
var realpath = /* @__PURE__ */ notImplemented("fs.realpath");
var mkdtemp = /* @__PURE__ */ notImplemented("fs.mkdtemp");
var writeFile = /* @__PURE__ */ notImplemented("fs.writeFile");
var appendFile = /* @__PURE__ */ notImplemented("fs.appendFile");
var readFile = /* @__PURE__ */ notImplemented("fs.readFile");
var watch = /* @__PURE__ */ notImplemented("fs.watch");
var statfs = /* @__PURE__ */ notImplemented("fs.statfs");
var glob = /* @__PURE__ */ notImplemented("fs.glob");

// node_modules/unenv/dist/runtime/node/internal/fs/constants.mjs
var constants_exports = {};
__export(constants_exports, {
  COPYFILE_EXCL: () => COPYFILE_EXCL,
  COPYFILE_FICLONE: () => COPYFILE_FICLONE,
  COPYFILE_FICLONE_FORCE: () => COPYFILE_FICLONE_FORCE,
  EXTENSIONLESS_FORMAT_JAVASCRIPT: () => EXTENSIONLESS_FORMAT_JAVASCRIPT,
  EXTENSIONLESS_FORMAT_WASM: () => EXTENSIONLESS_FORMAT_WASM,
  F_OK: () => F_OK,
  O_APPEND: () => O_APPEND,
  O_CREAT: () => O_CREAT,
  O_DIRECT: () => O_DIRECT,
  O_DIRECTORY: () => O_DIRECTORY,
  O_DSYNC: () => O_DSYNC,
  O_EXCL: () => O_EXCL,
  O_NOATIME: () => O_NOATIME,
  O_NOCTTY: () => O_NOCTTY,
  O_NOFOLLOW: () => O_NOFOLLOW,
  O_NONBLOCK: () => O_NONBLOCK,
  O_RDONLY: () => O_RDONLY,
  O_RDWR: () => O_RDWR,
  O_SYNC: () => O_SYNC,
  O_TRUNC: () => O_TRUNC,
  O_WRONLY: () => O_WRONLY,
  R_OK: () => R_OK,
  S_IFBLK: () => S_IFBLK,
  S_IFCHR: () => S_IFCHR,
  S_IFDIR: () => S_IFDIR,
  S_IFIFO: () => S_IFIFO,
  S_IFLNK: () => S_IFLNK,
  S_IFMT: () => S_IFMT,
  S_IFREG: () => S_IFREG,
  S_IFSOCK: () => S_IFSOCK,
  S_IRGRP: () => S_IRGRP,
  S_IROTH: () => S_IROTH,
  S_IRUSR: () => S_IRUSR,
  S_IRWXG: () => S_IRWXG,
  S_IRWXO: () => S_IRWXO,
  S_IRWXU: () => S_IRWXU,
  S_IWGRP: () => S_IWGRP,
  S_IWOTH: () => S_IWOTH,
  S_IWUSR: () => S_IWUSR,
  S_IXGRP: () => S_IXGRP,
  S_IXOTH: () => S_IXOTH,
  S_IXUSR: () => S_IXUSR,
  UV_DIRENT_BLOCK: () => UV_DIRENT_BLOCK,
  UV_DIRENT_CHAR: () => UV_DIRENT_CHAR,
  UV_DIRENT_DIR: () => UV_DIRENT_DIR,
  UV_DIRENT_FIFO: () => UV_DIRENT_FIFO,
  UV_DIRENT_FILE: () => UV_DIRENT_FILE,
  UV_DIRENT_LINK: () => UV_DIRENT_LINK,
  UV_DIRENT_SOCKET: () => UV_DIRENT_SOCKET,
  UV_DIRENT_UNKNOWN: () => UV_DIRENT_UNKNOWN,
  UV_FS_COPYFILE_EXCL: () => UV_FS_COPYFILE_EXCL,
  UV_FS_COPYFILE_FICLONE: () => UV_FS_COPYFILE_FICLONE,
  UV_FS_COPYFILE_FICLONE_FORCE: () => UV_FS_COPYFILE_FICLONE_FORCE,
  UV_FS_O_FILEMAP: () => UV_FS_O_FILEMAP,
  UV_FS_SYMLINK_DIR: () => UV_FS_SYMLINK_DIR,
  UV_FS_SYMLINK_JUNCTION: () => UV_FS_SYMLINK_JUNCTION,
  W_OK: () => W_OK,
  X_OK: () => X_OK
});
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var UV_FS_SYMLINK_DIR = 1;
var UV_FS_SYMLINK_JUNCTION = 2;
var O_RDONLY = 0;
var O_WRONLY = 1;
var O_RDWR = 2;
var UV_DIRENT_UNKNOWN = 0;
var UV_DIRENT_FILE = 1;
var UV_DIRENT_DIR = 2;
var UV_DIRENT_LINK = 3;
var UV_DIRENT_FIFO = 4;
var UV_DIRENT_SOCKET = 5;
var UV_DIRENT_CHAR = 6;
var UV_DIRENT_BLOCK = 7;
var EXTENSIONLESS_FORMAT_JAVASCRIPT = 0;
var EXTENSIONLESS_FORMAT_WASM = 1;
var S_IFMT = 61440;
var S_IFREG = 32768;
var S_IFDIR = 16384;
var S_IFCHR = 8192;
var S_IFBLK = 24576;
var S_IFIFO = 4096;
var S_IFLNK = 40960;
var S_IFSOCK = 49152;
var O_CREAT = 64;
var O_EXCL = 128;
var UV_FS_O_FILEMAP = 0;
var O_NOCTTY = 256;
var O_TRUNC = 512;
var O_APPEND = 1024;
var O_DIRECTORY = 65536;
var O_NOATIME = 262144;
var O_NOFOLLOW = 131072;
var O_SYNC = 1052672;
var O_DSYNC = 4096;
var O_DIRECT = 16384;
var O_NONBLOCK = 2048;
var S_IRWXU = 448;
var S_IRUSR = 256;
var S_IWUSR = 128;
var S_IXUSR = 64;
var S_IRWXG = 56;
var S_IRGRP = 32;
var S_IWGRP = 16;
var S_IXGRP = 8;
var S_IRWXO = 7;
var S_IROTH = 4;
var S_IWOTH = 2;
var S_IXOTH = 1;
var F_OK = 0;
var R_OK = 4;
var W_OK = 2;
var X_OK = 1;
var UV_FS_COPYFILE_EXCL = 1;
var COPYFILE_EXCL = 1;
var UV_FS_COPYFILE_FICLONE = 2;
var COPYFILE_FICLONE = 2;
var UV_FS_COPYFILE_FICLONE_FORCE = 4;
var COPYFILE_FICLONE_FORCE = 4;

// node_modules/unenv/dist/runtime/node/fs/promises.mjs
var promises_default = {
  constants: constants_exports,
  access,
  appendFile,
  chmod,
  chown,
  copyFile,
  cp,
  glob,
  lchmod,
  lchown,
  link,
  lstat,
  lutimes,
  mkdir,
  mkdtemp,
  open,
  opendir,
  readFile,
  readdir,
  readlink,
  realpath,
  rename,
  rm,
  rmdir,
  stat,
  statfs,
  symlink,
  truncate,
  unlink,
  utimes,
  watch,
  writeFile
};

// node_modules/unenv/dist/runtime/node/internal/fs/classes.mjs
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_utils();
var Dir = /* @__PURE__ */ notImplementedClass("fs.Dir");
var Dirent = /* @__PURE__ */ notImplementedClass("fs.Dirent");
var Stats = /* @__PURE__ */ notImplementedClass("fs.Stats");
var ReadStream2 = /* @__PURE__ */ notImplementedClass("fs.ReadStream");
var WriteStream2 = /* @__PURE__ */ notImplementedClass("fs.WriteStream");
var FileReadStream = ReadStream2;
var FileWriteStream = WriteStream2;

// node_modules/unenv/dist/runtime/node/internal/fs/fs.mjs
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_utils();
function callbackify(fn) {
  const fnc = /* @__PURE__ */ __name(function(...args) {
    const cb = args.pop();
    fn().catch((error4) => cb(error4)).then((val) => cb(void 0, val));
  }, "fnc");
  fnc.__promisify__ = fn;
  fnc.native = fnc;
  return fnc;
}
__name(callbackify, "callbackify");
var access2 = callbackify(access);
var appendFile2 = callbackify(appendFile);
var chown2 = callbackify(chown);
var chmod2 = callbackify(chmod);
var copyFile2 = callbackify(copyFile);
var cp2 = callbackify(cp);
var lchown2 = callbackify(lchown);
var lchmod2 = callbackify(lchmod);
var link2 = callbackify(link);
var lstat2 = callbackify(lstat);
var lutimes2 = callbackify(lutimes);
var mkdir2 = callbackify(mkdir);
var mkdtemp2 = callbackify(mkdtemp);
var realpath2 = callbackify(realpath);
var open2 = callbackify(open);
var opendir2 = callbackify(opendir);
var readdir2 = callbackify(readdir);
var readFile2 = callbackify(readFile);
var readlink2 = callbackify(readlink);
var rename2 = callbackify(rename);
var rm2 = callbackify(rm);
var rmdir2 = callbackify(rmdir);
var stat2 = callbackify(stat);
var symlink2 = callbackify(symlink);
var truncate2 = callbackify(truncate);
var unlink2 = callbackify(unlink);
var utimes2 = callbackify(utimes);
var writeFile2 = callbackify(writeFile);
var statfs2 = callbackify(statfs);
var close = /* @__PURE__ */ notImplementedAsync("fs.close");
var createReadStream = /* @__PURE__ */ notImplementedAsync("fs.createReadStream");
var createWriteStream = /* @__PURE__ */ notImplementedAsync("fs.createWriteStream");
var exists = /* @__PURE__ */ notImplementedAsync("fs.exists");
var fchown = /* @__PURE__ */ notImplementedAsync("fs.fchown");
var fchmod = /* @__PURE__ */ notImplementedAsync("fs.fchmod");
var fdatasync = /* @__PURE__ */ notImplementedAsync("fs.fdatasync");
var fstat = /* @__PURE__ */ notImplementedAsync("fs.fstat");
var fsync = /* @__PURE__ */ notImplementedAsync("fs.fsync");
var ftruncate = /* @__PURE__ */ notImplementedAsync("fs.ftruncate");
var futimes = /* @__PURE__ */ notImplementedAsync("fs.futimes");
var lstatSync = /* @__PURE__ */ notImplementedAsync("fs.lstatSync");
var read = /* @__PURE__ */ notImplementedAsync("fs.read");
var readv = /* @__PURE__ */ notImplementedAsync("fs.readv");
var realpathSync = /* @__PURE__ */ notImplementedAsync("fs.realpathSync");
var statSync = /* @__PURE__ */ notImplementedAsync("fs.statSync");
var unwatchFile = /* @__PURE__ */ notImplementedAsync("fs.unwatchFile");
var watch2 = /* @__PURE__ */ notImplementedAsync("fs.watch");
var watchFile = /* @__PURE__ */ notImplementedAsync("fs.watchFile");
var write = /* @__PURE__ */ notImplementedAsync("fs.write");
var writev = /* @__PURE__ */ notImplementedAsync("fs.writev");
var _toUnixTimestamp = /* @__PURE__ */ notImplementedAsync("fs._toUnixTimestamp");
var openAsBlob = /* @__PURE__ */ notImplementedAsync("fs.openAsBlob");
var glob2 = /* @__PURE__ */ notImplementedAsync("fs.glob");
var appendFileSync = /* @__PURE__ */ notImplemented("fs.appendFileSync");
var accessSync = /* @__PURE__ */ notImplemented("fs.accessSync");
var chownSync = /* @__PURE__ */ notImplemented("fs.chownSync");
var chmodSync = /* @__PURE__ */ notImplemented("fs.chmodSync");
var closeSync = /* @__PURE__ */ notImplemented("fs.closeSync");
var copyFileSync = /* @__PURE__ */ notImplemented("fs.copyFileSync");
var cpSync = /* @__PURE__ */ notImplemented("fs.cpSync");
var existsSync = /* @__PURE__ */ __name(() => false, "existsSync");
var fchownSync = /* @__PURE__ */ notImplemented("fs.fchownSync");
var fchmodSync = /* @__PURE__ */ notImplemented("fs.fchmodSync");
var fdatasyncSync = /* @__PURE__ */ notImplemented("fs.fdatasyncSync");
var fstatSync = /* @__PURE__ */ notImplemented("fs.fstatSync");
var fsyncSync = /* @__PURE__ */ notImplemented("fs.fsyncSync");
var ftruncateSync = /* @__PURE__ */ notImplemented("fs.ftruncateSync");
var futimesSync = /* @__PURE__ */ notImplemented("fs.futimesSync");
var lchownSync = /* @__PURE__ */ notImplemented("fs.lchownSync");
var lchmodSync = /* @__PURE__ */ notImplemented("fs.lchmodSync");
var linkSync = /* @__PURE__ */ notImplemented("fs.linkSync");
var lutimesSync = /* @__PURE__ */ notImplemented("fs.lutimesSync");
var mkdirSync = /* @__PURE__ */ notImplemented("fs.mkdirSync");
var mkdtempSync = /* @__PURE__ */ notImplemented("fs.mkdtempSync");
var openSync = /* @__PURE__ */ notImplemented("fs.openSync");
var opendirSync = /* @__PURE__ */ notImplemented("fs.opendirSync");
var readdirSync = /* @__PURE__ */ notImplemented("fs.readdirSync");
var readSync = /* @__PURE__ */ notImplemented("fs.readSync");
var readvSync = /* @__PURE__ */ notImplemented("fs.readvSync");
var readFileSync = /* @__PURE__ */ notImplemented("fs.readFileSync");
var readlinkSync = /* @__PURE__ */ notImplemented("fs.readlinkSync");
var renameSync = /* @__PURE__ */ notImplemented("fs.renameSync");
var rmSync = /* @__PURE__ */ notImplemented("fs.rmSync");
var rmdirSync = /* @__PURE__ */ notImplemented("fs.rmdirSync");
var symlinkSync = /* @__PURE__ */ notImplemented("fs.symlinkSync");
var truncateSync = /* @__PURE__ */ notImplemented("fs.truncateSync");
var unlinkSync = /* @__PURE__ */ notImplemented("fs.unlinkSync");
var utimesSync = /* @__PURE__ */ notImplemented("fs.utimesSync");
var writeFileSync = /* @__PURE__ */ notImplemented("fs.writeFileSync");
var writeSync = /* @__PURE__ */ notImplemented("fs.writeSync");
var writevSync = /* @__PURE__ */ notImplemented("fs.writevSync");
var statfsSync = /* @__PURE__ */ notImplemented("fs.statfsSync");
var globSync = /* @__PURE__ */ notImplemented("fs.globSync");

// node_modules/unenv/dist/runtime/node/fs.mjs
var fs_default = {
  F_OK,
  R_OK,
  W_OK,
  X_OK,
  constants: constants_exports,
  promises: promises_default,
  Dir,
  Dirent,
  FileReadStream,
  FileWriteStream,
  ReadStream: ReadStream2,
  Stats,
  WriteStream: WriteStream2,
  _toUnixTimestamp,
  access: access2,
  accessSync,
  appendFile: appendFile2,
  appendFileSync,
  chmod: chmod2,
  chmodSync,
  chown: chown2,
  chownSync,
  close,
  closeSync,
  copyFile: copyFile2,
  copyFileSync,
  cp: cp2,
  cpSync,
  createReadStream,
  createWriteStream,
  exists,
  existsSync,
  fchmod,
  fchmodSync,
  fchown,
  fchownSync,
  fdatasync,
  fdatasyncSync,
  fstat,
  fstatSync,
  fsync,
  fsyncSync,
  ftruncate,
  ftruncateSync,
  futimes,
  futimesSync,
  glob: glob2,
  lchmod: lchmod2,
  globSync,
  lchmodSync,
  lchown: lchown2,
  lchownSync,
  link: link2,
  linkSync,
  lstat: lstat2,
  lstatSync,
  lutimes: lutimes2,
  lutimesSync,
  mkdir: mkdir2,
  mkdirSync,
  mkdtemp: mkdtemp2,
  mkdtempSync,
  open: open2,
  openAsBlob,
  openSync,
  opendir: opendir2,
  opendirSync,
  read,
  readFile: readFile2,
  readFileSync,
  readSync,
  readdir: readdir2,
  readdirSync,
  readlink: readlink2,
  readlinkSync,
  readv,
  readvSync,
  realpath: realpath2,
  realpathSync,
  rename: rename2,
  renameSync,
  rm: rm2,
  rmSync,
  rmdir: rmdir2,
  rmdirSync,
  stat: stat2,
  statSync,
  statfs: statfs2,
  statfsSync,
  symlink: symlink2,
  symlinkSync,
  truncate: truncate2,
  truncateSync,
  unlink: unlink2,
  unlinkSync,
  unwatchFile,
  utimes: utimes2,
  utimesSync,
  watch: watch2,
  watchFile,
  write,
  writeFile: writeFile2,
  writeFileSync,
  writeSync,
  writev,
  writevSync
};

// src/services/campaign/campaign.routes.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/campaign/campaign.service.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/middleware/error.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var AppError = class extends Error {
  constructor(message, code = ERROR_CODES.UNKNOWN, statusCode = HTTP_STATUS.INTERNAL_ERROR, details) {
    super(message);
    this.message = message;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = "AppError";
  }
  static {
    __name(this, "AppError");
  }
};
var ValidationError = class extends AppError {
  static {
    __name(this, "ValidationError");
  }
  constructor(message, details) {
    super(message, ERROR_CODES.VALIDATION, HTTP_STATUS.BAD_REQUEST, details);
    this.name = "ValidationError";
  }
};
var NotFoundError = class extends AppError {
  static {
    __name(this, "NotFoundError");
  }
  constructor(message = "Resource not found") {
    super(message, ERROR_CODES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    this.name = "NotFoundError";
  }
};
var DuplicateError = class extends AppError {
  static {
    __name(this, "DuplicateError");
  }
  constructor(message) {
    super(message, ERROR_CODES.DUPLICATE, HTTP_STATUS.CONFLICT);
    this.name = "DuplicateError";
  }
};

// src/services/campaign/campaign.service.ts
var CampaignService = class {
  static {
    __name(this, "CampaignService");
  }
  repo;
  trafficRepo;
  constructor(env2) {
    const db = getD1Connection(env2);
    this.repo = new CampaignRepository(db);
    this.trafficRepo = new TrafficRepository(db);
  }
  /**
   * 创建 Campaign
   */
  async create(data) {
    const exists2 = await this.repo.aliasExists(data.alias);
    if (exists2) {
      throw new DuplicateError(`Campaign with alias "${data.alias}" already exists`);
    }
    return this.repo.create(data);
  }
  /**
   * 获取 Campaign 详情
   */
  async getById(id) {
    const campaign = await this.repo.findById(id);
    if (!campaign) {
      throw new NotFoundError("Campaign not found");
    }
    return campaign;
  }
  /**
   * 获取 Campaign 列表
   */
  async getList(query) {
    return this.repo.findList(query);
  }
  /**
   * 更新 Campaign
   */
  async update(id, data) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError("Campaign not found");
    }
    if (data.alias && data.alias !== existing.alias) {
      const aliasExists = await this.repo.aliasExists(data.alias, id);
      if (aliasExists) {
        throw new DuplicateError(`Campaign with alias "${data.alias}" already exists`);
      }
    }
    const updated = await this.repo.update(id, data);
    return updated;
  }
  /**
   * 删除 Campaign（硬删除）
   */
  async delete(id) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError("Campaign not found");
    }
    await this.repo.deleteById(id);
  }
  /**
   * 暂停 Campaign
   */
  async pause(id) {
    return this.update(id, { status: "paused" });
  }
  /**
   * 激活 Campaign
   */
  async activate(id) {
    return this.update(id, { status: "active" });
  }
  /**
   * 获取活跃的 Campaign 列表
   */
  async getActive() {
    return this.repo.findByStatus("active");
  }
  /**
   * 重新生成 API Token
   */
  async regenerateApiToken(id) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError("Campaign not found");
    }
    return this.repo.regenerateApiToken(id);
  }
  /**
   * 按 API Token 查询
   */
  async getByApiToken(apiToken) {
    const campaign = await this.repo.findByApiToken(apiToken);
    if (!campaign) {
      throw new NotFoundError("Campaign not found");
    }
    return campaign;
  }
  /**
   * 获取 Campaign 统计数据
   */
  async getStats(id, startDate, endDate) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError("Campaign not found");
    }
    const end = endDate || (/* @__PURE__ */ new Date()).toISOString();
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3).toISOString();
    const metrics = await this.trafficRepo.getCampaignMetrics(id, start, end);
    return {
      clicks: metrics.clicks,
      uniqueClicks: metrics.uniqueClicks || metrics.clicks,
      conversions: metrics.conversions,
      revenue: metrics.revenue,
      cost: metrics.cost || metrics.spend,
      profit: metrics.profit || metrics.revenue - metrics.spend,
      roi: metrics.roi,
      epc: metrics.epc,
      cpa: metrics.cpa,
      cr: metrics.cr
    };
  }
};

// src/services/campaign/campaign.routes.ts
function createCampaignRouter() {
  const router2 = new Hono2();
  router2.get("/", async (c) => {
    const query = {
      page: parseInt(c.req.query("page") || "1"),
      pageSize: parseInt(c.req.query("pageSize") || "20"),
      status: c.req.query("status"),
      search: c.req.query("search")
    };
    const { page, pageSize } = validatePagination(query.page, query.pageSize);
    const service = new CampaignService(c.env);
    const result = await service.getList({ ...query, page, pageSize });
    return c.json(success(result.list, {
      page,
      pageSize,
      total: result.total
    }));
  });
  router2.get("/active", async (c) => {
    const service = new CampaignService(c.env);
    const campaigns = await service.getActive();
    return c.json(success(campaigns));
  });
  router2.get("/:id", async (c) => {
    const id = c.req.param("id");
    const service = new CampaignService(c.env);
    try {
      const campaign = await service.getById(id);
      return c.json(success(campaign));
    } catch (err) {
      if (err instanceof Error && err.message === "Campaign not found") {
        return c.json(error3("Campaign not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.post("/", async (c) => {
    const body = await c.req.json();
    const nameValidation = validateRequired(body.name, "name");
    if (!nameValidation.valid) {
      return c.json(error3(nameValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const aliasValidation = validateStringLength(body.alias, 2, 50, "alias");
    if (!aliasValidation.valid) {
      return c.json(error3(aliasValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const domainValidation = validateRequired(body.domain, "domain");
    if (!domainValidation.valid) {
      return c.json(error3(domainValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const service = new CampaignService(c.env);
    try {
      const campaign = await service.create(body);
      return c.json(success(campaign), HTTP_STATUS.CREATED);
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        return c.json(error3(err.message, ERROR_CODES.DUPLICATE), HTTP_STATUS.CONFLICT);
      }
      throw err;
    }
  });
  router2.put("/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const service = new CampaignService(c.env);
    try {
      const campaign = await service.update(id, body);
      return c.json(success(campaign));
    } catch (err) {
      if (err instanceof Error && err.message === "Campaign not found") {
        return c.json(error3("Campaign not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      if (err instanceof Error && err.message.includes("already exists")) {
        return c.json(error3(err.message, ERROR_CODES.DUPLICATE), HTTP_STATUS.CONFLICT);
      }
      throw err;
    }
  });
  router2.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const service = new CampaignService(c.env);
    try {
      await service.delete(id);
      return c.json(success({ deleted: true }));
    } catch (err) {
      if (err instanceof Error && err.message === "Campaign not found") {
        return c.json(error3("Campaign not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.post("/:id/pause", async (c) => {
    const id = c.req.param("id");
    const service = new CampaignService(c.env);
    try {
      const campaign = await service.pause(id);
      return c.json(success(campaign));
    } catch (err) {
      if (err instanceof Error && err.message === "Campaign not found") {
        return c.json(error3("Campaign not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.post("/:id/activate", async (c) => {
    const id = c.req.param("id");
    const service = new CampaignService(c.env);
    try {
      const campaign = await service.activate(id);
      return c.json(success(campaign));
    } catch (err) {
      if (err instanceof Error && err.message === "Campaign not found") {
        return c.json(error3("Campaign not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.post("/:id/regenerate-token", async (c) => {
    const id = c.req.param("id");
    const service = new CampaignService(c.env);
    try {
      const apiToken = await service.regenerateApiToken(id);
      return c.json(success({ apiToken }));
    } catch (err) {
      if (err instanceof Error && err.message === "Campaign not found") {
        return c.json(error3("Campaign not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.get("/by-token/:token", async (c) => {
    const token = c.req.param("token");
    const service = new CampaignService(c.env);
    try {
      const campaign = await service.getByApiToken(token);
      return c.json(success(campaign));
    } catch (err) {
      if (err instanceof Error && err.message === "Campaign not found") {
        return c.json(error3("Campaign not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.get("/:id/stats", async (c) => {
    const id = c.req.param("id");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    const service = new CampaignService(c.env);
    try {
      const stats = await service.getStats(id, startDate || void 0, endDate || void 0);
      return c.json(success(stats));
    } catch (err) {
      if (err instanceof Error && err.message === "Campaign not found") {
        return c.json(error3("Campaign not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  return router2;
}
__name(createCampaignRouter, "createCampaignRouter");

// src/services/flow/flow.routes.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/flow/flow.service.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/flow/flow.validator.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_flow_filters();
var FlowValidator = class {
  static {
    __name(this, "FlowValidator");
  }
  /**
   * 验证 Flow Schema 是否有效
   * @param schema - Flow Schema
   * @returns 是否有效
   */
  static validateSchema(schema) {
    const errors = [];
    if (!schema.flow?.id) {
      errors.push("Flow ID is required");
    }
    if (!schema.flow?.campaignId) {
      errors.push("Campaign ID is required");
    }
    if (!schema.flow?.name) {
      errors.push("Flow name is required");
    }
    if (!Array.isArray(schema.rules)) {
      errors.push("Rules must be an array");
    } else {
      schema.rules.forEach((rule, index) => {
        const ruleErrors = this.validateRule(rule);
        if (ruleErrors.length > 0) {
          errors.push(`Rule ${index + 1} (${rule.name || "unnamed"}): ${ruleErrors.join(", ")}`);
        }
      });
    }
    if (!schema.defaultAction) {
      errors.push("Default action is required");
    } else {
      const actionErrors = this.validateAction(schema.defaultAction);
      if (actionErrors.length > 0) {
        errors.push(`Default action: ${actionErrors.join(", ")}`);
      }
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }
  /**
   * 验证单个规则
   * @param rule - Flow 规则
   * @returns 错误列表
   */
  static validateRule(rule) {
    const errors = [];
    if (!rule.id) {
      errors.push("Rule ID is required");
    }
    if (!rule.name) {
      errors.push("Rule name is required");
    }
    if (!rule.flowId) {
      errors.push("Flow ID is required");
    }
    if (typeof rule.priority !== "number") {
      errors.push("Priority must be a number");
    }
    if (!rule.condition) {
      errors.push("Condition is required");
    } else {
      const conditionErrors = this.validateFilterGroup(rule.condition);
      if (conditionErrors.length > 0) {
        errors.push(...conditionErrors);
      }
    }
    if (!rule.action) {
      errors.push("Action is required");
    } else {
      const actionErrors = this.validateAction(rule.action);
      if (actionErrors.length > 0) {
        errors.push(...actionErrors);
      }
    }
    return errors;
  }
  /**
   * 验证过滤器组
   * @param group - 过滤器组
   * @returns 错误列表
   */
  static validateFilterGroup(group3) {
    const errors = [];
    if (!group3.id) {
      errors.push("Group ID is required");
    }
    if (!group3.logic || !["AND", "OR"].includes(group3.logic)) {
      errors.push("Logic must be AND or OR");
    }
    if (!Array.isArray(group3.filters)) {
      errors.push("Filters must be an array");
    } else {
      group3.filters.forEach((filter, index) => {
        const filterErrors = this.validateFilter(filter);
        if (filterErrors.length > 0) {
          errors.push(`Filter ${index + 1}: ${filterErrors.join(", ")}`);
        }
      });
    }
    if (group3.groups) {
      group3.groups.forEach((subGroup, index) => {
        const subGroupErrors = this.validateFilterGroup(subGroup);
        if (subGroupErrors.length > 0) {
          errors.push(`Sub-group ${index + 1}: ${subGroupErrors.join(", ")}`);
        }
      });
    }
    return errors;
  }
  /**
   * 验证单个过滤器
   * @param filter - 过滤器
   * @returns 错误列表
   */
  static validateFilter(filter) {
    const errors = [];
    if (!filter.id) {
      errors.push("Filter ID is required");
    }
    if (!filter.target) {
      errors.push("Target is required");
    }
    if (!filter.operator) {
      errors.push("Operator is required");
    }
    const validOperators = [
      "equals",
      "notEquals",
      "contains",
      "notContains",
      "startsWith",
      "endsWith",
      "regex",
      "in",
      "notIn",
      "greaterThan",
      "lessThan",
      "greaterOrEquals",
      "lessOrEquals",
      "between",
      "exists",
      "notExists"
    ];
    if (filter.operator && !validOperators.includes(filter.operator)) {
      errors.push(`Invalid operator: ${filter.operator}`);
    }
    const noValueOperators = ["exists", "notExists"];
    if (!noValueOperators.includes(filter.operator) && filter.value === void 0) {
      errors.push("Value is required for this operator");
    }
    return errors;
  }
  /**
   * 验证动作配置
   * @param action - 动作配置
   * @returns 错误列表
   */
  static validateAction(action) {
    const errors = [];
    if (!action.type) {
      errors.push("Action type is required");
    }
    const validTypes = ["allow", "block", "redirect", "showPage", "showOffer"];
    if (action.type && !validTypes.includes(action.type)) {
      errors.push(`Invalid action type: ${action.type}`);
    }
    if (action.type === "redirect" && !action.redirectUrl) {
      errors.push("Redirect URL is required for redirect action");
    }
    if (action.type === "showPage" && !action.targetId) {
      errors.push("Target ID is required for showPage action");
    }
    if (action.type === "showOffer" && !action.targetId) {
      errors.push("Target ID is required for showOffer action");
    }
    return errors;
  }
  /**
   * 执行 Flow 验证
   * @param schema - Flow Schema
   * @param context - 验证上下文
   * @returns 验证结果
   */
  static validate(schema, context2) {
    const startTime = Date.now();
    const ruleResults = [];
    const sortedRules = [...schema.rules].filter((rule) => rule.status === "active").sort((a, b) => a.priority - b.priority);
    for (const rule of sortedRules) {
      const result = this.validateRuleAgainstContext(rule, context2);
      ruleResults.push(result);
      if (result.matched) {
        const durationMs2 = Date.now() - startTime;
        return {
          passed: true,
          matchedRule: result,
          action: result.action,
          ruleResults,
          validatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          durationMs: durationMs2
        };
      }
    }
    const durationMs = Date.now() - startTime;
    return {
      passed: true,
      action: schema.defaultAction,
      ruleResults,
      validatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      durationMs
    };
  }
  /**
   * 验证规则是否匹配上下文
   * @param rule - Flow 规则
   * @param context - 验证上下文
   * @returns 规则验证结果
   */
  static validateRuleAgainstContext(rule, context2) {
    const matchedFilters = [];
    const isMatched = this.validateFilterGroupAgainstContext(
      rule.condition,
      context2,
      matchedFilters
    );
    return {
      matched: isMatched,
      ruleId: rule.id,
      ruleName: rule.name,
      action: rule.action,
      matchedFilters: isMatched ? matchedFilters : void 0,
      priority: rule.priority
    };
  }
  /**
   * 验证过滤器组是否匹配上下文
   * @param group - 过滤器组
   * @param context - 验证上下文
   * @param matchedFilters - 匹配的过滤器列表（用于收集）
   * @returns 是否匹配
   */
  static validateFilterGroupAgainstContext(group3, context2, matchedFilters) {
    if (!group3.enabled) {
      return true;
    }
    const results = [];
    for (const filter of group3.filters) {
      if (!filter.enabled) {
        results.push(true);
        continue;
      }
      const isMatched = this.validateFilterAgainstContext(filter, context2);
      results.push(isMatched);
      if (isMatched) {
        matchedFilters.push({
          valid: true,
          matchedFilterId: filter.id,
          matchedValue: getContextValue(filter.target, context2)
        });
      }
    }
    if (group3.groups) {
      for (const subGroup of group3.groups) {
        const isMatched = this.validateFilterGroupAgainstContext(subGroup, context2, matchedFilters);
        results.push(isMatched);
      }
    }
    if (group3.logic === "AND") {
      return results.every((r) => r);
    } else {
      return results.some((r) => r);
    }
  }
  /**
   * 验证单个过滤器是否匹配上下文
   * @param filter - 过滤器
   * @param context - 验证上下文
   * @returns 是否匹配
   */
  static validateFilterAgainstContext(filter, context2) {
    const contextValue = getContextValue(filter.target, context2);
    return executeFilter(filter.operator, contextValue, filter.value, context2);
  }
  /**
   * 从请求构建验证上下文
   * @param request - HTTP 请求
   * @param visitData - 访问数据
   * @returns 验证上下文
   */
  static buildContext(request, visitData = {}) {
    const url = new URL(request.url);
    const userAgent = request.headers.get("user-agent") || "";
    const cf = request.cf;
    const now = /* @__PURE__ */ new Date();
    const hourOfDay = now.getHours();
    const dayOfWeek = now.getDay();
    const timestamp = now.getTime();
    const country = cf?.country;
    const region = cf?.region;
    const city = cf?.city;
    const isp = cf?.asn?.toString();
    const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const deviceType = this.parseDeviceType(userAgent);
    const os = this.parseOS(userAgent);
    const browser = this.parseBrowser(userAgent);
    const language = request.headers.get("accept-language")?.split(",")[0] || "";
    return {
      visitor: {
        ip,
        country,
        region,
        city,
        isp,
        connection: cf?.httpProtocol,
        deviceType,
        os,
        browser,
        language,
        userAgent
      },
      visit: {
        referrer: visitData.referrer || request.headers.get("referer") || "",
        source: visitData.source || url.searchParams.get("source") || url.searchParams.get("utm_source") || "",
        medium: visitData.medium || url.searchParams.get("medium") || url.searchParams.get("utm_medium") || "",
        campaign: visitData.campaign || url.searchParams.get("campaign") || url.searchParams.get("utm_campaign") || "",
        subId: visitData.subId || url.searchParams.get("sub_id") || "",
        clickId: visitData.clickId || "",
        timestamp,
        hourOfDay,
        dayOfWeek,
        visitsCount: visitData.visitsCount || 1,
        firstVisit: visitData.firstVisit ?? true,
        returning: visitData.returning ?? false
      }
    };
  }
  /**
   * 解析设备类型
   */
  static parseDeviceType(ua) {
    if (/iPhone|Android.*Mobile|Windows Phone/i.test(ua)) {
      return "mobile";
    }
    if (/iPad|Android(?!.*Mobile)/i.test(ua)) {
      return "tablet";
    }
    return "desktop";
  }
  /**
   * 解析操作系统
   */
  static parseOS(ua) {
    if (/Windows NT 10/.test(ua)) return "Windows 10";
    if (/Windows NT 6.3/.test(ua)) return "Windows 8.1";
    if (/Windows NT 6.2/.test(ua)) return "Windows 8";
    if (/Windows NT 6.1/.test(ua)) return "Windows 7";
    if (/Mac OS X/.test(ua)) return "macOS";
    if (/Linux/.test(ua)) return "Linux";
    if (/Android/.test(ua)) return "Android";
    if (/iOS|iPhone|iPad/.test(ua)) return "iOS";
    return "Unknown";
  }
  /**
   * 解析浏览器
   */
  static parseBrowser(ua) {
    if (/Chrome/.test(ua) && !/Edge/.test(ua)) return "Chrome";
    if (/Safari/.test(ua) && !/Chrome/.test(ua)) return "Safari";
    if (/Firefox/.test(ua)) return "Firefox";
    if (/Edge/.test(ua)) return "Edge";
    if (/Opera|OPR/.test(ua)) return "Opera";
    if (/MSIE|Trident/.test(ua)) return "IE";
    return "Unknown";
  }
};

// src/services/flow/flow.service.ts
var FlowService = class {
  static {
    __name(this, "FlowService");
  }
  repo;
  campaignRepo;
  constructor(env2) {
    const db = getD1Connection(env2);
    this.repo = new FlowRepository(db);
    this.campaignRepo = new CampaignRepository(db);
  }
  /**
   * 创建 Flow
   */
  async create(data) {
    const campaign = await this.campaignRepo.findById(data.campaignId);
    if (!campaign) {
      throw new NotFoundError("Campaign not found");
    }
    return this.repo.create(data);
  }
  /**
   * 获取 Flow 详情
   */
  async getById(id) {
    const flow = await this.repo.findById(id);
    if (!flow) {
      throw new NotFoundError("Flow not found");
    }
    return flow;
  }
  /**
   * 按 Campaign ID 获取 Flow 列表
   */
  async getByCampaignId(campaignId) {
    return this.repo.findByCampaignId(campaignId);
  }
  /**
   * 获取活跃的 Flow 列表
   */
  async getActiveByCampaignId(campaignId) {
    return this.repo.findByCampaignIdAndStatus(campaignId, "active");
  }
  /**
   * 更新 Flow
   */
  async update(id, data) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError("Flow not found");
    }
    const updated = await this.repo.update(id, data);
    return updated;
  }
  /**
   * 删除 Flow（硬删除）
   */
  async delete(id) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError("Flow not found");
    }
    await this.repo.deleteById(id);
  }
  /**
   * 添加 Landing Page 到 Flow
   */
  async addLandingPage(flowId, landingPageId, weight) {
    const flow = await this.repo.findById(flowId);
    if (!flow) {
      throw new NotFoundError("Flow not found");
    }
    return this.repo.addLandingPage(flowId, landingPageId, weight);
  }
  /**
   * 添加 Offer 到 Flow
   */
  async addOffer(flowId, offerId, weight) {
    const flow = await this.repo.findById(flowId);
    if (!flow) {
      throw new NotFoundError("Flow not found");
    }
    return this.repo.addOffer(flowId, offerId, weight);
  }
  /**
   * 获取 Flow 的 Landing Pages
   */
  async getLandingPages(flowId) {
    return this.repo.getLandingPages(flowId);
  }
  /**
   * 获取 Flow 的 Offers
   */
  async getOffers(flowId) {
    return this.repo.getOffers(flowId);
  }
  /**
   * 移除 Flow 的 Landing Page
   */
  async removeLandingPage(flowId, landingPageId) {
    await this.repo.removeLandingPage(flowId, landingPageId);
  }
  /**
   * 移除 Flow 的 Offer
   */
  async removeOffer(flowId, offerId) {
    await this.repo.removeOffer(flowId, offerId);
  }
  // ==================== Flow Schema & Rules ====================
  /**
   * 获取 Flow 完整 Schema（包含规则）
   */
  async getFlowSchema(flowId) {
    const flow = await this.repo.findById(flowId);
    if (!flow) {
      return null;
    }
    const rules = await this.repo.getFlowRules(flowId);
    return {
      flow: {
        id: flow.id,
        campaignId: flow.campaignId,
        name: flow.name,
        type: flow.type,
        weight: flow.weight,
        status: flow.status
      },
      rules: rules.filter((r) => r.status !== "deleted"),
      defaultAction: {
        type: "allow",
        weight: 100
      },
      version: "1.0",
      updatedAt: flow.updatedAt
    };
  }
  /**
   * 验证 Flow Schema
   */
  validateSchema(schema) {
    return FlowValidator.validateSchema(schema);
  }
  /**
   * 执行 Flow 验证
   */
  async executeValidation(flowId, context2) {
    const schema = await this.getFlowSchema(flowId);
    if (!schema) {
      throw new NotFoundError("Flow not found");
    }
    return FlowValidator.validate(schema, context2);
  }
  /**
   * 创建 Flow 规则
   */
  async createRule(data) {
    const flow = await this.repo.findById(data.flowId);
    if (!flow) {
      throw new NotFoundError("Flow not found");
    }
    const tempSchema = {
      flow: {
        id: flow.id,
        campaignId: flow.campaignId,
        name: flow.name,
        type: flow.type,
        weight: flow.weight,
        status: flow.status
      },
      rules: [{
        id: "temp",
        name: data.name,
        flowId: data.flowId,
        priority: data.priority ?? 0,
        condition: data.condition,
        action: data.action,
        status: "active",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }],
      defaultAction: { type: "allow" },
      version: "1.0",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const validation = this.validateSchema(tempSchema);
    if (!validation.valid) {
      throw new Error(`Invalid rule: ${validation.errors.join(", ")}`);
    }
    return this.repo.createFlowRule(data);
  }
  /**
   * 更新 Flow 规则
   */
  async updateRule(ruleId, data) {
    const rule = await this.repo.getFlowRuleById(ruleId);
    if (!rule) {
      throw new NotFoundError("Rule not found");
    }
    const updated = await this.repo.updateFlowRule(ruleId, data);
    if (!updated) {
      throw new NotFoundError("Rule not found after update");
    }
    return updated;
  }
  /**
   * 删除 Flow 规则
   */
  async deleteRule(ruleId) {
    const rule = await this.repo.getFlowRuleById(ruleId);
    if (!rule) {
      throw new NotFoundError("Rule not found");
    }
    await this.repo.updateFlowRule(ruleId, { status: "deleted" });
  }
  /**
   * 获取 Flow 的所有规则
   */
  async getFlowRules(flowId) {
    return this.repo.getFlowRules(flowId);
  }
  /**
   * 获取单个规则详情
   */
  async getRuleById(ruleId) {
    return this.repo.getFlowRuleById(ruleId);
  }
  // ==================== Flow Statistics ====================
  /**
   * 获取 Flow 统计数据
   */
  async getFlowStats(flowId, query) {
    const stats = await this.repo.getFlowStats(flowId, query);
    if (!stats) {
      throw new NotFoundError("Flow not found");
    }
    return stats;
  }
  /**
   * 获取 Campaign 下所有 Flow 的统计数据
   */
  async getCampaignFlowStats(campaignId, query) {
    return this.repo.getCampaignFlowStats(campaignId, query);
  }
  /**
   * 克隆 Flow
   */
  async clone(flowId) {
    const original = await this.repo.findById(flowId);
    if (!original) {
      throw new NotFoundError("Flow not found");
    }
    const clonedName = `${original.name} (Copy)`;
    const clonedFlow = await this.repo.create({
      campaignId: original.campaignId,
      name: clonedName,
      type: original.type,
      weight: original.weight
    });
    if (original.filters && original.filters.length > 0) {
      await this.repo.update(clonedFlow.id, {
        filters: original.filters.map((f) => ({
          ...f,
          id: crypto.randomUUID()
        }))
      });
    }
    const landingPages = await this.repo.getLandingPages(flowId);
    for (const lp of landingPages) {
      await this.repo.addLandingPage(clonedFlow.id, lp.landingPageId, lp.weight);
    }
    const offers = await this.repo.getOffers(flowId);
    for (const offer of offers) {
      await this.repo.addOffer(clonedFlow.id, offer.offerId, offer.weight);
    }
    return this.repo.findById(clonedFlow.id);
  }
};

// src/services/flow/flow.log.service.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var FlowLogService = class {
  static {
    __name(this, "FlowLogService");
  }
  kv = null;
  constructor(env2) {
    this.kv = env2.TRAFFIC_LOGS || null;
  }
  /**
   * 记录 Flow 执行日志
   */
  async log(entry) {
    if (!this.kv) {
      console.warn("Traffic logs KV not configured, skipping log");
      return null;
    }
    const id = crypto.randomUUID();
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const log4 = {
      ...entry,
      id,
      timestamp
    };
    const key = this.getLogKey(log4);
    const ttl = 7 * 24 * 60 * 60;
    try {
      await this.kv.put(key, JSON.stringify(log4), { expirationTtl: ttl });
      await this.addToIndex(log4);
      return log4;
    } catch (err) {
      console.error("Failed to log flow execution:", err);
      return null;
    }
  }
  /**
   * 查询日志列表
   */
  async query(query) {
    if (!this.kv) {
      return { logs: [], total: 0, hasMore: false };
    }
    const limit = query.limit || 50;
    const offset = query.offset || 0;
    try {
      let logs = [];
      if (query.flowId) {
        logs = await this.getLogsByFlow(query.flowId);
      } else if (query.campaignId) {
        logs = await this.getLogsByCampaign(query.campaignId);
      } else {
        logs = await this.getRecentLogs(limit + offset + 1);
      }
      if (query.startDate || query.endDate) {
        logs = logs.filter((log4) => {
          const logTime = new Date(log4.timestamp).getTime();
          if (query.startDate && logTime < new Date(query.startDate).getTime()) {
            return false;
          }
          if (query.endDate && logTime > new Date(query.endDate).getTime()) {
            return false;
          }
          return true;
        });
      }
      const total = logs.length;
      const paginatedLogs = logs.slice(offset, offset + limit);
      return {
        logs: paginatedLogs,
        total,
        hasMore: offset + limit < total
      };
    } catch (err) {
      console.error("Failed to query flow logs:", err);
      return { logs: [], total: 0, hasMore: false };
    }
  }
  /**
   * 获取单个日志详情
   */
  async getById(id) {
    if (!this.kv) return null;
    try {
      const log4 = await this.kv.get(`log:${id}`, "json");
      return log4;
    } catch (err) {
      console.error("Failed to get log by id:", err);
      return null;
    }
  }
  /**
   * 清除 Flow 的所有日志
   */
  async clearFlowLogs(flowId) {
    if (!this.kv) return 0;
    try {
      const keys = await this.kv.list({ prefix: `flow:${flowId}:` });
      let deleted = 0;
      for await (const key of keys.keys) {
        await this.kv.delete(key.name);
        deleted++;
      }
      return deleted;
    } catch (err) {
      console.error("Failed to clear flow logs:", err);
      return 0;
    }
  }
  // ==================== Private Methods ====================
  getLogKey(log4) {
    return `log:${log4.id}`;
  }
  async addToIndex(log4) {
    if (!this.kv) return;
    const indexKey = `flow:${log4.flowId}:${log4.timestamp}`;
    const campaignIndexKey = `campaign:${log4.campaignId}:${log4.timestamp}`;
    const recentIndexKey = `recent:${log4.timestamp}`;
    try {
      await this.kv.put(indexKey, log4.id, { expirationTtl: 7 * 24 * 60 * 60 });
      await this.kv.put(campaignIndexKey, log4.id, { expirationTtl: 7 * 24 * 60 * 60 });
      await this.kv.put(recentIndexKey, log4.id, { expirationTtl: 7 * 24 * 60 * 60 });
    } catch (err) {
      console.error("Failed to add log to index:", err);
    }
  }
  async getLogsByFlow(flowId) {
    if (!this.kv) return [];
    const logs = [];
    try {
      const keys = await this.kv.list({ prefix: `flow:${flowId}:`, limit: 100 });
      for await (const key of keys.keys) {
        const logId = await this.kv.get(key.name, "text");
        if (logId) {
          const log4 = await this.kv.get(`log:${logId}`, "json");
          if (log4) logs.push(log4);
        }
      }
    } catch (err) {
      console.error("Failed to get logs by flow:", err);
    }
    return logs.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  async getLogsByCampaign(campaignId) {
    if (!this.kv) return [];
    const logs = [];
    try {
      const keys = await this.kv.list({ prefix: `campaign:${campaignId}:`, limit: 100 });
      for await (const key of keys.keys) {
        const logId = await this.kv.get(key.name, "text");
        if (logId) {
          const log4 = await this.kv.get(`log:${logId}`, "json");
          if (log4) logs.push(log4);
        }
      }
    } catch (err) {
      console.error("Failed to get logs by campaign:", err);
    }
    return logs.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  async getRecentLogs(limit) {
    if (!this.kv) return [];
    const logs = [];
    try {
      const keys = await this.kv.list({ prefix: "recent:", limit });
      for await (const key of keys.keys) {
        const logId = await this.kv.get(key.name, "text");
        if (logId) {
          const log4 = await this.kv.get(`log:${logId}`, "json");
          if (log4) logs.push(log4);
        }
      }
    } catch (err) {
      console.error("Failed to get recent logs:", err);
    }
    return logs.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
};

// src/services/flow/flow.routes.ts
init_flow_filters();
function createFlowRouter() {
  const router2 = new Hono2();
  router2.get("/campaign/:campaignId", async (c) => {
    const campaignId = c.req.param("campaignId");
    const service = new FlowService(c.env);
    const flows = await service.getByCampaignId(campaignId);
    return c.json(success(flows));
  });
  router2.get("/campaign/:campaignId/active", async (c) => {
    const campaignId = c.req.param("campaignId");
    const service = new FlowService(c.env);
    const flows = await service.getActiveByCampaignId(campaignId);
    return c.json(success(flows));
  });
  router2.get("/:id", async (c) => {
    const id = c.req.param("id");
    const service = new FlowService(c.env);
    try {
      const flow = await service.getById(id);
      return c.json(success(flow));
    } catch (err) {
      if (err instanceof Error && err.message === "Flow not found") {
        return c.json(error3("Flow not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.get("/:id/landing-pages", async (c) => {
    const id = c.req.param("id");
    const service = new FlowService(c.env);
    const lps = await service.getLandingPages(id);
    return c.json(success(lps));
  });
  router2.get("/:id/offers", async (c) => {
    const id = c.req.param("id");
    const service = new FlowService(c.env);
    const offers = await service.getOffers(id);
    return c.json(success(offers));
  });
  router2.post("/", async (c) => {
    const body = await c.req.json();
    const nameValidation = validateRequired(body.name, "name");
    if (!nameValidation.valid) {
      return c.json(error3(nameValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const campaignValidation = validateRequired(body.campaignId, "campaignId");
    if (!campaignValidation.valid) {
      return c.json(error3(campaignValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const service = new FlowService(c.env);
    try {
      const flow = await service.create(body);
      return c.json(success(flow), HTTP_STATUS.CREATED);
    } catch (err) {
      if (err instanceof Error && err.message === "Campaign not found") {
        return c.json(error3("Campaign not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.put("/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const service = new FlowService(c.env);
    try {
      const flow = await service.update(id, body);
      return c.json(success(flow));
    } catch (err) {
      if (err instanceof Error && err.message === "Flow not found") {
        return c.json(error3("Flow not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const service = new FlowService(c.env);
    try {
      await service.delete(id);
      return c.json(success({ deleted: true }));
    } catch (err) {
      if (err instanceof Error && err.message === "Flow not found") {
        return c.json(error3("Flow not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.post("/:id/landing-pages", async (c) => {
    const flowId = c.req.param("id");
    const body = await c.req.json();
    const lpValidation = validateRequired(body.landingPageId, "landingPageId");
    if (!lpValidation.valid) {
      return c.json(error3(lpValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const service = new FlowService(c.env);
    try {
      const result = await service.addLandingPage(flowId, body.landingPageId, body.weight);
      return c.json(success(result), HTTP_STATUS.CREATED);
    } catch (err) {
      if (err instanceof Error && err.message === "Flow not found") {
        return c.json(error3("Flow not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.post("/:id/offers", async (c) => {
    const flowId = c.req.param("id");
    const body = await c.req.json();
    const offerValidation = validateRequired(body.offerId, "offerId");
    if (!offerValidation.valid) {
      return c.json(error3(offerValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const service = new FlowService(c.env);
    try {
      const result = await service.addOffer(flowId, body.offerId, body.weight);
      return c.json(success(result), HTTP_STATUS.CREATED);
    } catch (err) {
      if (err instanceof Error && err.message === "Flow not found") {
        return c.json(error3("Flow not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.delete("/:id/landing-pages/:landingPageId", async (c) => {
    const flowId = c.req.param("id");
    const landingPageId = c.req.param("landingPageId");
    const service = new FlowService(c.env);
    await service.removeLandingPage(flowId, landingPageId);
    return c.json(success({ removed: true }));
  });
  router2.delete("/:id/offers/:offerId", async (c) => {
    const flowId = c.req.param("id");
    const offerId = c.req.param("offerId");
    const service = new FlowService(c.env);
    await service.removeOffer(flowId, offerId);
    return c.json(success({ removed: true }));
  });
  router2.get("/:id/schema", async (c) => {
    const id = c.req.param("id");
    const service = new FlowService(c.env);
    const schema = await service.getFlowSchema(id);
    if (!schema) {
      return c.json(error3("Flow not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }
    return c.json(success(schema));
  });
  router2.post("/validate-schema", async (c) => {
    const body = await c.req.json();
    const service = new FlowService(c.env);
    const result = service.validateSchema(body);
    return c.json(success(result));
  });
  router2.post("/:id/test", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const service = new FlowService(c.env);
    try {
      const context2 = FlowValidator.buildContext(c.req.raw, body.visitData || {});
      const result = await service.executeValidation(id, context2);
      return c.json(success(result));
    } catch (err) {
      if (err instanceof Error && err.message === "Flow not found") {
        return c.json(error3("Flow not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.get("/:id/rules", async (c) => {
    const id = c.req.param("id");
    const service = new FlowService(c.env);
    const rules = await service.getFlowRules(id);
    return c.json(success(rules));
  });
  router2.get("/rules/:ruleId", async (c) => {
    const ruleId = c.req.param("ruleId");
    const service = new FlowService(c.env);
    const rule = await service.getRuleById(ruleId);
    if (!rule) {
      return c.json(error3("Rule not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }
    return c.json(success(rule));
  });
  router2.post("/:id/rules", async (c) => {
    const flowId = c.req.param("id");
    const body = await c.req.json();
    const nameValidation = validateRequired(body.name, "name");
    if (!nameValidation.valid) {
      return c.json(error3(nameValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const conditionValidation = validateRequired(body.condition, "condition");
    if (!conditionValidation.valid) {
      return c.json(error3(conditionValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const actionValidation = validateRequired(body.action, "action");
    if (!actionValidation.valid) {
      return c.json(error3(actionValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const service = new FlowService(c.env);
    try {
      const rule = await service.createRule({
        ...body,
        flowId
      });
      return c.json(success(rule), HTTP_STATUS.CREATED);
    } catch (err) {
      if (err instanceof Error && err.message === "Flow not found") {
        return c.json(error3("Flow not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      if (err instanceof Error && err.message.startsWith("Invalid rule")) {
        return c.json(error3(err.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
      }
      throw err;
    }
  });
  router2.put("/rules/:ruleId", async (c) => {
    const ruleId = c.req.param("ruleId");
    const body = await c.req.json();
    const service = new FlowService(c.env);
    try {
      const rule = await service.updateRule(ruleId, body);
      return c.json(success(rule));
    } catch (err) {
      if (err instanceof Error && err.message === "Rule not found") {
        return c.json(error3("Rule not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.delete("/rules/:ruleId", async (c) => {
    const ruleId = c.req.param("ruleId");
    const service = new FlowService(c.env);
    try {
      await service.deleteRule(ruleId);
      return c.json(success({ deleted: true }));
    } catch (err) {
      if (err instanceof Error && err.message === "Rule not found") {
        return c.json(error3("Rule not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.get("/filters/operators", async (c) => {
    const operators = getAvailableOperators();
    return c.json(success(operators));
  });
  router2.get("/filters/targets", async (c) => {
    const targets = getAvailableTargets();
    return c.json(success(targets));
  });
  router2.get("/:id/stats", async (c) => {
    const id = c.req.param("id");
    const service = new FlowService(c.env);
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    const query = {};
    if (startDate) query.startDate = startDate;
    if (endDate) query.endDate = endDate;
    try {
      const stats = await service.getFlowStats(id, Object.keys(query).length > 0 ? query : void 0);
      return c.json(success(stats));
    } catch (err) {
      if (err instanceof Error && err.message === "Flow not found") {
        return c.json(error3("Flow not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.get("/campaign/:campaignId/stats", async (c) => {
    const campaignId = c.req.param("campaignId");
    const service = new FlowService(c.env);
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    const query = {};
    if (startDate) query.startDate = startDate;
    if (endDate) query.endDate = endDate;
    const stats = await service.getCampaignFlowStats(campaignId, Object.keys(query).length > 0 ? query : void 0);
    return c.json(success(stats));
  });
  router2.get("/:id/logs", async (c) => {
    const flowId = c.req.param("id");
    const logService = new FlowLogService(c.env);
    const limit = c.req.query("limit") ? parseInt(c.req.query("limit")) : 50;
    const offset = c.req.query("offset") ? parseInt(c.req.query("offset")) : 0;
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    const result = await logService.query({
      flowId,
      startDate,
      endDate,
      limit,
      offset
    });
    return c.json(success(result));
  });
  router2.get("/campaign/:campaignId/logs", async (c) => {
    const campaignId = c.req.param("campaignId");
    const logService = new FlowLogService(c.env);
    const limit = c.req.query("limit") ? parseInt(c.req.query("limit")) : 50;
    const offset = c.req.query("offset") ? parseInt(c.req.query("offset")) : 0;
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    const result = await logService.query({
      campaignId,
      startDate,
      endDate,
      limit,
      offset
    });
    return c.json(success(result));
  });
  router2.get("/logs/:logId", async (c) => {
    const logId = c.req.param("logId");
    const logService = new FlowLogService(c.env);
    const log4 = await logService.getById(logId);
    if (!log4) {
      return c.json(error3("Log not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }
    return c.json(success(log4));
  });
  router2.delete("/:id/logs", async (c) => {
    const flowId = c.req.param("id");
    const logService = new FlowLogService(c.env);
    const deleted = await logService.clearFlowLogs(flowId);
    return c.json(success({ deleted }));
  });
  router2.post("/batch", async (c) => {
    const body = await c.req.json();
    const { flowIds, action, value } = body;
    if (!flowIds || !Array.isArray(flowIds) || flowIds.length === 0) {
      return c.json(error3("flowIds is required and must be a non-empty array", ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const service = new FlowService(c.env);
    const results = [];
    for (const flowId of flowIds) {
      try {
        if (action === "updateStatus") {
          await service.update(flowId, { status: value });
        } else if (action === "updateWeight") {
          await service.update(flowId, { weight: value });
        } else if (action === "delete") {
          await service.delete(flowId);
        } else {
          throw new Error(`Unknown action: ${action}`);
        }
        results.push({ flowId, success: true });
      } catch (err) {
        results.push({ flowId, success: false, error: err.message });
      }
    }
    return c.json(success({ results }));
  });
  router2.post("/equalize", async (c) => {
    const body = await c.req.json();
    const { campaignId } = body;
    if (!campaignId) {
      return c.json(error3("campaignId is required", ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const service = new FlowService(c.env);
    const flows = await service.getByCampaignId(campaignId);
    const activeFlows = flows.filter((f) => f.status === "active" && f.type !== "default");
    if (activeFlows.length === 0) {
      return c.json(success({ message: "No active flows to equalize" }));
    }
    const equalWeight = Math.floor(100 / activeFlows.length);
    const remainder = 100 % activeFlows.length;
    const results = [];
    for (let i = 0; i < activeFlows.length; i++) {
      const flow = activeFlows[i];
      const newWeight = equalWeight + (i < remainder ? 1 : 0);
      await service.update(flow.id, { weight: newWeight });
      results.push({ flowId: flow.id, newWeight });
    }
    return c.json(success({ results }));
  });
  router2.post("/:id/clone", async (c) => {
    const flowId = c.req.param("id");
    const service = new FlowService(c.env);
    try {
      const clonedFlow = await service.clone(flowId);
      return c.json(success(clonedFlow));
    } catch (err) {
      if (err instanceof Error && err.message === "Flow not found") {
        return c.json(error3("Flow not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  return router2;
}
__name(createFlowRouter, "createFlowRouter");

// src/services/landingPage/lp.routes.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/landingPage/lp.service.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var LandingPageService = class {
  static {
    __name(this, "LandingPageService");
  }
  repo;
  constructor(env2) {
    const db = getD1Connection(env2);
    this.repo = new LandingPageRepository(db);
  }
  /**
   * 创建 Landing Page
   */
  async create(data) {
    const urlExists = await this.repo.urlExists(data.url);
    if (urlExists) {
      throw new DuplicateError(`Landing Page with URL "${data.url}" already exists`);
    }
    return this.repo.create(data);
  }
  /**
   * 获取 Landing Page 详情
   */
  async getById(id) {
    const lp = await this.repo.findById(id);
    if (!lp) {
      throw new NotFoundError("Landing Page not found");
    }
    return lp;
  }
  /**
   * 获取 Landing Page 列表
   */
  async getList(page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.repo.findAll(pageSize, offset),
      this.repo.count()
    ]);
    return { list, total };
  }
  /**
   * 获取活跃的 Landing Page 列表
   */
  async getActive() {
    return this.repo.findByStatus("active");
  }
  /**
   * 更新 Landing Page
   */
  async update(id, data) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError("Landing Page not found");
    }
    if (data.url && data.url !== existing.url) {
      const urlExists = await this.repo.urlExists(data.url, id);
      if (urlExists) {
        throw new DuplicateError(`Landing Page with URL "${data.url}" already exists`);
      }
    }
    const updated = await this.repo.update(id, data);
    return updated;
  }
  /**
   * 删除 Landing Page（硬删除）
   */
  async delete(id) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError("Landing Page not found");
    }
    await this.repo.deleteById(id);
  }
  /**
   * 获取 Landing Page 详情（包含统计数据）
   */
  async getDetail(id) {
    const lp = await this.getById(id);
    const [campaignCount, stats] = await Promise.all([
      this.repo.getCampaignCount(id),
      this.repo.getStats(id)
    ]);
    const cr = stats.clicks > 0 ? stats.conversions / stats.clicks * 100 : 0;
    return {
      ...lp,
      campaignCount,
      clicks: stats.clicks,
      conversions: stats.conversions,
      cr: Math.round(cr * 100) / 100
    };
  }
  /**
   * 获取 Landing Page 列表（包含统计数据）
   */
  async getListWithStats(page = 1, pageSize = 20) {
    const { list, total } = await this.getList(page, pageSize);
    const listWithStats = await Promise.all(
      list.map(async (lp) => {
        const [campaignCount, stats] = await Promise.all([
          this.repo.getCampaignCount(lp.id),
          this.repo.getStats(lp.id)
        ]);
        const cr = stats.clicks > 0 ? stats.conversions / stats.clicks * 100 : 0;
        return {
          ...lp,
          campaignCount,
          clicks: stats.clicks,
          conversions: stats.conversions,
          cr: Math.round(cr * 100) / 100
        };
      })
    );
    return { list: listWithStats, total };
  }
};

// src/services/landingPage/lp.routes.ts
function createLandingPageRouter() {
  const router2 = new Hono2();
  router2.get("/", async (c) => {
    const query = {
      page: parseInt(c.req.query("page") || "1"),
      pageSize: parseInt(c.req.query("pageSize") || "20"),
      withStats: c.req.query("withStats") === "true"
    };
    const { page, pageSize } = validatePagination(query.page, query.pageSize);
    const service = new LandingPageService(c.env);
    const result = query.withStats ? await service.getListWithStats(page, pageSize) : await service.getList(page, pageSize);
    return c.json(success(result.list, {
      page,
      pageSize,
      total: result.total
    }));
  });
  router2.get("/active", async (c) => {
    const service = new LandingPageService(c.env);
    const lps = await service.getActive();
    return c.json(success(lps));
  });
  router2.get("/:id", async (c) => {
    const id = c.req.param("id");
    const withStats = c.req.query("withStats") === "true";
    const service = new LandingPageService(c.env);
    try {
      const lp = withStats ? await service.getDetail(id) : await service.getById(id);
      return c.json(success(lp));
    } catch (err) {
      if (err instanceof Error && err.message === "Landing Page not found") {
        return c.json(error3("Landing Page not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.post("/", async (c) => {
    const body = await c.req.json();
    const nameValidation = validateRequired(body.name, "name");
    if (!nameValidation.valid) {
      return c.json(error3(nameValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const urlValidation = validateRequired(body.url, "url");
    if (!urlValidation.valid) {
      return c.json(error3(urlValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    if (!isValidUrl(body.url)) {
      return c.json(error3("Invalid URL format", ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const service = new LandingPageService(c.env);
    try {
      const lp = await service.create(body);
      return c.json(success(lp), HTTP_STATUS.CREATED);
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        return c.json(error3(err.message, ERROR_CODES.DUPLICATE), HTTP_STATUS.CONFLICT);
      }
      throw err;
    }
  });
  router2.put("/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const service = new LandingPageService(c.env);
    if (body.url && !isValidUrl(body.url)) {
      return c.json(error3("Invalid URL format", ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    try {
      const lp = await service.update(id, body);
      return c.json(success(lp));
    } catch (err) {
      if (err instanceof Error && err.message === "Landing Page not found") {
        return c.json(error3("Landing Page not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      if (err instanceof Error && err.message.includes("already exists")) {
        return c.json(error3(err.message, ERROR_CODES.DUPLICATE), HTTP_STATUS.CONFLICT);
      }
      throw err;
    }
  });
  router2.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const service = new LandingPageService(c.env);
    try {
      await service.delete(id);
      return c.json(success({ deleted: true }));
    } catch (err) {
      if (err instanceof Error && err.message === "Landing Page not found") {
        return c.json(error3("Landing Page not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  return router2;
}
__name(createLandingPageRouter, "createLandingPageRouter");

// src/services/offer/offer.routes.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/offer/offer.service.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var OfferService = class {
  static {
    __name(this, "OfferService");
  }
  repo;
  constructor(env2) {
    const db = getD1Connection(env2);
    this.repo = new OfferRepository(db);
  }
  /**
   * 创建 Offer
   */
  async create(data) {
    const urlExists = await this.repo.urlExists(data.url);
    if (urlExists) {
      throw new DuplicateError(`Offer with URL "${data.url}" already exists`);
    }
    return this.repo.create(data);
  }
  /**
   * 获取 Offer 详情
   */
  async getById(id) {
    const offer = await this.repo.findById(id);
    if (!offer) {
      throw new NotFoundError("Offer not found");
    }
    return offer;
  }
  /**
   * 获取 Offer 列表
   */
  async getList(page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.repo.findAll(pageSize, offset),
      this.repo.count()
    ]);
    return { list, total };
  }
  /**
   * 获取活跃的 Offer 列表
   */
  async getActive() {
    return this.repo.findByStatus("active");
  }
  /**
   * 更新 Offer
   */
  async update(id, data) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError("Offer not found");
    }
    if (data.url && data.url !== existing.url) {
      const urlExists = await this.repo.urlExists(data.url, id);
      if (urlExists) {
        throw new DuplicateError(`Offer with URL "${data.url}" already exists`);
      }
    }
    const updated = await this.repo.update(id, data);
    return updated;
  }
  /**
   * 删除 Offer（硬删除）
   */
  async delete(id) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError("Offer not found");
    }
    await this.repo.deleteById(id);
  }
  /**
   * 获取 Offer 详情（包含统计数据）
   */
  async getDetail(id) {
    const offer = await this.getById(id);
    const [campaignCount, stats] = await Promise.all([
      this.repo.getCampaignCount(id),
      this.repo.getStats(id)
    ]);
    const epc = stats.clicks > 0 ? stats.revenue / stats.clicks : 0;
    const cr = stats.clicks > 0 ? stats.conversions / stats.clicks * 100 : 0;
    return {
      ...offer,
      campaignCount,
      clicks: stats.clicks,
      conversions: stats.conversions,
      revenue: stats.revenue,
      epc: Math.round(epc * 100) / 100,
      cr: Math.round(cr * 100) / 100
    };
  }
  /**
   * 获取 Offer 列表（包含统计数据）
   */
  async getListWithStats(page = 1, pageSize = 20) {
    const { list, total } = await this.getList(page, pageSize);
    const listWithStats = await Promise.all(
      list.map(async (offer) => {
        const [campaignCount, stats] = await Promise.all([
          this.repo.getCampaignCount(offer.id),
          this.repo.getStats(offer.id)
        ]);
        const epc = stats.clicks > 0 ? stats.revenue / stats.clicks : 0;
        const cr = stats.clicks > 0 ? stats.conversions / stats.clicks * 100 : 0;
        return {
          ...offer,
          campaignCount,
          clicks: stats.clicks,
          conversions: stats.conversions,
          revenue: stats.revenue,
          epc: Math.round(epc * 100) / 100,
          cr: Math.round(cr * 100) / 100
        };
      })
    );
    return { list: listWithStats, total };
  }
};

// src/services/offer/offer.routes.ts
function createOfferRouter() {
  const router2 = new Hono2();
  router2.get("/", async (c) => {
    const query = {
      page: parseInt(c.req.query("page") || "1"),
      pageSize: parseInt(c.req.query("pageSize") || "20"),
      withStats: c.req.query("withStats") === "true"
    };
    const { page, pageSize } = validatePagination(query.page, query.pageSize);
    const service = new OfferService(c.env);
    const result = query.withStats ? await service.getListWithStats(page, pageSize) : await service.getList(page, pageSize);
    return c.json(success(result.list, {
      page,
      pageSize,
      total: result.total
    }));
  });
  router2.get("/active", async (c) => {
    const service = new OfferService(c.env);
    const offers = await service.getActive();
    return c.json(success(offers));
  });
  router2.get("/:id", async (c) => {
    const id = c.req.param("id");
    const withStats = c.req.query("withStats") === "true";
    const service = new OfferService(c.env);
    try {
      const offer = withStats ? await service.getDetail(id) : await service.getById(id);
      return c.json(success(offer));
    } catch (err) {
      if (err instanceof Error && err.message === "Offer not found") {
        return c.json(error3("Offer not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.post("/", async (c) => {
    const body = await c.req.json();
    const nameValidation = validateRequired(body.name, "name");
    if (!nameValidation.valid) {
      return c.json(error3(nameValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const urlValidation = validateRequired(body.url, "url");
    if (!urlValidation.valid) {
      return c.json(error3(urlValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    if (!isValidUrl(body.url)) {
      return c.json(error3("Invalid URL format", ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    if (body.payout !== void 0) {
      const payoutValidation = validateNumberRange(body.payout, 0, 1e6, "payout");
      if (!payoutValidation.valid) {
        return c.json(error3(payoutValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
      }
    }
    const service = new OfferService(c.env);
    try {
      const offer = await service.create(body);
      return c.json(success(offer), HTTP_STATUS.CREATED);
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        return c.json(error3(err.message, ERROR_CODES.DUPLICATE), HTTP_STATUS.CONFLICT);
      }
      throw err;
    }
  });
  router2.put("/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const service = new OfferService(c.env);
    if (body.url && !isValidUrl(body.url)) {
      return c.json(error3("Invalid URL format", ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    if (body.payout !== void 0) {
      const payoutValidation = validateNumberRange(body.payout, 0, 1e6, "payout");
      if (!payoutValidation.valid) {
        return c.json(error3(payoutValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
      }
    }
    try {
      const offer = await service.update(id, body);
      return c.json(success(offer));
    } catch (err) {
      if (err instanceof Error && err.message === "Offer not found") {
        return c.json(error3("Offer not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      if (err instanceof Error && err.message.includes("already exists")) {
        return c.json(error3(err.message, ERROR_CODES.DUPLICATE), HTTP_STATUS.CONFLICT);
      }
      throw err;
    }
  });
  router2.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const service = new OfferService(c.env);
    try {
      await service.delete(id);
      return c.json(success({ deleted: true }));
    } catch (err) {
      if (err instanceof Error && err.message === "Offer not found") {
        return c.json(error3("Offer not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  return router2;
}
__name(createOfferRouter, "createOfferRouter");

// src/services/trafficSource/trafficSource.routes.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/trafficSource/trafficSource.service.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/handlers/d1/trafficSource.repo.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var TrafficSourceRepository = class extends BaseRepository {
  static {
    __name(this, "TrafficSourceRepository");
  }
  idService;
  constructor(db) {
    super(db, "trafficSources");
    this.idService = new IdService(db);
  }
  transform(row) {
    const result = {
      ...row,
      id: row.displayId || row.id
    };
    if (row.parameters && typeof row.parameters === "string") {
      result.parameters = JSON.parse(row.parameters);
    }
    if (row.postbackConfig && typeof row.postbackConfig === "string") {
      result.postbackConfig = JSON.parse(row.postbackConfig);
    }
    if (row.apiConfig && typeof row.apiConfig === "string") {
      result.apiConfig = JSON.parse(row.apiConfig);
    }
    return result;
  }
  async findByDisplayId(displayId) {
    const result = await this.db.prepare(`SELECT * FROM trafficSources WHERE displayId = ?`).bind(displayId).first();
    if (!result) return null;
    return this.transform(result);
  }
  /**
   * 创建 Traffic Source
   */
  async create(data) {
    const displayId = await this.idService.generateId("trafficSources");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const apiConfigStr = data.apiConfig ? JSON.stringify(data.apiConfig) : null;
    const parametersStr = data.parameters ? JSON.stringify(data.parameters) : null;
    const postbackConfigStr = data.postbackConfig ? JSON.stringify(data.postbackConfig) : null;
    await this.db.prepare(`
        INSERT INTO trafficSources (
          id, displayId, name, type, status, postbackUrl, costModel, costValue, currency, 
          parameters, postbackConfig, apiConfig, templateId, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
      displayId,
      displayId,
      data.name,
      data.type || "other",
      "active",
      data.postbackUrl || null,
      data.costModel || "cpc",
      data.costValue || 0,
      data.currency || "USD",
      parametersStr,
      postbackConfigStr,
      apiConfigStr,
      data.templateId || null,
      now,
      now
    ).run();
    const ts = await this.findById(displayId);
    return ts;
  }
  /**
   * 更新 Traffic Source
   */
  async update(id, data) {
    const fields = [];
    const values = [];
    if (data.name !== void 0) {
      fields.push("name = ?");
      values.push(data.name);
    }
    if (data.type !== void 0) {
      fields.push("type = ?");
      values.push(data.type);
    }
    if (data.postbackUrl !== void 0) {
      fields.push("postbackUrl = ?");
      values.push(data.postbackUrl);
    }
    if (data.costModel !== void 0) {
      fields.push("costModel = ?");
      values.push(data.costModel);
    }
    if (data.costValue !== void 0) {
      fields.push("costValue = ?");
      values.push(data.costValue);
    }
    if (data.currency !== void 0) {
      fields.push("currency = ?");
      values.push(data.currency);
    }
    if (data.status !== void 0) {
      fields.push("status = ?");
      values.push(data.status);
    }
    if (data.templateId !== void 0) {
      fields.push("templateId = ?");
      values.push(data.templateId);
    }
    if (data.parameters !== void 0) {
      fields.push("parameters = ?");
      values.push(data.parameters ? JSON.stringify(data.parameters) : null);
    }
    if (data.postbackConfig !== void 0) {
      fields.push("postbackConfig = ?");
      values.push(data.postbackConfig ? JSON.stringify(data.postbackConfig) : null);
    }
    if (data.apiConfig !== void 0) {
      fields.push("apiConfig = ?");
      values.push(data.apiConfig ? JSON.stringify(data.apiConfig) : null);
    }
    if (fields.length === 0) {
      return this.findById(id);
    }
    fields.push("updatedAt = ?");
    values.push((/* @__PURE__ */ new Date()).toISOString());
    values.push(id);
    await this.db.prepare(`UPDATE trafficSources SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    return this.findById(id);
  }
  /**
   * 按状态查询
   */
  async findByStatus(status) {
    return this.findBy("status", status);
  }
  /**
   * 按类型查询
   */
  async findByType(type) {
    return this.findBy("type", type);
  }
  /**
   * 按模板 ID 查询
   */
  async findByTemplate(templateId) {
    return this.findBy("templateId", templateId);
  }
  /**
   * 查询列表（支持分页和过滤）
   */
  async findList(page = 1, pageSize = 20, status) {
    const offset = (page - 1) * pageSize;
    let countSql = "SELECT COUNT(*) as count FROM trafficSources WHERE 1=1";
    let listSql = "SELECT * FROM trafficSources WHERE 1=1";
    const params = [];
    const countParams = [];
    if (status) {
      countSql += " AND status = ?";
      listSql += " AND status = ?";
      params.push(status);
      countParams.push(status);
    }
    listSql += " ORDER BY createdAt DESC LIMIT ? OFFSET ?";
    params.push(pageSize, offset);
    const [countResult, listResult] = await Promise.all([
      this.db.prepare(countSql).bind(...countParams).first(),
      this.db.prepare(listSql).bind(...params).all()
    ]);
    return {
      list: listResult.results.map(this.transform.bind(this)) || [],
      total: countResult?.count || 0
    };
  }
  /**
   * 获取关联的 Campaign 数量
   */
  async getCampaignCount(trafficSourceId) {
    const result = await this.db.prepare(`
        SELECT COUNT(*) as count
        FROM campaigns
        WHERE trafficSource = ?
      `).bind(trafficSourceId).first();
    return result?.count || 0;
  }
  /**
   * 获取 Traffic Source 统计数据
   */
  async getStats(trafficSourceId) {
    const result = await this.db.prepare(`
        SELECT 
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(conversions), 0) as conversions,
          COALESCE(SUM(revenue), 0) as revenue,
          COALESCE(SUM(spend), 0) as cost
        FROM trafficSummary
        WHERE campaignId IN (
          SELECT id FROM campaigns WHERE trafficSource = ?
        )
      `).bind(trafficSourceId).first();
    return {
      clicks: result?.clicks || 0,
      conversions: result?.conversions || 0,
      revenue: result?.revenue || 0,
      cost: result?.cost || 0
    };
  }
};

// src/services/trafficSource/trafficSource.service.ts
var TrafficSourceService = class {
  static {
    __name(this, "TrafficSourceService");
  }
  repo;
  constructor(env2) {
    const db = getD1Connection(env2);
    this.repo = new TrafficSourceRepository(db);
  }
  /**
   * 创建 Traffic Source
   */
  async create(data) {
    return this.repo.create(data);
  }
  /**
   * 获取 Traffic Source 详情
   */
  async getById(id) {
    const ts = await this.repo.findById(id);
    if (!ts) {
      throw new NotFoundError("Traffic Source not found");
    }
    return ts;
  }
  /**
   * 获取 Traffic Source 列表
   */
  async getList(page = 1, pageSize = 20) {
    return this.repo.findList(page, pageSize);
  }
  /**
   * 获取活跃的 Traffic Source 列表
   */
  async getActive() {
    return this.repo.findByStatus("active");
  }
  /**
   * 更新 Traffic Source
   */
  async update(id, data) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError("Traffic Source not found");
    }
    const updated = await this.repo.update(id, data);
    return updated;
  }
  /**
   * 删除 Traffic Source（硬删除）
   */
  async delete(id) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError("Traffic Source not found");
    }
    await this.repo.deleteById(id);
  }
  /**
   * 获取 Traffic Source 详情（包含统计数据）
   */
  async getDetail(id) {
    const ts = await this.getById(id);
    const [campaignCount, stats] = await Promise.all([
      this.repo.getCampaignCount(id),
      this.repo.getStats(id)
    ]);
    const profit = stats.revenue - stats.cost;
    const roi = stats.cost > 0 ? profit / stats.cost * 100 : 0;
    return {
      ...ts,
      campaignCount,
      clicks: stats.clicks,
      conversions: stats.conversions,
      revenue: stats.revenue,
      cost: stats.cost,
      profit: Math.round(profit * 100) / 100,
      roi: Math.round(roi * 100) / 100
    };
  }
  /**
   * 获取 Traffic Source 列表（包含统计数据）
   */
  async getListWithStats(page = 1, pageSize = 20) {
    const { list, total } = await this.getList(page, pageSize);
    const listWithStats = await Promise.all(
      list.map(async (ts) => {
        const [campaignCount, stats] = await Promise.all([
          this.repo.getCampaignCount(ts.id),
          this.repo.getStats(ts.id)
        ]);
        const profit = stats.revenue - stats.cost;
        const roi = stats.cost > 0 ? profit / stats.cost * 100 : 0;
        return {
          ...ts,
          campaignCount,
          clicks: stats.clicks,
          conversions: stats.conversions,
          revenue: stats.revenue,
          cost: stats.cost,
          profit: Math.round(profit * 100) / 100,
          roi: Math.round(roi * 100) / 100
        };
      })
    );
    return { list: listWithStats, total };
  }
};

// src/services/platform/api-tester.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var GenericApiTester = class {
  static {
    __name(this, "GenericApiTester");
  }
  async testConnection(config2) {
    try {
      const response = await fetch(config2.baseUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${config2.apiKey}`,
          "Content-Type": "application/json"
        }
      });
      if (response.ok) {
        return {
          success: true,
          message: "Connection successful"
        };
      } else {
        return {
          success: false,
          message: `Connection failed: HTTP ${response.status}`
        };
      }
    } catch (error4) {
      return {
        success: false,
        message: `Connection error: ${error4 instanceof Error ? error4.message : "Unknown error"}`
      };
    }
  }
};
var PropellerAdsTester = class {
  static {
    __name(this, "PropellerAdsTester");
  }
  async testConnection(config2) {
    try {
      const url = `${config2.baseUrl}/user`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${config2.apiKey}`,
          "Content-Type": "application/json"
        }
      });
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: "PropellerAds API connection successful",
          details: {
            accountName: data.name || data.email,
            accountId: data.id,
            balance: data.balance,
            currency: data.currency
          }
        };
      } else if (response.status === 401) {
        return {
          success: false,
          message: "Invalid API key. Please check your credentials."
        };
      } else {
        return {
          success: false,
          message: `Connection failed: HTTP ${response.status}`
        };
      }
    } catch (error4) {
      return {
        success: false,
        message: `Connection error: ${error4 instanceof Error ? error4.message : "Unknown error"}`
      };
    }
  }
};
var TaboolaTester = class {
  static {
    __name(this, "TaboolaTester");
  }
  async testConnection(config2) {
    try {
      const url = `${config2.baseUrl}/users/current`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${config2.apiKey}`,
          "Content-Type": "application/json"
        }
      });
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: "Taboola API connection successful",
          details: {
            accountName: data.name || data.email,
            accountId: data.id
          }
        };
      } else if (response.status === 401) {
        return {
          success: false,
          message: "Invalid API key or token expired."
        };
      } else {
        return {
          success: false,
          message: `Connection failed: HTTP ${response.status}`
        };
      }
    } catch (error4) {
      return {
        success: false,
        message: `Connection error: ${error4 instanceof Error ? error4.message : "Unknown error"}`
      };
    }
  }
};
var FacebookTester = class {
  static {
    __name(this, "FacebookTester");
  }
  async testConnection(config2) {
    try {
      const url = `https://graph.facebook.com/v18.0/me?access_token=${config2.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok && data.id) {
        return {
          success: true,
          message: "Facebook API connection successful",
          details: {
            accountName: data.name,
            accountId: data.id
          }
        };
      } else if (data.error) {
        return {
          success: false,
          message: `Facebook API error: ${data.error.message}`
        };
      } else {
        return {
          success: false,
          message: "Connection failed"
        };
      }
    } catch (error4) {
      return {
        success: false,
        message: `Connection error: ${error4 instanceof Error ? error4.message : "Unknown error"}`
      };
    }
  }
};
var RevcontentTester = class {
  static {
    __name(this, "RevcontentTester");
  }
  async testConnection(config2) {
    try {
      const url = `${config2.baseUrl}/api/user`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${config2.apiKey}`,
          "Content-Type": "application/json"
        }
      });
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: "Revcontent API connection successful",
          details: {
            accountName: data.name || data.email,
            accountId: data.id
          }
        };
      } else if (response.status === 401) {
        return {
          success: false,
          message: "Invalid API key. Please check your credentials."
        };
      } else {
        return {
          success: false,
          message: `Connection failed: HTTP ${response.status}`
        };
      }
    } catch (error4) {
      return {
        success: false,
        message: `Connection error: ${error4 instanceof Error ? error4.message : "Unknown error"}`
      };
    }
  }
};
var OutbrainTester = class {
  static {
    __name(this, "OutbrainTester");
  }
  async testConnection(config2) {
    try {
      const url = `${config2.baseUrl}/marketers`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "OB-TOKEN-V1": config2.apiKey,
          "Content-Type": "application/json"
        }
      });
      if (response.ok) {
        const data = await response.json();
        const marketer = data.marketers?.[0];
        return {
          success: true,
          message: "Outbrain API connection successful",
          details: {
            accountName: marketer?.name,
            accountId: marketer?.id
          }
        };
      } else if (response.status === 401) {
        return {
          success: false,
          message: "Invalid API token. Please check your credentials."
        };
      } else {
        return {
          success: false,
          message: `Connection failed: HTTP ${response.status}`
        };
      }
    } catch (error4) {
      return {
        success: false,
        message: `Connection error: ${error4 instanceof Error ? error4.message : "Unknown error"}`
      };
    }
  }
};
var RumbleTester = class {
  static {
    __name(this, "RumbleTester");
  }
  async testConnection(config2) {
    try {
      const url = `${config2.baseUrl}/api/v1/account`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${config2.apiKey}`,
          "Content-Type": "application/json"
        }
      });
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: "Rumble API connection successful",
          details: {
            accountName: data.name || data.email,
            accountId: data.id
          }
        };
      } else if (response.status === 401) {
        return {
          success: false,
          message: "Invalid API key. Please check your credentials."
        };
      } else {
        return {
          success: false,
          message: `Connection failed: HTTP ${response.status}`
        };
      }
    } catch (error4) {
      return {
        success: false,
        message: `Connection error: ${error4 instanceof Error ? error4.message : "Unknown error"}`
      };
    }
  }
};
var OddBytesTester = class {
  static {
    __name(this, "OddBytesTester");
  }
  async testConnection(config2) {
    try {
      const url = `${config2.baseUrl}/rest/v1/system/status`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-Api-Key": config2.apiKey,
          "Content-Type": "application/json"
        }
      });
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: "OddBytes API connection successful",
          details: {
            accountName: data.accountName || data.username,
            accountId: data.accountId
          }
        };
      } else if (response.status === 401) {
        return {
          success: false,
          message: "Invalid API key. Please check your credentials."
        };
      } else {
        return {
          success: false,
          message: `Connection failed: HTTP ${response.status}`
        };
      }
    } catch (error4) {
      return {
        success: false,
        message: `Connection error: ${error4 instanceof Error ? error4.message : "Unknown error"}`
      };
    }
  }
};
var ApiTesterFactory = class {
  static {
    __name(this, "ApiTesterFactory");
  }
  static testers = /* @__PURE__ */ new Map([
    ["propellerads", new PropellerAdsTester()],
    ["taboola", new TaboolaTester()],
    ["facebook", new FacebookTester()],
    ["revcontent", new RevcontentTester()],
    ["outbrain", new OutbrainTester()],
    ["rumble", new RumbleTester()],
    ["oddbytes", new OddBytesTester()]
  ]);
  static getTester(platformType) {
    if (platformType) {
      const normalizedType = platformType.toLowerCase().replace(/[^a-z]/g, "");
      const tester = this.testers.get(normalizedType);
      if (tester) {
        return tester;
      }
    }
    return new GenericApiTester();
  }
  static registerTester(platformType, tester) {
    this.testers.set(platformType.toLowerCase(), tester);
  }
};
async function testApiConnection(config2) {
  const tester = ApiTesterFactory.getTester(config2.platformType);
  return tester.testConnection(config2);
}
__name(testApiConnection, "testApiConnection");

// src/services/trafficSource/trafficSource.routes.ts
function createTrafficSourceRouter() {
  const router2 = new Hono2();
  router2.get("/", async (c) => {
    const query = {
      page: parseInt(c.req.query("page") || "1"),
      pageSize: parseInt(c.req.query("pageSize") || "20"),
      withStats: c.req.query("withStats") === "true"
    };
    const { page, pageSize } = validatePagination(query.page, query.pageSize);
    const service = new TrafficSourceService(c.env);
    const result = query.withStats ? await service.getListWithStats(page, pageSize) : await service.getList(page, pageSize);
    return c.json(success(result.list, {
      page,
      pageSize,
      total: result.total
    }));
  });
  router2.get("/active", async (c) => {
    const service = new TrafficSourceService(c.env);
    const sources = await service.getActive();
    return c.json(success(sources));
  });
  router2.get("/:id", async (c) => {
    const id = c.req.param("id");
    const withStats = c.req.query("withStats") === "true";
    const service = new TrafficSourceService(c.env);
    try {
      const ts = withStats ? await service.getDetail(id) : await service.getById(id);
      return c.json(success(ts));
    } catch (err) {
      if (err instanceof Error && err.message === "Traffic Source not found") {
        return c.json(error3("Traffic Source not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.post("/", async (c) => {
    const body = await c.req.json();
    const nameValidation = validateRequired(body.name, "name");
    if (!nameValidation.valid) {
      return c.json(error3(nameValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const service = new TrafficSourceService(c.env);
    try {
      const ts = await service.create(body);
      return c.json(success(ts), HTTP_STATUS.CREATED);
    } catch (err) {
      throw err;
    }
  });
  router2.put("/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const service = new TrafficSourceService(c.env);
    try {
      const ts = await service.update(id, body);
      return c.json(success(ts));
    } catch (err) {
      if (err instanceof Error && err.message === "Traffic Source not found") {
        return c.json(error3("Traffic Source not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const service = new TrafficSourceService(c.env);
    try {
      await service.delete(id);
      return c.json(success({ deleted: true }));
    } catch (err) {
      if (err instanceof Error && err.message === "Traffic Source not found") {
        return c.json(error3("Traffic Source not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.post("/test-connection", async (c) => {
    const body = await c.req.json();
    if (!body.apiBaseUrl) {
      return c.json(error3("API Base URL is required", ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    if (!body.apiKey) {
      return c.json(error3("API Key is required", ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    try {
      const result = await testApiConnection({
        baseUrl: body.apiBaseUrl,
        apiKey: body.apiKey,
        apiSecret: body.apiSecret,
        platformType: body.platformType
      });
      if (result.success) {
        return c.json(success(result));
      } else {
        return c.json(error3(result.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
      }
    } catch (err) {
      return c.json(
        error3("Failed to test connection: " + (err instanceof Error ? err.message : "Unknown error")),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  return router2;
}
__name(createTrafficSourceRouter, "createTrafficSourceRouter");

// src/services/affiliateNetwork/affiliateNetwork.routes.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/affiliateNetwork/affiliateNetwork.service.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/handlers/d1/affiliateNetwork.repo.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var AffiliateNetworkRepository = class extends BaseRepository {
  static {
    __name(this, "AffiliateNetworkRepository");
  }
  idService;
  constructor(db) {
    super(db, "affiliateNetworks");
    this.idService = new IdService(db);
  }
  transform(row) {
    const network = {
      ...row,
      id: row.displayId || row.id
    };
    if (network.offerParameters && typeof network.offerParameters === "string") {
      try {
        network.offerParameters = JSON.parse(network.offerParameters);
      } catch {
        network.offerParameters = [];
      }
    }
    return network;
  }
  async findByDisplayId(displayId) {
    const result = await this.db.prepare(`SELECT * FROM affiliateNetworks WHERE displayId = ?`).bind(displayId).first();
    if (!result) return null;
    return this.transform(result);
  }
  /**
   * 创建 Affiliate Network
   */
  async create(data) {
    const displayId = await this.idService.generateId("affiliateNetworks");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const offerParametersJson = data.offerParameters ? JSON.stringify(data.offerParameters) : null;
    await this.db.prepare(`
        INSERT INTO affiliateNetworks (id, displayId, name, type, status, apiUrl, apiKey, apiSecret, postbackUrl, offerParameters, notes, templateId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
      displayId,
      displayId,
      data.name,
      data.type || "api",
      "active",
      data.apiUrl || null,
      data.apiKey || null,
      data.apiSecret || null,
      data.postbackUrl || null,
      offerParametersJson,
      data.notes || null,
      data.templateId || null,
      now,
      now
    ).run();
    const network = await this.findById(displayId);
    return network;
  }
  /**
   * 更新 Affiliate Network
   */
  async update(id, data) {
    const fields = [];
    const values = [];
    if (data.name !== void 0) {
      fields.push("name = ?");
      values.push(data.name);
    }
    if (data.type !== void 0) {
      fields.push("type = ?");
      values.push(data.type);
    }
    if (data.apiUrl !== void 0) {
      fields.push("apiUrl = ?");
      values.push(data.apiUrl);
    }
    if (data.apiKey !== void 0) {
      fields.push("apiKey = ?");
      values.push(data.apiKey);
    }
    if (data.apiSecret !== void 0) {
      fields.push("apiSecret = ?");
      values.push(data.apiSecret);
    }
    if (data.postbackUrl !== void 0) {
      fields.push("postbackUrl = ?");
      values.push(data.postbackUrl);
    }
    if (data.offerParameters !== void 0) {
      fields.push("offerParameters = ?");
      values.push(JSON.stringify(data.offerParameters));
    }
    if (data.notes !== void 0) {
      fields.push("notes = ?");
      values.push(data.notes);
    }
    if (data.status !== void 0) {
      fields.push("status = ?");
      values.push(data.status);
    }
    if (data.templateId !== void 0) {
      fields.push("templateId = ?");
      values.push(data.templateId);
    }
    if (fields.length === 0) {
      return this.findById(id);
    }
    fields.push("updatedAt = ?");
    values.push((/* @__PURE__ */ new Date()).toISOString());
    values.push(id);
    await this.db.prepare(`UPDATE affiliateNetworks SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
    return this.findById(id);
  }
  /**
   * 按状态查询
   */
  async findByStatus(status) {
    return this.findBy("status", status);
  }
  /**
   * 按类型查询
   */
  async findByType(type) {
    return this.findBy("type", type);
  }
  /**
   * 查询列表（支持分页和过滤）
   */
  async findList(page = 1, pageSize = 20, status) {
    const offset = (page - 1) * pageSize;
    let countSql = "SELECT COUNT(*) as count FROM affiliateNetworks WHERE 1=1";
    let listSql = "SELECT * FROM affiliateNetworks WHERE 1=1";
    const params = [];
    const countParams = [];
    if (status) {
      countSql += " AND status = ?";
      listSql += " AND status = ?";
      params.push(status);
      countParams.push(status);
    }
    listSql += " ORDER BY createdAt DESC LIMIT ? OFFSET ?";
    params.push(pageSize, offset);
    const [countResult, listResult] = await Promise.all([
      this.db.prepare(countSql).bind(...countParams).first(),
      this.db.prepare(listSql).bind(...params).all()
    ]);
    return {
      list: listResult.results.map(this.transform.bind(this)) || [],
      total: countResult?.count || 0
    };
  }
  /**
   * 获取关联的 Offer 数量
   */
  async getOfferCount(networkId) {
    const result = await this.db.prepare(`
        SELECT COUNT(*) as count
        FROM offers
        WHERE network = ?
      `).bind(networkId).first();
    return result?.count || 0;
  }
  /**
   * 获取 Affiliate Network 统计数据
   */
  async getStats(networkId) {
    const result = await this.db.prepare(`
        SELECT 
          COALESCE(SUM(ts.clicks), 0) as clicks,
          COALESCE(SUM(ts.conversions), 0) as conversions,
          COALESCE(SUM(ts.revenue), 0) as revenue
        FROM trafficSummary ts
        JOIN offers o ON ts.offerId = o.id
        WHERE o.network = ?
      `).bind(networkId).first();
    return {
      clicks: result?.clicks || 0,
      conversions: result?.conversions || 0,
      revenue: result?.revenue || 0
    };
  }
};

// src/services/affiliateNetwork/affiliateNetwork.service.ts
var AffiliateNetworkService = class {
  static {
    __name(this, "AffiliateNetworkService");
  }
  repo;
  constructor(env2) {
    const db = getD1Connection(env2);
    this.repo = new AffiliateNetworkRepository(db);
  }
  /**
   * 创建 Affiliate Network
   */
  async create(data) {
    return this.repo.create(data);
  }
  /**
   * 获取 Affiliate Network 详情
   */
  async getById(id) {
    const network = await this.repo.findById(id);
    if (!network) {
      throw new NotFoundError("Affiliate Network not found");
    }
    return network;
  }
  /**
   * 获取 Affiliate Network 列表
   */
  async getList(page = 1, pageSize = 20) {
    return this.repo.findList(page, pageSize);
  }
  /**
   * 获取活跃的 Affiliate Network 列表
   */
  async getActive() {
    return this.repo.findByStatus("active");
  }
  /**
   * 更新 Affiliate Network
   */
  async update(id, data) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError("Affiliate Network not found");
    }
    const updated = await this.repo.update(id, data);
    return updated;
  }
  /**
   * 删除 Affiliate Network（硬删除）
   */
  async delete(id) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError("Affiliate Network not found");
    }
    await this.repo.deleteById(id);
  }
  /**
   * 获取 Affiliate Network 详情（包含统计数据）
   */
  async getDetail(id) {
    const network = await this.getById(id);
    const [offerCount, stats] = await Promise.all([
      this.repo.getOfferCount(id),
      this.repo.getStats(id)
    ]);
    const epc = stats.clicks > 0 ? stats.revenue / stats.clicks : 0;
    const cr = stats.clicks > 0 ? stats.conversions / stats.clicks * 100 : 0;
    return {
      ...network,
      offerCount,
      clicks: stats.clicks,
      conversions: stats.conversions,
      revenue: stats.revenue,
      epc: Math.round(epc * 100) / 100,
      cr: Math.round(cr * 100) / 100
    };
  }
  /**
   * 获取 Affiliate Network 列表（包含统计数据）
   */
  async getListWithStats(page = 1, pageSize = 20) {
    const { list, total } = await this.getList(page, pageSize);
    const listWithStats = await Promise.all(
      list.map(async (network) => {
        const [offerCount, stats] = await Promise.all([
          this.repo.getOfferCount(network.id),
          this.repo.getStats(network.id)
        ]);
        const epc = stats.clicks > 0 ? stats.revenue / stats.clicks : 0;
        const cr = stats.clicks > 0 ? stats.conversions / stats.clicks * 100 : 0;
        return {
          ...network,
          offerCount,
          clicks: stats.clicks,
          conversions: stats.conversions,
          revenue: stats.revenue,
          epc: Math.round(epc * 100) / 100,
          cr: Math.round(cr * 100) / 100
        };
      })
    );
    return { list: listWithStats, total };
  }
};

// src/services/affiliateNetwork/affiliateNetwork.routes.ts
function createAffiliateNetworkRouter() {
  const router2 = new Hono2();
  router2.get("/", async (c) => {
    const query = {
      page: parseInt(c.req.query("page") || "1"),
      pageSize: parseInt(c.req.query("pageSize") || "20"),
      withStats: c.req.query("withStats") === "true"
    };
    const { page, pageSize } = validatePagination(query.page, query.pageSize);
    const service = new AffiliateNetworkService(c.env);
    const result = query.withStats ? await service.getListWithStats(page, pageSize) : await service.getList(page, pageSize);
    return c.json(success(result.list, {
      page,
      pageSize,
      total: result.total
    }));
  });
  router2.get("/active", async (c) => {
    const service = new AffiliateNetworkService(c.env);
    const networks = await service.getActive();
    return c.json(success(networks));
  });
  router2.get("/:id", async (c) => {
    const id = c.req.param("id");
    const withStats = c.req.query("withStats") === "true";
    const service = new AffiliateNetworkService(c.env);
    try {
      const network = withStats ? await service.getDetail(id) : await service.getById(id);
      return c.json(success(network));
    } catch (err) {
      if (err instanceof Error && err.message === "Affiliate Network not found") {
        return c.json(error3("Affiliate Network not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.post("/", async (c) => {
    const body = await c.req.json();
    const nameValidation = validateRequired(body.name, "name");
    if (!nameValidation.valid) {
      return c.json(error3(nameValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const service = new AffiliateNetworkService(c.env);
    try {
      const network = await service.create(body);
      return c.json(success(network), HTTP_STATUS.CREATED);
    } catch (err) {
      throw err;
    }
  });
  router2.put("/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const service = new AffiliateNetworkService(c.env);
    try {
      const network = await service.update(id, body);
      return c.json(success(network));
    } catch (err) {
      if (err instanceof Error && err.message === "Affiliate Network not found") {
        return c.json(error3("Affiliate Network not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const service = new AffiliateNetworkService(c.env);
    try {
      await service.delete(id);
      return c.json(success({ deleted: true }));
    } catch (err) {
      if (err instanceof Error && err.message === "Affiliate Network not found") {
        return c.json(error3("Affiliate Network not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  return router2;
}
__name(createAffiliateNetworkRouter, "createAffiliateNetworkRouter");

// src/services/rule/rule.routes.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function createRuleRouter() {
  const router2 = new Hono2();
  router2.get("/", async (c) => {
    const query = {
      page: parseInt(c.req.query("page") || "1"),
      pageSize: parseInt(c.req.query("pageSize") || "20"),
      type: c.req.query("type"),
      status: c.req.query("status")
    };
    const { page, pageSize } = validatePagination(query.page, query.pageSize);
    const repo = new RuleRepository(c.env.DB);
    const result = await repo.findList({ page, pageSize, type: query.type, status: query.status });
    return c.json(success(result.list, {
      page,
      pageSize,
      total: result.total
    }));
  });
  router2.get("/enabled", async (c) => {
    const repo = new RuleRepository(c.env.DB);
    const rules = await repo.findEnabled();
    return c.json(success(rules));
  });
  router2.get("/type/:type", async (c) => {
    const type = c.req.param("type");
    const repo = new RuleRepository(c.env.DB);
    const rules = await repo.findByType(type);
    return c.json(success(rules));
  });
  router2.get("/:id", async (c) => {
    const id = c.req.param("id");
    const repo = new RuleRepository(c.env.DB);
    const rule = await repo.findById(id);
    if (!rule) {
      return c.json(error3("Rule not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }
    return c.json(success(rule));
  });
  router2.get("/:id/history", async (c) => {
    const id = c.req.param("id");
    const limit = parseInt(c.req.query("limit") || "50");
    const repo = new RuleRepository(c.env.DB);
    const history = await repo.getExecutionHistory(id, limit);
    return c.json(success(history));
  });
  router2.post("/", async (c) => {
    const body = await c.req.json();
    const nameValidation = validateRequired(body.name, "name");
    if (!nameValidation.valid) {
      return c.json(error3(nameValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const typeValidation = validateRequired(body.type, "type");
    if (!typeValidation.valid) {
      return c.json(error3(typeValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    if (!body.conditions || body.conditions.length === 0) {
      return c.json(error3("At least one condition is required", ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    if (!body.actions || body.actions.length === 0) {
      return c.json(error3("At least one action is required", ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const repo = new RuleRepository(c.env.DB);
    const rule = await repo.create(body);
    return c.json(success(rule), HTTP_STATUS.CREATED);
  });
  router2.put("/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const repo = new RuleRepository(c.env.DB);
    const existing = await repo.findById(id);
    if (!existing) {
      return c.json(error3("Rule not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }
    const rule = await repo.update(id, body);
    return c.json(success(rule));
  });
  router2.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const repo = new RuleRepository(c.env.DB);
    const existing = await repo.findById(id);
    if (!existing) {
      return c.json(error3("Rule not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }
    await repo.update(id, { status: "deleted" });
    return c.json(success({ deleted: true }));
  });
  router2.post("/:id/enable", async (c) => {
    const id = c.req.param("id");
    const repo = new RuleRepository(c.env.DB);
    const existing = await repo.findById(id);
    if (!existing) {
      return c.json(error3("Rule not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }
    const rule = await repo.update(id, { enabled: true });
    return c.json(success(rule));
  });
  router2.post("/:id/disable", async (c) => {
    const id = c.req.param("id");
    const repo = new RuleRepository(c.env.DB);
    const existing = await repo.findById(id);
    if (!existing) {
      return c.json(error3("Rule not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }
    const rule = await repo.update(id, { enabled: false });
    return c.json(success(rule));
  });
  router2.post("/:id/evaluate", async (c) => {
    const id = c.req.param("id");
    const repo = new RuleRepository(c.env.DB);
    const engine = new RuleEngine(c.env);
    const rule = await repo.findById(id);
    if (!rule) {
      return c.json(error3("Rule not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }
    const triggered = await engine.evaluateRule(rule);
    return c.json(success({ triggered }));
  });
  router2.post("/evaluate-all", async (c) => {
    const engine = new RuleEngine(c.env);
    await engine.evaluateAllRules();
    return c.json(success({ message: "All rules evaluated" }));
  });
  return router2;
}
__name(createRuleRouter, "createRuleRouter");

// src/services/tracking/tracking.routes.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/tracking/click.service.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/tracking/uniqueness.service.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var UniquenessService = class {
  static {
    __name(this, "UniquenessService");
  }
  doService;
  constructor(env2) {
    this.doService = new UniquenessDOService(env2);
  }
  /**
   * 执行去重检查
   * @param request - 去重检查请求
   * @param clickId - 当前点击 ID
   * @returns 去重结果
   */
  async check(request, _clickId) {
    if (request.method === "none") {
      return {
        isUnique: true,
        method: "none",
        firstSeenAt: null,
        existingClickId: null,
        visitorId: request.visitorId,
        shouldSetCookie: false
      };
    }
    const doRequest = {
      campaignId: request.campaignId,
      method: request.method,
      uniquenessParameter: request.uniquenessParameter,
      ttl: request.ttl,
      ip: request.ip,
      userAgent: request.userAgent,
      visitorId: request.visitorId,
      urlParams: Object.fromEntries(request.urlParams),
      fingerprint: request.fingerprint
    };
    const doResult = await this.doService.check(doRequest);
    return {
      isUnique: doResult.isUnique,
      method: doResult.method,
      firstSeenAt: doResult.firstSeenAt,
      existingClickId: doResult.existingClickId,
      visitorId: doResult.visitorId,
      shouldSetCookie: doResult.shouldSetCookie
    };
  }
};
var UNIQUENESS_COOKIE_NAME = "_cfu_vid";
function generateCookieHeader(visitorId, ttlSeconds, domain2) {
  const expires = new Date(Date.now() + ttlSeconds * 1e3).toUTCString();
  let cookie = `${UNIQUENESS_COOKIE_NAME}=${visitorId}; Path=/; Expires=${expires}; HttpOnly; SameSite=Lax`;
  if (domain2) {
    cookie += `; Domain=${domain2}`;
  }
  return cookie;
}
__name(generateCookieHeader, "generateCookieHeader");
function parseVisitorIdFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${UNIQUENESS_COOKIE_NAME}=`)) {
      return cookie.substring(UNIQUENESS_COOKIE_NAME.length + 1);
    }
  }
  return null;
}
__name(parseVisitorIdFromCookie, "parseVisitorIdFromCookie");

// src/services/tracking/filter.service.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var FilterService = class {
  static {
    __name(this, "FilterService");
  }
  /**
   * 从 Flow 列表中选择满足条件的 Flow
   * 从 Flow 对象本身获取 filters
   */
  selectMatchingFlow(flows, request) {
    const matchingFlows = flows.filter((flow) => this.checkFlowByFilters(flow, request));
    if (matchingFlows.length === 0) {
      return null;
    }
    return this.selectByWeight(matchingFlows);
  }
  /**
   * 根据 Flow 自身的 filters 检查是否匹配
   */
  checkFlowByFilters(flow, request) {
    if (!flow.filters || flow.filters.length === 0) {
      return true;
    }
    for (const filter of flow.filters) {
      const result = this.evaluateFlowFilter(filter, request);
      if (!result) {
        return false;
      }
    }
    return true;
  }
  /**
   * 评估单个 Flow Filter
   */
  evaluateFlowFilter(filter, request) {
    const fieldValue = this.getFieldValue(filter.target, request);
    const { executeFilter: executeFilter2 } = (init_flow_filters(), __toCommonJS(flow_filters_exports));
    return executeFilter2(filter.operator, fieldValue, filter.value);
  }
  /**
   * 从请求中获取字段值
   */
  getFieldValue(field, request) {
    if (!field || typeof field !== "string") {
      return void 0;
    }
    if (field.startsWith("visitor.")) {
      const visitorField = field.replace("visitor.", "");
      switch (visitorField) {
        case "ip":
          return request.ip;
        case "userAgent":
          return request.userAgent;
        case "country":
          return request.country;
        case "city":
          return request.city;
        case "device":
          return request.device;
        case "browser":
          return request.browser;
        case "os":
          return request.os;
        default:
          return void 0;
      }
    }
    if (field.startsWith("visit.")) {
      const visitField = field.replace("visit.", "");
      switch (visitField) {
        case "subId":
          return request.subId1;
        case "referrer":
          return request.referer;
        default:
          return void 0;
      }
    }
    if (request.urlParams) {
      return request.urlParams.get(field) || void 0;
    }
    return void 0;
  }
  /**
   * 按权重选择 Flow
   */
  selectByWeight(flows) {
    if (flows.length === 0) {
      return null;
    }
    const totalWeight = flows.reduce((sum, f) => sum + f.weight, 0);
    let random = Math.random() * totalWeight;
    for (const flow of flows) {
      random -= flow.weight;
      if (random <= 0) {
        return flow;
      }
    }
    return flows[flows.length - 1] ?? null;
  }
};

// src/services/tracking/flow-action.service.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var FlowActionService = class {
  static {
    __name(this, "FlowActionService");
  }
  /**
   * 执行 Flow 动作
   */
  async execute(context2) {
    const { flow, request, offer, landingPage } = context2;
    const actionConfig = flow.actionConfig || { type: flow.actionType || "redirect" };
    switch (actionConfig.type) {
      case "redirect":
        return this.executeRedirect(actionConfig, request);
      case "show_offer":
        return this.executeShowOffer(actionConfig, offer, request);
      case "show_landing":
        return this.executeShowLanding(actionConfig, landingPage, request);
      case "traffic_loss":
        return this.executeTrafficLoss();
      default:
        return this.executeRedirect(actionConfig, request);
    }
  }
  /**
   * 执行重定向动作
   */
  executeRedirect(config2, request) {
    let redirectUrl = config2.redirectUrl || "";
    if (!redirectUrl) {
      redirectUrl = this.buildDefaultRedirectUrl(request);
    }
    redirectUrl = this.replaceUrlParams(redirectUrl, request);
    return {
      actionType: "redirect",
      redirectUrl,
      statusCode: config2.statusCode || 302,
      headers: {
        "Location": redirectUrl
      }
    };
  }
  /**
   * 执行显示 Offer 动作
   */
  executeShowOffer(_config, offer, request) {
    if (!offer) {
      return this.executeTrafficLoss();
    }
    const redirectUrl = this.replaceUrlParams(offer.url, request);
    const redirectType = offer.redirectType || "http";
    return this.buildRedirectResult(redirectType, redirectUrl, offer);
  }
  /**
   * 根据重定向类型构建结果
   */
  buildRedirectResult(redirectType, redirectUrl, offer) {
    const baseResult = {
      actionType: "show_offer",
      offer,
      redirectUrl,
      redirectType,
      statusCode: 200
    };
    switch (redirectType) {
      case "http":
        return {
          ...baseResult,
          statusCode: 302,
          headers: {
            "Location": redirectUrl
          }
        };
      case "meta":
        return {
          ...baseResult,
          statusCode: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8"
          },
          body: this.buildMetaRedirectHtml(redirectUrl)
        };
      case "js":
        return {
          ...baseResult,
          statusCode: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8"
          },
          body: this.buildJsRedirectHtml(redirectUrl)
        };
      case "js_blank":
        return {
          ...baseResult,
          statusCode: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8"
          },
          body: this.buildJsBlankRedirectHtml(redirectUrl)
        };
      case "double":
        return {
          ...baseResult,
          statusCode: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8"
          },
          body: this.buildDoubleMetaRedirectHtml(redirectUrl)
        };
      case "remote":
        return {
          ...baseResult,
          statusCode: 302,
          headers: {
            "Location": redirectUrl
          }
        };
      default:
        return {
          ...baseResult,
          statusCode: 302,
          headers: {
            "Location": redirectUrl
          }
        };
    }
  }
  /**
   * 构建 Meta 重定向 HTML
   */
  buildMetaRedirectHtml(url) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${this.escapeHtml(url)}">
  <title>Redirecting...</title>
</head>
<body>
  <p>Redirecting to <a href="${this.escapeHtml(url)}">${this.escapeHtml(url)}</a></p>
</body>
</html>`;
  }
  /**
   * 构建 JS 重定向 HTML
   */
  buildJsRedirectHtml(url) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <script type="text/javascript">
    window.location.href = "${this.escapeJs(url)}";
  <\/script>
</head>
<body>
  <p>Redirecting...</p>
</body>
</html>`;
  }
  /**
   * 构建 JS 清除 Referrer 重定向 HTML
   */
  buildJsBlankRedirectHtml(url) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <script type="text/javascript">
    (function() {
      var url = "${this.escapeJs(url)}";
      var a = document.createElement('a');
      a.href = url;
      a.rel = 'noreferrer';
      document.body.appendChild(a);
      a.click();
    })();
  <\/script>
</head>
<body>
  <p>Redirecting...</p>
</body>
</html>`;
  }
  /**
   * 构建双重 Meta 重定向 HTML
   * 通过两次重定向来隐藏来源
   */
  buildDoubleMetaRedirectHtml(url) {
    const intermediateUrl = "about:blank";
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${this.escapeHtml(intermediateUrl)}">
  <title>Redirecting...</title>
  <script type="text/javascript">
    (function() {
      var targetUrl = "${this.escapeJs(url)}";
      setTimeout(function() {
        var a = document.createElement('a');
        a.href = targetUrl;
        a.rel = 'noreferrer';
        document.body.appendChild(a);
        a.click();
      }, 100);
    })();
  <\/script>
</head>
<body>
  <p>Redirecting...</p>
</body>
</html>`;
  }
  /**
   * HTML 转义
   */
  escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  /**
   * JS 字符串转义
   */
  escapeJs(str) {
    return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
  }
  /**
   * 执行显示落地页动作
   */
  executeShowLanding(_config, landingPage, request) {
    if (!landingPage) {
      return this.executeTrafficLoss();
    }
    const redirectUrl = this.replaceUrlParams(landingPage.url, request);
    return {
      actionType: "show_landing",
      landingPage,
      redirectUrl,
      statusCode: 302,
      headers: {
        "Location": redirectUrl
      }
    };
  }
  /**
   * 执行流量丢失动作
   */
  executeTrafficLoss() {
    return {
      actionType: "traffic_loss",
      statusCode: 204
    };
  }
  /**
   * 构建默认重定向 URL
   */
  buildDefaultRedirectUrl(request) {
    return request.referer || "about:blank";
  }
  /**
   * 替换 URL 中的参数占位符
   * 支持 {clickid}, {campaign}, {subid1} 等格式
   */
  replaceUrlParams(url, request) {
    const params = request.urlParams || new URLSearchParams();
    const replacements = {
      "{campaign}": request.campaignId || "",
      "{campaign_id}": request.campaignId || "",
      "{subid1}": request.subId1 || "",
      "{subid2}": request.subId2 || "",
      "{subid3}": request.subId3 || "",
      "{subid4}": request.subId4 || "",
      "{subid5}": request.subId5 || "",
      "{referer}": request.referer || "",
      "{ip}": request.ip || "",
      "{country}": request.country || "",
      "{city}": request.city || "",
      "{device}": request.device || "",
      "{browser}": request.browser || "",
      "{os}": request.os || "",
      "{useragent}": request.userAgent || ""
    };
    params.forEach((value, key) => {
      replacements[`{${key}}`] = value;
      replacements[`{${key.toLowerCase()}}`] = value;
    });
    let result = url;
    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(placeholder, "gi"), encodeURIComponent(value));
    }
    return result;
  }
  /**
   * 验证动作配置
   */
  validateActionConfig(config2) {
    switch (config2.type) {
      case "redirect":
        if (!config2.redirectUrl) {
          return { valid: false, error: "redirectUrl is required for redirect action" };
        }
        break;
      case "show_offer":
        if (!config2.offerId) {
          return { valid: false, error: "offerId is required for show_offer action" };
        }
        break;
      case "show_landing":
        if (!config2.landingPageId) {
          return { valid: false, error: "landingPageId is required for show_landing action" };
        }
        break;
      case "traffic_loss":
        break;
      default:
        return { valid: false, error: `Unknown action type: ${config2.type}` };
    }
    return { valid: true };
  }
};
var flowActionService = new FlowActionService();

// src/services/tracking/click.service.ts
var ClickService = class {
  static {
    __name(this, "ClickService");
  }
  flowRepo;
  campaignRepo;
  offerRepo;
  lpRepo;
  doService;
  uniquenessService;
  filterService;
  flowActionService;
  constructor(env2) {
    const db = getD1Connection(env2);
    this.flowRepo = new FlowRepository(db);
    this.campaignRepo = new CampaignRepository(db);
    this.offerRepo = new OfferRepository(db);
    this.lpRepo = new LandingPageRepository(db);
    this.doService = new DOService(env2);
    this.uniquenessService = new UniquenessService(env2);
    this.filterService = new FilterService();
    this.flowActionService = new FlowActionService();
  }
  /**
   * 处理点击请求
   * 核心流程：
   * 1. 获取 Campaign 配置
   * 2. 执行去重检查
   * 3. 选择 Flow
   * 4. 执行 Filters
   * 5. 选择 Landing Page 和 Offer
   * 6. 执行 Action
   * 7. 记录分析数据
   */
  async handleClick(request) {
    try {
      const clickId = generateClickId();
      const visitorId = request.existingVisitorId || generateVisitorId();
      const campaign = await this.resolveCampaign(request.campaignId);
      if (!campaign) {
        throw new Error("Campaign not found");
      }
      let baseUrl = "http://localhost";
      try {
        console.log("Request URL Params:", request.urlParams);
        const originalUrl = request.urlParams ? request.urlParams.get("__originalUrl") : null;
        console.log("Original URL:", originalUrl);
        if (originalUrl && typeof originalUrl === "string") {
          const requestUrl = new URL(originalUrl);
          baseUrl = campaign.domain && typeof campaign.domain === "string" ? campaign.domain : requestUrl.origin;
        } else {
          baseUrl = campaign.domain && typeof campaign.domain === "string" ? campaign.domain : "http://localhost";
        }
        console.log("Base URL:", baseUrl);
      } catch (err) {
        console.error("URL creation error:", err);
        baseUrl = campaign.domain && typeof campaign.domain === "string" ? campaign.domain : "http://localhost";
      }
      const uniquenessResult = await this.checkUniqueness(request, clickId, campaign);
      const flows = await this.flowRepo.findByCampaignIdAndStatus(campaign.id, "active");
      console.log("[ClickService] Found flows:", flows.length, "for campaign:", campaign.id, "Campaign alias:", request.campaignId);
      const selectedFlow = await this.selectFlow(flows, request);
      console.log("[ClickService] Selected flow:", selectedFlow?.id || "No flow selected");
      console.log("[ClickService] Selected flow details:", selectedFlow ? {
        id: selectedFlow.id,
        name: selectedFlow.name,
        actionType: selectedFlow.actionType,
        filters: selectedFlow.filters?.length || 0
      } : null);
      if (flows.length === 0) {
        console.warn(`[ClickService] Campaign ${campaign.id} (${campaign.name}) has NO active flows configured!`);
      }
      let actionConfig;
      let selectedLP = null;
      let selectedOffer = null;
      if (selectedFlow) {
        const [lpAssociations, offerAssociations] = await Promise.all([
          this.flowRepo.getLandingPages(selectedFlow.id),
          this.flowRepo.getOffers(selectedFlow.id)
        ]);
        if (lpAssociations.length > 0) {
          const lpAssoc = this.selectByWeight(lpAssociations);
          selectedLP = await this.lpRepo.findById(lpAssoc.landingPageId);
          console.log("Selected landing page:", selectedLP?.id || "No landing page");
        }
        if (offerAssociations.length > 0) {
          const offerAssoc = this.selectByWeight(offerAssociations);
          selectedOffer = await this.offerRepo.findById(offerAssoc.offerId);
          console.log("Selected offer:", selectedOffer?.id || "No offer");
        }
        actionConfig = this.buildActionConfig(selectedFlow, selectedLP, selectedOffer);
      } else {
        actionConfig = { type: "traffic_loss" };
      }
      console.log("Action config:", actionConfig);
      let redirectUrl;
      let redirectType = "http";
      let responseBody;
      if (selectedFlow && selectedOffer) {
        const actionResult = await this.flowActionService.execute({
          flow: selectedFlow,
          request,
          offer: selectedOffer,
          landingPage: selectedLP || void 0
        });
        redirectUrl = actionResult.redirectUrl || "";
        redirectType = actionResult.redirectType;
        responseBody = actionResult.body;
        console.log("FlowAction result:", {
          redirectUrl,
          redirectType,
          hasBody: !!responseBody
        });
      } else {
        redirectUrl = await this.executeAction(actionConfig, clickId, visitorId, request, baseUrl);
      }
      console.log("Redirect URL:", redirectUrl);
      const cfInfo = request.cfInfo;
      const bm = cfInfo?.botManagement;
      const tlsAuth = cfInfo?.tlsClientAuth;
      const clickData = {
        clickId,
        campaignId: campaign.id,
        flowId: selectedFlow?.id || null,
        landingPageId: selectedLP?.id || null,
        offerId: selectedOffer?.id || null,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        ip: request.ip,
        userAgent: request.userAgent,
        referer: request.referer || null,
        country: request.country || null,
        city: request.city || null,
        region: request.region || null,
        device: request.device || null,
        browser: request.browser || null,
        os: request.os || null,
        isp: cfInfo?.asOrganization || null,
        connectionType: null,
        visitorId,
        subId1: request.subId1 || null,
        subId2: request.subId2 || null,
        subId3: request.subId3 || null,
        subId4: request.subId4 || null,
        subId5: request.subId5 || null,
        cost: request.cost || 0,
        // Cloudflare 特定信息
        cfRayId: cfInfo?.rayId,
        cfConnectingIP: cfInfo?.connectingIP,
        cfIPCountry: cfInfo?.ipCountry,
        cfIsEUCountry: cfInfo?.isEUCountry,
        cfASN: cfInfo?.asn,
        cfASOrganization: cfInfo?.asOrganization,
        cfColo: cfInfo?.colo,
        cfLatitude: cfInfo?.latitude,
        cfLongitude: cfInfo?.longitude,
        cfPostalCode: cfInfo?.postalCode,
        cfMetroCode: cfInfo?.metroCode,
        cfTimezone: cfInfo?.timezone,
        cfContinent: cfInfo?.continent,
        cfHTTPProtocol: cfInfo?.httpProtocol,
        cfTLSVersion: cfInfo?.tlsVersion,
        cfTLSCipher: cfInfo?.tlsCipher,
        cfTLSClientRandom: cfInfo?.tlsClientRandom,
        cfTLSClientHelloLength: cfInfo?.tlsClientHelloLength,
        cfTLSClientCiphersSha1: cfInfo?.tlsClientCiphersSha1,
        cfTLSClientExtensionsSha1: cfInfo?.tlsClientExtensionsSha1,
        // Bot Management
        cfBotScore: bm?.score ?? null,
        cfBotVerified: bm?.verifiedBot ?? false,
        cfBotStaticResource: bm?.staticResource ?? false,
        cfBotJA3Hash: bm?.ja3Hash ?? null,
        cfBotJA4: bm?.ja4 ?? null,
        cfBotDetectionIds: bm?.detectionIds ?? [],
        cfBotJSDetectionPassed: bm?.jsDetectionPassed ?? null,
        // TLS Client Auth
        cfTLSClientAuthCertVerified: tlsAuth?.certVerified ?? false,
        cfTLSClientAuthCertFingerprintSHA1: tlsAuth?.certFingerprintSHA1 ?? null,
        cfTLSClientAuthCertFingerprintSHA256: tlsAuth?.certFingerprintSHA256 ?? null,
        cfTLSClientAuthCertIssuerDN: tlsAuth?.certIssuerDN ?? null,
        cfTLSClientAuthCertSubjectDN: tlsAuth?.certSubjectDN ?? null,
        cfTLSClientAuthCertSerial: tlsAuth?.certSerial ?? null,
        cfTLSClientAuthCertNotBefore: tlsAuth?.certNotBefore ?? null,
        cfTLSClientAuthCertNotAfter: tlsAuth?.certNotAfter ?? null,
        cfTLSClientAuthCertRevoked: tlsAuth?.certRevoked ?? null,
        cfTLSClientAuthCertPresented: tlsAuth?.certPresented ?? null,
        // 指纹和风险评估
        fingerprint: request.fingerprint ?? null,
        riskScore: request.riskAssessment?.riskScore ?? 0,
        isBot: request.riskAssessment?.isBot ?? false,
        isSuspicious: request.riskAssessment?.isSuspicious ?? false,
        riskReasons: request.riskAssessment?.reasons ?? []
      };
      console.log("[ClickService] About to track click to Durable Objects:", {
        clickId,
        campaignId: campaign.id,
        flowId: selectedFlow?.id,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      try {
        await this.doService.trackClick({
          id: clickId,
          campaignId: campaign.id,
          ip: request.ip,
          country: request.country,
          city: request.city,
          region: request.region,
          timestamp: Date.now(),
          cost: request.cost
        });
        console.log("[ClickService] trackClick called successfully");
      } catch (err) {
        console.error("[ClickService] Failed to track click to Durable Objects:", err);
      }
      await this.doService.incrementCounter(`campaign:${campaign.id}:today`, {
        clicks: 1,
        spend: request.cost || 0
      });
      if (!uniquenessResult.isUnique) {
        await this.doService.incrementCounter(`campaign:${campaign.id}:duplicates`, {
          clicks: 1
        });
      }
      return {
        clickId,
        visitorId,
        redirectUrl,
        flowId: selectedFlow?.id || null,
        landingPageId: selectedLP?.id || null,
        offerId: selectedOffer?.id || null,
        isUnique: uniquenessResult.isUnique,
        uniquenessMethod: uniquenessResult.method,
        shouldSetCookie: uniquenessResult.shouldSetCookie,
        existingClickId: uniquenessResult.existingClickId,
        isTrafficLoss: actionConfig.type === "traffic_loss",
        actionType: actionConfig.type,
        redirectType,
        responseBody
      };
    } catch (err) {
      console.error("Handle click error:", err);
      throw err;
    }
  }
  /**
   * 解析 Campaign（支持 alias 或 id）
   */
  async resolveCampaign(campaignIdOrAlias) {
    let campaign = await this.campaignRepo.findById(campaignIdOrAlias);
    if (!campaign) {
      campaign = await this.campaignRepo.findByAlias(campaignIdOrAlias);
    }
    return campaign;
  }
  /**
   * 执行去重检查
   * 优先使用请求中的配置，否则使用 Campaign 的默认配置
   */
  async checkUniqueness(request, clickId, campaign) {
    const method = request.uniquenessMethod || campaign.uniquenessMethod || "none";
    const ttl = request.uniquenessTTL || campaign.uniquenessTTL || 86400;
    const uniquenessParameter = request.uniquenessParameter || campaign.uniquenessParameter || void 0;
    return this.uniquenessService.check(
      {
        campaignId: campaign.id,
        method,
        uniquenessParameter,
        ttl,
        ip: request.ip,
        userAgent: request.userAgent,
        visitorId: request.existingVisitorId || generateVisitorId(),
        urlParams: request.urlParams || new URLSearchParams()
      },
      clickId
    );
  }
  /**
   * 选择 Flow
   * 先执行 Filters，再按权重选择
   */
  async selectFlow(flows, request) {
    if (flows.length === 0) {
      return null;
    }
    return this.filterService.selectMatchingFlow(flows, request);
  }
  /**
   * 构建 Action 配置
   */
  buildActionConfig(_flow, landingPage, offer) {
    if (landingPage) {
      return {
        type: "redirect",
        url: landingPage.url,
        landingPageId: landingPage.id,
        offerId: offer?.id
      };
    }
    if (offer) {
      return {
        type: "show_offer",
        offerId: offer.id,
        url: offer.url
      };
    }
    return { type: "traffic_loss" };
  }
  /**
   * 执行 Action
   */
  async executeAction(config2, clickId, visitorId, request, baseUrl) {
    const params = this.buildTrackingParams(clickId, visitorId, request);
    let fullBaseUrl = baseUrl || "http://localhost";
    if (typeof fullBaseUrl !== "string") {
      fullBaseUrl = "http://localhost";
    }
    if (!fullBaseUrl.startsWith("http://") && !fullBaseUrl.startsWith("https://")) {
      fullBaseUrl = `https://${fullBaseUrl}`;
    }
    try {
      switch (config2.type) {
        case "redirect":
          if (config2.url) {
            return this.appendParams(config2.url, params);
          }
          return new URL(`/click/${clickId}`, fullBaseUrl).toString();
        case "show_offer":
          if (config2.url) {
            return this.appendParams(config2.url, params);
          }
          if (config2.offerId) {
            return new URL(`/offer/${config2.offerId}?${params.toString()}`, fullBaseUrl).toString();
          }
          return new URL(`/click/${clickId}`, fullBaseUrl).toString();
        case "traffic_loss":
        default:
          return new URL(`/traffic-loss?${params.toString()}`, fullBaseUrl).toString();
      }
    } catch (err) {
      console.error("Execute action error:", err);
      return `https://${baseUrl}/traffic-loss?${params.toString()}`;
    }
  }
  /**
   * 构建追踪参数
   */
  buildTrackingParams(clickId, visitorId, request) {
    const params = new URLSearchParams();
    params.set("clickid", clickId);
    params.set("visitor", visitorId);
    if (request.subId1) params.set("subid1", request.subId1);
    if (request.subId2) params.set("subid2", request.subId2);
    if (request.subId3) params.set("subid3", request.subId3);
    return params;
  }
  /**
   * 追加参数到 URL
   */
  appendParams(url, params) {
    if (!url || typeof url !== "string") {
      return `/traffic-loss?${params.toString()}`;
    }
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}${params.toString()}`;
  }
  /**
   * 按权重选择
   */
  selectByWeight(items) {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    for (const item of items) {
      random -= item.weight;
      if (random <= 0) {
        return item;
      }
    }
    return items[items.length - 1];
  }
};
function createClickService(env2) {
  return new ClickService(env2);
}
__name(createClickService, "createClickService");

// src/services/tracking/conversion.service.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var ConversionService = class {
  static {
    __name(this, "ConversionService");
  }
  doService;
  constructor(env2) {
    this.doService = new DOService(env2);
  }
  /**
   * 处理转化请求
   */
  async handleConversion(request) {
    const conversionId = generateConversionId();
    const conversionData = {
      conversionId,
      clickId: request.clickId,
      campaignId: request.campaignId,
      offerId: request.offerId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      revenue: request.revenue,
      payout: request.payout || 0,
      currency: request.currency || "USD",
      conversionType: request.conversionType || "lead",
      offerName: request.offerName || null
    };
    await this.doService.trackConversion({
      clickId: request.clickId,
      revenue: request.revenue
    });
    await this.doService.incrementCounter(`campaign:${request.campaignId}:today`, {
      conversions: 1,
      revenue: request.revenue
    });
    return {
      conversionId,
      success: true
    };
  }
  /**
   * 批量处理转化
   */
  async handleBatchConversions(requests) {
    const results = [];
    for (const request of requests) {
      try {
        const result = await this.handleConversion(request);
        results.push(result);
      } catch (error4) {
        results.push({
          conversionId: "",
          success: false
        });
      }
    }
    return results;
  }
  /**
   * 获取转化的点击详情
   */
  async getConversionClickDetails(_conversionId) {
    return null;
  }
};

// src/services/tracking/tracking-script.routes.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/tracking/tracking-script.service.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var TrackingScriptService = class {
  static {
    __name(this, "TrackingScriptService");
  }
  constructor(_env) {
  }
  /**
   * 生成跟踪脚本代码 (用于 Landing Page)
   * 集成结构化设备指纹生成器
   */
  generateTrackingScript(config2) {
    const { campaignId, domain: domain2, collectNonUniqueClicks = false } = config2;
    const workerUrl = `https://${domain2}`;
    const script = `
<!-- CFTracking Tracking Script -->
<script>
(function() {
  'use strict';
  
  const CONFIG = {
    campaignId: '${campaignId}',
    workerUrl: '${workerUrl}',
    collectNonUniqueClicks: ${collectNonUniqueClicks}
  };

  // Base32 \u5B57\u7B26\u96C6\uFF08\u5C0F\u5199\uFF0C\u53BB\u6389\u6613\u6DF7\u6DC6\u7684 l \u548C o\uFF09
  const BASE32_CHARS = '0123456789abcdefghijkmnpqrstuvwxyz';

  /**
   * \u5C06\u6570\u5B57\u8F6C\u6362\u4E3A Base32 \u5B57\u7B26\u4E32
   */
  function toBase32(num, length) {
    let result = '';
    let n = Math.abs(num);
    do {
      result = BASE32_CHARS[n % 32] + result;
      n = Math.floor(n / 32);
    } while (n > 0);
    return result.padStart(length, '0');
  }

  /**
   * \u8BA1\u7B97\u5B57\u7B26\u4E32\u54C8\u5E0C\u503C\uFF08FNV-1a \u7B97\u6CD5\u53D8\u4F53\uFF09
   */
  function hashString(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0;
  }

  /**
   * \u63D0\u53D6\u7279\u5F81\u5E76\u7F16\u7801
   */
  function encodeFeatures(features, bitsPerFeature) {
    bitsPerFeature = bitsPerFeature || 5;
    let result = '';
    for (let i = 0; i < features.length; i++) {
      const maxValue = Math.pow(2, bitsPerFeature) - 1;
      const normalizedValue = Math.abs(features[i]) % maxValue;
      result += toBase32(normalizedValue, Math.ceil(bitsPerFeature / 5));
    }
    return result;
  }

  // ============================================
  // \u8BBE\u5907\u80FD\u529B\u68C0\u6D4B\u5DE5\u5177\u51FD\u6570
  // ============================================

  /**
   * \u68C0\u6D4B\u84DD\u7259\u652F\u6301
   */
  function detectBluetooth() {
    const nav = navigator;
    if (nav.bluetooth) {
      return nav.bluetooth.getAvailability ? 2 : 1;
    }
    return 0;
  }

  /**
   * \u68C0\u6D4B\u89E6\u6478\u677F/\u89E6\u63A7\u8BBE\u5907
   */
  function detectTouchpad() {
    let code = 0;
    const maxTouchPoints = navigator.maxTouchPoints || 0;
    if (maxTouchPoints > 0) code += 1;
    if (maxTouchPoints >= 5) code += 2;
    if (window.matchMedia('(pointer: coarse)').matches) {
      code += 4;
    }
    return code % 8;
  }

  /**
   * \u68C0\u6D4B\u7535\u6C60\u4FE1\u606F\uFF08\u5F02\u6B65\uFF09
   */
  async function detectBattery() {
    try {
      const nav = navigator;
      if (!nav.getBattery) return 0;
      const battery = await nav.getBattery();
      let code = 1;
      if (battery.charging) code += 2;
      if (battery.level > 0.5) code += 4;
      return code % 8;
    } catch (e) {
      return 0;
    }
  }

  /**
   * \u68C0\u6D4B\u97F3\u9891/\u97F3\u54CD\u8BBE\u5907
   */
  async function detectAudioDevices() {
    try {
      let code = 0;
      if (navigator.mediaDevices) {
        code += 1;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(function(d) { return d.kind === 'audiooutput'; });
        if (audioOutputs.length > 0) code += 2;
        if (audioOutputs.length > 1) code += 4;
      }
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) code += 1;
      return code % 8;
    } catch (e) {
      return 0;
    }
  }

  /**
   * \u68C0\u6D4B\u663E\u5361/GPU\u4FE1\u606F
   */
  function detectGPU() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 0;
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) return 1;
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      let code = 0;
      if (vendor.indexOf('NVIDIA') !== -1) code = 1;
      else if (vendor.indexOf('AMD') !== -1 || vendor.indexOf('ATI') !== -1) code = 2;
      else if (vendor.indexOf('Intel') !== -1) code = 3;
      else if (vendor.indexOf('Apple') !== -1) code = 4;
      else if (vendor.indexOf('Qualcomm') !== -1) code = 5;
      else if (vendor.indexOf('Mali') !== -1) code = 6;
      else if (vendor.indexOf('Adreno') !== -1) code = 7;
      else code = 8;
      if (/RTX|RX [6-9]|GTX [1-9][0-9]/.test(renderer)) code += 8;
      return code % 16;
    } catch (e) {
      return 0;
    }
  }

  /**
   * \u751F\u6210 Canvas \u6307\u7EB9
   */
  function generateCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'canvas_not_supported';
      canvas.width = 280;
      canvas.height = 60;
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = '16px Arial';
      ctx.fillStyle = '#333';
      ctx.fillText('CFTracking Device Fingerprint', 10, 25);
      ctx.font = '12px Times New Roman';
      ctx.fillStyle = '#666';
      ctx.fillText('Time: ' + Date.now(), 10, 45);
      ctx.strokeStyle = '#007bff';
      ctx.beginPath();
      ctx.arc(240, 30, 15, 0, Math.PI * 2);
      ctx.stroke();
      const gradient = ctx.createLinearGradient(150, 0, 280, 60);
      gradient.addColorStop(0, 'rgba(255,0,0,0.3)');
      gradient.addColorStop(1, 'rgba(0,0,255,0.3)');
      ctx.fillStyle = gradient;
      ctx.fillRect(150, 35, 120, 20);
      return canvas.toDataURL('image/png');
    } catch (e) {
      return 'canvas_error';
    }
  }

  /**
   * \u68C0\u6D4B\u53EF\u7528\u5B57\u4F53
   */
  function detectFonts() {
    const testFonts = [
      'Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana',
      'Helvetica', 'Tahoma', 'Trebuchet MS', 'Palatino Linotype',
      'Impact', 'Comic Sans MS', 'Arial Black'
    ];
    const availableFonts = [];
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.font = testSize + ' monospace';
    const baselineWidth = ctx.measureText(testString).width;
    for (let i = 0; i < testFonts.length; i++) {
      ctx.font = testSize + ' "' + testFonts[i] + '", monospace';
      const width = ctx.measureText(testString).width;
      if (width !== baselineWidth) {
        availableFonts.push(testFonts[i]);
      }
    }
    return availableFonts.join(',');
  }

  /**
   * \u83B7\u53D6 WebGL \u4FE1\u606F
   */
  function getWebGLInfo() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 'webgl_not_supported';
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        return vendor + '|' + renderer;
      }
      return 'webgl_no_debug_info';
    } catch (e) {
      return 'webgl_error';
    }
  }

  // ============================================
  // \u7ED3\u6784\u5316\u6307\u7EB9\u5404\u90E8\u5206\u751F\u6210\u51FD\u6570
  // ============================================

  /**
   * \u786C\u4EF6\u7A33\u5B9A\u90E8\u5206 (16\u4F4D)
   * \u53D8\u5316\u9891\u7387\uFF1A\u4F4E - \u5C4F\u5E55\u3001\u786C\u4EF6\u89C4\u683C\u3001Canvas\u6307\u7EB9\u3001\u5916\u8BBE\u4FE1\u606F
   */
  async function generateHardwareStablePart() {
    const features = [];
    
    // 1. \u5C4F\u5E55\u5206\u8FA8\u7387\u54C8\u5E0C (4\u4F4D)
    const screenRes = screen.width + 'x' + screen.height + 'x' + screen.colorDepth;
    features.push(hashString(screenRes) % 1048576);
    
    // 2. \u786C\u4EF6\u89C4\u683C\uFF1ACPU\u6838\u5FC3\u6570 + \u5185\u5B58 + GPU (4\u4F4D)
    const cores = navigator.hardwareConcurrency || 0;
    const memory = navigator.deviceMemory || 0;
    const gpuCode = detectGPU();
    features.push((cores * 1000 + memory * 100 + gpuCode) % 1048576);
    
    // 3. Canvas \u6307\u7EB9\u54C8\u5E0C (4\u4F4D)
    const canvasHash = generateCanvasFingerprint();
    features.push(hashString(canvasHash) % 1048576);
    
    // 4. \u5916\u8BBE\u4FE1\u606F\uFF1A\u84DD\u7259 + \u89E6\u6478\u677F + \u7535\u6C60 + \u97F3\u54CD (4\u4F4D)
    const bluetoothCode = detectBluetooth();
    const touchpadCode = detectTouchpad();
    const batteryCode = await detectBattery();
    const audioCode = await detectAudioDevices();
    const peripheralCode = (bluetoothCode * 512 + touchpadCode * 64 + batteryCode * 8 + audioCode);
    features.push(peripheralCode % 1048576);
    
    return encodeFeatures(features, 20);
  }

  /**
   * \u786C\u4EF6\u6613\u53D8\u90E8\u5206 (4-8\u4F4D)
   * \u53D8\u5316\u9891\u7387\uFF1A\u4E2D - \u65F6\u533A\u3001\u8BED\u8A00\u3001\u5C4F\u5E55\u65B9\u5411\u3001\u989C\u8272\u6A21\u5F0F
   */
  function generateHardwareVolatilePart() {
    const features = [];
    
    // 1. \u65F6\u533A\u504F\u79FB (2\u4F4D)
    const timezoneOffset = new Date().getTimezoneOffset();
    features.push(Math.abs(timezoneOffset) % 1024);
    
    // 2. \u8BED\u8A00\u8BBE\u7F6E (2\u4F4D)
    const language = navigator.language || 'en';
    features.push(hashString(language) % 1024);
    
    // 3. \u5C4F\u5E55\u65B9\u5411 (1\u4F4D)
    const orientation = screen.orientation ? screen.orientation.type : 'unknown';
    const orientationCode = orientation.indexOf('portrait') !== -1 ? 1 : 
                            orientation.indexOf('landscape') !== -1 ? 2 : 0;
    features.push(orientationCode % 32);
    
    // 4. \u7CFB\u7EDF\u989C\u8272\u6A21\u5F0F (1-3\u4F4D)
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 1 : 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 2 : 0;
    features.push((colorScheme * 10 + reducedMotion) % 32);
    
    return encodeFeatures(features, 10).substring(0, 6);
  }

  /**
   * \u8F6F\u4EF6\u7A33\u5B9A\u90E8\u5206 (8\u4F4D)
   * \u53D8\u5316\u9891\u7387\uFF1A\u4F4E - \u64CD\u4F5C\u7CFB\u7EDF\u3001\u6D4F\u89C8\u5668\u5F15\u64CE\u3001\u5E73\u53F0
   */
  function generateSoftwareStablePart() {
    const features = [];
    const ua = navigator.userAgent;
    let osCode = 0;
    let osVersion = 0;
    
    // \u64CD\u4F5C\u7CFB\u7EDF\u68C0\u6D4B
    if (/Windows NT 10/.test(ua)) { osCode = 1; osVersion = 10; }
    else if (/Windows NT 6.3/.test(ua)) { osCode = 1; osVersion = 8; }
    else if (/Mac OS X 10_15/.test(ua) || /macOS/.test(ua)) { osCode = 2; osVersion = 15; }
    else if (/iPhone OS 17|iPad OS 17/.test(ua)) { osCode = 3; osVersion = 17; }
    else if (/iPhone OS 16|iPad OS 16/.test(ua)) { osCode = 3; osVersion = 16; }
    else if (/Android 14/.test(ua)) { osCode = 4; osVersion = 14; }
    else if (/Android 13/.test(ua)) { osCode = 4; osVersion = 13; }
    else if (/Linux/.test(ua)) { osCode = 5; osVersion = 1; }
    
    features.push((osCode * 100 + osVersion) % 32768);
    
    // \u6D4F\u89C8\u5668\u5F15\u64CE
    let engineCode = 0;
    if (/Chrome\\/[0-9]+/.test(ua)) engineCode = 1;
    else if (/Firefox\\/[0-9]+/.test(ua)) engineCode = 2;
    else if (/Safari\\/[0-9]+/.test(ua) && /Version\\/[0-9]+/.test(ua)) engineCode = 3;
    else if (/Edg\\/[0-9]+/.test(ua)) engineCode = 4;
    features.push(engineCode % 1024);
    
    // \u5E73\u53F0\u67B6\u6784
    const platform = navigator.platform || '';
    const archCode = platform.indexOf('Win64') !== -1 || platform.indexOf('x86_64') !== -1 ? 1 : 
                     platform.indexOf('arm') !== -1 ? 2 : 0;
    features.push(archCode % 32);
    
    // Cookie/LocalStorage/IndexedDB \u652F\u6301
    const cookieSupport = navigator.cookieEnabled ? 1 : 0;
    const lsSupport = typeof Storage !== 'undefined' ? 2 : 0;
    const idbSupport = typeof indexedDB !== 'undefined' ? 4 : 0;
    features.push((cookieSupport + lsSupport + idbSupport) % 1024);
    
    return encodeFeatures(features, 15).substring(0, 8);
  }

  /**
   * \u8F6F\u4EF6\u6613\u53D8\u90E8\u5206 (4-8\u4F4D)
   * \u53D8\u5316\u9891\u7387\uFF1A\u9AD8 - \u6D4F\u89C8\u5668\u7248\u672C\u3001\u63D2\u4EF6\u3001\u5B57\u4F53\u3001WebGL
   */
  function generateSoftwareVolatilePart() {
    const features = [];
    const ua = navigator.userAgent;
    let version = 0;
    
    // \u6D4F\u89C8\u5668\u7248\u672C\u53F7
    const chromeMatch = ua.match(/Chrome\\/(\\d+)/);
    const firefoxMatch = ua.match(/Firefox\\/(\\d+)/);
    const safariMatch = ua.match(/Version\\/(\\d+)/);
    const edgeMatch = ua.match(/Edg\\/(\\d+)/);
    
    if (chromeMatch) version = parseInt(chromeMatch[1], 10);
    else if (firefoxMatch) version = parseInt(firefoxMatch[1], 10);
    else if (safariMatch) version = parseInt(safariMatch[1], 10);
    else if (edgeMatch) version = parseInt(edgeMatch[1], 10);
    
    features.push(version % 1024);
    
    // \u63D2\u4EF6\u6570\u91CF
    const pluginCount = navigator.plugins ? navigator.plugins.length : 0;
    features.push(pluginCount % 32);
    
    // \u5B57\u4F53\u5217\u8868\u54C8\u5E0C
    const fontHash = detectFonts();
    features.push(hashString(fontHash) % 1024);
    
    // WebGL \u6E32\u67D3\u5668\u4FE1\u606F
    const webglInfo = getWebGLInfo();
    features.push(hashString(webglInfo) % 1024);
    
    return encodeFeatures(features, 10).substring(0, 7);
  }

  /**
   * \u751F\u6210\u5B8C\u6574\u7ED3\u6784\u5316\u8BBE\u5907\u6307\u7EB9
   * \u683C\u5F0F\uFF1A[\u786C\u4EF6\u7A33\u5B9A(16\u4F4D)].[\u786C\u4EF6\u6613\u53D8(4-8\u4F4D)]-[\u8F6F\u4EF6\u7A33\u5B9A(8\u4F4D)].[\u8F6F\u4EF6\u6613\u53D8(4-8\u4F4D)]
   */
  async function generateStructuredFingerprint() {
    const hardwareStable = await generateHardwareStablePart();
    const hardwareVolatile = generateHardwareVolatilePart();
    const softwareStable = generateSoftwareStablePart();
    const softwareVolatile = generateSoftwareVolatilePart();
    return hardwareStable + '.' + hardwareVolatile + '-' + softwareStable + '.' + softwareVolatile;
  }

  // \u83B7\u53D6 URL \u53C2\u6570
  function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      clickId: params.get('clickid') || params.get('subid'),
      subId1: params.get('subid1') || params.get('sub1'),
      subId2: params.get('subid2') || params.get('sub2'),
      subId3: params.get('subid3') || params.get('sub3'),
      subId4: params.get('subid4') || params.get('sub4'),
      subId5: params.get('subid5') || params.get('sub5'),
    };
  }

  // \u83B7\u53D6 UTM \u53C2\u6570
  function getUTMParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_term: params.get('utm_term') || '',
      utm_content: params.get('utm_content') || '',
      utm_id: params.get('utm_id') || '',
    };
  }

  // \u83B7\u53D6\u8BBE\u5907\u4FE1\u606F
  async function getDeviceInfo() {
    const fingerprint = await generateStructuredFingerprint();
    return {
      fingerprint: fingerprint,
      screenResolution: screen.width + 'x' + screen.height,
      screenColorDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      language: navigator.language,
      languages: navigator.languages ? navigator.languages.join(',') : navigator.language,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: navigator.deviceMemory || 0,
      touchSupport: 'ontouchstart' in window ? 1 : 0,
      cookieEnabled: navigator.cookieEnabled ? 1 : 0,
      doNotTrack: navigator.doNotTrack || '',
    };
  }

  // \u83B7\u53D6\u6216\u521B\u5EFA visitor ID
  function getVisitorId() {
    let visitorId = localStorage.getItem('cf_visitor_id');
    if (!visitorId) {
      visitorId = 'v_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('cf_visitor_id', visitorId);
    }
    return visitorId;
  }

  // \u53D1\u9001\u8DDF\u8E2A\u8BF7\u6C42
  async function trackVisit() {
    const params = getUrlParams();
    const utmParams = getUTMParams();
    const deviceInfo = await getDeviceInfo();
    const visitorId = getVisitorId();
    
    // \u68C0\u67E5\u662F\u5426\u5DF2\u8DDF\u8E2A\uFF08\u907F\u514D\u91CD\u590D\uFF09
    const trackedKey = 'cf_tracked_' + CONFIG.campaignId;
    if (!CONFIG.collectNonUniqueClicks && sessionStorage.getItem(trackedKey)) {
      return;
    }
    
    const trackData = {
      campaignId: CONFIG.campaignId,
      clickId: params.clickId,
      visitorId: visitorId,
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      subId1: params.subId1,
      subId2: params.subId2,
      subId3: params.subId3,
      subId4: params.subId4,
      subId5: params.subId5,
      // UTM \u53C2\u6570
      utmSource: utmParams.utm_source,
      utmMedium: utmParams.utm_medium,
      utmCampaign: utmParams.utm_campaign,
      utmTerm: utmParams.utm_term,
      utmContent: utmParams.utm_content,
      utmId: utmParams.utm_id,
      // \u7ED3\u6784\u5316\u8BBE\u5907\u6307\u7EB9\u4FE1\u606F
      deviceFingerprint: deviceInfo.fingerprint,
      screenResolution: deviceInfo.screenResolution,
      screenColorDepth: deviceInfo.screenColorDepth,
      timezone: deviceInfo.timezone,
      timezoneOffset: deviceInfo.timezoneOffset,
      language: deviceInfo.language,
      languages: deviceInfo.languages,
      platform: deviceInfo.platform,
      hardwareConcurrency: deviceInfo.hardwareConcurrency,
      deviceMemory: deviceInfo.deviceMemory,
      touchSupport: deviceInfo.touchSupport,
      cookieEnabled: deviceInfo.cookieEnabled,
      doNotTrack: deviceInfo.doNotTrack,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(CONFIG.workerUrl + '/api/tracking/script/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackData)
      });
      
      if (response.ok) {
        const result = await response.json();
        sessionStorage.setItem(trackedKey, '1');
        
        // \u89E6\u53D1 ready \u56DE\u8C03
        if (window.KTracking && window.KTracking._readyCallbacks) {
          window.KTracking._readyCallbacks.forEach(function(cb) {
            cb(result.subId || params.clickId, result.token);
          });
        }
      }
    } catch (err) {
      console.error('[CFTracking] Track error:', err);
    }
  }

  // KTracking \u5168\u5C40\u5BF9\u8C61
  window.KTracking = {
    _readyCallbacks: [],
    
    // \u9875\u9762\u52A0\u8F7D\u5B8C\u6210\u540E\u6267\u884C
    ready: function(callback) {
      if (document.readyState === 'complete') {
        const params = getUrlParams();
        callback(params.clickId, null);
      } else {
        this._readyCallbacks.push(callback);
      }
    },

    // \u4E0A\u62A5\u8F6C\u5316
    reportConversion: async function(payout, status, params, callback) {
      const urlParams = getUrlParams();
      const conversionData = {
        campaignId: CONFIG.campaignId,
        clickId: urlParams.clickId,
        payout: payout || 0,
        status: status || 'lead',
        tid: params?.tid || Math.floor(Math.random() * 1000000000).toString(),
        subIds: {}
      };

      // \u63D0\u53D6 sub_id_1 \u5230 sub_id_30
      if (params) {
        for (let i = 1; i <= 30; i++) {
          const key = 'sub_id_' + i;
          if (params[key]) {
            conversionData.subIds[key] = params[key];
          }
        }
      }

      try {
        const response = await fetch(CONFIG.workerUrl + '/api/tracking/script/conversion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(conversionData)
        });

        if (response.ok) {
          console.log('[CFTracking] Conversion reported:', status);
          if (callback) callback();
        }
      } catch (err) {
        console.error('[CFTracking] Conversion error:', err);
      }
    },

    // \u66F4\u65B0\u70B9\u51FB\u53C2\u6570
    update: async function(params) {
      const urlParams = getUrlParams();
      const updateData = {
        campaignId: CONFIG.campaignId,
        clickId: urlParams.clickId,
        subIds: params
      };

      try {
        const response = await fetch(CONFIG.workerUrl + '/api/tracking/script/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });

        if (response.ok) {
          console.log('[CFTracking] Parameters updated');
        }
      } catch (err) {
        console.error('[CFTracking] Update error:', err);
      }
    }
  };

  // \u9875\u9762\u52A0\u8F7D\u65F6\u81EA\u52A8\u8DDF\u8E2A
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackVisit);
  } else {
    trackVisit();
  }
})();
<\/script>
<!-- End CFTracking Tracking Script -->`;
    return script.trim();
  }
  /**
   * 生成 KClient JS 代码 (用于远程站点)
   */
  generateKClientJS(config2) {
    const { campaignId, domain: domain2, base64Encode = false } = config2;
    const workerUrl = `https://${domain2}`;
    let script = `
<!-- CFTracking KClient JS -->
<script>
(function() {
  'use strict';
  
  const CONFIG = {
    campaignId: '${campaignId}',
    workerUrl: '${workerUrl}'
  };

  // \u83B7\u53D6 visitor ID
  function getVisitorId() {
    let visitorId = localStorage.getItem('cf_kclient_vid');
    if (!visitorId) {
      visitorId = 'kc_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('cf_kclient_vid', visitorId);
    }
    return visitorId;
  }

  // \u6267\u884C\u6D41\u91CF\u5904\u7406
  async function processTraffic() {
    const visitorId = getVisitorId();
    
    const requestData = {
      campaignId: CONFIG.campaignId,
      visitorId: visitorId,
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(CONFIG.workerUrl + '/api/tracking/kclient/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const result = await response.json();
        
        // \u6839\u636E\u8FD4\u56DE\u7ED3\u679C\u6267\u884C\u52A8\u4F5C
        if (result.action === 'redirect' && result.url) {
          window.location.href = result.url;
        } else if (result.action === 'show_content' && result.content) {
          // \u52A8\u6001\u66FF\u6362\u9875\u9762\u5185\u5BB9
          document.open();
          document.write(result.content);
          document.close();
        }
        // action === 'do_nothing' \u5219\u4FDD\u6301\u5F53\u524D\u9875\u9762
      }
    } catch (err) {
      console.error('[CFTracking KClient] Process error:', err);
    }
  }

  // \u7ACB\u5373\u6267\u884C
  processTraffic();
})();
<\/script>
<!-- End CFTracking KClient JS -->`;
    if (base64Encode) {
      script = `<!-- CFTracking KClient JS (Base64) -->
<script>
eval(atob('${btoa(script)}'));
<\/script>`;
    }
    return script.trim();
  }
};
function createTrackingScriptService(env2) {
  return new TrackingScriptService(env2);
}
__name(createTrackingScriptService, "createTrackingScriptService");

// src/services/tracking/tracking-script.routes.ts
function createTrackingScriptRouter() {
  const router2 = new Hono2();
  const scriptService = createTrackingScriptService({});
  router2.get("/script/code", async (c) => {
    try {
      const campaignId = c.req.query("campaignId");
      const domain2 = c.req.query("domain") || new URL(c.req.url).host;
      const type = c.req.query("type") || "tracking";
      const base64 = c.req.query("base64") === "true";
      if (!campaignId) {
        return c.json(error3("campaignId is required"), HTTP_STATUS.BAD_REQUEST);
      }
      const config2 = {
        campaignId,
        domain: domain2,
        base64Encode: base64
      };
      let code;
      if (type === "kclient") {
        code = scriptService.generateKClientJS(config2);
      } else {
        code = scriptService.generateTrackingScript(config2);
      }
      return c.json(success({
        code,
        type,
        campaignId,
        domain: domain2
      }));
    } catch (err) {
      console.error("[TrackingScript] Generate code error:", err);
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to generate code"),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.post("/script/track", async (c) => {
    try {
      const body = await c.req.json();
      const clientIP = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For") || "unknown";
      const clickId = body.clickId || generateClickId();
      const visitorId = body.visitorId || generateVisitorId();
      const cf = c.req.raw.cf || {};
      const trackingDO = c.env.TRACKING_STATS_DO.get(
        c.env.TRACKING_STATS_DO.idFromName("global-stats")
      );
      await trackingDO.fetch("http://do/track-click", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: clickId,
          campaignId: body.campaignId,
          ip: clientIP,
          country: cf.country || "",
          city: cf.city || "",
          region: cf.region || "",
          timestamp: new Date(body.timestamp || Date.now()).getTime(),
          cost: 0
        })
      });
      return c.json(success({
        tracked: true,
        clickId,
        visitorId,
        token: null
      }));
    } catch (err) {
      console.error("[TrackingScript] Track error:", err);
      return c.json(
        error3(err instanceof Error ? err.message : "Track failed"),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.post("/script/conversion", async (c) => {
    try {
      const body = await c.req.json();
      if (!body.campaignId) {
        return c.json(error3("campaignId is required"), HTTP_STATUS.BAD_REQUEST);
      }
      const conversionId = body.tid || crypto.randomUUID();
      const trackingDO = c.env.TRACKING_STATS_DO.get(
        c.env.TRACKING_STATS_DO.idFromName("global-stats")
      );
      await trackingDO.fetch("http://do/track-conversion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          clickId: body.clickId,
          revenue: body.payout || 0
        })
      });
      return c.json(success({
        conversionId,
        status: body.status,
        recorded: true
      }));
    } catch (err) {
      console.error("[TrackingScript] Conversion error:", err);
      return c.json(
        error3(err instanceof Error ? err.message : "Conversion failed"),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.post("/script/update", async (c) => {
    try {
      const body = await c.req.json();
      if (!body.campaignId || !body.clickId) {
        return c.json(error3("campaignId and clickId are required"), HTTP_STATUS.BAD_REQUEST);
      }
      const trackingDO = c.env.TRACKING_STATS_DO.get(
        c.env.TRACKING_STATS_DO.idFromName("global-stats")
      );
      return c.json(success({
        updated: true,
        clickId: body.clickId,
        subIds: body.subIds
      }));
    } catch (err) {
      console.error("[TrackingScript] Update error:", err);
      return c.json(
        error3(err instanceof Error ? err.message : "Update failed"),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.post("/kclient/process", async (c) => {
    try {
      const body = await c.req.json();
      const clientIP = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For") || "unknown";
      const clickService = createClickService(c.env);
      const clickResult = await clickService.handleClick({
        campaignId: body.campaignId,
        ip: clientIP,
        userAgent: body.userAgent || "",
        referer: body.referrer,
        existingVisitorId: body.visitorId
      });
      let action;
      let resultData = {};
      if (clickResult.isTrafficLoss) {
        action = "do_nothing";
      } else if (clickResult.redirectUrl) {
        action = "redirect";
        resultData.url = clickResult.redirectUrl;
      } else {
        action = "do_nothing";
      }
      return c.json(success({
        action,
        clickId: clickResult.clickId,
        ...resultData
      }));
    } catch (err) {
      console.error("[TrackingScript] KClient process error:", err);
      return c.json(
        error3(err instanceof Error ? err.message : "Process failed"),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  return router2;
}
__name(createTrackingScriptRouter, "createTrackingScriptRouter");

// src/utils/cloudflare.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function extractCloudflareInfo(c) {
  const req = c.req;
  const raw2 = req.raw;
  const cf = raw2.cf;
  const headers = {};
  req.raw.headers.forEach((value, key) => {
    headers[key] = value;
  });
  let botManagement = null;
  if (cf?.botManagement) {
    const bm = cf.botManagement;
    botManagement = {
      score: bm.score ?? null,
      verifiedBot: bm.verifiedBot ?? false,
      staticResource: bm.staticResource ?? false,
      ja3Hash: bm.ja3Hash ?? null,
      ja4: bm.ja4 ?? null,
      detectionIds: bm.detectionIds ?? [],
      jsDetectionPassed: bm.jsDetection?.passed ?? null
    };
  }
  let tlsClientAuth = null;
  if (cf?.tlsClientAuth) {
    const tls = cf.tlsClientAuth;
    tlsClientAuth = {
      certVerified: tls.certVerified ?? false,
      certFingerprintSHA1: tls.certFingerprintSHA1 ?? null,
      certFingerprintSHA256: tls.certFingerprintSHA256 ?? null,
      certIssuerDN: tls.certIssuerDN ?? null,
      certSubjectDN: tls.certSubjectDN ?? null,
      certSerial: tls.certSerial ?? null,
      certNotBefore: tls.certNotBefore ?? null,
      certNotAfter: tls.certNotAfter ?? null,
      certRevoked: tls.certRevoked ?? null,
      certPresented: tls.certPresented ?? null
    };
  }
  return {
    // 基础请求信息
    rayId: req.header("CF-Ray") ?? null,
    connectingIP: req.header("CF-Connecting-IP") ?? null,
    ipCountry: req.header("CF-IPCountry") ?? null,
    isEUCountry: cf?.isEUCountry === "1" || cf?.isEUCountry === true,
    // CF 对象信息
    asn: cf?.asn ?? null,
    asOrganization: cf?.asOrganization ?? null,
    colo: cf?.colo ?? null,
    // 地理位置
    country: cf?.country ?? null,
    city: cf?.city ?? null,
    region: cf?.region ?? null,
    regionCode: cf?.regionCode ?? null,
    latitude: cf?.latitude ?? null,
    longitude: cf?.longitude ?? null,
    postalCode: cf?.postalCode ?? null,
    continent: cf?.continent ?? null,
    timezone: cf?.timezone ?? null,
    metroCode: cf?.metroCode ?? null,
    // 协议信息
    httpProtocol: cf?.httpProtocol ?? null,
    tlsVersion: cf?.tlsVersion ?? null,
    tlsCipher: cf?.tlsCipher ?? null,
    tlsClientRandom: cf?.tlsClientRandom ?? null,
    tlsClientHelloLength: cf?.tlsClientHelloLength ?? null,
    tlsClientCiphersSha1: cf?.tlsClientCiphersSha1 ?? null,
    tlsClientExtensionsSha1: cf?.tlsClientExtensionsSha1 ?? null,
    // Bot Management
    botManagement,
    // TLS 客户端认证
    tlsClientAuth,
    // 请求头
    headers,
    // 其他
    requestPriority: cf?.requestPriority ?? null,
    clientAcceptEncoding: cf?.clientAcceptEncoding ?? null,
    // User Agent
    userAgent: req.header("User-Agent") ?? null
  };
}
__name(extractCloudflareInfo, "extractCloudflareInfo");
function generateFingerprint(info3) {
  const factors = [
    info3.connectingIP,
    info3.userAgent,
    info3.asOrganization,
    info3.tlsClientCiphersSha1,
    info3.tlsClientExtensionsSha1,
    info3.botManagement?.ja3Hash,
    info3.botManagement?.ja4
  ].filter(Boolean);
  const combined = factors.join("|");
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `fp_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
}
__name(generateFingerprint, "generateFingerprint");
function assessRisk(info3) {
  const reasons = [];
  let riskScore = 0;
  const bm = info3.botManagement;
  if (bm) {
    if (bm.score !== null && bm.score <= 30) {
      riskScore += 50;
      reasons.push(`Low bot score: ${bm.score}`);
    }
    if (bm.verifiedBot) {
      riskScore += 10;
      reasons.push("Verified bot");
    }
    if (bm.jsDetectionPassed === false) {
      riskScore += 30;
      reasons.push("JS detection failed");
    }
  }
  if (!info3.tlsClientCiphersSha1) {
    riskScore += 20;
    reasons.push("Missing TLS fingerprint");
  }
  if (info3.asOrganization?.toLowerCase().includes("vpn") || info3.asOrganization?.toLowerCase().includes("proxy") || info3.asOrganization?.toLowerCase().includes("hosting")) {
    riskScore += 15;
    reasons.push("Possible VPN/Proxy");
  }
  return {
    isBot: riskScore >= 50,
    isSuspicious: riskScore >= 30,
    riskScore: Math.min(riskScore, 100),
    reasons
  };
}
__name(assessRisk, "assessRisk");
function getClientIP(c) {
  return c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() || "unknown";
}
__name(getClientIP, "getClientIP");

// src/services/tracking/tracking.routes.ts
function createTrackingRouter() {
  const router2 = new Hono2();
  router2.route("/script", createTrackingScriptRouter());
  router2.route("/kclient", createTrackingScriptRouter());
  router2.get("/click/:campaignAlias", async (c) => {
    const campaignAlias = c.req.param("campaignAlias");
    const service = new ClickService(c.env);
    const cfInfo = extractCloudflareInfo(c);
    const fingerprint = generateFingerprint(cfInfo);
    const riskAssessment = assessRisk(cfInfo);
    const ip = getClientIP(c);
    const userAgent = c.req.header("User-Agent") || "unknown";
    const referer = c.req.header("Referer");
    const country = cfInfo.country || cfInfo.ipCountry || void 0;
    const city = cfInfo.city || void 0;
    const region = cfInfo.region || void 0;
    const device = detectDevice(userAgent);
    const browser = detectBrowser(userAgent);
    const os = detectOS(userAgent);
    const subId1 = c.req.query("sub1") || c.req.query("subid1");
    const subId2 = c.req.query("sub2") || c.req.query("subid2");
    const subId3 = c.req.query("sub3") || c.req.query("subid3");
    const subId4 = c.req.query("sub4") || c.req.query("subid4");
    const subId5 = c.req.query("sub5") || c.req.query("subid5");
    const cost = c.req.query("cost") ? parseFloat(c.req.query("cost")) : void 0;
    const uniquenessMethod = c.req.query("uniq") || void 0;
    const uniquenessParameter = c.req.query("uniq_param") || void 0;
    const uniquenessTTL = c.req.query("uniq_ttl") ? parseInt(c.req.query("uniq_ttl"), 10) : void 0;
    const cookieHeader = c.req.header("Cookie") || null;
    const existingVisitorId = parseVisitorIdFromCookie(cookieHeader) || void 0;
    try {
      const urlParams = new URL(c.req.url).searchParams;
      urlParams.set("__originalUrl", c.req.url);
      const result = await service.handleClick({
        campaignId: campaignAlias,
        ip,
        userAgent,
        referer,
        country,
        city,
        region,
        device,
        browser,
        os,
        subId1,
        subId2,
        subId3,
        subId4,
        subId5,
        cost,
        uniquenessMethod,
        uniquenessParameter,
        uniquenessTTL,
        existingVisitorId,
        urlParams,
        // Cloudflare 特定信息
        cfInfo,
        fingerprint,
        riskAssessment
      });
      if (result.isTrafficLoss) {
        return c.json(
          success({
            message: "Traffic loss - no matching flow",
            clickId: result.clickId,
            isUnique: result.isUnique
          }),
          HTTP_STATUS.OK
        );
      }
      if (result.redirectType && result.redirectType !== "http" && result.responseBody) {
        const response2 = new Response(result.responseBody, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8"
          }
        });
        if (result.shouldSetCookie) {
          response2.headers.set(
            "Set-Cookie",
            generateCookieHeader(result.visitorId, uniquenessTTL || 86400 * 30)
          );
        }
        return response2;
      }
      const response = c.redirect(result.redirectUrl, 302);
      if (result.shouldSetCookie) {
        response.headers.set(
          "Set-Cookie",
          generateCookieHeader(result.visitorId, uniquenessTTL || 86400 * 30)
        );
      }
      return response;
    } catch (err) {
      if (err instanceof Error && err.message === "Campaign not found") {
        return c.json(error3("Campaign not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.post("/click", async (c) => {
    const body = await c.req.json();
    const campaignValidation = validateRequired(body.campaignId, "campaignId");
    if (!campaignValidation.valid) {
      return c.json(error3(campaignValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const service = new ClickService(c.env);
    const cookieHeader = c.req.header("Cookie") || null;
    const existingVisitorId = parseVisitorIdFromCookie(cookieHeader) || void 0;
    try {
      const urlParams = body.urlParams ? new URLSearchParams(body.urlParams) : new URLSearchParams();
      urlParams.set("__originalUrl", c.req.url);
      const result = await service.handleClick({
        campaignId: body.campaignId,
        ip: body.ip || c.req.header("CF-Connecting-IP") || "unknown",
        userAgent: body.userAgent || c.req.header("User-Agent") || "unknown",
        referer: body.referer,
        country: body.country,
        city: body.city,
        device: body.device,
        browser: body.browser,
        os: body.os,
        subId1: body.subId1,
        subId2: body.subId2,
        subId3: body.subId3,
        cost: body.cost,
        uniquenessMethod: body.uniquenessMethod,
        uniquenessParameter: body.uniquenessParameter,
        uniquenessTTL: body.uniquenessTTL,
        existingVisitorId,
        urlParams
      });
      const response = c.json(success(result), HTTP_STATUS.CREATED);
      if (result.shouldSetCookie) {
        response.headers.set(
          "Set-Cookie",
          generateCookieHeader(result.visitorId, 86400 * 30)
        );
      }
      return response;
    } catch (err) {
      if (err instanceof Error && err.message === "Campaign not found") {
        return c.json(error3("Campaign not found", ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
  router2.post("/conversion", async (c) => {
    const body = await c.req.json();
    const clickIdValidation = validateRequired(body.clickId, "clickId");
    if (!clickIdValidation.valid) {
      return c.json(error3(clickIdValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const campaignValidation = validateRequired(body.campaignId, "campaignId");
    if (!campaignValidation.valid) {
      return c.json(error3(campaignValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const offerValidation = validateRequired(body.offerId, "offerId");
    if (!offerValidation.valid) {
      return c.json(error3(offerValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const service = new ConversionService(c.env);
    const result = await service.handleConversion(body);
    return c.json(success(result), HTTP_STATUS.CREATED);
  });
  router2.post("/conversion/postback", async (c) => {
    const clickId = c.req.query("clickid") || c.req.query("click_id");
    const revenue = parseFloat(c.req.query("revenue") || c.req.query("payout") || "0");
    const offerId = c.req.query("offer_id") || c.req.query("offerid");
    if (!clickId) {
      return c.json(error3("clickId is required", ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const service = new ConversionService(c.env);
    const result = await service.handleConversion({
      clickId,
      campaignId: c.req.query("campaign_id") || "",
      offerId: offerId || "",
      revenue,
      payout: revenue
    });
    return c.json(success(result));
  });
  router2.post("/conversion/batch", async (c) => {
    const body = await c.req.json();
    if (!Array.isArray(body.conversions) || body.conversions.length === 0) {
      return c.json(error3("conversions array is required", ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const service = new ConversionService(c.env);
    const results = await service.handleBatchConversions(body.conversions);
    return c.json(success(results));
  });
  return router2;
}
__name(createTrackingRouter, "createTrackingRouter");
function detectDevice(userAgent) {
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    if (/tablet|ipad/i.test(ua)) return "tablet";
    return "mobile";
  }
  return "desktop";
}
__name(detectDevice, "detectDevice");
function detectBrowser(userAgent) {
  const ua = userAgent.toLowerCase();
  if (/edg/i.test(ua)) return "Edge";
  if (/chrome/i.test(ua)) return "Chrome";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  if (/opera|opr/i.test(ua)) return "Opera";
  if (/msie|trident/i.test(ua)) return "IE";
  return "Unknown";
}
__name(detectBrowser, "detectBrowser");
function detectOS(userAgent) {
  const ua = userAgent.toLowerCase();
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os|macos/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  if (/android/i.test(ua)) return "Android";
  if (/ios|iphone|ipad/i.test(ua)) return "iOS";
  return "Unknown";
}
__name(detectOS, "detectOS");

// src/services/analytics/aggregation.routes.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function createAggregationRouter() {
  const router2 = new Hono2();
  router2.post("/aggregate", async (c) => {
    try {
      const body = await c.req.json();
      const aggregationService = createAggregationService(c.env);
      const result = await aggregationService.aggregateDailyData(body?.date);
      if (result.success) {
        return c.json(success({
          message: result.message,
          recordsProcessed: result.recordsProcessed
        }));
      } else {
        return c.json(error3(
          result.message,
          "AGGREGATION_ERROR",
          { errors: result.errors }
        ), HTTP_STATUS.INTERNAL_ERROR);
      }
    } catch (err) {
      console.error("[Aggregation API] Error:", err);
      return c.json(
        error3(err instanceof Error ? err.message : "Aggregation failed"),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.post("/aggregate/historical", async (c) => {
    try {
      const body = await c.req.json();
      if (!body.startDate || !body.endDate) {
        return c.json(
          error3("startDate and endDate are required"),
          HTTP_STATUS.BAD_REQUEST
        );
      }
      const aggregationService = createAggregationService(c.env);
      const result = await aggregationService.aggregateHistoricalData(
        body.startDate,
        body.endDate
      );
      if (result.success) {
        return c.json(success({
          message: result.message,
          recordsProcessed: result.recordsProcessed,
          dateRange: { start: body.startDate, end: body.endDate }
        }));
      } else {
        return c.json(error3(
          result.message,
          "AGGREGATION_ERROR",
          { errors: result.errors }
        ), HTTP_STATUS.INTERNAL_ERROR);
      }
    } catch (err) {
      console.error("[Aggregation API] Historical aggregation error:", err);
      return c.json(
        error3(err instanceof Error ? err.message : "Historical aggregation failed"),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.get("/status", async (c) => {
    return c.json(success({
      status: "active",
      message: "Analytics aggregation service is running",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }));
  });
  return router2;
}
__name(createAggregationRouter, "createAggregationRouter");

// src/services/analytics/analytics.routes.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/analytics/dashboard-query.service.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var DashboardQueryService = class {
  static {
    __name(this, "DashboardQueryService");
  }
  trafficRepo;
  constructor(env2) {
    this.trafficRepo = new TrafficRepository(getD1Connection(env2));
  }
  /**
   * 获取 Dashboard 统计数据
   * 根据时间范围从不同数据源获取数据
   * - < 90天数据 ──► DO读取
   * - > 90天数据 ──► D1读取
   */
  async getDashboardStats(range, env2) {
    const { startDate, endDate } = this.getDateRange(range);
    const ninetyDaysAgo = /* @__PURE__ */ new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const startDateObj = new Date(startDate);
    const useDO = startDateObj >= ninetyDaysAgo;
    const dataSource = useDO ? "DO" : "D1";
    console.log(`[DashboardQueryService] Range: ${range}, DataSource: ${dataSource}, Start: ${startDate}, End: ${endDate}`);
    if (useDO) {
      return this.getDashboardStatsFromDO(range, env2);
    } else {
      return this.getDashboardStatsFromD1(range);
    }
  }
  /**
   * 从 D1 获取 Dashboard 统计数据
   */
  async getDashboardStatsFromD1(range) {
    const d1Result = await this.trafficRepo.getDashboardStats(range);
    const d1ChartData = await this.trafficRepo.getChartData(range);
    const metrics = this.formatD1Metrics(d1Result);
    const chartData = this.formatD1ChartData(d1ChartData);
    const entityStats = await this.getEntityStatsFromD1(range);
    return {
      metrics,
      chartData,
      entityStats,
      dataSource: "D1",
      queryTime: (/* @__PURE__ */ new Date()).toISOString(),
      range
    };
  }
  /**
   * 从 DO 获取 Dashboard 统计数据
   */
  async getDashboardStatsFromDO(range, env2) {
    try {
      const trackingDO = getTrackingStatsStub(env2, "global-stats");
      const [statsResponse, chartResponse, entityStatsResponse] = await Promise.all([
        trackingDO.fetch("http://do/stats"),
        trackingDO.fetch(`http://do/chart-data?range=${range}`),
        trackingDO.fetch(`http://do/entity-stats?range=${range}`)
      ]);
      const stats = await statsResponse.json();
      const chartData = await chartResponse.json();
      const entityStatsData = await entityStatsResponse.json();
      const metrics = this.formatDOMetrics(stats);
      const formattedChartData = chartData.chartData || [];
      const entityStats = entityStatsData.stats || {};
      return {
        metrics,
        chartData: formattedChartData,
        entityStats,
        dataSource: "DO",
        queryTime: (/* @__PURE__ */ new Date()).toISOString(),
        range
      };
    } catch (error4) {
      console.error("[DashboardQueryService] Error fetching from DO:", error4);
      return this.getDashboardStatsFromD1(range);
    }
  }
  /**
   * 格式化 DO 指标数据
   */
  formatDOMetrics(data) {
    return [
      { key: "clicks", label: "Clicks", value: data.todayClicks?.toString() || "0", isPositive: true, format: "number" },
      { key: "unique_clicks_campaign", label: "Unique clicks (campaign)", value: data.uniqueClicks?.toString() || "0", isPositive: true, format: "number" },
      { key: "conversions", label: "Conversions", value: data.todayConversions?.toString() || "0", isPositive: true, format: "number" },
      { key: "spend", label: "Cost", value: `$${data.todayCost?.toFixed(2) || "0.00"}`, isPositive: false, format: "currency" },
      { key: "revenue_confirmed", label: "Revenue (confirmed)", value: `$${data.todayRevenue?.toFixed(2) || "0.00"}`, isPositive: true, format: "currency" },
      { key: "profit_confirmed", label: "Profit/Loss (confirmed)", value: `$${data.todayProfit?.toFixed(2) || "0.00"}`, isPositive: true, format: "currency" },
      { key: "roi_confirmed", label: "ROI (confirmed)", value: `${data.todayROI?.toFixed(2) || "0"}%`, isPositive: true, format: "percentage" }
    ];
  }
  /**
   * 获取趋势报告数据
   * 从 D1 获取数据
   */
  async getTrendReport(startDate, endDate, _interval = "day", campaignId) {
    const trendData = await this.trafficRepo.getTrend(campaignId || "", startDate, endDate);
    return this.formatD1TrendData(trendData);
  }
  /**
   * 获取近期点击数据
   * 从 D1 获取数据
   */
  async getRecentClicks(params) {
    const dataSource = "D1";
    const clicks = await this.trafficRepo.getRecentClicks(params.limit || 50);
    return {
      list: clicks,
      total: clicks.length,
      dataSource: "D1"
    };
  }
  /**
   * 获取实体统计数据
   * 从 D1 获取数据
   */
  async getEntityStats(entityType, range) {
    const stats = await this.trafficRepo.getEntityStats(entityType, range);
    return stats.map((item) => ({
      name: item.name || "Unknown",
      clicks: Number(item.clicks) || 0,
      impressions: Number(item.impressions) || 0,
      conversions: Number(item.conversions) || 0,
      spend: Number(item.spend) || 0,
      revenue: Number(item.revenue) || 0,
      unique_visitors: 0
    }));
  }
  /**
   * 从 D1 获取实体统计数据
   */
  async getEntityStatsFromD1(range) {
    const entityTypes = ["campaigns", "countries", "device_types", "browsers"];
    const stats = {};
    for (const entityType of entityTypes) {
      try {
        const entityStats = await this.trafficRepo.getEntityStats(entityType, range);
        stats[entityType] = entityStats.map((item) => ({
          name: item.name || "Unknown",
          clicks: Number(item.clicks) || 0,
          impressions: Number(item.impressions) || 0,
          conversions: Number(item.conversions) || 0,
          spend: Number(item.spend) || 0,
          revenue: Number(item.revenue) || 0,
          unique_visitors: 0
        }));
      } catch (error4) {
        console.warn(`[DashboardQueryService] ${entityType} stats from D1: No data available`);
        stats[entityType] = [];
      }
    }
    return stats;
  }
  /**
   * 格式化 D1 指标数据
   */
  formatD1Metrics(data) {
    const metricsMap = {};
    for (const item of data) {
      metricsMap[item.key] = item;
    }
    return [
      { key: "clicks", label: "Clicks", value: metricsMap.clicks?.value || "0", isPositive: true, format: "number" },
      { key: "unique_clicks_campaign", label: "Unique clicks (campaign)", value: metricsMap.unique_clicks_campaign?.value || "0", isPositive: true, format: "number" },
      { key: "conversions", label: "Conversions", value: metricsMap.conversions?.value || "0", isPositive: true, format: "number" },
      { key: "spend", label: "Cost", value: metricsMap.spend?.value || "$0.00", isPositive: false, format: "currency" },
      { key: "revenue_confirmed", label: "Revenue (confirmed)", value: metricsMap.revenue_confirmed?.value || "$0.00", isPositive: true, format: "currency" },
      { key: "profit_confirmed", label: "Profit/Loss (confirmed)", value: metricsMap.profit_confirmed?.value || "$0.00", isPositive: true, format: "currency" },
      { key: "roi_confirmed", label: "ROI (confirmed)", value: metricsMap.roi_confirmed?.value || "0%", isPositive: true, format: "percentage" }
    ];
  }
  /**
   * 格式化 D1 图表数据
   */
  formatD1ChartData(data) {
    return data.map((item) => ({
      date: item.date || "",
      clicks: Number(item.clicks) || 0,
      conversions: Number(item.conversions) || 0,
      spend: Number(item.spend) || 0,
      revenue: Number(item.revenue) || 0,
      impressions: Number(item.impressions) || 0
    }));
  }
  /**
   * 格式化 D1 趋势数据
   */
  formatD1TrendData(data) {
    return data.map((item) => ({
      date: item.date || "",
      clicks: Number(item.clicks) || 0,
      conversions: Number(item.conversions) || 0,
      spend: Number(item.spend) || 0,
      revenue: Number(item.revenue) || 0,
      impressions: Number(item.impressions) || 0
    }));
  }
  /**
   * 获取指定类型的报表数据
   * 支持 traffic | conversion | financial | roi
   * 从 D1 获取数据
   */
  async getReport(reportType, options) {
    const { startDate, endDate, groupBy, limit, sortBy, sortOrder } = options;
    const dataSource = "D1";
    const baseQuery = {
      startDate,
      endDate,
      groupBy,
      limit,
      sortBy,
      sortOrder
    };
    switch (reportType) {
      case "traffic":
        return this.getTrafficReport(dataSource, baseQuery);
      case "conversion":
        return this.getConversionReport(dataSource, baseQuery);
      case "financial":
        return this.getFinancialReport(dataSource, baseQuery);
      case "roi":
        return this.getROIReport(dataSource, baseQuery);
      default:
        return [];
    }
  }
  /**
   * 获取流量报表
   * 从 D1 获取数据
   */
  async getTrafficReport(_dataSource, _query) {
    const stats = await this.trafficRepo.getEntityStats("campaigns", "last30days");
    return stats.map((item) => ({
      date: item.name || "N/A",
      clicks: Number(item.clicks) || 0,
      impressions: Number(item.impressions) || 0,
      unique_visitors: 0,
      conversions: Number(item.conversions) || 0,
      cr: Number(item.clicks) > 0 ? (Number(item.conversions) / Number(item.clicks) * 100).toFixed(2) + "%" : "0%"
    }));
  }
  /**
   * 获取转化报表
   * 从 D1 获取数据
   */
  async getConversionReport(_dataSource, _query) {
    const stats = await this.trafficRepo.getEntityStats("campaigns", "last30days");
    return stats.map((item) => ({
      date: item.name || "N/A",
      conversions: Number(item.conversions) || 0,
      revenue: Number(item.revenue) || 0,
      cost: Number(item.spend) || 0,
      profit: (Number(item.revenue) || 0) - (Number(item.spend) || 0),
      roi: Number(item.spend) > 0 ? ((Number(item.revenue) - Number(item.spend)) / Number(item.spend) * 100).toFixed(2) + "%" : "0%"
    }));
  }
  /**
   * 获取财务报表
   * 从 D1 获取数据
   */
  async getFinancialReport(_dataSource, _query) {
    const stats = await this.trafficRepo.getEntityStats("campaigns", "last30days");
    return stats.map((item) => ({
      date: item.name || "N/A",
      spend: Number(item.spend) || 0,
      revenue: Number(item.revenue) || 0,
      profit: (Number(item.revenue) || 0) - (Number(item.spend) || 0),
      margin: Number(item.revenue) > 0 ? ((Number(item.revenue) - Number(item.spend)) / Number(item.revenue) * 100).toFixed(2) + "%" : "0%"
    }));
  }
  /**
   * 获取ROI报表
   * 从 D1 获取数据
   */
  async getROIReport(_dataSource, _query) {
    const stats = await this.trafficRepo.getEntityStats("campaigns", "last30days");
    return stats.map((item) => {
      const clicks = Number(item.clicks) || 0;
      const spend = Number(item.spend) || 0;
      const revenue = Number(item.revenue) || 0;
      return {
        date: item.name || "N/A",
        spend,
        revenue,
        profit: revenue - spend,
        roi: spend > 0 ? ((revenue - spend) / spend * 100).toFixed(2) + "%" : "0%",
        epc: clicks > 0 ? (revenue / clicks).toFixed(2) : "0",
        cpc: clicks > 0 ? (spend / clicks).toFixed(2) : "0"
      };
    });
  }
  /**
   * 根据 range 获取日期范围
   */
  getDateRange(range) {
    const now = /* @__PURE__ */ new Date();
    const endDate = now.toISOString().split("T")[0];
    let startDate = endDate;
    switch (range) {
      case "today":
        break;
      case "yesterday":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
        break;
      case "last7days":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
        break;
      case "last30days":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
        break;
      case "last3months":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
        break;
      case "thismonth":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        break;
      case "lastmonth":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
        break;
    }
    return { startDate, endDate };
  }
};
function createDashboardQueryService(env2) {
  return new DashboardQueryService(env2);
}
__name(createDashboardQueryService, "createDashboardQueryService");

// src/services/cache/etag-cache-manager.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/cache/unified-cache-manager.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var CacheKeyBuilder = class {
  static {
    __name(this, "CacheKeyBuilder");
  }
  static PREFIX = "cftrack";
  static VERSION = "v1";
  /**
   * 构建Dashboard缓存键
   */
  static dashboard(range) {
    return `${this.PREFIX}:${this.VERSION}:dashboard:${range}`;
  }
  /**
   * 构建实体列表缓存键
   */
  static entityList(entity, page = 1, filters) {
    const filterHash = filters ? this.hashObject(filters) : "all";
    return `${this.PREFIX}:${this.VERSION}:${entity}:list:page${page}:${filterHash}`;
  }
  /**
   * 构建实体详情缓存键
   */
  static entityDetail(entity, id) {
    return `${this.PREFIX}:${this.VERSION}:${entity}:detail:${id}`;
  }
  /**
   * 构建统计缓存键
   */
  static stats(type, range) {
    return `${this.PREFIX}:${this.VERSION}:stats:${type}:${range}`;
  }
  /**
   * 构建自定义缓存键
   */
  static custom(parts) {
    return `${this.PREFIX}:${this.VERSION}:${parts.join(":")}`;
  }
  /**
   * 对象哈希
   */
  static hashObject(obj) {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
};
var WorkersMemoryCache = class {
  static {
    __name(this, "WorkersMemoryCache");
  }
  cache = /* @__PURE__ */ new Map();
  maxSize = 100;
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    entry.lastAccessed = Date.now();
    return { data: entry.data, etag: entry.etag };
  }
  set(key, data, ttl, etag) {
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl * 1e3,
      lastAccessed: Date.now(),
      etag
    });
  }
  delete(key) {
    return this.cache.delete(key);
  }
  clear() {
    this.cache.clear();
  }
  evictLRU() {
    let oldest = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldest = key;
      }
    }
    if (oldest) {
      this.cache.delete(oldest);
    }
  }
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
};
var UnifiedCacheManager = class {
  constructor(env2) {
    this.env = env2;
    this.edgeCache = caches.default;
    this.memoryCache = new WorkersMemoryCache();
  }
  static {
    __name(this, "UnifiedCacheManager");
  }
  edgeCache;
  memoryCache;
  stats = {
    edgeHits: 0,
    edgeMisses: 0,
    workersHits: 0,
    workersMisses: 0
  };
  /**
   * 主缓存获取方法
   * 返回数据对象，包含data和etag
   */
  async fetch(request, fetcher, config2 = {}) {
    const {
      strategy = "cache-first" /* CACHE_FIRST */,
      edgeTTL = 300,
      workersTTL = 60,
      cacheKey,
      forceRefresh = false,
      etag: providedEtag
    } = config2;
    const key = cacheKey || this.buildCacheKey(request);
    if (forceRefresh) {
      return this.fetchAndCache(key, fetcher, edgeTTL, workersTTL, providedEtag);
    }
    switch (strategy) {
      case "cache-first" /* CACHE_FIRST */:
        return this.cacheFirst(key, fetcher, edgeTTL, workersTTL, providedEtag);
      case "network-first" /* NETWORK_FIRST */:
        return this.networkFirst(key, fetcher, edgeTTL, workersTTL, providedEtag);
      case "swr" /* STALE_WHILE_REVALIDATE */:
        return this.staleWhileRevalidate(key, fetcher, edgeTTL, workersTTL, providedEtag);
      case "cache-only" /* CACHE_ONLY */:
        return this.cacheOnly(key);
      default:
        const data = await fetcher();
        return { data, etag: providedEtag };
    }
  }
  /**
   * Cache-First策略
   */
  async cacheFirst(key, fetcher, edgeTTL, workersTTL, providedEtag) {
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult !== null) {
      this.stats.workersHits++;
      return { data: memoryResult.data, etag: memoryResult.etag };
    }
    this.stats.workersMisses++;
    const edgeResult = await this.getFromEdgeCache(key);
    if (edgeResult !== null) {
      this.stats.edgeHits++;
      this.memoryCache.set(key, edgeResult.data, workersTTL, edgeResult.etag);
      return { data: edgeResult.data, etag: edgeResult.etag };
    }
    this.stats.edgeMisses++;
    return this.fetchAndCache(key, fetcher, edgeTTL, workersTTL, providedEtag);
  }
  /**
   * Network-First策略
   */
  async networkFirst(key, fetcher, edgeTTL, workersTTL, providedEtag) {
    try {
      const data = await fetcher();
      await this.cacheToAllLayers(key, data, edgeTTL, workersTTL, providedEtag);
      return { data, etag: providedEtag };
    } catch (error4) {
      console.warn("[CacheManager] Network failed, fallback to cache:", error4);
      const memoryResult = this.memoryCache.get(key);
      if (memoryResult !== null) return { data: memoryResult.data, etag: memoryResult.etag };
      const edgeResult = await this.getFromEdgeCache(key);
      if (edgeResult !== null) return { data: edgeResult.data, etag: edgeResult.etag };
      throw error4;
    }
  }
  /**
   * Stale-While-Revalidate策略
   */
  async staleWhileRevalidate(key, fetcher, edgeTTL, workersTTL, providedEtag) {
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult !== null) {
      this.stats.workersHits++;
      this.backgroundUpdate(key, fetcher, edgeTTL, workersTTL, providedEtag);
      return { data: memoryResult.data, etag: memoryResult.etag };
    }
    const edgeResult = await this.getFromEdgeCache(key);
    if (edgeResult !== null) {
      this.stats.edgeHits++;
      this.memoryCache.set(key, edgeResult.data, workersTTL, edgeResult.etag);
      this.backgroundUpdate(key, fetcher, edgeTTL, workersTTL, providedEtag);
      return { data: edgeResult.data, etag: edgeResult.etag };
    }
    return this.fetchAndCache(key, fetcher, edgeTTL, workersTTL, providedEtag);
  }
  /**
   * Cache-Only策略
   */
  async cacheOnly(key) {
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult !== null) return { data: memoryResult.data, etag: memoryResult.etag };
    const edgeResult = await this.getFromEdgeCache(key);
    if (edgeResult !== null) return { data: edgeResult.data, etag: edgeResult.etag };
    throw new Error("Cache miss with CACHE_ONLY strategy");
  }
  /**
   * 获取数据并缓存到所有层
   */
  async fetchAndCache(key, fetcher, edgeTTL, workersTTL, providedEtag) {
    const data = await fetcher();
    await this.cacheToAllLayers(key, data, edgeTTL, workersTTL, providedEtag);
    return { data, etag: providedEtag };
  }
  /**
   * 缓存到所有层
   */
  async cacheToAllLayers(key, data, edgeTTL, workersTTL, etag) {
    this.memoryCache.set(key, data, workersTTL, etag);
    await this.setToEdgeCache(key, data, edgeTTL, etag);
  }
  /**
   * 后台更新
   */
  backgroundUpdate(key, fetcher, edgeTTL, workersTTL, etag) {
    fetcher().then((data) => this.cacheToAllLayers(key, data, edgeTTL, workersTTL, etag)).catch((error4) => console.error("[CacheManager] Background update failed:", error4));
  }
  /**
   * 从边缘缓存获取
   */
  async getFromEdgeCache(key) {
    try {
      const request = new Request(`https://cache.example.com/${key}`);
      const response = await this.edgeCache.match(request);
      if (!response) return null;
      const etag = response.headers.get("X-Cached-ETag") || void 0;
      const data = await response.json();
      return { data, etag };
    } catch (error4) {
      console.error("[CacheManager] Edge cache get failed:", error4);
      return null;
    }
  }
  /**
   * 设置到边缘缓存
   */
  async setToEdgeCache(key, data, ttl, etag) {
    try {
      const request = new Request(`https://cache.example.com/${key}`);
      const headers = {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${ttl}, s-maxage=${ttl}`,
        "CF-Cache-Status": "HIT"
      };
      if (etag) {
        headers["X-Cached-ETag"] = etag;
      }
      const response = new Response(JSON.stringify(data), { headers });
      await this.edgeCache.put(request, response);
    } catch (error4) {
      console.error("[CacheManager] Edge cache set failed:", error4);
    }
  }
  /**
   * 构建缓存键
   */
  buildCacheKey(request) {
    const url = new URL(request.url);
    return `${url.pathname}${url.search}`;
  }
  /**
   * 失效缓存
   */
  async invalidate(key) {
    this.memoryCache.delete(key);
    try {
      const request = new Request(`https://cache.example.com/${key}`);
      await this.edgeCache.delete(request);
    } catch (error4) {
      console.error("[CacheManager] Edge cache delete failed:", error4);
    }
  }
  /**
   * 批量失效缓存
   */
  async invalidateBatch(keys) {
    await Promise.all(keys.map((key) => this.invalidate(key)));
  }
  /**
   * 清空所有缓存
   */
  async clearAll() {
    this.memoryCache.clear();
    try {
      await this.edgeCache.delete(new Request("https://cache.example.com/*"), { ignoreMethod: true });
    } catch (error4) {
      console.error("[CacheManager] Edge cache clear failed:", error4);
    }
  }
  /**
   * 获取缓存统计
   */
  getStats() {
    const edgeTotal = this.stats.edgeHits + this.stats.edgeMisses;
    const workersTotal = this.stats.workersHits + this.stats.workersMisses;
    const overallHits = this.stats.edgeHits + this.stats.workersHits;
    const overallMisses = this.stats.edgeMisses + this.stats.workersMisses;
    return {
      edge: {
        hits: this.stats.edgeHits,
        misses: this.stats.edgeMisses,
        hitRate: edgeTotal > 0 ? this.stats.edgeHits / edgeTotal * 100 : 0,
        layer: "edge" /* EDGE */
      },
      workers: {
        hits: this.stats.workersHits,
        misses: this.stats.workersMisses,
        hitRate: workersTotal > 0 ? this.stats.workersHits / workersTotal * 100 : 0,
        layer: "workers" /* WORKERS */
      },
      overall: {
        hits: overallHits,
        misses: overallMisses,
        hitRate: overallHits + overallMisses > 0 ? overallHits / (overallHits + overallMisses) * 100 : 0,
        layer: "edge" /* EDGE */
      }
    };
  }
};

// src/services/cache/etag-cache-manager.ts
var CACHE_CONFIGS = {
  ["static" /* STATIC */]: {
    maxAge: 2592e3,
    // 30天
    swr: 2592e3,
    // 30天SWR
    immutable: true,
    // 永不变化
    description: "\u9759\u6001\u8D44\u6E90(JS/CSS/\u56FE\u7247)"
  },
  ["historical" /* HISTORICAL */]: {
    maxAge: 86400,
    // 24小时
    swr: 172800,
    // 2天SWR
    immutable: false,
    description: "\u5386\u53F2\u6570\u636E(\u6628\u5929\u53CA\u4E4B\u524D,\u4E0D\u518D\u53D8\u5316)"
  },
  ["recent" /* RECENT */]: {
    maxAge: 21600,
    // 6小时
    swr: 43200,
    // 12小时SWR
    immutable: false,
    description: "\u8FD1\u671F\u6570\u636E(\u8FC7\u53BB7\u5929/30\u5929,\u57FA\u672C\u7A33\u5B9A)"
  },
  ["realtime" /* REALTIME */]: {
    maxAge: 300,
    // 5分钟
    swr: 600,
    // 10分钟SWR
    immutable: false,
    description: "\u5B9E\u65F6\u6570\u636E(\u4ECA\u5929,\u9891\u7E41\u53D8\u5316)"
  }
};
var ETagGenerator = class {
  static {
    __name(this, "ETagGenerator");
  }
  /**
   * 生成ETag
   * 格式: W/"{version}-{hash}"
   * 排除timestamp字段以确保ETag稳定
   */
  static generate(data, version2) {
    const hash = this.hashData(this.excludeTimestamp(data));
    const ver = version2 || Date.now().toString();
    return `W/"${ver}-${hash}"`;
  }
  /**
   * 排除时间戳字段
   */
  static excludeTimestamp(data) {
    if (!data || typeof data !== "object") return data;
    const { timestamp, ...rest } = data;
    return rest;
  }
  /**
   * 数据哈希
   */
  static hashData(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  /**
   * 验证ETag
   */
  static matches(requestETag, currentETag) {
    if (!requestETag) return false;
    const normalizedRequest = requestETag.replace(/^W\//, "");
    const normalizedCurrent = currentETag.replace(/^W\//, "");
    return normalizedRequest === normalizedCurrent;
  }
};
var ETagCacheManager = class {
  constructor(env2) {
    this.env = env2;
    this.cacheManager = new UnifiedCacheManager(env2);
  }
  static {
    __name(this, "ETagCacheManager");
  }
  cacheManager;
  /**
   * 处理请求,返回ETag响应
   */
  async fetch(request, fetcher, options) {
    const { cacheType, cacheKey, version: version2 } = options;
    const config2 = CACHE_CONFIGS[cacheType];
    const key = cacheKey || this.buildCacheKey(request);
    const clientETag = request.headers.get("If-None-Match");
    const cachedResult = await this.cacheManager.fetch(
      request,
      fetcher,
      {
        strategy: "cache-first",
        cacheKey: key,
        edgeTTL: config2.maxAge,
        workersTTL: Math.floor(config2.maxAge / 2)
      }
    );
    const currentETag = cachedResult.etag || ETagGenerator.generate(cachedResult.data, version2);
    if (clientETag && ETagGenerator.matches(clientETag, currentETag)) {
      return new Response(null, {
        status: 304,
        headers: this.buildCacheHeaders(config2, currentETag)
      });
    }
    return Response.json(cachedResult.data, {
      headers: this.buildCacheHeaders(config2, currentETag)
    });
  }
  /**
   * 构建缓存响应头
   */
  buildCacheHeaders(config2, etag) {
    const headers = new Headers();
    const directives = [
      "public",
      `max-age=${config2.maxAge}`,
      `stale-while-revalidate=${config2.swr}`
    ];
    if (config2.immutable) {
      directives.push("immutable");
    }
    headers.set("Cache-Control", directives.join(", "));
    headers.set("ETag", etag);
    headers.set("Vary", "Accept-Encoding");
    return headers;
  }
  /**
   * 构建缓存键
   */
  buildCacheKey(request) {
    const url = new URL(request.url);
    return `${url.pathname}${url.search}`;
  }
  /**
   * 根据数据特征自动判断缓存类型
   */
  static inferCacheType(pathname, dateRange) {
    if (/\.(js|css|png|jpg|svg|ico|woff2|ttf)$/i.test(pathname)) {
      return "static" /* STATIC */;
    }
    if (pathname.includes("/dashboard") || pathname.includes("/analytics")) {
      if (dateRange === "today") {
        return "realtime" /* REALTIME */;
      }
      if (dateRange === "last7days" || dateRange === "last30days") {
        return "recent" /* RECENT */;
      }
      return "historical" /* HISTORICAL */;
    }
    if (pathname.includes("/stats")) {
      if (dateRange === "today") {
        return "realtime" /* REALTIME */;
      }
      return "recent" /* RECENT */;
    }
    if (pathname.match(/\/(campaigns|offers|flows|landings)/)) {
      return "recent" /* RECENT */;
    }
    return "recent" /* RECENT */;
  }
};

// src/services/analytics/analytics.routes.ts
function createAnalyticsRouter() {
  const router2 = new Hono2();
  router2.get("/dashboard", async (c) => {
    try {
      const range = c.req.query("range") || "today";
      const cacheManager = new ETagCacheManager(c.env);
      const cacheType = ETagCacheManager.inferCacheType("/dashboard", range);
      return await cacheManager.fetch(
        c.req.raw,
        async () => {
          const dashboardQuery = createDashboardQueryService(c.env);
          const result = await dashboardQuery.getDashboardStats(range, c.env);
          return {
            ...result,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
        },
        {
          cacheType,
          cacheKey: `dashboard:${range}`
        }
      );
    } catch (err) {
      console.error("[Analytics API] Dashboard error:", err);
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to fetch dashboard stats"),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.get("/recent-clicks", async (c) => {
    try {
      const limit = parseInt(c.req.query("limit") || "50");
      const range = c.req.query("range") || "today";
      const campaignId = c.req.query("campaignId") || void 0;
      const dashboardQuery = createDashboardQueryService(c.env);
      const result = await dashboardQuery.getRecentClicks({
        limit,
        range,
        campaignId
      });
      const formattedList = result.list.map((item) => ({
        event_id: item.event_id || item.clickId || "",
        datetime: item.datetime || item.timestamp || "",
        campaign: item.campaign || item.campaignId || "",
        stream: item.stream || item.flowId || "",
        landing: item.landing || item.landingPageId || "",
        offer: item.offer || item.offerId || "",
        source: item.source || "",
        ip: item.ip || "127.0.0.1",
        country: item.country || "",
        region: item.region || "",
        city: item.city || "",
        isp: item.isp || "",
        operator: item.operator || "",
        device_type: item.device_type || item.device || "",
        device_model: item.device_model || "",
        os: item.os || "",
        os_version: item.os_version || "",
        browser: item.browser || "",
        browser_version: item.browser_version || "",
        os_icon: item.os_icon || "",
        browser_icon: item.browser_icon || "",
        connection_type: item.connection_type || "",
        proxy: item.proxy || "No",
        creative_id: item.creative_id || "",
        external_id: item.external_id || "",
        ad_campaign_id: item.ad_campaign_id || "",
        sub_id: item.sub_id || "",
        sub1: item.sub1 || item.subId1 || "",
        sub2: item.sub2 || item.subId2 || "",
        sub3: item.sub3 || item.subId3 || "",
        sub4: item.sub4 || "",
        sub5: item.sub5 || "",
        referrer: item.referrer || item.referer || "",
        referrer_domain: item.referrer_domain || "",
        search_engine: item.search_engine || "",
        keyword: item.keyword || "",
        destination: item.destination || "",
        cost: item.cost || "$0.00",
        bot: item.bot || "No",
        unique_stream: item.unique_stream || "Yes",
        unique_campaign: item.unique_campaign || "Yes",
        user_agent: item.user_agent || item.userAgent || "",
        visitor_code: item.visitor_code || item.visitorId || "",
        fingerprint: item.fingerprint || "",
        risk_score: item.risk_score || item.riskScore || 0,
        cf_bot_score: item.cf_bot_score || item.cfBotScore || 0
      }));
      return c.json(success({
        list: formattedList,
        total: result.total,
        dataSource: result.dataSource,
        queryTime: (/* @__PURE__ */ new Date()).toISOString()
      }));
    } catch (err) {
      console.error("[Analytics API] Recent clicks error:", err);
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to fetch recent clicks"),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.get("/entity-stats", async (c) => {
    try {
      const type = c.req.query("type");
      const range = c.req.query("range") || "today";
      if (!type) {
        return c.json(
          error3("Entity type is required"),
          HTTP_STATUS.BAD_REQUEST
        );
      }
      const dashboardQuery = createDashboardQueryService(c.env);
      let stats;
      try {
        stats = await dashboardQuery.getEntityStats(type, range);
      } catch (entityError) {
        console.warn(`[Analytics API] Entity stats for ${type} unavailable, returning empty array`);
        stats = [];
      }
      return c.json(success(stats));
    } catch (err) {
      console.warn("[Analytics API] Entity stats error:", err instanceof Error ? err.message : err);
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to fetch entity stats"),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.get("/trend-report", async (c) => {
    try {
      const startDate = c.req.query("startDate");
      const endDate = c.req.query("endDate");
      const interval = c.req.query("interval") || "day";
      const campaignId = c.req.query("campaignId") || void 0;
      if (!startDate || !endDate) {
        return c.json(
          error3("startDate and endDate are required"),
          HTTP_STATUS.BAD_REQUEST
        );
      }
      const dashboardQuery = createDashboardQueryService(c.env);
      const trendData = await dashboardQuery.getTrendReport(startDate, endDate, interval, campaignId);
      return c.json(success({
        data: trendData,
        startDate,
        endDate,
        interval,
        queryTime: (/* @__PURE__ */ new Date()).toISOString()
      }));
    } catch (err) {
      console.error("[Analytics API] Trend report error:", err);
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to fetch trend report"),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.get("/reports/:type", async (c) => {
    try {
      const reportType = c.req.param("type");
      const startDate = c.req.query("startDate");
      const endDate = c.req.query("endDate");
      const groupBy = c.req.query("groupBy")?.split(",") || ["date"];
      const limit = parseInt(c.req.query("limit") || "100");
      const sortBy = c.req.query("sortBy") || "clicks";
      const sortOrder = c.req.query("sortOrder") || "desc";
      if (!["traffic", "conversion", "financial", "roi"].includes(reportType)) {
        return c.json(
          error3("Invalid report type. Must be: traffic, conversion, financial, or roi"),
          HTTP_STATUS.BAD_REQUEST
        );
      }
      if (!startDate || !endDate) {
        return c.json(
          error3("startDate and endDate are required"),
          HTTP_STATUS.BAD_REQUEST
        );
      }
      const dashboardQuery = createDashboardQueryService(c.env);
      const reportData = await dashboardQuery.getReport(reportType, {
        startDate,
        endDate,
        groupBy,
        limit,
        sortBy,
        sortOrder
      });
      return c.json(success({
        type: reportType,
        data: reportData,
        params: { startDate, endDate, groupBy, limit, sortBy, sortOrder },
        queryTime: (/* @__PURE__ */ new Date()).toISOString()
      }));
    } catch (err) {
      console.error(`[Analytics API] Report ${c.req.param("type")} error:`, err);
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to fetch report"),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.post("/reports/export", async (c) => {
    try {
      const body = await c.req.json();
      const {
        type = "traffic",
        format = "csv",
        startDate,
        endDate,
        groupBy = ["date"],
        columns
      } = body;
      if (!["traffic", "conversion", "financial", "roi"].includes(type)) {
        return c.json(
          error3("Invalid report type"),
          HTTP_STATUS.BAD_REQUEST
        );
      }
      if (!startDate || !endDate) {
        return c.json(
          error3("startDate and endDate are required"),
          HTTP_STATUS.BAD_REQUEST
        );
      }
      const dashboardQuery = createDashboardQueryService(c.env);
      const reportData = await dashboardQuery.getReport(type, {
        startDate,
        endDate,
        groupBy,
        limit: 1e4,
        sortBy: "date",
        sortOrder: "desc"
      });
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
      const filename = `${type}-report-${timestamp}`;
      if (format === "csv") {
        const csv = generateCSV(reportData, columns);
        c.header("Content-Type", "text/csv; charset=utf-8");
        c.header("Content-Disposition", `attachment; filename="${filename}.csv"`);
        return c.body(csv);
      }
      if (format === "excel") {
        c.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        c.header("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
        const excelBuffer = generateExcel(reportData, columns);
        return c.body(excelBuffer);
      }
      return c.json(error3("Unsupported format. Use: csv or excel"), HTTP_STATUS.BAD_REQUEST);
    } catch (err) {
      console.error("[Analytics API] Report export error:", err);
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to export report"),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  return router2;
}
__name(createAnalyticsRouter, "createAnalyticsRouter");
function generateCSV(data, columns) {
  if (!data || data.length === 0) {
    return "";
  }
  const headers = columns || Object.keys(data[0]);
  const csvRows = [];
  csvRows.push(headers.join(","));
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      if (value === null || value === void 0) {
        return "";
      }
      const stringValue = String(value);
      if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(","));
  }
  return "\uFEFF" + csvRows.join("\n");
}
__name(generateCSV, "generateCSV");
function generateExcel(data, columns) {
  const headers = columns || Object.keys(data[0] || {});
  const rows = [headers];
  for (const row of data) {
    rows.push(headers.map((h) => row[h] ?? ""));
  }
  const sheetContent = rows.map((r) => r.join("	")).join("\n");
  const encoder = new TextEncoder();
  return encoder.encode(sheetContent).buffer;
}
__name(generateExcel, "generateExcel");

// src/services/tracking/clickLog.routes.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function createClickLogRouter() {
  const router2 = new Hono2();
  router2.get("/", async (c) => {
    try {
      const page = parseInt(c.req.query("page") || "1");
      const pageSize = Math.min(parseInt(c.req.query("pageSize") || "20"), 100);
      const startDate = c.req.query("startDate") || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const endDate = c.req.query("endDate") || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const params = {
        page,
        pageSize,
        campaignId: c.req.query("campaignId") || void 0,
        startDate,
        endDate,
        country: c.req.query("country") || void 0,
        device: c.req.query("device") || void 0,
        browser: c.req.query("browser") || void 0,
        os: c.req.query("os") || void 0,
        ip: c.req.query("ip") || void 0,
        visitorId: c.req.query("visitorId") || void 0,
        offerId: c.req.query("offerId") || void 0,
        flowId: c.req.query("flowId") || void 0,
        isUnique: c.req.query("isUnique") ? c.req.query("isUnique") === "true" : void 0,
        search: c.req.query("search") || void 0
      };
      if (startDate && isWithinThreeMonths(startDate)) {
        const analyticsQuery = createAnalyticsQueryService(c.env);
        const aeResult = await analyticsQuery.getRecentClicks({
          limit: pageSize,
          campaignId: params.campaignId,
          country: params.country,
          device: params.device
        });
        const formattedList = aeResult.list.map((item) => ({
          clickId: item.clickId,
          campaignId: item.campaignId,
          flowId: item.flowId,
          landingPageId: item.landingPageId,
          offerId: item.offerId,
          timestamp: item.timestamp,
          ip: item.ip,
          userAgent: "",
          referer: item.referer,
          country: item.country,
          city: item.city,
          device: item.device,
          browser: item.browser,
          os: item.os,
          isp: "",
          connectionType: null,
          visitorId: item.visitorId,
          subId1: item.subId1,
          subId2: item.subId2,
          subId3: item.subId3,
          cost: item.cost
        }));
        return c.json(success(formattedList, {
          page,
          pageSize,
          total: aeResult.total,
          totalPages: Math.ceil(aeResult.total / pageSize),
          dataSource: "d1_database"
        }));
      } else {
        const db = getD1Connection(c.env);
        const clickRepo = new ClickRepository(db);
        const result = await clickRepo.findClicks(params);
        return c.json(success(result.list, {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / result.pageSize),
          dataSource: "d1_database"
        }));
      }
    } catch (err) {
      console.error("[ClickLog] Failed to fetch clicks:", err);
      return c.json(
        error3(
          err instanceof Error ? err.message : "Failed to fetch clicks",
          ERROR_CODES.INTERNAL_ERROR
        ),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.get("/stats", async (c) => {
    try {
      const startDate = c.req.query("startDate");
      const endDate = c.req.query("endDate");
      const campaignId = c.req.query("campaignId") || void 0;
      if (!startDate || !endDate) {
        return c.json(
          error3("startDate and endDate are required", ERROR_CODES.VALIDATION),
          HTTP_STATUS.BAD_REQUEST
        );
      }
      if (isWithinThreeMonths(startDate)) {
        const analyticsQuery = createAnalyticsQueryService(c.env);
        const aeResult = await analyticsQuery.getRecentClicks({
          limit: 1e3,
          campaignId
        });
        const uniqueVisitors = new Set(aeResult.list.map((c2) => c2.visitorId)).size;
        const countries = new Set(aeResult.list.map((c2) => c2.country)).size;
        const devices = new Set(aeResult.list.map((c2) => c2.device)).size;
        return c.json(success({
          totalClicks: aeResult.total,
          uniqueClicks: uniqueVisitors,
          countries,
          deviceTypes: devices,
          dataSource: "d1_database"
        }));
      } else {
        const db = getD1Connection(c.env);
        const clickRepo = new ClickRepository(db);
        const stats = await clickRepo.getClickStats(startDate, endDate, campaignId);
        return c.json(success({
          ...stats,
          dataSource: "d1_database"
        }));
      }
    } catch (err) {
      console.error("[ClickLog] Failed to fetch stats:", err);
      return c.json(
        error3(
          err instanceof Error ? err.message : "Failed to fetch stats",
          ERROR_CODES.INTERNAL_ERROR
        ),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.get("/:id", async (c) => {
    try {
      const clickId = c.req.param("id");
      const db = getD1Connection(c.env);
      const clickRepo = new ClickRepository(db);
      const click = await clickRepo.findByClickId(clickId);
      if (!click) {
        return c.json(
          error3("Click not found", ERROR_CODES.NOT_FOUND),
          HTTP_STATUS.NOT_FOUND
        );
      }
      return c.json(success(click));
    } catch (err) {
      console.error("[ClickLog] Failed to fetch click:", err);
      return c.json(
        error3(
          err instanceof Error ? err.message : "Failed to fetch click",
          ERROR_CODES.INTERNAL_ERROR
        ),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.get("/visitor/:visitorId", async (c) => {
    try {
      const visitorId = c.req.param("visitorId");
      const limit = Math.min(parseInt(c.req.query("limit") || "100"), 500);
      const db = getD1Connection(c.env);
      const clickRepo = new ClickRepository(db);
      const clicks = await clickRepo.findByVisitorId(visitorId, limit);
      return c.json(success(clicks));
    } catch (err) {
      console.error("[ClickLog] Failed to fetch visitor clicks:", err);
      return c.json(
        error3(
          err instanceof Error ? err.message : "Failed to fetch visitor clicks",
          ERROR_CODES.INTERNAL_ERROR
        ),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  return router2;
}
__name(createClickLogRouter, "createClickLogRouter");

// src/services/tracking/conversionLog.routes.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function createConversionLogRouter() {
  const router2 = new Hono2();
  router2.get("/", async (c) => {
    try {
      const db = getD1Connection(c.env);
      const conversionRepo = new ConversionRepository(db);
      const page = parseInt(c.req.query("page") || "1");
      const pageSize = Math.min(parseInt(c.req.query("pageSize") || "20"), 100);
      const params = {
        page,
        pageSize,
        campaignId: c.req.query("campaignId") || void 0,
        offerId: c.req.query("offerId") || void 0,
        startDate: c.req.query("startDate") || void 0,
        endDate: c.req.query("endDate") || void 0,
        status: c.req.query("status") || void 0,
        country: c.req.query("country") || void 0,
        device: c.req.query("device") || void 0,
        search: c.req.query("search") || void 0
      };
      const result = await conversionRepo.findConversions(params);
      return c.json(success(result.list, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize)
      }));
    } catch (err) {
      console.error("[ConversionLog] Failed to fetch conversions:", err);
      return c.json(
        error3(
          err instanceof Error ? err.message : "Failed to fetch conversions",
          ERROR_CODES.INTERNAL_ERROR
        ),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.get("/stats", async (c) => {
    try {
      const db = getD1Connection(c.env);
      const conversionRepo = new ConversionRepository(db);
      const startDate = c.req.query("startDate");
      const endDate = c.req.query("endDate");
      const campaignId = c.req.query("campaignId") || void 0;
      if (!startDate || !endDate) {
        return c.json(
          error3("startDate and endDate are required", ERROR_CODES.VALIDATION),
          HTTP_STATUS.BAD_REQUEST
        );
      }
      const stats = await conversionRepo.getConversionStats(startDate, endDate, campaignId);
      return c.json(success(stats));
    } catch (err) {
      console.error("[ConversionLog] Failed to fetch stats:", err);
      return c.json(
        error3(
          err instanceof Error ? err.message : "Failed to fetch stats",
          ERROR_CODES.INTERNAL_ERROR
        ),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.get("/:id", async (c) => {
    try {
      const conversionId = c.req.param("id");
      const db = getD1Connection(c.env);
      const conversionRepo = new ConversionRepository(db);
      const conversion = await conversionRepo.findByConversionId(conversionId);
      if (!conversion) {
        return c.json(
          error3("Conversion not found", ERROR_CODES.NOT_FOUND),
          HTTP_STATUS.NOT_FOUND
        );
      }
      return c.json(success(conversion));
    } catch (err) {
      console.error("[ConversionLog] Failed to fetch conversion:", err);
      return c.json(
        error3(
          err instanceof Error ? err.message : "Failed to fetch conversion",
          ERROR_CODES.INTERNAL_ERROR
        ),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.get("/click/:clickId", async (c) => {
    try {
      const clickId = c.req.param("clickId");
      const db = getD1Connection(c.env);
      const conversionRepo = new ConversionRepository(db);
      const conversions = await conversionRepo.findByClickId(clickId);
      return c.json(success(conversions));
    } catch (err) {
      console.error("[ConversionLog] Failed to fetch conversions by click:", err);
      return c.json(
        error3(
          err instanceof Error ? err.message : "Failed to fetch conversions",
          ERROR_CODES.INTERNAL_ERROR
        ),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.put("/:id/status", async (c) => {
    try {
      const conversionId = c.req.param("id");
      const body = await c.req.json();
      const { status } = body;
      if (!status || !["approved", "pending", "rejected"].includes(status)) {
        return c.json(
          error3("Invalid status. Must be approved, pending, or rejected", ERROR_CODES.VALIDATION),
          HTTP_STATUS.BAD_REQUEST
        );
      }
      const db = getD1Connection(c.env);
      const conversionRepo = new ConversionRepository(db);
      const success_update = await conversionRepo.updateStatus(conversionId, status);
      if (!success_update) {
        return c.json(
          error3("Conversion not found or update failed", ERROR_CODES.NOT_FOUND),
          HTTP_STATUS.NOT_FOUND
        );
      }
      return c.json(success({ updated: true, conversionId, status }));
    } catch (err) {
      console.error("[ConversionLog] Failed to update status:", err);
      return c.json(
        error3(
          err instanceof Error ? err.message : "Failed to update status",
          ERROR_CODES.INTERNAL_ERROR
        ),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  return router2;
}
__name(createConversionLogRouter, "createConversionLogRouter");

// src/services/export/export.routes.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/export/export.service.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/utils/export.formatter.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var DEFAULT_FIELD_MAPPINGS = {
  campaigns: [
    { field: "id", header: "ID" },
    { field: "name", header: "Name" },
    { field: "alias", header: "Alias" },
    { field: "domain", header: "Domain" },
    { field: "status", header: "Status" },
    { field: "group", header: "Group" },
    { field: "trafficSource", header: "Traffic Source" },
    { field: "flowRotation", header: "Flow Rotation" },
    { field: "costModel", header: "Cost Model" },
    { field: "trafficLoss", header: "Traffic Loss" },
    { field: "uniquenessTTL", header: "Uniqueness TTL" },
    { field: "visitorBinding", header: "Visitor Binding" },
    { field: "createdAt", header: "Created At", formatter: formatDate },
    { field: "updatedAt", header: "Updated At", formatter: formatDate }
  ],
  landingPages: [
    { field: "id", header: "ID" },
    { field: "name", header: "Name" },
    { field: "url", header: "URL" },
    { field: "status", header: "Status" },
    { field: "group", header: "Group" },
    { field: "createdAt", header: "Created At", formatter: formatDate },
    { field: "updatedAt", header: "Updated At", formatter: formatDate }
  ],
  offers: [
    { field: "id", header: "ID" },
    { field: "name", header: "Name" },
    { field: "url", header: "URL" },
    { field: "payout", header: "Payout" },
    { field: "currency", header: "Currency" },
    { field: "payoutType", header: "Payout Type" },
    { field: "network", header: "Network" },
    { field: "group", header: "Group" },
    { field: "status", header: "Status" },
    { field: "createdAt", header: "Created At", formatter: formatDate },
    { field: "updatedAt", header: "Updated At", formatter: formatDate }
  ],
  clicks: [
    { field: "clickId", header: "Click ID" },
    { field: "campaignId", header: "Campaign ID" },
    { field: "flowId", header: "Flow ID" },
    { field: "landingPageId", header: "Landing Page ID" },
    { field: "offerId", header: "Offer ID" },
    { field: "timestamp", header: "Timestamp", formatter: formatDateTime },
    { field: "ip", header: "IP Address" },
    { field: "userAgent", header: "User Agent" },
    { field: "referer", header: "Referer" },
    { field: "country", header: "Country" },
    { field: "city", header: "City" },
    { field: "device", header: "Device" },
    { field: "browser", header: "Browser" },
    { field: "os", header: "OS" },
    { field: "visitorId", header: "Visitor ID" },
    { field: "subId1", header: "Sub ID 1" },
    { field: "subId2", header: "Sub ID 2" },
    { field: "subId3", header: "Sub ID 3" },
    { field: "cost", header: "Cost" }
  ],
  conversions: [
    { field: "conversionId", header: "Conversion ID" },
    { field: "clickId", header: "Click ID" },
    { field: "campaignId", header: "Campaign ID" },
    { field: "offerId", header: "Offer ID" },
    { field: "timestamp", header: "Timestamp", formatter: formatDateTime },
    { field: "revenue", header: "Revenue" },
    { field: "payout", header: "Payout" },
    { field: "currency", header: "Currency" },
    { field: "conversionType", header: "Type" },
    { field: "offerName", header: "Offer Name" },
    { field: "status", header: "Status" }
  ],
  flows: [
    { field: "id", header: "ID" },
    { field: "displayId", header: "Display ID" },
    { field: "campaignId", header: "Campaign ID" },
    { field: "name", header: "Name" },
    { field: "type", header: "Type" },
    { field: "weight", header: "Weight" },
    { field: "status", header: "Status" },
    { field: "limit", header: "Click Limit" },
    { field: "createdAt", header: "Created At", formatter: formatDate },
    { field: "updatedAt", header: "Updated At", formatter: formatDate }
  ]
};
function formatDate(value) {
  if (!value) return "";
  const date = new Date(String(value));
  if (isNaN(date.getTime())) return String(value);
  return date.toISOString().split("T")[0] || "";
}
__name(formatDate, "formatDate");
function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(String(value));
  if (isNaN(date.getTime())) return String(value);
  return date.toISOString();
}
__name(formatDateTime, "formatDateTime");
function escapeCSVField(value, delimiter = ",") {
  if (value === null || value === void 0) return "";
  const stringValue = String(value);
  const needsEscaping = stringValue.includes(delimiter) || stringValue.includes('"') || stringValue.includes("\n") || stringValue.includes("\r");
  if (!needsEscaping) return stringValue;
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
}
__name(escapeCSVField, "escapeCSVField");
function convertToCSV(data, fields = [], options = {}) {
  if (data.length === 0) return "";
  const delimiter = options.delimiter || ",";
  const includeHeaders = options.includeHeaders !== false;
  let fieldMappings;
  if (fields.length === 0) {
    if (data.length === 0 || !data[0]) {
      return "";
    }
    fieldMappings = Object.keys(data[0]).map((field) => ({ field, header: field }));
  } else if (typeof fields[0] === "string") {
    fieldMappings = fields.map((field) => ({ field, header: field }));
  } else {
    fieldMappings = fields;
  }
  const lines = [];
  if (includeHeaders) {
    const headers = fieldMappings.map((m) => escapeCSVField(m.header, delimiter));
    lines.push(headers.join(delimiter));
  }
  for (const row of data) {
    const values = fieldMappings.map((mapping) => {
      let value = row[mapping.field];
      if (mapping.formatter) {
        value = mapping.formatter(value);
      }
      return escapeCSVField(String(value ?? ""), delimiter);
    });
    lines.push(values.join(delimiter));
  }
  return lines.join("\n");
}
__name(convertToCSV, "convertToCSV");
function convertToJSON(data, fields = []) {
  let exportData = data;
  if (fields.length > 0) {
    const fieldNames = typeof fields[0] === "string" ? fields : fields.map((m) => m.field);
    exportData = data.map((row) => {
      const filtered = {};
      for (const field of fieldNames) {
        filtered[field] = row[field];
      }
      return filtered;
    });
  }
  return JSON.stringify(exportData, null, 2);
}
__name(convertToJSON, "convertToJSON");
function getContentType(format) {
  switch (format) {
    case "csv":
      return "text/csv; charset=utf-8";
    case "excel":
      return "application/vnd.ms-excel";
    case "json":
      return "application/json; charset=utf-8";
    default:
      return "text/plain";
  }
}
__name(getContentType, "getContentType");
function getFileExtension(format) {
  switch (format) {
    case "csv":
      return "csv";
    case "excel":
      return "xls";
    case "json":
      return "json";
    default:
      return "txt";
  }
}
__name(getFileExtension, "getFileExtension");

// src/services/export/export.service.ts
var ExportService = class {
  static {
    __name(this, "ExportService");
  }
  async exportCampaigns(request) {
    const db = getD1Connection({});
    const repo = new CampaignRepository(db);
    const campaigns = await repo.findAll();
    return this.formatExportData("campaigns", campaigns, request);
  }
  async exportLandingPages(request) {
    const db = getD1Connection({});
    const repo = new LandingPageRepository(db);
    const pages = await repo.findAll();
    return this.formatExportData("landingPages", pages, request);
  }
  async exportOffers(request) {
    const db = getD1Connection({});
    const repo = new OfferRepository(db);
    const offers = await repo.findAll();
    return this.formatExportData("offers", offers, request);
  }
  async exportTrafficSources(request) {
    const db = getD1Connection({});
    const repo = new TrafficSourceRepository(db);
    const sources = await repo.findAll();
    return this.formatExportData("trafficSources", sources, request);
  }
  async exportAffiliateNetworks(request) {
    const db = getD1Connection({});
    const repo = new AffiliateNetworkRepository(db);
    const networks = await repo.findAll();
    return this.formatExportData("affiliateNetworks", networks, request);
  }
  async exportClicks(request) {
    const db = getD1Connection({});
    const repo = new ClickRepository(db);
    const { dateRange, filters } = request;
    const result = await repo.findClicks({
      startDate: dateRange?.startDate,
      endDate: dateRange?.endDate,
      campaignId: filters?.campaignId,
      offerId: filters?.offerId,
      page: 1,
      pageSize: 1e4
    });
    return this.formatExportData("clicks", result.list, request);
  }
  async exportConversions(request) {
    const db = getD1Connection({});
    const repo = new ConversionRepository(db);
    const { dateRange, filters } = request;
    const result = await repo.findConversions({
      startDate: dateRange?.startDate,
      endDate: dateRange?.endDate,
      campaignId: filters?.campaignId,
      offerId: filters?.offerId,
      page: 1,
      pageSize: 1e4
    });
    return this.formatExportData("conversions", result.list, request);
  }
  async exportFlows(request) {
    const db = getD1Connection({});
    const repo = new FlowRepository(db);
    const flows = await repo.findAll();
    return this.formatExportData("flows", flows, request);
  }
  formatExportData(entityType, data, request) {
    const { format, fields } = request;
    let fieldMappings = fields || [];
    if (fieldMappings.length === 0) {
      fieldMappings = DEFAULT_FIELD_MAPPINGS[entityType] || [];
    }
    let formattedData;
    switch (format) {
      case "csv":
        formattedData = convertToCSV(data, fieldMappings, { includeHeaders: true });
        break;
      case "excel":
        formattedData = convertToCSV(data, fieldMappings, { includeHeaders: true });
        break;
      case "json":
        formattedData = convertToJSON(data, fieldMappings);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const filename = `${entityType}-export-${timestamp}.${getFileExtension(format)}`;
    return {
      data: formattedData,
      contentType: getContentType(format),
      filename,
      format
    };
  }
  getAvailableFields(entityType) {
    return DEFAULT_FIELD_MAPPINGS[entityType] || [];
  }
};
function createExportService() {
  return new ExportService();
}
__name(createExportService, "createExportService");

// src/services/export/export.routes.ts
function createExportRouter() {
  const router2 = new Hono2();
  router2.get("/campaigns", async (c) => {
    try {
      const request = parseExportRequest(c, "campaigns");
      const service = createExportService();
      const result = await service.exportCampaigns(request);
      return createExportResponse(c, result);
    } catch (err) {
      console.error("Export campaigns error:", err);
      return c.json(
        error3(err instanceof Error ? err.message : "Export failed", ERROR_CODES.UNKNOWN),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.get("/landing-pages", async (c) => {
    try {
      const request = parseExportRequest(c, "landing-pages");
      const service = createExportService();
      const result = await service.exportLandingPages(request);
      return createExportResponse(c, result);
    } catch (err) {
      console.error("Export landing pages error:", err);
      return c.json(
        error3(err instanceof Error ? err.message : "Export failed", ERROR_CODES.UNKNOWN),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.get("/offers", async (c) => {
    try {
      const request = parseExportRequest(c, "offers");
      const service = createExportService();
      const result = await service.exportOffers(request);
      return createExportResponse(c, result);
    } catch (err) {
      console.error("Export offers error:", err);
      return c.json(
        error3(err instanceof Error ? err.message : "Export failed", ERROR_CODES.UNKNOWN),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.get("/traffic-sources", async (c) => {
    try {
      const request = parseExportRequest(c, "traffic-sources");
      const service = createExportService();
      const result = await service.exportTrafficSources(request);
      return createExportResponse(c, result);
    } catch (err) {
      console.error("Export traffic sources error:", err);
      return c.json(
        error3(err instanceof Error ? err.message : "Export failed", ERROR_CODES.UNKNOWN),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.get("/affiliate-networks", async (c) => {
    try {
      const request = parseExportRequest(c, "affiliate-networks");
      const service = createExportService();
      const result = await service.exportAffiliateNetworks(request);
      return createExportResponse(c, result);
    } catch (err) {
      console.error("Export affiliate networks error:", err);
      return c.json(
        error3(err instanceof Error ? err.message : "Export failed", ERROR_CODES.UNKNOWN),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.get("/clicks", async (c) => {
    try {
      const request = parseExportRequest(c, "clicks");
      const service = createExportService();
      const result = await service.exportClicks(request);
      return createExportResponse(c, result);
    } catch (err) {
      console.error("Export clicks error:", err);
      return c.json(
        error3(err instanceof Error ? err.message : "Export failed", ERROR_CODES.UNKNOWN),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.get("/conversions", async (c) => {
    try {
      const request = parseExportRequest(c, "conversions");
      const service = createExportService();
      const result = await service.exportConversions(request);
      return createExportResponse(c, result);
    } catch (err) {
      console.error("Export conversions error:", err);
      return c.json(
        error3(err instanceof Error ? err.message : "Export failed", ERROR_CODES.UNKNOWN),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.post("/custom", async (c) => {
    try {
      const body = await c.req.json();
      const service = createExportService();
      const request = {
        entityType: body.entityType,
        format: body.format || "csv",
        fields: body.fields,
        filters: body.filters,
        dateRange: body.dateRange
      };
      let result;
      switch (request.entityType) {
        case "campaigns":
          result = await service.exportCampaigns(request);
          break;
        case "landing-pages":
          result = await service.exportLandingPages(request);
          break;
        case "offers":
          result = await service.exportOffers(request);
          break;
        case "traffic-sources":
          result = await service.exportTrafficSources(request);
          break;
        case "affiliate-networks":
          result = await service.exportAffiliateNetworks(request);
          break;
        case "clicks":
          result = await service.exportClicks(request);
          break;
        case "conversions":
          result = await service.exportConversions(request);
          break;
        case "flows":
          result = await service.exportFlows(request);
          break;
        default:
          return c.json(
            error3(`Unsupported entity type: ${request.entityType}`, ERROR_CODES.VALIDATION),
            HTTP_STATUS.BAD_REQUEST
          );
      }
      return createExportResponse(c, result);
    } catch (err) {
      console.error("Custom export error:", err);
      return c.json(
        error3(err instanceof Error ? err.message : "Export failed", ERROR_CODES.UNKNOWN),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.get("/fields/:entityType", async (c) => {
    try {
      const entityType = c.req.param("entityType");
      const service = createExportService();
      const fields = service.getAvailableFields(entityType);
      return c.json(success({ entityType, fields }));
    } catch (err) {
      console.error("Get export fields error:", err);
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to get fields", ERROR_CODES.UNKNOWN),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  return router2;
}
__name(createExportRouter, "createExportRouter");
function parseExportRequest(c, entityType) {
  const query = c.req.query();
  let fields;
  if (query.fields) {
    fields = query.fields.split(",").map((f) => f.trim());
  }
  let dateRange;
  if (query.startDate || query.endDate) {
    dateRange = {
      startDate: query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3).toISOString(),
      endDate: query.endDate || (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  const filters = {};
  if (query.status) filters.status = query.status;
  if (query.search) filters.search = query.search;
  if (query.campaignId) filters.campaignId = query.campaignId;
  if (query.offerId) filters.offerId = query.offerId;
  return {
    entityType,
    format: query.format || "csv",
    fields,
    filters: Object.keys(filters).length > 0 ? filters : void 0,
    dateRange
  };
}
__name(parseExportRequest, "parseExportRequest");
function createExportResponse(_c, result) {
  const headers = new Headers();
  headers.set("Content-Type", result.contentType);
  headers.set("Content-Disposition", `attachment; filename="${result.filename}"`);
  return new Response(result.data, { headers });
}
__name(createExportResponse, "createExportResponse");

// src/services/trends/trends.routes.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/trends/trends.service.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/analytics/analytics-query.service.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/trends/trends.service.ts
function createTrendsService(env2) {
  return new TrendsService(env2);
}
__name(createTrendsService, "createTrendsService");

// src/services/trends/trends.routes.ts
function createTrendsRouter() {
  const router2 = new Hono2();
  router2.get("/report", async (c) => {
    try {
      const query = c.req.query();
      const filter = {
        startDate: query.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3).toISOString(),
        endDate: query.endDate || (/* @__PURE__ */ new Date()).toISOString(),
        campaignId: query.campaignId,
        flowId: query.flowId,
        landingPageId: query.landingPageId,
        offerId: query.offerId,
        trafficSourceId: query.trafficSourceId,
        country: query.country,
        device: query.device,
        browser: query.browser,
        os: query.os,
        interval: query.interval || "day"
      };
      const service = createTrendsService(c.env);
      const report2 = await service.generateReport(filter);
      return c.json(success(report2));
    } catch (err) {
      console.error("[Trends] Failed to generate report:", err);
      return c.json(
        error3(
          err instanceof Error ? err.message : "Failed to generate report",
          ERROR_CODES.INTERNAL_ERROR
        ),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.get("/compare", async (c) => {
    try {
      const query = c.req.query();
      const currentStart = query.currentStart;
      const currentEnd = query.currentEnd;
      const previousStart = query.previousStart;
      const previousEnd = query.previousEnd;
      const campaignId = query.campaignId;
      if (!currentStart || !currentEnd || !previousStart || !previousEnd) {
        return c.json(
          error3("Missing required date parameters", ERROR_CODES.VALIDATION),
          HTTP_STATUS.BAD_REQUEST
        );
      }
      const service = createTrendsService(c.env);
      const comparison = await service.compareDateRanges(
        currentStart,
        currentEnd,
        previousStart,
        previousEnd,
        campaignId
      );
      return c.json(success(comparison));
    } catch (err) {
      console.error("[Trends] Failed to compare date ranges:", err);
      return c.json(
        error3(
          err instanceof Error ? err.message : "Failed to compare date ranges",
          ERROR_CODES.INTERNAL_ERROR
        ),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  return router2;
}
__name(createTrendsRouter, "createTrendsRouter");

// src/routes/blacklist.routes.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/blacklist/blacklist.service.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var BlacklistService = class {
  static {
    __name(this, "BlacklistService");
  }
  blacklistRepo;
  trafficSourceRepo;
  env;
  constructor(env2) {
    this.env = env2;
    const db = getD1Connection(env2);
    this.blacklistRepo = new BlacklistRepository(db);
    this.trafficSourceRepo = new TrafficSourceRepository(db);
  }
  /**
   * 创建单个黑名单条目
   */
  async create(data) {
    const { trafficSourceId, type, value } = data;
    const trafficSource = await this.trafficSourceRepo.findById(trafficSourceId);
    if (!trafficSource) {
      throw new NotFoundError("Traffic Source not found");
    }
    this.validateEntryValue(type, value, data.ipMatchMode, data.uaMatchMode);
    const existing = await this.blacklistRepo.findByValue(trafficSourceId, type, value);
    if (existing) {
      if (existing.status === "active") {
        throw new ValidationError(`Entry already exists in blacklist: ${value}`);
      }
      const updated = await this.blacklistRepo.update(existing.id, {
        status: "active",
        reason: data.reason,
        name: data.name,
        ipMatchMode: data.ipMatchMode,
        uaMatchMode: data.uaMatchMode,
        syncToPlatform: data.syncToPlatform
      });
      return updated;
    }
    const entry = await this.blacklistRepo.create({
      trafficSourceId,
      type,
      value,
      name: data.name,
      reason: data.reason,
      status: "active",
      synced: false,
      campaignId: data.campaignId,
      ipMatchMode: data.ipMatchMode,
      uaMatchMode: data.uaMatchMode,
      syncToPlatform: data.syncToPlatform
    });
    return entry;
  }
  /**
   * 更新黑名单条目
   */
  async update(id, data) {
    const entry = await this.blacklistRepo.findById(id);
    if (!entry) {
      throw new NotFoundError("Blacklist entry not found");
    }
    const updated = await this.blacklistRepo.update(id, data);
    if (!updated) {
      throw new NotFoundError("Blacklist entry not found");
    }
    return updated;
  }
  /**
   * 批量添加黑名单
   */
  async batchAdd(data) {
    const { trafficSourceId, type, items } = data;
    const trafficSource = await this.trafficSourceRepo.findById(trafficSourceId);
    if (!trafficSource) {
      throw new NotFoundError("Traffic Source not found");
    }
    if (!items || items.length === 0) {
      throw new ValidationError("No items to blacklist");
    }
    const entries = await this.blacklistRepo.batchCreate(trafficSourceId, type, items);
    return entries;
  }
  /**
   * 从报告候选项目中批量添加黑名单
   */
  async batchAddFromCandidates(trafficSourceId, candidates, reason) {
    const items = candidates.map((candidate) => ({
      value: candidate.value,
      name: candidate.name,
      reason: reason || `ROI: ${candidate.metrics.roi.toFixed(2)}%, Spend: $${candidate.metrics.spend}`,
      campaignId: candidate.campaignId
    }));
    const groupedByType = items.reduce(
      (acc, item, index) => {
        const candidate = candidates[index];
        if (!candidate) return acc;
        const type = candidate.type;
        if (!acc[type]) acc[type] = [];
        acc[type].push(item);
        return acc;
      },
      {}
    );
    const allEntries = [];
    for (const [type, typeItems] of Object.entries(groupedByType)) {
      const entries = await this.batchAdd({
        trafficSourceId,
        type,
        items: typeItems
      });
      allEntries.push(...entries);
    }
    return allEntries;
  }
  /**
   * 查询黑名单
   */
  async query(params) {
    return this.blacklistRepo.findByParams(params);
  }
  /**
   * 获取黑名单详情
   */
  async getById(id) {
    const entry = await this.blacklistRepo.findById(id);
    if (!entry) {
      throw new NotFoundError("Blacklist entry not found");
    }
    return entry;
  }
  /**
   * 从黑名单中移除
   */
  async remove(id) {
    const entry = await this.blacklistRepo.remove(id);
    if (!entry) {
      throw new NotFoundError("Blacklist entry not found");
    }
    if (entry.synced) {
      await this.removeFromPlatform(entry);
    }
    return entry;
  }
  /**
   * 同步黑名单到流量平台
   */
  async syncToPlatform(trafficSourceId) {
    const trafficSource = await this.trafficSourceRepo.findById(trafficSourceId);
    if (!trafficSource) {
      throw new NotFoundError("Traffic Source not found");
    }
    if (!trafficSource.apiConfig) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: [
          {
            entryId: "",
            value: "",
            error: "API config not set for this traffic source"
          }
        ]
      };
    }
    const apiConfig = JSON.parse(trafficSource.apiConfig);
    if (!apiConfig.enabled) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: [
          {
            entryId: "",
            value: "",
            error: "API is disabled for this traffic source"
          }
        ]
      };
    }
    const unsyncedEntries = await this.blacklistRepo.findUnsynced(trafficSourceId);
    if (unsyncedEntries.length === 0) {
      return {
        success: true,
        synced: 0,
        failed: 0,
        errors: []
      };
    }
    const result = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };
    if (trafficSource.name.toLowerCase().includes("propeller")) {
      const adapter = new PropellerAdsAdapter({
        apiKey: apiConfig.apiKey,
        apiUrl: apiConfig.baseUrl
      });
      await adapter.initialize();
      for (const entry of unsyncedEntries) {
        try {
          const syncResult = await this.syncEntryToPropellerAds(adapter, entry);
          if (syncResult.success) {
            await this.blacklistRepo.markSynced(entry.id);
            result.synced++;
          } else {
            result.failed++;
            result.errors.push({
              entryId: entry.id,
              value: entry.value,
              error: syncResult.message
            });
          }
        } catch (error4) {
          result.failed++;
          result.errors.push({
            entryId: entry.id,
            value: entry.value,
            error: error4 instanceof Error ? error4.message : String(error4)
          });
        }
      }
    } else {
      return {
        success: false,
        synced: 0,
        failed: unsyncedEntries.length,
        errors: [
          {
            entryId: "",
            value: "",
            error: "Unsupported traffic source platform"
          }
        ]
      };
    }
    result.success = result.failed === 0;
    return result;
  }
  /**
   * 同步单个条目到 PropellerAds
   */
  async syncEntryToPropellerAds(adapter, entry) {
    if (entry.type !== "zone") {
      return {
        success: false,
        message: `Unsupported blacklist type: ${entry.type}`
      };
    }
    if (!entry.campaignId) {
      return {
        success: false,
        message: "Campaign ID is required to exclude zone"
      };
    }
    const result = await adapter.execute("exclude_zone", {
      campaignId: entry.campaignId,
      zoneId: entry.value
    });
    return {
      success: result.success,
      message: result.message
    };
  }
  /**
   * 从平台移除黑名单
   */
  async removeFromPlatform(entry) {
    const trafficSource = await this.trafficSourceRepo.findById(entry.trafficSourceId);
    if (!trafficSource || !trafficSource.apiConfig) {
      return;
    }
    const apiConfig = JSON.parse(trafficSource.apiConfig);
    if (!apiConfig.enabled) {
      return;
    }
    if (trafficSource.name.toLowerCase().includes("propeller") && entry.type === "zone" && entry.campaignId) {
      const adapter = new PropellerAdsAdapter({
        apiKey: apiConfig.apiKey,
        apiUrl: apiConfig.baseUrl
      });
      await adapter.initialize();
      await adapter.execute("include_zone", {
        campaignId: entry.campaignId,
        zoneId: entry.value
      });
    }
  }
  /**
   * 获取黑名单统计
   */
  async getStats(trafficSourceId) {
    return this.blacklistRepo.getStats(trafficSourceId);
  }
  /**
   * 验证条目值格式
   */
  validateEntryValue(type, value, ipMatchMode, uaMatchMode) {
    if (!value || value.trim() === "") {
      throw new ValidationError("Value is required");
    }
    switch (type) {
      case "ip":
        this.validateIpValue(value, ipMatchMode);
        break;
      case "user_agent":
        this.validateUaValue(value, uaMatchMode);
        break;
      case "zone":
      case "creative":
      case "publisher":
      case "sub_id":
      case "geo":
      case "device":
        break;
      default:
        throw new ValidationError(`Unsupported type: ${type}`);
    }
  }
  /**
   * 验证IP地址格式
   */
  validateIpValue(value, matchMode) {
    const mode = matchMode || "exact";
    if (mode === "cidr") {
      const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
      if (!cidrRegex.test(value)) {
        throw new ValidationError(`Invalid CIDR format: ${value}. Expected format: x.x.x.x/y`);
      }
      const [ip] = value.split("/");
      if (ip && !this.isValidIp(ip)) {
        throw new ValidationError(`Invalid IP address in CIDR: ${ip}`);
      }
    } else {
      if (!this.isValidIp(value)) {
        throw new ValidationError(`Invalid IP address: ${value}`);
      }
    }
  }
  /**
   * 验证是否是有效的IP地址
   */
  isValidIp(ip) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(ip)) {
      const parts = ip.split(".").map(Number);
      return parts.every((part) => part >= 0 && part <= 255);
    }
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^::1$|^([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/;
    if (ipv6Regex.test(ip)) {
      return true;
    }
    return false;
  }
  /**
   * 验证UA值
   */
  validateUaValue(value, matchMode) {
    if (value.length > 1e3) {
      throw new ValidationError("User Agent pattern too long (max 1000 characters)");
    }
    const mode = matchMode || "exact";
    if (mode !== "exact" && mode !== "contains") {
      throw new ValidationError(`Invalid UA match mode: ${mode}. Must be 'exact' or 'contains'`);
    }
  }
  /**
   * 获取报告中的黑名单候选项目
   * 根据统计数据找出表现不佳的 Zone/SubID
   */
  async getBlacklistCandidates(trafficSourceId, options = {}) {
    const { minSpend = 10, maxRoi = -50, minClicks = 100 } = options;
    const db = getD1Connection(this.env);
    const results = await db.prepare(
      `
        SELECT
          zone as value,
          SUM(clicks) as clicks,
          SUM(conversions) as conversions,
          SUM(spend) as spend,
          SUM(revenue) as revenue,
          campaignId
        FROM trafficSummary
        WHERE trafficSource = ?
        GROUP BY zone, campaignId
        HAVING spend >= ? AND clicks >= ?
      `
    ).bind(trafficSourceId, minSpend, minClicks).all();
    const candidates = [];
    for (const row of results.results || []) {
      const roi = row.spend > 0 ? (row.revenue - row.spend) / row.spend * 100 : 0;
      if (roi <= maxRoi) {
        candidates.push({
          type: "zone",
          value: row.value,
          name: `Zone ${row.value}`,
          metrics: {
            impressions: 0,
            // 需要从其他表获取
            clicks: row.clicks,
            conversions: row.conversions,
            spend: row.spend,
            revenue: row.revenue,
            roi
          },
          campaignId: row.campaignId
        });
      }
    }
    return candidates.sort((a, b) => a.metrics.roi - b.metrics.roi);
  }
};

// src/routes/blacklist.routes.ts
function createBlacklistRouter() {
  const router2 = new Hono2();
  const service = /* @__PURE__ */ __name((env2) => new BlacklistService(env2), "service");
  router2.get("/", async (c) => {
    const env2 = c.env;
    const query = c.req.query();
    try {
      const entries = await service(env2).query({
        trafficSourceId: query.trafficSourceId,
        type: query.type,
        status: query.status,
        synced: query.synced === "true" ? true : query.synced === "false" ? false : void 0,
        campaignId: query.campaignId
      });
      return c.json(success(entries));
    } catch (err) {
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to fetch blacklist", ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.post("/", async (c) => {
    const env2 = c.env;
    const body = await c.req.json();
    try {
      const entry = await service(env2).create(body);
      return c.json(success(entry), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to create blacklist entry", ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });
  router2.get("/:id", async (c) => {
    const env2 = c.env;
    const id = c.req.param("id");
    try {
      const entry = await service(env2).getById(id);
      return c.json(success(entry));
    } catch (err) {
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to fetch blacklist entry", ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.NOT_FOUND
      );
    }
  });
  router2.put("/:id", async (c) => {
    const env2 = c.env;
    const id = c.req.param("id");
    const body = await c.req.json();
    try {
      const entry = await service(env2).update(id, body);
      return c.json(success(entry));
    } catch (err) {
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to update blacklist entry", ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });
  router2.post("/batch", async (c) => {
    const env2 = c.env;
    const body = await c.req.json();
    try {
      const entries = await service(env2).batchAdd(body);
      return c.json(success(entries), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to add to blacklist", ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });
  router2.post("/batch-from-candidates", async (c) => {
    const env2 = c.env;
    const { trafficSourceId, candidates, reason } = await c.req.json();
    try {
      const entries = await service(env2).batchAddFromCandidates(trafficSourceId, candidates, reason);
      return c.json(success(entries), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to add candidates to blacklist", ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });
  router2.get("/candidates", async (c) => {
    const env2 = c.env;
    const query = c.req.query();
    try {
      const candidates = await service(env2).getBlacklistCandidates(query.trafficSourceId || "", {
        minSpend: query.minSpend ? parseFloat(query.minSpend) : void 0,
        maxRoi: query.maxRoi ? parseFloat(query.maxRoi) : void 0,
        minClicks: query.minClicks ? parseInt(query.minClicks) : void 0
      });
      return c.json(success(candidates));
    } catch (err) {
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to fetch candidates", ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.post("/sync/:trafficSourceId", async (c) => {
    const env2 = c.env;
    const trafficSourceId = c.req.param("trafficSourceId");
    try {
      const result = await service(env2).syncToPlatform(trafficSourceId);
      return c.json(success(result));
    } catch (err) {
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to sync blacklist", ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });
  router2.get("/stats/:trafficSourceId", async (c) => {
    const env2 = c.env;
    const trafficSourceId = c.req.param("trafficSourceId");
    try {
      const stats = await service(env2).getStats(trafficSourceId);
      return c.json(success(stats));
    } catch (err) {
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to fetch stats", ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.delete("/:id", async (c) => {
    const env2 = c.env;
    const id = c.req.param("id");
    try {
      const entry = await service(env2).remove(id);
      return c.json(success(entry));
    } catch (err) {
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to remove from blacklist", ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });
  return router2;
}
__name(createBlacklistRouter, "createBlacklistRouter");

// src/routes/whitelist.routes.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/whitelist/whitelist.service.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var WhitelistService = class {
  static {
    __name(this, "WhitelistService");
  }
  whitelistRepo;
  trafficSourceRepo;
  env;
  constructor(env2) {
    this.env = env2;
    const db = getD1Connection(env2);
    this.whitelistRepo = new WhitelistRepository(db);
    this.trafficSourceRepo = new TrafficSourceRepository(db);
  }
  /**
   * 创建单个白名单条目
   */
  async create(data) {
    const { trafficSourceId, type, value } = data;
    const trafficSource = await this.trafficSourceRepo.findById(trafficSourceId);
    if (!trafficSource) {
      throw new NotFoundError("Traffic Source not found");
    }
    this.validateEntryValue(type, value, data.ipMatchMode, data.uaMatchMode);
    const existing = await this.whitelistRepo.findByValue(trafficSourceId, type, value);
    if (existing) {
      if (existing.status === "active") {
        throw new ValidationError(`Entry already exists in whitelist: ${value}`);
      }
      const updated = await this.whitelistRepo.update(existing.id, {
        status: "active",
        reason: data.reason,
        name: data.name,
        ipMatchMode: data.ipMatchMode,
        uaMatchMode: data.uaMatchMode,
        syncToPlatform: data.syncToPlatform
      });
      return updated;
    }
    const entry = await this.whitelistRepo.create({
      trafficSourceId,
      type,
      value,
      name: data.name,
      reason: data.reason,
      status: "active",
      synced: false,
      campaignId: data.campaignId,
      ipMatchMode: data.ipMatchMode,
      uaMatchMode: data.uaMatchMode,
      syncToPlatform: data.syncToPlatform
    });
    return entry;
  }
  /**
   * 更新白名单条目
   */
  async update(id, data) {
    const entry = await this.whitelistRepo.findById(id);
    if (!entry) {
      throw new NotFoundError("Whitelist entry not found");
    }
    const updated = await this.whitelistRepo.update(id, data);
    if (!updated) {
      throw new NotFoundError("Whitelist entry not found");
    }
    return updated;
  }
  /**
   * 批量添加白名单
   */
  async batchAdd(data) {
    const { trafficSourceId, type, items } = data;
    const trafficSource = await this.trafficSourceRepo.findById(trafficSourceId);
    if (!trafficSource) {
      throw new NotFoundError("Traffic Source not found");
    }
    if (!items || items.length === 0) {
      throw new ValidationError("No items to whitelist");
    }
    const entries = await this.whitelistRepo.batchCreate(trafficSourceId, type, items);
    return entries;
  }
  /**
   * 从报告候选项目中批量添加白名单
   */
  async batchAddFromCandidates(trafficSourceId, candidates, reason) {
    const items = candidates.map((candidate) => ({
      value: candidate.value,
      name: candidate.name,
      reason: reason || `ROI: ${candidate.metrics.roi.toFixed(2)}%, Revenue: $${candidate.metrics.revenue}`,
      campaignId: candidate.campaignId
    }));
    const groupedByType = items.reduce(
      (acc, item, index) => {
        const candidate = candidates[index];
        if (!candidate) return acc;
        const type = candidate.type;
        if (!acc[type]) acc[type] = [];
        acc[type].push(item);
        return acc;
      },
      {}
    );
    const allEntries = [];
    for (const [type, typeItems] of Object.entries(groupedByType)) {
      const entries = await this.batchAdd({
        trafficSourceId,
        type,
        items: typeItems
      });
      allEntries.push(...entries);
    }
    return allEntries;
  }
  /**
   * 查询白名单
   */
  async query(params) {
    return this.whitelistRepo.findByParams(params);
  }
  /**
   * 获取白名单详情
   */
  async getById(id) {
    const entry = await this.whitelistRepo.findById(id);
    if (!entry) {
      throw new NotFoundError("Whitelist entry not found");
    }
    return entry;
  }
  /**
   * 从白名单中移除
   */
  async remove(id) {
    const entry = await this.whitelistRepo.remove(id);
    if (!entry) {
      throw new NotFoundError("Whitelist entry not found");
    }
    if (entry.synced) {
      await this.removeFromPlatform(entry);
    }
    return entry;
  }
  /**
   * 同步白名单到流量平台
   */
  async syncToPlatform(trafficSourceId) {
    const trafficSource = await this.trafficSourceRepo.findById(trafficSourceId);
    if (!trafficSource) {
      throw new NotFoundError("Traffic Source not found");
    }
    if (!trafficSource.apiConfig) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: [
          {
            entryId: "",
            value: "",
            error: "API config not set for this traffic source"
          }
        ]
      };
    }
    const apiConfig = JSON.parse(trafficSource.apiConfig);
    if (!apiConfig.enabled) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: [
          {
            entryId: "",
            value: "",
            error: "API is disabled for this traffic source"
          }
        ]
      };
    }
    const unsyncedEntries = await this.whitelistRepo.findUnsynced(trafficSourceId);
    if (unsyncedEntries.length === 0) {
      return {
        success: true,
        synced: 0,
        failed: 0,
        errors: []
      };
    }
    const result = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };
    if (trafficSource.name.toLowerCase().includes("propeller")) {
      const adapter = new PropellerAdsAdapter({
        apiKey: apiConfig.apiKey,
        apiUrl: apiConfig.baseUrl
      });
      await adapter.initialize();
      for (const entry of unsyncedEntries) {
        try {
          const syncResult = await this.syncEntryToPropellerAds(adapter, entry);
          if (syncResult.success) {
            await this.whitelistRepo.markSynced(entry.id);
            result.synced++;
          } else {
            result.failed++;
            result.errors.push({
              entryId: entry.id,
              value: entry.value,
              error: syncResult.message
            });
          }
        } catch (error4) {
          result.failed++;
          result.errors.push({
            entryId: entry.id,
            value: entry.value,
            error: error4 instanceof Error ? error4.message : String(error4)
          });
        }
      }
    } else {
      return {
        success: false,
        synced: 0,
        failed: unsyncedEntries.length,
        errors: [
          {
            entryId: "",
            value: "",
            error: "Unsupported traffic source platform"
          }
        ]
      };
    }
    result.success = result.failed === 0;
    return result;
  }
  /**
   * 同步单个条目到 PropellerAds
   */
  async syncEntryToPropellerAds(adapter, entry) {
    if (entry.type !== "zone") {
      return {
        success: false,
        message: `Unsupported whitelist type: ${entry.type}`
      };
    }
    if (!entry.campaignId) {
      return {
        success: false,
        message: "Campaign ID is required to include zone"
      };
    }
    const result = await adapter.execute("include_zone", {
      campaignId: entry.campaignId,
      zoneId: entry.value
    });
    return {
      success: result.success,
      message: result.message
    };
  }
  /**
   * 从平台移除白名单
   */
  async removeFromPlatform(entry) {
    const trafficSource = await this.trafficSourceRepo.findById(entry.trafficSourceId);
    if (!trafficSource || !trafficSource.apiConfig) {
      return;
    }
    const apiConfig = JSON.parse(trafficSource.apiConfig);
    if (!apiConfig.enabled) {
      return;
    }
    if (trafficSource.name.toLowerCase().includes("propeller") && entry.type === "zone" && entry.campaignId) {
      const adapter = new PropellerAdsAdapter({
        apiKey: apiConfig.apiKey,
        apiUrl: apiConfig.baseUrl
      });
      await adapter.initialize();
      await adapter.execute("exclude_zone", {
        campaignId: entry.campaignId,
        zoneId: entry.value
      });
    }
  }
  /**
   * 获取白名单统计
   */
  async getStats(trafficSourceId) {
    return this.whitelistRepo.getStats(trafficSourceId);
  }
  /**
   * 验证条目值格式
   */
  validateEntryValue(type, value, ipMatchMode, uaMatchMode) {
    if (!value || value.trim() === "") {
      throw new ValidationError("Value is required");
    }
    switch (type) {
      case "ip":
        this.validateIpValue(value, ipMatchMode);
        break;
      case "user_agent":
        this.validateUaValue(value, uaMatchMode);
        break;
      case "zone":
      case "creative":
      case "publisher":
      case "sub_id":
      case "geo":
      case "device":
        break;
      default:
        throw new ValidationError(`Unsupported type: ${type}`);
    }
  }
  /**
   * 验证IP地址格式
   */
  validateIpValue(value, matchMode) {
    const mode = matchMode || "exact";
    if (mode === "cidr") {
      const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
      if (!cidrRegex.test(value)) {
        throw new ValidationError(`Invalid CIDR format: ${value}. Expected format: x.x.x.x/y`);
      }
      const [ip] = value.split("/");
      if (ip && !this.isValidIp(ip)) {
        throw new ValidationError(`Invalid IP address in CIDR: ${ip}`);
      }
    } else {
      if (!this.isValidIp(value)) {
        throw new ValidationError(`Invalid IP address: ${value}`);
      }
    }
  }
  /**
   * 验证是否是有效的IP地址
   */
  isValidIp(ip) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(ip)) {
      const parts = ip.split(".").map(Number);
      return parts.every((part) => part >= 0 && part <= 255);
    }
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^::1$|^([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/;
    if (ipv6Regex.test(ip)) {
      return true;
    }
    return false;
  }
  /**
   * 验证UA值
   */
  validateUaValue(value, matchMode) {
    if (value.length > 1e3) {
      throw new ValidationError("User Agent pattern too long (max 1000 characters)");
    }
    const mode = matchMode || "exact";
    if (mode !== "exact" && mode !== "contains") {
      throw new ValidationError(`Invalid UA match mode: ${mode}. Must be 'exact' or 'contains'`);
    }
  }
  /**
   * 获取报告中的白名单候选项目
   * 根据统计数据找出表现优秀的 Zone/SubID
   */
  async getWhitelistCandidates(trafficSourceId, options = {}) {
    const { minSpend = 10, minRoi = 50, minClicks = 100 } = options;
    const db = getD1Connection(this.env);
    const results = await db.prepare(
      `
        SELECT
          zone as value,
          SUM(clicks) as clicks,
          SUM(conversions) as conversions,
          SUM(spend) as spend,
          SUM(revenue) as revenue,
          campaignId
        FROM trafficSummary
        WHERE trafficSource = ?
        GROUP BY zone, campaignId
        HAVING spend >= ? AND clicks >= ?
      `
    ).bind(trafficSourceId, minSpend, minClicks).all();
    const candidates = [];
    for (const row of results.results || []) {
      const roi = row.spend > 0 ? (row.revenue - row.spend) / row.spend * 100 : 0;
      if (roi >= minRoi) {
        candidates.push({
          type: "zone",
          value: row.value,
          name: `Zone ${row.value}`,
          metrics: {
            impressions: 0,
            // 需要从其他表获取
            clicks: row.clicks,
            conversions: row.conversions,
            spend: row.spend,
            revenue: row.revenue,
            roi
          },
          campaignId: row.campaignId
        });
      }
    }
    return candidates.sort((a, b) => b.metrics.roi - a.metrics.roi);
  }
};

// src/routes/whitelist.routes.ts
function createWhitelistRouter() {
  const router2 = new Hono2();
  const service = /* @__PURE__ */ __name((env2) => new WhitelistService(env2), "service");
  router2.get("/", async (c) => {
    const env2 = c.env;
    const query = c.req.query();
    try {
      const entries = await service(env2).query({
        trafficSourceId: query.trafficSourceId,
        type: query.type,
        status: query.status,
        synced: query.synced === "true" ? true : query.synced === "false" ? false : void 0,
        campaignId: query.campaignId
      });
      return c.json(success(entries));
    } catch (err) {
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to fetch whitelist", ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.post("/", async (c) => {
    const env2 = c.env;
    const body = await c.req.json();
    try {
      const entry = await service(env2).create(body);
      return c.json(success(entry), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to create whitelist entry", ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });
  router2.get("/:id", async (c) => {
    const env2 = c.env;
    const id = c.req.param("id");
    try {
      const entry = await service(env2).getById(id);
      return c.json(success(entry));
    } catch (err) {
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to fetch whitelist entry", ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.NOT_FOUND
      );
    }
  });
  router2.put("/:id", async (c) => {
    const env2 = c.env;
    const id = c.req.param("id");
    const body = await c.req.json();
    try {
      const entry = await service(env2).update(id, body);
      return c.json(success(entry));
    } catch (err) {
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to update whitelist entry", ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });
  router2.post("/batch", async (c) => {
    const env2 = c.env;
    const body = await c.req.json();
    try {
      const entries = await service(env2).batchAdd(body);
      return c.json(success(entries), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to add to whitelist", ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });
  router2.post("/batch-from-candidates", async (c) => {
    const env2 = c.env;
    const { trafficSourceId, candidates, reason } = await c.req.json();
    try {
      const entries = await service(env2).batchAddFromCandidates(trafficSourceId, candidates, reason);
      return c.json(success(entries), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to add candidates to whitelist", ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });
  router2.get("/candidates", async (c) => {
    const env2 = c.env;
    const query = c.req.query();
    try {
      const candidates = await service(env2).getWhitelistCandidates(query.trafficSourceId || "", {
        minSpend: query.minSpend ? parseFloat(query.minSpend) : void 0,
        minRoi: query.minRoi ? parseFloat(query.minRoi) : void 0,
        minClicks: query.minClicks ? parseInt(query.minClicks) : void 0
      });
      return c.json(success(candidates));
    } catch (err) {
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to fetch candidates", ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.post("/sync/:trafficSourceId", async (c) => {
    const env2 = c.env;
    const trafficSourceId = c.req.param("trafficSourceId");
    try {
      const result = await service(env2).syncToPlatform(trafficSourceId);
      return c.json(success(result));
    } catch (err) {
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to sync whitelist", ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });
  router2.get("/stats/:trafficSourceId", async (c) => {
    const env2 = c.env;
    const trafficSourceId = c.req.param("trafficSourceId");
    try {
      const stats = await service(env2).getStats(trafficSourceId);
      return c.json(success(stats));
    } catch (err) {
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to fetch stats", ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  router2.delete("/:id", async (c) => {
    const env2 = c.env;
    const id = c.req.param("id");
    try {
      const entry = await service(env2).remove(id);
      return c.json(success(entry));
    } catch (err) {
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to remove from whitelist", ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });
  return router2;
}
__name(createWhitelistRouter, "createWhitelistRouter");

// src/services/user-preferences/user-preferences.routes.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var router = new Hono2();
router.get("/preferences/:userId", async (c) => {
  const userId = c.req.param("userId");
  const deviceId = c.req.header("X-Device-ID");
  const id = c.env.USER_PREFERENCE_DO.idFromName(`user-prefs-${userId}`);
  const stub = c.env.USER_PREFERENCE_DO.get(id);
  const response = await stub.fetch(
    new Request(`https://do/preferences`, {
      method: "GET",
      headers: {
        "X-Device-ID": deviceId || ""
      }
    })
  );
  const data = await response.json();
  return c.json(data, response.status);
});
router.post("/preferences/:userId", async (c) => {
  const userId = c.req.param("userId");
  const deviceId = c.req.header("X-Device-ID");
  const body = await c.req.json();
  const id = c.env.USER_PREFERENCE_DO.idFromName(`user-prefs-${userId}`);
  const stub = c.env.USER_PREFERENCE_DO.get(id);
  const response = await stub.fetch(
    new Request(`https://do/preferences`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-ID": deviceId || ""
      },
      body: JSON.stringify(body)
    })
  );
  const data = await response.json();
  return c.json(data, response.status);
});
router.get("/events/:userId", async (c) => {
  const userId = c.req.param("userId");
  const deviceId = c.req.header("X-Device-ID");
  const id = c.env.USER_PREFERENCE_DO.idFromName(`user-prefs-${userId}`);
  const stub = c.env.USER_PREFERENCE_DO.get(id);
  const response = await stub.fetch(
    new Request(`https://do/events`, {
      method: "GET",
      headers: {
        "Accept": "text/event-stream",
        "X-Device-ID": deviceId || ""
      }
    })
  );
  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
});

// src/services/migration/migration.routes.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function createMigrationRouter() {
  const router2 = new Hono2();
  router2.get("/status", async (c) => {
    try {
      return c.json(
        success({
          status: "ready",
          lastMigration: null,
          nextMigration: null
        }),
        HTTP_STATUS.OK
      );
    } catch (err) {
      console.error("[Migration] Status error:", err);
      return c.json(
        error3(err instanceof Error ? err.message : "Failed to get status"),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });
  return router2;
}
__name(createMigrationRouter, "createMigrationRouter");

// src/services/cache/cache-update-service.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/cache/sse-cache-notification.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var SSEConnectionManager = class {
  static {
    __name(this, "SSEConnectionManager");
  }
  connections = /* @__PURE__ */ new Map();
  maxConnectionsPerUser = 5;
  /**
   * 添加连接
   */
  addConnection(userId, controller) {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, /* @__PURE__ */ new Set());
    }
    const userConnections = this.connections.get(userId);
    if (userConnections.size >= this.maxConnectionsPerUser) {
      const oldest = userConnections.values().next().value;
      oldest?.close();
      userConnections.delete(oldest);
    }
    userConnections.add(controller);
    console.log(`[SSE] Connection added for user ${userId}, total: ${userConnections.size}`);
  }
  /**
   * 移除连接
   */
  removeConnection(userId, controller) {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      userConnections.delete(controller);
      if (userConnections.size === 0) {
        this.connections.delete(userId);
      }
    }
  }
  /**
   * 向指定用户推送事件
   */
  sendToUser(userId, event) {
    const userConnections = this.connections.get(userId);
    if (!userConnections) return;
    const message = this.formatSSEMessage(event);
    for (const controller of userConnections) {
      try {
        controller.enqueue(new TextEncoder().encode(message));
      } catch (error4) {
        console.error("[SSE] Failed to send message:", error4);
        this.removeConnection(userId, controller);
      }
    }
  }
  /**
   * 向所有用户广播事件
   */
  broadcast(event) {
    const message = this.formatSSEMessage(event);
    for (const [userId, connections] of this.connections) {
      for (const controller of connections) {
        try {
          controller.enqueue(new TextEncoder().encode(message));
        } catch (error4) {
          console.error("[SSE] Failed to broadcast:", error4);
          this.removeConnection(userId, controller);
        }
      }
    }
  }
  /**
   * 格式化SSE消息
   */
  formatSSEMessage(event) {
    return `event: ${event.type}
data: ${JSON.stringify(event)}

`;
  }
  /**
   * 获取连接统计
   */
  getStats() {
    let totalConnections = 0;
    for (const connections of this.connections.values()) {
      totalConnections += connections.size;
    }
    return {
      totalUsers: this.connections.size,
      totalConnections
    };
  }
};
var SSECacheNotificationService = class {
  constructor(env2) {
    this.env = env2;
    this.connectionManager = new SSEConnectionManager();
  }
  static {
    __name(this, "SSECacheNotificationService");
  }
  connectionManager;
  /**
   * 处理SSE连接请求
   */
  async handleConnection(request, userId) {
    const stream = new ReadableStream({
      start: /* @__PURE__ */ __name((controller) => {
        this.connectionManager.addConnection(userId, controller);
        const connectEvent = {
          type: "cache-updated" /* CACHE_UPDATED */,
          timestamp: Date.now(),
          cacheKey: "connection",
          message: "SSE connection established"
        };
        controller.enqueue(
          new TextEncoder().encode(this.formatSSEMessage(connectEvent))
        );
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
          } catch (error4) {
            clearInterval(heartbeat);
            this.connectionManager.removeConnection(userId, controller);
          }
        }, 3e4);
        request.signal.addEventListener("abort", () => {
          clearInterval(heartbeat);
          this.connectionManager.removeConnection(userId, controller);
        });
      }, "start")
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
        // 禁用Nginx缓冲
      }
    });
  }
  /**
   * 通知缓存失效
   */
  notifyCacheInvalidated(cacheKey, userId) {
    const event = {
      type: "cache-invalidated" /* CACHE_INVALIDATED */,
      timestamp: Date.now(),
      cacheKey
    };
    if (userId) {
      this.connectionManager.sendToUser(userId, event);
    } else {
      this.connectionManager.broadcast(event);
    }
  }
  /**
   * 通知数据变更
   */
  notifyDataChanged(entity, entityId, action, userId) {
    const cacheKey = CacheKeyBuilder.entityDetail(entity, entityId);
    const event = {
      type: "data-changed" /* DATA_CHANGED */,
      timestamp: Date.now(),
      cacheKey,
      entity,
      entityId,
      action
    };
    if (userId) {
      this.connectionManager.sendToUser(userId, event);
    } else {
      this.connectionManager.broadcast(event);
    }
  }
  /**
   * 强制客户端刷新
   */
  forceRefresh(cacheKeys, userId) {
    for (const cacheKey of cacheKeys) {
      const event = {
        type: "force-refresh" /* FORCE_REFRESH */,
        timestamp: Date.now(),
        cacheKey,
        message: "Please refresh this data"
      };
      if (userId) {
        this.connectionManager.sendToUser(userId, event);
      } else {
        this.connectionManager.broadcast(event);
      }
    }
  }
  /**
   * 格式化SSE消息
   */
  formatSSEMessage(event) {
    return `event: ${event.type}
data: ${JSON.stringify(event)}

`;
  }
  /**
   * 获取连接统计
   */
  getStats() {
    return this.connectionManager.getStats();
  }
};

// src/services/cache/cache-update-service.ts
var CacheUpdateService = class {
  constructor(env2) {
    this.env = env2;
    this.cacheManager = new UnifiedCacheManager(env2);
    this.sseNotification = new SSECacheNotificationService(env2);
  }
  static {
    __name(this, "CacheUpdateService");
  }
  cacheManager;
  sseNotification;
  /**
   * 处理手动触发缓存更新请求
   */
  async handleManualUpdate(request) {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const key = url.searchParams.get("key");
    const authHeader = request.headers.get("Authorization");
    if (!this.validateAuth(authHeader)) {
      return new Response("Unauthorized", { status: 401 });
    }
    const start = Date.now();
    try {
      let result;
      switch (action) {
        case "purge-all":
          result = await this.purgeAll();
          break;
        case "purge-key":
          if (!key) {
            return new Response("Missing key parameter", { status: 400 });
          }
          result = await this.purgeKey(key);
          break;
        case "warm-cache":
          result = await this.warmCache();
          break;
        case "refresh-dashboard":
          result = await this.refreshDashboard();
          break;
        case "refresh-entity":
          const entity = url.searchParams.get("entity");
          if (!entity) {
            return new Response("Missing entity parameter", { status: 400 });
          }
          result = await this.refreshEntity(entity);
          break;
        default:
          return new Response("Invalid action", { status: 400 });
      }
      return Response.json(result);
    } catch (error4) {
      console.error("[CacheUpdate] Manual update failed:", error4);
      return Response.json({
        success: false,
        trigger: "manual" /* MANUAL */,
        keys: [],
        duration: Date.now() - start,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        errors: [error4 instanceof Error ? error4.message : "Unknown error"]
      }, { status: 500 });
    }
  }
  /**
   * 编程式缓存更新(数据变更后自动触发) + SSE通知
   */
  async onDataChanged(entity, id, action, userId) {
    console.log(`[CacheUpdate] Entity ${entity}:${id} ${action}d`);
    const start = Date.now();
    try {
      const keysToInvalidate = this.getRelatedCacheKeys(entity, id, action);
      await this.cacheManager.invalidateBatch(keysToInvalidate);
      for (const key of keysToInvalidate) {
        this.sseNotification.notifyCacheInvalidated(key, userId);
      }
      if (entity && id) {
        this.sseNotification.notifyDataChanged(entity, id, action, userId);
      }
      if (action !== "delete") {
        await this.warmupEntityCache(entity, id);
      }
      const duration = Date.now() - start;
      console.log(`[CacheUpdate] Programmatic update + SSE notification completed in ${duration}ms`);
    } catch (error4) {
      console.error("[CacheUpdate] Programmatic update failed:", error4);
    }
  }
  /**
   * 定时刷新缓存(Cron Trigger)
   */
  async handleScheduledRefresh(event) {
    console.log("[CacheUpdate] Scheduled refresh triggered:", event.cron);
    const start = Date.now();
    try {
      switch (event.cron) {
        case "*/5 * * * *":
          await this.refreshRealtimeData();
          break;
        case "0 * * * *":
          await this.refreshHourlyData();
          break;
        case "0 0 * * *":
          await this.refreshDailyData();
          break;
        default:
          console.log("[CacheUpdate] Unknown cron:", event.cron);
      }
      const duration = Date.now() - start;
      console.log(`[CacheUpdate] Scheduled refresh completed in ${duration}ms`);
    } catch (error4) {
      console.error("[CacheUpdate] Scheduled refresh failed:", error4);
    }
  }
  /**
   * 清空所有缓存
   */
  async purgeAll() {
    const start = Date.now();
    await this.cacheManager.clearAll();
    this.sseNotification.forceRefresh(["*"]);
    const stats = this.sseNotification.getStats();
    return {
      success: true,
      trigger: "manual" /* MANUAL */,
      keys: ["*"],
      duration: Date.now() - start,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      notifiedUsers: stats.totalUsers
    };
  }
  /**
   * 清空指定缓存键
   */
  async purgeKey(key) {
    const start = Date.now();
    await this.cacheManager.invalidate(key);
    this.sseNotification.notifyCacheInvalidated(key);
    const stats = this.sseNotification.getStats();
    return {
      success: true,
      trigger: "manual" /* MANUAL */,
      keys: [key],
      duration: Date.now() - start,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      notifiedUsers: stats.totalUsers
    };
  }
  /**
   * 缓存预热
   */
  async warmCache() {
    const start = Date.now();
    const keys = [];
    const errors = [];
    const dashboardRanges = ["today", "last7days", "last30days"];
    for (const range of dashboardRanges) {
      try {
        const key = CacheKeyBuilder.dashboard(range);
        await this.warmupDashboardData(range);
        keys.push(key);
      } catch (error4) {
        errors.push(`Dashboard ${range}: ${error4 instanceof Error ? error4.message : "Unknown error"}`);
      }
    }
    const entities = ["campaigns", "offers", "flows"];
    for (const entity of entities) {
      try {
        const key = CacheKeyBuilder.entityList(entity);
        await this.warmupEntityList(entity);
        keys.push(key);
      } catch (error4) {
        errors.push(`Entity ${entity}: ${error4 instanceof Error ? error4.message : "Unknown error"}`);
      }
    }
    return {
      success: errors.length === 0,
      trigger: "manual" /* MANUAL */,
      keys,
      duration: Date.now() - start,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      errors: errors.length > 0 ? errors : void 0
    };
  }
  /**
   * 刷新Dashboard缓存
   */
  async refreshDashboard() {
    const start = Date.now();
    const keys = [];
    const ranges = ["today", "last7days", "last30days"];
    for (const range of ranges) {
      const key = CacheKeyBuilder.dashboard(range);
      await this.cacheManager.invalidate(key);
      await this.warmupDashboardData(range);
      keys.push(key);
      this.sseNotification.notifyCacheInvalidated(key);
    }
    const stats = this.sseNotification.getStats();
    return {
      success: true,
      trigger: "manual" /* MANUAL */,
      keys,
      duration: Date.now() - start,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      notifiedUsers: stats.totalUsers
    };
  }
  /**
   * 刷新实体缓存
   */
  async refreshEntity(entity) {
    const start = Date.now();
    const keys = [];
    for (let page = 1; page <= 10; page++) {
      const key = CacheKeyBuilder.entityList(entity, page);
      await this.cacheManager.invalidate(key);
      keys.push(key);
      this.sseNotification.notifyCacheInvalidated(key);
    }
    await this.warmupEntityList(entity);
    const stats = this.sseNotification.getStats();
    return {
      success: true,
      trigger: "manual" /* MANUAL */,
      keys,
      duration: Date.now() - start,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      notifiedUsers: stats.totalUsers
    };
  }
  /**
   * 刷新实时数据(每5分钟)
   */
  async refreshRealtimeData() {
    const ranges = ["today"];
    for (const range of ranges) {
      const key = CacheKeyBuilder.dashboard(range);
      await this.cacheManager.invalidate(key);
      await this.warmupDashboardData(range);
      this.sseNotification.notifyCacheInvalidated(key);
    }
  }
  /**
   * 刷新小时数据(每小时)
   */
  async refreshHourlyData() {
    const ranges = ["last7days", "last30days"];
    for (const range of ranges) {
      const key = CacheKeyBuilder.dashboard(range);
      await this.cacheManager.invalidate(key);
      await this.warmupDashboardData(range);
      this.sseNotification.notifyCacheInvalidated(key);
    }
  }
  /**
   * 刷新每日数据(每天)
   */
  async refreshDailyData() {
    const entities = ["campaigns", "offers", "flows", "landings"];
    for (const entity of entities) {
      await this.warmupEntityList(entity);
    }
  }
  /**
   * 获取相关缓存键
   */
  getRelatedCacheKeys(entity, id, action) {
    const keys = [];
    for (let page = 1; page <= 5; page++) {
      keys.push(CacheKeyBuilder.entityList(entity, page));
    }
    keys.push(CacheKeyBuilder.entityDetail(entity, id));
    if (["campaign", "offer", "click", "conversion"].includes(entity)) {
      keys.push(CacheKeyBuilder.dashboard("today"));
      keys.push(CacheKeyBuilder.dashboard("last7days"));
      keys.push(CacheKeyBuilder.dashboard("last30days"));
    }
    return keys;
  }
  /**
   * 预热实体缓存
   */
  async warmupEntityCache(entity, id) {
    const detailKey = CacheKeyBuilder.entityDetail(entity, id);
  }
  /**
   * 预热Dashboard数据
   */
  async warmupDashboardData(range) {
  }
  /**
   * 预热实体列表
   */
  async warmupEntityList(entity) {
  }
  /**
   * 验证权限
   */
  validateAuth(authHeader) {
    if (!authHeader) return false;
    const token = authHeader.replace("Bearer ", "");
    return token === this.env.CACHE_UPDATE_TOKEN;
  }
  /**
   * 获取SSE连接统计
   */
  getSSEStats() {
    return this.sseNotification.getStats();
  }
};
function createCacheUpdateRoutes(env2) {
  const service = new CacheUpdateService(env2);
  return {
    /**
     * 处理缓存更新请求
     */
    async handle(request) {
      return service.handleManualUpdate(request);
    },
    /**
     * 处理数据变更事件
     */
    async onDataChanged(entity, id, action, userId) {
      return service.onDataChanged(entity, id, action, userId);
    },
    /**
     * 处理定时刷新
     */
    async handleScheduled(event) {
      return service.handleScheduledRefresh(event);
    },
    /**
     * 获取SSE统计
     */
    getSSEStats() {
      return service.getSSEStats();
    }
  };
}
__name(createCacheUpdateRoutes, "createCacheUpdateRoutes");

// src/index.ts
var app = new Hono2();
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"]
  })
);
app.use("*", async (c, next) => {
  await next();
  const env2 = c.env;
  if (env2.CF_VERSION_METADATA) {
    c.header("X-Cloudflare-Worker-Version", env2.CF_VERSION_METADATA.id);
    c.header("X-Cloudflare-Worker-Tag", env2.CF_VERSION_METADATA.tag || "latest");
    c.header("X-Cloudflare-Worker-Timestamp", env2.CF_VERSION_METADATA.timestamp);
  }
  let deployInfo = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    hash: "unknown",
    shortHash: "unknown",
    branch: "unknown",
    message: "Unknown deployment",
    author: "unknown",
    authorEmail: "unknown",
    commitDate: (/* @__PURE__ */ new Date()).toISOString(),
    environment: "production",
    deployer: "unknown"
  };
  try {
    const paths = [
      "./dist/deploy-info.json",
      "../dist/deploy-info.json",
      "../../dist/deploy-info.json"
    ];
    for (const deployInfoPath of paths) {
      try {
        if (fs_default.existsSync(deployInfoPath)) {
          const deployInfoContent = fs_default.readFileSync(deployInfoPath, "utf8");
          deployInfo = JSON.parse(deployInfoContent);
          break;
        }
      } catch (error4) {
      }
    }
  } catch (error4) {
    console.warn("Failed to read deploy info file:", error4);
  }
  c.header("X-Deployment-Hash", deployInfo.shortHash);
  c.header("X-Deployment-Branch", deployInfo.branch);
  c.header("X-Deployment-Message", deployInfo.message);
  c.header("X-Deployment-Environment", deployInfo.environment);
  c.header("X-Deployment-Timestamp", deployInfo.timestamp);
});
app.get("/health", (c) => {
  return c.json(success({ status: "healthy", timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
});
app.get("/api/deployment/info", (c) => {
  const env2 = c.env;
  const deployInfo = {
    timestamp: "2026-03-25T09:03:46.068Z",
    hash: "44df7f8455a81b21406807f0e7948fd69c41b4bd",
    shortHash: "44df7f8",
    branch: "master",
    message: "Deployed version 44df7f8 - fix: export CacheDurableObject in src/index.ts",
    author: "ming huang",
    authorEmail: "isuyee88@outlook.com",
    commitDate: "2026-03-25 13:36:17 +0800",
    environment: "production",
    deployer: "unknown"
  };
  const deploymentInfo = {
    version: env2.CF_VERSION_METADATA ? {
      id: env2.CF_VERSION_METADATA.id,
      tag: env2.CF_VERSION_METADATA.tag,
      timestamp: env2.CF_VERSION_METADATA.timestamp
    } : null,
    deployment: deployInfo,
    environment: env2.ENVIRONMENT,
    realtimeEnabled: env2.REALTIME_ENABLED,
    sseEnabled: env2.SSE_ENABLED,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  return c.json(success(deploymentInfo));
});
app.route("/api/campaigns", createCampaignRouter());
app.route("/api/flows", createFlowRouter());
app.route("/api/landing-pages", createLandingPageRouter());
app.route("/api/offers", createOfferRouter());
app.route("/api/traffic-sources", createTrafficSourceRouter());
app.route("/api/affiliate-networks", createAffiliateNetworkRouter());
app.route("/api/rules", createRuleRouter());
app.route("/api/platforms", createPlatformRouter());
app.route("/api/tracking", createTrackingRouter());
app.route("/api/analytics", createAggregationRouter());
app.route("/api/analytics", createAnalyticsRouter());
app.route("/api/clicks", createClickLogRouter());
app.route("/api/conversions", createConversionLogRouter());
app.route("/api/export", createExportRouter());
app.route("/api/trends", createTrendsRouter());
app.route("/api/blacklist", createBlacklistRouter());
app.route("/api/whitelist", createWhitelistRouter());
app.route("/api/user-preferences", router);
app.route("/api/migration", createMigrationRouter());
app.get("/api/cache-update", async (c) => {
  const cacheUpdateRoutes = createCacheUpdateRoutes(c.env);
  return cacheUpdateRoutes.handle(c.req.raw);
});
app.get("/api/cache/events", async (c) => {
  const userId = c.req.query("userId") || "anonymous";
  const sseService = new SSECacheNotificationService(c.env);
  return sseService.handleConnection(c.req.raw, userId);
});
app.onError((err, c) => {
  console.error("Error:", err);
  return c.json(error3(err.message, "INTERNAL_ERROR"), HTTP_STATUS.INTERNAL_ERROR);
});
var index_default = {
  async fetch(request, env2, ctx) {
    const url = new URL(request.url);
    if (env2.CF_VERSION_METADATA) {
      console.log("[Deployment] Version info:", {
        versionId: env2.CF_VERSION_METADATA.id,
        versionTag: env2.CF_VERSION_METADATA.tag,
        versionTimestamp: env2.CF_VERSION_METADATA.timestamp
      });
    }
    if (url.pathname.startsWith("/api/") || url.pathname === "/health") {
      return app.fetch(request, env2, ctx);
    }
    if (url.pathname.length > 1 && !url.pathname.startsWith("/__")) {
      const isStaticResource = /\.(html?|svg|png|ico|jpg|jpeg|gif|css|js|woff2|ttf|eot|otf|webmanifest)$/i.test(url.pathname);
      if (!isStaticResource) {
        const pathParts = url.pathname.split("/").filter(Boolean);
        if (pathParts.length === 1) {
          const campaignAlias = pathParts[0];
          console.log("[Tracking] Campaign alias:", campaignAlias, "Original URL:", request.url);
          const trackingUrl = new URL("/api/tracking/click/" + campaignAlias, url.origin);
          trackingUrl.search = url.search;
          console.log("[Tracking] Tracking URL:", trackingUrl.toString());
          const trackingRequest = new Request(trackingUrl.toString(), {
            method: request.method,
            headers: request.headers,
            redirect: "manual"
          });
          return app.fetch(trackingRequest, env2, ctx);
        }
      }
    }
    return env2.ASSETS.fetch(request);
  },
  /**
   * 定时任务处理器 - Cron Trigger
   * - 每5分钟: 刷新实时缓存数据 + 平台规则评估
   * - 每小时: 刷新小时缓存数据
   * - 每天0点: 刷新每日缓存数据
   * - 每天凌晨2点: 执行数据聚合
   */
  async scheduled(event, env2, ctx) {
    console.log(`[Cron] Starting scheduled task at ${(/* @__PURE__ */ new Date()).toISOString()}`);
    console.log(`[Cron] Event type: ${event.type}, cron: ${event.cron}`);
    const cronExpression = event.cron;
    const cacheUpdate = createCacheUpdateRoutes(env2);
    if (cronExpression === "*/5 * * * *") {
      ctx.waitUntil(
        cacheUpdate.handleScheduled(event).catch(
          (err) => console.error(`[Cron] Cache refresh failed:`, err)
        )
      );
      ctx.waitUntil(
        (async () => {
          try {
            await handlePlatformCron(env2);
            console.log(`[Cron] Platform cron completed successfully`);
          } catch (err) {
            console.error(`[Cron] Platform cron failed:`, err);
          }
        })()
      );
    }
    if (cronExpression === "0 * * * *") {
      ctx.waitUntil(
        cacheUpdate.handleScheduled(event).catch(
          (err) => console.error(`[Cron] Hourly cache refresh failed:`, err)
        )
      );
    }
    if (cronExpression === "0 0 * * *") {
      ctx.waitUntil(
        cacheUpdate.handleScheduled(event).catch(
          (err) => console.error(`[Cron] Daily cache refresh failed:`, err)
        )
      );
    }
    if (cronExpression === "0 2 * * *") {
      ctx.waitUntil(
        (async () => {
          try {
            const aggregationService = createAggregationService(env2);
            const result = await aggregationService.aggregateDailyData();
            if (result.success) {
              console.log(`[Cron] Aggregation completed: ${result.message}`);
            } else {
              console.error(`[Cron] Aggregation failed: ${result.message}`);
              console.error(`[Cron] Errors:`, result.errors);
            }
          } catch (err) {
            console.error(`[Cron] Aggregation error:`, err);
          }
        })()
      );
    }
  }
};
export {
  CacheDurableObject,
  CounterDurableObject,
  EventActor,
  QueueDurableObject,
  SessionDurableObject,
  StatsActor,
  TrackingStatsDO,
  UniquenessDurableObject,
  UserPreferenceDurableObject,
  app,
  index_default as default
};
//# sourceMappingURL=index.js.map
