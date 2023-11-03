"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.shouldCloseTrade = exports.shortStraddle = exports.runRsiAlgo = exports.runOrb = exports.repeatShortStraddle = exports.getScripFut = exports.getScrip = exports.getPositionsJson = exports.getPositions = exports.getPositionByToken = exports.getMarginDetails = exports.getLtpData = exports.getHistoricPrices = exports.getAllFut = exports.generateSmartSession = exports.fetchData = exports.executeTrade = exports.doOrderByStrike = exports.doOrder = exports.closeTrade = exports.closeParticularTrade = exports.closeAllTrades = exports.checkToRepeatShortStraddle = exports.checkPositionToClose = exports.checkPositionAlreadyExists = exports.checkMarketConditionsAndExecuteTrade = exports.checkBoth_CE_PE_Present = exports.calculateMtm = exports.areAllTradesClosed = exports.addShortStraddleData = exports.addOrderData = void 0;
var _lodash = require("lodash");
var _app = require("firebase/app");
var _database = require("firebase/database");
var _functions = require("./functions");
var _app2 = require("../app.interface");
var _constants = require("./constants");
var _dataStore = _interopRequireDefault(require("../store/dataStore"));
var _smartSession = _interopRequireDefault(require("../store/smartSession"));
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
var tulind = require('tulind');
var firebaseConfig = {
  apiKey: 'AIzaSyA7kZaNsFKIg2gi176ECFCBFqMiHVYLSzQ',
  authDomain: 'smart-api-840b7.firebaseapp.com',
  databaseURL: 'https://smart-api-840b7-default-rtdb.firebaseio.com',
  projectId: 'smart-api-840b7',
  storageBucket: 'smart-api-840b7.appspot.com',
  messagingSenderId: '858775846844',
  appId: '1:858775846844:web:a4504edfcf5108135175b9',
  measurementId: 'G-6EJTK80RSE'
};
var firebase_app = (0, _app.initializeApp)(firebaseConfig);
var database = (0, _database.getDatabase)(firebase_app);
var getLtpData = /*#__PURE__*/function () {
  var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(_ref) {
    var exchange, tradingsymbol, symboltoken, smartInstance, smartApiData, jwtToken, data, cred, config, response;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          exchange = _ref.exchange, tradingsymbol = _ref.tradingsymbol, symboltoken = _ref.symboltoken;
          smartInstance = _smartSession["default"].getInstance();
          _context.next = 4;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 4:
          smartApiData = smartInstance.getPostData();
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
          _context.prev = 9;
          _context.next = 12;
          return axios(config);
        case 12:
          response = _context.sent;
          return _context.abrupt("return", (0, _lodash.get)(response, 'data.data', {}) || {});
        case 16:
          _context.prev = 16;
          _context.t0 = _context["catch"](9);
          throw _context.t0;
        case 19:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[9, 16]]);
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
var getAllFut = /*#__PURE__*/function () {
  var _ref6 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee5() {
    var scripMaster, _expiry, filteredScrips;
    return _regeneratorRuntime().wrap(function _callee5$(_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          _context5.next = 2;
          return fetchData();
        case 2:
          scripMaster = _context5.sent;
          if (!((0, _lodash.isArray)(scripMaster) && scripMaster.length > 0)) {
            _context5.next = 13;
            break;
          }
          _expiry = (0, _functions.getLastThursdayOfCurrentMonth)();
          filteredScrips = scripMaster.filter(function (scrip) {
            return (0, _lodash.get)(scrip, 'exch_seg') === 'NFO' && (0, _lodash.get)(scrip, 'instrumenttype') === 'FUTSTK' && parseInt((0, _lodash.get)(scrip, 'lotsize')) < 51 && (0, _lodash.get)(scrip, 'expiry') === _expiry;
          });
          if (!(filteredScrips.length > 0)) {
            _context5.next = 10;
            break;
          }
          return _context5.abrupt("return", filteredScrips);
        case 10:
          throw new Error('some error occurred');
        case 11:
          _context5.next = 14;
          break;
        case 13:
          throw new Error('some error occurred');
        case 14:
        case "end":
          return _context5.stop();
      }
    }, _callee5);
  }));
  return function getAllFut() {
    return _ref6.apply(this, arguments);
  };
}();
exports.getAllFut = getAllFut;
var getScripFut = /*#__PURE__*/function () {
  var _ref8 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee6(_ref7) {
    var scriptName, scripMaster, filteredScrip;
    return _regeneratorRuntime().wrap(function _callee6$(_context6) {
      while (1) switch (_context6.prev = _context6.next) {
        case 0:
          scriptName = _ref7.scriptName;
          _context6.next = 3;
          return fetchData();
        case 3:
          scripMaster = _context6.sent;
          if (!(scriptName && (0, _lodash.isArray)(scripMaster) && scripMaster.length > 0)) {
            _context6.next = 13;
            break;
          }
          filteredScrip = scripMaster.filter(function (scrip) {
            var _scripName = (0, _lodash.get)(scrip, 'name', '') || '';
            var _expiry = (0, _functions.getLastThursdayOfCurrentMonth)();
            return (_scripName.includes(scriptName) || _scripName === scriptName) && (0, _lodash.get)(scrip, 'exch_seg') === 'NFO' && ((0, _lodash.get)(scrip, 'instrumenttype') === 'FUTSTK' || (0, _lodash.get)(scrip, 'instrumenttype') === 'FUTIDX') && (0, _lodash.get)(scrip, 'expiry') === _expiry;
          });
          if (!(filteredScrip.length === 1)) {
            _context6.next = 10;
            break;
          }
          return _context6.abrupt("return", filteredScrip[0]);
        case 10:
          throw new Error('scrip not found');
        case 11:
          _context6.next = 14;
          break;
        case 13:
          throw new Error('scrip not found');
        case 14:
        case "end":
          return _context6.stop();
      }
    }, _callee6);
  }));
  return function getScripFut(_x3) {
    return _ref8.apply(this, arguments);
  };
}();
exports.getScripFut = getScripFut;
var getScrip = /*#__PURE__*/function () {
  var _ref10 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee7(_ref9) {
    var scriptName, strikePrice, optionType, expiryDate, scripMaster, scrips, errorMessage;
    return _regeneratorRuntime().wrap(function _callee7$(_context7) {
      while (1) switch (_context7.prev = _context7.next) {
        case 0:
          scriptName = _ref9.scriptName, strikePrice = _ref9.strikePrice, optionType = _ref9.optionType, expiryDate = _ref9.expiryDate;
          _context7.next = 3;
          return fetchData();
        case 3:
          scripMaster = _context7.sent;
          if (!(scriptName && (0, _lodash.isArray)(scripMaster) && scripMaster.length > 0)) {
            _context7.next = 11;
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
            return {
              exch_seg: (0, _lodash.get)(element, 'exch_seg', '') || '',
              expiry: (0, _lodash.get)(element, 'expiry', '') || '',
              instrumenttype: (0, _lodash.get)(element, 'instrumenttype', '') || '',
              lotsize: (0, _lodash.get)(element, 'lotsize', '') || '',
              name: (0, _lodash.get)(element, 'name', '') || '',
              strike: (0, _lodash.get)(element, 'strike', '') || '',
              symbol: (0, _lodash.get)(element, 'symbol', '') || '',
              tick_size: (0, _lodash.get)(element, 'tick_size', '') || '',
              token: (0, _lodash.get)(element, 'token', '') || '',
              label: (0, _lodash.get)(element, 'name', 'NoName') || 'NoName',
              key: index.toString()
            };
          });
          return _context7.abrupt("return", scrips);
        case 11:
          errorMessage = "".concat(_constants.ALGO, ": getScrip failed");
          throw errorMessage;
        case 13:
        case "end":
          return _context7.stop();
      }
    }, _callee7);
  }));
  return function getScrip(_x4) {
    return _ref10.apply(this, arguments);
  };
}();
exports.getScrip = getScrip;
var getPositions = /*#__PURE__*/function () {
  var _ref11 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee8() {
    var smartInstance, smartApiData, jwtToken, cred, config;
    return _regeneratorRuntime().wrap(function _callee8$(_context8) {
      while (1) switch (_context8.prev = _context8.next) {
        case 0:
          _context8.next = 2;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 2:
          smartInstance = _smartSession["default"].getInstance();
          _context8.next = 5;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 5:
          smartApiData = smartInstance.getPostData();
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
          return _context8.abrupt("return", axios(config).then(function (response) {
            return (0, _lodash.get)(response, 'data');
          })["catch"](function (error) {
            var errorMessage = "".concat(_constants.ALGO, ": getPositions failed error below");
            throw error;
          }));
        case 10:
        case "end":
          return _context8.stop();
      }
    }, _callee8);
  }));
  return function getPositions() {
    return _ref11.apply(this, arguments);
  };
}();
exports.getPositions = getPositions;
var getHistoricPrices = /*#__PURE__*/function () {
  var _ref12 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee9(data) {
    var smartInstance, smartApiData, jwtToken, cred, payload, config;
    return _regeneratorRuntime().wrap(function _callee9$(_context9) {
      while (1) switch (_context9.prev = _context9.next) {
        case 0:
          smartInstance = _smartSession["default"].getInstance();
          _context9.next = 3;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 3:
          smartApiData = smartInstance.getPostData();
          jwtToken = (0, _lodash.get)(smartApiData, 'jwtToken');
          cred = _dataStore["default"].getInstance().getPostData();
          payload = JSON.stringify({
            exchange: data.exchange,
            symboltoken: data.symboltoken,
            interval: data.interval,
            fromdate: data.fromdate,
            todate: data.todate
          });
          config = {
            method: 'post',
            url: _constants.HISTORIC_API,
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
            data: payload
          };
          _context9.next = 10;
          return axios(config).then(function (response) {
            return (0, _lodash.get)(response, 'data.data');
          })["catch"](function (error) {
            return error;
          });
        case 10:
          return _context9.abrupt("return", _context9.sent);
        case 11:
        case "end":
          return _context9.stop();
      }
    }, _callee9);
  }));
  return function getHistoricPrices(_x5) {
    return _ref12.apply(this, arguments);
  };
}();
exports.getHistoricPrices = getHistoricPrices;
var doOrder = /*#__PURE__*/function () {
  var _ref14 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee10(_ref13) {
    var tradingsymbol, transactionType, symboltoken, _ref13$productType, productType, smartInstance, smartApiData, jwtToken, data, cred, config;
    return _regeneratorRuntime().wrap(function _callee10$(_context10) {
      while (1) switch (_context10.prev = _context10.next) {
        case 0:
          tradingsymbol = _ref13.tradingsymbol, transactionType = _ref13.transactionType, symboltoken = _ref13.symboltoken, _ref13$productType = _ref13.productType, productType = _ref13$productType === void 0 ? 'CARRYFORWARD' : _ref13$productType;
          smartInstance = _smartSession["default"].getInstance();
          _context10.next = 4;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 4:
          smartApiData = smartInstance.getPostData();
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
            producttype: productType,
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
          return _context10.abrupt("return", axios(config).then(function (response) {
            return (0, _lodash.get)(response, 'data');
          })["catch"](function (error) {
            var errorMessage = "".concat(_constants.ALGO, ": doOrder failed error below");
            throw error;
          }));
        case 10:
        case "end":
          return _context10.stop();
      }
    }, _callee10);
  }));
  return function doOrder(_x6) {
    return _ref14.apply(this, arguments);
  };
}();
exports.doOrder = doOrder;
var calculateMtm = /*#__PURE__*/function () {
  var _ref16 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee11(_ref15) {
    var data, currentPositions, currentPositionsData, mtm;
    return _regeneratorRuntime().wrap(function _callee11$(_context11) {
      while (1) switch (_context11.prev = _context11.next) {
        case 0:
          data = _ref15.data;
          _context11.next = 3;
          return getPositions();
        case 3:
          currentPositions = _context11.sent;
          currentPositionsData = (0, _lodash.get)(currentPositions, 'data');
          mtm = 0;
          currentPositionsData.forEach(function (value) {
            data.tradeDetails.forEach(function (trade) {
              if (trade && trade.token === (0, _lodash.get)(value, 'symboltoken', '')) {
                mtm += parseInt((0, _lodash.get)(value, 'unrealised', ''));
              }
            });
          });
          return _context11.abrupt("return", mtm);
        case 8:
        case "end":
          return _context11.stop();
      }
    }, _callee11);
  }));
  return function calculateMtm(_x7) {
    return _ref16.apply(this, arguments);
  };
}();
exports.calculateMtm = calculateMtm;
var doOrderByStrike = /*#__PURE__*/function () {
  var _ref17 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee12(tradeType, strike, optionType) {
    var expiryDate, token, orderData, errorMessage;
    return _regeneratorRuntime().wrap(function _callee12$(_context12) {
      while (1) switch (_context12.prev = _context12.next) {
        case 0:
          _context12.prev = 0;
          expiryDate = tradeType === _app2.TradeType.INTRADAY ? (0, _functions.getNextExpiry)() : (0, _functions.getLastThursdayOfCurrentMonth)();
          _context12.next = 4;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 4:
          _context12.next = 6;
          return getScrip({
            scriptName: 'BANKNIFTY',
            expiryDate: expiryDate,
            optionType: optionType,
            strikePrice: strike.toString()
          });
        case 6:
          token = _context12.sent;
          _context12.next = 9;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 9:
          _context12.next = 11;
          return doOrder({
            tradingsymbol: (0, _lodash.get)(token, '0.symbol', ''),
            symboltoken: (0, _lodash.get)(token, '0.token', ''),
            transactionType: _constants.TRANSACTION_TYPE_SELL
          });
        case 11:
          orderData = _context12.sent;
          return _context12.abrupt("return", {
            stikePrice: strike.toString(),
            expiryDate: expiryDate,
            netQty: '-15',
            token: (0, _lodash.get)(token, '0.token', ''),
            symbol: (0, _lodash.get)(token, '0.symbol', ''),
            status: orderData.status
          });
        case 15:
          _context12.prev = 15;
          _context12.t0 = _context12["catch"](0);
          errorMessage = "".concat(_constants.ALGO, ": doOrderByStrike failed error below");
          throw _context12.t0;
        case 19:
        case "end":
          return _context12.stop();
      }
    }, _callee12, null, [[0, 15]]);
  }));
  return function doOrderByStrike(_x8, _x9, _x10) {
    return _ref17.apply(this, arguments);
  };
}();
exports.doOrderByStrike = doOrderByStrike;
var shortStraddle = /*#__PURE__*/function () {
  var _ref18 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee13() {
    var tradeType,
      atmStrike,
      ceOrderData,
      peOrderData,
      errorMessage,
      _args13 = arguments;
    return _regeneratorRuntime().wrap(function _callee13$(_context13) {
      while (1) switch (_context13.prev = _context13.next) {
        case 0:
          tradeType = _args13.length > 0 && _args13[0] !== undefined ? _args13[0] : _app2.TradeType.INTRADAY;
          _context13.prev = 1;
          _context13.next = 4;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 4:
          _context13.next = 6;
          return (0, _functions.getAtmStrikePrice)(tradeType);
        case 6:
          atmStrike = _context13.sent;
          _context13.next = 9;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 9:
          _context13.next = 11;
          return doOrderByStrike(tradeType, atmStrike, _app2.OptionType.CE);
        case 11:
          ceOrderData = _context13.sent;
          _context13.next = 14;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 14:
          _context13.next = 16;
          return doOrderByStrike(tradeType, atmStrike, _app2.OptionType.PE);
        case 16:
          peOrderData = _context13.sent;
          return _context13.abrupt("return", {
            stikePrice: atmStrike.toString(),
            expiryDate: ceOrderData.expiryDate,
            netQty: ceOrderData.netQty,
            ceOrderToken: ceOrderData.token,
            peOrderToken: peOrderData.token,
            ceOrderSymbol: ceOrderData.symbol,
            peOrderSymbol: peOrderData.symbol,
            ceOrderStatus: ceOrderData.status,
            peOrderStatus: peOrderData.status
          });
        case 20:
          _context13.prev = 20;
          _context13.t0 = _context13["catch"](1);
          errorMessage = "".concat(_constants.ALGO, ": shortStraddle failed error below");
          throw _context13.t0;
        case 24:
        case "end":
          return _context13.stop();
      }
    }, _callee13, null, [[1, 20]]);
  }));
  return function shortStraddle() {
    return _ref18.apply(this, arguments);
  };
}();
exports.shortStraddle = shortStraddle;
var getMarginDetails = /*#__PURE__*/function () {
  var _ref19 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee14() {
    var smartInstance, smartApiData, jwtToken, cred, config;
    return _regeneratorRuntime().wrap(function _callee14$(_context14) {
      while (1) switch (_context14.prev = _context14.next) {
        case 0:
          smartInstance = _smartSession["default"].getInstance();
          _context14.next = 3;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 3:
          smartApiData = smartInstance.getPostData();
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
          return _context14.abrupt("return", axios(config).then(function (response) {
            return (0, _lodash.get)(response, 'data');
          })["catch"](function (error) {
            var errorMessage = "".concat(_constants.ALGO, ": getMarginDetails failed error below");
            throw error;
          }));
        case 8:
        case "end":
          return _context14.stop();
      }
    }, _callee14);
  }));
  return function getMarginDetails() {
    return _ref19.apply(this, arguments);
  };
}();
exports.getMarginDetails = getMarginDetails;
var checkBoth_CE_PE_Present = function checkBoth_CE_PE_Present(data) {
  if (data.ce && data.pe) return _app2.CheckOptionType.BOTH_CE_PE_PRESENT;else if (!data.ce && !data.pe) return _app2.CheckOptionType.BOTH_CE_PE_NOT_PRESENT;else if (!data.ce && data.pe) return _app2.CheckOptionType.ONLY_PE_PRESENT;else return _app2.CheckOptionType.ONLY_CE_PRESENT;
};
exports.checkBoth_CE_PE_Present = checkBoth_CE_PE_Present;
var repeatShortStraddle = /*#__PURE__*/function () {
  var _ref20 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee15(difference, atmStrike, tradeType) {
    var data, strikeDiff, result, cepe_present, shortStraddleData, orderData, _orderData, errorMessage;
    return _regeneratorRuntime().wrap(function _callee15$(_context15) {
      while (1) switch (_context15.prev = _context15.next) {
        case 0:
          _context15.prev = 0;
          data = (0, _functions.readJsonFile)(tradeType);
          strikeDiff = tradeType === _app2.TradeType.INTRADAY ? _constants.STRIKE_DIFFERENCE : _constants.STRIKE_DIFFERENCE_POSITIONAL;
          result = (0, _functions.areBothOptionTypesPresentForStrike)(data.tradeDetails, atmStrike.toString());
          cepe_present = checkBoth_CE_PE_Present(result);
          if (!(difference >= strikeDiff && (!result.ce || !result.pe))) {
            _context15.next = 26;
            break;
          }
          if (!(cepe_present === _app2.CheckOptionType.BOTH_CE_PE_NOT_PRESENT)) {
            _context15.next = 14;
            break;
          }
          _context15.next = 9;
          return shortStraddle(tradeType);
        case 9:
          shortStraddleData = _context15.sent;
          _context15.next = 12;
          return addShortStraddleData({
            data: data,
            shortStraddleData: shortStraddleData,
            tradeType: tradeType
          });
        case 12:
          _context15.next = 26;
          break;
        case 14:
          if (!(cepe_present === _app2.CheckOptionType.ONLY_CE_PRESENT)) {
            _context15.next = 21;
            break;
          }
          _context15.next = 17;
          return doOrderByStrike(tradeType, atmStrike, _app2.OptionType.PE);
        case 17:
          orderData = _context15.sent;
          addOrderData(data, orderData, _app2.OptionType.PE, tradeType);
          _context15.next = 26;
          break;
        case 21:
          if (!(cepe_present === _app2.CheckOptionType.ONLY_PE_PRESENT)) {
            _context15.next = 26;
            break;
          }
          _context15.next = 24;
          return doOrderByStrike(tradeType, atmStrike, _app2.OptionType.CE);
        case 24:
          _orderData = _context15.sent;
          addOrderData(data, _orderData, _app2.OptionType.CE, tradeType);
        case 26:
          _context15.next = 32;
          break;
        case 28:
          _context15.prev = 28;
          _context15.t0 = _context15["catch"](0);
          errorMessage = "".concat(_constants.ALGO, ": repeatShortStraddle failed error below");
          throw _context15.t0;
        case 32:
        case "end":
          return _context15.stop();
      }
    }, _callee15, null, [[0, 28]]);
  }));
  return function repeatShortStraddle(_x11, _x12, _x13) {
    return _ref20.apply(this, arguments);
  };
}();
exports.repeatShortStraddle = repeatShortStraddle;
var getPositionByToken = function getPositionByToken(_ref21) {
  var positions = _ref21.positions,
    token = _ref21.token;
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
  var _ref23 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee16(_ref22) {
    var ltp, avg, trade, doubledPrice;
    return _regeneratorRuntime().wrap(function _callee16$(_context16) {
      while (1) switch (_context16.prev = _context16.next) {
        case 0:
          ltp = _ref22.ltp, avg = _ref22.avg, trade = _ref22.trade;
          doubledPrice = avg * 2;
          if (!(parseInt(trade.netQty) < 0 && ltp >= doubledPrice)) {
            _context16.next = 12;
            break;
          }
          _context16.prev = 3;
          _context16.next = 6;
          return closeParticularTrade({
            trade: trade
          });
        case 6:
          return _context16.abrupt("return", _context16.sent);
        case 9:
          _context16.prev = 9;
          _context16.t0 = _context16["catch"](3);
          throw _context16.t0;
        case 12:
        case "end":
          return _context16.stop();
      }
    }, _callee16, null, [[3, 9]]);
  }));
  return function shouldCloseTrade(_x14) {
    return _ref23.apply(this, arguments);
  };
}();
exports.shouldCloseTrade = shouldCloseTrade;
var checkPositionToClose = /*#__PURE__*/function () {
  var _ref25 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee17(_ref24) {
    var openPositions, _ref24$tradeType, tradeType, data, tradeDetails, _iterator2, _step2, position, _iterator4, _step4, trade, _iterator3, _step3, _trade, _getPositionByToken, currentLtpPrice, errorMessage;
    return _regeneratorRuntime().wrap(function _callee17$(_context17) {
      while (1) switch (_context17.prev = _context17.next) {
        case 0:
          openPositions = _ref24.openPositions, _ref24$tradeType = _ref24.tradeType, tradeType = _ref24$tradeType === void 0 ? _app2.TradeType.INTRADAY : _ref24$tradeType;
          _context17.prev = 1;
          data = (0, _functions.readJsonFile)(tradeType);
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
          _context17.next = 8;
          return (0, _functions.writeJsonFile)(data, tradeType);
        case 8:
          _iterator3 = _createForOfIteratorHelper(tradeDetails);
          _context17.prev = 9;
          _iterator3.s();
        case 11:
          if ((_step3 = _iterator3.n()).done) {
            _context17.next = 19;
            break;
          }
          _trade = _step3.value;
          if (!(_trade && _trade.exchange === 'NFO' && _trade.tradingSymbol && _trade.tradedPrice)) {
            _context17.next = 17;
            break;
          }
          currentLtpPrice = (_getPositionByToken = getPositionByToken({
            positions: openPositions,
            token: _trade.token
          })) === null || _getPositionByToken === void 0 ? void 0 : _getPositionByToken.ltp;
          _context17.next = 17;
          return shouldCloseTrade({
            ltp: typeof currentLtpPrice === 'string' ? parseInt(currentLtpPrice) : 0,
            avg: _trade.tradedPrice,
            trade: _trade
          });
        case 17:
          _context17.next = 11;
          break;
        case 19:
          _context17.next = 24;
          break;
        case 21:
          _context17.prev = 21;
          _context17.t0 = _context17["catch"](9);
          _iterator3.e(_context17.t0);
        case 24:
          _context17.prev = 24;
          _iterator3.f();
          return _context17.finish(24);
        case 27:
          _context17.next = 33;
          break;
        case 29:
          _context17.prev = 29;
          _context17.t1 = _context17["catch"](1);
          errorMessage = "".concat(_constants.ALGO, ": checkPositionToClose failed error below");
          throw _context17.t1;
        case 33:
        case "end":
          return _context17.stop();
      }
    }, _callee17, null, [[1, 29], [9, 21, 24, 27]]);
  }));
  return function checkPositionToClose(_x15) {
    return _ref25.apply(this, arguments);
  };
}();
exports.checkPositionToClose = checkPositionToClose;
var getPositionsJson = /*#__PURE__*/function () {
  var _ref26 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee18() {
    var tradeType,
      currentPositions,
      positions,
      openPositions,
      json,
      tradeDetails,
      _iterator5,
      _step5,
      position,
      isTradeExists,
      trade,
      errorMessage,
      _args18 = arguments;
    return _regeneratorRuntime().wrap(function _callee18$(_context18) {
      while (1) switch (_context18.prev = _context18.next) {
        case 0:
          tradeType = _args18.length > 0 && _args18[0] !== undefined ? _args18[0] : _app2.TradeType.INTRADAY;
          _context18.prev = 1;
          _context18.next = 4;
          return getPositions();
        case 4:
          currentPositions = _context18.sent;
          positions = (0, _lodash.get)(currentPositions, 'data', []) || [];
          openPositions = (0, _functions.getOpenPositions)(positions);
          _context18.next = 9;
          return checkPositionToClose({
            openPositions: openPositions,
            tradeType: tradeType
          });
        case 9:
          _context18.next = 11;
          return (0, _functions.createJsonFile)(tradeType);
        case 11:
          json = _context18.sent;
          if ((0, _functions.checkPositionsExistsForMonthlyExpiry)(openPositions)) {
            json.isTradeExecuted = true;
          }
          tradeDetails = json.tradeDetails;
          _iterator5 = _createForOfIteratorHelper(openPositions);
          _context18.prev = 15;
          _iterator5.s();
        case 17:
          if ((_step5 = _iterator5.n()).done) {
            _context18.next = 25;
            break;
          }
          position = _step5.value;
          _context18.next = 21;
          return checkPositionAlreadyExists({
            position: position,
            trades: tradeDetails
          });
        case 21:
          isTradeExists = _context18.sent;
          if (isTradeExists === false) {
            trade = {
              netQty: position.netqty,
              optionType: position.optiontype,
              expireDate: position.expirydate,
              strike: position.strikeprice,
              symbol: position.symbolname,
              token: position.symboltoken,
              closed: false,
              tradedPrice: parseInt(position.netprice),
              exchange: position.exchange,
              tradingSymbol: position.tradingsymbol
            };
            tradeDetails.push(trade);
          }
        case 23:
          _context18.next = 17;
          break;
        case 25:
          _context18.next = 30;
          break;
        case 27:
          _context18.prev = 27;
          _context18.t0 = _context18["catch"](15);
          _iterator5.e(_context18.t0);
        case 30:
          _context18.prev = 30;
          _iterator5.f();
          return _context18.finish(30);
        case 33:
          _context18.next = 35;
          return (0, _functions.writeJsonFile)(json, tradeType);
        case 35:
          return _context18.abrupt("return", json);
        case 38:
          _context18.prev = 38;
          _context18.t1 = _context18["catch"](1);
          errorMessage = "".concat(_constants.ALGO, ": getPositionsJson failed error below");
          throw _context18.t1;
        case 42:
        case "end":
          return _context18.stop();
      }
    }, _callee18, null, [[1, 38], [15, 27, 30, 33]]);
  }));
  return function getPositionsJson() {
    return _ref26.apply(this, arguments);
  };
}();
exports.getPositionsJson = getPositionsJson;
var closeParticularTrade = /*#__PURE__*/function () {
  var _ref28 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee19(_ref27) {
    var trade, transactionStatus, errorMessage;
    return _regeneratorRuntime().wrap(function _callee19$(_context19) {
      while (1) switch (_context19.prev = _context19.next) {
        case 0:
          trade = _ref27.trade;
          _context19.prev = 1;
          _context19.next = 4;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 4:
          _context19.next = 6;
          return doOrder({
            tradingsymbol: trade.tradingSymbol,
            transactionType: _constants.TRANSACTION_TYPE_BUY,
            symboltoken: trade.token
          });
        case 6:
          transactionStatus = _context19.sent;
          trade.closed = transactionStatus.status;
          return _context19.abrupt("return", transactionStatus.status);
        case 11:
          _context19.prev = 11;
          _context19.t0 = _context19["catch"](1);
          errorMessage = "".concat(_constants.ALGO, ": closeTrade failed error below");
          throw _context19.t0;
        case 15:
        case "end":
          return _context19.stop();
      }
    }, _callee19, null, [[1, 11]]);
  }));
  return function closeParticularTrade(_x16) {
    return _ref28.apply(this, arguments);
  };
}();
exports.closeParticularTrade = closeParticularTrade;
var closeAllTrades = /*#__PURE__*/function () {
  var _ref29 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee20() {
    var tradeType,
      data,
      tradeDetails,
      nextExpiry,
      lastThursdayOfMonth,
      _iterator6,
      _step6,
      trade,
      errorMessage,
      _args20 = arguments;
    return _regeneratorRuntime().wrap(function _callee20$(_context20) {
      while (1) switch (_context20.prev = _context20.next) {
        case 0:
          tradeType = _args20.length > 0 && _args20[0] !== undefined ? _args20[0] : _app2.TradeType.INTRADAY;
          _context20.prev = 1;
          _context20.next = 4;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 4:
          data = (0, _functions.readJsonFile)(tradeType);
          _context20.next = 7;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 7:
          tradeDetails = data.tradeDetails;
          if (!Array.isArray(tradeDetails)) {
            _context20.next = 33;
            break;
          }
          nextExpiry = (0, _functions.getNextExpiry)();
          lastThursdayOfMonth = (0, _functions.getLastThursdayOfCurrentMonth)();
          _iterator6 = _createForOfIteratorHelper(tradeDetails);
          _context20.prev = 12;
          _iterator6.s();
        case 14:
          if ((_step6 = _iterator6.n()).done) {
            _context20.next = 21;
            break;
          }
          trade = _step6.value;
          if (!(trade.expireDate === nextExpiry && tradeType === _app2.TradeType.INTRADAY || trade.expireDate === lastThursdayOfMonth && tradeType === _app2.TradeType.POSITIONAL)) {
            _context20.next = 19;
            break;
          }
          _context20.next = 19;
          return closeParticularTrade({
            trade: trade
          });
        case 19:
          _context20.next = 14;
          break;
        case 21:
          _context20.next = 26;
          break;
        case 23:
          _context20.prev = 23;
          _context20.t0 = _context20["catch"](12);
          _iterator6.e(_context20.t0);
        case 26:
          _context20.prev = 26;
          _iterator6.f();
          return _context20.finish(26);
        case 29:
          _context20.next = 31;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 31:
          _context20.next = 33;
          return (0, _functions.writeJsonFile)(data, tradeType);
        case 33:
          _context20.next = 39;
          break;
        case 35:
          _context20.prev = 35;
          _context20.t1 = _context20["catch"](1);
          errorMessage = "".concat(_constants.ALGO, ": closeAllTrades failed error below");
          throw _context20.t1;
        case 39:
        case "end":
          return _context20.stop();
      }
    }, _callee20, null, [[1, 35], [12, 23, 26, 29]]);
  }));
  return function closeAllTrades() {
    return _ref29.apply(this, arguments);
  };
}();
exports.closeAllTrades = closeAllTrades;
var closeTrade = /*#__PURE__*/function () {
  var _ref30 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee21() {
    var tradeType,
      data,
      _args21 = arguments;
    return _regeneratorRuntime().wrap(function _callee21$(_context21) {
      while (1) switch (_context21.prev = _context21.next) {
        case 0:
          tradeType = _args21.length > 0 && _args21[0] !== undefined ? _args21[0] : _app2.TradeType.INTRADAY;
        case 1:
          _context21.next = 3;
          return areAllTradesClosed(tradeType);
        case 3:
          _context21.t0 = _context21.sent;
          if (!(_context21.t0 === false)) {
            _context21.next = 9;
            break;
          }
          _context21.next = 7;
          return closeAllTrades(tradeType);
        case 7:
          _context21.next = 1;
          break;
        case 9:
          _context21.next = 11;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 11:
          data = (0, _functions.readJsonFile)(tradeType);
          data.isTradeClosed = true;
          _context21.next = 15;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 15:
          _context21.next = 17;
          return (0, _functions.writeJsonFile)(data, tradeType);
        case 17:
        case "end":
          return _context21.stop();
      }
    }, _callee21);
  }));
  return function closeTrade() {
    return _ref30.apply(this, arguments);
  };
}();
exports.closeTrade = closeTrade;
var areAllTradesClosed = /*#__PURE__*/function () {
  var _ref31 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee22() {
    var tradeType,
      data,
      tradeDetails,
      _iterator7,
      _step7,
      trade,
      isTradeOpen,
      isExpiryMatch,
      _args22 = arguments;
    return _regeneratorRuntime().wrap(function _callee22$(_context22) {
      while (1) switch (_context22.prev = _context22.next) {
        case 0:
          tradeType = _args22.length > 0 && _args22[0] !== undefined ? _args22[0] : _app2.TradeType.INTRADAY;
          _context22.next = 3;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 3:
          data = (0, _functions.readJsonFile)(tradeType);
          _context22.next = 6;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 6:
          tradeDetails = data.tradeDetails;
          if (!Array.isArray(tradeDetails)) {
            _context22.next = 27;
            break;
          }
          _iterator7 = _createForOfIteratorHelper(tradeDetails);
          _context22.prev = 9;
          _iterator7.s();
        case 11:
          if ((_step7 = _iterator7.n()).done) {
            _context22.next = 19;
            break;
          }
          trade = _step7.value;
          isTradeOpen = !trade.closed;
          isExpiryMatch = tradeType === _app2.TradeType.INTRADAY && trade.expireDate === (0, _functions.getNextExpiry)() || tradeType === _app2.TradeType.POSITIONAL && trade.expireDate === (0, _functions.getLastThursdayOfCurrentMonth)();
          if (!(isTradeOpen && isExpiryMatch)) {
            _context22.next = 17;
            break;
          }
          return _context22.abrupt("return", false);
        case 17:
          _context22.next = 11;
          break;
        case 19:
          _context22.next = 24;
          break;
        case 21:
          _context22.prev = 21;
          _context22.t0 = _context22["catch"](9);
          _iterator7.e(_context22.t0);
        case 24:
          _context22.prev = 24;
          _iterator7.f();
          return _context22.finish(24);
        case 27:
          return _context22.abrupt("return", true);
        case 28:
        case "end":
          return _context22.stop();
      }
    }, _callee22, null, [[9, 21, 24, 27]]);
  }));
  return function areAllTradesClosed() {
    return _ref31.apply(this, arguments);
  };
}();
exports.areAllTradesClosed = areAllTradesClosed;
var checkToRepeatShortStraddle = /*#__PURE__*/function () {
  var _ref32 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee23(atmStrike, previousTradeStrikePrice, tradeType) {
    var difference, _difference;
    return _regeneratorRuntime().wrap(function _callee23$(_context23) {
      while (1) switch (_context23.prev = _context23.next) {
        case 0:
          if (!isFinite(atmStrike)) {
            _context23.next = 19;
            break;
          }
          if (!(atmStrike > previousTradeStrikePrice)) {
            _context23.next = 9;
            break;
          }
          difference = atmStrike - previousTradeStrikePrice;
          _context23.next = 5;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 5:
          _context23.next = 7;
          return repeatShortStraddle(difference, atmStrike, tradeType);
        case 7:
          _context23.next = 17;
          break;
        case 9:
          if (!(atmStrike < previousTradeStrikePrice)) {
            _context23.next = 17;
            break;
          }
          _difference = previousTradeStrikePrice - atmStrike;
          _context23.next = 13;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 13:
          _context23.next = 15;
          return repeatShortStraddle(_difference, atmStrike, tradeType);
        case 15:
          _context23.next = 17;
          break;
        case 17:
          _context23.next = 20;
          break;
        case 19:
          throw new Error("Oops, atmStrike is infinity! Stopping operations.");
        case 20:
        case "end":
          return _context23.stop();
      }
    }, _callee23);
  }));
  return function checkToRepeatShortStraddle(_x17, _x18, _x19) {
    return _ref32.apply(this, arguments);
  };
}();
exports.checkToRepeatShortStraddle = checkToRepeatShortStraddle;
var addOrderData = /*#__PURE__*/function () {
  var _ref33 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee24(data, orderData, optionType, tradeType) {
    return _regeneratorRuntime().wrap(function _callee24$(_context24) {
      while (1) switch (_context24.prev = _context24.next) {
        case 0:
          if (orderData.status) {
            data.tradeDetails.push({
              optionType: optionType,
              netQty: orderData.netQty,
              expireDate: orderData.expiryDate,
              strike: orderData.stikePrice,
              token: orderData.token,
              symbol: orderData.symbol,
              closed: false,
              tradedPrice: 0,
              exchange: '',
              tradingSymbol: ''
            });
          }
          _context24.next = 3;
          return (0, _functions.writeJsonFile)(data, tradeType);
        case 3:
        case "end":
          return _context24.stop();
      }
    }, _callee24);
  }));
  return function addOrderData(_x20, _x21, _x22, _x23) {
    return _ref33.apply(this, arguments);
  };
}();
exports.addOrderData = addOrderData;
var addShortStraddleData = /*#__PURE__*/function () {
  var _ref35 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee25(_ref34) {
    var data, shortStraddleData, _ref34$tradeType, tradeType;
    return _regeneratorRuntime().wrap(function _callee25$(_context25) {
      while (1) switch (_context25.prev = _context25.next) {
        case 0:
          data = _ref34.data, shortStraddleData = _ref34.shortStraddleData, _ref34$tradeType = _ref34.tradeType, tradeType = _ref34$tradeType === void 0 ? _app2.TradeType.INTRADAY : _ref34$tradeType;
          if (!(shortStraddleData.ceOrderStatus && shortStraddleData.peOrderStatus)) {
            _context25.next = 8;
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
            tradedPrice: 0,
            exchange: '',
            tradingSymbol: ''
          });
          data.tradeDetails.push({
            optionType: 'PE',
            netQty: shortStraddleData.netQty,
            expireDate: shortStraddleData.expiryDate,
            strike: shortStraddleData.stikePrice,
            token: shortStraddleData.peOrderToken,
            symbol: shortStraddleData.peOrderSymbol,
            closed: false,
            tradedPrice: 0,
            exchange: '',
            tradingSymbol: ''
          });
          _context25.next = 8;
          return (0, _functions.writeJsonFile)(data, tradeType);
        case 8:
        case "end":
          return _context25.stop();
      }
    }, _callee25);
  }));
  return function addShortStraddleData(_x24) {
    return _ref35.apply(this, arguments);
  };
}();
exports.addShortStraddleData = addShortStraddleData;
var coreTradeExecution = /*#__PURE__*/function () {
  var _ref36 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee26(tradeType) {
    var data, shortStraddleData, atmStrike, no_of_trades, getAlgoTrades, previousTradeStrikePrice, mtmData, istTz, mtm;
    return _regeneratorRuntime().wrap(function _callee26$(_context26) {
      while (1) switch (_context26.prev = _context26.next) {
        case 0:
          _context26.next = 2;
          return (0, _functions.getData)(tradeType);
        case 2:
          data = _context26.sent;
          if (data.isTradeExecuted) {
            _context26.next = 11;
            break;
          }
          _context26.next = 6;
          return shortStraddle(tradeType);
        case 6:
          shortStraddleData = _context26.sent;
          _context26.next = 9;
          return addShortStraddleData({
            data: data,
            shortStraddleData: shortStraddleData,
            tradeType: tradeType
          });
        case 9:
          _context26.next = 21;
          break;
        case 11:
          _context26.next = 13;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 13:
          _context26.next = 15;
          return (0, _functions.getAtmStrikePrice)(tradeType);
        case 15:
          atmStrike = _context26.sent;
          no_of_trades = data.tradeDetails.length;
          getAlgoTrades = data.tradeDetails;
          previousTradeStrikePrice = (0, _functions.getNearestStrike)({
            algoTrades: getAlgoTrades,
            atmStrike: atmStrike
          });
          _context26.next = 21;
          return checkToRepeatShortStraddle(atmStrike, previousTradeStrikePrice, tradeType);
        case 21:
          _context26.next = 23;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 23:
          _context26.next = 25;
          return calculateMtm({
            data: data
          });
        case 25:
          mtmData = _context26.sent;
          _context26.next = 28;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 28:
          istTz = new Date().toLocaleString('default', {
            timeZone: 'Asia/Kolkata'
          });
          mtm = data.mtm;
          mtm.push({
            time: istTz,
            value: mtmData.toString()
          });
          _context26.next = 33;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 33:
          _context26.next = 35;
          return (0, _functions.writeJsonFile)(data, tradeType);
        case 35:
          return _context26.abrupt("return", mtmData);
        case 36:
        case "end":
          return _context26.stop();
      }
    }, _callee26);
  }));
  return function coreTradeExecution(_x25) {
    return _ref36.apply(this, arguments);
  };
}();
var executeTrade = /*#__PURE__*/function () {
  var _ref37 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee27(tradeType) {
    var mtmData, closingTime, mtmThreshold;
    return _regeneratorRuntime().wrap(function _callee27$(_context27) {
      while (1) switch (_context27.prev = _context27.next) {
        case 0:
          _context27.next = 2;
          return coreTradeExecution(tradeType);
        case 2:
          mtmData = _context27.sent;
          _context27.next = 5;
          return (0, _functions.delay)({
            milliSeconds: _constants.DELAY
          });
        case 5:
          _context27.next = 7;
          return getPositionsJson(tradeType);
        case 7:
          closingTime = {
            hours: 15,
            minutes: 15
          };
          mtmThreshold = -_constants.MTMDATATHRESHOLD;
          if (!(tradeType === _app2.TradeType.INTRADAY && (mtmData < mtmThreshold || (0, _functions.isCurrentTimeGreater)(closingTime)))) {
            _context27.next = 15;
            break;
          }
          _context27.next = 12;
          return closeTrade(tradeType);
        case 12:
          return _context27.abrupt("return", '${ALGO}: Trade Closed');
        case 15:
          return _context27.abrupt("return", mtmData);
        case 16:
        case "end":
          return _context27.stop();
      }
    }, _callee27);
  }));
  return function executeTrade(_x26) {
    return _ref37.apply(this, arguments);
  };
}();
exports.executeTrade = executeTrade;
var isTradeAllowed = /*#__PURE__*/function () {
  var _ref38 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee28(data) {
    var isMarketOpen, hasTimePassedToTakeTrade, isTradeOpen, isSmartAPIWorking, smartData;
    return _regeneratorRuntime().wrap(function _callee28$(_context28) {
      while (1) switch (_context28.prev = _context28.next) {
        case 0:
          isMarketOpen = !(0, _functions.isMarketClosed)();
          hasTimePassedToTakeTrade = (0, _functions.isCurrentTimeGreater)({
            hours: 9,
            minutes: 15
          });
          isTradeOpen = !data.isTradeClosed;
          isSmartAPIWorking = false;
          _context28.prev = 4;
          _context28.next = 7;
          return generateSmartSession();
        case 7:
          smartData = _context28.sent;
          isSmartAPIWorking = !(0, _lodash.isEmpty)(smartData);
          if (isSmartAPIWorking) {
            (0, _functions.setSmartSession)(smartData);
          }
          _context28.next = 14;
          break;
        case 12:
          _context28.prev = 12;
          _context28.t0 = _context28["catch"](4);
        case 14:
          return _context28.abrupt("return", isMarketOpen && hasTimePassedToTakeTrade && isTradeOpen && isSmartAPIWorking);
        case 15:
        case "end":
          return _context28.stop();
      }
    }, _callee28, null, [[4, 12]]);
  }));
  return function isTradeAllowed(_x27) {
    return _ref38.apply(this, arguments);
  };
}();
var checkMarketConditionsAndExecuteTrade = /*#__PURE__*/function () {
  var _ref39 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee29(tradeType) {
    var strategy,
      data,
      _args29 = arguments;
    return _regeneratorRuntime().wrap(function _callee29$(_context29) {
      while (1) switch (_context29.prev = _context29.next) {
        case 0:
          strategy = _args29.length > 1 && _args29[1] !== undefined ? _args29[1] : _app2.Strategy.SHORTSTRADDLE;
          _context29.next = 3;
          return (0, _functions.createJsonFile)(tradeType);
        case 3:
          data = _context29.sent;
          _context29.next = 6;
          return isTradeAllowed(data);
        case 6:
          if (!_context29.sent) {
            _context29.next = 25;
            break;
          }
          _context29.prev = 7;
          if (!(strategy === _app2.Strategy.SHORTSTRADDLE)) {
            _context29.next = 14;
            break;
          }
          _context29.next = 11;
          return executeTrade(tradeType);
        case 11:
          return _context29.abrupt("return", _context29.sent);
        case 14:
          if (!(strategy === _app2.Strategy.RSI)) {
            _context29.next = 18;
            break;
          }
          _context29.next = 17;
          return runRsiAlgo();
        case 17:
          return _context29.abrupt("return", _context29.sent);
        case 18:
          _context29.next = 23;
          break;
        case 20:
          _context29.prev = 20;
          _context29.t0 = _context29["catch"](7);
          return _context29.abrupt("return", _context29.t0);
        case 23:
          _context29.next = 26;
          break;
        case 25:
          return _context29.abrupt("return", _constants.MESSAGE_NOT_TAKE_TRADE);
        case 26:
        case "end":
          return _context29.stop();
      }
    }, _callee29, null, [[7, 20]]);
  }));
  return function checkMarketConditionsAndExecuteTrade(_x28) {
    return _ref39.apply(this, arguments);
  };
}();
exports.checkMarketConditionsAndExecuteTrade = checkMarketConditionsAndExecuteTrade;
var checkPositionAlreadyExists = /*#__PURE__*/function () {
  var _ref41 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee30(_ref40) {
    var position, trades, _iterator8, _step8, trade;
    return _regeneratorRuntime().wrap(function _callee30$(_context30) {
      while (1) switch (_context30.prev = _context30.next) {
        case 0:
          position = _ref40.position, trades = _ref40.trades;
          _iterator8 = _createForOfIteratorHelper(trades);
          _context30.prev = 2;
          _iterator8.s();
        case 4:
          if ((_step8 = _iterator8.n()).done) {
            _context30.next = 10;
            break;
          }
          trade = _step8.value;
          if (!(parseInt(trade.strike) === parseInt(position.strikeprice) && trade.optionType === position.optiontype)) {
            _context30.next = 8;
            break;
          }
          return _context30.abrupt("return", true);
        case 8:
          _context30.next = 4;
          break;
        case 10:
          _context30.next = 15;
          break;
        case 12:
          _context30.prev = 12;
          _context30.t0 = _context30["catch"](2);
          _iterator8.e(_context30.t0);
        case 15:
          _context30.prev = 15;
          _iterator8.f();
          return _context30.finish(15);
        case 18:
          return _context30.abrupt("return", false);
        case 19:
        case "end":
          return _context30.stop();
      }
    }, _callee30, null, [[2, 12, 15, 18]]);
  }));
  return function checkPositionAlreadyExists(_x29) {
    return _ref41.apply(this, arguments);
  };
}();
exports.checkPositionAlreadyExists = checkPositionAlreadyExists;
var runOrb = /*#__PURE__*/function () {
  var _ref43 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee31(_ref42) {
    var _get;
    var scriptName, price, maxSl, tradeDirection, trailSl, scrip, positionsResponse, positionsData, mtm, position, scripData, _get2, _position, updatedMaxSl;
    return _regeneratorRuntime().wrap(function _callee31$(_context31) {
      while (1) switch (_context31.prev = _context31.next) {
        case 0:
          scriptName = _ref42.scriptName, price = _ref42.price, maxSl = _ref42.maxSl, tradeDirection = _ref42.tradeDirection, trailSl = _ref42.trailSl;
          _context31.next = 3;
          return getScripFut({
            scriptName: scriptName
          });
        case 3:
          scrip = _context31.sent;
          _context31.next = 6;
          return getPositions();
        case 6:
          positionsResponse = _context31.sent;
          positionsData = (_get = (0, _lodash.get)(positionsResponse, 'data', [])) !== null && _get !== void 0 ? _get : [];
          mtm = 0;
          if (!(Array.isArray(positionsData) && positionsData.length > 0)) {
            _context31.next = 16;
            break;
          }
          position = positionsData.filter(function (position) {
            if ((0, _lodash.get)(position, 'symboltoken') === scrip.token) return position;
          });
          if (position) {
            _context31.next = 16;
            break;
          }
          _context31.next = 14;
          return getLtpData({
            exchange: scrip.exch_seg,
            symboltoken: scrip.token,
            tradingsymbol: scrip.symbol
          });
        case 14:
          scripData = _context31.sent;
          if (tradeDirection === 'up' && scripData.ltp > price) {
            doOrder({
              tradingsymbol: scrip.symbol,
              symboltoken: scrip.token,
              transactionType: _constants.TRANSACTION_TYPE_BUY
            });
          } else if (tradeDirection === 'down' && scripData.ltp < price) {
            doOrder({
              tradingsymbol: scrip.symbol,
              symboltoken: scrip.token,
              transactionType: _constants.TRANSACTION_TYPE_SELL
            });
          }
        case 16:
          if (Array.isArray(positionsData) && positionsData.length > 0) {
            _position = positionsData.filter(function (position) {
              if ((0, _lodash.get)(position, 'symboltoken') === scrip.token) return position;
            });
            mtm = parseInt((_get2 = (0, _lodash.get)(_position, 'unrealised', '0')) !== null && _get2 !== void 0 ? _get2 : '0');
            updatedMaxSl = (0, _functions.updateMaxSl)({
              mtm: mtm,
              maxSl: maxSl,
              trailSl: trailSl
            });
            if (Math.abs(mtm) > updatedMaxSl) {
              if (tradeDirection === 'up') {
                doOrder({
                  tradingsymbol: scrip.symbol,
                  symboltoken: scrip.token,
                  transactionType: _constants.TRANSACTION_TYPE_SELL,
                  productType: 'INTRADAY'
                });
              } else {
                doOrder({
                  tradingsymbol: scrip.symbol,
                  symboltoken: scrip.token,
                  transactionType: _constants.TRANSACTION_TYPE_BUY,
                  productType: 'INTRADAY'
                });
              }
            }
          }
          return _context31.abrupt("return", {
            mtm: mtm
          });
        case 18:
        case "end":
          return _context31.stop();
      }
    }, _callee31);
  }));
  return function runOrb(_x30) {
    return _ref43.apply(this, arguments);
  };
}();
exports.runOrb = runOrb;
var runRsiAlgo = /*#__PURE__*/function () {
  var _ref44 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee34() {
    var scrip, data, historicData, closingPrices;
    return _regeneratorRuntime().wrap(function _callee34$(_context34) {
      while (1) switch (_context34.prev = _context34.next) {
        case 0:
          _context34.next = 2;
          return getScripFut({
            scriptName: 'BANKNIFTY'
          });
        case 2:
          scrip = _context34.sent;
          data = {
            exchange: scrip.exch_seg,
            interval: _app2.HistoryInterval.FIVE_MINUTE,
            symboltoken: scrip.token,
            fromdate: (0, _functions.getCurrentTimeAndPastTime)().pastTime,
            todate: (0, _functions.getCurrentTimeAndPastTime)().currentTime
          };
          _context34.next = 6;
          return (0, _functions.delay)({
            milliSeconds: _constants.SHORT_DELAY
          });
        case 6:
          _context34.next = 8;
          return getHistoricPrices(data);
        case 8:
          historicData = _context34.sent;
          if (!(historicData && (0, _lodash.isArray)(historicData))) {
            _context34.next = 12;
            break;
          }
          closingPrices = historicData.map(function (d) {
            return d[4];
          });
          return _context34.abrupt("return", new Promise( /*#__PURE__*/function () {
            var _ref45 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee33(resolve, reject) {
              return _regeneratorRuntime().wrap(function _callee33$(_context33) {
                while (1) switch (_context33.prev = _context33.next) {
                  case 0:
                    _context33.next = 2;
                    return tulind.indicators.rsi.indicator([closingPrices], [14], /*#__PURE__*/function () {
                      var _ref46 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee32(err, res) {
                        var calculatedRsi, _get3, ltp, ltpPlus500, optScrip, orderDetails, positionsResponse, positionsData, mtm, _get4, position, istTz, json;
                        return _regeneratorRuntime().wrap(function _callee32$(_context32) {
                          while (1) switch (_context32.prev = _context32.next) {
                            case 0:
                              if (err) {
                                reject(err);
                              }
                              calculatedRsi = res[0].slice(-1)[0];
                              if (!(calculatedRsi > 20)) {
                                _context32.next = 25;
                                break;
                              }
                              _context32.next = 5;
                              return getLtpData({
                                exchange: scrip.exch_seg,
                                tradingsymbol: scrip.symbol,
                                symboltoken: scrip.token
                              });
                            case 5:
                              ltp = _context32.sent;
                              ltpPlus500 = (0, _functions.roundToNearestHundred)(ltp.ltp + 500);
                              _context32.next = 9;
                              return getScrip({
                                scriptName: scrip.name,
                                strikePrice: ltpPlus500.toString(),
                                optionType: 'CE',
                                expiryDate: (0, _functions.getNextExpiry)()
                              });
                            case 9:
                              optScrip = _context32.sent;
                              _context32.next = 12;
                              return doOrder({
                                tradingsymbol: optScrip[0].symbol,
                                symboltoken: optScrip[0].token,
                                transactionType: _constants.TRANSACTION_TYPE_SELL,
                                productType: 'DELIVERY'
                              });
                            case 12:
                              orderDetails = _context32.sent;
                              _context32.next = 15;
                              return getPositions();
                            case 15:
                              positionsResponse = _context32.sent;
                              positionsData = (_get3 = (0, _lodash.get)(positionsResponse, 'data', [])) !== null && _get3 !== void 0 ? _get3 : [];
                              mtm = 0;
                              if (Array.isArray(positionsData) && positionsData.length > 0) {
                                position = positionsData.filter(function (position) {
                                  if ((0, _lodash.get)(position, 'symboltoken') === scrip.token) return position;
                                });
                                mtm = parseInt((_get4 = (0, _lodash.get)(position, 'unrealised', '0')) !== null && _get4 !== void 0 ? _get4 : '0');
                              }
                              istTz = new Date().toLocaleString('default', {
                                timeZone: 'Asia/Kolkata'
                              });
                              json = {
                                isTradeExecuted: true,
                                accountDetails: {
                                  capitalUsed: 0
                                },
                                isTradeClosed: false,
                                tradeDetails: [{
                                  exchange: optScrip[0].exch_seg,
                                  expireDate: optScrip[0].expiry,
                                  netQty: '15',
                                  optionType: 'CE',
                                  strike: optScrip[0].strike,
                                  symbol: optScrip[0].symbol,
                                  token: optScrip[0].token,
                                  tradingSymbol: optScrip[0].symbol,
                                  closed: false,
                                  tradedPrice: 0
                                }],
                                mtm: [{
                                  time: istTz,
                                  value: mtm.toString()
                                }]
                              };
                              makeNewTrade(_app2.Strategy.RSI, json);
                              // }
                              //makeNewTrade(Strategy.RSI);
                              //HERE AFTER I'VE TO WRITE CODE TO READ FIREBASE DATABASE SO THAT I CAN KNOW, IF A TRADE IS ALREADY PLACED AND ALSO TO READ MTM SO AS TO BOOK PROFIT/LOSS
                              resolve(optScrip);
                              _context32.next = 26;
                              break;
                            case 25:
                              resolve({
                                rsi: calculatedRsi
                              });
                            case 26:
                            case "end":
                              return _context32.stop();
                          }
                        }, _callee32);
                      }));
                      return function (_x33, _x34) {
                        return _ref46.apply(this, arguments);
                      };
                    }());
                  case 2:
                  case "end":
                    return _context33.stop();
                }
              }, _callee33);
            }));
            return function (_x31, _x32) {
              return _ref45.apply(this, arguments);
            };
          }()));
        case 12:
        case "end":
          return _context34.stop();
      }
    }, _callee34);
  }));
  return function runRsiAlgo() {
    return _ref44.apply(this, arguments);
  };
}();
exports.runRsiAlgo = runRsiAlgo;
var makeNewTrade = /*#__PURE__*/function () {
  var _ref47 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee35(strategy, json) {
    var db, tradeKey, updates;
    return _regeneratorRuntime().wrap(function _callee35$(_context35) {
      while (1) switch (_context35.prev = _context35.next) {
        case 0:
          db = (0, _database.getDatabase)();
          tradeKey = (0, _database.push)((0, _database.child)((0, _database.ref)(db), "".concat(strategy, "/trades/"))).key;
          updates = {};
          updates["".concat(strategy, "/trades/") + tradeKey] = json;
          _context35.next = 6;
          return (0, _database.update)((0, _database.ref)(db), updates);
        case 6:
        case "end":
          return _context35.stop();
      }
    }, _callee35);
  }));
  return function makeNewTrade(_x35, _x36) {
    return _ref47.apply(this, arguments);
  };
}();