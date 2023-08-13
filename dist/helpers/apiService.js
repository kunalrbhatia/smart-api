"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return { value: void 0, done: !0 }; } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable || "" === iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } throw new TypeError(_typeof(iterable) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
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
exports.checkPositionAlreadyExists = exports.checkMarketConditionsAndExecuteTrade = exports.executeTrade = exports.checkToRepeatShortStraddle = exports.areAllTradesClosed = exports.closeTrade = exports.closeAllTrades = exports.getPositionsJson = exports.repeatShortStraddle = exports.getMarginDetails = exports.shortStraddle = exports.calculateMtm = exports.doOrder = exports.getPositions = exports.getScrip = exports.fetchData = exports.generateSmartSession = exports.getLtpData = void 0;
var lodash_1 = require("lodash");
var _require = require('smartapi-javascript'),
  SmartAPI = _require.SmartAPI;
var axios = require('axios');
var totp = require('totp-generator');
var dotenv_1 = __importDefault(require("dotenv"));
var functions_1 = require("./functions");
var constants_1 = require("./constants");
dotenv_1["default"].config();
var getLtpData = function getLtpData(_ref) {
  var exchange = _ref.exchange,
    tradingsymbol = _ref.tradingsymbol,
    symboltoken = _ref.symboltoken;
  return __awaiter(void 0, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
    var smartApiData, jwtToken, data, config, response;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return (0, exports.generateSmartSession)();
        case 2:
          smartApiData = _context.sent;
          jwtToken = (0, lodash_1.get)(smartApiData, 'jwtToken');
          data = JSON.stringify({
            exchange: exchange,
            tradingsymbol: tradingsymbol,
            symboltoken: symboltoken
          });
          config = {
            method: 'post',
            url: constants_1.GET_LTP_DATA_API,
            headers: {
              Authorization: "Bearer ".concat(jwtToken),
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'X-UserType': 'USER',
              'X-SourceID': 'WEB',
              'X-ClientLocalIP': 'CLIENT_LOCAL_IP',
              'X-ClientPublicIP': 'CLIENT_PUBLIC_IP',
              'X-MACAddress': 'MAC_ADDRESS',
              'X-PrivateKey': process.env.API_KEY
            },
            data: data
          };
          _context.prev = 6;
          _context.next = 9;
          return axios(config);
        case 9:
          response = _context.sent;
          return _context.abrupt("return", (0, lodash_1.get)(response, 'data.data', {}) || {});
        case 13:
          _context.prev = 13;
          _context.t0 = _context["catch"](6);
          throw _context.t0;
        case 16:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[6, 13]]);
  }));
};
exports.getLtpData = getLtpData;
var generateSmartSession = function generateSmartSession() {
  return __awaiter(void 0, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
    var smart_api, TOTP;
    return _regeneratorRuntime().wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          smart_api = new SmartAPI({
            api_key: process.env.API_KEY
          });
          TOTP = totp(process.env.CLIENT_TOTP_KEY);
          return _context3.abrupt("return", smart_api.generateSession(process.env.CLIENT_CODE, process.env.CLIENT_PIN, TOTP).then(function (response) {
            return __awaiter(void 0, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
              return _regeneratorRuntime().wrap(function _callee2$(_context2) {
                while (1) switch (_context2.prev = _context2.next) {
                  case 0:
                    return _context2.abrupt("return", (0, lodash_1.get)(response, 'data'));
                  case 1:
                  case "end":
                    return _context2.stop();
                }
              }, _callee2);
            }));
          })["catch"](function (ex) {
            throw ex;
          }));
        case 3:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }));
};
exports.generateSmartSession = generateSmartSession;
var fetchData = function fetchData() {
  return __awaiter(void 0, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee4() {
    return _regeneratorRuntime().wrap(function _callee4$(_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          _context4.next = 2;
          return axios.get(constants_1.SCRIPMASTER).then(function (response) {
            var acData = (0, lodash_1.get)(response, 'data', []) || [];
            var scripMaster = acData.map(function (element, index) {
              return Object.assign(Object.assign({}, element), {
                label: (0, lodash_1.get)(element, 'name', 'NONAME') || 'NONAME',
                key: '0' + index + (0, lodash_1.get)(element, 'token', '00') || '00'
              });
            });
            return scripMaster;
          })["catch"](function (evt) {
            throw evt;
          });
        case 2:
          return _context4.abrupt("return", _context4.sent);
        case 3:
        case "end":
          return _context4.stop();
      }
    }, _callee4);
  }));
};
exports.fetchData = fetchData;
var getScrip = function getScrip(_ref2) {
  var scriptName = _ref2.scriptName,
    strikePrice = _ref2.strikePrice,
    optionType = _ref2.optionType,
    expiryDate = _ref2.expiryDate;
  return __awaiter(void 0, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee5() {
    var scripMaster, scrips, errorMessage;
    return _regeneratorRuntime().wrap(function _callee5$(_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          _context5.next = 2;
          return (0, exports.fetchData)();
        case 2:
          scripMaster = _context5.sent;
          if (!(scriptName && (0, lodash_1.isArray)(scripMaster) && scripMaster.length > 0)) {
            _context5.next = 10;
            break;
          }
          scrips = scripMaster.filter(function (scrip) {
            var _scripName = (0, lodash_1.get)(scrip, 'name', '') || '';
            var _symbol = (0, lodash_1.get)(scrip, 'symbol', '') || '';
            var _expiry = (0, lodash_1.get)(scrip, 'expiry', '') || '';
            return (_scripName.includes(scriptName) || _scripName === scriptName) && (0, lodash_1.get)(scrip, 'exch_seg') === 'NFO' && (0, lodash_1.get)(scrip, 'instrumenttype') === 'OPTIDX' && (strikePrice === undefined || _symbol.includes(strikePrice)) && (optionType === undefined || _symbol.includes(optionType)) && _expiry === expiryDate;
          });
          scrips.sort(function (curr, next) {
            return (0, lodash_1.get)(curr, 'token', 0) - (0, lodash_1.get)(next, 'token', 0);
          });
          scrips = scrips.map(function (element, index) {
            return Object.assign(Object.assign({}, element), {
              label: (0, lodash_1.get)(element, 'name', 'NoName') || 'NoName',
              key: index
            });
          });
          return _context5.abrupt("return", scrips);
        case 10:
          errorMessage = "".concat(constants_1.ALGO, ": getScrip failed");
          throw errorMessage;
        case 12:
        case "end":
          return _context5.stop();
      }
    }, _callee5);
  }));
};
exports.getScrip = getScrip;
var getPositions = function getPositions() {
  return __awaiter(void 0, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee6() {
    var smartApiData, jwtToken, config;
    return _regeneratorRuntime().wrap(function _callee6$(_context6) {
      while (1) switch (_context6.prev = _context6.next) {
        case 0:
          _context6.next = 2;
          return (0, functions_1.delay)({
            milliSeconds: constants_1.DELAY
          });
        case 2:
          _context6.next = 4;
          return (0, exports.generateSmartSession)();
        case 4:
          smartApiData = _context6.sent;
          jwtToken = (0, lodash_1.get)(smartApiData, 'jwtToken');
          config = {
            method: 'get',
            url: constants_1.GET_POSITIONS,
            headers: {
              Authorization: "Bearer ".concat(jwtToken),
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'X-UserType': 'USER',
              'X-SourceID': 'WEB',
              'X-ClientLocalIP': 'CLIENT_LOCAL_IP',
              'X-ClientPublicIP': 'CLIENT_PUBLIC_IP',
              'X-MACAddress': 'MAC_ADDRESS',
              'X-PrivateKey': process.env.API_KEY
            },
            data: ''
          };
          return _context6.abrupt("return", axios(config).then(function (response) {
            return (0, lodash_1.get)(response, 'data');
          })["catch"](function (error) {
            var errorMessage = "".concat(constants_1.ALGO, ": getPositions failed error below");
            throw error;
          }));
        case 8:
        case "end":
          return _context6.stop();
      }
    }, _callee6);
  }));
};
exports.getPositions = getPositions;
var doOrder = function doOrder(_ref3) {
  var tradingsymbol = _ref3.tradingsymbol,
    transactionType = _ref3.transactionType,
    symboltoken = _ref3.symboltoken;
  return __awaiter(void 0, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee7() {
    var smartApiData, jwtToken, data, config;
    return _regeneratorRuntime().wrap(function _callee7$(_context7) {
      while (1) switch (_context7.prev = _context7.next) {
        case 0:
          _context7.next = 2;
          return (0, exports.generateSmartSession)();
        case 2:
          smartApiData = _context7.sent;
          jwtToken = (0, lodash_1.get)(smartApiData, 'jwtToken');
          data = JSON.stringify({
            exchange: 'NFO',
            tradingsymbol: tradingsymbol,
            symboltoken: symboltoken,
            quantity: 15,
            disclosedquantity: 15,
            transactiontype: transactionType,
            ordertype: 'MARKET',
            variety: 'NORMAL',
            producttype: 'CARRYFORWARD',
            duration: 'DAY'
          });
          config = {
            method: 'post',
            url: constants_1.ORDER_API,
            headers: {
              Authorization: "Bearer ".concat(jwtToken),
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'X-UserType': 'USER',
              'X-SourceID': 'WEB',
              'X-ClientLocalIP': 'CLIENT_LOCAL_IP',
              'X-ClientPublicIP': 'CLIENT_PUBLIC_IP',
              'X-MACAddress': 'MAC_ADDRESS',
              'X-PrivateKey': process.env.API_KEY
            },
            data: data
          };
          return _context7.abrupt("return", axios(config).then(function (response) {
            return (0, lodash_1.get)(response, 'data');
          })["catch"](function (error) {
            var errorMessage = "".concat(constants_1.ALGO, ": doOrder failed error below");
            throw error;
          }));
        case 7:
        case "end":
          return _context7.stop();
      }
    }, _callee7);
  }));
};
exports.doOrder = doOrder;
var calculateMtm = function calculateMtm(_ref4) {
  var data = _ref4.data;
  return __awaiter(void 0, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee8() {
    var currentPositions, currentPositionsData, mtm;
    return _regeneratorRuntime().wrap(function _callee8$(_context8) {
      while (1) switch (_context8.prev = _context8.next) {
        case 0:
          _context8.next = 2;
          return (0, exports.getPositions)();
        case 2:
          currentPositions = _context8.sent;
          currentPositionsData = (0, lodash_1.get)(currentPositions, 'data');
          mtm = 0;
          currentPositionsData.forEach(function (value) {
            data.tradeDetails.forEach(function (trade) {
              if (trade && trade.token === (0, lodash_1.get)(value, 'symboltoken', '')) {
                mtm += parseInt((0, lodash_1.get)(value, 'unrealised', ''));
              }
            });
          });
          return _context8.abrupt("return", mtm);
        case 7:
        case "end":
          return _context8.stop();
      }
    }, _callee8);
  }));
};
exports.calculateMtm = calculateMtm;
var shortStraddle = function shortStraddle() {
  return __awaiter(void 0, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee9() {
    var atmStrike, expiryDate, ceToken, peToken, ceOrderData, peOrderData, errorMessage;
    return _regeneratorRuntime().wrap(function _callee9$(_context9) {
      while (1) switch (_context9.prev = _context9.next) {
        case 0:
          _context9.prev = 0;
          _context9.next = 3;
          return (0, functions_1.delay)({
            milliSeconds: constants_1.DELAY
          });
        case 3:
          _context9.next = 5;
          return (0, functions_1.getAtmStrikePrice)();
        case 5:
          atmStrike = _context9.sent;
          //GET CURRENT EXPIRY
          expiryDate = (0, functions_1.getNextExpiry)(); //GET CALL DATA
          _context9.next = 9;
          return (0, functions_1.delay)({
            milliSeconds: constants_1.DELAY
          });
        case 9:
          _context9.next = 11;
          return (0, exports.getScrip)({
            scriptName: 'BANKNIFTY',
            expiryDate: expiryDate,
            optionType: 'CE',
            strikePrice: atmStrike.toString()
          });
        case 11:
          ceToken = _context9.sent;
          _context9.next = 14;
          return (0, functions_1.delay)({
            milliSeconds: constants_1.DELAY
          });
        case 14:
          _context9.next = 16;
          return (0, exports.getScrip)({
            scriptName: 'BANKNIFTY',
            expiryDate: expiryDate,
            optionType: 'PE',
            strikePrice: atmStrike.toString()
          });
        case 16:
          peToken = _context9.sent;
          _context9.next = 19;
          return (0, functions_1.delay)({
            milliSeconds: constants_1.DELAY
          });
        case 19:
          _context9.next = 21;
          return (0, exports.doOrder)({
            tradingsymbol: (0, lodash_1.get)(ceToken, '0.symbol', ''),
            symboltoken: (0, lodash_1.get)(ceToken, '0.token', ''),
            transactionType: constants_1.TRANSACTION_TYPE_SELL
          });
        case 21:
          ceOrderData = _context9.sent;
          _context9.next = 24;
          return (0, functions_1.delay)({
            milliSeconds: constants_1.DELAY
          });
        case 24:
          _context9.next = 26;
          return (0, exports.doOrder)({
            tradingsymbol: (0, lodash_1.get)(peToken, '0.symbol', ''),
            symboltoken: (0, lodash_1.get)(peToken, '0.token', ''),
            transactionType: constants_1.TRANSACTION_TYPE_SELL
          });
        case 26:
          peOrderData = _context9.sent;
          return _context9.abrupt("return", {
            stikePrice: atmStrike.toString(),
            expiryDate: expiryDate,
            netQty: '-15',
            ceOrderToken: (0, lodash_1.get)(ceToken, '0.token', ''),
            peOrderToken: (0, lodash_1.get)(peToken, '0.token', ''),
            ceOrderSymbol: (0, lodash_1.get)(ceToken, '0.symbol', ''),
            peOrderSymbol: (0, lodash_1.get)(peToken, '0.symbol', ''),
            ceOrderStatus: ceOrderData.status,
            peOrderStatus: peOrderData.status
          });
        case 30:
          _context9.prev = 30;
          _context9.t0 = _context9["catch"](0);
          errorMessage = "".concat(constants_1.ALGO, ": shortStraddle failed error below");
          throw _context9.t0;
        case 34:
        case "end":
          return _context9.stop();
      }
    }, _callee9, null, [[0, 30]]);
  }));
};
exports.shortStraddle = shortStraddle;
var getMarginDetails = function getMarginDetails() {
  return __awaiter(void 0, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee10() {
    var smartApiData, jwtToken, config;
    return _regeneratorRuntime().wrap(function _callee10$(_context10) {
      while (1) switch (_context10.prev = _context10.next) {
        case 0:
          _context10.next = 2;
          return (0, exports.generateSmartSession)();
        case 2:
          smartApiData = _context10.sent;
          jwtToken = (0, lodash_1.get)(smartApiData, 'jwtToken');
          config = {
            method: 'get',
            url: constants_1.GET_MARGIN,
            headers: {
              Authorization: "Bearer ".concat(jwtToken),
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'X-UserType': 'USER',
              'X-SourceID': 'WEB',
              'X-ClientLocalIP': 'CLIENT_LOCAL_IP',
              'X-ClientPublicIP': 'CLIENT_PUBLIC_IP',
              'X-MACAddress': 'MAC_ADDRESS',
              'X-PrivateKey': process.env.API_KEY
            }
          };
          return _context10.abrupt("return", axios(config).then(function (response) {
            return (0, lodash_1.get)(response, 'data');
          })["catch"](function (error) {
            var errorMessage = "".concat(constants_1.ALGO, ": getMarginDetails failed error below");
            throw error;
          }));
        case 6:
        case "end":
          return _context10.stop();
      }
    }, _callee10);
  }));
};
exports.getMarginDetails = getMarginDetails;
var repeatShortStraddle = function repeatShortStraddle(difference, atmStrike) {
  return __awaiter(void 0, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee11() {
    var data, shortStraddleData, errorMessage;
    return _regeneratorRuntime().wrap(function _callee11$(_context11) {
      while (1) switch (_context11.prev = _context11.next) {
        case 0:
          _context11.prev = 0;
          data = (0, functions_1.readJsonFile)();
          if (!(difference >= constants_1.STRIKE_DIFFERENCE && (0, functions_1.checkStrike)(data.tradeDetails, atmStrike.toString()) === false)) {
            _context11.next = 10;
            break;
          }
          _context11.next = 5;
          return (0, exports.shortStraddle)();
        case 5:
          shortStraddleData = _context11.sent;
          data.tradeDetails.push({
            optionType: 'CE',
            netQty: shortStraddleData.netQty,
            expireDate: shortStraddleData.expiryDate,
            strike: shortStraddleData.stikePrice,
            token: shortStraddleData.ceOrderToken,
            symbol: shortStraddleData.ceOrderSymbol,
            closed: false,
            isAlgoCreatedPosition: true
          });
          data.tradeDetails.push({
            optionType: 'PE',
            netQty: shortStraddleData.netQty,
            expireDate: shortStraddleData.expiryDate,
            strike: shortStraddleData.stikePrice,
            token: shortStraddleData.peOrderToken,
            symbol: shortStraddleData.peOrderSymbol,
            closed: false,
            isAlgoCreatedPosition: true
          });
          _context11.next = 10;
          return (0, functions_1.writeJsonFile)(data);
        case 10:
          _context11.next = 16;
          break;
        case 12:
          _context11.prev = 12;
          _context11.t0 = _context11["catch"](0);
          errorMessage = "".concat(constants_1.ALGO, ": repeatShortStraddle failed error below");
          throw _context11.t0;
        case 16:
        case "end":
          return _context11.stop();
      }
    }, _callee11, null, [[0, 12]]);
  }));
};
exports.repeatShortStraddle = repeatShortStraddle;
var getPositionsJson = function getPositionsJson() {
  return __awaiter(void 0, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee12() {
    var currentPositions, positions, openPositions, json, tradeDetails, _iterator, _step, position, isTradeExists, trade, errorMessage;
    return _regeneratorRuntime().wrap(function _callee12$(_context12) {
      while (1) switch (_context12.prev = _context12.next) {
        case 0:
          _context12.prev = 0;
          _context12.next = 3;
          return (0, exports.getPositions)();
        case 3:
          currentPositions = _context12.sent;
          positions = (0, lodash_1.get)(currentPositions, 'data', []) || [];
          openPositions = (0, functions_1.getOpenPositions)(positions);
          _context12.next = 8;
          return (0, functions_1.createJsonFile)();
        case 8:
          json = _context12.sent;
          tradeDetails = json.tradeDetails;
          _iterator = _createForOfIteratorHelper(openPositions);
          _context12.prev = 11;
          _iterator.s();
        case 13:
          if ((_step = _iterator.n()).done) {
            _context12.next = 21;
            break;
          }
          position = _step.value;
          _context12.next = 17;
          return (0, exports.checkPositionAlreadyExists)({
            position: position
          });
        case 17:
          isTradeExists = _context12.sent;
          if (isTradeExists === false) {
            trade = {
              netQty: position.netqty,
              optionType: position.optiontype,
              expireDate: position.expirydate,
              strike: position.strikeprice,
              symbol: position.symbolname,
              token: position.symboltoken,
              closed: false,
              isAlgoCreatedPosition: false
            };
            tradeDetails.push(trade);
          }
        case 19:
          _context12.next = 13;
          break;
        case 21:
          _context12.next = 26;
          break;
        case 23:
          _context12.prev = 23;
          _context12.t0 = _context12["catch"](11);
          _iterator.e(_context12.t0);
        case 26:
          _context12.prev = 26;
          _iterator.f();
          return _context12.finish(26);
        case 29:
          _context12.next = 31;
          return (0, functions_1.writeJsonFile)(json);
        case 31:
          return _context12.abrupt("return", json);
        case 34:
          _context12.prev = 34;
          _context12.t1 = _context12["catch"](0);
          errorMessage = "".concat(constants_1.ALGO, ": getPositionsJson failed error below");
          throw _context12.t1;
        case 38:
        case "end":
          return _context12.stop();
      }
    }, _callee12, null, [[0, 34], [11, 23, 26, 29]]);
  }));
};
exports.getPositionsJson = getPositionsJson;
var closeAllTrades = function closeAllTrades() {
  return __awaiter(void 0, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee14() {
    var data, tradeDetails, _closeTrade, _iterator2, _step2, trade, errorMessage;
    return _regeneratorRuntime().wrap(function _callee14$(_context14) {
      while (1) switch (_context14.prev = _context14.next) {
        case 0:
          _context14.prev = 0;
          _context14.next = 3;
          return (0, functions_1.delay)({
            milliSeconds: constants_1.DELAY
          });
        case 3:
          data = (0, functions_1.readJsonFile)();
          _context14.next = 6;
          return (0, functions_1.delay)({
            milliSeconds: constants_1.DELAY
          });
        case 6:
          tradeDetails = data.tradeDetails;
          _closeTrade = function _closeTrade(_ref5) {
            var trade = _ref5.trade;
            return __awaiter(void 0, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee13() {
              var transactionStatus, errorMessage;
              return _regeneratorRuntime().wrap(function _callee13$(_context13) {
                while (1) switch (_context13.prev = _context13.next) {
                  case 0:
                    _context13.prev = 0;
                    if (!trade.isAlgoCreatedPosition) {
                      _context13.next = 8;
                      break;
                    }
                    _context13.next = 4;
                    return (0, functions_1.delay)({
                      milliSeconds: constants_1.DELAY
                    });
                  case 4:
                    _context13.next = 6;
                    return (0, exports.doOrder)({
                      tradingsymbol: trade.symbol,
                      transactionType: constants_1.TRANSACTION_TYPE_BUY,
                      symboltoken: trade.token
                    });
                  case 6:
                    transactionStatus = _context13.sent;
                    trade.closed = transactionStatus.status;
                  case 8:
                    _context13.next = 14;
                    break;
                  case 10:
                    _context13.prev = 10;
                    _context13.t0 = _context13["catch"](0);
                    errorMessage = "".concat(constants_1.ALGO, ": closeTrade failed error below");
                    throw _context13.t0;
                  case 14:
                  case "end":
                    return _context13.stop();
                }
              }, _callee13, null, [[0, 10]]);
            }));
          };
          if (!Array.isArray(tradeDetails)) {
            _context14.next = 30;
            break;
          }
          _iterator2 = _createForOfIteratorHelper(tradeDetails);
          _context14.prev = 10;
          _iterator2.s();
        case 12:
          if ((_step2 = _iterator2.n()).done) {
            _context14.next = 18;
            break;
          }
          trade = _step2.value;
          _context14.next = 16;
          return _closeTrade({
            trade: trade
          });
        case 16:
          _context14.next = 12;
          break;
        case 18:
          _context14.next = 23;
          break;
        case 20:
          _context14.prev = 20;
          _context14.t0 = _context14["catch"](10);
          _iterator2.e(_context14.t0);
        case 23:
          _context14.prev = 23;
          _iterator2.f();
          return _context14.finish(23);
        case 26:
          _context14.next = 28;
          return (0, functions_1.delay)({
            milliSeconds: constants_1.DELAY
          });
        case 28:
          _context14.next = 30;
          return (0, functions_1.writeJsonFile)(data);
        case 30:
          _context14.next = 36;
          break;
        case 32:
          _context14.prev = 32;
          _context14.t1 = _context14["catch"](0);
          errorMessage = "".concat(constants_1.ALGO, ": closeAllTrades failed error below");
          throw _context14.t1;
        case 36:
        case "end":
          return _context14.stop();
      }
    }, _callee14, null, [[0, 32], [10, 20, 23, 26]]);
  }));
};
exports.closeAllTrades = closeAllTrades;
var closeTrade = function closeTrade() {
  return __awaiter(void 0, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee15() {
    var data;
    return _regeneratorRuntime().wrap(function _callee15$(_context15) {
      while (1) switch (_context15.prev = _context15.next) {
        case 0:
          _context15.next = 2;
          return (0, exports.areAllTradesClosed)();
        case 2:
          _context15.t0 = _context15.sent;
          if (!(_context15.t0 === false)) {
            _context15.next = 8;
            break;
          }
          _context15.next = 6;
          return (0, exports.closeAllTrades)();
        case 6:
          _context15.next = 0;
          break;
        case 8:
          _context15.next = 10;
          return (0, functions_1.delay)({
            milliSeconds: constants_1.DELAY
          });
        case 10:
          data = (0, functions_1.readJsonFile)();
          data.isTradeClosed = true;
          _context15.next = 14;
          return (0, functions_1.delay)({
            milliSeconds: constants_1.DELAY
          });
        case 14:
          _context15.next = 16;
          return (0, functions_1.writeJsonFile)(data);
        case 16:
        case "end":
          return _context15.stop();
      }
    }, _callee15);
  }));
};
exports.closeTrade = closeTrade;
var areAllTradesClosed = function areAllTradesClosed() {
  return __awaiter(void 0, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee16() {
    var data, tradeDetails, _iterator3, _step3, trade;
    return _regeneratorRuntime().wrap(function _callee16$(_context16) {
      while (1) switch (_context16.prev = _context16.next) {
        case 0:
          _context16.next = 2;
          return (0, functions_1.delay)({
            milliSeconds: constants_1.DELAY
          });
        case 2:
          data = (0, functions_1.readJsonFile)();
          _context16.next = 5;
          return (0, functions_1.delay)({
            milliSeconds: constants_1.DELAY
          });
        case 5:
          tradeDetails = data.tradeDetails;
          if (!Array.isArray(tradeDetails)) {
            _context16.next = 27;
            break;
          }
          _iterator3 = _createForOfIteratorHelper(tradeDetails);
          _context16.prev = 8;
          _iterator3.s();
        case 10:
          if ((_step3 = _iterator3.n()).done) {
            _context16.next = 16;
            break;
          }
          trade = _step3.value;
          if (!(trade.closed === false)) {
            _context16.next = 14;
            break;
          }
          return _context16.abrupt("return", false);
        case 14:
          _context16.next = 10;
          break;
        case 16:
          _context16.next = 21;
          break;
        case 18:
          _context16.prev = 18;
          _context16.t0 = _context16["catch"](8);
          _iterator3.e(_context16.t0);
        case 21:
          _context16.prev = 21;
          _iterator3.f();
          return _context16.finish(21);
        case 24:
          return _context16.abrupt("return", true);
        case 27:
          return _context16.abrupt("return", false);
        case 28:
        case "end":
          return _context16.stop();
      }
    }, _callee16, null, [[8, 18, 21, 24]]);
  }));
};
exports.areAllTradesClosed = areAllTradesClosed;
var checkToRepeatShortStraddle = function checkToRepeatShortStraddle(atmStrike, previousTradeStrikePrice) {
  return __awaiter(void 0, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee17() {
    var difference, _difference;
    return _regeneratorRuntime().wrap(function _callee17$(_context17) {
      while (1) switch (_context17.prev = _context17.next) {
        case 0:
          if (!(atmStrike > previousTradeStrikePrice)) {
            _context17.next = 8;
            break;
          }
          difference = atmStrike - previousTradeStrikePrice;
          _context17.next = 4;
          return (0, functions_1.delay)({
            milliSeconds: constants_1.DELAY
          });
        case 4:
          _context17.next = 6;
          return (0, exports.repeatShortStraddle)(difference, atmStrike);
        case 6:
          _context17.next = 14;
          break;
        case 8:
          if (!(atmStrike < previousTradeStrikePrice)) {
            _context17.next = 14;
            break;
          }
          _difference = previousTradeStrikePrice - atmStrike;
          _context17.next = 12;
          return (0, functions_1.delay)({
            milliSeconds: constants_1.DELAY
          });
        case 12:
          _context17.next = 14;
          return (0, exports.repeatShortStraddle)(_difference, atmStrike);
        case 14:
        case "end":
          return _context17.stop();
      }
    }, _callee17);
  }));
};
exports.checkToRepeatShortStraddle = checkToRepeatShortStraddle;
var executeTrade = function executeTrade() {
  return __awaiter(void 0, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee18() {
    var data, shortStraddleData, atmStrike, no_of_trades, previousTradeStrikePrice, mtmData, istTz, mtm, closingTime;
    return _regeneratorRuntime().wrap(function _callee18$(_context18) {
      while (1) switch (_context18.prev = _context18.next) {
        case 0:
          data = (0, functions_1.readJsonFile)();
          if (data.isTradeExecuted) {
            _context18.next = 14;
            break;
          }
          _context18.next = 4;
          return (0, exports.shortStraddle)();
        case 4:
          shortStraddleData = _context18.sent;
          if (!(shortStraddleData.ceOrderStatus && shortStraddleData.peOrderStatus)) {
            _context18.next = 12;
            break;
          }
          data.isTradeExecuted = true;
          data.isTradeClosed = false;
          data.tradeDetails.push({
            optionType: 'CE',
            netQty: shortStraddleData.netQty,
            expireDate: shortStraddleData.expiryDate,
            strike: shortStraddleData.stikePrice,
            token: shortStraddleData.ceOrderToken,
            symbol: shortStraddleData.ceOrderSymbol,
            closed: false,
            isAlgoCreatedPosition: true
          });
          data.tradeDetails.push({
            optionType: 'PE',
            netQty: shortStraddleData.netQty,
            expireDate: shortStraddleData.expiryDate,
            strike: shortStraddleData.stikePrice,
            token: shortStraddleData.peOrderToken,
            symbol: shortStraddleData.peOrderSymbol,
            closed: false,
            isAlgoCreatedPosition: true
          });
          _context18.next = 12;
          return (0, functions_1.writeJsonFile)(data);
        case 12:
          _context18.next = 22;
          break;
        case 14:
          _context18.next = 16;
          return (0, functions_1.delay)({
            milliSeconds: constants_1.DELAY
          });
        case 16:
          _context18.next = 18;
          return (0, functions_1.getAtmStrikePrice)();
        case 18:
          atmStrike = _context18.sent;
          no_of_trades = data.tradeDetails.length;
          previousTradeStrikePrice = (0, lodash_1.get)(data, "tradeDetails.".concat(no_of_trades - 1, ".call.strike"), '');
          (0, exports.checkToRepeatShortStraddle)(atmStrike, parseInt(previousTradeStrikePrice));
        case 22:
          _context18.next = 24;
          return (0, functions_1.delay)({
            milliSeconds: constants_1.DELAY
          });
        case 24:
          _context18.next = 26;
          return (0, exports.calculateMtm)({
            data: (0, functions_1.readJsonFile)()
          });
        case 26:
          mtmData = _context18.sent;
          _context18.next = 29;
          return (0, functions_1.delay)({
            milliSeconds: constants_1.DELAY
          });
        case 29:
          istTz = new Date().toLocaleString('default', {
            timeZone: 'Asia/Kolkata'
          });
          data = (0, functions_1.readJsonFile)();
          mtm = data.mtm;
          mtm.push({
            time: istTz,
            value: mtmData.toString()
          });
          _context18.next = 35;
          return (0, functions_1.delay)({
            milliSeconds: constants_1.DELAY
          });
        case 35:
          _context18.next = 37;
          return (0, functions_1.writeJsonFile)(data);
        case 37:
          _context18.next = 39;
          return (0, functions_1.delay)({
            milliSeconds: constants_1.DELAY
          });
        case 39:
          _context18.next = 41;
          return (0, exports.getPositionsJson)();
        case 41:
          closingTime = {
            hours: 15,
            minutes: 15
          };
          if (!(mtmData < -constants_1.MTMDATATHRESHOLD || (0, functions_1.isCurrentTimeGreater)(closingTime))) {
            _context18.next = 48;
            break;
          }
          _context18.next = 45;
          return (0, exports.closeTrade)();
        case 45:
          return _context18.abrupt("return", '${ALGO}: Trade Closed');
        case 48:
          return _context18.abrupt("return", mtmData);
        case 49:
        case "end":
          return _context18.stop();
      }
    }, _callee18);
  }));
};
exports.executeTrade = executeTrade;
var isTradeAllowed = function isTradeAllowed(data) {
  return !(0, functions_1.isMarketClosed)() && (0, functions_1.isCurrentTimeGreater)({
    hours: 9,
    minutes: 45
  }) && !data.isTradeClosed;
};
var checkMarketConditionsAndExecuteTrade = function checkMarketConditionsAndExecuteTrade() {
  return __awaiter(void 0, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee19() {
    var data;
    return _regeneratorRuntime().wrap(function _callee19$(_context19) {
      while (1) switch (_context19.prev = _context19.next) {
        case 0:
          _context19.next = 2;
          return (0, functions_1.createJsonFile)();
        case 2:
          data = _context19.sent;
          if (!isTradeAllowed(data)) {
            _context19.next = 15;
            break;
          }
          _context19.prev = 4;
          _context19.next = 7;
          return (0, exports.executeTrade)();
        case 7:
          return _context19.abrupt("return", _context19.sent);
        case 10:
          _context19.prev = 10;
          _context19.t0 = _context19["catch"](4);
          return _context19.abrupt("return", _context19.t0);
        case 13:
          _context19.next = 16;
          break;
        case 15:
          return _context19.abrupt("return", constants_1.MESSAGE_NOT_TAKE_TRADE);
        case 16:
        case "end":
          return _context19.stop();
      }
    }, _callee19, null, [[4, 10]]);
  }));
};
exports.checkMarketConditionsAndExecuteTrade = checkMarketConditionsAndExecuteTrade;
var checkPositionAlreadyExists = function checkPositionAlreadyExists(_ref6) {
  var position = _ref6.position;
  return __awaiter(void 0, void 0, void 0, /*#__PURE__*/_regeneratorRuntime().mark(function _callee20() {
    var data, trades, _iterator4, _step4, trade;
    return _regeneratorRuntime().wrap(function _callee20$(_context20) {
      while (1) switch (_context20.prev = _context20.next) {
        case 0:
          _context20.prev = 0;
          _context20.next = 3;
          return (0, functions_1.delay)({
            milliSeconds: constants_1.DELAY
          });
        case 3:
          _context20.next = 5;
          return (0, functions_1.createJsonFile)();
        case 5:
          data = _context20.sent;
          trades = data.tradeDetails;
          _iterator4 = _createForOfIteratorHelper(trades);
          _context20.prev = 8;
          _iterator4.s();
        case 10:
          if ((_step4 = _iterator4.n()).done) {
            _context20.next = 16;
            break;
          }
          trade = _step4.value;
          if (!(trade.strike === position.strikeprice)) {
            _context20.next = 14;
            break;
          }
          return _context20.abrupt("return", true);
        case 14:
          _context20.next = 10;
          break;
        case 16:
          _context20.next = 21;
          break;
        case 18:
          _context20.prev = 18;
          _context20.t0 = _context20["catch"](8);
          _iterator4.e(_context20.t0);
        case 21:
          _context20.prev = 21;
          _iterator4.f();
          return _context20.finish(21);
        case 24:
          return _context20.abrupt("return", false);
        case 27:
          _context20.prev = 27;
          _context20.t1 = _context20["catch"](0);
          return _context20.abrupt("return", false);
        case 30:
        case "end":
          return _context20.stop();
      }
    }, _callee20, null, [[0, 27], [8, 18, 21, 24]]);
  }));
};
exports.checkPositionAlreadyExists = checkPositionAlreadyExists;