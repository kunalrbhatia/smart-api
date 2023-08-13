"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return { value: void 0, done: !0 }; } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable || "" === iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } throw new TypeError(_typeof(iterable) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
var __awaiter = void 0 && (void 0).__awaiter || function (thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function (resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __importDefault = void 0 && (void 0).__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isMarketClosed = exports.getOpenPositions = exports.checkStrike = exports.readJsonFile = exports.writeJsonFile = exports.isJson = exports.createJsonFile = exports.getCurrentDate = exports.isCurrentTimeGreater = exports.delay = exports.getAtmStrikePrice = exports.findNearestStrike = exports.getNextExpiry = void 0;
var apiService_1 = require("./apiService");
var lodash_1 = require("lodash");
var fs_1 = __importDefault(require("fs"));
var moment_timezone_1 = __importDefault(require("moment-timezone"));
var constants_1 = require("./constants");
var getNextExpiry = function getNextExpiry() {
  /*
   *const today = new Date('08/03/2023');
   *For testing getNextExpiry logic
   */
  var today = new Date();
  var dayOfWeek = today.getDay();
  var isThursday = dayOfWeek === 4;
  var isWednesday = dayOfWeek === 3;
  var daysUntilNextThursday = function daysUntilNextThursday() {
    if (isWednesday) return 8;else if (isThursday) return 7;else return (11 - dayOfWeek) % 7;
  };
  var comingThursday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntilNextThursday());
  var year = comingThursday.getFullYear();
  var month = comingThursday.getMonth() + 1;
  var day = comingThursday.getDate().toString().padStart(2, '0');
  var months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  var monthName = months[month - 1];
  var formattedDate = "".concat(day).concat(monthName).concat(year);
  return formattedDate;
};
exports.getNextExpiry = getNextExpiry;
var findNearestStrike = function findNearestStrike(options, target) {
  var nearestStrike = Infinity;
  var nearestDiff = Infinity;
  var _iterator = _createForOfIteratorHelper(options),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var option = _step.value;
      var strike = parseInt((0, lodash_1.get)(option, 'strike', '')) / 100;
      var currentDiff = Math.abs(target - strike);
      if (currentDiff < nearestDiff) {
        nearestDiff = currentDiff;
        nearestStrike = strike;
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return nearestStrike;
};
exports.findNearestStrike = findNearestStrike;
var getAtmStrikePrice = function getAtmStrikePrice() {
  return __awaiter(void 0, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
    var expiryDate, optionChain, ltp, ltpPrice, nearestStrike;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          expiryDate = (0, exports.getNextExpiry)();
          _context.prev = 1;
          _context.next = 4;
          return (0, apiService_1.getScrip)({
            scriptName: 'BANKNIFTY',
            expiryDate: expiryDate
          });
        case 4:
          optionChain = _context.sent;
          _context.next = 7;
          return (0, apiService_1.getLtpData)({
            exchange: 'NSE',
            tradingsymbol: 'BANKNIFTY',
            symboltoken: '26009'
          });
        case 7:
          ltp = _context.sent;
          ltpPrice = parseInt((0, lodash_1.get)(ltp, 'ltp', ''));
          nearestStrike = (0, exports.findNearestStrike)(optionChain, ltpPrice);
          return _context.abrupt("return", nearestStrike);
        case 13:
          _context.prev = 13;
          _context.t0 = _context["catch"](1);
          console.error("".concat(constants_1.ALGO, ": Error - ").concat(_context.t0));
          throw _context.t0;
        case 17:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[1, 13]]);
  }));
};
exports.getAtmStrikePrice = getAtmStrikePrice;
var delay = function delay(_ref) {
  var milliSeconds = _ref.milliSeconds;
  var FIVE_MINUTES = 5 * 60 * 1000;
  var delayInMilliseconds = 0;
  if (milliSeconds && typeof milliSeconds === 'number') delayInMilliseconds = milliSeconds;else if (milliSeconds && typeof milliSeconds === 'string') delayInMilliseconds = parseInt(milliSeconds);else delayInMilliseconds = FIVE_MINUTES;
  return new Promise(function (resolve) {
    setTimeout(resolve, delayInMilliseconds);
  });
};
exports.delay = delay;
var isCurrentTimeGreater = function isCurrentTimeGreater(_ref2) {
  var hours = _ref2.hours,
    minutes = _ref2.minutes;
  var currentTime = (0, moment_timezone_1["default"])().tz('Asia/Kolkata'); // Set your local time zone here (IST)
  var targetTime = (0, moment_timezone_1["default"])().tz('Asia/Kolkata').set({
    hours: hours,
    minutes: minutes,
    seconds: 0
  });
  return currentTime.isAfter(targetTime);
};
exports.isCurrentTimeGreater = isCurrentTimeGreater;
var getCurrentDate = function getCurrentDate() {
  var today = new Date();
  var year = today.getFullYear();
  var month = String(today.getMonth() + 1).padStart(2, '0');
  var day = String(today.getDate()).padStart(2, '0');
  return "".concat(year, "_").concat(month, "_").concat(day);
};
exports.getCurrentDate = getCurrentDate;
var createJsonFile = function createJsonFile() {
  return __awaiter(void 0, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
    var currentDate, fileName, exists, json;
    return _regeneratorRuntime().wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          currentDate = (0, exports.getCurrentDate)();
          fileName = "".concat(currentDate, "_trades.json");
          exists = fs_1["default"].existsSync(fileName);
          if (!exists) {
            _context2.next = 7;
            break;
          }
          return _context2.abrupt("return", (0, exports.readJsonFile)());
        case 7:
          json = {
            isTradeExecuted: false,
            accountDetails: {
              capitalUsed: 0
            },
            tradeDetails: [],
            isTradeClosed: false,
            mtm: []
          };
          _context2.next = 10;
          return (0, exports.writeJsonFile)(json);
        case 10:
          return _context2.abrupt("return", json);
        case 11:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
};
exports.createJsonFile = createJsonFile;
var isJson = function isJson(string) {
  try {
    JSON.parse(string);
    return true;
  } catch (error) {
    return false;
  }
};
exports.isJson = isJson;
var writeJsonFile = function writeJsonFile(data) {
  return __awaiter(void 0, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
    var currentDate, fileName, dataToStoreString;
    return _regeneratorRuntime().wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          currentDate = (0, exports.getCurrentDate)();
          fileName = "".concat(currentDate, "_trades.json");
          dataToStoreString = JSON.stringify(data);
          if (!(0, exports.isJson)(dataToStoreString)) {
            _context3.next = 7;
            break;
          }
          fs_1["default"].writeFile(fileName, dataToStoreString, function (err) {
            if (err) {
              console.error("".concat(constants_1.ALGO, ": Error writing data to file:"), err);
            } else {}
          });
          _context3.next = 7;
          return (0, exports.delay)({
            milliSeconds: constants_1.DELAY
          });
        case 7:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }));
};
exports.writeJsonFile = writeJsonFile;
var readJsonFile = function readJsonFile() {
  var currentDate = (0, exports.getCurrentDate)();
  var fileName = "".concat(currentDate, "_trades.json");
  var dataFromFile = fs_1["default"].readFileSync(fileName, 'utf-8');
  var dataFromFileJson = JSON.parse(dataFromFile);
  return dataFromFileJson;
};
exports.readJsonFile = readJsonFile;
var checkStrike = function checkStrike(tradeDetails, strike) {
  var _iterator2 = _createForOfIteratorHelper(tradeDetails),
    _step2;
  try {
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      var trade = _step2.value;
      if (trade.strike === strike) {
        return true;
      }
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }
  return false;
};
exports.checkStrike = checkStrike;
var getOpenPositions = function getOpenPositions(positions) {
  var openPositions = [];
  var _iterator3 = _createForOfIteratorHelper(positions),
    _step3;
  try {
    for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
      var position = _step3.value;
      var netqty = parseInt(position.netqty);
      if (netqty > 0 || netqty < 0) {
        openPositions.push(position);
      }
    }
  } catch (err) {
    _iterator3.e(err);
  } finally {
    _iterator3.f();
  }
  return openPositions;
};
exports.getOpenPositions = getOpenPositions;
var isMarketClosed = function isMarketClosed() {
  if ((0, exports.isCurrentTimeGreater)({
    hours: 9,
    minutes: 15
  }) && !(0, exports.isCurrentTimeGreater)({
    hours: 15,
    minutes: 30
  })) {
    return false;
  } else {
    return true;
  }
};
exports.isMarketClosed = isMarketClosed;