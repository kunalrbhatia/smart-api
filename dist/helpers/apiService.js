"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.shouldCloseTrade = exports.shortStraddle = exports.repeatShortStraddle = exports.getScrip = exports.getPositionsJson = exports.getPositions = exports.getPositionByToken = exports.getMarginDetails = exports.getLtpData = exports.generateSmartSession = exports.fetchData = exports.executeTrade = exports.doOrder = exports.closeTrade = exports.closeParticularTrade = exports.closeAllTrades = exports.checkToRepeatShortStraddle = exports.checkPositionToClose = exports.checkPositionAlreadyExists = exports.checkMarketConditionsAndExecuteTrade = exports.calculateMtm = exports.areAllTradesClosed = void 0;
var _lodash = require("lodash");
var _functions = require("./functions");
var _constants = require("./constants");
var _dataStore = _interopRequireDefault(require("../store/dataStore"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return { value: void 0, done: !0 }; } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable || "" === iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } throw new TypeError(_typeof(iterable) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
var _require = require('smartapi-javascript'),
  SmartAPI = _require.SmartAPI;
var axios = require('axios');
var totp = require('totp-generator');
var getLtpData = /*#__PURE__*/function () {
  var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(_ref) {
    var exchange, tradingsymbol, symboltoken, smartApiData, jwtToken, data, cred, config, response;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          exchange = _ref.exchange, tradingsymbol = _ref.tradingsymbol, symboltoken = _ref.symboltoken;
          _context.next = 3;
          return generateSmartSession();
        case 3:
          smartApiData = _context.sent;
          jwtToken = (0, _lodash.get)(smartApiData, 'jwtToken');
          data = JSON.stringify({
            exchange: exchange,
            tradingsymbol: tradingsymbol,
            symboltoken: symboltoken
          });
          cred = _dataStore["default"].getInstance().getPostData();
          config = {
            method: 'post',
            url: _constants.GET_LTP_DATA_API,
            headers: {
              Authorization: "Bearer ".concat(jwtToken),
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'X-UserType': 'USER',
              'X-SourceID': 'WEB',
              'X-ClientLocalIP': 'CLIENT_LOCAL_IP',
              'X-ClientPublicIP': 'CLIENT_PUBLIC_IP',
              'X-MACAddress': 'MAC_ADDRESS',
              'X-PrivateKey': cred.APIKEY
            },
            data: data
          };
          _context.prev = 8;
          _context.next = 11;
          return axios(config);
        case 11:
          response = _context.sent;
          return _context.abrupt("return", (0, _lodash.get)(response, 'data.data', {}) || {});
        case 15:
          _context.prev = 15;
          _context.t0 = _context["catch"](8);
          throw _context.t0;
        case 18:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[8, 15]]);
  }));
  return function getLtpData(_x) {
    return _ref2.apply(this, arguments);
  };
}();
exports.getLtpData = getLtpData;
var generateSmartSession = /*#__PURE__*/function () {
  var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
    var cred, smart_api, TOTP;
    return _regeneratorRuntime().wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          cred = _dataStore["default"].getInstance().getPostData();
          smart_api = new SmartAPI({
            api_key: cred.APIKEY
          });
          TOTP = totp(cred.CLIENT_TOTP_PIN);
          return _context3.abrupt("return", smart_api.generateSession(cred.CLIENT_CODE, cred.CLIENT_PIN, TOTP).then( /*#__PURE__*/function () {
            var _ref4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(response) {
              return _regeneratorRuntime().wrap(function _callee2$(_context2) {
                while (1) switch (_context2.prev = _context2.next) {
                  case 0:
                    return _context2.abrupt("return", (0, _lodash.get)(response, 'data'));
                  case 1:
                  case "end":
                    return _context2.stop();
                }
              }, _callee2);
            }));
            return function (_x2) {
              return _ref4.apply(this, arguments);
            };
          }())["catch"](function (ex) {
            throw ex;
          }));
        case 4:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }));
  return function generateSmartSession() {
    return _ref3.apply(this, arguments);
  };
}();
exports.generateSmartSession = generateSmartSession;
var fetchData = /*#__PURE__*/function () {
  var _ref5 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee4() {
    return _regeneratorRuntime().wrap(function _callee4$(_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          _context4.next = 2;
          return axios.get(_constants.SCRIPMASTER).then(function (response) {
            var acData = (0, _lodash.get)(response, 'data', []) || [];
            var scripMaster = acData.map(function (element, index) {
              return _objectSpread(_objectSpread({}, element), {}, {
                label: (0, _lodash.get)(element, 'name', 'NONAME') || 'NONAME',
                key: '0' + index + (0, _lodash.get)(element, 'token', '00') || '00'
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
  return function fetchData() {
    return _ref5.apply(this, arguments);
  };
}();
exports.fetchData = fetchData;
var getScrip = /*#__PURE__*/function () {
  var _ref7 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee5(_ref6) {
    var scriptName, strikePrice, optionType, expiryDate, scripMaster, scrips, errorMessage;
    return _regeneratorRuntime().wrap(function _callee5$(_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          scriptName = _ref6.scriptName, strikePrice = _ref6.strikePrice, optionType = _ref6.optionType, expiryDate = _ref6.expiryDate;
          _context5.next = 3;
          return fetchData();
        case 3:
          scripMaster = _context5.sent;
          if (!(scriptName && (0, _lodash.isArray)(scripMaster) && scripMaster.length > 0)) {
            _context5.next = 11;
            break;
          }
          scrips = scripMaster.filter(function (scrip) {
            var _scripName = (0, _lodash.get)(scrip, 'name', '') || '';
            var _symbol = (0, _lodash.get)(scrip, 'symbol', '') || '';
            var _expiry = (0, _lodash.get)(scrip, 'expiry', '') || '';
            return (_scripName.includes(scriptName) || _scripName === scriptName) && (0, _lodash.get)(scrip, 'exch_seg') === 'NFO' && (0, _lodash.get)(scrip, 'instrumenttype') === 'OPTIDX' && (strikePrice === undefined || _symbol.includes(strikePrice)) && (optionType === undefined || _symbol.includes(optionType)) && _expiry === expiryDate;
          });
          scrips.sort(function (curr, next) {
            return (0, _lodash.get)(curr, 'token', 0) - (0, _lodash.get)(next, 'token', 0);
          });
          scrips = scrips.map(function (element, index) {
            return _objectSpread(_objectSpread({}, element), {}, {
              label: (0, _lodash.get)(element, 'name', 'NoName') || 'NoName',
              key: index
            });
          });
          return _context5.abrupt("return", scrips);
        case 11:
          errorMessage = "".concat(_constants.ALGO, ": getScrip failed");
          throw errorMessage;
        case 13:
        case "end":
          return _context5.stop();
      }
    }, _callee5);
  }));
  return function getScrip(_x3) {
    return _ref7.apply(this, arguments);
  };
}();
exports.getScrip = getScrip;
var getPositions = /*#__PURE__*/function () {
  var _ref8 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee6() {
    var smartApiData, jwtToken, cred, config;
    return _regeneratorRuntime().wrap(function _callee6$(_context6) {
      while (1) switch (_context6.prev = _context6.next) {
        case 0:
          _context6.next = 2;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 2:
          _context6.next = 4;
          return generateSmartSession();
        case 4:
          smartApiData = _context6.sent;
          jwtToken = (0, _lodash.get)(smartApiData, 'jwtToken');
          cred = _dataStore["default"].getInstance().getPostData();
          config = {
            method: 'get',
            url: _constants.GET_POSITIONS,
            headers: {
              Authorization: "Bearer ".concat(jwtToken),
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'X-UserType': 'USER',
              'X-SourceID': 'WEB',
              'X-ClientLocalIP': 'CLIENT_LOCAL_IP',
              'X-ClientPublicIP': 'CLIENT_PUBLIC_IP',
              'X-MACAddress': 'MAC_ADDRESS',
              'X-PrivateKey': cred.APIKEY
            },
            data: ''
          };
          return _context6.abrupt("return", axios(config).then(function (response) {
            return (0, _lodash.get)(response, 'data');
          })["catch"](function (error) {
            var errorMessage = "".concat(_constants.ALGO, ": getPositions failed error below");
            throw error;
          }));
        case 9:
        case "end":
          return _context6.stop();
      }
    }, _callee6);
  }));
  return function getPositions() {
    return _ref8.apply(this, arguments);
  };
}();
exports.getPositions = getPositions;
var doOrder = /*#__PURE__*/function () {
  var _ref10 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee7(_ref9) {
    var tradingsymbol, transactionType, symboltoken, smartApiData, jwtToken, data, cred, config;
    return _regeneratorRuntime().wrap(function _callee7$(_context7) {
      while (1) switch (_context7.prev = _context7.next) {
        case 0:
          tradingsymbol = _ref9.tradingsymbol, transactionType = _ref9.transactionType, symboltoken = _ref9.symboltoken;
          _context7.next = 3;
          return generateSmartSession();
        case 3:
          smartApiData = _context7.sent;
          jwtToken = (0, _lodash.get)(smartApiData, 'jwtToken');
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
          cred = _dataStore["default"].getInstance().getPostData();
          config = {
            method: 'post',
            url: _constants.ORDER_API,
            headers: {
              Authorization: "Bearer ".concat(jwtToken),
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'X-UserType': 'USER',
              'X-SourceID': 'WEB',
              'X-ClientLocalIP': 'CLIENT_LOCAL_IP',
              'X-ClientPublicIP': 'CLIENT_PUBLIC_IP',
              'X-MACAddress': 'MAC_ADDRESS',
              'X-PrivateKey': cred.APIKEY
            },
            data: data
          };
          return _context7.abrupt("return", axios(config).then(function (response) {
            return (0, _lodash.get)(response, 'data');
          })["catch"](function (error) {
            var errorMessage = "".concat(_constants.ALGO, ": doOrder failed error below");
            throw error;
          }));
        case 9:
        case "end":
          return _context7.stop();
      }
    }, _callee7);
  }));
  return function doOrder(_x4) {
    return _ref10.apply(this, arguments);
  };
}();
exports.doOrder = doOrder;
var calculateMtm = /*#__PURE__*/function () {
  var _ref12 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee8(_ref11) {
    var data, currentPositions, currentPositionsData, mtm;
    return _regeneratorRuntime().wrap(function _callee8$(_context8) {
      while (1) switch (_context8.prev = _context8.next) {
        case 0:
          data = _ref11.data;
          _context8.next = 3;
          return getPositions();
        case 3:
          currentPositions = _context8.sent;
          currentPositionsData = (0, _lodash.get)(currentPositions, 'data');
          mtm = 0;
          currentPositionsData.forEach(function (value) {
            data.tradeDetails.forEach(function (trade) {
              if (trade && trade.token === (0, _lodash.get)(value, 'symboltoken', '') && trade.isAlgoCreatedPosition === true) {
                mtm += parseInt((0, _lodash.get)(value, 'unrealised', ''));
              }
            });
          });
          return _context8.abrupt("return", mtm);
        case 8:
        case "end":
          return _context8.stop();
      }
    }, _callee8);
  }));
  return function calculateMtm(_x5) {
    return _ref12.apply(this, arguments);
  };
}();
exports.calculateMtm = calculateMtm;
var shortStraddle = /*#__PURE__*/function () {
  var _ref13 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee9() {
    var atmStrike, expiryDate, ceToken, peToken, ceOrderData, peOrderData, errorMessage;
    return _regeneratorRuntime().wrap(function _callee9$(_context9) {
      while (1) switch (_context9.prev = _context9.next) {
        case 0:
          _context9.prev = 0;
          _context9.next = 3;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 3:
          _context9.next = 5;
          return (0, _functions.getAtmStrikePrice)();
        case 5:
          atmStrike = _context9.sent;
          //GET CURRENT EXPIRY
          expiryDate = (0, _functions.getNextExpiry)(); //GET CALL DATA
          _context9.next = 9;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 9:
          _context9.next = 11;
          return getScrip({
            scriptName: 'BANKNIFTY',
            expiryDate: expiryDate,
            optionType: 'CE',
            strikePrice: atmStrike.toString()
          });
        case 11:
          ceToken = _context9.sent;
          _context9.next = 14;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 14:
          _context9.next = 16;
          return getScrip({
            scriptName: 'BANKNIFTY',
            expiryDate: expiryDate,
            optionType: 'PE',
            strikePrice: atmStrike.toString()
          });
        case 16:
          peToken = _context9.sent;
          _context9.next = 19;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 19:
          _context9.next = 21;
          return doOrder({
            tradingsymbol: (0, _lodash.get)(ceToken, '0.symbol', ''),
            symboltoken: (0, _lodash.get)(ceToken, '0.token', ''),
            transactionType: _constants.TRANSACTION_TYPE_SELL
          });
        case 21:
          ceOrderData = _context9.sent;
          _context9.next = 24;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 24:
          _context9.next = 26;
          return doOrder({
            tradingsymbol: (0, _lodash.get)(peToken, '0.symbol', ''),
            symboltoken: (0, _lodash.get)(peToken, '0.token', ''),
            transactionType: _constants.TRANSACTION_TYPE_SELL
          });
        case 26:
          peOrderData = _context9.sent;
          return _context9.abrupt("return", {
            stikePrice: atmStrike.toString(),
            expiryDate: expiryDate,
            netQty: '-15',
            ceOrderToken: (0, _lodash.get)(ceToken, '0.token', ''),
            peOrderToken: (0, _lodash.get)(peToken, '0.token', ''),
            ceOrderSymbol: (0, _lodash.get)(ceToken, '0.symbol', ''),
            peOrderSymbol: (0, _lodash.get)(peToken, '0.symbol', ''),
            ceOrderStatus: ceOrderData.status,
            peOrderStatus: peOrderData.status
          });
        case 30:
          _context9.prev = 30;
          _context9.t0 = _context9["catch"](0);
          errorMessage = "".concat(_constants.ALGO, ": shortStraddle failed error below");
          throw _context9.t0;
        case 34:
        case "end":
          return _context9.stop();
      }
    }, _callee9, null, [[0, 30]]);
  }));
  return function shortStraddle() {
    return _ref13.apply(this, arguments);
  };
}();
exports.shortStraddle = shortStraddle;
var getMarginDetails = /*#__PURE__*/function () {
  var _ref14 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee10() {
    var smartApiData, jwtToken, cred, config;
    return _regeneratorRuntime().wrap(function _callee10$(_context10) {
      while (1) switch (_context10.prev = _context10.next) {
        case 0:
          _context10.next = 2;
          return generateSmartSession();
        case 2:
          smartApiData = _context10.sent;
          jwtToken = (0, _lodash.get)(smartApiData, 'jwtToken');
          cred = _dataStore["default"].getInstance().getPostData();
          config = {
            method: 'get',
            url: _constants.GET_MARGIN,
            headers: {
              Authorization: "Bearer ".concat(jwtToken),
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'X-UserType': 'USER',
              'X-SourceID': 'WEB',
              'X-ClientLocalIP': 'CLIENT_LOCAL_IP',
              'X-ClientPublicIP': 'CLIENT_PUBLIC_IP',
              'X-MACAddress': 'MAC_ADDRESS',
              'X-PrivateKey': cred.APIKEY
            }
          };
          return _context10.abrupt("return", axios(config).then(function (response) {
            return (0, _lodash.get)(response, 'data');
          })["catch"](function (error) {
            var errorMessage = "".concat(_constants.ALGO, ": getMarginDetails failed error below");
            throw error;
          }));
        case 7:
        case "end":
          return _context10.stop();
      }
    }, _callee10);
  }));
  return function getMarginDetails() {
    return _ref14.apply(this, arguments);
  };
}();
exports.getMarginDetails = getMarginDetails;
var repeatShortStraddle = /*#__PURE__*/function () {
  var _ref15 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee11(difference, atmStrike) {
    var data, shortStraddleData, errorMessage;
    return _regeneratorRuntime().wrap(function _callee11$(_context11) {
      while (1) switch (_context11.prev = _context11.next) {
        case 0:
          _context11.prev = 0;
          data = (0, _functions.readJsonFile)();
          if (!(difference >= _constants.STRIKE_DIFFERENCE && (0, _functions.checkStrike)(data.tradeDetails, atmStrike.toString()) === false)) {
            _context11.next = 10;
            break;
          }
          _context11.next = 5;
          return shortStraddle();
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
          return (0, _functions.writeJsonFile)(data);
        case 10:
          _context11.next = 16;
          break;
        case 12:
          _context11.prev = 12;
          _context11.t0 = _context11["catch"](0);
          errorMessage = "".concat(_constants.ALGO, ": repeatShortStraddle failed error below");
          throw _context11.t0;
        case 16:
        case "end":
          return _context11.stop();
      }
    }, _callee11, null, [[0, 12]]);
  }));
  return function repeatShortStraddle(_x6, _x7) {
    return _ref15.apply(this, arguments);
  };
}();
exports.repeatShortStraddle = repeatShortStraddle;
var getPositionByToken = function getPositionByToken(_ref16) {
  var positions = _ref16.positions,
    token = _ref16.token;
  var _iterator = _createForOfIteratorHelper(positions),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var position = _step.value;
      if (position.symboltoken === token) {
        return position;
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return null;
};
exports.getPositionByToken = getPositionByToken;
var shouldCloseTrade = /*#__PURE__*/function () {
  var _ref18 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee12(_ref17) {
    var ltp, avg, trade, doubledPrice;
    return _regeneratorRuntime().wrap(function _callee12$(_context12) {
      while (1) switch (_context12.prev = _context12.next) {
        case 0:
          ltp = _ref17.ltp, avg = _ref17.avg, trade = _ref17.trade;
          doubledPrice = avg * 2;
          if (!(parseInt(trade.netQty) < 0 && ltp >= doubledPrice)) {
            _context12.next = 12;
            break;
          }
          _context12.prev = 3;
          _context12.next = 6;
          return closeParticularTrade({
            trade: trade
          });
        case 6:
          return _context12.abrupt("return", _context12.sent);
        case 9:
          _context12.prev = 9;
          _context12.t0 = _context12["catch"](3);
          throw _context12.t0;
        case 12:
        case "end":
          return _context12.stop();
      }
    }, _callee12, null, [[3, 9]]);
  }));
  return function shouldCloseTrade(_x8) {
    return _ref18.apply(this, arguments);
  };
}();
exports.shouldCloseTrade = shouldCloseTrade;
var checkPositionToClose = /*#__PURE__*/function () {
  var _ref20 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee13(_ref19) {
    var openPositions, data, tradeDetails, _iterator2, _step2, position, _iterator4, _step4, trade, _iterator3, _step3, _trade, _getPositionByToken, currentLtpPrice, errorMessage;
    return _regeneratorRuntime().wrap(function _callee13$(_context13) {
      while (1) switch (_context13.prev = _context13.next) {
        case 0:
          openPositions = _ref19.openPositions;
          _context13.prev = 1;
          data = (0, _functions.readJsonFile)();
          tradeDetails = data.tradeDetails;
          _iterator2 = _createForOfIteratorHelper(openPositions);
          try {
            for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
              position = _step2.value;
              _iterator4 = _createForOfIteratorHelper(tradeDetails);
              try {
                for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
                  trade = _step4.value;
                  if (trade && trade.token === position.symboltoken) {
                    trade.tradedPrice = parseInt(position.netprice);
                    trade.exchange = position.exchange;
                    trade.tradingSymbol = position.tradingsymbol;
                  }
                }
              } catch (err) {
                _iterator4.e(err);
              } finally {
                _iterator4.f();
              }
            }
          } catch (err) {
            _iterator2.e(err);
          } finally {
            _iterator2.f();
          }
          _context13.next = 8;
          return (0, _functions.writeJsonFile)(data);
        case 8:
          _iterator3 = _createForOfIteratorHelper(tradeDetails);
          _context13.prev = 9;
          _iterator3.s();
        case 11:
          if ((_step3 = _iterator3.n()).done) {
            _context13.next = 19;
            break;
          }
          _trade = _step3.value;
          if (!(_trade && _trade.isAlgoCreatedPosition === true && _trade.exchange === 'NFO' && _trade.tradingSymbol && _trade.tradedPrice)) {
            _context13.next = 17;
            break;
          }
          currentLtpPrice = (_getPositionByToken = getPositionByToken({
            positions: openPositions,
            token: _trade.token
          })) === null || _getPositionByToken === void 0 ? void 0 : _getPositionByToken.ltp;
          _context13.next = 17;
          return shouldCloseTrade({
            ltp: typeof currentLtpPrice === 'string' ? parseInt(currentLtpPrice) : 0,
            avg: _trade.tradedPrice,
            trade: _trade
          });
        case 17:
          _context13.next = 11;
          break;
        case 19:
          _context13.next = 24;
          break;
        case 21:
          _context13.prev = 21;
          _context13.t0 = _context13["catch"](9);
          _iterator3.e(_context13.t0);
        case 24:
          _context13.prev = 24;
          _iterator3.f();
          return _context13.finish(24);
        case 27:
          _context13.next = 33;
          break;
        case 29:
          _context13.prev = 29;
          _context13.t1 = _context13["catch"](1);
          errorMessage = "".concat(_constants.ALGO, ": checkPositionToClose failed error below");
          throw _context13.t1;
        case 33:
        case "end":
          return _context13.stop();
      }
    }, _callee13, null, [[1, 29], [9, 21, 24, 27]]);
  }));
  return function checkPositionToClose(_x9) {
    return _ref20.apply(this, arguments);
  };
}();
exports.checkPositionToClose = checkPositionToClose;
var getPositionsJson = /*#__PURE__*/function () {
  var _ref21 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee14() {
    var currentPositions, positions, openPositions, json, tradeDetails, _iterator5, _step5, position, isTradeExists, trade, errorMessage;
    return _regeneratorRuntime().wrap(function _callee14$(_context14) {
      while (1) switch (_context14.prev = _context14.next) {
        case 0:
          _context14.prev = 0;
          _context14.next = 3;
          return getPositions();
        case 3:
          currentPositions = _context14.sent;
          positions = (0, _lodash.get)(currentPositions, 'data', []) || [];
          openPositions = (0, _functions.getOpenPositions)(positions);
          _context14.next = 8;
          return checkPositionToClose({
            openPositions: openPositions
          });
        case 8:
          _context14.next = 10;
          return (0, _functions.createJsonFile)();
        case 10:
          json = _context14.sent;
          tradeDetails = json.tradeDetails;
          _iterator5 = _createForOfIteratorHelper(openPositions);
          _context14.prev = 13;
          _iterator5.s();
        case 15:
          if ((_step5 = _iterator5.n()).done) {
            _context14.next = 23;
            break;
          }
          position = _step5.value;
          _context14.next = 19;
          return checkPositionAlreadyExists({
            position: position,
            trades: tradeDetails
          });
        case 19:
          isTradeExists = _context14.sent;
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
        case 21:
          _context14.next = 15;
          break;
        case 23:
          _context14.next = 28;
          break;
        case 25:
          _context14.prev = 25;
          _context14.t0 = _context14["catch"](13);
          _iterator5.e(_context14.t0);
        case 28:
          _context14.prev = 28;
          _iterator5.f();
          return _context14.finish(28);
        case 31:
          _context14.next = 33;
          return (0, _functions.writeJsonFile)(json);
        case 33:
          return _context14.abrupt("return", json);
        case 36:
          _context14.prev = 36;
          _context14.t1 = _context14["catch"](0);
          errorMessage = "".concat(_constants.ALGO, ": getPositionsJson failed error below");
          throw _context14.t1;
        case 40:
        case "end":
          return _context14.stop();
      }
    }, _callee14, null, [[0, 36], [13, 25, 28, 31]]);
  }));
  return function getPositionsJson() {
    return _ref21.apply(this, arguments);
  };
}();
exports.getPositionsJson = getPositionsJson;
var closeParticularTrade = /*#__PURE__*/function () {
  var _ref23 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee15(_ref22) {
    var trade, transactionStatus, errorMessage;
    return _regeneratorRuntime().wrap(function _callee15$(_context15) {
      while (1) switch (_context15.prev = _context15.next) {
        case 0:
          trade = _ref22.trade;
          _context15.prev = 1;
          if (!trade.isAlgoCreatedPosition) {
            _context15.next = 10;
            break;
          }
          _context15.next = 5;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 5:
          _context15.next = 7;
          return doOrder({
            tradingsymbol: trade.symbol,
            transactionType: _constants.TRANSACTION_TYPE_BUY,
            symboltoken: trade.token
          });
        case 7:
          transactionStatus = _context15.sent;
          trade.closed = transactionStatus.status;
          return _context15.abrupt("return", transactionStatus.status);
        case 10:
          _context15.next = 16;
          break;
        case 12:
          _context15.prev = 12;
          _context15.t0 = _context15["catch"](1);
          errorMessage = "".concat(_constants.ALGO, ": closeTrade failed error below");
          throw _context15.t0;
        case 16:
        case "end":
          return _context15.stop();
      }
    }, _callee15, null, [[1, 12]]);
  }));
  return function closeParticularTrade(_x10) {
    return _ref23.apply(this, arguments);
  };
}();
exports.closeParticularTrade = closeParticularTrade;
var closeAllTrades = /*#__PURE__*/function () {
  var _ref24 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee16() {
    var data, tradeDetails, _iterator6, _step6, trade, errorMessage;
    return _regeneratorRuntime().wrap(function _callee16$(_context16) {
      while (1) switch (_context16.prev = _context16.next) {
        case 0:
          _context16.prev = 0;
          _context16.next = 3;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 3:
          data = (0, _functions.readJsonFile)();
          _context16.next = 6;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 6:
          tradeDetails = data.tradeDetails;
          if (!Array.isArray(tradeDetails)) {
            _context16.next = 29;
            break;
          }
          _iterator6 = _createForOfIteratorHelper(tradeDetails);
          _context16.prev = 9;
          _iterator6.s();
        case 11:
          if ((_step6 = _iterator6.n()).done) {
            _context16.next = 17;
            break;
          }
          trade = _step6.value;
          _context16.next = 15;
          return closeParticularTrade({
            trade: trade
          });
        case 15:
          _context16.next = 11;
          break;
        case 17:
          _context16.next = 22;
          break;
        case 19:
          _context16.prev = 19;
          _context16.t0 = _context16["catch"](9);
          _iterator6.e(_context16.t0);
        case 22:
          _context16.prev = 22;
          _iterator6.f();
          return _context16.finish(22);
        case 25:
          _context16.next = 27;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 27:
          _context16.next = 29;
          return (0, _functions.writeJsonFile)(data);
        case 29:
          _context16.next = 35;
          break;
        case 31:
          _context16.prev = 31;
          _context16.t1 = _context16["catch"](0);
          errorMessage = "".concat(_constants.ALGO, ": closeAllTrades failed error below");
          throw _context16.t1;
        case 35:
        case "end":
          return _context16.stop();
      }
    }, _callee16, null, [[0, 31], [9, 19, 22, 25]]);
  }));
  return function closeAllTrades() {
    return _ref24.apply(this, arguments);
  };
}();
exports.closeAllTrades = closeAllTrades;
var closeTrade = /*#__PURE__*/function () {
  var _ref25 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee17() {
    var data;
    return _regeneratorRuntime().wrap(function _callee17$(_context17) {
      while (1) switch (_context17.prev = _context17.next) {
        case 0:
          _context17.next = 2;
          return areAllTradesClosed();
        case 2:
          _context17.t0 = _context17.sent;
          if (!(_context17.t0 === false)) {
            _context17.next = 8;
            break;
          }
          _context17.next = 6;
          return closeAllTrades();
        case 6:
          _context17.next = 0;
          break;
        case 8:
          _context17.next = 10;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 10:
          data = (0, _functions.readJsonFile)();
          data.isTradeClosed = true;
          _context17.next = 14;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 14:
          _context17.next = 16;
          return (0, _functions.writeJsonFile)(data);
        case 16:
        case "end":
          return _context17.stop();
      }
    }, _callee17);
  }));
  return function closeTrade() {
    return _ref25.apply(this, arguments);
  };
}();
exports.closeTrade = closeTrade;
var areAllTradesClosed = /*#__PURE__*/function () {
  var _ref26 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee18() {
    var data, tradeDetails, _iterator7, _step7, trade;
    return _regeneratorRuntime().wrap(function _callee18$(_context18) {
      while (1) switch (_context18.prev = _context18.next) {
        case 0:
          _context18.next = 2;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 2:
          data = (0, _functions.readJsonFile)();
          _context18.next = 5;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 5:
          tradeDetails = data.tradeDetails;
          if (!Array.isArray(tradeDetails)) {
            _context18.next = 27;
            break;
          }
          _iterator7 = _createForOfIteratorHelper(tradeDetails);
          _context18.prev = 8;
          _iterator7.s();
        case 10:
          if ((_step7 = _iterator7.n()).done) {
            _context18.next = 16;
            break;
          }
          trade = _step7.value;
          if (!(trade.isAlgoCreatedPosition && trade.closed === false)) {
            _context18.next = 14;
            break;
          }
          return _context18.abrupt("return", false);
        case 14:
          _context18.next = 10;
          break;
        case 16:
          _context18.next = 21;
          break;
        case 18:
          _context18.prev = 18;
          _context18.t0 = _context18["catch"](8);
          _iterator7.e(_context18.t0);
        case 21:
          _context18.prev = 21;
          _iterator7.f();
          return _context18.finish(21);
        case 24:
          return _context18.abrupt("return", true);
        case 27:
          return _context18.abrupt("return", false);
        case 28:
        case "end":
          return _context18.stop();
      }
    }, _callee18, null, [[8, 18, 21, 24]]);
  }));
  return function areAllTradesClosed() {
    return _ref26.apply(this, arguments);
  };
}();
exports.areAllTradesClosed = areAllTradesClosed;
var checkToRepeatShortStraddle = /*#__PURE__*/function () {
  var _ref27 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee19(atmStrike, previousTradeStrikePrice) {
    var difference, _difference;
    return _regeneratorRuntime().wrap(function _callee19$(_context19) {
      while (1) switch (_context19.prev = _context19.next) {
        case 0:
          if (!isFinite(atmStrike)) {
            _context19.next = 19;
            break;
          }
          if (!(atmStrike > previousTradeStrikePrice)) {
            _context19.next = 9;
            break;
          }
          difference = atmStrike - previousTradeStrikePrice;
          _context19.next = 5;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 5:
          _context19.next = 7;
          return repeatShortStraddle(difference, atmStrike);
        case 7:
          _context19.next = 17;
          break;
        case 9:
          if (!(atmStrike < previousTradeStrikePrice)) {
            _context19.next = 17;
            break;
          }
          _difference = previousTradeStrikePrice - atmStrike;
          _context19.next = 13;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 13:
          _context19.next = 15;
          return repeatShortStraddle(_difference, atmStrike);
        case 15:
          _context19.next = 17;
          break;
        case 17:
          _context19.next = 20;
          break;
        case 19:
          throw new Error("Oops, atmStrike is infinity! Stopping operations.");
        case 20:
        case "end":
          return _context19.stop();
      }
    }, _callee19);
  }));
  return function checkToRepeatShortStraddle(_x11, _x12) {
    return _ref27.apply(this, arguments);
  };
}();
exports.checkToRepeatShortStraddle = checkToRepeatShortStraddle;
var executeTrade = /*#__PURE__*/function () {
  var _ref28 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee20() {
    var data, shortStraddleData, atmStrike, no_of_trades, getAlgoTrades, previousTradeStrikePrice, mtmData, istTz, mtm, closingTime;
    return _regeneratorRuntime().wrap(function _callee20$(_context20) {
      while (1) switch (_context20.prev = _context20.next) {
        case 0:
          data = (0, _functions.readJsonFile)();
          if (data.isTradeExecuted) {
            _context20.next = 14;
            break;
          }
          _context20.next = 4;
          return shortStraddle();
        case 4:
          shortStraddleData = _context20.sent;
          if (!(shortStraddleData.ceOrderStatus && shortStraddleData.peOrderStatus)) {
            _context20.next = 12;
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
          _context20.next = 12;
          return (0, _functions.writeJsonFile)(data);
        case 12:
          _context20.next = 23;
          break;
        case 14:
          _context20.next = 16;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 16:
          _context20.next = 18;
          return (0, _functions.getAtmStrikePrice)();
        case 18:
          atmStrike = _context20.sent;
          no_of_trades = data.tradeDetails.length;
          getAlgoTrades = (0, _functions.getOnlyAlgoTradedPositions)();
          previousTradeStrikePrice = getAlgoTrades[getAlgoTrades.length - 1].strike;
          checkToRepeatShortStraddle(atmStrike, parseInt(previousTradeStrikePrice));
        case 23:
          _context20.next = 25;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 25:
          _context20.next = 27;
          return calculateMtm({
            data: (0, _functions.readJsonFile)()
          });
        case 27:
          mtmData = _context20.sent;
          _context20.next = 30;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 30:
          istTz = new Date().toLocaleString('default', {
            timeZone: 'Asia/Kolkata'
          });
          data = (0, _functions.readJsonFile)();
          mtm = data.mtm;
          mtm.push({
            time: istTz,
            value: mtmData.toString()
          });
          _context20.next = 36;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 36:
          _context20.next = 38;
          return (0, _functions.writeJsonFile)(data);
        case 38:
          _context20.next = 40;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 40:
          _context20.next = 42;
          return getPositionsJson();
        case 42:
          closingTime = {
            hours: 15,
            minutes: 15
          };
          if (!(mtmData < -_constants.MTMDATATHRESHOLD || (0, _functions.isCurrentTimeGreater)(closingTime))) {
            _context20.next = 49;
            break;
          }
          _context20.next = 46;
          return closeTrade();
        case 46:
          return _context20.abrupt("return", '${ALGO}: Trade Closed');
        case 49:
          return _context20.abrupt("return", mtmData);
        case 50:
        case "end":
          return _context20.stop();
      }
    }, _callee20);
  }));
  return function executeTrade() {
    return _ref28.apply(this, arguments);
  };
}();
exports.executeTrade = executeTrade;
var isTradeAllowed = /*#__PURE__*/function () {
  var _ref29 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee21(data) {
    var smartSession, isMarketOpen, hasTimePassedToTakeTrade, isTradeOpen, isSmartAPIWorking;
    return _regeneratorRuntime().wrap(function _callee21$(_context21) {
      while (1) switch (_context21.prev = _context21.next) {
        case 0:
          _context21.next = 2;
          return generateSmartSession();
        case 2:
          smartSession = _context21.sent;
          isMarketOpen = !(0, _functions.isMarketClosed)();
          hasTimePassedToTakeTrade = (0, _functions.isCurrentTimeGreater)({
            hours: 9,
            minutes: 45
          });
          isTradeOpen = !data.isTradeClosed;
          isSmartAPIWorking = !(0, _lodash.isEmpty)(smartSession);
          return _context21.abrupt("return", isMarketOpen && hasTimePassedToTakeTrade && isTradeOpen && isSmartAPIWorking);
        case 8:
        case "end":
          return _context21.stop();
      }
    }, _callee21);
  }));
  return function isTradeAllowed(_x13) {
    return _ref29.apply(this, arguments);
  };
}();
var checkMarketConditionsAndExecuteTrade = /*#__PURE__*/function () {
  var _ref30 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee22() {
    var data;
    return _regeneratorRuntime().wrap(function _callee22$(_context22) {
      while (1) switch (_context22.prev = _context22.next) {
        case 0:
          _context22.next = 2;
          return (0, _functions.createJsonFile)();
        case 2:
          data = _context22.sent;
          _context22.next = 5;
          return isTradeAllowed(data);
        case 5:
          if (!_context22.sent) {
            _context22.next = 17;
            break;
          }
          _context22.prev = 6;
          _context22.next = 9;
          return executeTrade();
        case 9:
          return _context22.abrupt("return", _context22.sent);
        case 12:
          _context22.prev = 12;
          _context22.t0 = _context22["catch"](6);
          return _context22.abrupt("return", _context22.t0);
        case 15:
          _context22.next = 18;
          break;
        case 17:
          return _context22.abrupt("return", _constants.MESSAGE_NOT_TAKE_TRADE);
        case 18:
        case "end":
          return _context22.stop();
      }
    }, _callee22, null, [[6, 12]]);
  }));
  return function checkMarketConditionsAndExecuteTrade() {
    return _ref30.apply(this, arguments);
  };
}();
exports.checkMarketConditionsAndExecuteTrade = checkMarketConditionsAndExecuteTrade;
var checkPositionAlreadyExists = /*#__PURE__*/function () {
  var _ref32 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee23(_ref31) {
    var position, trades, _iterator8, _step8, trade;
    return _regeneratorRuntime().wrap(function _callee23$(_context23) {
      while (1) switch (_context23.prev = _context23.next) {
        case 0:
          position = _ref31.position, trades = _ref31.trades;
          _iterator8 = _createForOfIteratorHelper(trades);
          _context23.prev = 2;
          _iterator8.s();
        case 4:
          if ((_step8 = _iterator8.n()).done) {
            _context23.next = 10;
            break;
          }
          trade = _step8.value;
          if (!(parseInt(trade.strike) === parseInt(position.strikeprice) && trade.optionType === position.optiontype)) {
            _context23.next = 8;
            break;
          }
          return _context23.abrupt("return", true);
        case 8:
          _context23.next = 4;
          break;
        case 10:
          _context23.next = 15;
          break;
        case 12:
          _context23.prev = 12;
          _context23.t0 = _context23["catch"](2);
          _iterator8.e(_context23.t0);
        case 15:
          _context23.prev = 15;
          _iterator8.f();
          return _context23.finish(15);
        case 18:
          return _context23.abrupt("return", false);
        case 19:
        case "end":
          return _context23.stop();
      }
    }, _callee23, null, [[2, 12, 15, 18]]);
  }));
  return function checkPositionAlreadyExists(_x14) {
    return _ref32.apply(this, arguments);
  };
}();
exports.checkPositionAlreadyExists = checkPositionAlreadyExists;